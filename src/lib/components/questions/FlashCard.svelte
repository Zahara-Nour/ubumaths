<!--
	FlashCard Component
	===================

	Displays mathematical questions as interactive flashcards.
	Integrates FlipCard mechanics, MathLive rendering, and answer validation.

	Features:
	- Interactive mode (enabled/disabled) for answer validation
	- FlipCard-based layout with equal heights for front and back
	- Type-specific answer inputs (numerical, algebraic, QCM, etc.)
	- Statistics tracking (time spent, attempts)
	- Visual feedback (correct/incorrect indicators)
	- Viewport-constrained height with scrolling

	Props:
	- interactive: boolean (default: false) - Enable answer validation
	- instance: QuestionInstance (pre-generated)
	- Callbacks: onAnswerSubmit, onAnswerChange, onComplete, onFlip
	- Customization: size, showCorrectionOnWrong, maxAttempts, etc.
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import type { AnswerData, QuestionStats } from '$lib/types/question-display';
	import { validateAnswer } from '$lib/utils/answer-validator';
	import MathDisplay from '$lib/components/MathDisplay.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { RotateCw, Check, X, AlertCircle } from 'lucide-svelte';
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
		onAnswerChange,
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

	// Height management (FlipCard-style)
	let frontHeight = $state(0);
	let backHeight = $state(0);
	let maxViewportHeight = $state(0);

	// Element references for height measurement
	let frontElement: HTMLElement | null = null;
	let backElement: HTMLElement | null = null;

	// Type-specific state
	let selectedChoices = $state<number[]>([]);
	let fillBlankValues = $state<string[]>([]);
	let _orderedIndexes = $state<number[]>([]);
	let blankValidationResults = $state<(boolean | null)[]>([]);

	// ============================================================================
	// DERIVED STATE
	// ============================================================================

	const currentHeight = $derived(
		Math.min(Math.max(frontHeight, backHeight), maxViewportHeight || 10000)
	);

	const isScrollable = $derived(Math.max(frontHeight, backHeight) > maxViewportHeight);

	const canSubmit = $derived(interactive && !isSubmitted && hasValidInput());

	const hasReachedMaxAttempts = $derived(maxAttempts > 0 && attempts >= maxAttempts);

	const isInputDisabled = $derived(!interactive || isSubmitted || hasReachedMaxAttempts);

	// ============================================================================
	// INITIALIZATION
	// ============================================================================

	// Start timer on mount (interactive mode only)
	$effect(() => {
		if (interactive && !startTime) {
			startTime = Date.now();
		}
	});

	// Calculate max viewport height
	$effect(() => {
		if (typeof window !== 'undefined') {
			maxViewportHeight = window.innerHeight * 0.8; // 80vh
		}
	});

	// Measure front and back heights using ResizeObserver
	$effect(() => {
		if (!frontElement || !backElement) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === frontElement) {
					frontHeight = entry.contentRect.height;
				} else if (entry.target === backElement) {
					backHeight = entry.contentRect.height;
				}
			}
		});

		observer.observe(frontElement);
		observer.observe(backElement);

		return () => {
			observer.disconnect();
		};
	});

	// Initialize type-specific state
	$effect(() => {
		if (instance.type === 'fill_in_blanks' && instance.blanks) {
			fillBlankValues = instance.blanks.map(() => '');
			blankValidationResults = instance.blanks.map(() => null);
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
		isCorrect = validationResult.isCorrect;
		validationMessage = validationResult.message || '';
		validationFeedback = validationResult.feedback || '';

		// Create answer data
		const answerData: AnswerData = {
			value: answer,
			isCorrect,
			timeSpent: getTimeSpent(),
			attempts,
			submittedAt: new Date().toISOString()
		};

		// Update history
		answerHistory.push(answerData);

		// Mark as submitted
		isSubmitted = true;
		isSubmitting = false;

		// Emit event
		onAnswerSubmit?.(answerData);

		// Handle validation results for fill-in-blanks
		if (instance.type === 'fill_in_blanks' && instance.blanks) {
			blankValidationResults = fillBlankValues.map((value, i) => {
				const expected = instance.blanks![i].expectedAnswer;
				return value.trim().toLowerCase() === expected.trim().toLowerCase();
			});
		}

		// Auto-flip on wrong answer if configured
		if (!isCorrect && showCorrectionOnWrong) {
			setTimeout(() => {
				isFlipped = true;
				onFlip?.(true);
			}, 500);
		}

		// Emit completion event if correct or max attempts reached
		if (isCorrect || hasReachedMaxAttempts) {
			setTimeout(() => {
				completeQuestion();
			}, 1000);
		}
	}

	/**
	 * Handle flip button click
	 */
	function handleFlip() {
		isFlipped = !isFlipped;
		onFlip?.(isFlipped);
	}

	/**
	 * Complete question and emit stats
	 */
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
<div class={cn('question-display-wrapper mx-auto w-full', sizeClasses[size])}>
	<!-- Actual flip container -->
	<div
		class="flip-container"
		class:flipped={isFlipped}
		style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'}; perspective: 1000px;"
	>
		<div
			class="flip-inner"
			class:flipped={isFlipped}
			style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
		>
			<!-- ===================== FRONT FACE ===================== -->
			<div
				bind:this={frontElement}
				class={cn('flip-face flip-front', isScrollable && 'scrollable')}
				style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
			>
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
								{#each instance.statement as field, i (`${i}-${field.type}`)}
									{#if field.type === 'text'}
										<MathDisplay text={field.content} />
									{:else if field.type === 'image'}
										<img
											src={field.content}
											alt={field.alt || 'Question image'}
											class="my-4 max-w-full rounded-lg"
										/>
									{/if}
								{/each}
							</div>
						</div>

						<!-- Answer Input (Interactive Mode Only) -->
						{#if interactive}
							<div class="answer-section">
								<h3 class="mb-3 text-lg font-semibold">Votre réponse</h3>

								<!-- Type-specific inputs -->
								{#if instance.type === 'numerical_exact' || instance.type === 'numerical_decimal' || instance.type === 'numerical_rounded'}
									<NumericalInput
										bind:value={userAnswer}
										disabled={isInputDisabled}
										onSubmit={handleSubmit}
									/>
								{:else if instance.type === 'algebraic_transform'}
									<AlgebraicInput
										bind:value={userAnswer}
										disabled={isInputDisabled}
										onSubmit={handleSubmit}
									/>
								{:else if instance.type === 'fill_in_blanks'}
									<FillBlanksInput
										statement={instance.statement}
										blanks={instance.blanks || []}
										bind:values={fillBlankValues}
										disabled={isInputDisabled}
										validationResults={isSubmitted ? blankValidationResults : []}
										onSubmit={handleSubmit}
									/>
								{:else if instance.type === 'multiple_choice'}
									<MultipleChoiceInput
										choices={instance.shuffledChoices || []}
										bind:selectedIndexes={selectedChoices}
										multipleAnswers={instance.multipleAnswers}
										disabled={isInputDisabled}
										showValidation={isSubmitted}
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

								<!-- Validation Result -->
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

						<!-- Attempts Counter -->
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

				<!-- Flip Button -->
				<button
					class="flip-button"
					onclick={handleFlip}
					aria-label={isFlipped ? 'Retour à la question' : 'Voir la correction'}
					title={isFlipped ? 'Retour à la question' : 'Voir la correction'}
				>
					<RotateCw class="h-5 w-5" />
				</button>
			</div>

			<!-- ===================== BACK FACE ===================== -->
			<div
				bind:this={backElement}
				class={cn('flip-face flip-back', isScrollable && 'scrollable')}
				style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
			>
				<Card.Root class="h-full">
					<Card.Header>
						<Card.Title>Correction</Card.Title>
					</Card.Header>

					<Card.Content class="space-y-6">
						<!-- User Answer (Interactive Mode) -->
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
									{#if instance.type === 'fill_in_blanks'}
										<ul class="space-y-1">
											{#each fillBlankValues as value, i (i)}
												<li class="flex items-center gap-2">
													{blankValidationResults[i] ? '✓' : '✗'}
													<code>{value}</code>
												</li>
											{/each}
										</ul>
									{:else if instance.type === 'multiple_choice'}
										<ul class="space-y-1">
											{#each selectedChoices as index (index)}
												<li>{String.fromCharCode(65 + index)}</li>
											{/each}
										</ul>
									{:else}
										<MathDisplay text={String(userAnswer)} />
									{/if}
								</div>
							</div>
						{/if}

						<!-- Correct Answer -->
						<div class="correct-answer">
							<h3 class="mb-3 text-lg font-semibold">Réponse correcte</h3>
							<div class="rounded-lg border-2 border-green-600 bg-green-100 p-4 dark:bg-green-950">
								{#if Array.isArray(instance.answer)}
									<ul class="space-y-1">
										{#each instance.answer as ans, i (i)}
											<li><MathDisplay text={String(ans)} /></li>
										{/each}
									</ul>
								{:else}
									<MathDisplay text={String(instance.answer)} />
								{/if}
							</div>
						</div>

						<!-- Detailed Correction -->
						{#if instance.correction && instance.correction.length > 0}
							<div class="correction-steps">
								<h3 class="mb-3 text-lg font-semibold">Explication détaillée</h3>
								<div class="space-y-3 rounded-lg border bg-muted/50 p-4">
									{#each instance.correction as field, i (`corr-${i}-${field.type}`)}
										{#if field.type === 'text'}
											<MathDisplay text={field.content} />
										{:else if field.type === 'image'}
											<img
												src={field.content}
												alt={field.alt || 'Correction image'}
												class="my-2 max-w-full rounded-lg"
											/>
										{/if}
									{/each}
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Flip Button (Back) -->
				<button
					class="flip-button"
					onclick={handleFlip}
					aria-label="Retour à la question"
					title="Retour à la question"
				>
					<RotateCw class="h-5 w-5" />
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	/* ============================================================================
	 * HIDDEN MEASURING CONTAINERS
	 * ============================================================================ */

	.measure-container {
		position: absolute;
		top: 0;
		left: 0;
		visibility: hidden;
		pointer-events: none;
		width: 100%;
		z-index: -1;
	}

	.measure-container > div {
		width: 100%;
	}

	/* ============================================================================
	 * FLIP CONTAINER (3D Transforms)
	 * ============================================================================ */

	.flip-container {
		position: relative;
		width: 100%;
		perspective: 1000px;
	}

	.flip-inner {
		position: relative;
		width: 100%;
		transform-style: preserve-3d;
		transition:
			transform 0.6s cubic-bezier(0.33, 1, 0.68, 1),
			height 0.6s cubic-bezier(0.33, 1, 0.68, 1);
	}

	.flip-inner.flipped {
		transform: rotateY(180deg);
	}

	.flip-face {
		position: absolute;
		width: 100%;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		box-sizing: border-box;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.flip-front {
		transform: rotateY(0deg);
	}

	.flip-back {
		transform: rotateY(180deg);
	}

	.flip-face.scrollable {
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--muted)) transparent;
	}

	.flip-face.scrollable::-webkit-scrollbar {
		width: 8px;
	}

	.flip-face.scrollable::-webkit-scrollbar-track {
		background: transparent;
	}

	.flip-face.scrollable::-webkit-scrollbar-thumb {
		background: hsl(var(--muted));
		border-radius: 4px;
	}

	.flip-face.scrollable::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--muted-foreground) / 0.5);
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
