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
		center: initialCenter = { x: 0, y: 0 },
		pixelsPerUnit: initialPpu = 40,
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

	// Local state for pan/zoom. Initialized from props, then diverges.
	// Pan/zoom modify these directly — prop changes after mount are ignored.
	let viewCenter = $state({ x: initialCenter.x, y: initialCenter.y });
	let ppu = $state(initialPpu);
	let isPanning = $state(false);
	let spaceHeld = $state(false);

	// Zoom limits
	const MIN_PPU = 5;
	const MAX_PPU = 200;

	// Viewport derived from center + pixelsPerUnit + SVG size.
	let viewport: Viewport = $derived({
		xMin: viewCenter.x - width / (2 * ppu),
		xMax: viewCenter.x + width / (2 * ppu),
		yMin: viewCenter.y - height / (2 * ppu),
		yMax: viewCenter.y + height / (2 * ppu)
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

	function getMathCoords(e: PointerEvent | WheelEvent): { x: number; y: number } | null {
		if (!svgRef) return null;
		const rect = svgRef.getBoundingClientRect();
		const svgX = e.clientX - rect.left;
		const svgY = e.clientY - rect.top;
		return transformer.svgToMath(svgX, svgY);
	}

	function onPointerDown(e: PointerEvent) {
		if (!interactive) return;

		// Middle button or space held = start panning
		if (e.button === 1 || spaceHeld) {
			isPanning = true;
			svgRef?.setPointerCapture(e.pointerId);
			e.preventDefault();
			return;
		}

		const math = getMathCoords(e);
		if (!math) return;

		const threshold = 15 / ppu;
		const pointId = findPointNear(figure, math.x, math.y, threshold);

		if (pointId) {
			const el = figure.getElementById(pointId);
			if (el?.type === 'freePoint') {
				draggingId = pointId;
				figure.beginTransaction();
				svgRef?.setPointerCapture(e.pointerId);
				e.preventDefault();
			}
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (!interactive) return;

		// Panning: move center by pointer delta
		if (isPanning) {
			viewCenter = {
				x: viewCenter.x - e.movementX / ppu,
				y: viewCenter.y + e.movementY / ppu // y inverted
			};
			return;
		}

		const math = getMathCoords(e);
		if (!math) return;

		if (draggingId) {
			figure.movePoint(draggingId, numeric(math.x), numeric(math.y));
			figure.recompute();
			version++;
		} else {
			const threshold = 15 / ppu;
			hoveredId = findPointNear(figure, math.x, math.y, threshold);
		}
	}

	function onPointerCancel() {
		if (draggingId) figure.discard();
		isPanning = false;
		draggingId = null;
	}

	function onPointerUp(e: PointerEvent) {
		if (isPanning) {
			isPanning = false;
			return;
		}

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

		figure.commit();
		draggingId = null;
	}

	// ─── Wheel: zoom centered on cursor ─────────────────────────────

	function onWheel(e: WheelEvent) {
		if (!interactive) return;
		e.preventDefault();

		const math = getMathCoords(e);
		if (!math) return;

		// Zoom factor: scroll up = zoom in (more pixels per unit)
		const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
		const newPpu = Math.max(MIN_PPU, Math.min(MAX_PPU, ppu * factor));

		// Adjust center so the point under the cursor stays fixed
		// Before: math coords of cursor = viewCenter + (svgPos - svgCenter) / ppu
		// After: same math point = newCenter + (svgPos - svgCenter) / newPpu
		// => newCenter = math - (math - viewCenter) * (ppu / newPpu)
		const ratio = ppu / newPpu;
		viewCenter = {
			x: math.x - (math.x - viewCenter.x) * ratio,
			y: math.y - (math.y - viewCenter.y) * ratio
		};
		ppu = newPpu;
	}

	// ─── Keyboard: space for pan mode ───────────────────────────────

	function isTextInput(e: KeyboardEvent): boolean {
		const target = e.target as HTMLElement;
		return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
	}

	function onKeyDown(e: KeyboardEvent) {
		if (isTextInput(e)) return;
		if (e.code === 'Space' && !spaceHeld) {
			spaceHeld = true;
			e.preventDefault();
		}
		// Undo: Ctrl+Z (or Cmd+Z on Mac)
		if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
			e.preventDefault();
			if (draggingId) {
				// Cancel current drag instead of corrupting undo history
				figure.discard();
				draggingId = null;
			} else {
				figure.undo();
			}
			figure.recompute();
			version++;
		}
		// Redo: Ctrl+Shift+Z or Ctrl+Y (ignored during drag)
		if (
			!draggingId &&
			(e.ctrlKey || e.metaKey) &&
			((e.code === 'KeyZ' && e.shiftKey) || e.code === 'KeyY')
		) {
			e.preventDefault();
			figure.redo();
			figure.recompute();
			version++;
		}
	}

	function onKeyUp(e: KeyboardEvent) {
		if (isTextInput(e)) return;
		if (e.code === 'Space') {
			spaceHeld = false;
			if (isPanning) isPanning = false;
		}
	}

	function onWindowBlur() {
		if (draggingId) figure.discard();
		spaceHeld = false;
		isPanning = false;
		draggingId = null;
	}
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} onblur={onWindowBlur} />

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
	class:panning={isPanning || spaceHeld}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerCancel}
	onwheel={onWheel}
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

	.geometry-canvas.panning {
		cursor: grab;
	}

	.geometry-canvas.panning.dragging {
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
