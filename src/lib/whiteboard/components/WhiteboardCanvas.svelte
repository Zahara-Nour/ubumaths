<script lang="ts">
	/**
	 * WhiteboardCanvas - SVG-based drawing canvas
	 *
	 * Multi-layered SVG canvas for whiteboard drawing.
	 * Layers (bottom to top): background, content, active-stroke, instruments
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import {
		smoothStroke,
		getToolOptions,
		pointsToSvgPath,
		doStrokesIntersect
	} from '../core/stroke-smoothing';
	import { createShapeElement, getShapeSvgProps } from '../core/shapes';
	import InstrumentLayer from './InstrumentLayer.svelte';
	import TextBlockLayer from './TextBlockLayer.svelte';
	import ImageLayer from './ImageLayer.svelte';
	import type {
		Point,
		StrokeElement,
		ShapeElement,
		ShapeType,
		ImageElement
	} from '../types/document';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Optional class for the container */
		class?: string;
		/** Scale factor for coordinate transformation */
		scale?: number;
	}

	let { class: className = '', scale = 1 }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Current drawing state */
	let isDrawing = $state(false);

	/** Points collected during current stroke */
	let currentPoints: Point[] = $state([]);

	/** SVG path for the active stroke preview */
	let activeStrokePath = $state('');

	/** Shape drawing state */
	let shapeStartPoint: Point | null = $state(null);
	let shapeEndPoint: Point | null = $state(null);

	/** TextBlockLayer reference */
	let textBlockLayerRef: TextBlockLayer | null = $state(null);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/** Current page from store */
	let currentPage = $derived(whiteboardStore.currentPage);

	/** Current tool settings */
	let toolState = $derived(whiteboardStore.toolState);

	/** Page dimensions */
	let pageWidth = $derived(currentPage?.width ?? 794);
	let pageHeight = $derived(currentPage?.height ?? 1123);

	/** Elements on current page */
	let elements = $derived(currentPage?.elements ?? []);

	/** Only stroke elements for rendering */
	let strokeElements = $derived(elements.filter((el): el is StrokeElement => el.type === 'stroke'));

	/** Only shape elements for rendering */
	let shapeElements = $derived(elements.filter((el): el is ShapeElement => el.type === 'shape'));

	/** Only image elements for rendering */
	let imageElements = $derived(elements.filter((el): el is ImageElement => el.type === 'image'));

	/** Shape tools */
	const SHAPE_TOOLS = ['line', 'rectangle', 'circle', 'arrow'] as const;
	let isShapeTool = $derived(
		SHAPE_TOOLS.includes(toolState.toolType as (typeof SHAPE_TOOLS)[number])
	);

	/** Drawing tools */
	const DRAWING_TOOLS = ['pen', 'highlighter', 'eraser'] as const;
	let isDrawingTool = $derived(
		DRAWING_TOOLS.includes(toolState.toolType as (typeof DRAWING_TOOLS)[number])
	);

	/** Text tool */
	let isTextTool = $derived(toolState.toolType === 'text');

	/** ViewBox for SVG */
	let viewBox = $derived(`0 0 ${pageWidth} ${pageHeight}`);

	/** Current stroke style */
	let currentStrokeStyle = $derived({
		color: toolState.color,
		width: toolState.strokeWidth,
		opacity: toolState.toolType === 'highlighter' ? 0.3 : 1
	});

	// ==========================================================================
	// Pointer Event Handlers
	// ==========================================================================

	/**
	 * Get point coordinates relative to SVG
	 */
	function getPointFromEvent(e: PointerEvent): Point {
		const svg = e.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();

		// Calculate position relative to SVG viewBox
		const x = ((e.clientX - rect.left) / rect.width) * pageWidth;
		const y = ((e.clientY - rect.top) / rect.height) * pageHeight;

		return {
			x,
			y,
			pressure: e.pressure > 0 ? e.pressure : undefined
		};
	}

	/**
	 * Handle pointer down - start drawing
	 */
	function handlePointerDown(e: PointerEvent) {
		// Only handle primary button (left click / touch)
		if (e.button !== 0) return;

		const point = getPointFromEvent(e);

		// Handle text tool - create new text block
		if (isTextTool) {
			e.preventDefault();
			textBlockLayerRef?.createBlockAtPosition(point.x, point.y);
			return;
		}

		// Handle shape tools
		if (isShapeTool) {
			e.preventDefault();
			(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);

			isDrawing = true;
			shapeStartPoint = point;
			shapeEndPoint = point;
			return;
		}

		// Handle drawing tools (pen, highlighter, eraser)
		if (isDrawingTool) {
			e.preventDefault();
			(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);

			isDrawing = true;
			currentPoints = [point];

			// Update active stroke preview
			updateActiveStroke();
		}
	}

	/**
	 * Handle pointer move - add points to stroke
	 */
	function handlePointerMove(e: PointerEvent) {
		if (!isDrawing) return;

		e.preventDefault();
		const point = getPointFromEvent(e);

		// Handle shape tools
		if (isShapeTool) {
			shapeEndPoint = point;
			return;
		}

		// Handle drawing tools
		if (isDrawingTool) {
			// Add point to current stroke
			currentPoints = [...currentPoints, point];

			// Update active stroke preview
			updateActiveStroke();
		}
	}

	/**
	 * Handle pointer up - finalize stroke
	 */
	function handlePointerUp(e: PointerEvent) {
		if (!isDrawing) return;

		e.preventDefault();

		try {
			// Handle shape tools
			if (isShapeTool) {
				finalizeShape();
			} else if (isDrawingTool) {
				finalizeStroke();
			}
		} finally {
			// Always release capture, even on error
			(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
		}
	}

	/**
	 * Handle pointer cancel - abort stroke
	 */
	function handlePointerCancel(e: PointerEvent) {
		if (!isDrawing) return;

		(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);

		// Abort current drawing
		isDrawing = false;
		currentPoints = [];
		activeStrokePath = '';
		shapeStartPoint = null;
		shapeEndPoint = null;
	}

	// ==========================================================================
	// Stroke Processing
	// ==========================================================================

	/**
	 * Update the active stroke preview path
	 */
	function updateActiveStroke() {
		if (currentPoints.length === 0) {
			activeStrokePath = '';
			return;
		}

		const options = getToolOptions(
			toolState.toolType as 'pen' | 'highlighter' | 'eraser',
			toolState.strokeWidth,
			toolState.color,
			1
		);

		const outlinePoints = smoothStroke(currentPoints, options);
		activeStrokePath = pointsToSvgPath(outlinePoints);
	}

	/**
	 * Finalize the current stroke
	 */
	function finalizeStroke() {
		if (currentPoints.length < 2) {
			// Not enough points for a stroke
			isDrawing = false;
			currentPoints = [];
			activeStrokePath = '';
			return;
		}

		if (toolState.toolType === 'eraser') {
			// Eraser: remove intersecting strokes
			eraseIntersectingStrokes();
		} else {
			// Pen/Highlighter: add new stroke
			addStrokeElement();
		}

		// Reset state
		isDrawing = false;
		currentPoints = [];
		activeStrokePath = '';
	}

	/**
	 * Add a new stroke element to the document
	 */
	function addStrokeElement() {
		const element: StrokeElement = {
			id: crypto.randomUUID(),
			type: 'stroke',
			toolType: toolState.toolType as 'pen' | 'highlighter',
			points: currentPoints,
			color: toolState.color,
			width: toolState.strokeWidth,
			opacity: toolState.toolType === 'highlighter' ? 0.3 : 1
		};

		whiteboardStore.addElement(element);
	}

	/**
	 * Erase strokes that intersect with the eraser path
	 */
	function eraseIntersectingStrokes() {
		const eraserWidth = toolState.strokeWidth;

		// Find all strokes that intersect with the eraser path
		const strokesToRemove: string[] = [];

		for (const stroke of strokeElements) {
			if (doStrokesIntersect(currentPoints, stroke.points as Point[], eraserWidth, stroke.width)) {
				strokesToRemove.push(stroke.id);
			}
		}

		// Remove intersecting strokes
		for (const id of strokesToRemove) {
			whiteboardStore.removeElement(id);
		}
	}

	// ==========================================================================
	// Shape Processing
	// ==========================================================================

	/**
	 * Finalize the current shape
	 */
	function finalizeShape() {
		// Capture points for null safety
		const start = shapeStartPoint;
		const end = shapeEndPoint;

		if (!start || !end) {
			resetShapeState();
			return;
		}

		const dx = Math.abs(end.x - start.x);
		const dy = Math.abs(end.y - start.y);
		const currentTool = toolState.toolType;

		// Validation rules based on shape type
		if (currentTool === 'line' || currentTool === 'arrow') {
			// Lines/arrows need at least 5px length
			if (dx < 5 && dy < 5) {
				resetShapeState();
				return;
			}
		} else {
			// Rectangles/circles need non-zero dimensions in both axes
			if (dx < 5 || dy < 5) {
				resetShapeState();
				return;
			}
		}

		// Create and add the shape element
		const shape = createShapeElement(currentTool as ShapeType, start, end, {
			color: toolState.color,
			strokeWidth: toolState.strokeWidth
		});

		whiteboardStore.addElement(shape);
		resetShapeState();
	}

	/**
	 * Reset shape drawing state
	 */
	function resetShapeState() {
		isDrawing = false;
		shapeStartPoint = null;
		shapeEndPoint = null;
	}

	// ==========================================================================
	// Stroke Rendering
	// ==========================================================================

	/**
	 * Get SVG path for a stroke element
	 */
	function getStrokePath(stroke: StrokeElement): string {
		const options = getToolOptions(stroke.toolType, stroke.width, stroke.color, stroke.opacity);
		const outlinePoints = smoothStroke(stroke.points as Point[], options);
		return pointsToSvgPath(outlinePoints);
	}
</script>

<div class="whiteboard-canvas-container relative overflow-hidden bg-gray-100 {className}">
	<svg
		class="whiteboard-svg"
		{viewBox}
		preserveAspectRatio="xMidYMid meet"
		style="width: 100%; height: 100%;"
		role="img"
		aria-label="Tableau blanc interactif avec {strokeElements.length +
			shapeElements.length +
			imageElements.length} éléments"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerCancel}
		onpointerleave={handlePointerCancel}
	>
		<!-- Layer 1: Background -->
		<g class="layer-background">
			{#if currentPage?.background.type === 'plain'}
				<rect
					x="0"
					y="0"
					width={pageWidth}
					height={pageHeight}
					fill={currentPage.background.color}
				/>
				{#if currentPage.background.style === 'grid'}
					<defs>
						<pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
							<path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" stroke-width="0.5" />
						</pattern>
					</defs>
					<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="url(#grid-pattern)" />
				{:else if currentPage.background.style === 'ruled'}
					<defs>
						<pattern id="ruled-pattern" width={pageWidth} height="24" patternUnits="userSpaceOnUse">
							<line x1="0" y1="24" x2={pageWidth} y2="24" stroke="#e5e7eb" stroke-width="0.5" />
						</pattern>
					</defs>
					<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="url(#ruled-pattern)" />
				{:else if currentPage.background.style === 'dotted'}
					<defs>
						<pattern id="dotted-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
							<circle cx="10" cy="10" r="1" fill="#d1d5db" />
						</pattern>
					</defs>
					<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="url(#dotted-pattern)" />
				{/if}
			{:else if currentPage?.background.type === 'image'}
				<!-- White base for transparency -->
				<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="#ffffff" />
				<!-- Background image -->
				<image
					href={currentPage.background.src}
					x="0"
					y="0"
					width={pageWidth}
					height={pageHeight}
					preserveAspectRatio="xMidYMid meet"
				/>
			{:else if currentPage?.background.type === 'pdf'}
				<!-- White base -->
				<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="#ffffff" />
				<!-- PDF page rendered as image -->
				<image
					href={currentPage.background.pdfData}
					x="0"
					y="0"
					width={pageWidth}
					height={pageHeight}
					preserveAspectRatio="xMidYMid meet"
				/>
			{/if}
		</g>

		<!-- Arrow marker definition -->
		<defs>
			<marker
				id="arrow-marker"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
			</marker>
		</defs>

		<!-- Layer 2: Content (existing strokes and shapes) -->
		<g class="layer-content">
			<!-- Strokes -->
			{#each strokeElements as stroke (stroke.id)}
				<path
					d={getStrokePath(stroke)}
					fill={stroke.color}
					fill-opacity={stroke.opacity}
					stroke="none"
				/>
			{/each}

			<!-- Shapes -->
			{#each shapeElements as shape (shape.id)}
				{@const props = getShapeSvgProps(shape.shapeType, shape.start, shape.end)}
				{#if props.type === 'line'}
					<line
						x1={props.x1}
						y1={props.y1}
						x2={props.x2}
						y2={props.y2}
						stroke={shape.color}
						stroke-width={shape.strokeWidth}
						stroke-linecap="round"
						marker-end={props.hasArrowMarker ? 'url(#arrow-marker)' : undefined}
						style={props.hasArrowMarker ? `color: ${shape.color}` : ''}
					/>
				{:else if props.type === 'rect'}
					<rect
						x={props.x}
						y={props.y}
						width={props.width}
						height={props.height}
						stroke={shape.color}
						stroke-width={shape.strokeWidth}
						fill={shape.fill ?? 'none'}
						fill-opacity={shape.fillOpacity ?? 1}
					/>
				{:else if props.type === 'ellipse'}
					<ellipse
						cx={props.cx}
						cy={props.cy}
						rx={props.rx}
						ry={props.ry}
						stroke={shape.color}
						stroke-width={shape.strokeWidth}
						fill={shape.fill ?? 'none'}
						fill-opacity={shape.fillOpacity ?? 1}
					/>
				{/if}
			{/each}
		</g>

		<!-- Layer 2.5: Images -->
		<g class="layer-images">
			<ImageLayer />
		</g>

		<!-- Layer 3: Active Stroke/Shape (currently drawing) -->
		<g class="layer-active-stroke">
			<!-- Active stroke preview -->
			{#if isDrawing && activeStrokePath && isDrawingTool}
				<path
					d={activeStrokePath}
					fill={toolState.toolType === 'eraser' ? '#f87171' : currentStrokeStyle.color}
					fill-opacity={toolState.toolType === 'eraser' ? 0.3 : currentStrokeStyle.opacity}
					stroke="none"
				/>
			{/if}

			<!-- Active shape preview (dashed outline) -->
			{#if isDrawing && isShapeTool && shapeStartPoint && shapeEndPoint}
				{@const previewProps = getShapeSvgProps(
					toolState.toolType as ShapeType,
					shapeStartPoint,
					shapeEndPoint
				)}
				{#if previewProps.type === 'line'}
					<line
						x1={previewProps.x1}
						y1={previewProps.y1}
						x2={previewProps.x2}
						y2={previewProps.y2}
						stroke={toolState.color}
						stroke-width={toolState.strokeWidth}
						stroke-dasharray="5,5"
						stroke-linecap="round"
						marker-end={previewProps.hasArrowMarker ? 'url(#arrow-marker)' : undefined}
						style={previewProps.hasArrowMarker ? `color: ${toolState.color}` : ''}
					/>
				{:else if previewProps.type === 'rect'}
					<rect
						x={previewProps.x}
						y={previewProps.y}
						width={previewProps.width}
						height={previewProps.height}
						stroke={toolState.color}
						stroke-width={toolState.strokeWidth}
						stroke-dasharray="5,5"
						fill="none"
					/>
				{:else if previewProps.type === 'ellipse'}
					<ellipse
						cx={previewProps.cx}
						cy={previewProps.cy}
						rx={previewProps.rx}
						ry={previewProps.ry}
						stroke={toolState.color}
						stroke-width={toolState.strokeWidth}
						stroke-dasharray="5,5"
						fill="none"
					/>
				{/if}
			{/if}
		</g>

		<!-- Layer 4: Instruments (ruler, protractor, etc.) -->
		<g class="layer-instruments">
			<InstrumentLayer {scale} />
		</g>
	</svg>

	<!-- TextBlock Layer (HTML overlay on SVG) -->
	<TextBlockLayer bind:this={textBlockLayerRef} {scale} />
</div>

<style>
	.whiteboard-canvas-container {
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.whiteboard-svg {
		display: block;
		cursor: crosshair;
	}
</style>
