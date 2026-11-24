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
	import { onMount } from 'svelte';
	import '#lib/utils/mathlive-styles.ts';
	import { convertLatexToSpeakableText } from 'mathlive';
	import { expressionToLatex } from '../utils/math-utils';
	import { readContentLocale } from '../content-locale';
	import { readCapitalPairs } from '../content-capital-pairs';
	import { readDigitGrouping } from '../content-digit-grouping';
	import {
		hasUnsafeMathCommand,
		isRefusedRestrictedFormula,
		readProjectMediaOnly,
		readRestrictedRendering
	} from '../restricted-rendering';
	import type { GenericFunctionConfig } from '#lib/mathAST/parser/types.ts';
	import { readBreakableMath } from '../content-breakable-math';
	import { splitLatexAtBreaks } from '#lib/utils/latex-break-points.ts';

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
	// Sens de `AB` de la question affichée (longueur ou produit), posé par sa carte
	const capitalPairs = readCapitalPairs();
	// Seuil des espaces de groupement de la question affichée, posé par sa carte
	const digitGrouping = readDigitGrouping();

	// Convert to LaTeX for rendering
	let latex = $derived(
		expressionToLatex(
			expression,
			syntax,
			genericFunctions,
			contentLocale(),
			capitalPairs(),
			digitGrouping()
		)
	);

	// Mode restreint (chat élève) : une commande MathLive de style, classe,
	// identifiant, données ou lien ne part pas dans MathLive — texte (S1) ; une
	// formule trop longue ou trop imbriquée non plus (rendu de plusieurs Mo).
	// `expression` d'abord : hors bornes, `latex` n'est jamais calculé (`$derived`
	// paresseux) — sa conversion lèverait sur une entrée géante.
	const isRestricted = readRestrictedRendering();
	// Cahier de texte (lecteurs anonymes du lien public, décision du 2026-11-08) : une
	// commande à attributs ferait charger une adresse choisie — texte, comme au chat
	const isProjectMediaOnly = readProjectMediaOnly();
	let unsafe = $derived(
		(isRestricted() &&
			(isRefusedRestrictedFormula(expression) || isRefusedRestrictedFormula(latex))) ||
			(isProjectMediaOnly() && (hasUnsafeMathCommand(expression) || hasUnsafeMathCommand(latex)))
	);
	// Lieu étroit (étapes à ranger, E52) : la formule en morceaux, la ligne se coupe
	// après un `=` ou un `+` ; ailleurs, d'un seul tenant
	const isBreakable = readBreakableMath();
	let pieces = $derived(isBreakable() ? splitLatexAtBreaks(latex) : [latex]);
	// `className` se répète sur chaque morceau : une classe à marge ou bordure les
	// encadrerait un à un (aucun appelant n'en passe aujourd'hui).
	// Découpée, la formule se lit d'un tenant : le conteneur porte la lecture de la
	// formule entière, les morceaux (chacun `role="img"` chez MathLive) sont cachés
	// Calculée dans le navigateur seulement : `convertLatexToSpeakableText` lit
	// `window.MathfieldElement`, au rendu serveur elle lève et la page part en 500.
	// Après le montage, pas par `browser` : l'hydratation ne réécrit pas un attribut.
	let mounted = $state(false);
	let spoken = $derived(
		mounted && pieces.length > 1 ? convertLatexToSpeakableText(latex) : undefined
	);

	onMount(() => {
		mounted = true;
	});
</script>

{#if unsafe}
	<code class="restricted-math {className}">${expression}$</code>
{:else}
	{#key latex}
		{#if pieces.length > 1}
			<span class="inline-math-pieces" role="img" aria-label={spoken}
				>{#each pieces as piece, i (i)}{#if i > 0}<wbr />{/if}<math-span
						class="inline-math-static {className}"
						aria-hidden="true">{piece}</math-span
					>{/each}</span
			>
		{:else}
			<math-span class="inline-math-static {className}">{latex}</math-span>
		{/if}
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
