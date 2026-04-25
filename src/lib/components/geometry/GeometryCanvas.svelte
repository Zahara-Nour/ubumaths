<script lang="ts">
	import ElementPopover from './ElementPopover.svelte';
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
		circleToSVG,
		circleToPathSVG,
		arcToSVG,
		angleMarkToSVG,
		segmentMarkToSVG,
		measureToSVG,
		resolveStyle,
		functionToSVG
	} from '$lib/geometry-core/rendering/svg-primitives';
	import { computeGridStep } from '$lib/geometry-core/viewport/grid';
	import { findPointNear, findElementNear } from '$lib/geometry-core/interaction/hit-testing';
	import { snapToGrid } from '$lib/geometry-core/interaction/snap';
	import { numeric } from '$lib/geometry-core/types/geo-value';
	import { isPointElement } from '$lib/geometry-core/types/elements';
	import { geoToNumber } from '$lib/geometry-core/compute/to-number';
	import rough from 'roughjs';
	import {
		seedFromId,
		styleToRoughOptions,
		shouldRenderRough,
		roughLineHTML,
		roughCircleHTML,
		roughArcHTML,
		roughPolygonHTML,
		roughAngleMarkHTML,
		roughSegmentMarkHTML
	} from '$lib/geometry-core/rendering/rough-geometry';

	interface Props {
		figure: Figure;
		center?: { x: number; y: number };
		pixelsPerUnit?: number;
		width?: number;
		height?: number;
		interactive?: boolean;
		showGrid?: boolean;
		showMinorGrid?: boolean;
		showGraduations?: boolean;
		snapOnRelease?: boolean;
		/** External version counter to trigger re-render when figure changes programmatically. */
		externalVersion?: number;
		/** Element IDs to exclude from rendering (used for animation overlay). */
		hiddenElementIds?: Set<string>;
		/** Rendering mode: 'normal' (clean SVG), 'rough' (hand-drawn), 'mixed' (per-element). */
		renderMode?: 'normal' | 'rough' | 'mixed';
	}

	let {
		figure,
		center: initialCenter = { x: 0, y: 0 },
		pixelsPerUnit: initialPpu = 40,
		width = 800,
		height = 600,
		interactive = true,
		showGrid = true,
		showMinorGrid = false,
		showGraduations = true,
		snapOnRelease = false,
		externalVersion = 0,
		hiddenElementIds,
		renderMode = 'normal'
	}: Props = $props();

	let svgRef: SVGSVGElement | undefined = $state();
	let containerRef: HTMLDivElement | undefined = $state();
	let draggingId: string | null = $state(null);
	let hoveredId: string | null = $state(null);
	let version = $state(0);

	// Popover state
	let popoverElementId: string | null = $state(null);
	let popoverX = $state(0);
	let popoverY = $state(0);

	// Label drag state
	let draggingLabelId: string | null = $state(null);
	let labelDragStart: { mx: number; my: number; dx: number; dy: number } | null = $state(null);

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

	let gridStep = $derived(computeGridStep(ppu));

	let gridLines = $derived.by(() => {
		if (!showGrid)
			return {
				majorV: [] as number[],
				majorH: [] as number[],
				minorV: [] as number[],
				minorH: [] as number[]
			};
		const { major, minor } = gridStep;

		const majorV: number[] = [];
		const majorH: number[] = [];
		const startX = Math.ceil(viewport.xMin / major) * major;
		const startY = Math.ceil(viewport.yMin / major) * major;
		for (let x = startX; x <= viewport.xMax; x += major) majorV.push(x);
		for (let y = startY; y <= viewport.yMax; y += major) majorH.push(y);

		const minorV: number[] = [];
		const minorH: number[] = [];
		if (showMinorGrid) {
			const startMX = Math.ceil(viewport.xMin / minor) * minor;
			const startMY = Math.ceil(viewport.yMin / minor) * minor;
			for (let x = startMX; x <= viewport.xMax; x += minor) {
				// Skip positions that coincide with major lines
				if (Math.abs(x / major - Math.round(x / major)) > 0.01) minorV.push(x);
			}
			for (let y = startMY; y <= viewport.yMax; y += minor) {
				if (Math.abs(y / major - Math.round(y / major)) > 0.01) minorH.push(y);
			}
		}

		return { majorV, majorH, minorV, minorH };
	});

	let elements = $derived.by(() => {
		void version;
		void externalVersion;
		const all = figure.getAllElements();
		return all.filter((el) => el.visible && !(hiddenElementIds && hiddenElementIds.has(el.id)));
	});
	let dims = $derived({ width, height });

	// ─── Rough.js rendering ─────────────────────────────────────────
	let rc = $derived(svgRef ? rough.svg(svgRef) : null);

	function getRoughOpts(elId: string, sty: ReturnType<typeof resolveStyle>) {
		return styleToRoughOptions(sty, seedFromId(elId, sty.roughSeed), sty.roughness);
	}

	function isRough(sty: ReturnType<typeof resolveStyle>, elType: string): boolean {
		return shouldRenderRough(sty.render, elType, renderMode);
	}

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
			if (el?.type === 'freePoint' && el.draggable) {
				draggingId = pointId;
				figure.beginTransaction();
				svgRef?.setPointerCapture(e.pointerId);
				e.preventDefault();
			} else if (el?.type === 'pointOnCurve') {
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

		if (draggingLabelId && labelDragStart) {
			const MAX_LABEL_RADIUS = 30; // pixels
			let dx = labelDragStart.dx + (e.clientX - labelDragStart.mx);
			let dy = labelDragStart.dy + (e.clientY - labelDragStart.my);
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > MAX_LABEL_RADIUS) {
				dx = (dx / dist) * MAX_LABEL_RADIUS;
				dy = (dy / dist) * MAX_LABEL_RADIUS;
			}
			figure.setLabelOffset(draggingLabelId, dx, dy);
			version++;
			return;
		}

		if (draggingId) {
			const dragEl = figure.getElementById(draggingId);
			if (dragEl?.type === 'pointOnCurve') {
				figure.movePointOnCurve(draggingId, numeric(math.x));
			} else {
				figure.movePoint(draggingId, numeric(math.x), numeric(math.y));
			}
			figure.recompute();
			version++;
		} else {
			const threshold = 15 / ppu;
			hoveredId = findElementNear(figure, math.x, math.y, threshold);
		}
	}

	function onPointerCancel() {
		if (draggingId) figure.discard();
		isPanning = false;
		draggingId = null;
		draggingLabelId = null;
		labelDragStart = null;
	}

	function onPointerUp(e: PointerEvent) {
		if (isPanning) {
			isPanning = false;
			return;
		}

		if (draggingLabelId) {
			figure.commit();
			draggingLabelId = null;
			labelDragStart = null;
			return;
		}

		if (!draggingId) return;

		if (snapOnRelease) {
			const math = getMathCoords(e);
			if (math) {
				const snapped = snapToGrid(math.x, math.y, gridStep.major);
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

	// ─── Double-click: open popover ─────────────────────────────────

	function onDblClick(e: MouseEvent) {
		if (!interactive) return;
		const math = getMathCoords(e as unknown as PointerEvent);
		if (!math) return;

		const threshold = 15 / ppu;
		const elementId = findElementNear(figure, math.x, math.y, threshold);
		if (elementId) {
			if (!containerRef) return;
			const rect = containerRef.getBoundingClientRect();
			popoverX = e.clientX - rect.left + 10;
			popoverY = e.clientY - rect.top + 10;
			popoverElementId = elementId;
		} else {
			popoverElementId = null;
		}
	}

	function openPopoverFor(elementId: string, e: MouseEvent) {
		e.stopPropagation();
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		popoverX = e.clientX - rect.left + 10;
		popoverY = e.clientY - rect.top + 10;
		popoverElementId = elementId;
	}

	function closePopover() {
		popoverElementId = null;
	}

	let popoverElement = $derived(
		popoverElementId ? figure.getElementById(popoverElementId) : undefined
	);

	function onLabelPointerDown(e: PointerEvent, elementId: string) {
		if (!interactive) return;
		e.stopPropagation();
		e.preventDefault();

		const el = figure.getElementById(elementId);
		if (!el) return;

		const sty = resolveStyle(el, figure.defaults);
		const currentDx = el.labelOffset?.dx ?? sty.pointSize + 4;
		const currentDy = el.labelOffset?.dy ?? -(sty.pointSize + 2);

		draggingLabelId = elementId;
		labelDragStart = { mx: e.clientX, my: e.clientY, dx: currentDx, dy: currentDy };
		figure.beginTransaction();
		svgRef?.setPointerCapture(e.pointerId);
	}

	function formatGrad(n: number): string {
		// Avoid floating point display artifacts: 0.30000000000000004 -> "0.3"
		const rounded = Math.round(n * 1e10) / 1e10;
		return String(rounded);
	}

	function onWindowBlur() {
		if (draggingId) figure.discard();
		if (draggingLabelId) figure.discard();
		spaceHeld = false;
		isPanning = false;
		draggingId = null;
		draggingLabelId = null;
		labelDragStart = null;
	}
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} onblur={onWindowBlur} />

<div
	bind:this={containerRef}
	class="geometry-container"
	style="position: relative; display: inline-block;"
>
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
		ondblclick={onDblClick}
	>
		<!-- Grid -->
		{#if showGrid}
			<g class="grid">
				<!-- Minor grid (sub-divisions) -->
				{#if showMinorGrid}
					{#each gridLines.minorV as x (x)}
						{@const sv = transformer.mathToSvg(x, 0)}
						<line x1={sv.x} y1={0} x2={sv.x} y2={height} class="grid-line-minor" />
					{/each}
					{#each gridLines.minorH as y (y)}
						{@const sv = transformer.mathToSvg(0, y)}
						<line x1={0} y1={sv.y} x2={width} y2={sv.y} class="grid-line-minor" />
					{/each}
				{/if}
				<!-- Major grid -->
				{#each gridLines.majorV as x (x)}
					{@const sv = transformer.mathToSvg(x, 0)}
					<line x1={sv.x} y1={0} x2={sv.x} y2={height} class="grid-line" class:axis={x === 0} />
				{/each}
				{#each gridLines.majorH as y (y)}
					{@const sv = transformer.mathToSvg(0, y)}
					<line x1={0} y1={sv.y} x2={width} y2={sv.y} class="grid-line" class:axis={y === 0} />
				{/each}
				<!-- Graduations on axes -->
				{#if showGraduations}
					{@const axisY = transformer.mathToSvg(0, 0).y}
					{@const axisX = transformer.mathToSvg(0, 0).x}
					{#each gridLines.majorV as x (x)}
						{#if x !== 0}
							{@const sv = transformer.mathToSvg(x, 0)}
							<text
								x={sv.x}
								y={Math.min(Math.max(axisY + 16, 14), height - 4)}
								class="graduation"
								text-anchor="middle">{formatGrad(x)}</text
							>
						{/if}
					{/each}
					{#each gridLines.majorH as y (y)}
						{#if y !== 0}
							{@const sv = transformer.mathToSvg(0, y)}
							<text
								x={Math.min(Math.max(axisX - 6, 20), width - 4)}
								y={sv.y + 4}
								class="graduation"
								text-anchor="end">{formatGrad(y)}</text
							>
						{/if}
					{/each}
				{/if}
			</g>
		{/if}

		<!-- Elements -->
		<g class="elements">
			{#each elements as el (`${el.id}_${version}`)}
				{@const sty = resolveStyle(el, figure.defaults)}
				{#if el.type === 'segment'}
					{@const svg = segmentToSVG(el.id, figure, transformer)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke="transparent"
								stroke-width="12"
								pointer-events="stroke"
								class="segment"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity}>{@html roughLineHTML(rc, svg, getRoughOpts(el.id, sty))}</g>
						{:else}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								stroke-linecap="round"
								opacity={sty.opacity}
								class="segment"
								class:hovered={hoveredId === el.id}
							/>
						{/if}
						{#if el.label}
							{@const lx = (svg.x1 + svg.x2) / 2 + (el.labelOffset?.dx ?? 6)}
							{@const ly = (svg.y1 + svg.y2) / 2 + (el.labelOffset?.dy ?? -8)}
							<text
								x={lx}
								y={ly}
								class="label"
								fill={sty.color}
								stroke="white"
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'line'}
					{@const svg = lineToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke="transparent"
								stroke-width="12"
								pointer-events="stroke"
								class="geo-line"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity}>{@html roughLineHTML(rc, svg, getRoughOpts(el.id, sty))}</g>
						{:else}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								stroke-linecap="round"
								opacity={sty.opacity}
								class="geo-line"
								class:hovered={hoveredId === el.id}
							/>
						{/if}
						{#if el.label}
							{@const t = 0.9}
							{@const mx = svg.x1 + t * (svg.x2 - svg.x1)}
							{@const my = svg.y1 + t * (svg.y2 - svg.y1)}
							{@const dx = svg.x2 - svg.x1}
							{@const dy = svg.y2 - svg.y1}
							{@const len = Math.sqrt(dx * dx + dy * dy) || 1}
							{@const nx = -dy / len}
							{@const ny = dx / len}
							{@const sign = ny > 0 ? -1 : 1}
							{@const offset = 10 + 5 * Math.abs(nx)}
							<text
								x={mx + (el.labelOffset?.dx ?? sign * nx * offset)}
								y={my + (el.labelOffset?.dy ?? sign * ny * offset)}
								class="label"
								fill={sty.color}
								stroke="white"
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'ray'}
					{@const svg = rayToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke="transparent"
								stroke-width="12"
								pointer-events="stroke"
								class="ray"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity}>{@html roughLineHTML(rc, svg, getRoughOpts(el.id, sty))}</g>
						{:else}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								opacity={sty.opacity}
								class="ray"
								class:hovered={hoveredId === el.id}
							/>
						{/if}
						{#if el.label}
							{@const lx = (svg.x1 + svg.x2) / 2 + (el.labelOffset?.dx ?? 6)}
							{@const ly = (svg.y1 + svg.y2) / 2 + (el.labelOffset?.dy ?? -8)}
							<text
								x={lx}
								y={ly}
								class="label"
								fill={sty.color}
								stroke="white"
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'circleByRadius' || el.type === 'circleByPoint'}
					{@const svg = circleToSVG(el.id, figure, transformer)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<circle
								cx={svg.cx}
								cy={svg.cy}
								r={svg.r}
								stroke="transparent"
								stroke-width="12"
								fill="transparent"
								pointer-events="all"
								class="circle"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity}>{@html roughCircleHTML(rc, svg, getRoughOpts(el.id, sty))}</g
							>
						{:else if sty.dash !== 'solid'}
							{@const pathSvg = circleToPathSVG(el.id, figure, transformer)}
							{#if pathSvg}
								<path
									d={pathSvg.path}
									stroke={sty.color}
									stroke-width={sty.strokeWidth}
									stroke-dasharray={sty.dashArray}
									stroke-linecap="round"
									opacity={sty.opacity}
									fill={sty.fillColor ?? 'none'}
									fill-opacity={sty.fillOpacity}
									class="circle"
									class:hovered={hoveredId === el.id}
								/>
							{/if}
						{:else}
							<circle
								cx={svg.cx}
								cy={svg.cy}
								r={svg.r}
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
								opacity={sty.opacity}
								fill={sty.fillColor ?? 'none'}
								fill-opacity={sty.fillOpacity}
								class="circle"
								class:hovered={hoveredId === el.id}
							/>
						{/if}
					{/if}
				{:else if el.type === 'polygon'}
					{@const verts = el.dependsOn.map((id) => figure.getPosition(id))}
					{#if verts.every((p) => p != null)}
						{@const pts = verts.map((p) => {
							const sv = transformer.mathToSvg(geoToNumber(p!.x), geoToNumber(p!.y));
							return [sv.x, sv.y] as [number, number];
						})}
						{#if isRough(sty, el.type) && rc}
							<polygon
								points={pts.map((p) => `${p[0]},${p[1]}`).join(' ')}
								stroke="transparent"
								fill="transparent"
								pointer-events="all"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity}
								>{@html roughPolygonHTML(rc, pts, getRoughOpts(el.id, sty))}</g
							>
						{:else}
							<polygon
								points={pts.map((p) => `${p[0]},${p[1]}`).join(' ')}
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								opacity={sty.opacity}
								fill={sty.fillColor ?? 'none'}
								fill-opacity={sty.fillOpacity}
								class:hovered={hoveredId === el.id}
							/>
						{/if}
					{/if}
				{:else if el.type === 'function'}
					{@const svg = functionToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						<path
							d={svg.path}
							stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							stroke-linecap="round"
							stroke-linejoin="round"
							opacity={sty.opacity}
							fill="none"
							class="function-curve"
							class:hovered={hoveredId === el.id}
						/>
						{#if el.label && el.type === 'function'}
							{@const labelX = viewport.xMin + 0.85 * (viewport.xMax - viewport.xMin)}
							{@const labelY = el.compiledFn({ x: labelX })}
							{#if typeof labelY === 'number' && Number.isFinite(labelY)}
								{@const svgPt = transformer.mathToSvg(labelX, labelY)}
								{@const slope = el.compiledDerivative({ x: labelX })}
								{@const s = typeof slope === 'number' && Number.isFinite(slope) ? slope : 0}
								{@const len = Math.sqrt(1 + s * s)}
								{@const nx = -s / len}
								{@const ny = 1 / len}
								{@const sign = ny > 0 ? -1 : 1}
								{@const offset = 10 + 5 * Math.abs(nx)}
								<text
									x={svgPt.x + (el.labelOffset?.dx ?? sign * nx * offset)}
									y={svgPt.y + (el.labelOffset?.dy ?? sign * ny * offset)}
									class="label"
									fill={sty.color}
									stroke="white"
									stroke-width="3"
									paint-order="stroke">{el.label}</text
								>
							{/if}
						{/if}
					{/if}
				{/if}
			{/each}

			<!-- Arcs (between circles and points) -->
			{#each elements as el (`${el.id}_arc_${version}`)}
				{#if el.type === 'arcByAngles' || el.type === 'arcByPoints'}
					{@const svg = arcToSVG(el.id, figure, transformer)}
					{@const sty = resolveStyle(el, figure.defaults)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<path
								d={svg.path}
								stroke="transparent"
								stroke-width="12"
								fill="none"
								pointer-events="stroke"
								class="arc"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity}
								>{@html roughArcHTML(rc, svg.path, getRoughOpts(el.id, sty))}</g
							>
						{:else}
							<path
								d={svg.path}
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								stroke-linecap="round"
								opacity={sty.opacity}
								fill="none"
								class="arc"
								class:hovered={hoveredId === el.id}
							/>
						{/if}
					{/if}
				{/if}
			{/each}

			<!-- Angle marks (between elements and points) -->
			{#each elements as el (`${el.id}_angm_${version}`)}
				{#if el.type === 'angleMark'}
					{@const svg = angleMarkToSVG(el.id, figure, transformer)}
					{@const sty = resolveStyle(el, figure.defaults)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<g ondblclick={(e) => openPopoverFor(el.id, e)}>
								{#each svg.paths as path, i (i)}
									<path d={path} stroke="transparent" stroke-width="12" fill="none" />
								{/each}
								<g opacity={sty.opacity}
									>{@html roughAngleMarkHTML(rc, svg, getRoughOpts(el.id, sty))}</g
								>
							</g>
						{:else}
							<g ondblclick={(e) => openPopoverFor(el.id, e)}>
								{#each svg.paths as path, i (i)}
									<path d={path} stroke="transparent" stroke-width="12" fill="none" />
									<path
										d={path}
										stroke={sty.color}
										stroke-width={sty.strokeWidth}
										stroke-dasharray={sty.dashArray}
										opacity={sty.opacity}
										fill="none"
										class="angle-mark"
									/>
								{/each}
							</g>
						{/if}
					{/if}
				{/if}
			{/each}

			<!-- Points -->
			{#each elements as el (`${el.id}_${version}`)}
				{#if isPointElement(el)}
					{@const svg = pointToSVG(el.id, figure, transformer)}
					{@const sty = resolveStyle(el, figure.defaults)}
					{#if svg}
						{#if sty.pointShape === 'dot'}
							<circle
								cx={svg.cx}
								cy={svg.cy}
								r={sty.pointSize}
								fill={sty.color}
								opacity={sty.opacity}
								class="point"
								class:draggable={interactive && el.type === 'freePoint' && el.draggable}
								class:hovered={hoveredId === el.id}
								class:dragging={draggingId === el.id}
							/>
						{:else if sty.pointShape === 'circle'}
							<circle
								cx={svg.cx}
								cy={svg.cy}
								r={sty.pointSize}
								fill="none"
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
								opacity={sty.opacity}
								class="point"
								class:draggable={interactive && el.type === 'freePoint' && el.draggable}
								class:hovered={hoveredId === el.id}
								class:dragging={draggingId === el.id}
							/>
						{:else if sty.pointShape === 'cross'}
							<g
								class="point"
								class:draggable={interactive && el.type === 'freePoint' && el.draggable}
								class:hovered={hoveredId === el.id}
								class:dragging={draggingId === el.id}
								opacity={sty.opacity}
							>
								<line
									x1={svg.cx - sty.pointSize}
									y1={svg.cy - sty.pointSize}
									x2={svg.cx + sty.pointSize}
									y2={svg.cy + sty.pointSize}
									stroke={sty.color}
									stroke-width={sty.strokeWidth}
								/>
								<line
									x1={svg.cx + sty.pointSize}
									y1={svg.cy - sty.pointSize}
									x2={svg.cx - sty.pointSize}
									y2={svg.cy + sty.pointSize}
									stroke={sty.color}
									stroke-width={sty.strokeWidth}
								/>
							</g>
						{:else if sty.pointShape === 'square'}
							<rect
								x={svg.cx - sty.pointSize}
								y={svg.cy - sty.pointSize}
								width={sty.pointSize * 2}
								height={sty.pointSize * 2}
								fill={sty.color}
								opacity={sty.opacity}
								class="point"
								class:draggable={interactive && el.type === 'freePoint' && el.draggable}
								class:hovered={hoveredId === el.id}
								class:dragging={draggingId === el.id}
							/>
						{/if}
						{#if el.label}
							{@const lx = svg.cx + (el.labelOffset?.dx ?? sty.pointSize + 4)}
							{@const ly = svg.cy + (el.labelOffset?.dy ?? -(sty.pointSize + 2))}
							<text
								x={lx}
								y={ly}
								class="label"
								class:label-dragging={draggingLabelId === el.id}
								fill={sty.color}
								stroke="white"
								stroke-width="3"
								paint-order="stroke"
								onpointerdown={(e) => onLabelPointerDown(e, el.id)}>{el.label}</text
							>
						{/if}
					{/if}
				{/if}
			{/each}

			<!-- Segment marks (on top of points so ticks are visible) -->
			{#each elements as el (`${el.id}_segm_${version}`)}
				{#if el.type === 'segmentMark'}
					{@const svg = segmentMarkToSVG(el.id, figure, transformer)}
					{@const sty = resolveStyle(el, figure.defaults)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<g ondblclick={(e) => openPopoverFor(el.id, e)}>
								{#each svg.ticks as tick, i (i)}
									<line
										x1={tick.x1}
										y1={tick.y1}
										x2={tick.x2}
										y2={tick.y2}
										stroke="transparent"
										stroke-width="12"
									/>
								{/each}
								<g opacity={sty.opacity}
									>{@html roughSegmentMarkHTML(rc, svg, getRoughOpts(el.id, sty))}</g
								>
							</g>
						{:else}
							<g ondblclick={(e) => openPopoverFor(el.id, e)}>
								{#each svg.ticks as tick, i (i)}
									<line
										x1={tick.x1}
										y1={tick.y1}
										x2={tick.x2}
										y2={tick.y2}
										stroke="transparent"
										stroke-width="12"
									/>
									<line
										x1={tick.x1}
										y1={tick.y1}
										x2={tick.x2}
										y2={tick.y2}
										stroke={sty.color}
										stroke-width={sty.strokeWidth}
										opacity={sty.opacity}
										class="segment-mark"
									/>
								{/each}
							</g>
						{/if}
					{/if}
				{/if}
			{/each}

			<!-- Measures (on top of everything) -->
			{#each elements as el (`${el.id}_meas_${version}`)}
				{#if el.type === 'measure'}
					{@const svg = measureToSVG(el.id, figure, transformer)}
					{@const sty = resolveStyle(el, figure.defaults)}
					{#if svg}
						<rect
							x={svg.x - 4}
							y={svg.y - 12}
							width={svg.text.length * 8 + 8}
							height={16}
							rx={3}
							fill="white"
							fill-opacity="0.85"
							class="measure-bg"
						/>
						<text x={svg.x} y={svg.y} fill={sty.color} opacity={sty.opacity} class="measure-text"
							>{svg.text}</text
						>
					{/if}
				{/if}
			{/each}
		</g>
	</svg>

	{#if popoverElement}
		<ElementPopover
			element={popoverElement}
			{figure}
			x={popoverX}
			y={popoverY}
			onclose={closePopover}
			onchange={() => version++}
		/>
	{/if}
</div>

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

	.grid-line-minor {
		stroke: #e5e7eb;
		stroke-width: 0.3;
	}

	.grid-line {
		stroke: #d1d5db;
		stroke-width: 0.5;
	}

	.grid-line.axis {
		stroke: #6b7280;
		stroke-width: 1.5;
	}

	.graduation {
		font-size: 11px;
		font-family: 'KaTeX_Main', serif;
		fill: #6b7280;
		pointer-events: none;
	}

	.segment.hovered,
	.geo-line.hovered,
	.ray.hovered,
	.circle.hovered,
	.function-curve.hovered {
		filter: brightness(1.3);
		stroke-width: 4;
		cursor: pointer;
	}

	.angle-mark:hover,
	.segment-mark:hover {
		filter: brightness(1.3);
		stroke-width: 3;
		cursor: pointer;
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
		cursor: grab;
	}

	.label:hover {
		filter: brightness(1.3);
	}

	.label-dragging {
		cursor: grabbing;
	}

	.measure-text {
		font-size: 12px;
		font-family: 'KaTeX_Main', serif;
		pointer-events: none;
	}

	.measure-bg {
		pointer-events: none;
	}
</style>
