<!--
	MathInlineOld Component (DEPRECATED)
	=====================================

	DEPRECATED: This component uses <math-field read-only> which loads the full
	editor machinery. Use MathInline.svelte instead, which uses <math-span> for
	better performance (lazy-loaded, viewport-aware, lighter weight).

	Renders an inline math formula using MathLive.
	Designed to blend seamlessly with surrounding text.

	Features:
	- Read-only MathLive field for display
	- Transparent background, no borders
	- Proper vertical alignment with text baseline
	- Inherits font size from parent

	@see ExerciseDisplay.svelte for rendering context
	@deprecated Use MathInline.svelte instead
-->
<script lang="ts">
	import 'mathlive';

	interface Props {
		latex: string;
		class?: string;
	}

	let { latex, class: className = '' }: Props = $props();
</script>

<math-field read-only class="inline-math {className}" value={latex}></math-field>

<style>
	/* Math inline styling - blend seamlessly with text */
	:global(.inline-math) {
		display: inline-block;
		vertical-align: baseline; /* Better text alignment than middle */
		margin: 0;
		font-size: inherit;
		line-height: 1; /* Reduce vertical spacing */
	}

	/* Math field read-only styling - minimize internal padding */
	:global(.inline-math[read-only]) {
		border: none;
		background: transparent;
		cursor: default;
		padding: 0;
		/* MathLive CSS custom properties to reduce internal spacing */
		--_padding-vertical: 0;
		--_padding-horizontal: 0;
	}

	/* Target MathLive's internal container via ::part() if exposed */
	:global(.inline-math[read-only]::part(container)) {
		padding: 0 !important;
		margin: 0 !important;
	}

	/* Target internal MathLive elements */
	:global(.inline-math[read-only] .ML__container) {
		padding: 0 !important;
	}

	:global(.inline-math[read-only] .ML__content) {
		padding: 0 !important;
	}

	:global(.inline-math[read-only] .ML__base) {
		padding: 0 !important;
	}

	/* Remove hover effects for read-only display */
	:global(.inline-math:hover) {
		background: transparent !important;
		border: none !important;
		box-shadow: none !important;
		cursor: default !important;
	}

	/* Remove focus effects */
	:global(.inline-math:focus),
	:global(.inline-math:focus-within) {
		background: transparent !important;
		border: none !important;
		outline: none !important;
		box-shadow: none !important;
	}
</style>
