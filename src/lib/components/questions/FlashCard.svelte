<!--
	FlashCard Component
	===================

	Displays mathematical questions as interactive flashcards.
	Uses FlipCard for the flip mechanics and height measurement.
	Handles answer validation, statistics, and type-specific inputs.

	Props:
	- interactive: boolean (default: false) - Enable answer validation
	- instance: QuestionInstance (pre-generated)
	- Callbacks: onAnswerSubmit, onAnswerChange, onComplete, onFlip
	- Customization: size, showCorrectionOnWrong, maxAttempts, etc.
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { AnswerData, QuestionStats } from '$lib/types/question-display';
	import { validateAnswer } from '$lib/utils/answer-validator';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { RotateCw, Check, X, AlertCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import FlipCard from '$lib/components/FlipCard.svelte';

	// Input components
	import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
	import MultipleChoiceInput from '$lib/components/question-inputs/MultipleChoiceInput.svelte';

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
		maxAttempts = 0
	}: Props = $props();

	// ============================================================================
	// STATE MANAGEMENT
	// ============================================================================

	// Answer state
	let userAnswer = $state<string | string[] | number | number[]>('');
	let isSubmitted = $state(false);
	let isSubmitting = $state(false);
	let isCorrect = $state(false);
	let validationMessage = $state('');
	let validationFeedback = $state('');

	// Statistics tracking
	let startTime = $state<number | null>(null);
	let attempts = $state(0);
	let answerHistory = $state<AnswerData[]>([]);

	// Flip state
	let isFlipped = $state(false);

	// Type-specific state
	let selectedChoices = $state<number[]>([]);
	let fillBlankValues = $state<string[]>([]);
	let fillBlankValuesLatex = $state<string[]>([]);
	let blankValidationResults = $state<(boolean | null)[]>([]);

	// ============================================================================
	// DERIVED STATE
	// ============================================================================

	const canSubmit = $derived(interactive && !isSubmitted && hasValidInput());

	const hasReachedMaxAttempts = $derived(maxAttempts > 0 && attempts >= maxAttempts);

	const isInputDisabled = $derived(!interactive || isSubmitted || hasReachedMaxAttempts);

	const statementMarkdown = $derived(instance.statement);

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
			fillBlankValues = instance.blanks.map((b) => b.prefilled ?? '');
			fillBlankValuesLatex = instance.blanks.map(() => '');
			blankValidationResults = instance.blanks.map(() => null);
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
				return fillBlankValues.every((v) => v.trim().length > 0);
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
			case 'multiple_choice':
				return instance.multipleAnswers ? selectedChoices : selectedChoices[0];
			default:
				return userAnswer;
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

		const validationResult = validateAnswer(answer, instance);
		isCorrect = validationResult.isCorrect;
		validationMessage = validationResult.message || '';
		validationFeedback = validationResult.feedback || '';

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
			blankValidationResults = fillBlankValues.map((value, i) => {
				const expected = instance.blanks![i].expectedAnswer;
				return value.trim().toLowerCase() === expected.trim().toLowerCase();
			});
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
</script>

<div class={cn('question-display-wrapper mx-auto w-full', sizeClasses[size])}>
	<FlipCard bind:flipped={isFlipped}>
		{#snippet front()}
			<div class="relative h-full">
				<Card.Root class="h-full">
					<Card.Header>
						<div class="flex items-center justify-between">
							<Card.Title>Question</Card.Title>
							<Badge variant="outline">{getQuestionType(instance)}</Badge>
						</div>
					</Card.Header>

					<Card.Content class="space-y-6">
						<!-- Question Statement -->
						<div class="statement-section">
							<h3 class="mb-3 text-lg font-semibold">Énoncé</h3>
							<div class="statement-content rounded-lg border bg-card p-4">
								{#if getQuestionType(instance) === 'fill_in_blanks' && instance.blanks}
									<FillBlanksInput
										statement={instance.statement}
										blanks={instance.blanks}
										expressions={instance.expressions}
										bind:values={fillBlankValues}
										bind:valuesLatex={fillBlankValuesLatex}
										disabled={!interactive || isInputDisabled}
										validationResults={isSubmitted ? blankValidationResults : []}
										onSubmit={handleSubmit}
									/>
								{:else}
									<MarkdownRenderer content={statementMarkdown} />
								{/if}
							</div>
						</div>

						<!-- Answer Input (Interactive Mode Only) -->
						{#if interactive}
							<div class="answer-section">
								{#if getQuestionType(instance) === 'multiple_choice'}
									<h3 class="mb-3 text-lg font-semibold">Votre réponse</h3>
									<MultipleChoiceInput
										choices={instance.shuffledChoices || []}
										bind:selectedIndexes={selectedChoices}
										multipleAnswers={instance.multipleAnswers}
										disabled={isInputDisabled}
										showValidation={isSubmitted}
									/>
								{/if}

								{#if !isSubmitted}
									<div class="mt-4 flex justify-center">
										<Button onclick={handleSubmit} disabled={!canSubmit || isSubmitting} size="lg">
											{isSubmitting ? 'Validation...' : 'Valider'}
										</Button>
									</div>
								{/if}

								{#if isSubmitted && showValidationFeedback}
									<div
										class={cn(
											'mt-4 flex items-center gap-3 rounded-lg border-2 p-4',
											isCorrect
												? 'border-green-600 bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200'
												: 'border-red-600 bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200'
										)}
									>
										{#if isCorrect}
											<Check class="h-6 w-6 flex-shrink-0" />
										{:else}
											<X class="h-6 w-6 flex-shrink-0" />
										{/if}
										<div class="flex-1">
											<p class="font-semibold">{validationMessage}</p>
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

				<button
					class="flip-button"
					onclick={handleFlip}
					aria-label={isFlipped ? 'Retour à la question' : 'Voir la correction'}
					title={isFlipped ? 'Retour à la question' : 'Voir la correction'}
				>
					<RotateCw class="h-5 w-5" />
				</button>
			</div>
		{/snippet}

		{#snippet back()}
			<div class="relative h-full">
				<Card.Root class="h-full">
					<Card.Header>
						<Card.Title>Correction</Card.Title>
					</Card.Header>

					<Card.Content class="space-y-6">
						{#if interactive && isSubmitted}
							<div class="answer-comparison">
								<h3 class="mb-3 text-lg font-semibold">Votre réponse</h3>
								<div
									class={cn(
										'rounded-lg border-2 p-4',
										isCorrect
											? 'border-green-600 bg-green-100 dark:bg-green-950'
											: 'border-red-600 bg-red-100 dark:bg-red-950'
									)}
								>
									{#if getQuestionType(instance) === 'fill_in_blanks'}
										<ul class="space-y-1">
											{#each fillBlankValues as value, i (i)}
												<li class="flex items-center gap-2">
													{blankValidationResults[i] ? '✓' : '✗'}
													<code>{value}</code>
												</li>
											{/each}
										</ul>
									{:else if getQuestionType(instance) === 'multiple_choice'}
										<ul class="space-y-1">
											{#each selectedChoices as index (index)}
												<li>{String.fromCharCode(65 + index)}</li>
											{/each}
										</ul>
									{:else}
										<MarkdownRenderer content={`$$${String(userAnswer)}$$`} />
									{/if}
								</div>
							</div>
						{/if}

						<div class="correct-answer">
							<h3 class="mb-3 text-lg font-semibold">Réponse correcte</h3>
							<div class="rounded-lg border-2 border-green-600 bg-green-100 p-4 dark:bg-green-950">
								{#if getQuestionType(instance) === 'fill_in_blanks' && instance.blanks}
									<FillBlanksInput
										statement={instance.statement}
										blanks={instance.blanks}
										expressions={instance.expressions}
										showCorrectAnswers={true}
									/>
								{:else if Array.isArray(instance.solution)}
									<ul class="space-y-1">
										{#each instance.solution as ans, i (i)}
											<li><MarkdownRenderer content={`$$${String(ans)}$$`} /></li>
										{/each}
									</ul>
								{:else if instance.solution !== undefined}
									<MarkdownRenderer content={`$$${String(instance.solution)}$$`} />
								{/if}
							</div>
						</div>

						{#if correctionMarkdown}
							<div class="correction-steps">
								<h3 class="mb-3 text-lg font-semibold">Explication détaillée</h3>
								<div class="space-y-3 rounded-lg border bg-muted/50 p-4">
									<MarkdownRenderer content={correctionMarkdown} />
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<button
					class="flip-button"
					onclick={handleFlip}
					aria-label="Retour à la question"
					title="Retour à la question"
				>
					<RotateCw class="h-5 w-5" />
				</button>
			</div>
		{/snippet}
	</FlipCard>
</div>

<style>
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
		background: hsl(var(--primary));
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
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
	}

	/* ============================================================================
	 * CONTENT SECTIONS
	 * ============================================================================ */

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
