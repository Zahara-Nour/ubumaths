<!--
	MathBlockEditable Component
	===========================

	Renders a block-level (display) math formula using MathLive's <math-field>.
	Centered with appropriate vertical spacing.

	Uses <math-field> for editable math input. For read-only display,
	use MathBlock.svelte instead (uses <math-div> for better performance).

	Features:
	- Editable MathLive field for input
	- Centered layout with vertical margins
	- Larger font size for display math
	- Bindable value for two-way data binding

	@see MathBlock.svelte for read-only display
-->
<script lang="ts">
	import 'mathlive';

	interface Props {
		value?: string;
		disabled?: boolean;
		placeholder?: string;
		class?: string;
		onchange?: (latex: string) => void;
	}

	let {
		value = $bindable(''),
		disabled = false,
		placeholder = '',
		class: className = '',
		onchange
	}: Props = $props();

	function handleInput(event: Event) {
		const target = event.target as HTMLElement & { value: string };
		value = target.value;
		onchange?.(value);
	}
</script>

<div class="math-block-editable-container my-6 flex justify-center {className}">
	<math-field
		class="math-block-editable text-2xl"
		{value}
		{disabled}
		{placeholder}
		oninput={handleInput}
	></math-field>
</div>

<style>
	/* Math block editable styling - centered display math */
	:global(.math-block-editable) {
		display: inline-block;
		font-size: 1.5rem; /* Larger for display math */
		line-height: 1.4;
		min-width: 200px;
		padding: 0.5rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		background: #f9fafb;
		transition: all 0.2s;
	}

	:global(.math-block-editable:hover) {
		border-color: #3b82f6;
	}

	:global(.math-block-editable:focus),
	:global(.math-block-editable:focus-within) {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
		background: white;
	}

	:global(.math-block-editable[disabled]) {
		opacity: 0.5;
		cursor: not-allowed;
		background: #f3f4f6;
	}
</style>
