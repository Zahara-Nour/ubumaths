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
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import type { AnswerData } from '$lib/types/question-display';
	import { validateAnswer } from '$lib/utils/answer-validator';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { contentFieldsToMarkdown } from '$lib/questions/generator/content-to-markdown';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { AlertCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	// Input components
	import NumericalInput from '$lib/components/question-inputs/NumericalInput.svelte';
	import AlgebraicInput from '$lib/components/question-inputs/AlgebraicInput.svelte';
	import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
	import MultipleChoiceInput from '$lib/components/question-inputs/MultipleChoiceInput.svelte';

	// Props
	interface Props {
		interactive?: boolean;
		instance: QuestionInstance;
		onAnswerSubmit?: (answer: AnswerData) => void;
		onAnswerChange?: (value: string | string[]) => void;
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		interactive = false,
		instance,
		onAnswerSubmit,
		onAnswerChange,
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
	let _blankValidationResults = $state<(boolean | null)[]>([]);

	// ============================================================================
	// DERIVED STATE
	// ============================================================================

	const canSubmit = $derived(interactive && !isSubmitted && hasValidInput());

	const isInputDisabled = $derived(!interactive || isSubmitted);

	// Markdown content (with fallback for backward compatibility)
	const statementMarkdown = $derived(
		instance.statement_md || contentFieldsToMarkdown(instance.statement)
	);

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
		if (instance.type === 'fill_in_blanks' && instance.blanks) {
			fillBlankValues = instance.blanks.map(() => '');
			_blankValidationResults = instance.blanks.map(() => null);
		}

		if (instance.type === 'multiple_choice' && instance.shuffledChoices) {
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
		switch (instance.type) {
			case 'numerical_exact':
			case 'numerical_decimal':
			case 'numerical_rounded':
			case 'algebraic_transform':
				return typeof userAnswer === 'string' && userAnswer.trim().length > 0;

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
		switch (instance.type) {
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
	 * Handle answer submission
	 */
	function handleSubmit() {
		if (!canSubmit || isSubmitting) return;

		isSubmitting = true;
		attempts += 1;

		const answer = prepareAnswerValue();

		// Validate answer
		const validationResult = validateAnswer(answer, instance);
		const isCorrect = validationResult.isCorrect;

		// Create answer data
		const answerData: AnswerData = {
			value: answer,
			isCorrect,
			timeSpent: getTimeSpent(),
			attempts,
			submittedAt: new Date().toISOString()
		};

		// Mark as submitted
		isSubmitted = true;
		isSubmitting = false;

		// Emit event
		onAnswerSubmit?.(answerData);
	}

	/**
	 * Handle answer change (for real-time callbacks)
	 */
	function _handleAnswerChange() {
		const value = prepareAnswerValue();
		onAnswerChange?.(value as string | string[]);
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
				<Badge variant="outline">{instance.type}</Badge>
			</div>
		</Card.Header>

		<Card.Content class="space-y-6">
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
					{#if instance.type === 'numerical_exact' || instance.type === 'numerical_decimal' || instance.type === 'numerical_rounded'}
						<NumericalInput
							bind:value={userAnswer as string}
							disabled={isInputDisabled}
							onSubmit={handleSubmit}
						/>
					{:else if instance.type === 'algebraic_transform'}
						<AlgebraicInput
							bind:value={userAnswer as string}
							disabled={isInputDisabled}
							onSubmit={handleSubmit}
						/>
					{:else if instance.type === 'fill_in_blanks'}
						<FillBlanksInput
							statement={instance.statement}
							blanks={instance.blanks || []}
							bind:values={fillBlankValues}
							disabled={isInputDisabled}
							validationResults={[]}
							onSubmit={handleSubmit}
						/>
					{:else if instance.type === 'multiple_choice'}
						<MultipleChoiceInput
							choices={instance.shuffledChoices || []}
							bind:selectedIndexes={selectedChoices}
							multipleAnswers={instance.multipleAnswers}
							disabled={isInputDisabled}
							showValidation={false}
						/>
					{:else if instance.type === 'ordering'}
						<div
							class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center"
						>
							<AlertCircle class="h-10 w-10 text-muted-foreground" />
							<div>
								<p class="font-semibold text-muted-foreground">
									Type de question "ordering" non implémenté
								</p>
								<p class="mt-1 text-sm text-muted-foreground/70">
									Cette fonctionnalité sera disponible prochainement
								</p>
							</div>
						</div>
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
