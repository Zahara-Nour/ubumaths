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
	import {
		hitTestElements,
		getElementsInRect,
		getElementsIntersectingRect,
		getElementBounds,
		getBoundsCenter,
		type BoundingBox
	} from '../core/hit-testing';
	import InstrumentLayer from './InstrumentLayer.svelte';
	import TextBlockLayer from './TextBlockLayer.svelte';
	import ImageLayer from './ImageLayer.svelte';
	import SelectionLayer from './SelectionLayer.svelte';
	import type ContextMenu from './ContextMenu.svelte';
	import {
		getStrokeDashArray,
		type Point,
		type StrokeElement,
		type ShapeElement,
		type ShapeType,
		type ImageElement
	} from '../types/document';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Optional class for the container */
		class?: string;
		/** Scale factor for coordinate transformation */
		scale?: number;
		/** Context menu reference (rendered outside transformed area) */
		contextMenuRef?: ContextMenu | null;
	}

	let { class: className = '', scale = 1, contextMenuRef = null }: Props = $props();

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

	/** Hovered element ID (for select tool hover feedback) */
	let hoveredElementId = $state<string | null>(null);

	/** Selection drag state (for immediate drag without prior selection) */
	let isSelectionDragging = $state(false);
	let selectionDragStartX = $state(0);
	let selectionDragStartY = $state(0);

	/** Marquee selection state (drag to select multiple elements) */
	let isMarqueeSelecting = $state(false);
	let marqueeStart = $state<Point | null>(null);
	let marqueeEnd = $state<Point | null>(null);
	let marqueeAddToSelection = $state(false);
	let marqueeIntersectionMode = $state(false); // Alt key = intersection mode

	/** Minimum drag distance before movement starts (prevents jitter) */
	const MIN_DRAG_DISTANCE = 2;

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

	/** Selected elements from store */
	let selectedElements = $derived(whiteboardStore.selectedElements);

	/** Shape tools */
	const SHAPE_TOOLS = [
		'line',
		'rectangle',
		'circle',
		'arrow',
		'pentagon',
		'hexagon',
		'star'
	] as const;
	let isShapeTool = $derived(
		SHAPE_TOOLS.includes(toolState.toolType as (typeof SHAPE_TOOLS)[number])
	);

	/** Drawing tools */
	const DRAWING_TOOLS = ['pen', 'marker', 'highlighter', 'eraser'] as const;
	let isDrawingTool = $derived(
		DRAWING_TOOLS.includes(toolState.toolType as (typeof DRAWING_TOOLS)[number])
	);

	/** Text tool */
	let isTextTool = $derived(toolState.toolType === 'text');

	/** Select tool active */
	let isSelectTool = $derived(toolState.toolType === 'select');

	/** ViewBox for SVG */
	let viewBox = $derived(`0 0 ${pageWidth} ${pageHeight}`);

	/** Marquee selection rectangle (normalized to always have positive width/height) */
	let marqueeRect = $derived.by(() => {
		if (!marqueeStart || !marqueeEnd) return null;
		const x = Math.min(marqueeStart.x, marqueeEnd.x);
		const y = Math.min(marqueeStart.y, marqueeEnd.y);
		const width = Math.abs(marqueeEnd.x - marqueeStart.x);
		const height = Math.abs(marqueeEnd.y - marqueeStart.y);
		return { x, y, width, height };
	});

	/** Current stroke style */
	let currentStrokeStyle = $derived({
		color: toolState.color,
		width: toolState.strokeWidth,
		opacity: toolState.opacity
	});

	// ==========================================================================
	// Pointer Event Handlers
	// ==========================================================================

	/**
	 * Sync toolbar to show element's color/strokeWidth/opacity (temporary display)
	 * Called from event handler when selecting an element (UI event → handler → update state)
	 * Uses syncToolbarFromElement which doesn't save to user preferences
	 */
	function syncToolbarWithElement(elementId: string): void {
		const element = elements.find((el) => el.id === elementId);
		if (!element) return;

		if (element.type === 'stroke') {
			whiteboardStore.syncToolbarFromElement({
				color: element.color,
				strokeWidth: element.width,
				opacity: element.opacity,
				strokeStyle: element.strokeStyle
			});
		} else if (element.type === 'shape') {
			whiteboardStore.syncToolbarFromElement({
				color: element.color,
				strokeWidth: element.strokeWidth,
				opacity: element.opacity,
				strokeStyle: element.strokeStyle,
				cornerRadius: element.cornerRadius
			});
		}
	}

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
	 * Constrain end point to create a 1:1 aspect ratio (square/circle)
	 * Used when Shift is held during rectangle/circle drawing
	 */
	function constrainToSquare(start: Point, end: Point): Point {
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const size = Math.max(Math.abs(dx), Math.abs(dy));
		return {
			x: start.x + size * Math.sign(dx || 1),
			y: start.y + size * Math.sign(dy || 1)
		};
	}

	/**
	 * Handle context menu (right-click) - show z-order menu
	 * If clicking on an element, select it first, then show menu
	 */
	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();

		// Get point in canvas coordinates
		const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * pageWidth;
		const y = ((e.clientY - rect.top) / rect.height) * pageHeight;
		const point = { x, y };

		// Hit test to find element under cursor
		const result = hitTestElements(point, elements);

		if (result) {
			// If element is not already selected, select it
			if (!whiteboardStore.selectedIds.has(result.elementId)) {
				whiteboardStore.clearSelection();
				whiteboardStore.selectElement(result.elementId);
			}
			// Show context menu
			contextMenuRef?.show(e.clientX, e.clientY);
		} else if (whiteboardStore.hasSelection || whiteboardStore.hasClipboard) {
			// If clicking empty space but there's a selection or clipboard content, show menu
			contextMenuRef?.show(e.clientX, e.clientY);
		}
	}

	/**
	 * Handle pointer down - start drawing
	 */
	function handlePointerDown(e: PointerEvent) {
		// Hide context menu on any click
		contextMenuRef?.hide();

		// Only handle primary button (left click / touch)
		if (e.button !== 0) return;

		const point = getPointFromEvent(e);

		// Handle select tool - click to select elements with immediate drag support
		if (isSelectTool) {
			e.preventDefault();
			const result = hitTestElements(point, elements);

			if (result) {
				// Element found - handle selection
				if (e.shiftKey) {
					// Toggle selection (add if not selected, remove if selected)
					const isAlreadySelected = selectedElements.some((el) => el.id === result.elementId);
					if (isAlreadySelected) {
						whiteboardStore.deselectElement(result.elementId);
						// Don't start drag when deselecting
						return;
					} else {
						whiteboardStore.selectElement(result.elementId, true);
						// Sync toolbar with newly added element
						syncToolbarWithElement(result.elementId);
					}
				} else {
					// Replace selection (or keep if already selected)
					if (!selectedElements.some((el) => el.id === result.elementId)) {
						whiteboardStore.clearSelection();
						whiteboardStore.selectElement(result.elementId);
					}
					// Sync toolbar with selected element (new or existing)
					syncToolbarWithElement(result.elementId);
				}

				// Start drag tracking - element is now selected
				isSelectionDragging = true;
				selectionDragStartX = e.clientX;
				selectionDragStartY = e.clientY;
				(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
			} else {
				// Click in empty space - start marquee selection
				isMarqueeSelecting = true;
				marqueeStart = point;
				marqueeEnd = point;
				marqueeAddToSelection = e.shiftKey;
				marqueeIntersectionMode = e.altKey; // Alt = intersection mode
				if (!e.shiftKey) {
					whiteboardStore.clearSelection();
				}
				(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
			}
			return;
		}

		// Handle text tool - create new text block
		if (isTextTool) {
			e.preventDefault();
			// Clear selection when creating new text
			whiteboardStore.clearSelection();
			textBlockLayerRef?.createBlockAtPosition(point.x, point.y);
			return;
		}

		// Handle shape tools
		if (isShapeTool) {
			e.preventDefault();
			(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);

			// Clear selection when starting to draw
			whiteboardStore.clearSelection();

			isDrawing = true;
			shapeStartPoint = point;
			shapeEndPoint = point;
			return;
		}

		// Handle drawing tools (pen, marker, highlighter, eraser)
		if (isDrawingTool) {
			e.preventDefault();
			(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);

			// Clear selection when starting to draw
			whiteboardStore.clearSelection();

			isDrawing = true;
			currentPoints = [point];

			// Update active stroke preview
			updateActiveStroke();
		}
	}

	/**
	 * Handle pointer move - add points to stroke or track hover
	 */
	function handlePointerMove(e: PointerEvent) {
		const point = getPointFromEvent(e);

		// Handle marquee selection (drag on empty space)
		if (isMarqueeSelecting) {
			e.preventDefault();
			marqueeEnd = point;
			return;
		}

		// Handle selection dragging (immediate drag on click)
		if (isSelectionDragging) {
			e.preventDefault(); // Prevent browser defaults during drag

			const dx = (e.clientX - selectionDragStartX) / scale;
			const dy = (e.clientY - selectionDragStartY) / scale;

			// Only move if distance exceeds threshold (prevents jitter from mouse micro-movements)
			if (
				Number.isFinite(dx) &&
				Number.isFinite(dy) &&
				(Math.abs(dx) >= MIN_DRAG_DISTANCE || Math.abs(dy) >= MIN_DRAG_DISTANCE)
			) {
				selectionDragStartX = e.clientX;
				selectionDragStartY = e.clientY;
				whiteboardStore.moveElements(dx, dy);
			}
			return;
		}

		// Track hover for select tool (when not drawing or dragging)
		if (isSelectTool && !isDrawing) {
			const result = hitTestElements(point, elements);
			hoveredElementId = result?.elementId ?? null;
			return;
		}

		if (!isDrawing) return;

		e.preventDefault();

		// Handle shape tools
		if (isShapeTool) {
			// Regular polygons (pentagon, hexagon, star) always use 1:1 ratio
			const alwaysRegular = ['pentagon', 'hexagon', 'star'].includes(toolState.toolType);
			// Rectangle/circle use 1:1 ratio only when Shift is held
			const shiftConstrained =
				e.shiftKey && (toolState.toolType === 'rectangle' || toolState.toolType === 'circle');

			if (shapeStartPoint && (alwaysRegular || shiftConstrained)) {
				shapeEndPoint = constrainToSquare(shapeStartPoint, point);
			} else {
				shapeEndPoint = point;
			}
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
	 * Handle pointer up - finalize stroke or end selection drag
	 */
	function handlePointerUp(e: PointerEvent) {
		// End marquee selection and select elements in the rectangle
		if (isMarqueeSelecting) {
			if (
				marqueeRect &&
				marqueeRect.width > MIN_DRAG_DISTANCE &&
				marqueeRect.height > MIN_DRAG_DISTANCE
			) {
				// Alt key = intersection mode, otherwise containment mode
				const elementsInRect = marqueeIntersectionMode
					? getElementsIntersectingRect(marqueeRect as BoundingBox, elements)
					: getElementsInRect(marqueeRect as BoundingBox, elements);
				const ids = elementsInRect.map((el) => el.id);
				whiteboardStore.selectMultipleElements(ids, marqueeAddToSelection);
			}
			isMarqueeSelecting = false;
			marqueeStart = null;
			marqueeEnd = null;
			marqueeAddToSelection = false;
			marqueeIntersectionMode = false;
			try {
				(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
			} catch {
				// Ignore - capture may already be released or not set
			}
			return;
		}

		// End selection dragging
		if (isSelectionDragging) {
			isSelectionDragging = false;
			selectionDragStartX = 0;
			selectionDragStartY = 0;
			try {
				(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
			} catch {
				// Ignore - capture may already be released or not set
			}
			return;
		}

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
	 * Handle pointer cancel - abort stroke or selection drag
	 */
	function handlePointerCancel(e: PointerEvent) {
		// Cancel marquee selection
		if (isMarqueeSelecting) {
			isMarqueeSelecting = false;
			marqueeStart = null;
			marqueeEnd = null;
			marqueeAddToSelection = false;
			marqueeIntersectionMode = false;
			try {
				(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
			} catch {
				// Ignore - capture may already be released or not set
			}
			return;
		}

		// Cancel selection dragging
		if (isSelectionDragging) {
			isSelectionDragging = false;
			selectionDragStartX = 0;
			selectionDragStartY = 0;
			try {
				(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
			} catch {
				// Ignore - capture may already be released or not set
			}
			return;
		}

		if (!isDrawing) return;

		(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);

		// Abort current drawing
		isDrawing = false;
		currentPoints = [];
		activeStrokePath = '';
		shapeStartPoint = null;
		shapeEndPoint = null;
	}

	/**
	 * Handle pointer leave - clear hover state and abort any drawing or drag
	 */
	function handlePointerLeave(e: PointerEvent) {
		// Clear hover state
		hoveredElementId = null;

		// Cancel marquee selection
		if (isMarqueeSelecting) {
			isMarqueeSelecting = false;
			marqueeStart = null;
			marqueeEnd = null;
			marqueeAddToSelection = false;
			marqueeIntersectionMode = false;
			try {
				(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
			} catch {
				// Ignore - capture may already be released or not set
			}
		}

		// Cancel selection dragging
		if (isSelectionDragging) {
			isSelectionDragging = false;
			selectionDragStartX = 0;
			selectionDragStartY = 0;
			try {
				(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
			} catch {
				// Ignore - capture may already be released or not set
			}
		}

		// Also handle cancel if drawing
		if (isDrawing) {
			(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);

			isDrawing = false;
			currentPoints = [];
			activeStrokePath = '';
			shapeStartPoint = null;
			shapeEndPoint = null;
		}
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
			toolState.toolType as 'pen' | 'marker' | 'highlighter' | 'eraser',
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
			toolType: toolState.toolType as 'pen' | 'marker' | 'highlighter',
			points: currentPoints,
			color: toolState.color,
			width: toolState.strokeWidth,
			opacity: toolState.opacity,
			strokeStyle: toolState.strokeStyle
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
			strokeWidth: toolState.strokeWidth,
			opacity: toolState.opacity,
			strokeStyle: toolState.strokeStyle,
			fillMode: toolState.fillMode,
			fill: toolState.fillColor,
			fillOpacity: toolState.fillOpacity,
			cornerRadius: toolState.cornerRadius
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
	 * Get SVG path for a stroke element (filled outline with variable width)
	 */
	function getStrokePath(stroke: StrokeElement): string {
		const options = getToolOptions(stroke.toolType, stroke.width, stroke.color, stroke.opacity);
		const outlinePoints = smoothStroke(stroke.points as Point[], options);
		return pointsToSvgPath(outlinePoints);
	}

	/**
	 * Get simple SVG path for a stroke (centerline only, for dashed/dotted styles)
	 */
	function getSimpleStrokePath(points: readonly Point[]): string {
		if (points.length === 0) return '';
		if (points.length === 1) {
			// Single point - draw a small circle
			return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y}`;
		}
		const [first, ...rest] = points;
		return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
	}
</script>

<div class="whiteboard-canvas-container relative overflow-hidden bg-gray-100 {className}">
	<svg
		class="whiteboard-svg"
		class:cursor-default={isSelectTool &&
			!hoveredElementId &&
			!isSelectionDragging &&
			!isMarqueeSelecting}
		class:cursor-pointer={isSelectTool &&
			hoveredElementId &&
			!isSelectionDragging &&
			!isMarqueeSelecting}
		class:cursor-grabbing={isSelectionDragging}
		class:cursor-crosshair={!isSelectTool || isMarqueeSelecting}
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
		onpointerleave={handlePointerLeave}
		oncontextmenu={handleContextMenu}
	>
		<!-- Layer 1: Background -->
		<g class="layer-background">
			{#if currentPage?.background.type === 'plain'}
				{@const gridSpacing = currentPage.background.gridSpacing ?? 20}
				{@const gridOpacity = currentPage.background.gridOpacity ?? 0.3}
				<rect
					x="0"
					y="0"
					width={pageWidth}
					height={pageHeight}
					fill={currentPage.background.color}
				/>
				{#if currentPage.background.style === 'grid'}
					<defs>
						<pattern
							id="grid-pattern"
							width={gridSpacing}
							height={gridSpacing}
							patternUnits="userSpaceOnUse"
						>
							<path
								d="M {gridSpacing} 0 L 0 0 0 {gridSpacing}"
								fill="none"
								stroke="#000000"
								stroke-width="0.5"
								opacity={gridOpacity}
							/>
						</pattern>
					</defs>
					<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="url(#grid-pattern)" />
				{:else if currentPage.background.style === 'ruled'}
					<defs>
						<pattern
							id="ruled-pattern"
							width={pageWidth}
							height={gridSpacing}
							patternUnits="userSpaceOnUse"
						>
							<line
								x1="0"
								y1={gridSpacing}
								x2={pageWidth}
								y2={gridSpacing}
								stroke="#000000"
								stroke-width="0.5"
								opacity={gridOpacity}
							/>
						</pattern>
					</defs>
					<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="url(#ruled-pattern)" />
				{:else if currentPage.background.style === 'dotted'}
					<defs>
						<pattern
							id="dotted-pattern"
							width={gridSpacing}
							height={gridSpacing}
							patternUnits="userSpaceOnUse"
						>
							<circle
								cx={gridSpacing / 2}
								cy={gridSpacing / 2}
								r="1"
								fill="#000000"
								opacity={gridOpacity}
							/>
						</pattern>
					</defs>
					<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="url(#dotted-pattern)" />
				{:else if currentPage.background.style === 'triangular'}
					{@const triHeight = gridSpacing * 0.866}
					<defs>
						<pattern
							id="triangular-pattern"
							width={gridSpacing}
							height={triHeight * 2}
							patternUnits="userSpaceOnUse"
						>
							<!-- Isometric grid: 2 triangles = 1 rhombus -->
							<!-- Upper triangle (pointing up) -->
							<path
								d="M 0 {triHeight} L {gridSpacing / 2} 0 L {gridSpacing} {triHeight} Z"
								fill="none"
								stroke="#000000"
								stroke-width="0.5"
								opacity={gridOpacity}
							/>
							<!-- Lower triangle (pointing down) -->
							<path
								d="M 0 {triHeight} L {gridSpacing / 2} {triHeight *
									2} L {gridSpacing} {triHeight} Z"
								fill="none"
								stroke="#000000"
								stroke-width="0.5"
								opacity={gridOpacity}
							/>
						</pattern>
					</defs>
					<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="url(#triangular-pattern)" />
				{:else if currentPage.background.style === 'triangular-dotted'}
					{@const triHeight = gridSpacing * 0.866}
					<defs>
						<pattern
							id="triangular-dotted-pattern"
							width={gridSpacing}
							height={triHeight * 2}
							patternUnits="userSpaceOnUse"
						>
							<!-- Dots at all triangle vertices -->
							<!-- Top vertex -->
							<circle cx={gridSpacing / 2} cy="0" r="1.5" fill="#000000" opacity={gridOpacity} />
							<!-- Middle left vertex -->
							<circle cx="0" cy={triHeight} r="1.5" fill="#000000" opacity={gridOpacity} />
							<!-- Middle right vertex -->
							<circle
								cx={gridSpacing}
								cy={triHeight}
								r="1.5"
								fill="#000000"
								opacity={gridOpacity}
							/>
							<!-- Bottom vertex -->
							<circle
								cx={gridSpacing / 2}
								cy={triHeight * 2}
								r="1.5"
								fill="#000000"
								opacity={gridOpacity}
							/>
						</pattern>
					</defs>
					<rect
						x="0"
						y="0"
						width={pageWidth}
						height={pageHeight}
						fill="url(#triangular-dotted-pattern)"
					/>
				{:else if currentPage.background.style === 'hexagonal'}
					{@const s = gridSpacing / 2}
					{@const h = s * 0.866}
					<defs>
						<pattern
							id="hexagonal-pattern"
							width={s * 3}
							height={h * 2}
							patternUnits="userSpaceOnUse"
						>
							<!-- Honeycomb pattern: flat-top hexagons -->
							<!-- First hexagon (top-left) -->
							<path
								d="M {s * 0.5} 0 L {s * 1.5} 0 L {s * 2} {h} L {s * 1.5} {h * 2} L {s * 0.5} {h *
									2} L 0 {h} Z"
								fill="none"
								stroke="#000000"
								stroke-width="0.5"
								opacity={gridOpacity}
							/>
							<!-- Second hexagon (offset right and down) -->
							<path
								d="M {s * 2} {h} L {s * 3} {h} L {s * 3.5} {h * 2} L {s * 3} {h * 3} L {s * 2} {h *
									3} L {s * 1.5} {h * 2}"
								fill="none"
								stroke="#000000"
								stroke-width="0.5"
								opacity={gridOpacity}
							/>
						</pattern>
					</defs>
					<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="url(#hexagonal-pattern)" />
				{:else if currentPage.background.style === 'hexagonal-dotted'}
					{@const s = gridSpacing / 2}
					{@const h = s * 0.866}
					<defs>
						<pattern
							id="hexagonal-dotted-pattern"
							width={s * 3}
							height={h * 2}
							patternUnits="userSpaceOnUse"
						>
							<!-- Dots at hexagon vertices (honeycomb pattern) -->
							<!-- First hexagon vertices -->
							<circle cx={s * 0.5} cy="0" r="1.5" fill="#000000" opacity={gridOpacity} />
							<circle cx={s * 1.5} cy="0" r="1.5" fill="#000000" opacity={gridOpacity} />
							<circle cx={s * 2} cy={h} r="1.5" fill="#000000" opacity={gridOpacity} />
							<circle cx={s * 1.5} cy={h * 2} r="1.5" fill="#000000" opacity={gridOpacity} />
							<circle cx={s * 0.5} cy={h * 2} r="1.5" fill="#000000" opacity={gridOpacity} />
							<circle cx="0" cy={h} r="1.5" fill="#000000" opacity={gridOpacity} />
							<!-- Second hexagon additional vertices -->
							<circle cx={s * 3} cy={h} r="1.5" fill="#000000" opacity={gridOpacity} />
						</pattern>
					</defs>
					<rect
						x="0"
						y="0"
						width={pageWidth}
						height={pageHeight}
						fill="url(#hexagonal-dotted-pattern)"
					/>
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

		<!-- Arrow marker and hatched pattern definitions -->
		<defs>
			{#each shapeElements.filter((s) => s.shapeType === 'arrow') as arrow (arrow.id)}
				<marker
					id="arrow-marker-{arrow.id}"
					viewBox="0 0 10 10"
					refX="9"
					refY="5"
					markerWidth="6"
					markerHeight="6"
					orient="auto-start-reverse"
				>
					<path d="M 0 0 L 10 5 L 0 10 z" fill={arrow.color} />
				</marker>
			{/each}
			<!-- Preview arrow marker -->
			<marker
				id="arrow-marker-preview"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M 0 0 L 10 5 L 0 10 z" fill={toolState.color} />
			</marker>
			<!-- Hatched patterns for shapes with fillMode='hatched' -->
			{#each shapeElements.filter((s) => s.fillMode === 'hatched') as shape (shape.id)}
				<pattern
					id="hatch-{shape.id}"
					patternUnits="userSpaceOnUse"
					width="8"
					height="8"
					patternTransform="rotate(45)"
				>
					<line x1="0" y1="0" x2="0" y2="8" stroke={shape.fill ?? shape.color} stroke-width="2" />
				</pattern>
			{/each}
			<!-- Preview hatched pattern -->
			{#if toolState.fillMode === 'hatched'}
				<pattern
					id="hatch-preview"
					patternUnits="userSpaceOnUse"
					width="8"
					height="8"
					patternTransform="rotate(45)"
				>
					<line x1="0" y1="0" x2="0" y2="8" stroke={toolState.fillColor} stroke-width="2" />
				</pattern>
			{/if}
		</defs>

		<!-- Layer 2: Content (existing strokes and shapes) -->
		<g class="layer-content">
			<!-- Strokes -->
			{#each strokeElements as stroke (stroke.id)}
				{@const strokeRotation = stroke.rotation ?? 0}
				{@const strokeBounds = getElementBounds(stroke)}
				{@const strokeCenter = getBoundsCenter(strokeBounds)}
				{@const strokeStyle = stroke.strokeStyle ?? 'solid'}
				{@const isDashedStroke = strokeStyle !== 'solid'}
				<g
					transform={strokeRotation !== 0
						? `rotate(${strokeRotation}, ${strokeCenter.x}, ${strokeCenter.y})`
						: undefined}
				>
					{#if isDashedStroke}
						<!-- Dashed/dotted stroke: use simple path with stroke -->
						<path
							d={getSimpleStrokePath(stroke.points)}
							fill="none"
							stroke={stroke.color}
							stroke-width={stroke.width}
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-dasharray={getStrokeDashArray(strokeStyle, stroke.width)}
							opacity={stroke.opacity}
						/>
					{:else}
						<!-- Solid stroke: use filled outline for variable width -->
						<path
							d={getStrokePath(stroke)}
							fill={stroke.color}
							fill-opacity={stroke.opacity}
							stroke="none"
						/>
					{/if}
				</g>
			{/each}

			<!-- Shapes -->
			{#each shapeElements as shape (shape.id)}
				{@const props = getShapeSvgProps(
					shape.shapeType,
					shape.start,
					shape.end,
					shape.cornerRadius ?? 0
				)}
				{@const dashArray = getStrokeDashArray(shape.strokeStyle ?? 'solid', shape.strokeWidth)}
				{@const shapeRotation = shape.rotation ?? 0}
				{@const shapeBounds = getElementBounds(shape)}
				{@const shapeCenter = getBoundsCenter(shapeBounds)}
				{@const shapeFill =
					shape.fillMode === 'none' || !shape.fillMode
						? 'none'
						: shape.fillMode === 'hatched'
							? `url(#hatch-${shape.id})`
							: (shape.fill ?? 'none')}
				<g
					transform={shapeRotation !== 0
						? `rotate(${shapeRotation}, ${shapeCenter.x}, ${shapeCenter.y})`
						: undefined}
				>
					{#if props.type === 'line'}
						<line
							x1={props.x1}
							y1={props.y1}
							x2={props.x2}
							y2={props.y2}
							stroke={shape.color}
							stroke-width={shape.strokeWidth}
							stroke-linecap="round"
							stroke-dasharray={dashArray}
							opacity={shape.opacity}
							marker-end={props.hasArrowMarker ? `url(#arrow-marker-${shape.id})` : undefined}
						/>
					{:else if props.type === 'rect'}
						<rect
							x={props.x}
							y={props.y}
							width={props.width}
							height={props.height}
							rx={props.cornerRadius}
							ry={props.cornerRadius}
							stroke={shape.color}
							stroke-width={shape.strokeWidth}
							stroke-dasharray={dashArray}
							stroke-opacity={shape.opacity}
							fill={shapeFill}
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
							stroke-dasharray={dashArray}
							stroke-opacity={shape.opacity}
							fill={shapeFill}
							fill-opacity={shape.fillOpacity ?? 1}
						/>
					{:else if props.type === 'polygon'}
						<polygon
							points={props.points}
							stroke={shape.color}
							stroke-width={shape.strokeWidth}
							stroke-linejoin="round"
							stroke-dasharray={dashArray}
							stroke-opacity={shape.opacity}
							fill={shapeFill}
							fill-opacity={shape.fillOpacity ?? 1}
						/>
					{:else if props.type === 'path'}
						<path
							d={props.d}
							stroke={shape.color}
							stroke-width={shape.strokeWidth}
							stroke-linejoin="round"
							stroke-dasharray={dashArray}
							stroke-opacity={shape.opacity}
							fill={shapeFill}
							fill-opacity={shape.fillOpacity ?? 1}
						/>
					{/if}
				</g>
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

			<!-- Active shape preview -->
			{#if isDrawing && isShapeTool && shapeStartPoint && shapeEndPoint}
				{@const previewProps = getShapeSvgProps(
					toolState.toolType as ShapeType,
					shapeStartPoint,
					shapeEndPoint,
					toolState.cornerRadius
				)}
				{@const previewDashArray = getStrokeDashArray(toolState.strokeStyle, toolState.strokeWidth)}
				{@const previewFill =
					toolState.fillMode === 'none' || !toolState.fillMode
						? 'none'
						: toolState.fillMode === 'hatched'
							? 'url(#hatch-preview)'
							: toolState.fillColor}
				{#if previewProps.type === 'line'}
					<line
						x1={previewProps.x1}
						y1={previewProps.y1}
						x2={previewProps.x2}
						y2={previewProps.y2}
						stroke={toolState.color}
						stroke-width={toolState.strokeWidth}
						stroke-dasharray={previewDashArray}
						stroke-linecap="round"
						opacity={toolState.opacity}
						marker-end={previewProps.hasArrowMarker ? 'url(#arrow-marker-preview)' : undefined}
					/>
				{:else if previewProps.type === 'rect'}
					<rect
						x={previewProps.x}
						y={previewProps.y}
						width={previewProps.width}
						height={previewProps.height}
						rx={previewProps.cornerRadius}
						ry={previewProps.cornerRadius}
						stroke={toolState.color}
						stroke-width={toolState.strokeWidth}
						stroke-dasharray={previewDashArray}
						stroke-opacity={toolState.opacity}
						fill={previewFill}
						fill-opacity={toolState.fillOpacity}
					/>
				{:else if previewProps.type === 'ellipse'}
					<ellipse
						cx={previewProps.cx}
						cy={previewProps.cy}
						rx={previewProps.rx}
						ry={previewProps.ry}
						stroke={toolState.color}
						stroke-width={toolState.strokeWidth}
						stroke-dasharray={previewDashArray}
						stroke-opacity={toolState.opacity}
						fill={previewFill}
						fill-opacity={toolState.fillOpacity}
					/>
				{:else if previewProps.type === 'polygon'}
					<polygon
						points={previewProps.points}
						stroke={toolState.color}
						stroke-width={toolState.strokeWidth}
						stroke-linejoin="round"
						stroke-dasharray={previewDashArray}
						stroke-opacity={toolState.opacity}
						fill={previewFill}
						fill-opacity={toolState.fillOpacity}
					/>
				{:else if previewProps.type === 'path'}
					<path
						d={previewProps.d}
						stroke={toolState.color}
						stroke-width={toolState.strokeWidth}
						stroke-linejoin="round"
						stroke-dasharray={previewDashArray}
						stroke-opacity={toolState.opacity}
						fill={previewFill}
						fill-opacity={toolState.fillOpacity}
					/>
				{/if}
			{/if}
		</g>

		<!-- Layer 4: Instruments (ruler, protractor, etc.) -->
		<g class="layer-instruments">
			<InstrumentLayer {scale} />
		</g>

		<!-- Layer 5: Selection (handles, resize controls) -->
		<g class="layer-selection">
			<SelectionLayer
				{selectedElements}
				{scale}
				{hoveredElementId}
				onResize={(elementId, handle, dx, dy, constrainAspectRatio) =>
					whiteboardStore.resizeElement(elementId, handle, dx, dy, constrainAspectRatio)}
				onRotate={(elementId, rotation) => whiteboardStore.rotateElement(elementId, rotation)}
			/>
		</g>

		<!-- Layer 6: Marquee Selection Rectangle -->
		<!-- Blue = containment mode (default), Orange = intersection mode (Alt) -->
		{#if isMarqueeSelecting && marqueeRect}
			<rect
				x={marqueeRect.x}
				y={marqueeRect.y}
				width={marqueeRect.width}
				height={marqueeRect.height}
				fill={marqueeIntersectionMode ? 'rgba(234, 88, 12, 0.1)' : 'rgba(59, 130, 246, 0.1)'}
				stroke={marqueeIntersectionMode ? '#ea580c' : '#3b82f6'}
				stroke-width={1 / scale}
				stroke-dasharray={`${4 / scale} ${4 / scale}`}
				class="pointer-events-none"
			/>
		{/if}
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
	}

	.whiteboard-svg.cursor-default {
		cursor: default;
	}

	.whiteboard-svg.cursor-pointer {
		cursor: pointer;
	}

	.whiteboard-svg.cursor-crosshair {
		cursor: crosshair;
	}

	.whiteboard-svg.cursor-grabbing {
		cursor: grabbing;
	}
</style>
