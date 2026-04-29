<script lang="ts">
	import ElementPopover from './ElementPopover.svelte';
	import SliderControl from './SliderControl.svelte';
	import type { InlineNode } from '$lib/ubumark';
	import { parseMarkdown } from '$lib/ubumark';
	import { convertLatexToMarkup } from 'mathlive';
	import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';
	import { Figure } from '$lib/geometry-core/graph/figure';
	import type { GeoSlider } from '$lib/geometry-core/types/elements';
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
		vectorToSVG,
		circleToSVG,
		circleToPathSVG,
		arcToSVG,
		angleMarkToSVG,
		segmentMarkToSVG,
		textToSVG,
		resolveStyle,
		functionToSVG,
		quadraticCurveToSVG,
		implicitCurveToSVG,
		tangentLineToSVG,
		tangentToQuadraticToSVG,
		locusToSVG
	} from '$lib/geometry-core/rendering/svg-primitives';
	import { computeGridStep } from '$lib/geometry-core/viewport/grid';
	import { findPointNear, findElementNear } from '$lib/geometry-core/interaction/hit-testing';
	import { snapToGrid } from '$lib/geometry-core/interaction/snap';
	import { numeric } from '$lib/geometry-core/types/geo-value';
	import {
		isPointElement,
		isVector,
		type GeoArcByAngles,
		type GeoArcByPoints
	} from '$lib/geometry-core/types/elements';
	import { conicClosestParam } from '$lib/geometry-core/graph/conic-helpers';
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
		roughSegmentMarkHTML,
		roughVectorHTML
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
	/** Offset from pointer to freeVector anchor at drag start (for smooth drag). */
	let dragOffset: { dx: number; dy: number } | null = $state(null);
	let hoveredId: string | null = $state(null);
	let version = $state(0);

	// Slider elements (reactive to version changes)
	const sliders = $derived.by(() => {
		void version; // depend on version so sliders update when figure changes
		return figure.getElementsByType('slider') as GeoSlider[];
	});

	function handleSliderChange(sliderId: string, newValue: number) {
		figure.beginTransaction();
		figure.moveSlider(sliderId, newValue);
		figure.recompute();
		figure.commit();
		version++;
	}

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

	// ─── Drag projection helpers ───────────────────────────────────

	function projectOnSegment(
		mx: number,
		my: number,
		x1: number,
		y1: number,
		x2: number,
		y2: number
	): number {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const lenSq = dx * dx + dy * dy;
		if (lenSq === 0) return 0;
		return Math.max(0, Math.min(1, ((mx - x1) * dx + (my - y1) * dy) / lenSq));
	}

	function projectOnLine(
		mx: number,
		my: number,
		x1: number,
		y1: number,
		x2: number,
		y2: number
	): number {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const lenSq = dx * dx + dy * dy;
		if (lenSq === 0) return 0;
		return ((mx - x1) * dx + (my - y1) * dy) / lenSq;
	}

	function projectOnArc(
		fig: Figure,
		arcEl: GeoArcByAngles | GeoArcByPoints,
		mx: number,
		my: number
	): number {
		let cx: number, cy: number, startAngle: number, endAngle: number;

		if (arcEl.type === 'arcByAngles') {
			const centerPos = fig.getPosition(arcEl.centerId);
			if (!centerPos) return 0.5;
			cx = geoToNumber(centerPos.x);
			cy = geoToNumber(centerPos.y);
			startAngle = geoToNumber(arcEl.startAngle);
			endAngle = geoToNumber(arcEl.endAngle);
		} else {
			const centerPos = fig.getPosition(arcEl.centerId);
			const startPos = fig.getPosition(arcEl.startId);
			const endPos = fig.getPosition(arcEl.endId);
			if (!centerPos || !startPos || !endPos) return 0.5;
			cx = geoToNumber(centerPos.x);
			cy = geoToNumber(centerPos.y);
			startAngle = Math.atan2(geoToNumber(startPos.y) - cy, geoToNumber(startPos.x) - cx);
			endAngle = Math.atan2(geoToNumber(endPos.y) - cy, geoToNumber(endPos.x) - cx);
		}

		let sweep = endAngle - startAngle;
		if (sweep < 0) sweep += 2 * Math.PI;
		if (sweep === 0) return 0;
		const angle = Math.atan2(my - cy, mx - cx);
		let offset = angle - startAngle;
		offset = ((offset % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
		return Math.max(0, Math.min(1, offset / sweep));
	}

	/** Parse ubumark content to inline nodes. */
	function parseInlineNodes(content: string): InlineNode[] {
		try {
			const doc = parseMarkdown(content);
			if (doc.children.length > 0 && doc.children[0].type === 'paragraph') {
				return doc.children[0].children;
			}
			return [{ type: 'text', content, bold: false, italic: false, code: false }];
		} catch {
			return [{ type: 'text', content, bold: false, italic: false, code: false }];
		}
	}

	function escapeHtml(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	/**
	 * Convert inline nodes to static HTML string for use with {@html}.
	 *
	 * Uses convertLatexToMarkup() for math nodes instead of the <math-span> web
	 * component. This avoids the flicker caused by web component destruction/recreation
	 * during drag operations: <math-span> has a heavy lifecycle (Shadow DOM,
	 * IntersectionObserver, LaTeX parse → render) that causes visible disappearance
	 * when Svelte recreates the {#each} block on version change.
	 * convertLatexToMarkup() produces the same visual output as plain HTML, which
	 * Svelte can insert/replace instantaneously via innerHTML.
	 */
	function inlineNodesToHTML(nodes: InlineNode[]): string {
		return nodes
			.map((node) => {
				if (node.type === 'text') {
					let html = escapeHtml(node.content);
					if (node.bold) html = `<strong>${html}</strong>`;
					if (node.italic) html = `<em>${html}</em>`;
					if (node.code) html = `<code>${html}</code>`;
					return html;
				}
				if (node.type === 'math-inline') {
					const latex = expressionToLatex(node.expression, node.syntax);
					return convertLatexToMarkup(latex, { defaultMode: 'inline-math' });
				}
				// line-break, link, blank, hashtag, mention, hint-reference, internal-link
				// — not meaningful in a single-line SVG foreignObject label.
				// NOTE: if you add a 'link' branch, sanitise node.url (block javascript:/data: URIs).
				return '';
			})
			.join('');
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
				dragOffset = null;
				figure.beginTransaction();
				svgRef?.setPointerCapture(e.pointerId);
				e.preventDefault();
			} else if (
				(el?.type === 'pointOnCurve' ||
					el?.type === 'pointOnQuadraticCurve' ||
					el?.type === 'pointOnSegment' ||
					el?.type === 'pointOnLine' ||
					el?.type === 'pointOnCircle' ||
					el?.type === 'pointOnArc') &&
				el.draggable
			) {
				draggingId = pointId;
				dragOffset = null;
				figure.beginTransaction();
				svgRef?.setPointerCapture(e.pointerId);
				e.preventDefault();
			}
		} else {
			// No point hit — check for free vector drag
			const elementId = findElementNear(figure, math.x, math.y, threshold, viewport);
			if (elementId) {
				const el = figure.getElementById(elementId);
				if (el?.type === 'freeVector') {
					const ax = geoToNumber(el.anchorX);
					const ay = geoToNumber(el.anchorY);
					draggingId = elementId;
					dragOffset = { dx: ax - math.x, dy: ay - math.y };
					figure.beginTransaction();
					svgRef?.setPointerCapture(e.pointerId);
					e.preventDefault();
				}
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
			if (dragEl?.type === 'freeVector') {
				// Drag free vector: move anchor, preserve components
				const newAx = math.x + (dragOffset?.dx ?? 0);
				const newAy = math.y + (dragOffset?.dy ?? 0);
				figure.moveFreeVector(draggingId, numeric(newAx), numeric(newAy));
			} else if (dragEl?.type === 'pointOnCurve') {
				figure.movePointOnCurve(draggingId, numeric(math.x));
			} else if (dragEl?.type === 'pointOnQuadraticCurve') {
				const curveEl = figure.getElementById(dragEl.curveId);
				if (curveEl?.type === 'quadraticCurve') {
					const newT = conicClosestParam(curveEl.conic, math.x, math.y);
					figure.movePointOnQuadraticCurve(draggingId, newT);
				}
			} else if (dragEl?.type === 'pointOnSegment') {
				const segEl = figure.getElementById(dragEl.segmentId);
				if (segEl?.type === 'segment') {
					const p1 = figure.getPosition(segEl.startId);
					const p2 = figure.getPosition(segEl.endId);
					if (p1 && p2) {
						const t = projectOnSegment(
							math.x,
							math.y,
							geoToNumber(p1.x),
							geoToNumber(p1.y),
							geoToNumber(p2.x),
							geoToNumber(p2.y)
						);
						figure.movePointOnSegment(draggingId, t);
					}
				}
			} else if (dragEl?.type === 'pointOnLine') {
				const lineEl = figure.getElementById(dragEl.lineId);
				if (lineEl && (lineEl.type === 'line' || lineEl.type === 'ray')) {
					const p1Id = lineEl.type === 'line' ? lineEl.point1Id : lineEl.originId;
					const p2Id = lineEl.type === 'line' ? lineEl.point2Id : lineEl.throughId;
					const p1 = figure.getPosition(p1Id);
					const p2 = figure.getPosition(p2Id);
					if (p1 && p2) {
						const t = projectOnLine(
							math.x,
							math.y,
							geoToNumber(p1.x),
							geoToNumber(p1.y),
							geoToNumber(p2.x),
							geoToNumber(p2.y)
						);
						figure.movePointOnLine(draggingId, t);
					}
				}
			} else if (dragEl?.type === 'pointOnCircle') {
				const circEl = figure.getElementById(dragEl.circleId);
				if (circEl && (circEl.type === 'circleByRadius' || circEl.type === 'circleByPoint')) {
					const center = figure.getPosition(circEl.centerId);
					if (center) {
						const cx = geoToNumber(center.x);
						const cy = geoToNumber(center.y);
						const theta = Math.atan2(math.y - cy, math.x - cx);
						figure.movePointOnCircle(draggingId, theta);
					}
				}
			} else if (dragEl?.type === 'pointOnArc') {
				const arcEl = figure.getElementById(dragEl.arcId);
				if (arcEl && (arcEl.type === 'arcByAngles' || arcEl.type === 'arcByPoints')) {
					const t = projectOnArc(figure, arcEl, math.x, math.y);
					figure.movePointOnArc(draggingId, t);
				}
			} else if (
				(dragEl?.type === 'text' || dragEl?.type === 'mathText' || dragEl?.type === 'richText') &&
				dragEl.position
			) {
				figure.moveText(draggingId, math.x + (dragOffset?.dx ?? 0), math.y + (dragOffset?.dy ?? 0));
			} else {
				figure.movePoint(draggingId, numeric(math.x), numeric(math.y));
			}
			figure.recompute();
			version++;
		} else {
			const threshold = 15 / ppu;
			hoveredId = findElementNear(figure, math.x, math.y, threshold, viewport);
		}
	}

	function onPointerCancel() {
		if (draggingId) figure.discard();
		isPanning = false;
		draggingId = null;
		dragOffset = null;
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
				const dragEl = figure.getElementById(draggingId);
				if (dragEl?.type === 'freeVector') {
					const snapAx = snapped.x + (dragOffset?.dx ?? 0);
					const snapAy = snapped.y + (dragOffset?.dy ?? 0);
					figure.moveFreeVector(draggingId, numeric(snapAx), numeric(snapAy));
				} else if (dragEl?.type === 'pointOnCurve') {
					figure.movePointOnCurve(draggingId, snapped.x);
				} else if (
					dragEl?.type === 'pointOnSegment' ||
					dragEl?.type === 'pointOnLine' ||
					dragEl?.type === 'pointOnCircle' ||
					dragEl?.type === 'pointOnArc'
				) {
					// Constrained points: no snap, keep current position
				} else {
					figure.movePoint(draggingId, snapped.x, snapped.y);
				}
				figure.recompute();
				version++;
			}
		}

		figure.commit();
		draggingId = null;
		dragOffset = null;
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
				dragOffset = null;
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
		const elementId = findElementNear(figure, math.x, math.y, threshold, viewport);
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
		dragOffset = null;
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
				{:else if isVector(el)}
					{@const svg = vectorToSVG(el.id, figure, transformer)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<!-- Invisible hit area -->
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke="transparent"
								stroke-width="12"
								pointer-events="stroke"
								class="vector"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity}
								>{@html roughVectorHTML(rc, svg, getRoughOpts(el.id, sty), sty.color)}</g
							>
						{:else}
							<!-- Invisible hit area -->
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke="transparent"
								stroke-width="12"
								pointer-events="stroke"
								class="vector"
								class:hovered={hoveredId === el.id}
							/>
							<!-- Shaft -->
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.shaftX2}
								y2={svg.shaftY2}
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								opacity={sty.opacity}
								pointer-events="none"
							/>
							<!-- Arrowhead -->
							<polygon
								points={svg.arrowPoints}
								fill={sty.color}
								opacity={sty.opacity}
								pointer-events="none"
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
				{:else if el.type === 'tangentLine'}
					{@const svg = tangentLineToSVG(el.id, figure, transformer, dims)}
					{#if svg}
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
				{:else if el.type === 'tangentToQuadratic'}
					{@const svg = tangentToQuadraticToSVG(el.id, figure, transformer, dims)}
					{#if svg}
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
				{:else if el.type === 'quadraticCurve'}
					{@const svg = quadraticCurveToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							{#each svg.paths as pathD, i (i)}
								<g opacity={sty.opacity}
									>{@html roughArcHTML(rc, pathD, getRoughOpts(el.id, sty))}</g
								>
							{/each}
						{:else}
							{#each svg.paths as pathD, i (i)}
								<path
									d={pathD}
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
							{/each}
						{/if}
						{#if el.label}
							{@const center = el.conic.center ?? el.conic.vertex}
							{#if center}
								{@const svgPt = transformer.mathToSvg(center.x, center.y)}
								<text
									x={svgPt.x + (el.labelOffset?.dx ?? 10)}
									y={svgPt.y + (el.labelOffset?.dy ?? -10)}
									class="label"
									fill={sty.color}
									stroke="white"
									stroke-width="3"
									paint-order="stroke">{el.label}</text
								>
							{/if}
						{/if}
					{/if}
				{:else if el.type === 'implicitCurve'}
					{@const svg = implicitCurveToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							{#each svg.paths as pathD, i (i)}
								<g opacity={sty.opacity}
									>{@html roughArcHTML(rc, pathD, getRoughOpts(el.id, sty))}</g
								>
							{/each}
						{:else}
							{#each svg.paths as pathD, i (i)}
								<path
									d={pathD}
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
							{/each}
						{/if}
						{#if el.label}
							<text
								x={dims.width / 2 + (el.labelOffset?.dx ?? 10)}
								y={dims.height / 2 + (el.labelOffset?.dy ?? -10)}
								class="label"
								fill={sty.color}
								stroke="white"
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'locus'}
					{@const svg = locusToSVG(el.id, figure, transformer, dims)}
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
						{#if el.label}
							<text
								x={dims.width / 2 + (el.labelOffset?.dx ?? 10)}
								y={dims.height / 2 + (el.labelOffset?.dy ?? -10)}
								class="label"
								fill={sty.color}
								stroke="white"
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
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
								class:draggable={interactive && 'draggable' in el && el.draggable}
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
								class:draggable={interactive && 'draggable' in el && el.draggable}
								class:hovered={hoveredId === el.id}
								class:dragging={draggingId === el.id}
							/>
						{:else if sty.pointShape === 'cross'}
							<g
								class="point"
								class:draggable={interactive && 'draggable' in el && el.draggable}
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
								class:draggable={interactive && 'draggable' in el && el.draggable}
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

			<!-- Text elements (on top of everything) -->
			{#each elements as el (`${el.id}_txt_${version}`)}
				{#if el.type === 'text'}
					{@const svg = textToSVG(el.id, figure, transformer)}
					{@const sty = resolveStyle(el, figure.defaults)}
					{@const isDraggable = !!el.position}
					{#if svg}
						<g
							class:draggable-text={isDraggable}
							onpointerdown={isDraggable
								? (e) => {
										if (e.button !== 0) return;
										draggingId = el.id;
										const math = getMathCoords(e);
										dragOffset = math
											? { dx: el.position!.x - math.x, dy: el.position!.y - math.y }
											: null;
										figure.beginTransaction();
										svgRef?.setPointerCapture(e.pointerId);
										e.preventDefault();
										e.stopPropagation();
									}
								: undefined}
						>
							<rect
								x={svg.x - 4}
								y={svg.y - 12}
								width={svg.text.length * 8 + 8}
								height={16}
								rx={3}
								fill="white"
								fill-opacity="0.85"
								class="text-bg"
							/>
							<text x={svg.x} y={svg.y} fill={sty.color} opacity={sty.opacity} class="geo-text"
								>{svg.text}</text
							>
						</g>
					{/if}
				{/if}
			{/each}

			<!--
				Math text elements — uses convertLatexToMarkup() for static HTML rendering
				instead of the <math-span> web component. This eliminates the flicker that
				occurred during drag operations: the {#each} key includes `version`, which
				forces Svelte to destroy/recreate elements on every mutation. Recreating a
				web component (Shadow DOM + IntersectionObserver + LaTeX parse) is slow
				enough to cause visible disappearance, while recreating static HTML via
				{@html} is instantaneous.
			-->
			{#each elements as el (`${el.id}_mtxt_${version}`)}
				{#if el.type === 'mathText'}
					{@const svg = textToSVG(el.id, figure, transformer)}
					{@const isDraggable = !!el.position}
					{#if svg}
						<g
							class:draggable-text={isDraggable}
							onpointerdown={isDraggable
								? (e) => {
										if (e.button !== 0) return;
										draggingId = el.id;
										const math = getMathCoords(e);
										dragOffset = math
											? { dx: el.position!.x - math.x, dy: el.position!.y - math.y }
											: null;
										figure.beginTransaction();
										svgRef?.setPointerCapture(e.pointerId);
										e.preventDefault();
										e.stopPropagation();
									}
								: undefined}
						>
							<foreignObject x={svg.x - 4} y={svg.y - 20} width="250" height="32">
								<div
									style="display:flex; align-items:center; color:black; font-size:14px; background:rgba(255,255,255,0.92); padding:2px 6px; border-radius:4px; width:fit-content"
								>
									{@html convertLatexToMarkup(svg.text, { defaultMode: 'inline-math' })}
								</div>
							</foreignObject>
						</g>
					{/if}
				{/if}
			{/each}

			<!--
				Rich text elements — same static HTML approach as mathText above.
				Uses inlineNodesToHTML() instead of the InlineRenderer component to avoid
				the chain InlineRenderer → MathInline → <math-span> which has the same
				web component lifecycle overhead.
			-->
			{#each elements as el (`${el.id}_rtxt_${version}`)}
				{#if el.type === 'richText'}
					{@const svg = textToSVG(el.id, figure, transformer)}
					{@const isDraggable = !!el.position}
					{#if svg}
						{@const inlineNodes = parseInlineNodes(svg.text)}
						<g
							class:draggable-text={isDraggable}
							onpointerdown={isDraggable
								? (e) => {
										if (e.button !== 0) return;
										draggingId = el.id;
										const math = getMathCoords(e);
										dragOffset = math
											? { dx: el.position!.x - math.x, dy: el.position!.y - math.y }
											: null;
										figure.beginTransaction();
										svgRef?.setPointerCapture(e.pointerId);
										e.preventDefault();
										e.stopPropagation();
									}
								: undefined}
						>
							<foreignObject x={svg.x - 4} y={svg.y - 20} width="350" height="32">
								<div
									style="color:black; font-size:14px; background:rgba(255,255,255,0.92); padding:2px 6px; border-radius:4px; width:fit-content"
								>
									{@html inlineNodesToHTML(inlineNodes)}
								</div>
							</foreignObject>
						</g>
					{/if}
				{/if}
			{/each}
		</g>
	</svg>

	{#if sliders.length > 0}
		<div class="sliders-panel">
			{#each sliders as slider (slider.id)}
				<SliderControl
					label={slider.label ?? slider.id}
					value={slider.value}
					min={slider.min}
					max={slider.max}
					step={slider.step}
					onchange={(v) => handleSliderChange(slider.id, v)}
				/>
			{/each}
		</div>
	{/if}

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

	.sliders-panel {
		border-top: 1px solid #e5e7eb;
		padding: 0.25rem 0;
		background: #f9fafb;
		border-radius: 0 0 0.375rem 0.375rem;
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
	.vector.hovered,
	.circle.hovered,
	.function-curve.hovered {
		filter: brightness(1.3);
		stroke-width: 4;
		cursor: pointer;
	}

	.vector.hovered {
		cursor: grab;
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

	.geo-text {
		font-size: 12px;
		font-family: 'KaTeX_Main', serif;
		pointer-events: none;
	}

	.text-bg {
		pointer-events: none;
	}

	.draggable-text {
		cursor: grab;
	}

	.draggable-text :global(*) {
		pointer-events: auto;
	}

	.draggable-text:active {
		cursor: grabbing;
	}
</style>
