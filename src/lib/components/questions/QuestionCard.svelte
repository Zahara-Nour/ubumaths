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
	- instance: QuestionInstance (pre-generated)
	- Callbacks: onAnswerSubmit, onAnswerChange
	- Customization: size

	Exports:
	- submitPendingAnswer(): AnswerData | null - valide la réponse en cours
	  (chrono écoulé) ; null si rien n'a été tapé ni coché
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { AnswerData } from '$lib/types/question-display';
	import { validateAnswer } from '$lib/utils/answer-validator';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';

	// Input components
	import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
	import { toFrenchDecimal } from '$lib/utils/french-math';
	import MultipleChoiceInput from '$lib/components/question-inputs/MultipleChoiceInput.svelte';
	import CourseCardView from './CourseCardView.svelte';

	// Props
	interface Props {
		interactive?: boolean;
		instance: QuestionInstance;
		onAnswerSubmit?: (answer: AnswerData) => void;
		_onAnswerChange?: (value: string | string[]) => void;
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		interactive = false,
		instance,
		onAnswerSubmit,
		_onAnswerChange,
		size = 'md'
	}: Props = $props();

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

			case 'multiple_choice':
				return instance.multipleAnswers ? selectedChoices : selectedChoices[0];

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

		const validationResult = validateAnswer(answer, instance, answerLatex);

		isSubmitted = true;

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
	<Card.Root class="h-full">
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title>Question</Card.Title>
				{#if getQuestionType(instance) !== 'course_card'}
					<Badge variant="outline">{getQuestionType(instance)}</Badge>
				{/if}
			</div>
		</Card.Header>

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
				<!-- Question Statement -->
				<div class="statement-section">
					<h3 class="mb-3 text-lg font-semibold">Énoncé</h3>
					<div class="statement-content rounded-lg border bg-card p-4">
						<MarkdownRenderer content={statementMarkdown} />
					</div>
				</div>

				<!-- Answer Input (Interactive Mode Only) -->
				{#if interactive}
					<div class="answer-section">
						<h3 class="mb-3 text-lg font-semibold">Votre réponse</h3>

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
							/>
						{:else if getQuestionType(instance) === 'multiple_choice'}
							<MultipleChoiceInput
								choices={instance.shuffledChoices || []}
								bind:selectedIndexes={selectedChoices}
								multipleAnswers={instance.multipleAnswers}
								disabled={isInputDisabled}
								showValidation={false}
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
