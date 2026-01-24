<script lang="ts">
	/**
	 * AnnotationLayer - SVG overlay for annotations
	 *
	 * Renders annotations (strokes, shapes, stamps) on top of all whiteboard content,
	 * including HTML overlays like TextBlockLayer and ShapeLabelLayer.
	 *
	 * This layer has the highest z-index to allow drawing over everything.
	 *
	 * ## Architecture Note: Selection UI
	 *
	 * The selection handles (resize/rotate) are implemented inline here rather than
	 * reusing SelectionLayer.svelte. This is because:
	 *
	 * 1. **Different data types**: SelectionLayer expects `WhiteboardElement[]` with
	 *    specific callbacks (liveResize, liveRotation, livePositions, etc.) that are
	 *    tightly coupled to the whiteboard element system.
	 *
	 * 2. **Different coordinate systems**: AnnotationLayer is a separate SVG overlay
	 *    with its own coordinate space.
	 *
	 * 3. **Simpler requirements**: Annotations only need basic resize/rotate, not the
	 *    advanced features of SelectionLayer (endpoint handles, waypoints, etc.).
	 *
	 * The selection UI follows the same visual patterns as SelectionLayer (same colors,
	 * handle sizes, cursors) and reuses utility functions from `core/hit-testing.ts`
	 * (calculateAngleFromCenter, normalizeAngle) to avoid code duplication.
	 *
	 * @module whiteboard/components/AnnotationLayer
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
	import {
		smoothStroke,
		pointsToSvgPath,
		doStrokesIntersect,
		getBoundingBox
	} from '../core/stroke-smoothing';
	// Reuse rotation utilities from hit-testing (same as SelectionLayer)
	import { calculateAngleFromCenter, normalizeAngle } from '../core/hit-testing';

	/** Resize handle position - matches SelectionLayer.HandlePosition */
	type HandlePosition = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

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

	/** Is currently dragging selection */
	let isDragging = $state(false);

	/** Drag start position */
	let dragStart = $state<Point | null>(null);

	/** Shape drawing start point */
	let shapeStart = $state<Point | null>(null);

	/** Shape drawing current end point */
	let shapeEnd = $state<Point | null>(null);

	/** SVG element reference for coordinate transformation */
	let svgElement: SVGSVGElement | null = $state(null);

	// ==========================================================================
	// Resize/Rotate State
	// ==========================================================================

	/** Original annotation being resized (to calculate from original coords) */
	let resizeOriginalAnnotation = $state<AnnotationElement | null>(null);

	/** Resize start bounding box */
	let resizeStartBBox = $state<{ x: number; y: number; width: number; height: number } | null>(
		null
	);

	/** Current resize handle being dragged */
	let activeResizeHandle = $state<HandlePosition | null>(null);

	/** Is currently resizing */
	let isResizing = $state(false);

	/** Is currently rotating */
	let isRotating = $state(false);

	/** Initial rotation of selected annotation for rotation */
	let initialRotation = $state<number>(0);

	/** Initial mouse angle for rotation */
	let initialMouseAngle = $state<number>(0);

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

	/** Selected annotation IDs */
	let selectedIds = $derived(whiteboardStore.selectedAnnotationIds);

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

	/** Selection bounding box for SelectionBox component */
	let selectionBounds = $derived.by(() => {
		if (selectedIds.size === 0) return null;

		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;

		for (const annotation of annotations) {
			if (!selectedIds.has(annotation.id)) continue;

			const bbox = getAnnotationBBox(annotation);
			minX = Math.min(minX, bbox.minX);
			minY = Math.min(minY, bbox.minY);
			maxX = Math.max(maxX, bbox.maxX);
			maxY = Math.max(maxY, bbox.maxY);
		}

		if (minX === Infinity) return null;
		return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
	});

	/** Get current rotation of selected annotation */
	let selectedAnnotationRotation = $derived.by(() => {
		if (selectedIds.size !== 1) return 0;
		const selectedId = Array.from(selectedIds)[0];
		const annotation = annotations.find((a) => a.id === selectedId);
		if (!annotation) return 0;
		if (annotation.type === 'shape' || annotation.type === 'stamp') {
			return annotation.rotation ?? 0;
		}
		return 0;
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

	function getAnnotationBBox(annotation: AnnotationElement): {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	} {
		if (annotation.type === 'stroke') {
			const bbox = getBoundingBox([...annotation.points], annotation.width);
			return bbox;
		} else if (annotation.type === 'shape') {
			const padding = annotation.strokeWidth / 2;
			return {
				minX: Math.min(annotation.start.x, annotation.end.x) - padding,
				minY: Math.min(annotation.start.y, annotation.end.y) - padding,
				maxX: Math.max(annotation.start.x, annotation.end.x) + padding,
				maxY: Math.max(annotation.start.y, annotation.end.y) + padding
			};
		} else if (annotation.type === 'stamp') {
			const half = annotation.size / 2;
			return {
				minX: annotation.position.x - half,
				minY: annotation.position.y - half,
				maxX: annotation.position.x + half,
				maxY: annotation.position.y + half
			};
		}
		return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
	}

	function hitTestAnnotation(point: Point, annotation: AnnotationElement): boolean {
		const bbox = getAnnotationBBox(annotation);
		const hitPadding = 5;

		// Quick bounding box check
		if (
			point.x < bbox.minX - hitPadding ||
			point.x > bbox.maxX + hitPadding ||
			point.y < bbox.minY - hitPadding ||
			point.y > bbox.maxY + hitPadding
		) {
			return false;
		}

		// For strokes, do more precise hit testing
		if (annotation.type === 'stroke') {
			const hitPoints = [point];
			return doStrokesIntersect(
				hitPoints,
				[...annotation.points],
				hitPadding * 2,
				annotation.width
			);
		}

		// For shapes and stamps, bounding box is enough
		return true;
	}

	function findAnnotationAtPoint(point: Point): AnnotationElement | null {
		// Search in reverse order (top-most first)
		for (let i = annotations.length - 1; i >= 0; i--) {
			if (hitTestAnnotation(point, annotations[i])) {
				return annotations[i];
			}
		}
		return null;
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

		if (currentTool === 'annotation-select') {
			// Selection tool: check for hit on existing annotation
			const hitAnnotation = findAnnotationAtPoint(point);

			if (hitAnnotation) {
				const isShift = e.shiftKey;
				if (selectedIds.has(hitAnnotation.id)) {
					// Already selected - start dragging
					isDragging = true;
					dragStart = point;
				} else {
					// Select this annotation
					whiteboardStore.selectAnnotation(hitAnnotation.id, isShift);
					isDragging = true;
					dragStart = point;
				}
			} else {
				// Clicked on empty space - clear selection
				whiteboardStore.clearAnnotationSelection();
			}
		} else if (currentTool === 'annotation-eraser') {
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
		if (!isAnnotationMode) return;

		// Handle resize
		if (isResizing && activeResizeHandle) {
			handleResizeMove(activeResizeHandle, e);
			return;
		}

		// Handle rotate
		if (isRotating) {
			handleRotateMove(e);
			return;
		}

		const point = getPointerPosition(e);

		if (isDragging && dragStart) {
			e.preventDefault();
			const dx = point.x - dragStart.x;
			const dy = point.y - dragStart.y;

			if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
				whiteboardStore.moveSelectedAnnotations(dx, dy);
				dragStart = point;
			}
			return;
		}

		if (!isDrawing) return;

		e.preventDefault();

		if (currentTool === 'annotation-eraser') {
			handleEraserPoint(point);
		} else if (isStrokeTool(currentTool)) {
			activePoints = [...activePoints, point];
		} else if (isShapeTool(currentTool)) {
			shapeEnd = point;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isAnnotationMode) return;

		e.preventDefault();

		// Handle resize end
		if (isResizing) {
			handleResizeEnd();
			return;
		}

		// Handle rotate end
		if (isRotating) {
			handleRotateEnd();
			return;
		}

		if (isDragging) {
			isDragging = false;
			dragStart = null;
			try {
				(e.target as Element)?.releasePointerCapture?.(e.pointerId);
			} catch {
				// Ignore
			}
			return;
		}

		if (!isDrawing) return;

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
		isDragging = false;
		dragStart = null;
		isResizing = false;
		activeResizeHandle = null;
		resizeOriginalAnnotation = null;
		resizeStartBBox = null;
		isRotating = false;
		initialRotation = 0;
		initialMouseAngle = 0;

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

	// ==========================================================================
	// Resize/Rotate Handlers
	// ==========================================================================

	function handleResizeStart(handle: HandlePosition, e: PointerEvent) {
		if (selectedIds.size !== 1 || !selectionBounds) return;

		e.preventDefault();
		e.stopPropagation();

		const selectedId = Array.from(selectedIds)[0];
		const annotation = annotations.find((a) => a.id === selectedId);
		if (!annotation) return;

		isResizing = true;
		activeResizeHandle = handle;
		resizeOriginalAnnotation = annotation;
		resizeStartBBox = { ...selectionBounds };

		(e.target as Element)?.setPointerCapture?.(e.pointerId);
	}

	function handleResizeMove(handle: HandlePosition, e: PointerEvent) {
		if (!resizeOriginalAnnotation || !resizeStartBBox) return;

		e.preventDefault();
		const point = getPointerPosition(e);

		// Calculate new bounding box based on handle being dragged
		let newMinX = resizeStartBBox.x;
		let newMinY = resizeStartBBox.y;
		let newMaxX = resizeStartBBox.x + resizeStartBBox.width;
		let newMaxY = resizeStartBBox.y + resizeStartBBox.height;

		if (handle.includes('w')) newMinX = Math.min(point.x, newMaxX - 10);
		if (handle.includes('e')) newMaxX = Math.max(point.x, newMinX + 10);
		if (handle.includes('n')) newMinY = Math.min(point.y, newMaxY - 10);
		if (handle.includes('s')) newMaxY = Math.max(point.y, newMinY + 10);

		const originalBBox = {
			minX: resizeStartBBox.x,
			minY: resizeStartBBox.y,
			maxX: resizeStartBBox.x + resizeStartBBox.width,
			maxY: resizeStartBBox.y + resizeStartBBox.height
		};

		const newBBox = { minX: newMinX, minY: newMinY, maxX: newMaxX, maxY: newMaxY };

		// Build original values from stored annotation
		const originalValues: { start?: Point; end?: Point; position?: Point; size?: number } = {};

		if (resizeOriginalAnnotation.type === 'shape') {
			originalValues.start = resizeOriginalAnnotation.start;
			originalValues.end = resizeOriginalAnnotation.end;
		} else if (resizeOriginalAnnotation.type === 'stamp') {
			originalValues.position = resizeOriginalAnnotation.position;
			originalValues.size = resizeOriginalAnnotation.size;
		}

		whiteboardStore.resizeAnnotation(
			resizeOriginalAnnotation.id,
			originalBBox,
			newBBox,
			originalValues
		);
	}

	function handleResizeEnd() {
		isResizing = false;
		activeResizeHandle = null;
		resizeOriginalAnnotation = null;
		resizeStartBBox = null;
	}

	function handleRotateStart(e: PointerEvent) {
		if (selectedIds.size !== 1 || !selectionBounds) return;

		e.preventDefault();
		e.stopPropagation();

		const selectedId = Array.from(selectedIds)[0];
		const annotation = annotations.find((a) => a.id === selectedId);
		if (!annotation) return;

		const center = {
			x: selectionBounds.x + selectionBounds.width / 2,
			y: selectionBounds.y + selectionBounds.height / 2
		};
		const point = getPointerPosition(e);

		isRotating = true;
		initialMouseAngle = calculateAngleFromCenter(center, point);
		initialRotation =
			annotation.type === 'shape' || annotation.type === 'stamp' ? (annotation.rotation ?? 0) : 0;

		(e.target as Element)?.setPointerCapture?.(e.pointerId);
	}

	function handleRotateMove(e: PointerEvent) {
		if (!isRotating || selectedIds.size !== 1 || !selectionBounds) return;

		e.preventDefault();
		const point = getPointerPosition(e);
		const center = {
			x: selectionBounds.x + selectionBounds.width / 2,
			y: selectionBounds.y + selectionBounds.height / 2
		};

		const currentAngle = calculateAngleFromCenter(center, point);
		const deltaAngle = currentAngle - initialMouseAngle;
		const newRotation = normalizeAngle(initialRotation + deltaAngle);

		const selectedId = Array.from(selectedIds)[0];
		whiteboardStore.rotateAnnotation(selectedId, newRotation);
	}

	function handleRotateEnd() {
		isRotating = false;
		initialRotation = 0;
		initialMouseAngle = 0;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!isAnnotationMode) return;

		// Delete selected annotations
		if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
			e.preventDefault();
			whiteboardStore.deleteSelectedAnnotations();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if annotationsVisible}
	<svg
		bind:this={svgElement}
		class="annotation-layer {className}"
		class:annotation-mode={isAnnotationMode}
		class:select-mode={currentTool === 'annotation-select'}
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
				{@const isSelected = selectedIds.has(annotation.id)}
				{#if annotation.type === 'stroke'}
					<path
						d={renderStrokePath(annotation)}
						style={getStrokeStyle(annotation)}
						stroke="none"
						class:selected={isSelected}
					/>
				{:else if annotation.type === 'shape'}
					{@const style = getShapeStyle(annotation)}
					{@const shapeCenterX = (annotation.start.x + annotation.end.x) / 2}
					{@const shapeCenterY = (annotation.start.y + annotation.end.y) / 2}
					{@const shapeRotation = annotation.rotation ?? 0}
					<path
						d={renderShapePath(annotation)}
						stroke={style.stroke}
						stroke-width={style.strokeWidth}
						fill={style.fill}
						opacity={style.opacity}
						stroke-linecap="round"
						stroke-linejoin="round"
						transform={shapeRotation !== 0
							? `rotate(${shapeRotation}, ${shapeCenterX}, ${shapeCenterY})`
							: undefined}
						class:selected={isSelected}
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
						class:selected={isSelected}
					>
						{annotation.stampType}
					</text>
				{/if}
			{/each}
		</g>

		<!-- Selection UI -->
		{#if selectionBounds && currentTool === 'annotation-select'}
			{@const handleSize = 8 / scale}
			{@const hitSize = 16 / scale}
			{@const strokeWidth = 1 / scale}
			{@const rotateOffset = 24 / scale}
			{@const centerX = selectionBounds.x + selectionBounds.width / 2}
			{@const canInteract = selectedIds.size === 1}
			{@const handles = [
				{
					pos: 'nw' as HandlePosition,
					x: selectionBounds.x,
					y: selectionBounds.y,
					cursor: 'nwse-resize'
				},
				{ pos: 'n' as HandlePosition, x: centerX, y: selectionBounds.y, cursor: 'ns-resize' },
				{
					pos: 'ne' as HandlePosition,
					x: selectionBounds.x + selectionBounds.width,
					y: selectionBounds.y,
					cursor: 'nesw-resize'
				},
				{
					pos: 'e' as HandlePosition,
					x: selectionBounds.x + selectionBounds.width,
					y: selectionBounds.y + selectionBounds.height / 2,
					cursor: 'ew-resize'
				},
				{
					pos: 'se' as HandlePosition,
					x: selectionBounds.x + selectionBounds.width,
					y: selectionBounds.y + selectionBounds.height,
					cursor: 'nwse-resize'
				},
				{
					pos: 's' as HandlePosition,
					x: centerX,
					y: selectionBounds.y + selectionBounds.height,
					cursor: 'ns-resize'
				},
				{
					pos: 'sw' as HandlePosition,
					x: selectionBounds.x,
					y: selectionBounds.y + selectionBounds.height,
					cursor: 'nesw-resize'
				},
				{
					pos: 'w' as HandlePosition,
					x: selectionBounds.x,
					y: selectionBounds.y + selectionBounds.height / 2,
					cursor: 'ew-resize'
				}
			]}
			<g
				class="layer-selection"
				transform={selectedAnnotationRotation !== 0
					? `rotate(${selectedAnnotationRotation}, ${centerX}, ${selectionBounds.y + selectionBounds.height / 2})`
					: undefined}
			>
				<!-- Selection rectangle -->
				<rect
					x={selectionBounds.x}
					y={selectionBounds.y}
					width={selectionBounds.width}
					height={selectionBounds.height}
					fill="none"
					stroke="#3b82f6"
					stroke-width={strokeWidth}
					stroke-dasharray={`${4 / scale} ${4 / scale}`}
				/>

				{#if canInteract}
					<!-- Rotation handle -->
					<line
						x1={centerX}
						y1={selectionBounds.y}
						x2={centerX}
						y2={selectionBounds.y - rotateOffset}
						stroke="#3b82f6"
						stroke-width={strokeWidth}
					/>
					<circle
						cx={centerX}
						cy={selectionBounds.y - rotateOffset}
						r={hitSize / 2}
						fill="transparent"
						class="pointer-events-auto"
						style="cursor: grab;"
						onpointerdown={handleRotateStart}
					/>
					<circle
						cx={centerX}
						cy={selectionBounds.y - rotateOffset}
						r={handleSize / 2}
						fill="white"
						stroke="#3b82f6"
						stroke-width={strokeWidth}
					/>

					<!-- Resize handles -->
					{#each handles as h (h.pos)}
						<rect
							x={h.x - hitSize / 2}
							y={h.y - hitSize / 2}
							width={hitSize}
							height={hitSize}
							fill="transparent"
							class="pointer-events-auto"
							style="cursor: {h.cursor};"
							onpointerdown={(e) => handleResizeStart(h.pos, e)}
						/>
						<rect
							x={h.x - handleSize / 2}
							y={h.y - handleSize / 2}
							width={handleSize}
							height={handleSize}
							fill="white"
							stroke="#3b82f6"
							stroke-width={strokeWidth}
						/>
					{/each}
				{:else}
					<!-- Multi-selection: non-interactive corner indicators -->
					{#each [handles[0], handles[2], handles[4], handles[6]] as h (h.pos)}
						<rect
							x={h.x - handleSize / 2}
							y={h.y - handleSize / 2}
							width={handleSize}
							height={handleSize}
							fill="white"
							stroke="#3b82f6"
							stroke-width={strokeWidth}
						/>
					{/each}
				{/if}
			</g>
		{/if}

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
			<g class="layer-active-annotation">
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

	.annotation-layer.select-mode {
		cursor: default;
	}

	.layer-active-annotation {
		pointer-events: none;
	}

	:global(.selected) {
		filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.8));
	}
</style>
