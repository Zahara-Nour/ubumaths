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
	- Budget du DOCUMENT épuisé (`render-budget.ts`) : cadre neutre.
	- Case « figure » (```figure-a-completer, `answer` ou `showSolution`) : la
	  vue de saisie (`FigureACompleterView`), chargée à la demande elle aussi.

	@module components/markdown/nodes/FigureBlock
-->
<script lang="ts">
	import type { FigureNode } from '$lib/ubumark/types/figure';
	import { FIGURE_AXES_MARGIN_PX, FIGURE_PIXEL_WIDTH } from '$lib/ubumark/types/figure';
	import { readAuthoringErrors } from '../authoring-errors';
	import { OVER_BUDGET_MESSAGE, readRenderBudget } from '../render-budget';
	import FigureErrors from './FigureErrors.svelte';

	interface ConstructionAnswer {
		value: string;
		isCorrect: boolean | null;
		disabled: boolean;
		onChange: (value: string) => void;
	}

	interface Props {
		node: FigureNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		/** Case « figure » d'une question (bloc ```figure-a-completer) : l'élève trace */
		answer?: ConstructionAnswer;
		/** Case « figure », mode correction : la bonne droite */
		showSolution?: boolean;
		class?: string;
	}

	let { node, showErrors, answer, showSolution = false, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	/** Budget du document (nombre de figures) : au-delà, cadre neutre sans rien charger */
	const budget = readRenderBudget();
	let admitted = $derived(budget()?.admits(node) ?? true);

	/** Marge des axes (flèches, graduations), comme l'afficheur */
	let margin = $derived(node.header.axes ? FIGURE_AXES_MARGIN_PX : 0);
	let placeholderWidth = $derived(FIGURE_PIXEL_WIDTH[node.header.size] + 2 * margin);

	let placeholderRatio = $derived.by(() => {
		const w = node.header.window;
		if (!w) return '4 / 3';
		if (margin === 0) return `${w.xMax - w.xMin} / ${w.yMax - w.yMin}`;
		const px = FIGURE_PIXEL_WIDTH[node.header.size];
		const height = (px * (w.yMax - w.yMin)) / (w.xMax - w.xMin);
		return `${px + 2 * margin} / ${height + 2 * margin}`;
	});

	/** Saisie ou correction d'une case « figure » ; sinon l'afficheur statique */
	let completing = $derived(
		node.construction !== undefined && (answer !== undefined || showSolution)
	);
	// Promesses créées au premier besoin seulement : rien n'est chargé pour l'autre vue
	let staticView: Promise<typeof import('./FigureBlockView.svelte')> | undefined;
	let completerView: Promise<typeof import('./FigureACompleterView.svelte')> | undefined;
	const loadStaticView = () => (staticView ??= import('./FigureBlockView.svelte'));
	const loadCompleterView = () => (completerView ??= import('./FigureACompleterView.svelte'));
</script>

{#snippet loading()}
	<div
		class="figure-chargement mx-auto my-2 w-full rounded-md bg-muted/40 {className}"
		style:max-width="{placeholderWidth}px"
		style:aspect-ratio={placeholderRatio}
		aria-busy="true"
		aria-label="Figure en cours de chargement"
	></div>
{/snippet}

{#if node.errors.length > 0}
	<FigureErrors errors={node.errors} {errorsVisible} class={className} />
{:else if !admitted}
	<FigureErrors errors={[{ message: OVER_BUDGET_MESSAGE }]} {errorsVisible} class={className} />
{:else}
	{#if completing}
		{#await loadCompleterView()}
			{@render loading()}
		{:then module}
			<module.default {node} {errorsVisible} {answer} {showSolution} class={className} />
		{:catch}
			<FigureErrors errors={[]} errorsVisible={false} class={className} />
		{/await}
	{:else}
		{#await loadStaticView()}
			{@render loading()}
		{:then module}
			<module.default {node} {errorsVisible} class={className} />
		{:catch}
			<FigureErrors errors={[]} errorsVisible={false} class={className} />
		{/await}
	{/if}
{/if}
