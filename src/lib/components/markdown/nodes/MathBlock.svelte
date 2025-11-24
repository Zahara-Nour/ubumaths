<!--
	MathBlock Component
	===================

	Renders a block-level (display) math formula using MathLive.
	Centered with appropriate vertical spacing.

	Features:
	- Read-only MathLive field for display
	- Centered layout with vertical margins
	- Larger font size for display math
	- Transparent background, no borders

	@see ExerciseDisplay.svelte for rendering context
-->
<script lang="ts">
	import 'mathlive';

	interface Props {
		latex: string;
		class?: string;
	}

	let { latex, class: className = '' }: Props = $props();
</script>

<div class="math-block-container my-6 flex justify-center {className}">
	<math-field read-only class="math-block text-2xl" value={latex}></math-field>
</div>

<style>
	/* Math block styling - centered display math */
	:global(.math-block) {
		display: inline-block;
		font-size: 1.5rem; /* Larger for display math */
		line-height: 1.4;
	}

	/* Math field read-only styling */
	:global(.math-block[read-only]) {
		border: none;
		background: transparent;
		cursor: default;
		padding: 0;
		/* MathLive CSS custom properties to reduce internal spacing */
		--_padding-vertical: 0;
		--_padding-horizontal: 0;
	}

	/* Target MathLive's internal container via ::part() if exposed */
	:global(.math-block[read-only]::part(container)) {
		padding: 0 !important;
		margin: 0 !important;
	}

	/* Target internal MathLive elements */
	:global(.math-block[read-only] .ML__container) {
		padding: 0 !important;
	}

	:global(.math-block[read-only] .ML__content) {
		padding: 0 !important;
	}

	:global(.math-block[read-only] .ML__base) {
		padding: 0 !important;
	}

	/* Remove hover effects for read-only display */
	:global(.math-block:hover) {
		background: transparent !important;
		border: none !important;
		box-shadow: none !important;
		cursor: default !important;
	}

	/* Remove focus effects */
	:global(.math-block:focus),
	:global(.math-block:focus-within) {
		background: transparent !important;
		border: none !important;
		outline: none !important;
		box-shadow: none !important;
	}
</style>
