<script lang="ts">
	/**
	 * SelectionLayer - Selection rectangles and resize handles
	 *
	 * Displays selection UI for selected whiteboard elements:
	 * - Dashed selection rectangles around selected elements
	 * - Resize handles for shapes and images (not strokes or textblocks)
	 *
	 * @module whiteboard/components/SelectionLayer
	 */

	import {
		getElementBounds,
		getBoundsCenter,
		calculateAngleFromCenter,
		normalizeAngle,
		snapAngle,
		type BoundingBox
	} from '../core/hit-testing';
	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type {
		WhiteboardElement,
		ShapeElement,
		StrokeElement,
		GroupElement
	} from '../types/document';

	// ==========================================================================
	// Types
	// ==========================================================================

	/** Resize handle position identifiers */
	export type HandlePosition = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

	/** Endpoint handle identifiers for lines/arrows */
	export type EndpointPosition = 'start' | 'end';

	/** Handle configuration with position and cursor */
	interface HandleConfig {
		position: HandlePosition;
		cursor: string;
		getCoords: (bounds: BoundingBox) => { x: number; y: number };
	}

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Array of selected whiteboard elements */
		selectedElements: readonly WhiteboardElement[];
		/** Current canvas scale (for handle sizing) */
		scale: number;
		/** ID of element currently hovered (for hover feedback) */
		hoveredElementId: string | null;
		/** Callback for live resize preview (scale factors + origin) */
		onResizeLive?: (
			elementId: string,
			scaleX: number,
			scaleY: number,
			originX: number,
			originY: number
		) => void;
		/** Callback when resize is finished (commit with total delta) */
		onResizeEnd?: (
			elementId: string,
			handle: HandlePosition,
			totalDx: number,
			totalDy: number,
			constrainAspectRatio: boolean
		) => void;
		/** Callback when an element is being rotated (live preview) */
		onRotate?: (elementId: string, rotation: number) => void;
		/** Callback when rotation is finished (commit the rotation) */
		onRotateEnd?: (elementId: string) => void;
		/** Callback when an endpoint is being dragged (live preview) */
		onEndpointDrag?: (elementId: string, endpoint: EndpointPosition, x: number, y: number) => void;
		/** Callback when endpoint drag is finished (commit the position) */
		onEndpointDragEnd?: (
			elementId: string,
			endpoint: EndpointPosition,
			x: number,
			y: number
		) => void;
	}

	let {
		selectedElements,
		scale,
		hoveredElementId,
		onResizeLive,
		onResizeEnd,
		onRotate,
		onRotateEnd,
		onEndpointDrag,
		onEndpointDragEnd
	}: Props = $props();

	// ==========================================================================
	// Resize State
	// ==========================================================================

	/** Whether user is currently resizing an element */
	let isResizing = $state(false);

	/** Which handle is being dragged */
	let resizeHandle = $state<HandlePosition | null>(null);

	/** Element ID being resized */
	let resizeElementId = $state<string | null>(null);

	/** Start position of resize in client coordinates */
	let resizeStartX = $state(0);
	let resizeStartY = $state(0);

	/** Initial bounds of element when resize started */
	let initialBounds = $state<{ x: number; y: number; width: number; height: number } | null>(null);

	/** Track if shift was held during resize (for commit) */
	let resizeConstrainAspectRatio = $state(false);

	// ==========================================================================
	// Rotation State
	// ==========================================================================

	/** Whether user is currently rotating an element */
	let isRotating = $state(false);

	/** Element ID being rotated */
	let rotateElementId = $state<string | null>(null);

	/** Initial element rotation when drag started */
	let initialElementRotation = $state(0);

	/** Initial mouse angle relative to center when drag started */
	let initialMouseAngle = $state(0);

	/** Center of the element being rotated (in canvas coordinates) */
	let rotationCenter = $state<{ x: number; y: number }>({ x: 0, y: 0 });

	// ==========================================================================
	// Endpoint Drag State (for lines/arrows)
	// ==========================================================================

	/** Whether user is currently dragging an endpoint */
	let isDraggingEndpoint = $state(false);

	/** Which endpoint is being dragged */
	let draggingEndpoint = $state<EndpointPosition | null>(null);

	/** Element ID whose endpoint is being dragged */
	let endpointElementId = $state<string | null>(null);

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Visual size of handles in pixels (constant regardless of zoom) */
	const HANDLE_VISUAL_SIZE = 8;

	/** Hit area size for handles (larger for easier clicking) */
	const HANDLE_HIT_SIZE = 16;

	/** Selection rectangle stroke color */
	const SELECTION_STROKE_COLOR = '#3b82f6';

	/** Distance of rotation handle above the selection box (in pixels) */
	const ROTATION_HANDLE_OFFSET = 24;

	/** Rotation handle visual radius */
	const ROTATION_HANDLE_RADIUS = 5;

	/** Angle increment for Shift key snapping (15 degrees) */
	const ROTATION_SNAP_INCREMENT = 15;

	/** Handle configuration for all 8 positions */
	const HANDLE_CONFIGS: HandleConfig[] = [
		{
			position: 'nw',
			cursor: 'nwse-resize',
			getCoords: (b) => ({ x: b.x, y: b.y })
		},
		{
			position: 'n',
			cursor: 'ns-resize',
			getCoords: (b) => ({ x: b.x + b.width / 2, y: b.y })
		},
		{
			position: 'ne',
			cursor: 'nesw-resize',
			getCoords: (b) => ({ x: b.x + b.width, y: b.y })
		},
		{
			position: 'e',
			cursor: 'ew-resize',
			getCoords: (b) => ({ x: b.x + b.width, y: b.y + b.height / 2 })
		},
		{
			position: 'se',
			cursor: 'nwse-resize',
			getCoords: (b) => ({ x: b.x + b.width, y: b.y + b.height })
		},
		{
			position: 's',
			cursor: 'ns-resize',
			getCoords: (b) => ({ x: b.x + b.width / 2, y: b.y + b.height })
		},
		{
			position: 'sw',
			cursor: 'nesw-resize',
			getCoords: (b) => ({ x: b.x, y: b.y + b.height })
		},
		{
			position: 'w',
			cursor: 'ew-resize',
			getCoords: (b) => ({ x: b.x, y: b.y + b.height / 2 })
		}
	];

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/** Handle size adjusted for current scale (constant visual size) */
	let handleSize = $derived(HANDLE_VISUAL_SIZE / scale);

	/** Hit area size adjusted for current scale */
	let hitAreaSize = $derived(HANDLE_HIT_SIZE / scale);

	/** Stroke width adjusted for current scale (constant visual width) */
	let strokeWidth = $derived(1 / scale);

	/** Cached bounds for selected elements (only recalculates when selection or element structure changes) */
	let boundsCache = $derived.by(() => {
		const cache = new Map<
			string,
			{ bounds: ReturnType<typeof getElementBounds>; center: { x: number; y: number } }
		>();
		for (const element of selectedElements) {
			const bounds = getElementBounds(element);
			const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
			cache.set(element.id, { bounds, center });
		}
		return cache;
	});

	/** Element types that support resize handles */
	const RESIZABLE_TYPES = ['shape', 'image', 'stroke', 'group'] as const;

	/** Element types that support rotation */
	const ROTATABLE_TYPES = ['shape', 'stroke', 'group'] as const;

	/** Check if an element type supports resize handles */
	function isResizable(type: WhiteboardElement['type']): boolean {
		return RESIZABLE_TYPES.includes(type as (typeof RESIZABLE_TYPES)[number]);
	}

	/** Check if an element type supports rotation */
	function isRotatable(type: WhiteboardElement['type']): boolean {
		return ROTATABLE_TYPES.includes(type as (typeof ROTATABLE_TYPES)[number]);
	}

	/** Check if element is a line or arrow (uses endpoint handles instead of bounding box) */
	function isLineOrArrow(element: WhiteboardElement): element is ShapeElement {
		return (
			element.type === 'shape' &&
			((element as ShapeElement).shapeType === 'line' ||
				(element as ShapeElement).shapeType === 'arrow')
		);
	}

	/** Get stored rotation of an element (not live rotation) */
	function getElementRotation(element: WhiteboardElement): number {
		if (element.type === 'shape' || element.type === 'stroke') {
			return (element as ShapeElement | StrokeElement).rotation ?? 0;
		}
		if (element.type === 'group') {
			return (element as GroupElement).rotation ?? 0;
		}
		return 0;
	}

	/** Get hovered element (if not already selected) */
	let hoveredElement = $derived.by(() => {
		if (!hoveredElementId) return null;
		// Don't show hover if already selected
		if (selectedElements.some((el) => el.id === hoveredElementId)) return null;
		// Find the element in page
		return whiteboardStore.currentPage?.elements.find((el) => el.id === hoveredElementId) ?? null;
	});

	// ==========================================================================
	// Resize Handlers
	// ==========================================================================

	/**
	 * Get the origin point for resize transform based on handle position.
	 * The origin is the opposite corner/edge that stays fixed.
	 */
	function getResizeOrigin(
		handle: HandlePosition,
		bounds: { x: number; y: number; width: number; height: number }
	): { x: number; y: number } {
		switch (handle) {
			case 'nw':
				return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
			case 'ne':
				return { x: bounds.x, y: bounds.y + bounds.height };
			case 'sw':
				return { x: bounds.x + bounds.width, y: bounds.y };
			case 'se':
				return { x: bounds.x, y: bounds.y };
			case 'n':
				return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
			case 's':
				return { x: bounds.x + bounds.width / 2, y: bounds.y };
			case 'w':
				return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
			case 'e':
				return { x: bounds.x, y: bounds.y + bounds.height / 2 };
		}
	}

	/**
	 * Handle pointer down on resize handle - start resizing
	 */
	function handleHandlePointerDown(e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();

		const target = e.currentTarget as SVGElement;
		const handle = target.dataset.handle as HandlePosition;
		const elementId = target.dataset.elementId!;

		// Find the element and get its bounds
		const element = selectedElements.find((el) => el.id === elementId);
		if (!element) return;

		const bounds = boundsCache.get(elementId)?.bounds;
		if (!bounds) return;

		isResizing = true;
		resizeHandle = handle;
		resizeElementId = elementId;
		resizeStartX = e.clientX;
		resizeStartY = e.clientY;
		initialBounds = { ...bounds };
		resizeConstrainAspectRatio = e.shiftKey;

		target.setPointerCapture(e.pointerId);
	}

	/**
	 * Handle pointer move during resize - calculate scale factors for live preview
	 */
	function handleHandlePointerMove(e: PointerEvent) {
		if (!isResizing || !resizeHandle || !resizeElementId || !initialBounds) return;

		// Calculate total delta from start position
		const totalDx = (e.clientX - resizeStartX) / scale;
		const totalDy = (e.clientY - resizeStartY) / scale;

		// Safeguard against invalid transformations
		if (!Number.isFinite(totalDx) || !Number.isFinite(totalDy)) return;

		// Update aspect ratio constraint based on current shift state
		resizeConstrainAspectRatio = e.shiftKey;

		// Calculate new dimensions based on handle
		let newWidth = initialBounds.width;
		let newHeight = initialBounds.height;

		// Apply delta to appropriate dimension(s)
		if (resizeHandle.includes('e')) newWidth += totalDx;
		if (resizeHandle.includes('w')) newWidth -= totalDx;
		if (resizeHandle.includes('s')) newHeight += totalDy;
		if (resizeHandle.includes('n')) newHeight -= totalDy;

		// Prevent negative/zero dimensions
		newWidth = Math.max(10, newWidth);
		newHeight = Math.max(10, newHeight);

		// Calculate scale factors
		let scaleX = newWidth / initialBounds.width;
		let scaleY = newHeight / initialBounds.height;

		// Handle aspect ratio constraint for corner handles
		if (resizeConstrainAspectRatio && ['nw', 'ne', 'sw', 'se'].includes(resizeHandle)) {
			const uniformScale = Math.max(scaleX, scaleY);
			scaleX = uniformScale;
			scaleY = uniformScale;
		}

		// Get the fixed point (opposite corner/edge)
		const origin = getResizeOrigin(resizeHandle, initialBounds);

		onResizeLive?.(resizeElementId, scaleX, scaleY, origin.x, origin.y);
	}

	/**
	 * Handle pointer up - end resizing and commit
	 */
	function handleHandlePointerUp(e: PointerEvent) {
		if (isResizing && resizeElementId && resizeHandle) {
			// Calculate total delta for commit
			const totalDx = (e.clientX - resizeStartX) / scale;
			const totalDy = (e.clientY - resizeStartY) / scale;

			// Commit the resize
			onResizeEnd?.(resizeElementId, resizeHandle, totalDx, totalDy, resizeConstrainAspectRatio);

			isResizing = false;
			resizeHandle = null;
			resizeElementId = null;
			initialBounds = null;
			resizeConstrainAspectRatio = false;
			(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		}
	}

	// ==========================================================================
	// Rotation Handlers
	// ==========================================================================

	/**
	 * Convert client coordinates to SVG viewBox coordinates
	 * Finds the parent SVG with a valid viewBox (WhiteboardCanvas SVG)
	 */
	function clientToSvgCoords(e: PointerEvent): { x: number; y: number } | null {
		// Find the main SVG element with a valid viewBox
		let svgElement = (e.currentTarget as SVGElement).ownerSVGElement;

		// Traverse up to find SVG with valid viewBox (the WhiteboardCanvas SVG)
		while (svgElement) {
			const viewBox = svgElement.viewBox.baseVal;
			if (viewBox.width > 0 && viewBox.height > 0) {
				break;
			}
			svgElement = svgElement.ownerSVGElement;
		}

		if (!svgElement) return null;

		const rect = svgElement.getBoundingClientRect();
		const viewBox = svgElement.viewBox.baseVal;

		// Use viewBox dimensions for proper coordinate mapping
		const x = ((e.clientX - rect.left) / rect.width) * viewBox.width;
		const y = ((e.clientY - rect.top) / rect.height) * viewBox.height;

		return { x, y };
	}

	/**
	 * Handle pointer down on rotation handle - start rotating
	 */
	function handleRotationPointerDown(e: PointerEvent, element: WhiteboardElement) {
		e.preventDefault();
		e.stopPropagation();

		const coords = clientToSvgCoords(e);
		if (!coords) return;

		const bounds = getElementBounds(element);
		const center = getBoundsCenter(bounds);

		isRotating = true;
		rotateElementId = element.id;
		initialElementRotation = getElementRotation(element);
		rotationCenter = center;
		initialMouseAngle = calculateAngleFromCenter(center, coords);

		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
	}

	/**
	 * Handle pointer move during rotation - calculate and apply rotation
	 */
	function handleRotationPointerMove(e: PointerEvent) {
		if (!isRotating || !rotateElementId) return;

		const coords = clientToSvgCoords(e);
		if (!coords) return;

		// Calculate current mouse angle relative to center
		const currentMouseAngle = calculateAngleFromCenter(rotationCenter, coords);

		// Calculate rotation delta from initial mouse angle
		const angleDelta = currentMouseAngle - initialMouseAngle;

		// Calculate new rotation
		let newRotation = initialElementRotation + angleDelta;

		// Snap to 15° increments if Shift is held
		if (e.shiftKey) {
			newRotation = snapAngle(newRotation, ROTATION_SNAP_INCREMENT);
		}

		// Normalize angle
		newRotation = normalizeAngle(newRotation);

		onRotate?.(rotateElementId, newRotation);
	}

	/**
	 * Handle pointer up - end rotating
	 */
	function handleRotationPointerUp(e: PointerEvent) {
		if (isRotating && rotateElementId) {
			// Commit the live rotation
			onRotateEnd?.(rotateElementId);

			isRotating = false;
			rotateElementId = null;
			initialElementRotation = 0;
			initialMouseAngle = 0;
			(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		}
	}

	// ==========================================================================
	// Endpoint Drag Handlers (for lines/arrows)
	// ==========================================================================

	/**
	 * Handle pointer down on endpoint handle - start dragging endpoint
	 */
	function handleEndpointPointerDown(
		e: PointerEvent,
		elementId: string,
		endpoint: EndpointPosition
	) {
		e.preventDefault();
		e.stopPropagation();

		isDraggingEndpoint = true;
		draggingEndpoint = endpoint;
		endpointElementId = elementId;

		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
	}

	/**
	 * Handle pointer move during endpoint drag
	 */
	function handleEndpointPointerMove(e: PointerEvent) {
		if (!isDraggingEndpoint || !draggingEndpoint || !endpointElementId) return;

		const coords = clientToSvgCoords(e);
		if (!coords) return;

		onEndpointDrag?.(endpointElementId, draggingEndpoint, coords.x, coords.y);
	}

	/**
	 * Handle pointer up - end endpoint drag
	 */
	function handleEndpointPointerUp(e: PointerEvent) {
		if (isDraggingEndpoint && endpointElementId && draggingEndpoint) {
			const coords = clientToSvgCoords(e);
			if (coords) {
				onEndpointDragEnd?.(endpointElementId, draggingEndpoint, coords.x, coords.y);
			}

			isDraggingEndpoint = false;
			draggingEndpoint = null;
			endpointElementId = null;
			(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		}
	}
</script>

<svg class="selection-layer pointer-events-none absolute inset-0 h-full w-full overflow-visible">
	<!-- Hover highlight (for non-selected elements) -->
	{#if hoveredElement}
		{@const isHoveredLineOrArrow = isLineOrArrow(hoveredElement)}
		{#if isHoveredLineOrArrow}
			{@const lineEl = hoveredElement as ShapeElement}
			<!-- Line/Arrow hover: highlight the line itself -->
			<line
				x1={lineEl.start.x}
				y1={lineEl.start.y}
				x2={lineEl.end.x}
				y2={lineEl.end.y}
				stroke="#93c5fd"
				stroke-width={Math.max(lineEl.strokeWidth + 4, 8) / scale}
				stroke-linecap="round"
				opacity="0.5"
				class="pointer-events-none"
			/>
		{:else}
			{@const bounds = getElementBounds(hoveredElement)}
			{@const hoverCenter = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }}
			{@const hoverRotation = getElementRotation(hoveredElement)}
			{@const hoverRotateTransform =
				hoverRotation !== 0
					? `rotate(${hoverRotation}, ${hoverCenter.x}, ${hoverCenter.y})`
					: undefined}
			<rect
				x={bounds.x}
				y={bounds.y}
				width={bounds.width}
				height={bounds.height}
				fill="rgba(59, 130, 246, 0.08)"
				stroke="#93c5fd"
				stroke-width={strokeWidth}
				stroke-dasharray={`${3 / scale} ${3 / scale}`}
				transform={hoverRotateTransform}
				class="pointer-events-none"
			/>
		{/if}
	{/if}

	<!-- Individual element selection rectangles (dashed borders) -->
	{#each selectedElements as element (element.id)}
		{@const cached = boundsCache.get(element.id)}
		{@const bounds = cached?.bounds ?? { x: 0, y: 0, width: 0, height: 0 }}
		{@const center = cached?.center ?? { x: 0, y: 0 }}
		{@const isEndpointElement = isLineOrArrow(element)}
		{@const showHandles = !isEndpointElement && isResizable(element.type)}
		{@const showRotation = !isEndpointElement && isRotatable(element.type)}
		{@const liveRot = whiteboardStore.liveRotations.get(element.id)}
		{@const storedRot = getElementRotation(element)}
		{@const elementRotation = liveRot ?? storedRot}
		{@const liveResize = whiteboardStore.liveResizes.get(element.id)}
		{@const livePos = whiteboardStore.livePositions.get(element.id)}
		{@const translateTransform = livePos ? `translate(${livePos.dx}, ${livePos.dy})` : ''}
		{@const rotateTransform =
			elementRotation !== 0 ? `rotate(${elementRotation}, ${center.x}, ${center.y})` : ''}
		{@const scaleTransform = liveResize
			? `translate(${liveResize.originX}, ${liveResize.originY}) scale(${liveResize.scaleX}, ${liveResize.scaleY}) translate(${-liveResize.originX}, ${-liveResize.originY})`
			: ''}

		<!-- Lines/Arrows: endpoint handles only (no bounding box) -->
		{#if isEndpointElement}
			{@const lineElement = element as ShapeElement}
			{@const liveEndpoint = whiteboardStore.liveEndpoints.get(element.id)}
			{@const startX =
				liveEndpoint?.endpoint === 'start'
					? liveEndpoint.x
					: lineElement.start.x + (livePos?.dx ?? 0)}
			{@const startY =
				liveEndpoint?.endpoint === 'start'
					? liveEndpoint.y
					: lineElement.start.y + (livePos?.dy ?? 0)}
			{@const endX =
				liveEndpoint?.endpoint === 'end' ? liveEndpoint.x : lineElement.end.x + (livePos?.dx ?? 0)}
			{@const endY =
				liveEndpoint?.endpoint === 'end' ? liveEndpoint.y : lineElement.end.y + (livePos?.dy ?? 0)}
			{@const endpointRadius = handleSize / 2}
			{@const hitRadius = hitAreaSize / 2}

			<!-- Start endpoint handle -->
			<g>
				<!-- Invisible hit area -->
				<circle
					class="pointer-events-auto"
					cx={startX}
					cy={startY}
					r={hitRadius}
					fill="transparent"
					style="cursor: move;"
					onpointerdown={(e) => handleEndpointPointerDown(e, element.id, 'start')}
					onpointermove={handleEndpointPointerMove}
					onpointerup={handleEndpointPointerUp}
					onpointercancel={handleEndpointPointerUp}
				/>
				<!-- Visible handle (circle) -->
				<circle
					cx={startX}
					cy={startY}
					r={endpointRadius}
					fill="white"
					stroke={SELECTION_STROKE_COLOR}
					stroke-width={strokeWidth}
				/>
			</g>

			<!-- End endpoint handle -->
			<g>
				<!-- Invisible hit area -->
				<circle
					class="pointer-events-auto"
					cx={endX}
					cy={endY}
					r={hitRadius}
					fill="transparent"
					style="cursor: move;"
					onpointerdown={(e) => handleEndpointPointerDown(e, element.id, 'end')}
					onpointermove={handleEndpointPointerMove}
					onpointerup={handleEndpointPointerUp}
					onpointercancel={handleEndpointPointerUp}
				/>
				<!-- Visible handle (circle) -->
				<circle
					cx={endX}
					cy={endY}
					r={endpointRadius}
					fill="white"
					stroke={SELECTION_STROKE_COLOR}
					stroke-width={strokeWidth}
				/>
			</g>
		{:else}
			<!-- Group that transforms selection UI with the element -->
			<g
				transform={`${translateTransform} ${scaleTransform} ${rotateTransform}`.trim() || undefined}
			>
				<!-- Selection rectangle (dashed border) for individual element -->
				<rect
					x={bounds.x}
					y={bounds.y}
					width={bounds.width}
					height={bounds.height}
					fill="none"
					stroke={SELECTION_STROKE_COLOR}
					stroke-width={strokeWidth}
					stroke-dasharray={`${4 / scale} ${4 / scale}`}
				/>

				<!-- Resize handles (only for shapes and images) -->
				{#if showHandles}
					{#each HANDLE_CONFIGS as handle (handle.position)}
						{@const coords = handle.getCoords(bounds)}

						<!-- Invisible larger hit area -->
						<rect
							class="pointer-events-auto"
							x={coords.x - hitAreaSize / 2}
							y={coords.y - hitAreaSize / 2}
							width={hitAreaSize}
							height={hitAreaSize}
							fill="transparent"
							style="cursor: {handle.cursor};"
							data-handle={handle.position}
							data-element-id={element.id}
							onpointerdown={handleHandlePointerDown}
							onpointermove={handleHandlePointerMove}
							onpointerup={handleHandlePointerUp}
							onpointercancel={handleHandlePointerUp}
						/>

						<!-- Visible handle -->
						<rect
							x={coords.x - handleSize / 2}
							y={coords.y - handleSize / 2}
							width={handleSize}
							height={handleSize}
							fill="white"
							stroke={SELECTION_STROKE_COLOR}
							stroke-width={strokeWidth}
						/>
					{/each}
				{/if}

				<!-- Rotation handle (only for shapes and strokes) -->
				{#if showRotation}
					{@const centerX = bounds.x + bounds.width / 2}
					{@const topY = bounds.y}
					{@const handleOffset = ROTATION_HANDLE_OFFSET / scale}
					{@const handleRadius = ROTATION_HANDLE_RADIUS / scale}
					{@const hitRadius = HANDLE_HIT_SIZE / scale / 2}

					<!-- Connecting line from selection box to rotation handle -->
					<line
						x1={centerX}
						y1={topY}
						x2={centerX}
						y2={topY - handleOffset}
						stroke={SELECTION_STROKE_COLOR}
						stroke-width={strokeWidth}
					/>

					<!-- Invisible larger hit area for rotation handle -->
					<circle
						class="pointer-events-auto"
						cx={centerX}
						cy={topY - handleOffset}
						r={hitRadius}
						fill="transparent"
						style="cursor: grab;"
						onpointerdown={(e) => handleRotationPointerDown(e, element)}
						onpointermove={handleRotationPointerMove}
						onpointerup={handleRotationPointerUp}
						onpointercancel={handleRotationPointerUp}
					/>

					<!-- Visible rotation handle (circle) -->
					<circle
						cx={centerX}
						cy={topY - handleOffset}
						r={handleRadius}
						fill="white"
						stroke={SELECTION_STROKE_COLOR}
						stroke-width={strokeWidth}
					/>
				{/if}
			</g>
		{/if}
	{/each}
</svg>
