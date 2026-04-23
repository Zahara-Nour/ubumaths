<script lang="ts">
	import { Figure } from '$lib/geometry-core/graph/figure';
	import {
		createTransformer,
		type CoordinateTransformer
	} from '$lib/geometry-core/viewport/viewport';
	import type { Viewport } from '$lib/geometry-core/viewport/types';
	import {
		pointToSVG,
		segmentToSVG,
		lineToSVG,
		rayToSVG,
		circleToSVG
	} from '$lib/geometry-core/rendering/svg-primitives';
	import { findPointNear } from '$lib/geometry-core/interaction/hit-testing';
	import { snapToGrid } from '$lib/geometry-core/interaction/snap';
	import { numeric } from '$lib/geometry-core/types/geo-value';
	import { isPointElement } from '$lib/geometry-core/types/elements';

	interface Props {
		figure: Figure;
		center?: { x: number; y: number };
		pixelsPerUnit?: number;
		width?: number;
		height?: number;
		interactive?: boolean;
		showGrid?: boolean;
		gridStep?: number;
		snapOnRelease?: boolean;
		pointRadius?: number;
	}

	let {
		figure,
		center = { x: 0, y: 0 },
		pixelsPerUnit = 40,
		width = 800,
		height = 600,
		interactive = true,
		showGrid = true,
		gridStep = 1,
		snapOnRelease = false,
		pointRadius = 5
	}: Props = $props();

	let svgRef: SVGSVGElement | undefined = $state();
	let draggingId: string | null = $state(null);
	let hoveredId: string | null = $state(null);
	let version = $state(0);

	// Viewport derived from center + pixelsPerUnit + SVG size.
	// Always isometric: same scale on both axes.
	let viewport: Viewport = $derived({
		xMin: center.x - width / (2 * pixelsPerUnit),
		xMax: center.x + width / (2 * pixelsPerUnit),
		yMin: center.y - height / (2 * pixelsPerUnit),
		yMax: center.y + height / (2 * pixelsPerUnit)
	});

	let transformer: CoordinateTransformer = $derived(createTransformer(viewport, width, height));

	let gridLines = $derived.by(() => {
		if (!showGrid) return { vertical: [] as number[], horizontal: [] as number[] };
		const vertical: number[] = [];
		const horizontal: number[] = [];
		const startX = Math.ceil(viewport.xMin / gridStep) * gridStep;
		const startY = Math.ceil(viewport.yMin / gridStep) * gridStep;
		for (let x = startX; x <= viewport.xMax; x += gridStep) vertical.push(x);
		for (let y = startY; y <= viewport.yMax; y += gridStep) horizontal.push(y);
		return { vertical, horizontal };
	});

	let elements = $derived.by(() => {
		void version;
		return figure.getAllElements();
	});
	let dims = $derived({ width, height });

	// ─── Pointer events ─────────────────────────────────────────────

	function getMathCoords(e: PointerEvent): { x: number; y: number } | null {
		if (!svgRef) return null;
		const rect = svgRef.getBoundingClientRect();
		const svgX = e.clientX - rect.left;
		const svgY = e.clientY - rect.top;
		return transformer.svgToMath(svgX, svgY);
	}

	function onPointerDown(e: PointerEvent) {
		if (!interactive) return;
		const math = getMathCoords(e);
		if (!math) return;

		const threshold = 15 / pixelsPerUnit; // 15px in math units
		const pointId = findPointNear(figure, math.x, math.y, threshold);

		if (pointId) {
			const el = figure.getElementById(pointId);
			if (el?.type === 'freePoint') {
				draggingId = pointId;
				svgRef?.setPointerCapture(e.pointerId);
			}
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (!interactive) return;
		const math = getMathCoords(e);
		if (!math) return;

		if (draggingId) {
			figure.movePoint(draggingId, numeric(math.x), numeric(math.y));
			figure.recompute();
			version++;
		} else {
			const threshold = 15 / pixelsPerUnit;
			hoveredId = findPointNear(figure, math.x, math.y, threshold);
		}
	}

	function onPointerUp(e: PointerEvent) {
		if (!draggingId) return;

		if (snapOnRelease) {
			const math = getMathCoords(e);
			if (math) {
				const snapped = snapToGrid(math.x, math.y, gridStep);
				figure.movePoint(draggingId, snapped.x, snapped.y);
				figure.recompute();
				version++;
			}
		}

		draggingId = null;
	}
</script>

<svg
	bind:this={svgRef}
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	role="application"
	aria-label="Figure de geometrie interactive"
	class="geometry-canvas"
	class:interactive
	class:dragging={draggingId !== null}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
>
	<!-- Grid -->
	{#if showGrid}
		<g class="grid">
			{#each gridLines.vertical as x (x)}
				{@const sv = transformer.mathToSvg(x, 0)}
				<line x1={sv.x} y1={0} x2={sv.x} y2={height} class="grid-line" class:axis={x === 0} />
			{/each}
			{#each gridLines.horizontal as y (y)}
				{@const sv = transformer.mathToSvg(0, y)}
				<line x1={0} y1={sv.y} x2={width} y2={sv.y} class="grid-line" class:axis={y === 0} />
			{/each}
		</g>
	{/if}

	<!-- Elements -->
	<g class="elements">
		{#each elements as el (`${el.id}_${version}`)}
			{#if el.type === 'segment'}
				{@const svg = segmentToSVG(el.id, figure, transformer)}
				{#if svg}
					<line
						x1={svg.x1}
						y1={svg.y1}
						x2={svg.x2}
						y2={svg.y2}
						stroke={el.color}
						stroke-width="2"
						class="segment"
					/>
				{/if}
			{:else if el.type === 'line'}
				{@const svg = lineToSVG(el.id, figure, transformer, dims)}
				{#if svg}
					<line
						x1={svg.x1}
						y1={svg.y1}
						x2={svg.x2}
						y2={svg.y2}
						stroke={el.color}
						stroke-width="1.5"
						class="geo-line"
					/>
				{/if}
			{:else if el.type === 'ray'}
				{@const svg = rayToSVG(el.id, figure, transformer, dims)}
				{#if svg}
					<line
						x1={svg.x1}
						y1={svg.y1}
						x2={svg.x2}
						y2={svg.y2}
						stroke={el.color}
						stroke-width="1.5"
						class="ray"
					/>
				{/if}
			{:else if el.type === 'circleByRadius' || el.type === 'circleByPoint'}
				{@const svg = circleToSVG(el.id, figure, transformer)}
				{#if svg}
					<circle
						cx={svg.cx}
						cy={svg.cy}
						r={svg.r}
						stroke={el.color}
						stroke-width="2"
						fill="none"
						class="circle"
					/>
				{/if}
			{/if}
		{/each}

		<!-- Points rendered last (on top) -->
		{#each elements as el (`${el.id}_${version}`)}
			{#if isPointElement(el)}
				{@const svg = pointToSVG(el.id, figure, transformer)}
				{#if svg}
					<circle
						cx={svg.cx}
						cy={svg.cy}
						r={pointRadius}
						fill={el.color}
						class="point"
						class:draggable={interactive && el.type === 'freePoint'}
						class:hovered={hoveredId === el.id}
						class:dragging={draggingId === el.id}
					/>
					{#if el.label}
						<text
							x={svg.cx + pointRadius + 4}
							y={svg.cy - pointRadius - 2}
							class="label"
							fill={el.color}>{el.label}</text
						>
					{/if}
				{/if}
			{/if}
		{/each}
	</g>
</svg>

<style>
	.geometry-canvas {
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: #ffffff;
		touch-action: none;
		user-select: none;
	}

	.geometry-canvas.interactive {
		cursor: default;
	}

	.geometry-canvas.dragging {
		cursor: grabbing;
	}

	.grid-line {
		stroke: #d1d5db;
		stroke-width: 0.5;
	}

	.grid-line.axis {
		stroke: #6b7280;
		stroke-width: 1.5;
	}

	.point.draggable {
		cursor: grab;
	}

	.point.draggable:hover,
	.point.hovered {
		stroke: #f59e0b;
		stroke-width: 2;
		r: 7;
	}

	.point.dragging {
		stroke: #f59e0b;
		stroke-width: 3;
		r: 8;
		cursor: grabbing;
	}

	.label {
		font-size: 14px;
		font-family: 'KaTeX_Main', serif;
		pointer-events: none;
	}
</style>
