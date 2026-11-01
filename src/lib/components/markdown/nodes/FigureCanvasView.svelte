<!--
	FigureCanvasView — bloc ```figure à manipuler (chargé à la demande)
	===================================================================

	Lot 6 du chantier figure-et-choix (décisions de David du 2026-10-29) : un
	bloc ```figure qui porte `deplacable:` ou `rendu:` s'affiche dans la toile
	(`GeometryCanvas`) au lieu du SVG statique, partout à l'écran (énoncé, cours,
	fiche). Au PDF, la figure reste statique (`figure-typst`).

	- Même scène que le rendu statique (`buildFigureScene` : liste blanche,
	  budgets du bloc d'un texte), même cadre (`figureViewFromWindow`), même
	  repère (`FigureFrameLayer`).
	- Vue FIGÉE (`inDocument`) : ni molette, ni déplacement de la vue ; seuls
	  les objets se déplacent, et seulement avec `deplacable: oui`.
	- Rien n'est noté ni gardé : la figure repart de son état de départ à chaque
	  affichage, ou par « Remettre la figure ».
	- Noir par défaut (`#000000`) → `noir`, qui suit le thème (couleur du texte),
	  comme le SVG statique.

	Importé UNIQUEMENT par `FigureBlock` via `import()` : la toile (mathlive,
	roughjs) n'entre jamais dans le chunk des pages Markdown.

	@module components/markdown/nodes/FigureCanvasView
-->
<script lang="ts">
	import type { FigureInteractiveSettings, FigureNode } from '$lib/ubumark/types/figure';
	import { buildFigureScene, FIGURE_DEFAULT_COLOR } from '$lib/ubumark/utils/figure-scene';
	import { figureViewFromWindow } from '$lib/ubumark/utils/figure-view';
	import type { Figure } from '$lib/geometry-core/graph/figure';
	import type { Viewport } from '$lib/geometry-core/viewport/types';
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import FigureFrameLayer from '$lib/components/geometry/FigureFrameLayer.svelte';
	import { Button } from '$lib/components/ui/button';
	import FigureErrors from './FigureErrors.svelte';
	import { OVER_BUDGET_MESSAGE, readRenderBudget, withinBudget } from '../render-budget';
	import { readContentLocale } from '../content-locale';
	import { untrack } from 'svelte';

	interface Props {
		node: FigureNode;
		errorsVisible: boolean;
		class?: string;
	}

	let { node, errorsVisible, class: className = '' }: Props = $props();

	const budget = readRenderBudget();
	const locale = readContentLocale();

	/** Incrémenté par « Remettre la figure » : la scène est reconstruite */
	let resets = $state(0);
	let containerWidth = $state(0);

	const settings: FigureInteractiveSettings = $derived(
		node.interactive ?? { draggable: false, renderMode: 'normal' }
	);

	/** Texte du bloc et langue : seuls changements qui refont la scène (un nouvel objet `node` au même texte ne ramène pas la figure au départ) */
	const sourceKey = $derived(`${locale()}\n${node.source}`);
	/** Le texte a-t-il déjà été admis par le budget du document ? (« Remettre » ne le redépense pas) */
	let admittedKey: string | null = null;

	/** Scène calculée sous le budget de temps du document ; épuisé → cadre neutre */
	let result = $derived.by(() => {
		void sourceKey;
		void resets;
		return untrack(() => {
			const compute = () => buildFigureScene(node, { locale: locale() });
			const built = admittedKey === sourceKey ? compute() : withinBudget(budget(), compute);
			if (built === null) {
				return { scene: null, errors: [{ message: OVER_BUDGET_MESSAGE }], warnings: [] };
			}
			admittedKey = sourceKey;
			if (built.scene) themeDefaultColor(built.scene.figure);
			return built;
		});
	});

	const view = $derived(
		figureViewFromWindow(node.header.window, node.header.size, {
			axes: node.header.axes,
			maxWidth: containerWidth > 0 ? containerWidth : undefined
		})
	);
	/** Clé de recréation de la toile : sa taille (elle ignore ses props après montage) */
	const viewKey = $derived(`${view.width}x${view.height}`);
	const hasFrame = $derived(node.header.axes || node.header.grid !== null);

	/**
	 * Le noir par défaut de la scène suit le thème, comme dans le SVG statique :
	 * couleur absente (celle des réglages de la figure, `#000000`) ou noir écrit
	 * en hexadécimal → `noir`. Les réglages par défaut sont partagés par toutes
	 * les scènes (et le PDF) : on corrige les objets, pas les réglages.
	 */
	function themeDefaultColor(figure: Figure): void {
		const isDefault = (color: string | undefined) =>
			color === undefined || color.toLowerCase() === FIGURE_DEFAULT_COLOR;
		for (const el of figure.getAllElements()) {
			const fixes: { color?: string; fillColor?: string } = {};
			if (isDefault(el.style?.color)) fixes.color = 'noir';
			if (el.style?.fillColor?.toLowerCase() === FIGURE_DEFAULT_COLOR) fixes.fillColor = 'noir';
			if (fixes.color !== undefined || fixes.fillColor !== undefined) {
				figure.updateStyle(el.id, fixes);
			}
		}
	}
</script>

{#snippet frameLayer(canvas: { viewport: Viewport; width: number; height: number })}
	<FigureFrameLayer
		header={node.header}
		size={node.header.size}
		viewport={canvas.viewport}
		width={canvas.width}
		height={canvas.height}
		margin={view.margin}
		locale={locale()}
	/>
{/snippet}

{#if result.scene}
	{@const scene = result.scene}
	<figure class="figure-bloc figure-toile {className}" bind:clientWidth={containerWidth}>
		<div class="flex justify-center">
			{#key scene.figure}
				{#key viewKey}
					<GeometryCanvas
						figure={scene.figure}
						center={view.center}
						pixelsPerUnit={view.pixelsPerUnit}
						width={view.width}
						height={view.height}
						interactive={settings.draggable}
						objectsMovable={settings.draggable}
						renderMode={settings.renderMode}
						showGrid={false}
						showGraduations={false}
						inDocument
						ariaLabel={scene.ariaLabel}
						underlay={hasFrame ? frameLayer : undefined}
					/>
				{/key}
			{/key}
		</div>
		{#if settings.draggable}
			<div class="mt-1 flex justify-center">
				<Button variant="ghost" size="sm" onclick={() => resets++}>Remettre la figure</Button>
			</div>
		{/if}

		{#if errorsVisible && result.warnings.length > 0}
			<ul class="mt-1 text-xs text-warning">
				{#each result.warnings as w, i (i)}
					<li>{w.message}</li>
				{/each}
			</ul>
		{/if}
	</figure>
{:else}
	<FigureErrors errors={result.errors} {errorsVisible} class={className} />
{/if}

<style>
	.figure-bloc {
		margin: 0.5rem 0;
	}
</style>
