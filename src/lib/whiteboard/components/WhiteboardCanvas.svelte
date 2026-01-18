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
		createArrowWithBindings,
		findBindingCandidate,
		createBindingAnchor,
		calculateBoundEndpoint
	} from '../core/binding';
	import {
		renderRoughShape,
		buildElbowPathWithRoundedCorners,
		ELBOW_ARROW_CORNER_RADIUS
	} from '../core/rough-renderer';
	import {
		hitTestElements,
		getElementsInRect,
		getElementsIntersectingRect,
		getElementBounds,
		getBoundsCenter,
		type BoundingBox
	} from '../core/hit-testing';
	import { calculateCurvedPath } from '../core/curved-path';
	import { routeElbowArrow } from '../core/elbow-routing';
	import { headingFromPoints, getHeadingForBindingPoint, flipHeading } from '../core/heading';
	import InstrumentLayer from './InstrumentLayer.svelte';
	import TextBlockLayer from './TextBlockLayer.svelte';
	import ShapeLabelLayer from './ShapeLabelLayer.svelte';
	import ImageLayer from './ImageLayer.svelte';
	import SelectionLayer from './SelectionLayer.svelte';
	import type ContextMenu from './ContextMenu.svelte';
	import {
		getStrokeDashArray,
		type Point,
		type StrokeElement,
		type ShapeElement,
		type ArrowElement,
		type ShapeType,
		type ImageElement,
		type GroupElement,
		type WhiteboardElement
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

	/** Reference to the main SVG element (for roughjs rendering) */
	let svgRef: SVGSVGElement | null = $state(null);

	/** Reference to the group for roughjs-rendered shapes */
	let roughShapesGroup: SVGGElement | null = $state(null);

	/** Shape drawing state */
	let shapeStartPoint: Point | null = $state(null);
	let shapeEndPoint: Point | null = $state(null);

	/** Binding candidate IDs during arrow drawing (for visual feedback) */
	let bindingCandidateIds = $state<Set<string>>(new Set());

	/** Snap points during arrow drawing (shows exact connection points) */
	let snapPoints = $state<{ point: Point; end: 'start' | 'end' }[]>([]);

	/** Binding candidate shapes for arrow preview routing */
	let bindingStartShape = $state<ShapeElement | null>(null);
	let bindingEndShape = $state<ShapeElement | null>(null);

	/** TextBlockLayer reference */
	let textBlockLayerRef: TextBlockLayer | null = $state(null);

	/** ShapeLabelLayer reference */
	let shapeLabelLayerRef: ShapeLabelLayer | null = $state(null);

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

	/** Multi-point drawing state (for curved arrows - click to add points) */
	let isMultiPointDrawing = $state(false);
	let multiPointPoints = $state<Point[]>([]);
	let multiPointCurrentPos = $state<Point | null>(null);

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

	/** All strokes use perfect-freehand rendering (like Excalidraw) */
	let allStrokes = $derived(strokeElements);

	/** Only shape elements for rendering (all shapes use roughjs) */
	let shapeElements = $derived(elements.filter((el): el is ShapeElement => el.type === 'shape'));

	/** Only image elements for rendering */
	let imageElements = $derived(elements.filter((el): el is ImageElement => el.type === 'image'));

	/** Only group elements for rendering */
	let groupElements = $derived(elements.filter((el): el is GroupElement => el.type === 'group'));

	/** Cached bounds for groups (only recalculates when group structure changes, not on rotation) */
	let groupBoundsCache = $derived.by(() => {
		const cache = new Map<
			string,
			{ bounds: ReturnType<typeof getElementBounds>; center: ReturnType<typeof getBoundsCenter> }
		>();
		for (const group of groupElements) {
			const bounds = getElementBounds(group);
			const center = getBoundsCenter(bounds);
			cache.set(group.id, { bounds, center });
		}
		return cache;
	});

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

	/** Curved arrow tool active (uses multi-point click mode) */
	let isCurvedArrowTool = $derived(
		toolState.toolType === 'arrow' && toolState.arrowType === 'curved'
	);

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
	// Roughjs Rendering Effects
	// ==========================================================================

	/**
	 * Render ALL shapes using roughjs
	 * Uses $effect to imperatively manage SVG nodes generated by roughjs
	 * Handles all live states: positions, rotations, resizes, endpoints, elbow points
	 */
	$effect(() => {
		if (!roughShapesGroup || !svgRef) return;

		// Clear previous content
		roughShapesGroup.innerHTML = '';

		// Render each shape with roughjs
		for (const shape of shapeElements) {
			const isArrowShape = shape.shapeType === 'arrow';
			const isLineOrArrow = shape.shapeType === 'line' || shape.shapeType === 'arrow';
			const arrowShape = isArrowShape ? (shape as ArrowElement) : null;

			// Get live states
			const liveRot = whiteboardStore.liveRotations.get(shape.id);
			const livePos = whiteboardStore.livePositions.get(shape.id);
			const liveResize = whiteboardStore.liveResizes.get(shape.id);
			const liveEndpoint = isLineOrArrow ? whiteboardStore.liveEndpoints.get(shape.id) : null;
			const liveElbowPts = whiteboardStore.liveElbowPoints.get(shape.id);

			// For arrows, check if bound shapes are being dragged
			const startBindingLivePos = arrowShape?.startBinding
				? whiteboardStore.livePositions.get(arrowShape.startBinding.elementId)
				: null;
			const endBindingLivePos = arrowShape?.endBinding
				? whiteboardStore.livePositions.get(arrowShape.endBinding.elementId)
				: null;

			// Calculate effective start/end points considering all live states
			let effectiveStart = shape.start;
			let effectiveEnd = shape.end;

			if (liveEndpoint?.endpoint === 'start') {
				effectiveStart = { x: liveEndpoint.x, y: liveEndpoint.y };
			} else if (startBindingLivePos) {
				effectiveStart = {
					x: shape.start.x + startBindingLivePos.dx,
					y: shape.start.y + startBindingLivePos.dy
				};
			}

			if (liveEndpoint?.endpoint === 'end') {
				effectiveEnd = { x: liveEndpoint.x, y: liveEndpoint.y };
			} else if (endBindingLivePos) {
				effectiveEnd = {
					x: shape.end.x + endBindingLivePos.dx,
					y: shape.end.y + endBindingLivePos.dy
				};
			}

			// Determine if this is an elbow arrow (check both new arrowType and legacy elbowed flag)
			const effectiveArrowType = arrowShape
				? (arrowShape.arrowType ?? (arrowShape.elbowed ? 'elbow' : 'sharp'))
				: null;
			const isElbowArrow = effectiveArrowType === 'elbow';

			// Create a modified shape for rendering if live states exist
			let shapeToRender: ShapeElement = shape;
			if (
				effectiveStart !== shape.start ||
				effectiveEnd !== shape.end ||
				(liveElbowPts && isElbowArrow)
			) {
				// Clone the shape with adjusted points
				shapeToRender = {
					...shape,
					start: effectiveStart,
					end: effectiveEnd
				};

				// For elbow arrows ONLY, inject liveElbowPoints as points[]
				if (liveElbowPts && isElbowArrow) {
					shapeToRender = {
						...shapeToRender,
						points: liveElbowPts as Point[]
					} as ArrowElement;
				}
			}

			const { element } = renderRoughShape(svgRef, shapeToRender);

			// Build transforms
			const transforms: string[] = [];
			const shapeRotation = liveRot ?? shape.rotation ?? 0;

			// Apply live position offset
			if (livePos) {
				transforms.push(`translate(${livePos.dx}, ${livePos.dy})`);
			}

			// Apply live resize
			if (liveResize) {
				transforms.push(
					`translate(${liveResize.originX}, ${liveResize.originY}) ` +
						`scale(${liveResize.scaleX}, ${liveResize.scaleY}) ` +
						`translate(${-liveResize.originX}, ${-liveResize.originY})`
				);
			}

			// Apply rotation
			if (shapeRotation !== 0) {
				const cx = (effectiveStart.x + effectiveEnd.x) / 2;
				const cy = (effectiveStart.y + effectiveEnd.y) / 2;
				transforms.push(`rotate(${shapeRotation}, ${cx}, ${cy})`);
			}

			if (transforms.length > 0) {
				element.setAttribute('transform', transforms.join(' '));
			}

			roughShapesGroup.appendChild(element);
		}
	});

	/**
	 * Cancel multi-point drawing when tool changes
	 */
	$effect(() => {
		// Track tool type to detect changes
		const currentTool = toolState.toolType;
		const currentArrowType = toolState.arrowType;

		// If we're in multi-point mode but no longer using curved arrow tool, cancel
		if (isMultiPointDrawing && !(currentTool === 'arrow' && currentArrowType === 'curved')) {
			resetMultiPointState();
		}
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

		// Helper to find first stroke or shape in a group (recursive)
		function findFirstStylableChild(el: WhiteboardElement): StrokeElement | ShapeElement | null {
			if (el.type === 'stroke') return el;
			if (el.type === 'shape') return el;
			if (el.type === 'group') {
				for (const child of el.children) {
					const found = findFirstStylableChild(child);
					if (found) return found;
				}
			}
			return null;
		}

		let targetElement: WhiteboardElement | null = element;

		// For groups, find the first stroke or shape child
		if (element.type === 'group') {
			targetElement = findFirstStylableChild(element);
		}

		if (!targetElement) return;

		if (targetElement.type === 'stroke') {
			whiteboardStore.syncToolbarFromElement({
				color: targetElement.color,
				strokeWidth: targetElement.width,
				opacity: targetElement.opacity,
				strokeStyle: targetElement.strokeStyle
			});
		} else if (targetElement.type === 'shape') {
			whiteboardStore.syncToolbarFromElement({
				color: targetElement.color,
				strokeWidth: targetElement.strokeWidth,
				opacity: targetElement.opacity,
				strokeStyle: targetElement.strokeStyle,
				cornerRadius: targetElement.cornerRadius
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
		const result = hitTestElements(point, elements, undefined, whiteboardStore.liveElbowPoints);

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
			const result = hitTestElements(point, elements, undefined, whiteboardStore.liveElbowPoints);

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

		// Handle text tool - edit shape label OR create new text block
		if (isTextTool) {
			e.preventDefault();

			// Check if clicking on a shape - if so, edit its label
			const hitResult = hitTestElements(
				point,
				elements,
				undefined,
				whiteboardStore.liveElbowPoints
			);
			if (hitResult && hitResult.elementType === 'shape') {
				whiteboardStore.clearSelection();
				shapeLabelLayerRef?.startEditingShape(hitResult.elementId);
				return;
			}

			// Otherwise create new text block
			whiteboardStore.clearSelection();
			textBlockLayerRef?.createBlockAtPosition(point.x, point.y);
			return;
		}

		// Handle curved arrow tool (multi-point click mode)
		if (isCurvedArrowTool) {
			e.preventDefault();

			if (!isMultiPointDrawing) {
				// First click - start multi-point mode
				whiteboardStore.clearSelection();
				isMultiPointDrawing = true;
				multiPointPoints = [point];
				multiPointCurrentPos = point;
			} else {
				// Subsequent click - add point
				multiPointPoints = [...multiPointPoints, point];
			}
			return;
		}

		// Handle shape tools (non-curved arrows use drag mode)
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

			// Calculate total offset from drag start (not incremental)
			const dx = (e.clientX - selectionDragStartX) / scale;
			const dy = (e.clientY - selectionDragStartY) / scale;

			// Apply live position to all selected elements
			if (Number.isFinite(dx) && Number.isFinite(dy)) {
				const selectedIds = selectedElements.map((el) => el.id);
				whiteboardStore.setLivePositionBatch(selectedIds, dx, dy);
			}
			return;
		}

		// Track hover for select tool (when not drawing or dragging)
		if (isSelectTool && !isDrawing) {
			const result = hitTestElements(point, elements, undefined, whiteboardStore.liveElbowPoints);
			hoveredElementId = result?.elementId ?? null;
			return;
		}

		// Track binding candidates for arrow tool on hover (before drawing starts)
		if (toolState.toolType === 'arrow' && !isDrawing && !isMultiPointDrawing) {
			const excludeIds = new Set<string>();
			const candidate = findBindingCandidate(point, elements, excludeIds);
			if (candidate) {
				bindingCandidateIds = new Set([candidate.element.id]);
				snapPoints = [{ point: candidate.perimeterPoint, end: 'end' }];
			} else {
				bindingCandidateIds = new Set();
				snapPoints = [];
			}
			return;
		}

		// Update current position for multi-point drawing preview
		if (isMultiPointDrawing) {
			multiPointCurrentPos = point;

			// Track binding candidates for end point
			const excludeIds = new Set<string>();
			const candidate = findBindingCandidate(point, elements, excludeIds);
			if (candidate) {
				bindingCandidateIds = new Set([candidate.element.id]);
				snapPoints = [{ point: candidate.perimeterPoint, end: 'end' }];
			} else {
				bindingCandidateIds = new Set();
				snapPoints = [];
			}
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

			// Detect binding candidates for arrow tool (visual feedback + preview routing)
			if (toolState.toolType === 'arrow' && shapeStartPoint) {
				const excludeIds = new Set<string>();
				const candidates = new Set<string>();
				const newSnapPoints: { point: Point; end: 'start' | 'end' }[] = [];

				// Check start point
				const startCandidate = findBindingCandidate(shapeStartPoint, elements, excludeIds);
				if (startCandidate) {
					candidates.add(startCandidate.element.id);
					newSnapPoints.push({ point: startCandidate.perimeterPoint, end: 'start' });
					bindingStartShape = startCandidate.element;
				} else {
					bindingStartShape = null;
				}

				// Check end point
				const endPoint = shapeEndPoint ?? point;
				const endCandidate = findBindingCandidate(endPoint, elements, excludeIds);
				if (endCandidate) {
					candidates.add(endCandidate.element.id);
					newSnapPoints.push({ point: endCandidate.perimeterPoint, end: 'end' });
					bindingEndShape = endCandidate.element;
				} else {
					bindingEndShape = null;
				}

				bindingCandidateIds = candidates;
				snapPoints = newSnapPoints;
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
			// Commit live positions to actual element positions
			const selectedIds = selectedElements.map((el) => el.id);
			if (selectedIds.length > 0) {
				whiteboardStore.commitLivePositionBatch(selectedIds);
			}

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
			// Clear live positions without committing (cancel)
			whiteboardStore.clearAllLivePositions();

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

	/**
	 * Handle double-click - finalize multi-point arrow
	 */
	function handleDoubleClick(e: MouseEvent) {
		if (isMultiPointDrawing) {
			e.preventDefault();
			// Don't add point - the two clicks of double-click already added points via pointerdown
			// Remove duplicate last point (second click of double-click added same point)
			if (multiPointPoints.length >= 2) {
				const last = multiPointPoints[multiPointPoints.length - 1];
				const secondLast = multiPointPoints[multiPointPoints.length - 2];
				// If last two points are very close (same click position), remove the duplicate
				const dist = Math.sqrt((last.x - secondLast.x) ** 2 + (last.y - secondLast.y) ** 2);
				if (dist < 5) {
					multiPointPoints = multiPointPoints.slice(0, -1);
				}
			}
			finalizeMultiPointArrow();
		}
	}

	/**
	 * Handle keyboard events - Enter to finalize, Escape to cancel
	 */
	function handleKeyDown(e: KeyboardEvent) {
		if (!isMultiPointDrawing) return;

		if (e.key === 'Enter') {
			e.preventDefault();
			// Finalize with current mouse position as last point
			if (multiPointCurrentPos && multiPointPoints.length >= 1) {
				multiPointPoints = [...multiPointPoints, multiPointCurrentPos];
			}
			finalizeMultiPointArrow();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelMultiPointDrawing();
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

		// All shapes use roughjs with roughness setting
		const roughSeed = Math.floor(Math.random() * 2147483647);
		const roughness = toolState.roughness;

		// Create and add the shape element
		if (currentTool === 'arrow') {
			// For arrows, use binding-aware creation
			const { arrow } = createArrowWithBindings(start, end, elements, {
				color: toolState.color,
				strokeWidth: toolState.strokeWidth,
				opacity: toolState.opacity,
				strokeStyle: toolState.strokeStyle,
				arrowType: toolState.arrowType,
				elbowed: toolState.elbowed,
				elbowDirection: toolState.elbowDirection,
				startArrowhead: toolState.startArrowhead,
				endArrowhead: toolState.endArrowhead
			});
			// Add roughjs properties
			const arrowWithRough = { ...arrow, roughSeed, roughness };
			whiteboardStore.addElement(arrowWithRough);
		} else {
			// For other shapes, use standard creation
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
			// Add roughjs properties
			const shapeWithRough = { ...shape, roughSeed, roughness };
			whiteboardStore.addElement(shapeWithRough);
		}
		resetShapeState();
	}

	/**
	 * Reset shape drawing state
	 */
	function resetShapeState() {
		isDrawing = false;
		shapeStartPoint = null;
		shapeEndPoint = null;
		bindingCandidateIds = new Set();
		snapPoints = [];
		bindingStartShape = null;
		bindingEndShape = null;
	}

	/**
	 * Finalize multi-point curved arrow
	 */
	function finalizeMultiPointArrow() {
		// Need at least 2 points (start and end)
		if (multiPointPoints.length < 2) {
			resetMultiPointState();
			return;
		}

		const points = multiPointPoints;
		const start = points[0];
		const end = points[points.length - 1];

		// Check minimum length
		const dx = Math.abs(end.x - start.x);
		const dy = Math.abs(end.y - start.y);
		if (dx < 5 && dy < 5) {
			resetMultiPointState();
			return;
		}

		// Build waypoints from intermediate points
		const waypoints = points.slice(1, -1).map((p) => ({
			id: crypto.randomUUID(),
			position: p
		}));

		// All shapes use roughjs with roughness setting
		const roughSeed = Math.floor(Math.random() * 2147483647);
		const roughness = toolState.roughness;

		// Create arrow with bindings
		const { arrow } = createArrowWithBindings(start, end, elements, {
			color: toolState.color,
			strokeWidth: toolState.strokeWidth,
			opacity: toolState.opacity,
			strokeStyle: toolState.strokeStyle,
			arrowType: 'curved',
			waypoints,
			startArrowhead: toolState.startArrowhead,
			endArrowhead: toolState.endArrowhead
		});

		// Add roughjs properties
		const arrowWithRough = { ...arrow, roughSeed, roughness };
		whiteboardStore.addElement(arrowWithRough);

		resetMultiPointState();
	}

	/**
	 * Cancel multi-point drawing
	 */
	function cancelMultiPointDrawing() {
		resetMultiPointState();
	}

	/**
	 * Reset multi-point drawing state
	 */
	function resetMultiPointState() {
		isMultiPointDrawing = false;
		multiPointPoints = [];
		multiPointCurrentPos = null;
		bindingCandidateIds = new Set();
		snapPoints = [];
		bindingStartShape = null;
		bindingEndShape = null;
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

	// ==========================================================================
	// Public API
	// ==========================================================================

	/**
	 * Start editing a shape's label
	 * Called from parent Whiteboard when user starts typing with a shape selected
	 * @param shapeId - The shape to edit
	 * @param initialChar - Optional initial character to prepend (from keyboard shortcut)
	 */
	export function startEditingShapeLabel(shapeId: string, initialChar?: string): void {
		shapeLabelLayerRef?.startEditingShape(shapeId, initialChar);
	}

	/**
	 * Check if shape label is being edited
	 */
	export function isEditingShapeLabel(): boolean {
		return shapeLabelLayerRef?.isEditing() ?? false;
	}
</script>

<!-- Snippet to render group children recursively -->
{#snippet renderGroupChildren(children: WhiteboardElement[])}
	{#each children as child (child.id)}
		{#if child.type === 'stroke'}
			{@const strokeRotation = child.rotation ?? 0}
			{@const strokeBounds = getElementBounds(child)}
			{@const strokeCenter = getBoundsCenter(strokeBounds)}
			{@const strokeStyle = child.strokeStyle ?? 'solid'}
			{@const isDashedStroke = strokeStyle !== 'solid'}
			<g
				transform={strokeRotation !== 0
					? `rotate(${strokeRotation}, ${strokeCenter.x}, ${strokeCenter.y})`
					: undefined}
			>
				{#if isDashedStroke}
					<path
						d={getSimpleStrokePath(child.points)}
						fill="none"
						stroke={child.color}
						stroke-width={child.width}
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-dasharray={getStrokeDashArray(strokeStyle, child.width)}
						opacity={child.opacity}
					/>
				{:else}
					<path
						d={getStrokePath(child)}
						fill={child.color}
						fill-opacity={child.opacity}
						stroke="none"
					/>
				{/if}
			</g>
		{:else if child.type === 'shape'}
			{@const props = getShapeSvgProps(
				child.shapeType,
				child.start,
				child.end,
				child.cornerRadius ?? 0
			)}
			{@const dashArray = getStrokeDashArray(child.strokeStyle ?? 'solid', child.strokeWidth)}
			{@const shapeRotation = child.rotation ?? 0}
			{@const shapeBounds = getElementBounds(child)}
			{@const shapeCenter = getBoundsCenter(shapeBounds)}
			{@const shapeFill =
				child.fillMode === 'none' || !child.fillMode
					? 'none'
					: child.fillMode === 'hatched'
						? `url(#hatch-${child.id})`
						: (child.fill ?? 'none')}
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
						stroke={child.color}
						stroke-width={child.strokeWidth}
						stroke-linecap="round"
						stroke-dasharray={dashArray}
						opacity={child.opacity}
						marker-end={props.hasArrowMarker ? `url(#arrow-marker-${child.id})` : undefined}
					/>
				{:else if props.type === 'rect'}
					<rect
						x={props.x}
						y={props.y}
						width={props.width}
						height={props.height}
						rx={props.cornerRadius}
						ry={props.cornerRadius}
						stroke={child.color}
						stroke-width={child.strokeWidth}
						stroke-dasharray={dashArray}
						stroke-opacity={child.opacity}
						fill={shapeFill}
						fill-opacity={child.fillOpacity ?? 1}
					/>
				{:else if props.type === 'ellipse'}
					<ellipse
						cx={props.cx}
						cy={props.cy}
						rx={props.rx}
						ry={props.ry}
						stroke={child.color}
						stroke-width={child.strokeWidth}
						stroke-dasharray={dashArray}
						stroke-opacity={child.opacity}
						fill={shapeFill}
						fill-opacity={child.fillOpacity ?? 1}
					/>
				{:else if props.type === 'polygon'}
					<polygon
						points={props.points}
						stroke={child.color}
						stroke-width={child.strokeWidth}
						stroke-linejoin="round"
						stroke-dasharray={dashArray}
						stroke-opacity={child.opacity}
						fill={shapeFill}
						fill-opacity={child.fillOpacity ?? 1}
					/>
				{:else if props.type === 'path'}
					<path
						d={props.d}
						stroke={child.color}
						stroke-width={child.strokeWidth}
						stroke-linejoin="round"
						stroke-dasharray={dashArray}
						stroke-opacity={child.opacity}
						fill={shapeFill}
						fill-opacity={child.fillOpacity ?? 1}
					/>
				{/if}
			</g>
		{:else if child.type === 'group'}
			<!-- Nested group -->
			{@const nestedGroup = child as GroupElement}
			{@const nestedRotation = nestedGroup.rotation ?? 0}
			{@const nestedBounds = getElementBounds(nestedGroup)}
			{@const nestedCenter = getBoundsCenter(nestedBounds)}
			<g
				class="whiteboard-group"
				data-group-id={child.id}
				data-rotation={nestedRotation}
				transform={`rotate(${nestedRotation} ${nestedCenter.x} ${nestedCenter.y})`}
			>
				{@render renderGroupChildren(nestedGroup.children)}
			</g>
		{/if}
	{/each}
{/snippet}

<div class="whiteboard-canvas-container relative overflow-hidden bg-gray-100 {className}">
	<svg
		bind:this={svgRef}
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
		ondblclick={handleDoubleClick}
		tabindex="0"
		onkeydown={handleKeyDown}
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
			<!-- All strokes use perfect-freehand rendering (like Excalidraw) -->
			{#each allStrokes as stroke (stroke.id)}
				{@const liveRot = whiteboardStore.liveRotations.get(stroke.id)}
				{@const strokeRotation = liveRot ?? stroke.rotation ?? 0}
				{@const liveResize = whiteboardStore.liveResizes.get(stroke.id)}
				{@const livePos = whiteboardStore.livePositions.get(stroke.id)}
				{@const strokeBounds = getElementBounds(stroke)}
				{@const strokeCenter = getBoundsCenter(strokeBounds)}
				{@const strokeStyle = stroke.strokeStyle ?? 'solid'}
				{@const isDashedStroke = strokeStyle !== 'solid'}
				{@const translateTransform = livePos ? `translate(${livePos.dx}, ${livePos.dy})` : ''}
				{@const rotateTransform =
					strokeRotation !== 0
						? `rotate(${strokeRotation}, ${strokeCenter.x}, ${strokeCenter.y})`
						: ''}
				{@const scaleTransform = liveResize
					? `translate(${liveResize.originX}, ${liveResize.originY}) scale(${liveResize.scaleX}, ${liveResize.scaleY}) translate(${-liveResize.originX}, ${-liveResize.originY})`
					: ''}
				<g
					transform={`${translateTransform} ${scaleTransform} ${rotateTransform}`.trim() ||
						undefined}
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

			<!-- Binding candidate highlights (during arrow drawing) -->
			{#if bindingCandidateIds.size > 0}
				{#each shapeElements.filter((s) => bindingCandidateIds.has(s.id)) as shape (shape.id)}
					{@const props = getShapeSvgProps(
						shape.shapeType,
						shape.start,
						shape.end,
						shape.cornerRadius ?? 0
					)}
					{@const shapeBounds = getElementBounds(shape)}
					{@const shapeCenter = getBoundsCenter(shapeBounds)}
					{@const shapeRotation = shape.rotation ?? 0}
					{@const rotateTransform =
						shapeRotation !== 0
							? `rotate(${shapeRotation}, ${shapeCenter.x}, ${shapeCenter.y})`
							: ''}
					<g transform={rotateTransform || undefined} class="binding-highlight">
						{#if props.type === 'rect'}
							<rect
								x={props.x - 4}
								y={props.y - 4}
								width={props.width + 8}
								height={props.height + 8}
								rx={(props.cornerRadius ?? 0) + 4}
								ry={(props.cornerRadius ?? 0) + 4}
								stroke="#3b82f6"
								stroke-width="3"
								stroke-dasharray="6 4"
								fill="none"
								opacity="0.8"
							/>
						{:else if props.type === 'ellipse'}
							<ellipse
								cx={props.cx}
								cy={props.cy}
								rx={props.rx + 4}
								ry={props.ry + 4}
								stroke="#3b82f6"
								stroke-width="3"
								stroke-dasharray="6 4"
								fill="none"
								opacity="0.8"
							/>
						{:else if props.type === 'polygon'}
							<!-- For polygons, draw the same polygon with offset stroke -->
							<polygon
								points={props.points}
								stroke="#3b82f6"
								stroke-width="6"
								stroke-linejoin="round"
								stroke-dasharray="6 4"
								fill="none"
								opacity="0.8"
							/>
						{:else if props.type === 'path'}
							<path
								d={props.d}
								stroke="#3b82f6"
								stroke-width="6"
								stroke-linejoin="round"
								stroke-dasharray="6 4"
								fill="none"
								opacity="0.8"
							/>
						{/if}
					</g>
				{/each}
			{/if}

			<!-- Snap point indicators (during arrow drawing) -->
			{#if snapPoints.length > 0}
				{#each snapPoints as snap (snap.end)}
					<g class="snap-point-indicator">
						<!-- Outer ring -->
						<circle
							cx={snap.point.x}
							cy={snap.point.y}
							r="8"
							fill="none"
							stroke="#3b82f6"
							stroke-width="2"
							opacity="0.9"
						/>
						<!-- Inner filled circle -->
						<circle
							cx={snap.point.x}
							cy={snap.point.y}
							r="4"
							fill="#3b82f6"
							stroke="white"
							stroke-width="1.5"
							opacity="0.9"
						/>
					</g>
				{/each}
			{/if}

			<!-- All shapes rendered with roughjs via $effect -->
			<g class="rough-shapes" bind:this={roughShapesGroup}></g>

			<!-- Groups -->
			{#each groupElements as group (group.id)}
				{@const cached = groupBoundsCache.get(group.id)}
				{@const groupCenter = cached?.center ?? { x: 0, y: 0 }}
				{@const liveRot = whiteboardStore.liveRotations.get(group.id)}
				{@const groupRotation = liveRot ?? group.rotation ?? 0}
				{@const liveResize = whiteboardStore.liveResizes.get(group.id)}
				{@const livePos = whiteboardStore.livePositions.get(group.id)}
				{@const translateTransform = livePos ? `translate(${livePos.dx}, ${livePos.dy})` : ''}
				{@const rotateTransform =
					groupRotation !== 0 ? `rotate(${groupRotation} ${groupCenter.x} ${groupCenter.y})` : ''}
				{@const scaleTransform = liveResize
					? `translate(${liveResize.originX}, ${liveResize.originY}) scale(${liveResize.scaleX}, ${liveResize.scaleY}) translate(${-liveResize.originX}, ${-liveResize.originY})`
					: ''}
				<g
					class="whiteboard-group"
					data-group-id={group.id}
					transform={`${translateTransform} ${scaleTransform} ${rotateTransform}`.trim() ||
						undefined}
				>
					{@render renderGroupChildren(group.children)}
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
					{@const effectivePreviewArrowType =
						toolState.arrowType ?? (toolState.elbowed ? 'elbow' : 'sharp')}
					{#if toolState.toolType === 'arrow' && effectivePreviewArrowType === 'curved'}
						{@const previewCurvedResult = calculateCurvedPath(shapeStartPoint, shapeEndPoint, [])}
						<path
							d={previewCurvedResult.path}
							stroke={toolState.color}
							stroke-width={toolState.strokeWidth}
							stroke-dasharray={previewDashArray}
							stroke-linecap="round"
							stroke-linejoin="round"
							fill="none"
							opacity={toolState.opacity}
							marker-end={previewProps.hasArrowMarker ? 'url(#arrow-marker-preview)' : undefined}
						/>
					{:else if toolState.toolType === 'arrow' && effectivePreviewArrowType === 'elbow'}
						{@const previewStartHeading = bindingStartShape
							? getHeadingForBindingPoint(bindingStartShape, shapeStartPoint)
							: headingFromPoints(shapeStartPoint, shapeEndPoint)}
						{@const previewEndHeading = bindingEndShape
							? flipHeading(getHeadingForBindingPoint(bindingEndShape, shapeEndPoint))
							: headingFromPoints(shapeEndPoint, shapeStartPoint)}
						{@const previewElbowResult = routeElbowArrow(
							shapeStartPoint,
							shapeEndPoint,
							previewStartHeading,
							previewEndHeading,
							bindingStartShape,
							bindingEndShape
						)}
						{@const previewElbowPath = buildElbowPathWithRoundedCorners(
							previewElbowResult.points,
							toolState.cornerRadius ?? ELBOW_ARROW_CORNER_RADIUS
						)}
						<path
							d={previewElbowPath}
							stroke={toolState.color}
							stroke-width={toolState.strokeWidth}
							stroke-dasharray={previewDashArray}
							stroke-linecap="round"
							stroke-linejoin="round"
							fill="none"
							opacity={toolState.opacity}
							marker-end={previewProps.hasArrowMarker ? 'url(#arrow-marker-preview)' : undefined}
						/>
					{:else}
						<!-- Sharp arrow or line -->
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
					{/if}
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

			<!-- Multi-point curved arrow preview -->
			{#if isMultiPointDrawing && multiPointPoints.length >= 1 && multiPointCurrentPos}
				{@const previewPoints = [...multiPointPoints, multiPointCurrentPos]}
				{@const start = previewPoints[0]}
				{@const end = previewPoints[previewPoints.length - 1]}
				{@const waypoints = previewPoints.slice(1, -1).map((p, i) => ({
					id: `preview-wp-${i}`,
					position: p
				}))}
				{@const curvedResult = calculateCurvedPath(start, end, waypoints)}
				{@const previewDashArray = getStrokeDashArray(toolState.strokeStyle, toolState.strokeWidth)}

				<!-- The curved path -->
				<path
					d={curvedResult.path}
					stroke={toolState.color}
					stroke-width={toolState.strokeWidth}
					stroke-dasharray={previewDashArray}
					stroke-linecap="round"
					stroke-linejoin="round"
					fill="none"
					opacity={toolState.opacity}
					marker-end="url(#arrow-marker-preview)"
				/>

				<!-- Point markers (show clickable points) -->
				{#each multiPointPoints as point, i (i)}
					<circle
						cx={point.x}
						cy={point.y}
						r={4 / scale}
						fill={i === 0 ? '#3b82f6' : 'white'}
						stroke="#3b82f6"
						stroke-width={1.5 / scale}
					/>
				{/each}

				<!-- Current mouse position indicator -->
				<circle
					cx={multiPointCurrentPos.x}
					cy={multiPointCurrentPos.y}
					r={4 / scale}
					fill="white"
					stroke="#3b82f6"
					stroke-width={1.5 / scale}
					stroke-dasharray={`${2 / scale} ${2 / scale}`}
				/>

				<!-- Instructions hint -->
				<text
					x={multiPointCurrentPos.x + 10 / scale}
					y={multiPointCurrentPos.y - 10 / scale}
					font-size={12 / scale}
					fill="#3b82f6"
					opacity="0.8"
					style="pointer-events: none; user-select: none;"
				>
					Clic pour ajouter · Double-clic ou Entrée pour terminer
				</text>
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
				onResizeLive={(elementId, scaleX, scaleY, originX, originY) =>
					whiteboardStore.setLiveResize(elementId, scaleX, scaleY, originX, originY)}
				onResizeEnd={(elementId, handle, totalDx, totalDy, constrainAspectRatio) =>
					whiteboardStore.commitLiveResize(
						elementId,
						handle,
						totalDx,
						totalDy,
						constrainAspectRatio
					)}
				onRotate={(elementId, rotation) => whiteboardStore.setLiveRotation(elementId, rotation)}
				onRotateEnd={(elementId) => whiteboardStore.commitLiveRotation(elementId)}
				onEndpointDrag={(elementId, endpoint, x, y) => {
					whiteboardStore.setLiveEndpoint(elementId, endpoint, x, y);
					// Show binding candidate feedback during endpoint drag
					const excludeIds = new Set([elementId]);
					const candidate = findBindingCandidate({ x, y }, elements, excludeIds);
					if (candidate) {
						bindingCandidateIds = new Set([candidate.element.id]);
						// Calculate the snapped position with gap (matching what setLiveEndpoint does)
						const element = elements.find((e) => e.id === elementId);
						if (element && element.type === 'shape') {
							const shape = element as ShapeElement;
							const otherEndpoint = endpoint === 'start' ? shape.end : shape.start;
							const binding = createBindingAnchor(candidate.element, { x, y }, otherEndpoint);
							const snappedPos = calculateBoundEndpoint(binding, candidate.element, otherEndpoint);
							snapPoints = [{ point: snappedPos, end: endpoint }];
						} else {
							snapPoints = [{ point: candidate.perimeterPoint, end: endpoint }];
						}
					} else {
						bindingCandidateIds = new Set();
						snapPoints = [];
					}
				}}
				onEndpointDragEnd={(elementId, endpoint, x, y) => {
					whiteboardStore.commitLiveEndpoint(elementId, endpoint, x, y);
					// Clear binding candidate feedback
					bindingCandidateIds = new Set();
					snapPoints = [];
				}}
				onWaypointDrag={(arrowId, waypointId, x, y) =>
					whiteboardStore.setLiveWaypointPosition(arrowId, waypointId, { x, y })}
				onWaypointDragEnd={(arrowId, _waypointId, _x, _y) =>
					whiteboardStore.commitLiveWaypoints(arrowId)}
				onAddWaypoint={(arrowId, position, segmentIndex) =>
					whiteboardStore.addWaypointToArrow(arrowId, position, segmentIndex)}
				onRemoveWaypoint={(arrowId, waypointId) =>
					whiteboardStore.removeWaypointFromArrow(arrowId, waypointId)}
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

	<!-- Shape Labels Layer (HTML overlay on SVG) -->
	<ShapeLabelLayer bind:this={shapeLabelLayerRef} {scale} />
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
