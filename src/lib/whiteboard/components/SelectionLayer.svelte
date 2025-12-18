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

	import { getElementBounds, type BoundingBox } from '../core/hit-testing';
	import type { WhiteboardElement } from '../types/document';

	// ==========================================================================
	// Types
	// ==========================================================================

	/** Resize handle position identifiers */
	export type HandlePosition = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

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
		/** Callback when selection is moved by dragging */
		onMove?: (dx: number, dy: number) => void;
	}

	let { selectedElements, scale, onMove }: Props = $props();

	// ==========================================================================
	// Drag State
	// ==========================================================================

	/** Whether user is currently dragging the selection */
	let isDragging = $state(false);

	/** Start position of drag in client coordinates */
	let dragStartX = $state(0);
	let dragStartY = $state(0);

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Visual size of handles in pixels (constant regardless of zoom) */
	const HANDLE_VISUAL_SIZE = 8;

	/** Hit area size for handles (larger for easier clicking) */
	const HANDLE_HIT_SIZE = 16;

	/** Selection rectangle stroke color */
	const SELECTION_STROKE_COLOR = '#3b82f6';

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

	/** Element types that support resize handles */
	const RESIZABLE_TYPES = ['shape', 'image'] as const;

	/** Check if an element type supports resize handles */
	function isResizable(type: WhiteboardElement['type']): boolean {
		return RESIZABLE_TYPES.includes(type as (typeof RESIZABLE_TYPES)[number]);
	}

	/** Calculate combined bounding box for all selected elements */
	let combinedBounds = $derived.by(() => {
		if (selectedElements.length === 0) return null;
		if (selectedElements.length === 1) return getElementBounds(selectedElements[0]);

		// Combine bounds of all selected elements
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const element of selectedElements) {
			const bounds = getElementBounds(element);
			minX = Math.min(minX, bounds.x);
			minY = Math.min(minY, bounds.y);
			maxX = Math.max(maxX, bounds.x + bounds.width);
			maxY = Math.max(maxY, bounds.y + bounds.height);
		}

		return {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY
		};
	});

	// ==========================================================================
	// Drag Handlers
	// ==========================================================================

	/**
	 * Handle pointer down on selection rectangle - start dragging
	 */
	function handleSelectionPointerDown(e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();

		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;

		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
	}

	/**
	 * Handle pointer move during drag - calculate delta and move elements
	 */
	function handleSelectionPointerMove(e: PointerEvent) {
		if (!isDragging) return;

		const dx = (e.clientX - dragStartX) / scale;
		const dy = (e.clientY - dragStartY) / scale;

		// Safeguard against invalid transformations (scale = 0 or NaN)
		if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;

		// Update drag start for incremental delta calculation
		dragStartX = e.clientX;
		dragStartY = e.clientY;

		onMove?.(dx, dy);
	}

	/**
	 * Handle pointer up - end dragging
	 */
	function handleSelectionPointerUp(e: PointerEvent) {
		if (isDragging) {
			isDragging = false;
			(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		}
	}
</script>

<svg class="selection-layer pointer-events-none absolute inset-0 h-full w-full overflow-visible">
	<!-- Individual element selection rectangles (dashed borders) -->
	{#each selectedElements as element (element.id)}
		{@const bounds = getElementBounds(element)}
		{@const showHandles = isResizable(element.type)}

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
	{/each}

	<!-- Draggable overlay for moving selection -->
	{#if combinedBounds}
		<rect
			class="pointer-events-auto cursor-move"
			class:cursor-grabbing={isDragging}
			x={combinedBounds.x}
			y={combinedBounds.y}
			width={combinedBounds.width}
			height={combinedBounds.height}
			fill="transparent"
			stroke="none"
			onpointerdown={handleSelectionPointerDown}
			onpointermove={handleSelectionPointerMove}
			onpointerup={handleSelectionPointerUp}
			onpointercancel={handleSelectionPointerUp}
		/>
	{/if}
</svg>

<style>
	.cursor-move {
		cursor: move;
	}

	.cursor-grabbing {
		cursor: grabbing;
	}
</style>
