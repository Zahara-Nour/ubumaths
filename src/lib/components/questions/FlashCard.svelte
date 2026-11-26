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

	Aucune trace envoyée d'ici : la forme de série qui l'affiche s'en charge
	(`series-trace.ts`, ADR 0038). `flipOnSubmit` (forme Saisie) : la carte se
	retourne d'elle-même après « Valider », juste ou faux.

	Coup de pouce (idée 5 du chantier `idees-format`) : `showHint` (Saisie,
	Flash-cards, révision ; jamais en évaluation, Contrôle blanc, Course aux
	nombres ni combat) montre le bouton « Coup de pouce » sous l'énoncé quand la
	variation a un indice (`instance.hint`, hors carte de cours). Un clic l'ouvre,
	il reste ouvert ; `onHintOpen` prévient la forme (trace « avec indice »,
	demi-réussite). Rendu comme une étape de correction, version détaillée.

	Props:
	- interactive: boolean (default: false) - Enable answer validation
	- instance: QuestionInstance (pre-generated)
	- Callbacks: onAnswerSubmit, onAnswerChange, onComplete, onFlip
	- Customization: size, showCorrectionOnWrong, maxAttempts, flippable, etc.
-->

<script lang="ts">
	import type { QuestionInstance } from '#lib/questions/types.ts';
	import { getQuestionType, isCourseQuestion } from '#lib/questions/types.ts';
	import type { AnswerData, QuestionStats } from '#lib/types/question-display.ts';
	import {
		validateAnswer,
		validateAnswerDetailed,
		type DetailedVerdict,
		type StudentAnswer
	} from '#lib/utils/answer-validator.ts';
	import { buildExpectedResult, showsInstructionOnly } from '#lib/questions/expected-result.ts';
	import {
		globalVerdictOf,
		instructionOf,
		trainingStatus
	} from '#lib/questions/correction-card-verdict.ts';
	import { computeBlankColors } from './blank-verdicts';
	import { MarkdownRenderer } from '#lib/components/markdown/index.ts';
	import InlineMarkdown from '#lib/components/markdown/InlineMarkdown.svelte';
	import { templateGenericFunctions } from '#lib/questions/generic-functions.ts';
	import { provideCapitalPairs } from '#lib/components/markdown/content-capital-pairs.ts';
	import {
		digitGroupingOf,
		provideDigitGrouping
	} from '#lib/components/markdown/content-digit-grouping.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { RotateCw, Check, X, AlertCircle, TriangleAlert, Lightbulb } from '@lucide/svelte';
	import { splitCorrectionDetail } from '#lib/questions/correction-detail.ts';
	import { cn } from '#lib/utils.ts';
	import FlipCard from '#lib/components/FlipCard.svelte';

	// Input components
	import FillBlanksInput from '#lib/components/question-inputs/FillBlanksInput.svelte';
	import { toFrenchDecimal } from '#lib/utils/french-math.ts';
	import CourseCardBack from './CourseCardBack.svelte';
	import CorrectionView from './CorrectionView.svelte';
	import ExpectedResultView from './ExpectedResultView.svelte';
	import { provideQuestionLexicon } from '#lib/components/markdown/lexicon-context.ts';
	import LexiconToggle from './LexiconToggle.svelte';
	import LexiconOff from '#lib/components/markdown/LexiconOff.svelte';

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
		/** Forme Saisie : la carte se retourne après « Valider », juste ou faux (N2) */
		flipOnSubmit?: boolean;
		/** Bouton « Coup de pouce » permis par la forme (idée 5) ; défaut : non */
		showHint?: boolean;
		/** Coup de pouce ouvert (une fois par question) */
		onHintOpen?: () => void;
		/** Bouton de retournement réduit à 32 px (tuiles du catalogue et de Ma série) */
		compactFlip?: boolean;
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
		startFlipped = false,
		flipOnSubmit = false,
		showHint = false,
		onHintOpen,
		compactFlip = false
	}: Props = $props();

	// Mots cliquables dans l'énoncé du recto ; le verso n'en a aucun (R2, `LexiconOff`)
	// Question de cours : seuls les mots marqués `{.def}` (R4, chantier mots-cliquables)
	provideQuestionLexicon(
		() => instance.grades,
		() => true,
		() => isCourseQuestion(instance)
	);

	// ============================================================================
	// STATE MANAGEMENT
	// ============================================================================

	// Answer state
	let userAnswer = $state<string | string[]>('');
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
	let fillBlankValues = $state<string[]>([]);
	let fillBlankValuesLatex = $state<string[]>([]);
	let blankValidationResults = $state<(boolean | null)[]>([]);
	let blankUnoptimalResults = $state<boolean[]>([]);
	let blankFeedback = $state<(string | undefined)[]>([]);
	// Réponse validée, rattachée à SON instance : une autre instance (aperçu
	// régénéré) retrouve un verso sans réponse (R9). `raw` : comparée par identité
	// à l'instance reçue (un proxy profond ne lui serait jamais égal)
	let submitted = $state.raw<{ instance: QuestionInstance; answer: StudentAnswer } | null>(null);
	// Coup de pouce ouvert, rattaché à SON instance (comme `submitted`) : une autre
	// question repart fermée
	let hintOpenedFor = $state.raw<QuestionInstance | null>(null);

	// ============================================================================
	// DERIVED STATE
	// ============================================================================

	const canSubmit = $derived(interactive && !isSubmitted && hasValidInput());

	const hasReachedMaxAttempts = $derived(maxAttempts > 0 && attempts >= maxAttempts);

	const isInputDisabled = $derived(!interactive || isSubmitted || hasReachedMaxAttempts);

	const statementMarkdown = $derived(instance.statement);
	// Fonctions déclarées par le modèle (`P(x)`) : notation des formules `~…~`
	const genericFunctions = $derived(templateGenericFunctions(instance.genericFunctions));
	// Sens de `AB` de l'instance (longueur ou produit) : posé pour toutes les formules
	// en syntaxe maison rendues dans cette carte ; absent (instance d'avant) : produit
	provideCapitalPairs(() => instance.capitalPairs);
	// Seuil des espaces de groupement : « Espaces dès 4 chiffres » du modèle, sinon BIPM
	provideDigitGrouping(() => digitGroupingOf(instance));
	const prefilledGrouping = () => {
		const minDigits = digitGroupingOf(instance);
		return minDigits === undefined ? {} : { minDigits };
	};

	// Carte de cours (#617) : recto = énoncé, verso = correction, pas de réponse
	const isCourseCard = $derived(getQuestionType(instance) === 'course_card');

	// Coup de pouce (idée 5) : version détaillée, comme une étape de correction
	const hintMarkdown = $derived(
		showHint && !isCourseCard && instance.hint ? splitCorrectionDetail(instance.hint).detailed : ''
	);
	const hintOpen = $derived(hintOpenedFor !== null && hintOpenedFor === instance);

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
	// Calcul R1 et case « figure » : la consigne seule au-dessus (Q104) — le verso
	// se lit sans le recto (grille des corrections « En classe »)
	const instruction = $derived(
		expected && showsInstructionOnly(expected.lines)
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
				b.prefilled
					? b.type === 'math'
						? toFrenchDecimal(b.prefilled, prefilledGrouping())
						: b.prefilled
					: ''
			);
			fillBlankValuesLatex = instance.blanks.map((b) =>
				b.prefilled && b.type === 'math' ? toFrenchDecimal(b.prefilled, prefilledGrouping()) : ''
			);
			blankValidationResults = instance.blanks.map(() => null);
			blankUnoptimalResults = [];
			blankFeedback = [];
		}
	});

	// ============================================================================
	// HELPER FUNCTIONS
	// ============================================================================

	function hasValidInput(): boolean {
		switch (getQuestionType(instance)) {
			// Cases vides acceptées (« Tu n'as rien répondu. »), sauf une case « figure » :
			// Valider grisé tant que rien n'est tracé (décision de David, CP-059 et CP-058) ;
			// une figure de travail, jamais notée, peut rester vide
			case 'fill_in_blanks':
				return (instance.blanks ?? []).every(
					(blank, index) =>
						!blank.construction ||
						blank.construction.work ||
						(fillBlankValues[index] ?? '').trim() !== ''
				);
			default:
				return false;
		}
	}

	function getTimeSpent(): number {
		if (!startTime) return 0;
		return Math.round((Date.now() - startTime) / 1000);
	}

	function prepareAnswerValue(): string | string[] {
		return getQuestionType(instance) === 'fill_in_blanks' ? fillBlankValues : userAnswer;
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
			answer: { values: [...fillBlankValues], latex: [...fillBlankValuesLatex] }
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

		onAnswerSubmit?.(answerData);

		if (getQuestionType(instance) === 'fill_in_blanks' && instance.blanks) {
			const colors = computeBlankColors(fillBlankValues, instance, fillBlankValuesLatex);
			blankValidationResults = colors.verdicts;
			blankUnoptimalResults = colors.unoptimal;
		}

		if (flipOnSubmit) {
			// Saisie : sa réponse face à la bonne, puis la correction (verso R1-R7)
			isFlipped = true;
			onFlip?.(true);
		} else if (!isCorrect && showCorrectionOnWrong) {
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

	function handleHintOpen() {
		if (hintOpen) return;
		hintOpenedFor = instance;
		onHintOpen?.();
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

<div
	class={cn(
		'question-display-wrapper mx-auto w-full',
		sizeClasses[size],
		compactFlip && 'compact-flip'
	)}
>
	<FlipCard bind:flipped={isFlipped} {height}>
		{#snippet front()}
			<div class="face relative h-full">
				<!-- Recto allégé : ni titre, ni badge du type, ni sous-titre, ni encadré.
				     Hauteur imposée : la carte défile. Carte retournable : place réservée en bas au
				     bouton de retournement (frère de la carte, il ne défile pas). -->
				<Card.Root
					class={cn('face-card h-full', height && 'scrollable', flippable && 'reserve-bouton')}
				>
					<Card.Content class="space-y-6">
						<!-- Bouton « Mots du dictionnaire » (R6), avant l'énoncé dans l'ordre de tabulation -->
						<LexiconToggle class="float-right -mt-2 -mr-2 ml-2" />
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
										unoptimalResults={isSubmitted ? blankUnoptimalResults : []}
										blankFeedback={isSubmitted && showValidationFeedback ? blankFeedback : []}
										onSubmit={handleSubmit}
										mathModeSpace={(instance.options?.constraints?.spaces ?? 'warn') !== 'off'
											? '\\,'
											: undefined}
										capitalPairs={instance.capitalPairs}
										{genericFunctions}
										grades={instance.grades}
									/>
								{:else}
									<MarkdownRenderer content={statementMarkdown} {genericFunctions} />
								{/if}
							</div>
						</div>

						<!-- Coup de pouce (idée 5) : fermé au départ, ouvert pour de bon -->
						{#if hintMarkdown}
							{#if hintOpen}
								<div class="hint" data-testid="hint">
									<p class="hint-heading">
										<Lightbulb class="h-4 w-4" aria-hidden="true" />
										Coup de pouce
									</p>
									<MarkdownRenderer content={hintMarkdown} {genericFunctions} />
								</div>
							{:else if !isSubmitted}
								<div class="flex justify-center">
									<Button
										variant="outline"
										size="sm"
										onclick={handleHintOpen}
										data-testid="hint-button"
									>
										<Lightbulb class="h-4 w-4" aria-hidden="true" />
										Coup de pouce
									</Button>
								</div>
							{/if}
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
												<!-- Message écrit par un auteur (règle) : peut contenir une formule `$x>0$` -->
												<p class="mt-1 text-sm opacity-90">
													<InlineMarkdown content={validationFeedback} {genericFunctions} />
												</p>
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
				<!-- Verso : aucun mot du dictionnaire (R2, chantier mots-cliquables) -->
				<LexiconOff>
					<!-- Verso allégé : titre vert centré ; ni badge du type, ni intitulés, ni encadrés -->
					<Card.Root
						class={cn('face-card h-full', height && 'scrollable', flippable && 'reserve-bouton')}
					>
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
											Hors carte de cours, une question est classée `fill_in_blanks`.
											Sans `blanks`, il n'y a aucune réponse structurée à afficher — sans ce
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
				</LexiconOff>
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
	}

	/* Place du bouton de retournement sous la dernière ligne, hauteur imposée ou non */
	.face :global(.face-card.reserve-bouton) {
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
		color: var(--color-primary-foreground);
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
		color: var(--color-muted-foreground);
	}

	/* ============================================================================
	 * CONTENT SECTIONS
	 * ============================================================================ */

	/* Coup de pouce : un filet d'accent à gauche, pas un encadré */
	.hint {
		border-left: 3px solid var(--color-primary);
		padding-left: 0.75rem;
	}
	.hint-heading {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-muted-foreground);
	}
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

	/* Tuiles (catalogue, Ma série) : bouton de 32 px, à toutes les largeurs.
	   Après la règle du téléphone, pour la remplacer aussi sous 640 px. */
	.compact-flip .flip-button {
		width: calc(2rem * var(--font-scale, 1));
		height: calc(2rem * var(--font-scale, 1));
		bottom: calc(0.5rem * var(--font-scale, 1));
		right: calc(0.5rem * var(--font-scale, 1));
	}

	.compact-flip .flip-button :global(svg) {
		width: calc(1rem * var(--font-scale, 1));
		height: calc(1rem * var(--font-scale, 1));
	}

	.compact-flip .face :global(.face-card.reserve-bouton) {
		padding-bottom: calc(2.75rem * var(--font-scale, 1));
	}
</style>
