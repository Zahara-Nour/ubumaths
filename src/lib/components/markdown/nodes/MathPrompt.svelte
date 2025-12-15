<!--
	MathPrompt Component
	====================

	Renders math expressions with editable \placeholder[N]{} prompts using MathLive.
	Uses <math-field readonly> which allows editing only in designated prompt areas.

	Features:
	- Editable prompts within readonly math expression
	- Validation state styling (correct/incorrect/neutral)
	- Two display modes: inline and block
	- Callbacks for prompt value changes

	@see MathLive fill-in-the-blank: https://mathlive.io/mathfield/guides/fill-in-the-blank/
	@module components/markdown/nodes/MathPrompt
-->
<script lang="ts">
	import 'mathlive';
	import type { InputState } from '$lib/custom-markdown';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';
	import { expressionToLatex, extractPromptIndices } from '../utils/math-utils';

	/**
	 * MathLive math-field element interface
	 * MathLive doesn't provide official TypeScript definitions,
	 * so we define the subset of the API we use.
	 */
	interface MathFieldElement extends HTMLElement {
		/** Get current value from a specific prompt by ID */
		getPromptValue(id: string): string | undefined;
		/** Set validation state for a prompt */
		setPromptState(id: string, state: 'correct' | 'incorrect' | undefined): void;
	}

	interface Props {
		/** Math expression (custom or LaTeX syntax) */
		expression: string;
		/** Syntax type of the expression */
		syntax: 'latex' | 'custom';
		/** Display mode: inline blends with text, block is centered */
		display?: 'inline' | 'block';
		/** Input states for validation display */
		inputs?: InputState[];
		/** Callback when a prompt value changes */
		onPromptChange?: (index: number, value: string) => void;
		/** Additional CSS classes */
		class?: string;
		/** Configuration for generic function names (f, g, h, P, Q, etc.) */
		genericFunctions?: GenericFunctionConfig | null;
	}

	let {
		expression,
		syntax,
		display = 'inline',
		inputs = [],
		onPromptChange,
		class: className = '',
		genericFunctions
	}: Props = $props();

	// Convert to LaTeX for rendering
	let latex = $derived(expressionToLatex(expression, syntax, genericFunctions));

	// Extract prompt indices from the expression
	let promptIndices = $derived(extractPromptIndices(expression, syntax));

	let mathField: HTMLElement | undefined = $state();

	/**
	 * Handle input events from the math field
	 * Extracts values from all prompts and notifies parent
	 */
	function handleInput() {
		if (!mathField) return;

		try {
			const field = mathField as MathFieldElement;
			for (const idx of promptIndices) {
				const value = field.getPromptValue(String(idx));
				if (value !== undefined) {
					onPromptChange?.(idx, value);
				}
			}
		} catch (error) {
			console.error('MathPrompt: Error reading prompt values:', error);
		}
	}

	/**
	 * Update prompt states (correct/incorrect) when inputs prop changes
	 */
	$effect(() => {
		if (!mathField) return;

		try {
			const field = mathField as MathFieldElement;
			for (const idx of promptIndices) {
				const inputState = inputs.find((i) => i.index === idx);
				if (inputState) {
					const state =
						inputState.isCorrect === true
							? 'correct'
							: inputState.isCorrect === false
								? 'incorrect'
								: undefined;
					field.setPromptState(String(idx), state);
				}
			}
		} catch (error) {
			console.error('MathPrompt: Error updating prompt states:', error);
		}
	});
</script>

{#if display === 'block'}
	<div class="math-prompt-block-container my-6 flex justify-center {className}">
		<math-field readonly bind:this={mathField} oninput={handleInput} class="math-prompt-block">
			{latex}
		</math-field>
	</div>
{:else}
	<math-field
		readonly
		bind:this={mathField}
		oninput={handleInput}
		class="math-prompt-inline {className}"
	>
		{latex}
	</math-field>
{/if}

<style>
	/* Inline math prompt - blend with text flow */
	:global(.math-prompt-inline) {
		display: inline-block;
		vertical-align: baseline;
		font-size: inherit;
		line-height: 1;
		margin: 0 0.125rem;
	}

	/* Block math prompt - centered display */
	:global(.math-prompt-block) {
		display: inline-block;
		font-size: 1.5rem;
		line-height: 1.4;
	}

	/* Style the prompts (editable areas) */
	:global(math-field[readonly] .ML__prompt) {
		background-color: hsl(var(--muted) / 0.3);
		border-radius: 0.25rem;
		padding: 0 0.25em;
		min-width: 2em;
	}

	:global(math-field[readonly] .ML__prompt:focus-within) {
		background-color: hsl(var(--accent) / 0.3);
		outline: 2px solid hsl(var(--ring));
		outline-offset: 1px;
	}

	/* Correct state */
	:global(math-field[readonly] .ML__prompt.ML__correct) {
		background-color: hsl(142.1 76.2% 36.3% / 0.2);
		border: 1px solid hsl(142.1 76.2% 36.3% / 0.5);
	}

	/* Incorrect state */
	:global(math-field[readonly] .ML__prompt.ML__incorrect) {
		background-color: hsl(var(--destructive) / 0.2);
		border: 1px solid hsl(var(--destructive) / 0.5);
	}
</style>
