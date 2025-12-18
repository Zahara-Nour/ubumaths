<script lang="ts">
	/**
	 * Whiteboard - Main container component
	 *
	 * Combines canvas, toolbar, and page navigation into a complete whiteboard experience.
	 * Supports zoom and pan functionality.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import WhiteboardCanvas from './WhiteboardCanvas.svelte';
	import WhiteboardToolbar from './WhiteboardToolbar.svelte';
	import PageThumbnails from './PageThumbnails.svelte';
	import type { PageFormatKey } from '../types/document';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Initial document title */
		title?: string;
		/** Initial page format */
		format?: PageFormatKey;
		/** Optional class for styling */
		class?: string;
	}

	let { title = 'Sans titre', format = 'A4', class: className = '' }: Props = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	const SIDEBAR_WIDTH = 180;
	const MIN_ZOOM = 0.25; // 25%
	const MAX_ZOOM = 4; // 400%
	const ZOOM_STEP = 0.1; // 10% per step
	const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

	// ==========================================================================
	// State
	// ==========================================================================

	/** Container element reference */
	let containerEl: HTMLDivElement | null = $state(null);

	/** Canvas area element reference (for pan) */
	let canvasAreaEl: HTMLDivElement | null = $state(null);

	/** Container dimensions */
	let containerWidth = $state(0);
	let containerHeight = $state(0);

	/** Zoom level (1 = 100%) */
	let zoomLevel = $state(1);

	/** Pan offset (when zoomed) */
	let panX = $state(0);
	let panY = $state(0);

	/** Pan drag state */
	let isPanning = $state(false);
	let panStartX = $state(0);
	let panStartY = $state(0);
	let panStartOffsetX = $state(0);
	let panStartOffsetY = $state(0);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/** Current document */
	let document = $derived(whiteboardStore.document);

	/** Current page */
	let currentPage = $derived(whiteboardStore.currentPage);

	/** Page dimensions */
	let pageWidth = $derived(currentPage?.width ?? 794);
	let pageHeight = $derived(currentPage?.height ?? 1123);

	/** Tool state */
	let toolState = $derived(whiteboardStore.toolState);

	/** Sidebar visibility */
	let sidebarVisible = $derived(whiteboardStore.sidebarVisible);

	/** Calculate base scale to fit page in container */
	let fitScale = $derived.by(() => {
		if (containerWidth === 0 || containerHeight === 0) return 1;

		const padding = 40;
		const sidebarOffset = sidebarVisible ? SIDEBAR_WIDTH : 0;
		const availableWidth = containerWidth - padding * 2 - sidebarOffset;
		const availableHeight = containerHeight - padding * 2;

		const scaleX = availableWidth / pageWidth;
		const scaleY = availableHeight / pageHeight;

		return Math.min(scaleX, scaleY, 1);
	});

	/** Effective scale combining fit and zoom */
	let effectiveScale = $derived(fitScale * zoomLevel);

	/** Calculated canvas dimensions */
	let canvasWidth = $derived(Math.round(pageWidth * effectiveScale));
	let canvasHeight = $derived(Math.round(pageHeight * effectiveScale));

	/** Zoom percentage for display */
	let zoomPercent = $derived(Math.round(zoomLevel * 100));

	/** Is pan tool active */
	let isPanToolActive = $derived(toolState.toolType === 'pan');

	/** Can pan (zoomed in beyond container) */
	let canPan = $derived(zoomLevel > 1);

	// ==========================================================================
	// Zoom Methods
	// ==========================================================================

	function zoomIn() {
		zoomLevel = Math.min(zoomLevel + ZOOM_STEP, MAX_ZOOM);
		clampPan();
	}

	function zoomOut() {
		zoomLevel = Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM);
		clampPan();
	}

	function zoomTo(level: number) {
		zoomLevel = Math.max(MIN_ZOOM, Math.min(level, MAX_ZOOM));
		clampPan();
	}

	function zoomToFit() {
		zoomLevel = 1;
		panX = 0;
		panY = 0;
	}

	function clampPan() {
		if (zoomLevel <= 1) {
			panX = 0;
			panY = 0;
			return;
		}

		// Calculate max pan range based on how much the canvas exceeds the viewport
		const sidebarOffset = sidebarVisible ? SIDEBAR_WIDTH : 0;
		const viewportWidth = containerWidth - sidebarOffset;
		const viewportHeight = containerHeight - 80; // Account for status bar and toolbar

		const maxPanX = Math.max(0, (canvasWidth - viewportWidth) / 2 + 20);
		const maxPanY = Math.max(0, (canvasHeight - viewportHeight) / 2 + 20);

		panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
		panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
	}

	// ==========================================================================
	// Pan Handlers
	// ==========================================================================

	function handlePanStart(e: PointerEvent) {
		if (!canPan || !isPanToolActive) return;

		e.preventDefault();
		isPanning = true;
		panStartX = e.clientX;
		panStartY = e.clientY;
		panStartOffsetX = panX;
		panStartOffsetY = panY;

		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePanMove(e: PointerEvent) {
		if (!isPanning) return;

		const dx = e.clientX - panStartX;
		const dy = e.clientY - panStartY;

		panX = panStartOffsetX + dx;
		panY = panStartOffsetY + dy;
		clampPan();
	}

	function handlePanEnd(e: PointerEvent) {
		if (isPanning) {
			isPanning = false;
			try {
				(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {
				// Ignore
			}
		}
	}

	// ==========================================================================
	// Wheel Zoom Handler
	// ==========================================================================

	function handleWheel(e: WheelEvent) {
		// Only zoom with Ctrl/Cmd held
		if (!e.ctrlKey && !e.metaKey) return;

		e.preventDefault();

		const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
		const newZoom = Math.max(MIN_ZOOM, Math.min(zoomLevel + delta, MAX_ZOOM));

		// TODO: Zoom toward cursor position (more complex)
		zoomLevel = newZoom;
		clampPan();
	}

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	onMount(() => {
		// Create new document on mount
		whiteboardStore.createNew(title, format);

		// Setup resize observer
		if (containerEl) {
			const observer = new ResizeObserver((entries) => {
				for (const entry of entries) {
					containerWidth = entry.contentRect.width;
					containerHeight = entry.contentRect.height;
				}
			});
			observer.observe(containerEl);

			return () => observer.disconnect();
		}
	});

	onDestroy(() => {
		whiteboardStore.destroy();
	});

	// ==========================================================================
	// Keyboard Shortcuts
	// ==========================================================================

	function handleKeyDown(e: KeyboardEvent) {
		// Don't handle if in an input field or contenteditable (text blocks)
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			return;
		}
		if (e.target instanceof HTMLElement && e.target.isContentEditable) {
			return;
		}

		const isCtrl = e.ctrlKey || e.metaKey;

		// Zoom shortcuts
		if (isCtrl && (e.key === '+' || e.key === '=')) {
			e.preventDefault();
			zoomIn();
			return;
		}
		if (isCtrl && e.key === '-') {
			e.preventDefault();
			zoomOut();
			return;
		}
		if (isCtrl && e.key === '0') {
			e.preventDefault();
			zoomToFit();
			return;
		}

		// Undo: Ctrl+Z
		if (isCtrl && e.key === 'z' && !e.shiftKey) {
			e.preventDefault();
			whiteboardStore.undo();
			return;
		}

		// Redo: Ctrl+Shift+Z or Ctrl+Y
		if ((isCtrl && e.key === 'z' && e.shiftKey) || (isCtrl && e.key === 'y')) {
			e.preventDefault();
			whiteboardStore.redo();
			return;
		}

		// Page navigation (no modifier needed)
		if (e.key === 'PageDown') {
			e.preventDefault();
			whiteboardStore.nextPage();
			return;
		}
		if (e.key === 'PageUp') {
			e.preventDefault();
			whiteboardStore.previousPage();
			return;
		}

		// Tool shortcuts (when no modifier)
		if (!isCtrl && !e.altKey && !e.shiftKey) {
			switch (e.key.toLowerCase()) {
				// Action tools
				case 'v':
					e.preventDefault();
					whiteboardStore.setTool('select');
					break;
				case ' ':
					e.preventDefault();
					whiteboardStore.setTool('pan');
					break;
				// Drawing tools
				case 'p':
					e.preventDefault();
					whiteboardStore.setTool('pen');
					break;
				case 'h':
					e.preventDefault();
					whiteboardStore.setTool('highlighter');
					break;
				case 'e':
					e.preventDefault();
					whiteboardStore.setTool('eraser');
					break;
				case 't':
					e.preventDefault();
					whiteboardStore.setTool('text');
					break;
				// Shape tools
				case 'l':
					e.preventDefault();
					whiteboardStore.setTool('line');
					break;
				case 'r':
					e.preventDefault();
					whiteboardStore.setTool('rectangle');
					break;
				case 'c':
					e.preventDefault();
					whiteboardStore.setTool('circle');
					break;
				case 'a':
					e.preventDefault();
					whiteboardStore.setTool('arrow');
					break;
			}
		}
	}

	// Expose zoom methods for toolbar
	export function getZoomControls() {
		return {
			zoomIn,
			zoomOut,
			zoomTo,
			zoomToFit,
			zoomLevel: () => zoomLevel,
			zoomPercent: () => zoomPercent,
			ZOOM_PRESETS
		};
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
	bind:this={containerEl}
	class="whiteboard-container flex flex-col bg-gray-200 {className}"
	onwheel={handleWheel}
>
	<!-- Status bar -->
	<div class="whiteboard-status flex items-center gap-4 px-3 py-2 text-xs text-gray-600">
		<span class="font-medium">{document?.title ?? 'Sans titre'}</span>
		<span>
			Page {(whiteboardStore.document?.currentPageIndex ?? 0) + 1} / {document?.pages.length ?? 1}
		</span>
		<span>{pageWidth} × {pageHeight}</span>
		<span class="text-primary capitalize">{toolState.toolType}</span>
		<span class="ml-auto">{zoomPercent}%</span>
	</div>

	<!-- Main content area with sidebar -->
	<div class="whiteboard-main relative flex-1 overflow-hidden">
		<!-- Canvas area -->
		<div
			bind:this={canvasAreaEl}
			class="whiteboard-canvas-area flex h-full items-center justify-center transition-all duration-200"
			class:cursor-grab={isPanToolActive && canPan && !isPanning}
			class:cursor-grabbing={isPanning}
			style="margin-right: {sidebarVisible ? SIDEBAR_WIDTH : 0}px;"
			onpointerdown={handlePanStart}
			onpointermove={handlePanMove}
			onpointerup={handlePanEnd}
			onpointercancel={handlePanEnd}
			role="application"
			aria-label="Zone de dessin"
		>
			<!-- Canvas wrapper with shadow -->
			<div
				class="whiteboard-page-wrapper relative shadow-lg transition-transform"
				style="width: {canvasWidth}px; height: {canvasHeight}px; transform: translate({panX}px, {panY}px);"
			>
				<WhiteboardCanvas class="h-full w-full" scale={effectiveScale} />
			</div>
		</div>

		<!-- Page thumbnails sidebar (right) -->
		<PageThumbnails />
	</div>

	<!-- Toolbar at bottom -->
	<WhiteboardToolbar
		{zoomLevel}
		{zoomPercent}
		onZoomIn={zoomIn}
		onZoomOut={zoomOut}
		onZoomToFit={zoomToFit}
	/>
</div>

<style>
	.whiteboard-container {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 400px;
	}

	.whiteboard-page-wrapper {
		background: white;
		border-radius: 2px;
	}

	.cursor-grab {
		cursor: grab;
	}

	.cursor-grabbing {
		cursor: grabbing;
	}
</style>
