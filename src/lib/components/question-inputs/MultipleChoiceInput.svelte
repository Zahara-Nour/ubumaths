<!--
	Multiple Choice Input Component
	================================

	Displays choices as buttons with selection tracking.
	Supports single or multiple answer selection.

	Props:
	- choices: Array of choices with content (ResolvedMarkdown) and correctness
	- selectedIndexes: Array of selected choice indexes (bindable)
	- multipleAnswers: Whether multiple selections are allowed
	- disabled: Whether inputs are disabled
	- showValidation: Whether to show correct/incorrect indicators
	- onSubmit: Callback when a choice is clicked (in single-answer mode)
-->

<script lang="ts">
	import type { ResolvedMarkdown } from '$lib/shared/markdown';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { Check, X } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Choice {
		/** Choice content as resolved markdown string */
		content: ResolvedMarkdown;
		/** For shuffled choices - original index before shuffling */
		originalIndex?: number;
		/** For validation mode - whether this choice is correct */
		isCorrect?: boolean;
	}

	interface Props {
		choices: Choice[];
		selectedIndexes?: number[];
		multipleAnswers?: boolean;
		disabled?: boolean;
		showValidation?: boolean;
		onSubmit?: (index: number) => void;
	}

	let {
		choices,
		selectedIndexes = $bindable([]),
		multipleAnswers = false,
		disabled = false,
		showValidation = false,
		onSubmit
	}: Props = $props();

	// Toggle choice selection
	function toggleChoice(index: number) {
		if (disabled) return;

		if (multipleAnswers) {
			// Multiple selection: toggle in array
			if (selectedIndexes.includes(index)) {
				selectedIndexes = selectedIndexes.filter((i) => i !== index);
			} else {
				selectedIndexes = [...selectedIndexes, index];
			}
		} else {
			// Single selection: replace array
			selectedIndexes = [index];

			// Trigger submit callback for single-answer mode
			if (onSubmit) {
				onSubmit(index);
			}
		}
	}

	// Check if choice is selected
	function isSelected(index: number): boolean {
		return selectedIndexes.includes(index);
	}

	// Get choice letter (A, B, C, ...)
	function getChoiceLetter(index: number): string {
		return String.fromCharCode(65 + index);
	}
</script>

<div class="multiple-choice-container">
	<!-- Choice buttons -->
	<div class="choices-grid">
		{#each choices as choice, i (i)}
			{@const selected = isSelected(i)}
			{@const correct = showValidation && choice.isCorrect}
			{@const incorrect = showValidation && !choice.isCorrect && selected}

			<button
				type="button"
				class={cn(
					'choice-button',
					selected && !showValidation && 'selected',
					correct && 'correct',
					incorrect && 'incorrect',
					disabled && 'disabled'
				)}
				onclick={() => toggleChoice(i)}
				{disabled}
			>
				<!-- Choice letter badge -->
				<span class="choice-letter">{getChoiceLetter(i)}</span>

				<!-- Choice content - now a ResolvedMarkdown string rendered directly -->
				<div class="choice-content">
					<MarkdownRenderer content={choice.content} />
				</div>

				<!-- Validation indicator -->
				{#if showValidation}
					<span class="validation-icon">
						{#if correct}
							<Check class="h-5 w-5" />
						{:else if incorrect}
							<X class="h-5 w-5" />
						{/if}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Helper text -->
	{#if !disabled && !showValidation}
		<div class="helper-text">
			<span class="text-xs text-muted-foreground">
				{multipleAnswers
					? 'Sélectionnez toutes les réponses correctes'
					: 'Sélectionnez une réponse'}
			</span>
		</div>
	{/if}
</div>

<style>
	.multiple-choice-container {
		width: 100%;
	}

	.choices-grid {
		display: grid;
		gap: calc(0.75rem * var(--font-scale, 1));
		grid-template-columns: repeat(1, 1fr);
	}

	.choice-button {
		position: relative;
		display: flex;
		align-items: center;
		gap: calc(0.75rem * var(--font-scale, 1));
		padding: calc(1rem * var(--font-scale, 1));
		font-size: calc(1rem * var(--font-scale, 1));
		text-align: left;
		border: 2px solid hsl(var(--border));
		border-radius: calc(0.5rem * var(--font-scale, 1));
		background: hsl(var(--background));
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.choice-button:hover:not(.disabled) {
		border-color: hsl(var(--primary));
		background: hsl(var(--muted) / 0.5);
		transform: translateY(-2px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.choice-button:active:not(.disabled) {
		transform: translateY(0);
	}

	.choice-button.selected {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.1);
	}

	.choice-button.correct {
		border-color: rgb(34, 197, 94); /* green-600 */
		background: rgb(220, 252, 231); /* green-100 */
		color: rgb(22, 101, 52); /* green-900 */
	}

	.dark .choice-button.correct {
		border-color: rgb(34, 197, 94);
		background: rgb(20, 83, 45); /* green-950 */
		color: rgb(187, 247, 208); /* green-200 */
	}

	.choice-button.incorrect {
		border-color: rgb(220, 38, 38); /* red-600 */
		background: rgb(254, 226, 226); /* red-100 */
		color: rgb(127, 29, 29); /* red-900 */
	}

	.dark .choice-button.incorrect {
		border-color: rgb(220, 38, 38);
		background: rgb(69, 10, 10); /* red-950 */
		color: rgb(254, 202, 202); /* red-200 */
	}

	.choice-button.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.choice-letter {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: calc(2rem * var(--font-scale, 1));
		min-height: calc(2rem * var(--font-scale, 1));
		padding: calc(0.25rem * var(--font-scale, 1));
		font-weight: 700;
		font-size: calc(0.875rem * var(--font-scale, 1));
		border-radius: calc(0.375rem * var(--font-scale, 1));
		background: hsl(var(--muted));
		color: hsl(var(--foreground));
	}

	.choice-button.selected .choice-letter {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	.choice-button.correct .choice-letter {
		background: rgb(34, 197, 94); /* green-600 */
		color: white;
	}

	.choice-button.incorrect .choice-letter {
		background: rgb(220, 38, 38); /* red-600 */
		color: white;
	}

	.choice-content {
		flex: 1;
		min-width: 0;
	}

	/* Images within choice content (rendered by MarkdownRenderer) */
	.choice-content :global(img) {
		max-width: 100%;
		max-height: calc(12rem * var(--font-scale, 1));
		border-radius: calc(0.375rem * var(--font-scale, 1));
		object-fit: contain;
	}

	.validation-icon {
		display: inline-flex;
		align-items: center;
	}

	.helper-text {
		margin-top: calc(0.5rem * var(--font-scale, 1));
		font-size: calc(0.75rem * var(--font-scale, 1));
		color: hsl(var(--muted-foreground));
	}

	/* Responsive: 2 columns on medium screens */
	@media (min-width: 640px) {
		.choices-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
