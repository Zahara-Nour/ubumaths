<!--
	FlashCard Component
	===================

	Displays mathematical questions as interactive flashcards.
	Uses FlipCard for the flip mechanics and height measurement.
	Handles answer validation, statistics, and type-specific inputs.

	Verso (chantier « résultat attendu », lot 3, R14 / Q91) : en haut le résultat
	attendu (`ExpectedResultView`), en bas la correction concise ↔ détaillée
	(`CorrectionView`). Sans réponse d'élève (flash-cards, révision, En classe,
	aperçus) : R9 — énoncé rempli en vert, ou solution `3 + 5 = 8` encadrée
	précédée de la consigne (Q104). Après « Valider » (`interactive`) : R1-R7
	avec la réponse de l'élève, statut global du barème de l'entraînement (Q105).
	Carte de cours : verso inchangé (`CourseCardBack`).

	Props:
	- interactive: boolean (default: false) - Enable answer validation
	- instance: QuestionInstance (pre-generated)
	- Callbacks: onAnswerSubmit, onAnswerChange, onComplete, onFlip
	- Customization: size, showCorrectionOnWrong, maxAttempts, flippable, etc.
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { AnswerData, QuestionStats } from '$lib/types/question-display';
	import {
		validateAnswer,
		validateAnswerDetailed,
		type DetailedVerdict,
		type StudentAnswer
	} from '$lib/utils/answer-validator';
	import { isDisplayedChoiceCorrect, toOriginalChoiceIndexes } from '$lib/questions/choices';
	import { buildExpectedResult } from '$lib/questions/expected-result';
	import {
		globalVerdictOf,
		instructionOf,
		trainingStatus
	} from '$lib/questions/correction-card-verdict';
	import { computeBlankVerdicts } from './blank-verdicts';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { templateGenericFunctions } from '$lib/questions/generic-functions';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { RotateCw, Check, X, AlertCircle, TriangleAlert } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import FlipCard from '$lib/components/FlipCard.svelte';
	import { createLogger } from '$lib/utils/logger';

	// Input components
	import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
	import { toFrenchDecimal } from '$lib/utils/french-math';
	import MultipleChoiceInput from '$lib/components/question-inputs/MultipleChoiceInput.svelte';
	import CourseCardBack from './CourseCardBack.svelte';
	import CorrectionView from './CorrectionView.svelte';
	import ExpectedResultView from './ExpectedResultView.svelte';

	const logger = createLogger('FlashCard');

	// Props
	interface Props {
		interactive?: boolean;
		instance: QuestionInstance;
		onAnswerSubmit?: (answer: AnswerData) => void;
		_onAnswerChange?: (value: string | string[]) => void;
		onComplete?: (stats: QuestionStats) => void;
		onFlip?: (isFlipped: boolean) => void;
		size?: 'sm' | 'md' | 'lg';
		showCorrectionOnWrong?: boolean;
		showValidationFeedback?: boolean;
		maxAttempts?: number;
		/**
		 * Hauteur imposée (ex. '16rem') : recto et verso à cette hauteur, le contenu
		 * défile dans la carte. Absente : hauteur de la plus haute des deux faces.
		 */
		height?: string;
		/**
		 * Bouton de retournement affiché (défaut true). false : la réponse ne peut
		 * pas être montrée (projection « En classe » devant les élèves).
		 */
		flippable?: boolean;
		/** Carte présentée côté verso dès l'affichage (grille des corrections) */
		startFlipped?: boolean;
	}

	let {
		interactive = false,
		instance,
		onAnswerSubmit,
		_onAnswerChange,
		onComplete,
		onFlip,
		size = 'md',
		showCorrectionOnWrong = false,
		showValidationFeedback = true,
		maxAttempts = 0,
		height = undefined,
		flippable = true,
		startFlipped = false
	}: Props = $props();

	// ============================================================================
	// STATE MANAGEMENT
	// ============================================================================

	// Answer state
	let userAnswer = $state<string | string[] | number | number[]>('');
	let isSubmitted = $state(false);
	let isSubmitting = $state(false);
	let isCorrect = $state(false);
	let validationFeedback = $state('');

	// Statistics tracking
	let startTime = $state<number | null>(null);
	let attempts = $state(0);
	let answerHistory = $state<AnswerData[]>([]);

	// Flip state
	// Valeur initiale seulement : la carte reste retournable ensuite (si `flippable`)
	// svelte-ignore state_referenced_locally
	let isFlipped = $state(startFlipped);

	// Type-specific state
	let selectedChoices = $state<number[]>([]);
	let fillBlankValues = $state<string[]>([]);
	let fillBlankValuesLatex = $state<string[]>([]);
	let blankValidationResults = $state<(boolean | null)[]>([]);
	let blankFeedback = $state<(string | undefined)[]>([]);
	// Réponse validée, rattachée à SON instance : une autre instance (aperçu
	// régénéré) retrouve un verso sans réponse (R9). `raw` : comparée par identité
	// à l'instance reçue (un proxy profond ne lui serait jamais égal)
	let submitted = $state.raw<{ instance: QuestionInstance; answer: StudentAnswer } | null>(null);

	// ============================================================================
	// DERIVED STATE
	// ============================================================================

	const canSubmit = $derived(interactive && !isSubmitted && hasValidInput());

	const hasReachedMaxAttempts = $derived(maxAttempts > 0 && attempts >= maxAttempts);

	const isInputDisabled = $derived(!interactive || isSubmitted || hasReachedMaxAttempts);

	const statementMarkdown = $derived(instance.statement);
	// Fonctions déclarées par le modèle (`P(x)`) : notation des formules `~…~`
	const genericFunctions = $derived(templateGenericFunctions(instance.genericFunctions));

	// Choix dans l'ordre affiché, chacun marqué juste ou faux À SA POSITION AFFICHÉE
	// (sans `isCorrect`, le choix coché était toujours barré après validation)
	const displayedChoices = $derived(
		(instance.shuffledChoices ?? []).map((choice, position) => ({
			...choice,
			isCorrect: isDisplayedChoiceCorrect(instance, position)
		}))
	);

	// Carte de cours (#617) : recto = énoncé, verso = correction, pas de réponse
	const isCourseCard = $derived(getQuestionType(instance) === 'course_card');

	// Résultat attendu du verso (R14) : avec la réponse validée s'il y en a une
	const studentAnswer = $derived(
		submitted && submitted.instance === instance ? submitted.answer : undefined
	);
	const detailedVerdict = $derived.by((): DetailedVerdict | undefined => {
		if (!studentAnswer || isCourseCard) return undefined;
		return {
			...validateAnswerDetailed(instance, studentAnswer),
			// Statut global : barème de l'entraînement et de l'évaluation (Q105)
			status: trainingStatus(instance, studentAnswer)
		};
	});
	const expected = $derived(
		isCourseCard ? null : buildExpectedResult(instance, studentAnswer, detailedVerdict)
	);
	const globalVerdict = $derived(detailedVerdict ? globalVerdictOf(detailedVerdict.status) : null);
	// Calcul R1 : la consigne seule au-dessus (Q104) — le verso se lit sans le
	// recto (grille des corrections « En classe »)
	const instruction = $derived(
		expected?.lines.some((l) => l.kind === 'comparison' || l.kind === 'solution')
			? instructionOf(typeof instance.statement === 'string' ? instance.statement : '')
			: ''
	);

	const correctionMarkdown = $derived.by(() => {
		if (!instance.correction) return '';
		const parts: string[] = [];

		if (instance.correction.steps && instance.correction.steps.length > 0) {
			parts.push(...instance.correction.steps);
		}

		if (instance.correction.feedback?.correct) {
			parts.push(instance.correction.feedback.correct);
		}

		return parts.join('\n\n');
	});

	// ============================================================================
	// INITIALIZATION
	// ============================================================================

	$effect(() => {
		if (interactive && !startTime) {
			startTime = Date.now();
		}
	});

	$effect(() => {
		if (getQuestionType(instance) === 'fill_in_blanks' && instance.blanks) {
			fillBlankValues = instance.blanks.map((b) =>
				b.prefilled ? (b.type === 'math' ? toFrenchDecimal(b.prefilled) : b.prefilled) : ''
			);
			fillBlankValuesLatex = instance.blanks.map((b) =>
				b.prefilled && b.type === 'math' ? toFrenchDecimal(b.prefilled) : ''
			);
			blankValidationResults = instance.blanks.map(() => null);
			blankFeedback = [];
		}

		if (getQuestionType(instance) === 'multiple_choice' && instance.shuffledChoices) {
			selectedChoices = [];
		}
	});

	// ============================================================================
	// HELPER FUNCTIONS
	// ============================================================================

	function hasValidInput(): boolean {
		switch (getQuestionType(instance)) {
			case 'fill_in_blanks':
				return true;
			case 'multiple_choice':
				return selectedChoices.length > 0;
			default:
				return false;
		}
	}

	function getTimeSpent(): number {
		if (!startTime) return 0;
		return Math.round((Date.now() - startTime) / 1000);
	}

	function prepareAnswerValue(): string | string[] | number | number[] {
		switch (getQuestionType(instance)) {
			case 'fill_in_blanks':
				return fillBlankValues;
			case 'multiple_choice': {
				// Positions cliquées (ordre affiché, mélangé) → indices d'origine : ceux que
				// compare `validateAnswer` et ceux qui sont enregistrés.
				const originalIndexes = toOriginalChoiceIndexes(instance, selectedChoices);
				return instance.multipleAnswers ? originalIndexes : originalIndexes[0];
			}
			default:
				return userAnswer;
		}
	}

	// ============================================================================
	// SKILL TRACKING
	// ============================================================================

	/**
	 * Fire-and-forget POST to /api/skill-attempts.
	 * Fail-silent: network errors are logged but never surfaced to the student.
	 * The API inserts one skill_attempts row per family-knowledge skill tagged
	 * on the template. If no skills are tagged yet, the API returns { inserted: 0 }
	 * with no error — that is the expected state for most templates (decision phase 2).
	 */
	async function trackSkillAttempt(template_id: string, success: boolean): Promise<void> {
		try {
			await fetch('/api/skill-attempts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ template_id, success, with_help: false })
			});
			// Response is intentionally ignored — fail-silent strategy
		} catch (err) {
			// Network-level error (fetch itself threw) — log but do not block UX
			logger.warn('Failed to track skill attempt (network error)', err);
		}
	}

	// ============================================================================
	// EVENT HANDLERS
	// ============================================================================

	function handleSubmit() {
		if (!canSubmit || isSubmitting) return;

		isSubmitting = true;
		attempts += 1;

		const answer = prepareAnswerValue();
		const answerLatex =
			getQuestionType(instance) === 'fill_in_blanks' ? fillBlankValuesLatex : undefined;

		const validationResult = validateAnswer(answer, instance, answerLatex);
		// Réponse telle que le validateur l'a lue, pour le résultat attendu du verso
		submitted = {
			instance,
			answer:
				getQuestionType(instance) === 'multiple_choice'
					? { choiceIndexes: toOriginalChoiceIndexes(instance, selectedChoices) }
					: { values: [...fillBlankValues], latex: [...fillBlankValuesLatex] }
		};
		isCorrect = validationResult.isCorrect;
		validationFeedback = validationResult.feedback || '';
		blankFeedback = validationResult.blankFeedback ?? [];

		const answerData: AnswerData = {
			value: answer,
			isCorrect,
			timeSpent: getTimeSpent(),
			attempts,
			submittedAt: new Date().toISOString()
		};

		answerHistory.push(answerData);

		isSubmitted = true;
		isSubmitting = false;

		// Track skill attempt (fire-and-forget, fail-silent).
		// Only in interactive mode and when the template has a known ID.
		// with_help is always false in V1 — FlashCard has no help mechanism (decision 58).
		if (interactive && instance.templateId) {
			void trackSkillAttempt(instance.templateId, isCorrect);
		}

		onAnswerSubmit?.(answerData);

		if (getQuestionType(instance) === 'fill_in_blanks' && instance.blanks) {
			blankValidationResults = computeBlankVerdicts(fillBlankValues, instance);
		}

		if (!isCorrect && showCorrectionOnWrong) {
			setTimeout(() => {
				isFlipped = true;
				onFlip?.(true);
			}, 500);
		}

		if (isCorrect || hasReachedMaxAttempts) {
			setTimeout(() => {
				completeQuestion();
			}, 1000);
		}
	}

	function handleFlip() {
		isFlipped = !isFlipped;
		onFlip?.(isFlipped);
	}

	function completeQuestion() {
		const stats: QuestionStats = {
			templateId: instance.templateId,
			timeSpent: getTimeSpent(),
			attempts,
			isCorrect: answerHistory.some((a) => a.isCorrect),
			firstAttemptCorrect: answerHistory[0]?.isCorrect || false,
			answeredAt: new Date().toISOString(),
			answerHistory
		};

		onComplete?.(stats);
	}

	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-2xl',
		lg: 'max-w-4xl'
	};

	// Résultat attendu : plus grand sur les grandes cartes (l'ancienne réponse seule était en 3xl)
	const expectedSizeClasses = {
		sm: 'text-base',
		md: 'text-lg',
		lg: 'text-xl'
	};
</script>

<div class={cn('question-display-wrapper mx-auto w-full', sizeClasses[size])}>
	<FlipCard bind:flipped={isFlipped} {height}>
		{#snippet front()}
			<div class="face relative h-full">
				<!-- Recto allégé : ni titre, ni badge du type, ni sous-titre, ni encadré.
				     Hauteur imposée : la carte défile, place réservée en bas au bouton de retournement
				     (frère de la carte, il ne défile pas). -->
				<Card.Root class={cn('face-card h-full', height && 'scrollable')}>
					<Card.Content class="space-y-6">
						{#if instance.exerciseInstruction}
							<p class="text-base font-medium text-muted-foreground">
								{instance.exerciseInstruction}
							</p>
						{/if}
						<!-- Question Statement -->
						<div class="statement-section">
							<div class="statement-content">
								{#if getQuestionType(instance) === 'fill_in_blanks' && instance.blanks}
									<FillBlanksInput
										statement={instance.statement}
										blanks={instance.blanks}
										expressions={instance.expressions}
										bind:values={fillBlankValues}
										bind:valuesLatex={fillBlankValuesLatex}
										disabled={!interactive || isInputDisabled}
										flashMode={!interactive}
										validationResults={isSubmitted ? blankValidationResults : []}
										blankFeedback={isSubmitted && showValidationFeedback ? blankFeedback : []}
										onSubmit={handleSubmit}
										mathModeSpace={(instance.options?.constraints?.spaces ?? 'warn') !== 'off'
											? '\\,'
											: undefined}
										{genericFunctions}
									/>
								{:else}
									<MarkdownRenderer content={statementMarkdown} {genericFunctions} />
								{/if}
							</div>
						</div>

						<!-- Multiple choice: always show choices (disabled when non-interactive) -->
						{#if getQuestionType(instance) === 'multiple_choice'}
							<div class="answer-section">
								{#if interactive}
									<h3 class="mb-3 text-lg font-semibold">Votre réponse</h3>
								{/if}
								<MultipleChoiceInput
									choices={displayedChoices}
									bind:selectedIndexes={selectedChoices}
									multipleAnswers={instance.multipleAnswers}
									disabled={!interactive || isInputDisabled}
									showValidation={isSubmitted}
									{genericFunctions}
								/>
							</div>
						{/if}

						<!-- Interactive controls (une carte de cours n'a rien à valider) -->
						{#if interactive && !isCourseCard}
							<div class="answer-section">
								{#if !isSubmitted}
									<div class="mt-4 flex justify-center">
										<Button onclick={handleSubmit} disabled={!canSubmit || isSubmitting} size="lg">
											{isSubmitting ? 'Validation...' : 'Valider'}
										</Button>
									</div>
								{/if}

								{#if isSubmitted && showValidationFeedback && globalVerdict}
									<!-- Même statut que le badge du verso : barème de l'évaluation (Q105) -->
									<div
										class={cn(
											'mt-4 flex items-center gap-3 rounded-lg border-2 p-4',
											globalVerdict.kind === 'half'
												? 'border-yellow-600 bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200'
												: globalVerdict.kind === 'correct'
													? 'border-green-600 bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200'
													: 'border-red-600 bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200'
										)}
										data-testid="front-verdict"
										data-kind={globalVerdict.kind}
									>
										{#if globalVerdict.kind === 'half'}
											<AlertCircle class="h-6 w-6 flex-shrink-0" />
										{:else if globalVerdict.kind === 'correct'}
											<Check class="h-6 w-6 flex-shrink-0" />
										{:else}
											<X class="h-6 w-6 flex-shrink-0" />
										{/if}
										<div class="flex-1">
											<p class="font-semibold">{globalVerdict.label}</p>
											{#if validationFeedback}
												<p class="mt-1 text-sm opacity-90">{validationFeedback}</p>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						{/if}

						{#if interactive && attempts > 0}
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<AlertCircle class="h-4 w-4" />
								<span>
									Tentative {attempts}{#if maxAttempts > 0}/{maxAttempts}{/if}
								</span>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				{#if flippable}
					<button
						class="flip-button"
						onclick={handleFlip}
						aria-label={isFlipped ? 'Retour à la question' : 'Voir la correction'}
						title={isFlipped ? 'Retour à la question' : 'Voir la correction'}
					>
						<RotateCw class="h-5 w-5" />
					</button>
				{/if}
			</div>
		{/snippet}

		{#snippet back()}
			<div class="face relative h-full">
				<!-- Verso allégé : titre vert centré ; ni badge du type, ni intitulés, ni encadrés -->
				<Card.Root class={cn('face-card h-full', height && 'scrollable')}>
					<Card.Content class="space-y-6">
						<p
							class="text-center text-lg font-semibold text-green-600 dark:text-green-500"
							data-verso-title
						>
							<!-- En-tête du résultat attendu ; « Correction » intitule la correction plus bas -->
							{isCourseCard ? 'Verso' : 'Réponse'}
						</p>

						{#if isCourseCard}
							<!-- Carte de cours : le verso EST la correction (source unique partagée) -->
							<CourseCardBack correction={instance.correction} {genericFunctions} />
						{:else}
							<!-- Statut, consigne et résultat attendu : groupés, plus serrés que les sections -->
							<div class="space-y-3">
								{#if globalVerdict}
									<p class="flex justify-center">
										<span
											class="verdict-badge verdict-{globalVerdict.kind}"
											data-testid="global-verdict"
											data-kind={globalVerdict.kind}
										>
											{#if globalVerdict.kind === 'correct'}
												<Check class="h-3.5 w-3.5" aria-hidden="true" />
											{:else if globalVerdict.kind === 'half'}
												<TriangleAlert class="h-3.5 w-3.5" aria-hidden="true" />
											{:else}
												<X class="h-3.5 w-3.5" aria-hidden="true" />
											{/if}
											{globalVerdict.label}
										</span>
									</p>
								{/if}
								{#if instruction}
									<!-- Consigne seule (Q104) : la formule à case est remplacée par la solution -->
									<div class="text-muted-foreground" data-testid="instruction">
										<MarkdownRenderer content={instruction} />
									</div>
								{/if}
								<div class="correct-answer">
									{#if expected && expected.lines.length > 0}
										<!-- Résultat attendu (R9, ou R1-R7 après « Valider ») -->
										<ExpectedResultView result={expected} class={expectedSizeClasses[size]} />
									{:else}
										<!--
										getQuestionType() ne connaît que deux types : sans `choices`, une
										question est classée `fill_in_blanks`. Si elle n'a pas non plus de
										`blanks`, il n'y a aucune réponse structurée à afficher — sans ce
										repli, la zone de réponse se rendait vide et muette.
									-->
										<p class="text-sm text-muted-foreground">
											{correctionMarkdown
												? "Cette question n'a pas de réponse structurée : voir l'explication ci-dessous."
												: 'Aucune réponse enregistrée pour cette question.'}
										</p>
									{/if}
								</div>
							</div>

							{#if correctionMarkdown}
								<!-- Filet et intitulé : la correction ne s'enchaîne pas au résultat attendu -->
								<div>
									<hr class="correction-separator" data-testid="correction-separator" />
									<p class="correction-heading" data-testid="correction-heading">Correction</p>
									<div class="correction-steps">
										<!-- Concise par défaut, interrupteur « Voir le détail » (ADR 0017) -->
										<CorrectionView markdown={correctionMarkdown} {genericFunctions} />
									</div>
								</div>
							{/if}
						{/if}
					</Card.Content>
				</Card.Root>

				{#if flippable}
					<button
						class="flip-button"
						onclick={handleFlip}
						aria-label="Retour à la question"
						title="Retour à la question"
					>
						<RotateCw class="h-5 w-5" />
					</button>
				{/if}
			</div>
		{/snippet}
	</FlipCard>
</div>

<style>
	/* ============================================================================
	 * HAUTEUR IMPOSÉE : la carte défile, le bouton de retournement (frère de la
	 * carte) reste fixe. En CSS du composant et non en Tailwind : c'est le
	 * comportement, pas une décoration.
	 * ============================================================================ */

	.face {
		position: relative;
		height: 100%;
	}

	.face :global(.face-card.scrollable) {
		height: 100%;
		overflow-y: auto;
		/* Place du bouton de retournement sous la dernière ligne */
		padding-bottom: calc(4rem * var(--font-scale, 1));
	}

	/* ============================================================================
	 * FLIP BUTTON (Bottom-Right Corner)
	 * ============================================================================ */

	.flip-button {
		position: absolute;
		bottom: calc(1rem * var(--font-scale, 1));
		right: calc(1rem * var(--font-scale, 1));
		z-index: 10;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: calc(3rem * var(--font-scale, 1));
		height: calc(3rem * var(--font-scale, 1));
		border-radius: 50%;
		background: var(--color-primary);
		color: hsl(var(--primary-foreground));
		border: none;
		cursor: pointer;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.1),
			0 2px 4px rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}

	.flip-button:hover:not(:disabled) {
		transform: scale(1.1) rotate(180deg);
		box-shadow:
			0 10px 15px rgba(0, 0, 0, 0.1),
			0 4px 6px rgba(0, 0, 0, 0.05);
	}

	.flip-button:active:not(:disabled) {
		transform: scale(1.05) rotate(180deg);
	}

	.flip-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: var(--color-muted);
		color: hsl(var(--muted-foreground));
	}

	/* ============================================================================
	 * CONTENT SECTIONS
	 * ============================================================================ */

	/* Séparation résultat attendu / correction : un filet discret, pas un encadré */
	.correction-separator {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 0 0 0.75rem;
	}

	.correction-heading {
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-muted-foreground);
	}

	/* Une longue formule défile dans sa zone au lieu d'élargir la carte (tuiles) */
	.correct-answer {
		min-width: 0;
		overflow-x: auto;
	}

	/* Statut global (même barème et mêmes couleurs que CorrectionCard) */
	.verdict-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border: 1px solid currentColor;
		border-radius: 9999px;
		padding: 0.125rem 0.625rem;
		font-size: 0.8125rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.verdict-correct {
		color: light-dark(var(--color-green-700, #15803d), var(--color-green-400, #4ade80));
	}

	.verdict-half {
		color: light-dark(var(--color-amber-700, #b45309), var(--color-amber-400, #fbbf24));
	}

	.verdict-incorrect {
		color: light-dark(var(--color-red-700, #b91c1c), var(--color-red-400, #f87171));
	}

	.statement-section,
	.answer-section,
	.answer-comparison,
	.correct-answer,
	.correction-steps {
		animation: fadeIn 0.3s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ============================================================================
	 * FONT SCALING
	 * ============================================================================ */

	.question-display-wrapper {
		font-size: calc(1rem * var(--font-scale, 1));
	}

	/* ============================================================================
	 * RESPONSIVE DESIGN
	 * ============================================================================ */

	@media (max-width: 640px) {
		.flip-button {
			width: calc(2.5rem * var(--font-scale, 1));
			height: calc(2.5rem * var(--font-scale, 1));
			bottom: calc(0.75rem * var(--font-scale, 1));
			right: calc(0.75rem * var(--font-scale, 1));
		}
	}
</style>
