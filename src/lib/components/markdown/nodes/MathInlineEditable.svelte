<!--
	MathInlineEditable Component
	============================

	Renders an inline math formula using MathLive's <math-field>.
	Designed to blend with surrounding text while allowing editing.

	Uses <math-field> for editable math input. For read-only display,
	use MathInline.svelte instead (uses <math-span> for better performance).

	Features:
	- Editable MathLive field for input
	- Proper vertical alignment with text baseline
	- Inherits font size from parent
	- Bindable value for two-way data binding

	@see MathInline.svelte for read-only display
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

<math-field
	class="inline-math-editable {className}"
	{value}
	{disabled}
	{placeholder}
	oninput={handleInput}
></math-field>

<style>
	/* Math inline editable styling - blend with text while editable */
	:global(.inline-math-editable) {
		display: inline-block;
		vertical-align: baseline;
		margin: 0 0.25rem;
		font-size: inherit;
		line-height: 1;
		min-width: 3rem;
		padding: 0.125rem 0.375rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.25rem;
		background: #f9fafb;
		transition: all 0.2s;
	}

	:global(.inline-math-editable:hover) {
		border-color: #3b82f6;
	}

	:global(.inline-math-editable:focus),
	:global(.inline-math-editable:focus-within) {
		outline: 2px solid #3b82f6;
		outline-offset: 1px;
		background: white;
	}

	:global(.inline-math-editable[disabled]) {
		opacity: 0.5;
		cursor: not-allowed;
		background: #f3f4f6;
	}
</style>
