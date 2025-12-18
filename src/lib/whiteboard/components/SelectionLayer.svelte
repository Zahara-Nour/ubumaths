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
	}

	let { selectedElements, scale }: Props = $props();

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
</script>

<svg class="selection-layer pointer-events-none absolute inset-0 h-full w-full overflow-visible">
	{#each selectedElements as element (element.id)}
		{@const bounds = getElementBounds(element)}
		{@const showHandles = isResizable(element.type)}

		<!-- Selection rectangle (dashed border) -->
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
</svg>
