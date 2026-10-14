<svelte:options namespace="svg" />

<!--
	Repère (grille, axes fléchés, graduations) d'une figure interactive, dessiné
	SOUS les objets de `GeometryCanvas` (prop `underlay`).

	Mêmes calculs et mêmes traits que le bloc ```figure statique
	(`buildFigureFrame` + `frameToSvg`, styles de `FigureBlockView`), mais sur la
	vue COURANTE : la fenêtre est la vue de la toile sans la marge des axes, et
	le repère suit le zoom et le déplacement.

	Vue très dézoomée : au-delà de `FIGURE_LIMITS.gridLines` lignes par axe, la
	grille (ou les graduations) disparaît plutôt que de figer l'onglet.
-->
<script lang="ts">
	import type { Viewport } from '$lib/geometry-core/viewport/types';
	import { buildFigureFrame } from '$lib/ubumark/utils/figure-scene';
	import { frameToSvg } from '$lib/ubumark/utils/figure-svg';
	import {
		FIGURE_LIMITS,
		type FigureHeader,
		type FigureSize,
		type FigureStep,
		type FigureWindow
	} from '$lib/ubumark/types/figure';

	interface Props {
		header: Pick<FigureHeader, 'axes' | 'grid' | 'ticks'>;
		size: FigureSize;
		/** Vue courante de la toile (marge comprise) */
		viewport: Viewport;
		/** Taille de la toile en px, marge comprise */
		width: number;
		height: number;
		/** Marge autour de la fenêtre, en px */
		margin: number;
	}

	let { header, size, viewport, width, height, margin }: Props = $props();

	function tooDense(step: FigureStep, w: FigureWindow): boolean {
		return (
			(w.xMax - w.xMin) / step.x > FIGURE_LIMITS.gridLines ||
			(w.yMax - w.yMin) / step.y > FIGURE_LIMITS.gridLines
		);
	}

	const drawing = $derived.by(() => {
		const innerWidth = width - 2 * margin;
		const innerHeight = height - 2 * margin;
		if (innerWidth <= 0 || innerHeight <= 0) return null;
		const ppu = width / (viewport.xMax - viewport.xMin);
		const inset = margin / ppu;
		const w: FigureWindow = {
			xMin: viewport.xMin + inset,
			xMax: viewport.xMax - inset,
			yMin: viewport.yMin + inset,
			yMax: viewport.yMax - inset
		};
		const grid = header.grid && !tooDense(header.grid, w) ? header.grid : null;
		const tickStep =
			header.ticks === false ? null : (header.ticks ?? header.grid ?? { x: 1, y: 1 });
		// Pas explicite : la grille peut avoir disparu, son pas reste celui des graduations
		const ticks = tickStep === null || tooDense(tickStep, w) ? false : tickStep;
		const frame = buildFigureFrame({ axes: header.axes, grid, ticks }, w, size);
		if (frame === null) return null;
		const toPx = (x: number, y: number) => ({ x: (x - w.xMin) * ppu, y: (w.yMax - y) * ppu });
		return frameToSvg(frame, toPx, innerWidth, innerHeight);
	});
</script>

{#if drawing}
	<g class="figure-repere" aria-hidden="true" transform="translate({margin}, {margin})">
		{#each drawing.gridLines as l, i (i)}
			<line class="figure-grille" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
		{/each}
		{#each drawing.axisLines as l, i (i)}
			<line class="figure-axe" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
		{/each}
		{#each drawing.arrowheads as points, i (i)}
			<polygon class="figure-fleche" {points} />
		{/each}
		{#each drawing.tickLines as l, i (i)}
			<line class="figure-graduation" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
		{/each}
		{#each drawing.tickLabels as t, i (i)}
			<text class="figure-graduation-texte" x={t.x} y={t.y} text-anchor={t.anchor}>{t.text}</text>
		{/each}
	</g>
{/if}

<style>
	/* Mêmes traits que le bloc ```figure statique (FigureBlockView) */
	.figure-grille {
		stroke: var(--color-border);
		stroke-width: 0.75;
	}

	.figure-axe {
		stroke: var(--color-foreground);
		stroke-width: 1.1;
	}

	.figure-fleche {
		fill: var(--color-foreground);
	}

	.figure-graduation {
		stroke: var(--color-foreground);
		stroke-width: 1;
	}

	.figure-graduation-texte {
		fill: var(--color-foreground);
		font-size: 10px;
	}
</style>
