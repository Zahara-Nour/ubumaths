<!--
	MathInlineEditable Component
	============================

	Editable inline math input using MathLive's <math-field>.
	Designed to blend with surrounding text while allowing editing.

	This component is ALWAYS editable. For read-only display,
	use MathInline.svelte instead (uses <math-span> for better performance).

	Features:
	- Editable MathLive field for math input
	- Proper vertical alignment with text baseline
	- Inherits font size from parent
	- Bindable value for two-way data binding
	- Virtual keyboard support

	@see MathInline.svelte for read-only display
-->
<script lang="ts">
	import 'mathlive';

	interface Props {
		value?: string;
		placeholder?: string;
		class?: string;
		onchange?: (latex: string) => void;
	}

	let {
		value = $bindable(''),
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

<math-field class="inline-math-editable {className}" {value} {placeholder} oninput={handleInput}
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
</style>
