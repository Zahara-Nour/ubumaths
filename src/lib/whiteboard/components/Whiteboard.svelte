<script lang="ts">
	/**
	 * Whiteboard - Main container component
	 *
	 * Combines canvas, toolbar (future), and page navigation into a complete whiteboard experience.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import WhiteboardCanvas from './WhiteboardCanvas.svelte';
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
	// State
	// ==========================================================================

	/** Container element reference */
	let containerEl: HTMLDivElement | null = $state(null);

	/** Container dimensions */
	let containerWidth = $state(0);
	let containerHeight = $state(0);

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

	/** History state */
	let canUndo = $derived(whiteboardStore.canUndo);
	let canRedo = $derived(whiteboardStore.canRedo);

	/** Calculate scale to fit page in container with padding */
	let fitScale = $derived.by(() => {
		if (containerWidth === 0 || containerHeight === 0) return 1;

		const padding = 40; // pixels of padding around the page
		const availableWidth = containerWidth - padding * 2;
		const availableHeight = containerHeight - padding * 2;

		const scaleX = availableWidth / pageWidth;
		const scaleY = availableHeight / pageHeight;

		return Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
	});

	/** Calculated canvas dimensions */
	let canvasWidth = $derived(Math.round(pageWidth * fitScale));
	let canvasHeight = $derived(Math.round(pageHeight * fitScale));

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
		// Don't handle if in an input field
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			return;
		}

		const isCtrl = e.ctrlKey || e.metaKey;

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

		// Tool shortcuts (when no modifier)
		if (!isCtrl && !e.altKey && !e.shiftKey) {
			switch (e.key.toLowerCase()) {
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
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
	bind:this={containerEl}
	class="whiteboard-container flex flex-col items-center justify-center bg-gray-200 {className}"
>
	<!-- Status bar -->
	<div
		class="whiteboard-status absolute top-2 left-2 flex items-center gap-4 text-xs text-gray-600"
	>
		<span class="font-medium">{document?.title ?? 'Sans titre'}</span>
		<span>
			Page {(whiteboardStore.document?.currentPageIndex ?? 0) + 1} / {document?.pages.length ?? 1}
		</span>
		<span>{pageWidth} × {pageHeight}</span>
		<span class="capitalize">{toolState.toolType}</span>
	</div>

	<!-- Undo/Redo indicators -->
	<div class="absolute top-2 right-2 flex items-center gap-2 text-xs text-gray-500">
		<span class:opacity-30={!canUndo}>Undo</span>
		<span class:opacity-30={!canRedo}>Redo</span>
	</div>

	<!-- Canvas wrapper with shadow -->
	<div
		class="whiteboard-page-wrapper relative shadow-lg"
		style="width: {canvasWidth}px; height: {canvasHeight}px;"
	>
		<WhiteboardCanvas class="h-full w-full" />
	</div>

	<!-- Keyboard shortcuts hint -->
	<div class="absolute bottom-2 left-2 text-xs text-gray-400">
		<kbd class="rounded bg-gray-100 px-1">P</kbd> Pen
		<kbd class="ml-2 rounded bg-gray-100 px-1">H</kbd> Highlighter
		<kbd class="ml-2 rounded bg-gray-100 px-1">E</kbd> Eraser
		<kbd class="ml-2 rounded bg-gray-100 px-1">L</kbd> Line
		<kbd class="ml-2 rounded bg-gray-100 px-1">R</kbd> Rect
		<kbd class="ml-2 rounded bg-gray-100 px-1">C</kbd> Circle
		<kbd class="ml-2 rounded bg-gray-100 px-1">A</kbd> Arrow
	</div>
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
</style>
