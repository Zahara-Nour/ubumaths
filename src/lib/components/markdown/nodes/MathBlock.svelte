<!--
	MathBlock Component
	===================

	Renders a block-level (display) math formula using MathLive's <math-div>.
	Centered with appropriate vertical spacing.

	Uses <math-div> instead of <math-field read-only> for better performance:
	- Lazy-loaded, viewport-aware
	- Lighter weight (no editor machinery)
	- Purpose-built for static display

	Features:
	- Static MathLive rendering for display
	- Centered layout with vertical margins
	- Larger font size for display math

	@see ExerciseDisplay.svelte for rendering context
-->
<script lang="ts">
	import 'mathlive';
	import { expressionToLatex } from '../utils/math-utils';

	interface Props {
		expression: string;
		syntax: 'latex' | 'custom';
		class?: string;
	}

	let { expression, syntax, class: className = '' }: Props = $props();

	// Convert to LaTeX for rendering
	let latex = $derived(expressionToLatex(expression, syntax));
</script>

<div class="math-block-container my-6 flex justify-center {className}">
	<math-div class="math-block-static text-2xl">{latex}</math-div>
</div>

<style>
	/* Math block styling - centered display math */
	:global(.math-block-static) {
		display: inline-block;
		font-size: 1.5rem; /* Larger for display math */
		line-height: 1.4;
	}
</style>
