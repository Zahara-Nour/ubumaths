<!--
	FigureBlock — bloc ```figure
	============================

	Composant LÉGER, dans le chunk des pages Markdown : il n'importe RIEN de
	geometry-core. L'interpréteur du DSL et l'afficheur SVG (`FigureBlockView`)
	sont chargés À LA DEMANDE, seulement quand une page contient une figure.

	- En-tête en erreur : messages pour le prof, cadre neutre pour l'élève (Q48),
	  sans rien charger.
	- Pendant le chargement : un cadre aux proportions de la figure (pas de saut
	  de mise en page).
	- Chargement impossible (réseau) : « Figure indisponible ».

	@module components/markdown/nodes/FigureBlock
-->
<script lang="ts">
	import type { FigureNode } from '$lib/ubumark/types/figure';
	import { readAuthoringErrors } from '../authoring-errors';
	import FigureErrors from './FigureErrors.svelte';

	interface Props {
		node: FigureNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	/** Largeur à l'écran par taille (même table que `FIGURE_PIXEL_WIDTH`, sans l'importer) */
	const PLACEHOLDER_WIDTH = { petite: 280, moyenne: 400, grande: 560 } as const;

	let placeholderRatio = $derived.by(() => {
		const w = node.header.window;
		return w ? `${w.xMax - w.xMin} / ${w.yMax - w.yMin}` : '4 / 3';
	});

	const view = import('./FigureBlockView.svelte');
</script>

{#if node.errors.length > 0}
	<FigureErrors errors={node.errors} {errorsVisible} class={className} />
{:else}
	{#await view}
		<div
			class="figure-chargement mx-auto my-2 w-full rounded-md bg-muted/40 {className}"
			style:max-width="{PLACEHOLDER_WIDTH[node.header.size]}px"
			style:aspect-ratio={placeholderRatio}
			aria-busy="true"
			aria-label="Figure en cours de chargement"
		></div>
	{:then module}
		<module.default {node} {errorsVisible} class={className} />
	{:catch}
		<FigureErrors errors={[]} errorsVisible={false} class={className} />
	{/await}
{/if}
