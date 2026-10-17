<!--
	Figure stockée (ADR 0027) rendue à partir du résultat de son texte.

	- Script nu (sans en-tête) : affichage historique, toile `width` × `height`,
	  40 px par unité, origine au centre, grille et graduations, objets déplaçables.
	- Avec en-tête : la fenêtre, la taille, le repère, `deplacable:` et `rendu:`
	  de l'en-tête (`figureViewFromWindow`, mêmes mesures que le bloc ```figure),
	  largeur bornée par le conteneur (téléphone). Les curseurs restent actifs.

	Une erreur (en-tête ou script) s'affiche à la place de la toile, avec son
	numéro de ligne. La toile est recréée à chaque nouveau résultat (`{#key}`) :
	un texte modifié est une autre figure ; de même quand la largeur disponible
	change la taille de la toile.
-->
<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import FigureFrameLayer from '$lib/components/geometry/FigureFrameLayer.svelte';
	import type { StoredFigureResult } from '$lib/utils/geometry-figure-script';
	import { figureViewFromWindow, windowFromCanvasView } from '$lib/ubumark/utils/figure-view';
	import type { FigureWindow } from '$lib/ubumark/types/figure';
	import type { Viewport } from '$lib/geometry-core/viewport/types';

	interface Props {
		/** `null` tant que le texte n'a pas été exécuté (rendu serveur, premier passage) */
		result: StoredFigureResult | null;
		/** Taille de la toile d'un script nu */
		width?: number;
		height?: number;
		/** Fenêtre montrée par la toile, à chaque zoom ou déplacement (« Prendre le cadrage actuel ») */
		onWindowChange?: (window: FigureWindow) => void;
	}

	let { result, width = 520, height = 520, onWindowChange }: Props = $props();

	let containerWidth = $state(0);

	const display = $derived(result?.ok ? result.display : null);
	const view = $derived(
		display
			? figureViewFromWindow(display.header.window, display.header.size, {
					axes: display.header.axes,
					maxWidth: containerWidth > 0 ? containerWidth : undefined
				})
			: null
	);
	/** Clé de recréation de la toile : sa taille, pas l'objet (recalculé à chaque mesure) */
	const viewKey = $derived(view ? `${view.width}x${view.height}` : '');
	const hasFrame = $derived(
		display !== null && (display.header.axes || display.header.grid !== null)
	);
</script>

{#snippet frameLayer(canvas: { viewport: Viewport; width: number; height: number })}
	{#if display && view}
		<FigureFrameLayer
			header={display.header}
			size={display.header.size}
			viewport={canvas.viewport}
			width={canvas.width}
			height={canvas.height}
			margin={view.margin}
		/>
	{/if}
{/snippet}

<div class="max-w-full overflow-auto" bind:clientWidth={containerWidth}>
	{#if result === null}
		<div
			class="flex max-w-full items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground"
			style:width="{width}px"
			style:height="{height}px"
		>
			Chargement de la figure…
		</div>
	{:else if result.ok && display && view}
		{@const margin = view.margin}
		{#key result.figure}
			{#key viewKey}
				<GeometryCanvas
					figure={result.figure}
					center={view.center}
					pixelsPerUnit={view.pixelsPerUnit}
					width={view.width}
					height={view.height}
					showGrid={false}
					showGraduations={false}
					objectsMovable={display.settings.draggable}
					renderMode={display.settings.renderMode}
					onViewportChange={(viewport, ppu) =>
						onWindowChange?.(windowFromCanvasView(viewport, ppu, margin))}
					underlay={hasFrame ? frameLayer : undefined}
				/>
			{/key}
		{/key}
	{:else if result.ok}
		{#key result.figure}
			<GeometryCanvas
				figure={result.figure}
				{width}
				{height}
				onViewportChange={(viewport, ppu) =>
					onWindowChange?.(windowFromCanvasView(viewport, ppu, 0))}
			/>
		{/key}
	{:else}
		<div
			role="alert"
			class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm whitespace-pre-wrap text-destructive"
		>
			{result.message}
		</div>
	{/if}
</div>
