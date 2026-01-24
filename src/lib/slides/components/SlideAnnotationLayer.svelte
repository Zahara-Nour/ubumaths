<script lang="ts">
	/**
	 * SlideAnnotationLayer - Autonomous annotation overlay for slides
	 *
	 * A self-contained annotation layer that doesn't depend on whiteboardStore.
	 * Used for slide presentations where teachers can draw annotations.
	 *
	 * @module slides/components/SlideAnnotationLayer
	 */

	import {
		smoothStroke,
		pointsToSvgPath,
		doStrokesIntersect
	} from '$lib/whiteboard/core/stroke-smoothing';
	import type {
		Point,
		AnnotationElement,
		AnnotationStroke,
		AnnotationShape,
		AnnotationStrokeToolType,
		AnnotationShapeType,
		FillMode,
		StrokeStyle
	} from '$lib/whiteboard/types/document';

	// ==========================================================================
	// Types
	// ==========================================================================

	export type SlideAnnotationToolType =
		| 'pen'
		| 'marker'
		| 'highlighter'
		| 'eraser'
		| 'line'
		| 'rectangle'
		| 'circle'
		| 'arrow';

	export interface AnnotationStyle {
		color: string;
		strokeWidth: number;
		opacity: number;
	}

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Current annotations */
		annotations: AnnotationElement[];
		/** Page width for SVG viewBox */
		pageWidth: number;
		/** Page height for SVG viewBox */
		pageHeight: number;
		/** Whether annotation mode is enabled */
		enabled?: boolean;
		/** Current tool */
		tool?: SlideAnnotationToolType;
		/** Current style */
		style?: AnnotationStyle;
		/** Callback when annotations change */
		onchange?: (annotations: AnnotationElement[]) => void;
		/** Additional CSS class */
		class?: string;
	}

	let {
		annotations = [],
		pageWidth,
		pageHeight,
		enabled = false,
		tool = 'pen',
		style = { color: '#ff0000', strokeWidth: 3, opacity: 1 },
		onchange,
		class: className = ''
	}: Props = $props();

	// ==========================================================================
	// Local State
	// ==========================================================================

	let svgElement: SVGSVGElement | null = $state(null);
	let isDrawing = $state(false);
	let activePoints = $state<Point[]>([]);
	let shapeStart = $state<Point | null>(null);
	let shapeEnd = $state<Point | null>(null);

	/** Undo/redo history */
	let undoStack = $state<AnnotationElement[][]>([]);
	let redoStack = $state<AnnotationElement[][]>([]);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	let viewBox = $derived(`0 0 ${pageWidth} ${pageHeight}`);

	let isStrokeTool = $derived(['pen', 'marker', 'highlighter'].includes(tool));
	let isShapeTool = $derived(['line', 'rectangle', 'circle', 'arrow'].includes(tool));

	let activeStrokePath = $derived.by(() => {
		if (activePoints.length < 2) return '';
		const options = getStrokeOptions(tool, style.strokeWidth);
		const outline = smoothStroke([...activePoints], options);
		return pointsToSvgPath(outline);
	});

	let activeShapePreview = $derived.by(() => {
		if (!shapeStart || !shapeEnd) return null;
		return { start: shapeStart, end: shapeEnd };
	});

	// ==========================================================================
	// Helper Functions
	// ==========================================================================

	function getStrokeOptions(t: SlideAnnotationToolType, width: number) {
		switch (t) {
			case 'pen':
				return {
					size: width,
					thinning: 0.5,
					smoothing: 0.5,
					streamline: 0.5,
					simulatePressure: true
				};
			case 'marker':
				return {
					size: width * 2,
					thinning: 0,
					smoothing: 0.5,
					streamline: 0.5,
					simulatePressure: false
				};
			case 'highlighter':
				return {
					size: width * 3,
					thinning: 0,
					smoothing: 0.5,
					streamline: 0.6,
					simulatePressure: false
				};
			default:
				return {
					size: width,
					thinning: 0.5,
					smoothing: 0.5,
					streamline: 0.5,
					simulatePressure: true
				};
		}
	}

	function getPointerPosition(e: PointerEvent): Point {
		if (!svgElement) return { x: 0, y: 0 };

		const rect = svgElement.getBoundingClientRect();
		// Calculate the actual scale from screen pixels to viewBox units
		// This accounts for CSS transforms
		const actualScaleX = rect.width / pageWidth;
		const actualScaleY = rect.height / pageHeight;

		const x = (e.clientX - rect.left) / actualScaleX;
		const y = (e.clientY - rect.top) / actualScaleY;

		return {
			x: Math.max(0, Math.min(pageWidth, x)),
			y: Math.max(0, Math.min(pageHeight, y)),
			pressure: e.pressure > 0 ? e.pressure : 0.5
		};
	}

	function generateId(): string {
		return `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	function pushHistory() {
		undoStack = [...undoStack, [...annotations]];
		redoStack = [];
		// Limit history size
		if (undoStack.length > 50) {
			undoStack = undoStack.slice(-50);
		}
	}

	// ==========================================================================
	// Annotation Management
	// ==========================================================================

	function addAnnotation(annotation: AnnotationElement) {
		pushHistory();
		const newAnnotations = [...annotations, annotation];
		onchange?.(newAnnotations);
	}

	function removeAnnotation(id: string) {
		pushHistory();
		const newAnnotations = annotations.filter((a) => a.id !== id);
		onchange?.(newAnnotations);
	}

	export function undo() {
		if (undoStack.length === 0) return;
		redoStack = [...redoStack, [...annotations]];
		const prev = undoStack[undoStack.length - 1];
		undoStack = undoStack.slice(0, -1);
		onchange?.(prev);
	}

	export function redo() {
		if (redoStack.length === 0) return;
		undoStack = [...undoStack, [...annotations]];
		const next = redoStack[redoStack.length - 1];
		redoStack = redoStack.slice(0, -1);
		onchange?.(next);
	}

	export function clearAll() {
		if (annotations.length === 0) return;
		pushHistory();
		onchange?.([]);
	}

	export function canUndo(): boolean {
		return undoStack.length > 0;
	}

	export function canRedo(): boolean {
		return redoStack.length > 0;
	}

	// ==========================================================================
	// Stroke Rendering
	// ==========================================================================

	function renderStrokePath(stroke: AnnotationStroke): string {
		if (stroke.points.length < 2) return '';
		const toolType = stroke.toolType;
		const options = getStrokeOptions(toolType, stroke.width);
		const outline = smoothStroke([...stroke.points], options);
		return pointsToSvgPath(outline);
	}

	function getStrokeStyle(stroke: AnnotationStroke): string {
		const baseOpacity = stroke.opacity;
		if (stroke.toolType === 'highlighter') {
			return `fill: ${stroke.color}; opacity: ${baseOpacity}; mix-blend-mode: multiply;`;
		}
		return `fill: ${stroke.color}; opacity: ${baseOpacity};`;
	}

	// ==========================================================================
	// Shape Rendering
	// ==========================================================================

	function renderShapePath(shape: AnnotationShape): string {
		const { start, end, shapeType } = shape;
		const minX = Math.min(start.x, end.x);
		const minY = Math.min(start.y, end.y);
		const width = Math.abs(end.x - start.x);
		const height = Math.abs(end.y - start.y);

		switch (shapeType) {
			case 'line':
				return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
			case 'rectangle':
				return `M ${minX} ${minY} h ${width} v ${height} h ${-width} Z`;
			case 'circle': {
				const cx = (start.x + end.x) / 2;
				const cy = (start.y + end.y) / 2;
				const rx = width / 2;
				const ry = height / 2;
				if (rx < 1 || ry < 1) return '';
				return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
			}
			case 'arrow': {
				const dx = end.x - start.x;
				const dy = end.y - start.y;
				const len = Math.sqrt(dx * dx + dy * dy);
				if (len < 1) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
				const arrowSize = Math.min(20, len / 3);
				const ux = dx / len;
				const uy = dy / len;
				const px = -uy;
				const py = ux;
				const tipX = end.x;
				const tipY = end.y;
				const backX = end.x - ux * arrowSize;
				const backY = end.y - uy * arrowSize;
				const left = `${backX + px * arrowSize * 0.4} ${backY + py * arrowSize * 0.4}`;
				const right = `${backX - px * arrowSize * 0.4} ${backY - py * arrowSize * 0.4}`;
				return `M ${start.x} ${start.y} L ${backX} ${backY} M ${tipX} ${tipY} L ${left} M ${tipX} ${tipY} L ${right}`;
			}
			default:
				return '';
		}
	}

	function getShapeStyleObj(shape: AnnotationShape): {
		stroke: string;
		fill: string;
		strokeWidth: number;
		opacity: number;
		strokeDasharray: string | undefined;
	} {
		const fillColor = shape.fillMode !== 'none' && shape.fill ? shape.fill : 'none';
		const strokeDasharray = shape.strokeStyle === 'dashed' ? '8 4' : undefined;
		return {
			stroke: shape.color,
			fill: fillColor,
			strokeWidth: shape.strokeWidth,
			opacity: shape.opacity,
			strokeDasharray
		};
	}

	// ==========================================================================
	// Event Handlers
	// ==========================================================================

	function handlePointerDown(e: PointerEvent) {
		if (!enabled) return;
		if (e.button !== 0) return;

		e.preventDefault();
		e.stopPropagation();

		const point = getPointerPosition(e);

		if (tool === 'eraser') {
			handleEraserPoint(point);
			isDrawing = true;
		} else if (isStrokeTool) {
			activePoints = [point];
			isDrawing = true;
		} else if (isShapeTool) {
			shapeStart = point;
			shapeEnd = point;
			isDrawing = true;
		}

		(e.target as Element)?.setPointerCapture?.(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!enabled || !isDrawing) return;

		e.preventDefault();

		const point = getPointerPosition(e);

		if (tool === 'eraser') {
			handleEraserPoint(point);
		} else if (isStrokeTool) {
			activePoints = [...activePoints, point];
		} else if (isShapeTool) {
			shapeEnd = point;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (!enabled) return;

		e.preventDefault();

		if (!isDrawing) return;

		if (isStrokeTool && activePoints.length >= 2) {
			const toolType = tool as AnnotationStrokeToolType;
			const stroke: AnnotationStroke = {
				id: generateId(),
				type: 'stroke',
				points: activePoints,
				width: style.strokeWidth,
				color: style.color,
				opacity: tool === 'highlighter' ? 0.4 : style.opacity,
				toolType,
				strokeStyle: 'solid',
				sketch: false,
				createdAt: Date.now()
			};
			addAnnotation(stroke);
		} else if (isShapeTool && shapeStart && shapeEnd) {
			const shapeType = tool as AnnotationShapeType;
			const shape: AnnotationShape = {
				id: generateId(),
				type: 'shape',
				shapeType,
				start: shapeStart,
				end: shapeEnd,
				color: style.color,
				strokeWidth: style.strokeWidth,
				opacity: style.opacity,
				strokeStyle: 'solid',
				fillMode: 'none',
				sketch: false,
				createdAt: Date.now()
			};
			addAnnotation(shape);
		}

		// Reset state
		activePoints = [];
		shapeStart = null;
		shapeEnd = null;
		isDrawing = false;

		try {
			(e.target as Element)?.releasePointerCapture?.(e.pointerId);
		} catch {
			// Ignore
		}
	}

	function handlePointerCancel(e: PointerEvent) {
		activePoints = [];
		shapeStart = null;
		shapeEnd = null;
		isDrawing = false;

		try {
			(e.target as Element)?.releasePointerCapture?.(e.pointerId);
		} catch {
			// Ignore
		}
	}

	function handleEraserPoint(point: Point) {
		const eraserWidth = style.strokeWidth * 2;
		const eraserPoints = [point];

		for (const annotation of annotations) {
			if (annotation.type === 'stroke') {
				if (
					doStrokesIntersect(eraserPoints, [...annotation.points], eraserWidth, annotation.width)
				) {
					removeAnnotation(annotation.id);
					return; // Remove one at a time
				}
			} else if (annotation.type === 'shape') {
				const { start, end } = annotation;
				const minX = Math.min(start.x, end.x) - eraserWidth;
				const maxX = Math.max(start.x, end.x) + eraserWidth;
				const minY = Math.min(start.y, end.y) - eraserWidth;
				const maxY = Math.max(start.y, end.y) + eraserWidth;
				if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
					removeAnnotation(annotation.id);
					return;
				}
			}
		}
	}
</script>

<svg
	bind:this={svgElement}
	class="slide-annotation-layer {className}"
	class:enabled
	class:eraser-mode={tool === 'eraser'}
	{viewBox}
	preserveAspectRatio="none"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerCancel}
	role="img"
	aria-label="Annotation layer"
>
	<!-- Rendered annotations -->
	<g class="layer-annotations">
		{#each annotations as annotation (annotation.id)}
			{#if annotation.type === 'stroke'}
				{@const path = renderStrokePath(annotation)}
				{#if path}
					<path d={path} style={getStrokeStyle(annotation)} stroke="none" />
				{/if}
			{:else if annotation.type === 'shape'}
				{@const shapeStyle = getShapeStyleObj(annotation)}
				<path
					d={renderShapePath(annotation)}
					stroke={shapeStyle.stroke}
					stroke-width={shapeStyle.strokeWidth}
					stroke-dasharray={shapeStyle.strokeDasharray}
					fill={shapeStyle.fill}
					opacity={shapeStyle.opacity}
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/if}
		{/each}
	</g>

	<!-- Active stroke preview -->
	{#if isDrawing && isStrokeTool && activeStrokePath}
		<g class="layer-active-annotation">
			<path
				d={activeStrokePath}
				fill={style.color}
				opacity={tool === 'highlighter' ? 0.4 : style.opacity}
				stroke="none"
				style={tool === 'highlighter' ? 'mix-blend-mode: multiply;' : ''}
			/>
		</g>
	{/if}

	<!-- Active shape preview -->
	{#if isDrawing && isShapeTool && activeShapePreview}
		{@const preview = activeShapePreview}
		{@const tempShape = {
			type: 'shape' as const,
			shapeType: tool as AnnotationShapeType,
			start: preview.start,
			end: preview.end,
			color: style.color,
			strokeWidth: style.strokeWidth,
			opacity: style.opacity,
			fillMode: 'none' as FillMode,
			fill: undefined,
			strokeStyle: 'solid' as StrokeStyle,
			sketch: false,
			id: 'preview',
			createdAt: 0
		}}
		<g class="layer-active-annotation">
			<path
				d={renderShapePath(tempShape)}
				stroke={style.color}
				stroke-width={style.strokeWidth}
				fill="none"
				opacity={style.opacity * 0.7}
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-dasharray="4 4"
			/>
		</g>
	{/if}
</svg>

<style>
	.slide-annotation-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 100;
		pointer-events: none;
		overflow: visible;
	}

	.slide-annotation-layer.enabled {
		pointer-events: auto;
		cursor: crosshair;
	}

	.slide-annotation-layer.eraser-mode {
		cursor:
			url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="white" stroke="gray" stroke-width="2"/></svg>')
				12 12,
			auto;
	}

	.layer-active-annotation {
		pointer-events: none;
	}
</style>
