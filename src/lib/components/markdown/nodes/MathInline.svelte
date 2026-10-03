<!--
	MathInline Component
	====================

	Renders an inline math formula using MathLive's <math-span>.
	Designed to blend seamlessly with surrounding text.

	Uses <math-span> instead of <math-field read-only> for better performance:
	- Lazy-loaded, viewport-aware
	- Lighter weight (no editor machinery)
	- Purpose-built for static display

	Features:
	- Static MathLive rendering for display
	- Proper vertical alignment with text baseline
	- Inherits font size from parent
	- Configurable generic function recognition for derivatives (f'(x), P''(x))

	@see ExerciseDisplay.svelte for rendering context
-->
<script lang="ts">
	import 'mathlive';
	import { expressionToLatex } from '../utils/math-utils';
	import { readContentLocale } from '../content-locale';
	import { hasUnsafeMathCommand, readRestrictedRendering } from '../restricted-rendering';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';

	interface Props {
		expression: string;
		syntax: 'latex' | 'custom';
		class?: string;
		/** Configuration for generic function names (f, g, h, P, Q, etc.) */
		genericFunctions?: GenericFunctionConfig | null;
	}

	let { expression, syntax, class: className = '', genericFunctions }: Props = $props();

	// Langue du contenu (séparateur décimal), posée par MarkdownRenderer
	const contentLocale = readContentLocale();

	// Convert to LaTeX for rendering
	let latex = $derived(expressionToLatex(expression, syntax, genericFunctions, contentLocale()));

	// Mode restreint (chat élève) : une commande MathLive de style, classe,
	// identifiant, données ou lien ne part pas dans MathLive — texte (S1)
	const isRestricted = readRestrictedRendering();
	let unsafe = $derived(
		isRestricted() && (hasUnsafeMathCommand(expression) || hasUnsafeMathCommand(latex))
	);
</script>

{#if unsafe}
	<code class="restricted-math {className}">${expression}$</code>
{:else}
	{#key latex}
		<math-span class="inline-math-static {className}">{latex}</math-span>
	{/key}
{/if}

<style>
	/* Math inline styling - blend seamlessly with text */
	:global(.inline-math-static) {
		display: inline-block;
		vertical-align: baseline; /* Better text alignment than middle */
		margin: 0;
		font-size: inherit;
		line-height: 1; /* Reduce vertical spacing */
	}
</style>
