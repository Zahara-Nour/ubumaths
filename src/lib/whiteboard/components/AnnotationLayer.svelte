<script lang="ts">
	/**
	 * AnnotationLayer - SVG overlay for annotations
	 *
	 * Renders annotations (strokes, shapes, stamps) on top of all whiteboard content,
	 * including HTML overlays like TextBlockLayer and ShapeLabelLayer.
	 *
	 * This layer has the highest z-index to allow drawing over everything.
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type {
		AnnotationElement,
		AnnotationStroke,
		AnnotationShape,
		AnnotationStamp,
		Point,
		AnnotationToolType
	} from '../types/document';
	import { smoothStroke, pointsToSvgPath, doStrokesIntersect } from '../core/stroke-smoothing';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Scale factor for coordinate transformation */
		scale?: number;
		/** Optional class for styling */
		class?: string;
	}

	let { scale = 1, class: className = '' }: Props = $props();

	// ==========================================================================
	// Local State
	// ==========================================================================

	/** Currently drawing stroke points */
	let activePoints = $state<Point[]>([]);

	/** Is currently drawing */
	let isDrawing = $state(false);

	/** Shape drawing start point */
	let shapeStart = $state<Point | null>(null);

	/** Shape drawing current end point */
	let shapeEnd = $state<Point | null>(null);

	/** SVG element reference for coordinate transformation */
	let svgElement: SVGSVGElement | null = $state(null);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/** Current page from store */
	let currentPage = $derived(whiteboardStore.currentPage);

	/** Page dimensions */
	let pageWidth = $derived(currentPage?.width ?? 794);
	let pageHeight = $derived(currentPage?.height ?? 1123);

	/** Annotations on current page */
	let annotations = $derived<readonly AnnotationElement[]>(currentPage?.annotations ?? []);

	/** Document-level visibility toggle */
	let annotationsVisible = $derived(whiteboardStore.document?.annotationsVisible ?? true);

	/** Whether annotation mode is active */
	let isAnnotationMode = $derived(whiteboardStore.isAnnotationMode);

	/** Current annotation tool */
	let currentTool = $derived(whiteboardStore.annotationTool);

	/** Current annotation style settings */
	let annotationStyle = $derived(whiteboardStore.annotationStyle);

	/** Active stroke path for preview */
	let activeStrokePath = $derived.by(() => {
		if (activePoints.length < 2) return '';
		const options = getStrokeOptions(currentTool, annotationStyle.strokeWidth);
		const outline = smoothStroke([...activePoints], options);
		return pointsToSvgPath(outline);
	});

	/** Active shape preview */
	let activeShapePreview = $derived.by(() => {
		if (!shapeStart || !shapeEnd) return null;
		return { start: shapeStart, end: shapeEnd };
	});

	// ==========================================================================
	// Helper Functions
	// ==========================================================================

	function getStrokeOptions(tool: AnnotationToolType, width: number) {
		switch (tool) {
			case 'annotation-pen':
				return {
					size: width,
					thinning: 0.5,
					smoothing: 0.5,
					streamline: 0.5,
					simulatePressure: true
				};
			case 'annotation-marker':
				return {
					size: width * 2,
					thinning: 0,
					smoothing: 0.5,
					streamline: 0.5,
					simulatePressure: false
				};
			case 'annotation-highlighter':
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
		const x = (e.clientX - rect.left) / scale;
		const y = (e.clientY - rect.top) / scale;

		return {
			x: Math.max(0, Math.min(pageWidth, x)),
			y: Math.max(0, Math.min(pageHeight, y)),
			pressure: e.pressure > 0 ? e.pressure : 0.5
		};
	}

	function isStrokeTool(tool: AnnotationToolType): boolean {
		return ['annotation-pen', 'annotation-marker', 'annotation-highlighter'].includes(tool);
	}

	function isShapeTool(tool: AnnotationToolType): boolean {
		return [
			'annotation-line',
			'annotation-rectangle',
			'annotation-circle',
			'annotation-arrow'
		].includes(tool);
	}

	// ==========================================================================
	// Stroke Rendering
	// ==========================================================================

	function renderStrokePath(stroke: AnnotationStroke): string {
		if (stroke.points.length < 2) return '';
		const toolType = `annotation-${stroke.toolType}` as AnnotationToolType;
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

	function getShapeStyle(shape: AnnotationShape): {
		stroke: string;
		fill: string;
		strokeWidth: number;
		opacity: number;
	} {
		const fillColor = shape.fillMode !== 'none' && shape.fill ? shape.fill : 'none';
		return {
			stroke: shape.color,
			fill: fillColor,
			strokeWidth: shape.strokeWidth,
			opacity: shape.opacity
		};
	}

	// ==========================================================================
	// Stamp Rendering
	// ==========================================================================

	function getStampFontSize(stamp: AnnotationStamp): number {
		return stamp.size;
	}

	// ==========================================================================
	// Event Handlers
	// ==========================================================================

	function handlePointerDown(e: PointerEvent) {
		if (!isAnnotationMode) return;
		if (e.button !== 0) return; // Only left click

		e.preventDefault();
		e.stopPropagation();

		const point = getPointerPosition(e);

		if (currentTool === 'annotation-eraser') {
			// Eraser: check for intersections immediately
			handleEraserPoint(point);
			isDrawing = true;
		} else if (currentTool === 'annotation-stamp') {
			// Stamp: place immediately
			whiteboardStore.addAnnotationStamp(point);
		} else if (isStrokeTool(currentTool)) {
			// Stroke tools: start drawing
			activePoints = [point];
			isDrawing = true;
		} else if (isShapeTool(currentTool)) {
			// Shape tools: start shape
			shapeStart = point;
			shapeEnd = point;
			isDrawing = true;
		}

		(e.target as Element)?.setPointerCapture?.(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isAnnotationMode || !isDrawing) return;

		e.preventDefault();

		const point = getPointerPosition(e);

		if (currentTool === 'annotation-eraser') {
			handleEraserPoint(point);
		} else if (isStrokeTool(currentTool)) {
			activePoints = [...activePoints, point];
		} else if (isShapeTool(currentTool)) {
			shapeEnd = point;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isAnnotationMode || !isDrawing) return;

		e.preventDefault();

		if (isStrokeTool(currentTool) && activePoints.length >= 2) {
			// Finalize stroke
			const toolType = currentTool.replace('annotation-', '') as 'pen' | 'marker' | 'highlighter';
			whiteboardStore.addAnnotationStroke(activePoints, toolType);
		} else if (isShapeTool(currentTool) && shapeStart && shapeEnd) {
			// Finalize shape
			const shapeType = currentTool.replace('annotation-', '') as
				| 'line'
				| 'rectangle'
				| 'circle'
				| 'arrow';
			whiteboardStore.addAnnotationShape(shapeStart, shapeEnd, shapeType);
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
		// Find annotations that intersect with eraser
		const eraserWidth = annotationStyle.strokeWidth * 2;
		const eraserPoints = [point];

		for (const annotation of annotations) {
			if (annotation.type === 'stroke') {
				if (
					doStrokesIntersect(eraserPoints, [...annotation.points], eraserWidth, annotation.width)
				) {
					whiteboardStore.deleteAnnotation(annotation.id);
				}
			} else if (annotation.type === 'shape') {
				// Simple bounding box check for shapes
				const { start, end } = annotation;
				const minX = Math.min(start.x, end.x) - eraserWidth;
				const maxX = Math.max(start.x, end.x) + eraserWidth;
				const minY = Math.min(start.y, end.y) - eraserWidth;
				const maxY = Math.max(start.y, end.y) + eraserWidth;
				if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
					whiteboardStore.deleteAnnotation(annotation.id);
				}
			} else if (annotation.type === 'stamp') {
				// Check distance to stamp center
				const dx = point.x - annotation.position.x;
				const dy = point.y - annotation.position.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < annotation.size / 2 + eraserWidth) {
					whiteboardStore.deleteAnnotation(annotation.id);
				}
			}
		}
	}
</script>

{#if annotationsVisible}
	<svg
		bind:this={svgElement}
		class="annotation-layer {className}"
		class:annotation-mode={isAnnotationMode}
		viewBox="0 0 {pageWidth} {pageHeight}"
		width={pageWidth * scale}
		height={pageHeight * scale}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerCancel}
		role="img"
		aria-label="Couche d'annotations"
	>
		<!-- Rendered annotations -->
		<g class="layer-annotations">
			{#each annotations as annotation (annotation.id)}
				{#if annotation.type === 'stroke'}
					<path d={renderStrokePath(annotation)} style={getStrokeStyle(annotation)} stroke="none" />
				{:else if annotation.type === 'shape'}
					{@const style = getShapeStyle(annotation)}
					<path
						d={renderShapePath(annotation)}
						stroke={style.stroke}
						stroke-width={style.strokeWidth}
						fill={style.fill}
						opacity={style.opacity}
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				{:else if annotation.type === 'stamp'}
					{#if annotation.fill}
						<circle
							cx={annotation.position.x}
							cy={annotation.position.y}
							r={annotation.size / 2 + 4}
							fill={annotation.fill}
							opacity={annotation.fillOpacity ?? 1}
						/>
					{/if}
					<text
						x={annotation.position.x}
						y={annotation.position.y}
						font-size={getStampFontSize(annotation)}
						fill={annotation.color}
						opacity={annotation.opacity}
						text-anchor="middle"
						dominant-baseline="central"
						transform="rotate({annotation.rotation}, {annotation.position.x}, {annotation.position
							.y})"
						style="user-select: none;"
					>
						{annotation.stampType}
					</text>
				{/if}
			{/each}
		</g>

		<!-- Active stroke preview -->
		{#if isDrawing && isStrokeTool(currentTool) && activeStrokePath}
			<g class="layer-active-annotation">
				<path
					d={activeStrokePath}
					fill={annotationStyle.color}
					opacity={currentTool === 'annotation-highlighter' ? 0.4 : annotationStyle.opacity}
					stroke="none"
					style={currentTool === 'annotation-highlighter' ? 'mix-blend-mode: multiply;' : ''}
				/>
			</g>
		{/if}

		<!-- Active shape preview -->
		{#if isDrawing && isShapeTool(currentTool) && activeShapePreview}
			<g class="layer-active-annotation">
				{@const preview = activeShapePreview}
				{@const shapeType = currentTool.replace('annotation-', '')}
				{@const tempShape = {
					type: 'shape' as const,
					shapeType: shapeType as 'line' | 'rectangle' | 'circle' | 'arrow',
					start: preview.start,
					end: preview.end,
					color: annotationStyle.color,
					strokeWidth: annotationStyle.strokeWidth,
					opacity: annotationStyle.opacity,
					fillMode: annotationStyle.fillMode,
					fill: annotationStyle.fill,
					strokeStyle: annotationStyle.strokeStyle,
					sketch: annotationStyle.sketch,
					id: 'preview',
					createdAt: 0
				}}
				<path
					d={renderShapePath(tempShape)}
					stroke={annotationStyle.color}
					stroke-width={annotationStyle.strokeWidth}
					fill={annotationStyle.fillMode !== 'none' && annotationStyle.fill
						? annotationStyle.fill
						: 'none'}
					opacity={annotationStyle.opacity * 0.7}
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-dasharray="4 4"
				/>
			</g>
		{/if}

		<!-- Eraser cursor preview -->
		{#if isAnnotationMode && currentTool === 'annotation-eraser'}
			<g class="layer-eraser-cursor" style="pointer-events: none;">
				<!-- Eraser cursor is handled by CSS -->
			</g>
		{/if}
	</svg>
{/if}

<style>
	.annotation-layer {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 200;
		pointer-events: none;
		overflow: visible;
	}

	.annotation-layer.annotation-mode {
		pointer-events: auto;
		cursor: crosshair;
	}

	.layer-active-annotation {
		pointer-events: none;
	}
</style>
