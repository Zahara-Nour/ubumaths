<!--
	Fill-in-Blanks Input Component
	===============================

	Renders a statement with editable MathField inputs at blank positions.
	Blanks are represented by underscores (__) or placeholders in the statement.

	Props:
	- statement: Statement text with LaTeX (from instance.statement)
	- blanks: Array of blank configurations with positions
	- values: Array of user answers for each blank (bindable)
	- disabled: Whether inputs are disabled
	- validationResults: Array of validation results per blank (optional)
	- onSubmit: Callback when Enter is pressed
-->

<script lang="ts">
	import type { ContentField } from '$lib/questions/types';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { convertLegacyLatexToMarkdown } from '$lib/utils/latex-syntax-adapter';
	import MathField from '$lib/components/MathField.svelte';
	import { Check, X } from 'lucide-svelte';

	interface BlankConfig {
		position: number;
		expectedAnswer: string;
	}

	interface Props {
		statement: ContentField[];
		blanks: BlankConfig[];
		values?: string[];
		disabled?: boolean;
		validationResults?: (boolean | null)[];
		onSubmit?: () => void;
	}

	let {
		statement,
		blanks,
		values = $bindable([]),
		disabled = false,
		validationResults = [],
		onSubmit
	}: Props = $props();

	// Initialize values array if empty
	$effect(() => {
		if (values.length === 0 && blanks.length > 0) {
			values = blanks.map(() => '');
		}
	});

	// Handle Enter key to submit
	function handleKeydown(e: KeyboardEvent, _index: number) {
		if (e.key === 'Enter' && !disabled && onSubmit) {
			e.preventDefault();
			onSubmit();
		}
	}

	// Render statement with blanks as MathFields
	// Statement is typically a single text field with blanks marked as ____
	const statementText = $derived(
		statement
			.filter((s) => s.type === 'text')
			.map((s) => (s.type === 'text' ? s.content : ''))
			.join(' ')
	);

	// Split statement by blank markers (4 underscores)
	const segments = $derived(statementText.split('____'));
</script>

<div class="fill-blanks-container">
	<!-- Render statement segments with blank inputs interspersed -->
	<div class="statement-with-blanks">
		{#each segments as segment, i (i)}
			<!-- Render text/math segment -->
			{#if segment.trim()}
				<span class="segment-text">
					<MarkdownRenderer content={convertLegacyLatexToMarkdown(segment)} />
				</span>
			{/if}

			<!-- Render blank input (except after last segment) -->
			{#if i < segments.length - 1}
				<span class="blank-wrapper">
					<MathField
						bind:value={values[i]}
						read-only={disabled}
						virtual-keyboard-mode="manual"
						class="blank-input {validationResults[i] === true
							? 'correct'
							: validationResults[i] === false
								? 'incorrect'
								: ''}"
						placeholder="\\placeholder&#123;&#125;"
						onkeydown={(e: KeyboardEvent) => handleKeydown(e, i)}
					/>

					<!-- Validation indicator -->
					{#if validationResults[i] !== undefined && validationResults[i] !== null}
						<span class="validation-icon">
							{#if validationResults[i]}
								<Check class="h-4 w-4 text-green-600" />
							{:else}
								<X class="h-4 w-4 text-red-600" />
							{/if}
						</span>
					{/if}
				</span>
			{/if}
		{/each}
	</div>

	<!-- Helper text -->
	{#if !disabled}
		<div class="helper-text">
			<span class="text-xs text-muted-foreground"> Remplissez les blancs avec vos réponses </span>
		</div>
	{/if}
</div>

<style>
	.fill-blanks-container {
		width: 100%;
	}

	.statement-with-blanks {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: calc(0.5rem * var(--font-scale, 1));
		font-size: calc(1.125rem * var(--font-scale, 1));
		line-height: 1.6;
	}

	.segment-text {
		display: inline;
	}

	.blank-wrapper {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: calc(0.25rem * var(--font-scale, 1));
	}

	:global(.blank-input) {
		min-width: calc(8rem * var(--font-scale, 1));
		min-height: calc(2.5rem * var(--font-scale, 1));
		padding: calc(0.5rem * var(--font-scale, 1));
		font-size: calc(1rem * var(--font-scale, 1));
		border: 2px solid hsl(var(--border));
		border-radius: calc(0.375rem * var(--font-scale, 1));
		background: hsl(var(--background));
		transition: all 0.2s ease;
	}

	:global(.blank-input:focus) {
		outline: none;
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
	}

	:global(.blank-input[read-only]) {
		opacity: 0.5;
		cursor: not-allowed;
		background: hsl(var(--muted));
	}

	/* Validation states */
	:global(.blank-input.correct) {
		border-color: rgb(34, 197, 94); /* green-600 */
		background: rgb(220, 252, 231); /* green-100 */
	}

	:global(.dark .blank-input.correct) {
		border-color: rgb(34, 197, 94);
		background: rgb(20, 83, 45); /* green-950 */
	}

	:global(.blank-input.incorrect) {
		border-color: rgb(220, 38, 38); /* red-600 */
		background: rgb(254, 226, 226); /* red-100 */
	}

	:global(.dark .blank-input.incorrect) {
		border-color: rgb(220, 38, 38);
		background: rgb(69, 10, 10); /* red-950 */
	}

	.validation-icon {
		display: inline-flex;
		align-items: center;
		margin-left: calc(0.25rem * var(--font-scale, 1));
	}

	.helper-text {
		margin-top: calc(0.5rem * var(--font-scale, 1));
		font-size: calc(0.75rem * var(--font-scale, 1));
		color: hsl(var(--muted-foreground));
	}
</style>
