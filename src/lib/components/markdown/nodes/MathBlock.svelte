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
	- Configurable generic function recognition for derivatives (f'(x), P''(x))

	@see ExerciseDisplay.svelte for rendering context
-->
<script lang="ts">
	import 'mathlive';
	import { expressionToLatex } from '../utils/math-utils';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';

	interface Props {
		expression: string;
		syntax: 'latex' | 'custom';
		class?: string;
		/** Configuration for generic function names (f, g, h, P, Q, etc.) */
		genericFunctions?: GenericFunctionConfig | null;
	}

	let { expression, syntax, class: className = '', genericFunctions }: Props = $props();

	// Debug: log what MathBlock receives - access genericFunctions directly to ensure tracking
	$effect(() => {
		const gfNames = genericFunctions?.names ?? null;
		console.log('[MathBlock] Rendering:', {
			expression,
			syntax,
			genericFunctions: gfNames,
			hasGenericFunctions: !!genericFunctions
		});
	});

	// Convert to LaTeX for rendering
	let latex = $derived(expressionToLatex(expression, syntax, genericFunctions));
</script>

<div class="math-block-container my-6 flex justify-center {className}">
	<math-div class="math-block-static">{latex}</math-div>
</div>

<style>
	/* Math block styling - centered display math */
	:global(.math-block-static) {
		display: inline-block;
		font-size: 1em;
		line-height: 1.4;
	}
</style>
