<script lang="ts">
	/**
	 * ImageLayer - SVG layer for rendering and manipulating images
	 *
	 * Features:
	 * - Render images from data URLs
	 * - Drag to move
	 * - Resize handles
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type { ImageElement, Point } from '../types/document';
	import { MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT } from '../stores/whiteboard.svelte';

	// ==========================================================================
	// Constants
	// ==========================================================================

	const HANDLE_SIZE = 8;
	const HANDLE_POSITIONS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
	type HandlePosition = (typeof HANDLE_POSITIONS)[number];

	// ==========================================================================
	// State
	// ==========================================================================

	/** Currently selected image ID */
	let selectedImageId = $state<string | null>(null);

	/** Drag state */
	let isDragging = $state(false);
	let dragStartPos = $state<Point | null>(null);
	let dragStartImagePos = $state<Point | null>(null);

	/** Resize state */
	let isResizing = $state(false);
	let resizeHandle = $state<HandlePosition | null>(null);
	let resizeStartPos = $state<Point | null>(null);
	let resizeStartBounds = $state<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);

	// ==========================================================================
	// Derived
	// ==========================================================================

	let images = $derived(
		(whiteboardStore.currentPage?.elements.filter((e) => e.type === 'image') as ImageElement[]) ??
			[]
	);

	let selectedImage = $derived(images.find((img) => img.id === selectedImageId) ?? null);

	// ==========================================================================
	// Handle Position Calculations
	// ==========================================================================

	function getHandlePosition(
		image: ImageElement,
		handle: HandlePosition
	): { x: number; y: number } {
		const { x, y } = image.position;
		const { width, height } = image;
		const halfHandle = HANDLE_SIZE / 2;

		switch (handle) {
			case 'nw':
				return { x: x - halfHandle, y: y - halfHandle };
			case 'n':
				return { x: x + width / 2 - halfHandle, y: y - halfHandle };
			case 'ne':
				return { x: x + width - halfHandle, y: y - halfHandle };
			case 'e':
				return { x: x + width - halfHandle, y: y + height / 2 - halfHandle };
			case 'se':
				return { x: x + width - halfHandle, y: y + height - halfHandle };
			case 's':
				return { x: x + width / 2 - halfHandle, y: y + height - halfHandle };
			case 'sw':
				return { x: x - halfHandle, y: y + height - halfHandle };
			case 'w':
				return { x: x - halfHandle, y: y + height / 2 - halfHandle };
		}
	}

	function getCursorForHandle(handle: HandlePosition): string {
		const cursors: Record<HandlePosition, string> = {
			nw: 'nwse-resize',
			n: 'ns-resize',
			ne: 'nesw-resize',
			e: 'ew-resize',
			se: 'nwse-resize',
			s: 'ns-resize',
			sw: 'nesw-resize',
			w: 'ew-resize'
		};
		return cursors[handle];
	}

	// ==========================================================================
	// Event Handlers
	// ==========================================================================

	function handleImagePointerDown(e: PointerEvent, image: ImageElement) {
		if (e.button !== 0) return;
		e.stopPropagation();

		selectedImageId = image.id;
		isDragging = true;
		dragStartPos = { x: e.clientX, y: e.clientY };
		dragStartImagePos = { ...image.position };

		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
	}

	function handleImagePointerMove(e: PointerEvent) {
		if (!isDragging || !dragStartPos || !dragStartImagePos || !selectedImageId) return;

		const dx = e.clientX - dragStartPos.x;
		const dy = e.clientY - dragStartPos.y;

		// Get canvas scale for accurate movement
		const scale = getCanvasScale();
		const newX = dragStartImagePos.x + dx / scale;
		const newY = dragStartImagePos.y + dy / scale;

		whiteboardStore.moveImage(selectedImageId, { x: newX, y: newY });
	}

	function handleImagePointerUp(e: PointerEvent) {
		if (isDragging) {
			(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		}
		isDragging = false;
		dragStartPos = null;
		dragStartImagePos = null;
	}

	function handleResizePointerDown(e: PointerEvent, handle: HandlePosition) {
		if (e.button !== 0 || !selectedImage) return;
		e.stopPropagation();

		isResizing = true;
		resizeHandle = handle;
		resizeStartPos = { x: e.clientX, y: e.clientY };
		resizeStartBounds = {
			x: selectedImage.position.x,
			y: selectedImage.position.y,
			width: selectedImage.width,
			height: selectedImage.height
		};

		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
	}

	function handleResizePointerMove(e: PointerEvent) {
		if (!isResizing || !resizeHandle || !resizeStartPos || !resizeStartBounds || !selectedImageId)
			return;

		const scale = getCanvasScale();
		const dx = (e.clientX - resizeStartPos.x) / scale;
		const dy = (e.clientY - resizeStartPos.y) / scale;

		const { x, y, width, height } = resizeStartBounds;
		let newX = x;
		let newY = y;
		let newWidth = width;
		let newHeight = height;

		// Calculate new bounds based on handle
		switch (resizeHandle) {
			case 'e':
				newWidth = Math.max(width + dx, MIN_IMAGE_WIDTH);
				break;
			case 'w':
				newWidth = Math.max(width - dx, MIN_IMAGE_WIDTH);
				newX = x + width - newWidth;
				break;
			case 's':
				newHeight = Math.max(height + dy, MIN_IMAGE_HEIGHT);
				break;
			case 'n':
				newHeight = Math.max(height - dy, MIN_IMAGE_HEIGHT);
				newY = y + height - newHeight;
				break;
			case 'se':
				newWidth = Math.max(width + dx, MIN_IMAGE_WIDTH);
				newHeight = Math.max(height + dy, MIN_IMAGE_HEIGHT);
				break;
			case 'sw':
				newWidth = Math.max(width - dx, MIN_IMAGE_WIDTH);
				newHeight = Math.max(height + dy, MIN_IMAGE_HEIGHT);
				newX = x + width - newWidth;
				break;
			case 'ne':
				newWidth = Math.max(width + dx, MIN_IMAGE_WIDTH);
				newHeight = Math.max(height - dy, MIN_IMAGE_HEIGHT);
				newY = y + height - newHeight;
				break;
			case 'nw':
				newWidth = Math.max(width - dx, MIN_IMAGE_WIDTH);
				newHeight = Math.max(height - dy, MIN_IMAGE_HEIGHT);
				newX = x + width - newWidth;
				newY = y + height - newHeight;
				break;
		}

		whiteboardStore.resizeAndMoveImage(selectedImageId, newWidth, newHeight, { x: newX, y: newY });
	}

	function handleResizePointerUp(e: PointerEvent) {
		if (isResizing) {
			(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		}
		isResizing = false;
		resizeHandle = null;
		resizeStartPos = null;
		resizeStartBounds = null;
	}

	function handleClickOutside() {
		if (!isDragging && !isResizing) {
			selectedImageId = null;
		}
	}

	// ==========================================================================
	// Utility Functions
	// ==========================================================================

	function getCanvasScale(): number {
		// Get the canvas element to determine scale
		const canvas = document.querySelector('.whiteboard-canvas-area svg');
		if (!canvas) return 1;

		const rect = canvas.getBoundingClientRect();
		const viewBox = canvas.getAttribute('viewBox');
		if (!viewBox) return 1;

		const parts = viewBox.split(' ').map(Number);
		if (parts.length < 4 || isNaN(parts[2]) || parts[2] === 0) {
			console.warn('[ImageLayer] Invalid viewBox format:', viewBox);
			return 1;
		}

		const vbWidth = parts[2];
		return rect.width / vbWidth;
	}

	// Expose deselect method for parent components
	export function deselectImage() {
		selectedImageId = null;
	}
</script>

<!-- Click outside handler -->
<svelte:window
	onclick={(e) => {
		const target = e.target as Element;
		if (!target.closest('.image-element') && !target.closest('.resize-handle')) {
			handleClickOutside();
		}
	}}
/>

<!-- Image layer group -->
<g class="image-layer">
	{#each images as image (image.id)}
		{@const isSelected = image.id === selectedImageId}

		<!-- Image element -->
		<g class="image-element" role="img" aria-label={image.originalFilename ?? 'Image'}>
			<!-- The actual image -->
			<image
				href={image.src}
				x={image.position.x}
				y={image.position.y}
				width={image.width}
				height={image.height}
				preserveAspectRatio="none"
				style="cursor: move;"
				onpointerdown={(e) => handleImagePointerDown(e, image)}
				onpointermove={handleImagePointerMove}
				onpointerup={handleImagePointerUp}
			/>

			<!-- Selection border -->
			{#if isSelected}
				<rect
					x={image.position.x}
					y={image.position.y}
					width={image.width}
					height={image.height}
					fill="none"
					stroke="#3b82f6"
					stroke-width="2"
					stroke-dasharray="4 2"
					pointer-events="none"
				/>

				<!-- Resize handles -->
				{#each HANDLE_POSITIONS as handle (handle)}
					{@const pos = getHandlePosition(image, handle)}
					<rect
						class="resize-handle"
						x={pos.x}
						y={pos.y}
						width={HANDLE_SIZE}
						height={HANDLE_SIZE}
						fill="white"
						stroke="#3b82f6"
						stroke-width="1"
						style="cursor: {getCursorForHandle(handle)};"
						onpointerdown={(e) => handleResizePointerDown(e, handle)}
						onpointermove={handleResizePointerMove}
						onpointerup={handleResizePointerUp}
					/>
				{/each}
			{/if}
		</g>
	{/each}
</g>
