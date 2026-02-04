<script lang="ts">
	/**
	 * QuestionSlide - Interactive question in a slide
	 *
	 * Displays a QuestionInstance with optional interactivity.
	 * Supports all question types via existing input components.
	 */
	import { onMount } from 'svelte';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { AnswerData, ValidationResult } from '$lib/types/question-display';
	import type { SlideProps } from './types.js';
	import { validateAnswer } from '$lib/utils/answer-validator';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import Slide from './Slide.svelte';

	// Input components
	import MathInput from '$lib/components/question-inputs/MathInput.svelte';
	import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
	import MultipleChoiceInput from '$lib/components/question-inputs/MultipleChoiceInput.svelte';

	interface Props extends SlideProps {
		/** Question instance to display */
		instance: QuestionInstance;
		/** Enable interactive mode (default: true) */
		interactive?: boolean;
		/** Show correction section (default: false, use fragment to reveal) */
		showCorrection?: boolean;
		/** Callback when answer is submitted */
		onanswer?: (data: AnswerData) => void;
	}

	let {
		instance,
		interactive = true,
		showCorrection = false,
		onanswer,
		// Slide props
		transition,
		transitionSpeed,
		background,
		backgroundImage,
		backgroundVideo,
		backgroundIframe,
		backgroundSize,
		backgroundPosition,
		backgroundRepeat,
		backgroundOpacity,
		state: slideState,
		autoSlide,
		autoAnimate,
		autoAnimateId,
		visibility,
		class: className,
		data
	}: Props = $props();

	// Answer state
	let userAnswer = $state('');
	let selectedChoices: number[] = $state([]);
	let fillBlankValues: string[] = $state([]);
	let isSubmitted = $state(false);
	let validationResult: ValidationResult | null = $state(null);
	let startTime = Date.now();
	let attempts = $state(0);

	// Initialize on mount
	onMount(() => {
		if (instance.type === 'fill_in_blanks' && instance.blanks) {
			fillBlankValues = instance.blanks.map(() => '');
		}
	});

	// Check if user has entered valid input
	function hasValidInput(): boolean {
		switch (instance.type) {
			case 'numerical_exact':
			case 'numerical_decimal':
			case 'numerical_rounded':
			case 'algebraic_transform':
				return userAnswer.trim().length > 0;
			case 'fill_in_blanks':
				return fillBlankValues.every((v) => v.trim().length > 0);
			case 'multiple_choice':
				return selectedChoices.length > 0;
			default:
				return userAnswer.trim().length > 0;
		}
	}

	// Prepare answer value based on question type
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

	// Handle answer submission
	function handleSubmit() {
		if (!interactive || isSubmitted || !hasValidInput()) return;

		attempts += 1;
		const answer = prepareAnswerValue();
		const result = validateAnswer(answer, instance);
		validationResult = result;
		isSubmitted = true;

		const answerData: AnswerData = {
			value: answer,
			isCorrect: result.isCorrect,
			timeSpent: Math.round((Date.now() - startTime) / 1000),
			attempts,
			submittedAt: new Date().toISOString()
		};

		onanswer?.(answerData);
	}

	// Collect slide props
	const slideProps = $derived({
		transition,
		transitionSpeed,
		background,
		backgroundImage,
		backgroundVideo,
		backgroundIframe,
		backgroundSize,
		backgroundPosition,
		backgroundRepeat,
		backgroundOpacity,
		state: slideState,
		autoSlide,
		autoAnimate,
		autoAnimateId,
		visibility,
		class: className,
		data
	});

	// Computed states
	const isInputDisabled = $derived(!interactive || isSubmitted);
	const canSubmit = $derived(interactive && !isSubmitted && hasValidInput());
</script>

<Slide {...slideProps}>
	<div class="question-slide">
		<!-- Question Statement -->
		<div class="question-statement">
			<MarkdownRenderer content={instance.statement} />
		</div>

		<!-- Answer Input Section -->
		{#if interactive}
			<div class="answer-section">
				{#if instance.type === 'numerical_exact' || instance.type === 'numerical_decimal' || instance.type === 'numerical_rounded'}
					<MathInput bind:value={userAnswer} disabled={isInputDisabled} onSubmit={handleSubmit} />
				{:else if instance.type === 'algebraic_transform'}
					<MathInput
						bind:value={userAnswer}
						disabled={isInputDisabled}
						placeholder="Entrez votre expression..."
						helperText="Utilisez le clavier virtuel ou tapez directement (ex: x^2, sqrt(x), (x+1)(x-1))"
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
						showValidation={isSubmitted}
					/>
				{:else}
					<MathInput bind:value={userAnswer} disabled={isInputDisabled} onSubmit={handleSubmit} />
				{/if}

				<!-- Submit Button -->
				{#if !isSubmitted && instance.type !== 'multiple_choice'}
					<button class="submit-button" onclick={handleSubmit} disabled={!canSubmit}>
						Valider
					</button>
				{/if}
			</div>
		{/if}

		<!-- Feedback Section -->
		{#if validationResult}
			<div
				class="feedback-section"
				class:correct={validationResult.isCorrect}
				class:incorrect={!validationResult.isCorrect}
			>
				{#if validationResult.isCorrect}
					<span class="feedback-icon">&#x2714;</span>
					<span>Correct !</span>
				{:else}
					<span class="feedback-icon">&#x2718;</span>
					<span>Incorrect</span>
				{/if}
				{#if validationResult.message}
					<span class="feedback-message">{validationResult.message}</span>
				{/if}
			</div>
		{/if}

		<!-- Correction Section (revealed via fragment or showCorrection prop) -->
		{#if showCorrection || (isSubmitted && instance.correction)}
			<div class="correction-section fragment">
				<h3>Correction</h3>
				{#if instance.solution}
					<div class="solution">
						<strong>Reponse :</strong>
						{#if Array.isArray(instance.solution)}
							{instance.solution.join(', ')}
						{:else}
							<MarkdownRenderer content={`$${instance.solution}$`} />
						{/if}
					</div>
				{/if}
				{#if instance.correction?.steps}
					<div class="steps">
						{#each instance.correction.steps as step, i (i)}
							<div class="step">
								<MarkdownRenderer content={step} />
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</Slide>

<style>
	.question-slide {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 1.5em;
		padding: 2em;
		text-align: center;
		/* Base font size for slides */
		font-size: 32px;
	}

	.question-statement {
		font-size: 1.4em;
		max-width: 80%;
	}

	.question-statement :global(.markdown-content) {
		text-align: center;
	}

	.answer-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
		width: 100%;
		max-width: 800px;
		font-size: 1em;
	}

	/* Scale up input components for slides */
	.answer-section :global(.choice-button) {
		font-size: 1em !important;
		padding: 0.8em 1.2em !important;
	}

	.answer-section :global(.choice-letter) {
		font-size: 0.9em !important;
		min-width: 2em !important;
		min-height: 2em !important;
	}

	.answer-section :global(.numerical-input-field),
	.answer-section :global(math-field) {
		font-size: 1.2em !important;
		min-height: 2.5em !important;
	}

	.answer-section :global(.helper-text) {
		font-size: 0.7em !important;
	}

	.submit-button {
		padding: 0.6em 2.5em;
		font-size: 1em;
		font-weight: bold;
		color: var(--color-primary-foreground, white);
		background: var(--color-primary, #3b82f6);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.submit-button:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-primary, #3b82f6) 85%, black);
		transform: translateY(-2px);
	}

	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.feedback-section {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.5em 1.5em;
		border-radius: 8px;
		font-size: 0.9em;
		font-weight: bold;
	}

	.feedback-section.correct {
		background: color-mix(in srgb, var(--color-success, #22c55e) 20%, transparent);
		color: var(--color-success, #22c55e);
	}

	.feedback-section.incorrect {
		background: color-mix(in srgb, var(--color-destructive, #ef4444) 20%, transparent);
		color: var(--color-destructive, #ef4444);
	}

	.feedback-icon {
		font-size: 1.2em;
	}

	.feedback-message {
		font-weight: normal;
		opacity: 0.8;
	}

	.correction-section {
		text-align: left;
		max-width: 80%;
		padding: 1em;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}

	.correction-section h3 {
		margin-bottom: 0.5em;
		font-size: 1em;
	}

	.solution {
		margin-bottom: 0.5em;
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}

	.step {
		padding: 0.5em;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
		font-size: 0.85em;
	}
</style>
