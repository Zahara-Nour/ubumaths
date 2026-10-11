<!--
	QuestionCard Component
	======================

	Displays mathematical questions without flip mechanism.
	Simpler alternative to FlashCard for test scenarios.

	Features:
	- Interactive mode (enabled/disabled) for answer validation
	- Type-specific answer inputs (numerical, algebraic, QCM, etc.)
	- Statistics tracking (time spent, attempts)
	- NO visual feedback (no correct/incorrect indicators)
	- NO flip mechanism (single-sided card)

	Props:
	- interactive: boolean (default: false) - Enable answer validation
	- collectOnly: évaluation notée (ADR 0015) → la réponse est COLLECTÉE sans être
	  corrigée (l'instance n'a pas de réponse attendue ; le serveur corrige à l'envoi)
	- unitKeys: touches d'unités fournies (évaluation), cf. FillBlanksInput
	- instance: QuestionInstance (pre-generated)
	- Callbacks: onAnswerSubmit, onAnswerChange
	- Customization: size

	Exports:
	- submitPendingAnswer(): AnswerData | null - valide la réponse en cours
	  (chrono écoulé) ; null si rien n'a été tapé ni coché
	- hasPendingAnswer(): boolean - une réponse tapée ou cochée, pas encore validée
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { AnswerData } from '$lib/types/question-display';
	import { validateAnswer } from '$lib/utils/answer-validator';
	import { toOriginalChoiceIndexes } from '$lib/questions/choices';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { templateGenericFunctions } from '$lib/questions/generic-functions';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';

	// Input components
	import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
	import { toFrenchDecimal } from '$lib/utils/french-math';
	import MultipleChoiceInput from '$lib/components/question-inputs/MultipleChoiceInput.svelte';
	import CourseCardView from './CourseCardView.svelte';
	import { provideQuestionLexicon } from '$lib/components/markdown/lexicon-context';

	// Props
	interface Props {
		interactive?: boolean;
		instance: QuestionInstance;
		onAnswerSubmit?: (answer: AnswerData) => void;
		_onAnswerChange?: (value: string | string[]) => void;
		size?: 'sm' | 'md' | 'lg';
		collectOnly?: boolean;
		unitKeys?: string[];
	}

	let {
		interactive = false,
		instance,
		onAnswerSubmit,
		_onAnswerChange,
		size = 'md',
		collectOnly = false,
		unitKeys
	}: Props = $props();

	// Mots cliquables : jamais en évaluation notée (décision de David, 2026-10-08)
	provideQuestionLexicon(
		() => instance.grades,
		() => !collectOnly
	);

	// ============================================================================
	// STATE MANAGEMENT
	// ============================================================================

	// Answer state
	let userAnswer = $state<string | string[] | number | number[]>('');
	let isSubmitted = $state(false);
	let isSubmitting = $state(false);

	// Statistics tracking
	let startTime = $state<number | null>(null);
	let attempts = $state(0);

	// Type-specific state
	let selectedChoices = $state<number[]>([]);
	let fillBlankValues = $state<string[]>([]);
	let fillBlankValuesLatex = $state<string[]>([]);

	// ============================================================================
	// DERIVED STATE
	// ============================================================================

	const canSubmit = $derived(interactive && !isSubmitted && hasValidInput());

	const isInputDisabled = $derived(!interactive || isSubmitted);

	// Markdown content - instance.statement is now ResolvedMarkdown (string)
	const statementMarkdown = $derived(instance.statement);
	// Fonctions déclarées par le modèle (`P(x)`) : notation des formules `~…~`
	const genericFunctions = $derived(templateGenericFunctions(instance.genericFunctions));

	// ============================================================================
	// INITIALIZATION
	// ============================================================================

	// Start timer on mount (interactive mode only)
	$effect(() => {
		if (interactive && !startTime) {
			startTime = Date.now();
		}
	});

	// Initialize type-specific state
	$effect(() => {
		if (getQuestionType(instance) === 'fill_in_blanks' && instance.blanks) {
			fillBlankValues = instance.blanks.map((b) =>
				b.prefilled ? (b.type === 'math' ? toFrenchDecimal(b.prefilled) : b.prefilled) : ''
			);
			fillBlankValuesLatex = instance.blanks.map((b) =>
				b.prefilled && b.type === 'math' ? toFrenchDecimal(b.prefilled) : ''
			);
		}

		if (getQuestionType(instance) === 'multiple_choice' && instance.shuffledChoices) {
			selectedChoices = [];
		}
	});

	// ============================================================================
	// HELPER FUNCTIONS
	// ============================================================================

	/**
	 * Check if user has entered a valid input (not empty)
	 */
	function hasValidInput(): boolean {
		switch (getQuestionType(instance)) {
			case 'fill_in_blanks':
				return fillBlankValues.every((v) => v.trim().length > 0);

			case 'multiple_choice':
				return selectedChoices.length > 0;

			default:
				return false;
		}
	}

	/**
	 * Calculate time spent (in seconds)
	 */
	function getTimeSpent(): number {
		if (!startTime) return 0;
		return Math.round((Date.now() - startTime) / 1000);
	}

	/**
	 * Prepare answer value based on question type
	 */
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
	// EVENT HANDLERS
	// ============================================================================

	/**
	 * L'élève a-t-il commencé à répondre ? Un trou pré-rempli ne compte pas :
	 * il n'a pas été tapé par l'élève.
	 */
	function hasStartedAnswer(): boolean {
		switch (getQuestionType(instance)) {
			case 'fill_in_blanks':
				return fillBlankValues.some(
					(value, index) => !instance.blanks?.[index]?.prefilled && value.trim().length > 0
				);

			case 'multiple_choice':
				return selectedChoices.length > 0;

			default:
				return false;
		}
	}

	/**
	 * Valide la réponse en cours (même validation que le bouton « Valider ») et
	 * fige la carte. Ne prévient pas `onAnswerSubmit` : l'appelant décide.
	 */
	function validateCurrentAnswer(): AnswerData {
		attempts += 1;

		const answer = prepareAnswerValue();
		const answerLatex =
			getQuestionType(instance) === 'fill_in_blanks' ? fillBlankValuesLatex : undefined;

		isSubmitted = true;

		// Évaluation : aucune correction ici (le serveur corrige). Une case math
		// porte déjà le LaTeX tapé : c'est lui que le serveur juge, forme comprise
		if (collectOnly) {
			return {
				value: answer,
				isCorrect: false,
				timeSpent: getTimeSpent(),
				attempts,
				submittedAt: new Date().toISOString()
			};
		}

		const validationResult = validateAnswer(answer, instance, answerLatex);

		return {
			value: answer,
			isCorrect: validationResult.isCorrect,
			timeSpent: getTimeSpent(),
			attempts,
			submittedAt: new Date().toISOString()
		};
	}

	/**
	 * Handle answer submission
	 */
	function handleSubmit() {
		if (!canSubmit || isSubmitting) return;

		isSubmitting = true;
		const answerData = validateCurrentAnswer();
		isSubmitting = false;

		onAnswerSubmit?.(answerData);
	}

	/**
	 * Temps écoulé (Entraînement, Q18) : ce que l'élève a tapé ou coché sans
	 * valider est validé comme par le bouton. Rend `null` si rien n'a été
	 * commencé, ou si la réponse a déjà été validée.
	 * Appelée par le parent via `bind:this`.
	 */
	export function hasPendingAnswer(): boolean {
		return interactive && !isSubmitted && hasStartedAnswer();
	}

	export function submitPendingAnswer(): AnswerData | null {
		if (!interactive || isSubmitted || !hasStartedAnswer()) return null;
		return validateCurrentAnswer();
	}

	/**
	 * Carte de cours : l'auto-évaluation tient lieu de réponse (« Je savais » =
	 * réussite). L'enregistrement (source `student_self`) est fait par
	 * `/api/tests/save`, qui lit la nature « carte » en base.
	 */
	function handleSelfAssess(knew: boolean) {
		if (isSubmitted) return;
		attempts += 1;
		isSubmitted = true;
		onAnswerSubmit?.({
			value: knew ? 'knew' : 'did_not_know',
			isCorrect: knew,
			timeSpent: getTimeSpent(),
			attempts,
			submittedAt: new Date().toISOString()
		});
	}

	// ============================================================================
	// SIZE CLASSES
	// ============================================================================

	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-2xl',
		lg: 'max-w-4xl'
	};
</script>

<!-- Question Display Component -->
<div class={cn('question-card-wrapper mx-auto w-full', sizeClasses[size])}>
	<!-- Carte allégée (2026-09-30), comme le recto de la flash-card : ni titre, ni badge,
	     ni intitulés « Énoncé » / « Votre réponse », ni encadré -->
	<Card.Root class="h-full">
		<Card.Content class="space-y-6">
			{#if getQuestionType(instance) === 'course_card'}
				<!-- Carte de cours : recto → « Voir la réponse » → verso → auto-évaluation -->
				<CourseCardView
					{instance}
					{interactive}
					{size}
					onSelfAssess={interactive ? handleSelfAssess : undefined}
				/>
			{:else}
				{#if instance.exerciseInstruction}
					<p class="text-base font-medium text-muted-foreground">{instance.exerciseInstruction}</p>
				{/if}
				<!-- Énoncé seul, sauf pour une question à trous en saisie : la zone de saisie
				     porte déjà l'énoncé (sinon il apparaissait deux fois) -->
				{#if !interactive || getQuestionType(instance) !== 'fill_in_blanks'}
					<div class="statement-section statement-content">
						<MarkdownRenderer content={statementMarkdown} {genericFunctions} />
					</div>
				{/if}

				<!-- Answer Input (Interactive Mode Only) -->
				{#if interactive}
					<div class="answer-section">
						<!-- Type-specific inputs -->
						{#if getQuestionType(instance) === 'fill_in_blanks'}
							<FillBlanksInput
								statement={instance.statement}
								blanks={instance.blanks || []}
								expressions={instance.expressions}
								bind:values={fillBlankValues}
								bind:valuesLatex={fillBlankValuesLatex}
								disabled={isInputDisabled}
								validationResults={[]}
								onSubmit={handleSubmit}
								mathModeSpace={(instance.options?.constraints?.spaces ?? 'warn') !== 'off'
									? '\\,'
									: undefined}
								{unitKeys}
								{genericFunctions}
								grades={instance.grades}
							/>
						{:else if getQuestionType(instance) === 'multiple_choice'}
							<MultipleChoiceInput
								choices={instance.shuffledChoices || []}
								bind:selectedIndexes={selectedChoices}
								multipleAnswers={instance.multipleAnswers}
								disabled={isInputDisabled}
								showValidation={false}
								{genericFunctions}
							/>
						{/if}

						<!-- Submit Button -->
						{#if !isSubmitted}
							<div class="mt-4 flex justify-center">
								<Button onclick={handleSubmit} disabled={!canSubmit || isSubmitting} size="lg">
									{isSubmitting ? 'Validation...' : 'Valider'}
								</Button>
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<style>
	/* ============================================================================
	 * CONTENT SECTIONS
	 * ============================================================================ */

	.statement-section,
	.answer-section {
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

	.question-card-wrapper {
		font-size: calc(1rem * var(--font-scale, 1));
	}
</style>
