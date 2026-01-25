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

	/** Distance of rotation handle from top center */
	const ROTATION_HANDLE_OFFSET = 25;
	const ROTATION_HANDLE_SIZE = 10;

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

	/** Rotation state */
	let isRotating = $state(false);
	let rotationStartAngle = $state(0);
	let rotationStartImageAngle = $state(0);

	// ==========================================================================
	// Derived
	// ==========================================================================

	let images = $derived(
		(whiteboardStore.currentPage?.elements.filter((e) => e.type === 'image') as ImageElement[]) ??
			[]
	);

	let selectedImage = $derived(images.find((img) => img.id === selectedImageId) ?? null);

	let isSelectMode = $derived(whiteboardStore.currentTool === 'select');

	// Deselect image when leaving select mode
	$effect(() => {
		if (!isSelectMode && selectedImageId) {
			selectedImageId = null;
		}
	});

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

		// Only allow selection/drag in select mode
		if (whiteboardStore.currentTool !== 'select') return;

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
		const aspectRatio = width / height;

		let newX = x;
		let newY = y;
		let newWidth = width;
		let newHeight = height;

		// Calculate new bounds based on handle, preserving aspect ratio
		switch (resizeHandle) {
			case 'e':
				newWidth = Math.max(width + dx, MIN_IMAGE_WIDTH);
				newHeight = newWidth / aspectRatio;
				// Center vertically
				newY = y + (height - newHeight) / 2;
				break;
			case 'w':
				newWidth = Math.max(width - dx, MIN_IMAGE_WIDTH);
				newHeight = newWidth / aspectRatio;
				newX = x + width - newWidth;
				// Center vertically
				newY = y + (height - newHeight) / 2;
				break;
			case 's':
				newHeight = Math.max(height + dy, MIN_IMAGE_HEIGHT);
				newWidth = newHeight * aspectRatio;
				// Center horizontally
				newX = x + (width - newWidth) / 2;
				break;
			case 'n':
				newHeight = Math.max(height - dy, MIN_IMAGE_HEIGHT);
				newWidth = newHeight * aspectRatio;
				newY = y + height - newHeight;
				// Center horizontally
				newX = x + (width - newWidth) / 2;
				break;
			case 'se':
				// Use the larger delta to determine scale
				if (Math.abs(dx) / width > Math.abs(dy) / height) {
					newWidth = Math.max(width + dx, MIN_IMAGE_WIDTH);
					newHeight = newWidth / aspectRatio;
				} else {
					newHeight = Math.max(height + dy, MIN_IMAGE_HEIGHT);
					newWidth = newHeight * aspectRatio;
				}
				break;
			case 'sw':
				if (Math.abs(dx) / width > Math.abs(dy) / height) {
					newWidth = Math.max(width - dx, MIN_IMAGE_WIDTH);
					newHeight = newWidth / aspectRatio;
				} else {
					newHeight = Math.max(height + dy, MIN_IMAGE_HEIGHT);
					newWidth = newHeight * aspectRatio;
				}
				newX = x + width - newWidth;
				break;
			case 'ne':
				if (Math.abs(dx) / width > Math.abs(dy) / height) {
					newWidth = Math.max(width + dx, MIN_IMAGE_WIDTH);
					newHeight = newWidth / aspectRatio;
				} else {
					newHeight = Math.max(height - dy, MIN_IMAGE_HEIGHT);
					newWidth = newHeight * aspectRatio;
				}
				newY = y + height - newHeight;
				break;
			case 'nw':
				if (Math.abs(dx) / width > Math.abs(dy) / height) {
					newWidth = Math.max(width - dx, MIN_IMAGE_WIDTH);
					newHeight = newWidth / aspectRatio;
				} else {
					newHeight = Math.max(height - dy, MIN_IMAGE_HEIGHT);
					newWidth = newHeight * aspectRatio;
				}
				newX = x + width - newWidth;
				newY = y + height - newHeight;
				break;
		}

		// Ensure minimum dimensions are respected
		if (newWidth < MIN_IMAGE_WIDTH) {
			newWidth = MIN_IMAGE_WIDTH;
			newHeight = newWidth / aspectRatio;
		}
		if (newHeight < MIN_IMAGE_HEIGHT) {
			newHeight = MIN_IMAGE_HEIGHT;
			newWidth = newHeight * aspectRatio;
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

	function handleRotatePointerDown(e: PointerEvent) {
		if (e.button !== 0 || !selectedImage) return;
		e.stopPropagation();

		isRotating = true;
		rotationStartImageAngle = selectedImage.rotation ?? 0;

		// Calculate initial angle from center of image to mouse position
		const centerX = selectedImage.position.x + selectedImage.width / 2;
		const centerY = selectedImage.position.y + selectedImage.height / 2;
		const scale = getCanvasScale();

		// Get SVG coordinates
		const svg = document.querySelector('.whiteboard-canvas-area svg');
		if (svg) {
			const rect = svg.getBoundingClientRect();
			const mouseX = (e.clientX - rect.left) / scale;
			const mouseY = (e.clientY - rect.top) / scale;
			rotationStartAngle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
		}

		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
	}

	function handleRotatePointerMove(e: PointerEvent) {
		if (!isRotating || !selectedImage || !selectedImageId) return;

		const centerX = selectedImage.position.x + selectedImage.width / 2;
		const centerY = selectedImage.position.y + selectedImage.height / 2;
		const scale = getCanvasScale();

		// Get SVG coordinates
		const svg = document.querySelector('.whiteboard-canvas-area svg');
		if (!svg) return;

		const rect = svg.getBoundingClientRect();
		const mouseX = (e.clientX - rect.left) / scale;
		const mouseY = (e.clientY - rect.top) / scale;

		const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
		const deltaAngle = currentAngle - rotationStartAngle;

		let newRotation = rotationStartImageAngle + deltaAngle;

		// Snap to 15 degree increments when shift is held
		if (e.shiftKey) {
			newRotation = Math.round(newRotation / 15) * 15;
		}

		whiteboardStore.rotateImage(selectedImageId, newRotation);
	}

	function handleRotatePointerUp(e: PointerEvent) {
		if (isRotating) {
			(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		}
		isRotating = false;
	}

	function handleClickOutside() {
		if (!isDragging && !isResizing && !isRotating) {
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
		if (
			!target.closest('.image-element') &&
			!target.closest('.resize-handle') &&
			!target.closest('.rotate-handle')
		) {
			handleClickOutside();
		}
	}}
/>

<!-- Image layer group -->
<g class="image-layer">
	{#each images as image (image.id)}
		{@const isSelected = image.id === selectedImageId}
		{@const rotation = image.rotation ?? 0}
		{@const centerX = image.position.x + image.width / 2}
		{@const centerY = image.position.y + image.height / 2}

		<!-- Image element with rotation -->
		<g
			class="image-element"
			role="img"
			aria-label={image.originalFilename ?? 'Image'}
			transform="rotate({rotation} {centerX} {centerY})"
		>
			<!-- The actual image -->
			<image
				href={image.src}
				x={image.position.x}
				y={image.position.y}
				width={image.width}
				height={image.height}
				preserveAspectRatio="none"
				style="cursor: {isSelectMode ? 'move' : 'default'};"
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

				<!-- Line from top center to rotation handle -->
				<line
					x1={image.position.x + image.width / 2}
					y1={image.position.y}
					x2={image.position.x + image.width / 2}
					y2={image.position.y - ROTATION_HANDLE_OFFSET + ROTATION_HANDLE_SIZE / 2}
					stroke="#3b82f6"
					stroke-width="1"
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

				<!-- Rotation handle (circle above the image) -->
				<circle
					class="rotate-handle"
					cx={image.position.x + image.width / 2}
					cy={image.position.y - ROTATION_HANDLE_OFFSET}
					r={ROTATION_HANDLE_SIZE / 2}
					fill="white"
					stroke="#3b82f6"
					stroke-width="1"
					style="cursor: grab;"
					onpointerdown={handleRotatePointerDown}
					onpointermove={handleRotatePointerMove}
					onpointerup={handleRotatePointerUp}
				/>
			{/if}
		</g>
	{/each}
</g>
