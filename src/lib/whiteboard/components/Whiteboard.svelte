<script lang="ts">
	/**
	 * Whiteboard - Main container component
	 *
	 * Combines canvas, toolbar, and page navigation into a complete whiteboard experience.
	 * Supports zoom and pan functionality.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import WhiteboardCanvas from './WhiteboardCanvas.svelte';
	import FloatingToolbar from './FloatingToolbar.svelte';
	import AnnotationToolbar from './AnnotationToolbar.svelte';
	import StylePanel from './StylePanel.svelte';
	import PageThumbnails from './PageThumbnails.svelte';
	import FileDrawer from './FileDrawer.svelte';
	import ContextMenu from './ContextMenu.svelte';
	import TemplatePickerModal from './TemplatePickerModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Plus,
		ZoomIn,
		ZoomOut,
		ChevronLeft,
		ChevronRight,
		Maximize2,
		Minimize2,
		FolderOpen,
		PanelRight,
		PenTool
	} from 'lucide-svelte';
	import type { PageFormatKey } from '../types/document';
	import type { TemplatePageData } from '../types/templates';
	import { driveSyncService } from '../services/drive-sync';
	import { toaster } from '$lib/stores/toaster.svelte';

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

	/** Context menu reference (must be outside transformed area for correct positioning) */
	let contextMenuRef: ContextMenu | null = $state(null);

	/** WhiteboardCanvas reference (for keyboard shortcuts) */
	let canvasRef: WhiteboardCanvas | null = $state(null);

	/** Fullscreen state */
	let isFullscreen = $state(false);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/**
	 * Access store's currentPage directly for proper reactivity.
	 * IMPORTANT: Don't re-derive from whiteboardStore.document as getter access
	 * doesn't create proper reactive dependencies in Svelte 5.
	 */
	let currentPage = $derived(whiteboardStore.currentPage);

	/** Current page index */
	let currentPageIdx = $derived(whiteboardStore.currentPageIndex);

	/** Page dimensions (current, possibly expanded) */
	let pageWidth = $derived(currentPage?.width ?? 794);
	let pageHeight = $derived(currentPage?.height ?? 1123);

	/** Original page dimensions (for scale calculation - don't zoom out when expanding) */
	let originalPageWidth = $derived(currentPage?.originalWidth ?? currentPage?.width ?? 794);
	let originalPageHeight = $derived(currentPage?.originalHeight ?? currentPage?.height ?? 1123);

	/** Tool state */
	let toolState = $derived(whiteboardStore.toolState);

	/** Sync state for status indicator */
	let syncState = $derived(whiteboardStore.syncState);
	let hasUnsavedChanges = $derived(whiteboardStore.hasUnsavedChanges);

	/** Calculate base scale to fit current page in container (including expanded dimensions) */
	let fitScale = $derived.by(() => {
		if (containerWidth === 0 || containerHeight === 0) return 1;

		// Minimal padding to maximize canvas space
		const padding = 8;
		const availableWidth = containerWidth - padding * 2;
		const availableHeight = containerHeight - padding * 2;

		// Use current page dimensions so 100% zoom always fits the entire page
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

	/** Can pan (zoomed in beyond 100% OR page is expanded beyond original size) */
	let canPan = $derived(
		zoomLevel > 1 || pageWidth > originalPageWidth || pageHeight > originalPageHeight
	);

	/** Page navigation state */
	let pageCount = $derived(whiteboardStore.pageCount);
	let canGoToPrevPage = $derived(currentPageIdx > 0);
	let canGoToNextPage = $derived(currentPageIdx < pageCount - 1);

	/** Page expansion state - derived from currentPage for proper reactivity */
	let isPageExpanded = $derived(
		currentPage?.originalWidth !== undefined && currentPage?.originalHeight !== undefined
	);
	let expansionPercent = $derived.by(() => {
		if (!currentPage || !isPageExpanded) return 100;
		const origWidth = currentPage.originalWidth ?? currentPage.width;
		return Math.round((currentPage.width / origWidth) * 100);
	});

	// ==========================================================================
	// Page Navigation Methods
	// ==========================================================================

	function handlePrevPage() {
		whiteboardStore.previousPage();
	}

	function handleNextPage() {
		whiteboardStore.nextPage();
	}

	function handleAddPage() {
		whiteboardStore.addPageFromDefaultTemplate();
	}

	// ==========================================================================
	// New Document Template Methods
	// ==========================================================================

	/**
	 * Auto-save new document to Drive if class info is present
	 * This enables autosave on Drive for the newly created document
	 */
	async function autoSaveToDriveIfNeeded(): Promise<void> {
		const classInfo = whiteboardStore.getAndClearPendingClassInfo();
		if (!classInfo) return;

		const doc = whiteboardStore.document;
		if (!doc) return;

		try {
			// Get or create the class folder
			const folderId = await driveSyncService.getOrCreateClassFolder(
				classInfo.joinCode,
				classInfo.className
			);

			// Save the document to Drive
			const result = await driveSyncService.saveToDrive({
				document: doc,
				fileName: doc.title || 'Sans titre',
				folderId
			});

			if (result.success && result.fileId) {
				// Connect to Drive with the new file ID
				whiteboardStore.connectToDrive(result.fileId, folderId);
				toaster.success('Document sauvegardé sur Drive');
				console.log('[Whiteboard] Auto-saved new document to Drive:', result.fileId);
			} else {
				console.error('[Whiteboard] Failed to auto-save to Drive:', result.error);
				toaster.error('Erreur lors de la sauvegarde sur Drive');
			}
		} catch (error) {
			console.error('[Whiteboard] Error auto-saving to Drive:', error);
			toaster.error('Erreur lors de la sauvegarde sur Drive');
		}
	}

	function handleNewDocumentTemplateSelect(pageData: TemplatePageData) {
		// Create document with the selected template as first page
		const docTitle = whiteboardStore.newDocumentTitle || title;
		whiteboardStore.createNew(docTitle, format);
		// Replace the empty first page with template content
		const doc = whiteboardStore.document;
		if (doc && doc.pages.length > 0) {
			// Add template page first (now we have 2 pages)
			whiteboardStore.addPageFromPageData(pageData);
			// Delete the empty first page (now allowed since we have 2 pages)
			whiteboardStore.deletePage(0);
			whiteboardStore.setDefaultTemplate(pageData);
		}
		whiteboardStore.closeNewDocumentPicker();

		// Auto-save to Drive if class was selected
		autoSaveToDriveIfNeeded();
	}

	function handleNewDocumentPickerClose() {
		// Create empty document if picker is closed without selection
		const docTitle = whiteboardStore.newDocumentTitle || title;
		whiteboardStore.createNew(docTitle, format);
		whiteboardStore.closeNewDocumentPicker();

		// Auto-save to Drive if class was selected
		autoSaveToDriveIfNeeded();
	}

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

	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
	}

	function clampPan() {
		// Allow pan if zoomed in OR if page is expanded
		const isExpanded = pageWidth > originalPageWidth || pageHeight > originalPageHeight;
		if (zoomLevel <= 1 && !isExpanded) {
			panX = 0;
			panY = 0;
			return;
		}

		// Calculate max pan range based on how much the canvas exceeds the viewport
		const viewportWidth = containerWidth;
		const viewportHeight = containerHeight - 80; // Account for status bar and toolbar

		const maxPanX = Math.max(0, (canvasWidth - viewportWidth) / 2 + 20);
		const maxPanY = Math.max(0, (canvasHeight - viewportHeight) / 2 + 20);

		panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
		panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
	}

	// ==========================================================================
	// Pan Handlers
	// ==========================================================================

	/** Track if current pan is for page expansion (started from edge) */
	let isPanningForExpansion = $state(false);
	/** Last position for incremental expansion calculation */
	let lastExpansionX = $state(0);
	let lastExpansionY = $state(0);

	function handlePanStart(e: PointerEvent) {
		if (!isPanToolActive) return;

		// Get click position relative to canvas area
		const rect = canvasAreaEl?.getBoundingClientRect();
		if (!rect) return;

		// Calculate position in page coordinates
		const clickX = e.clientX - rect.left - rect.width / 2 + canvasWidth / 2;
		const clickY = e.clientY - rect.top - rect.height / 2 + canvasHeight / 2;

		// Convert to page coordinates (accounting for scale)
		const pageX = clickX / effectiveScale;
		const pageY = clickY / effectiveScale;

		// Check if click is near right or bottom edge of page (within 50px)
		const nearRightEdge = pageX > pageWidth - 50 && pageX <= pageWidth + 20;
		const nearBottomEdge = pageY > pageHeight - 50 && pageY <= pageHeight + 20;
		const isOnEdge = nearRightEdge || nearBottomEdge;

		// Allow pan if zoomed in OR if starting from page edge (for expansion)
		if (!canPan && !isOnEdge) return;

		e.preventDefault();
		isPanning = true;
		isPanningForExpansion = isOnEdge && !canPan; // Track if this is expansion-only pan
		panStartX = e.clientX;
		panStartY = e.clientY;
		panStartOffsetX = panX;
		panStartOffsetY = panY;
		// Initialize incremental tracking for expansion
		lastExpansionX = e.clientX;
		lastExpansionY = e.clientY;

		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePanMove(e: PointerEvent) {
		if (!isPanning) return;

		const dx = e.clientX - panStartX;
		const dy = e.clientY - panStartY;

		// If panning for expansion only (started from edge at 100% zoom)
		if (isPanningForExpansion) {
			// Calculate incremental movement since last frame
			const incrementalDx = e.clientX - lastExpansionX;
			const incrementalDy = e.clientY - lastExpansionY;

			// Update last position for next frame
			lastExpansionX = e.clientX;
			lastExpansionY = e.clientY;

			// Convert to page coordinates
			const moveX = incrementalDx / effectiveScale;
			const moveY = incrementalDy / effectiveScale;

			// Drag LEFT (negative dx) to expand RIGHT, drag UP (negative dy) to expand DOWN
			// This is like "unrolling" the paper
			if (moveX < 0 || moveY < 0) {
				// Convert negative movement to positive expansion delta
				const expandX = Math.max(0, -moveX);
				const expandY = Math.max(0, -moveY);

				// Use progressive expansion (not max)
				whiteboardStore.expandPageByDeltaAmount(expandX, expandY);
			}
			return; // Don't do normal pan
		}

		// Normal pan behavior (when zoomed in)
		const newPanX = panStartOffsetX + dx;
		const newPanY = panStartOffsetY + dy;

		// Check if trying to pan beyond the page edge (towards bottom-right)
		const viewportWidth = containerWidth;
		const viewportHeight = containerHeight - 80;

		// Calculate the normal pan limits
		const normalMaxPanX = Math.max(0, (canvasWidth - viewportWidth) / 2 + 20);
		const normalMaxPanY = Math.max(0, (canvasHeight - viewportHeight) / 2 + 20);

		// If panning beyond bottom-right edge, try to expand the page
		if (newPanX < -normalMaxPanX || newPanY < -normalMaxPanY) {
			const beyondX = newPanX < -normalMaxPanX ? (-normalMaxPanX - newPanX) / effectiveScale : 0;
			const beyondY = newPanY < -normalMaxPanY ? (-normalMaxPanY - newPanY) / effectiveScale : 0;

			if (beyondX > 0 || beyondY > 0) {
				// Use progressive expansion (not max)
				const expanded = whiteboardStore.expandPageByDeltaAmount(beyondX, beyondY);

				if (expanded) {
					panX = 0;
					panY = 0;
					panStartOffsetX = 0;
					panStartOffsetY = 0;
					panStartX = e.clientX;
					panStartY = e.clientY;
					return;
				}
			}
		}

		panX = newPanX;
		panY = newPanY;
		clampPan();
	}

	function handlePanEnd(e: PointerEvent) {
		if (isPanning) {
			isPanning = false;
			isPanningForExpansion = false;
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
	// Edge Scroll Handler (auto-pan when dragging near viewport edges)
	// ==========================================================================

	function handleEdgeScroll(dx: number, dy: number): { dx: number; dy: number } {
		const oldPanX = panX;
		const oldPanY = panY;

		// Update pan position (negative because we're moving the canvas, not the viewport)
		panX -= dx;
		panY -= dy;
		clampPan();

		// Return actual pan change (may be less than requested due to clamping)
		return {
			dx: oldPanX - panX,
			dy: oldPanY - panY
		};
	}

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	onMount(() => {
		// Try to restore from autosave first, otherwise show template picker
		const restoredFromAutosave = whiteboardStore.loadFromAutosave();
		if (!restoredFromAutosave) {
			// Show template picker for new document
			whiteboardStore.openNewDocumentPicker(title);
		}

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

	// Handle body scroll when fullscreen
	$effect(() => {
		if (!browser || !document.body) return;

		document.body.style.overflow = isFullscreen ? 'hidden' : '';

		// Cleanup on unmount
		return () => {
			if (document.body) {
				document.body.style.overflow = '';
			}
		};
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

		// Copy: Ctrl+C
		if (isCtrl && e.key === 'c' && !e.shiftKey) {
			if (whiteboardStore.hasSelection) {
				e.preventDefault();
				whiteboardStore.copySelected();
				return;
			}
		}

		// Cut: Ctrl+X
		if (isCtrl && e.key === 'x') {
			if (whiteboardStore.hasSelection) {
				e.preventDefault();
				whiteboardStore.cutSelected();
				return;
			}
		}

		// Paste: Ctrl+V
		if (isCtrl && e.key === 'v' && !e.shiftKey) {
			if (whiteboardStore.hasClipboard) {
				e.preventDefault();
				whiteboardStore.paste();
				return;
			}
		}

		// Select all: Ctrl+A
		if (isCtrl && e.key === 'a') {
			e.preventDefault();
			whiteboardStore.selectAll();
			return;
		}

		// Group: Ctrl+G
		if (isCtrl && e.key === 'g' && !e.shiftKey) {
			if (whiteboardStore.canGroup) {
				e.preventDefault();
				whiteboardStore.groupSelected();
				return;
			}
		}

		// Ungroup: Ctrl+Shift+G
		if (isCtrl && e.key === 'g' && e.shiftKey) {
			if (whiteboardStore.hasSelectedGroups) {
				e.preventDefault();
				whiteboardStore.ungroupSelected();
				return;
			}
		}

		// Alignment shortcuts: Ctrl+Shift+L/R/T/B (2+ elements selected)
		if (isCtrl && e.shiftKey && whiteboardStore.canAlign) {
			switch (e.key.toLowerCase()) {
				case 'l':
					e.preventDefault();
					whiteboardStore.alignSelectedHorizontal('left');
					return;
				case 'r':
					e.preventDefault();
					whiteboardStore.alignSelectedHorizontal('right');
					return;
				case 't':
					e.preventDefault();
					whiteboardStore.alignSelectedVertical('top');
					return;
				case 'b':
					e.preventDefault();
					whiteboardStore.alignSelectedVertical('bottom');
					return;
			}
		}

		// Annotation mode toggle: Ctrl+Shift+A
		if (isCtrl && e.shiftKey && e.key.toLowerCase() === 'a') {
			e.preventDefault();
			whiteboardStore.toggleAnnotationMode();
			return;
		}

		// Toggle annotations visibility: Ctrl+H (when in annotation mode)
		if (isCtrl && e.key.toLowerCase() === 'h' && whiteboardStore.isAnnotationMode) {
			e.preventDefault();
			whiteboardStore.toggleAnnotationsVisible();
			return;
		}

		// Annotation tool shortcuts (only when in annotation mode)
		if (whiteboardStore.isAnnotationMode && !isCtrl && !e.altKey && !e.shiftKey) {
			switch (e.key.toLowerCase()) {
				case 'v':
					e.preventDefault();
					whiteboardStore.setAnnotationTool('annotation-select');
					return;
				case 'p':
					e.preventDefault();
					whiteboardStore.setAnnotationTool('annotation-pen');
					return;
				case 'm':
					e.preventDefault();
					whiteboardStore.setAnnotationTool('annotation-marker');
					return;
				case 'h':
					e.preventDefault();
					whiteboardStore.setAnnotationTool('annotation-highlighter');
					return;
				case 'e':
					e.preventDefault();
					whiteboardStore.setAnnotationTool('annotation-eraser');
					return;
				case 'l':
					e.preventDefault();
					whiteboardStore.setAnnotationTool('annotation-line');
					return;
				case 'r':
					e.preventDefault();
					whiteboardStore.setAnnotationTool('annotation-rectangle');
					return;
				case 'c':
					e.preventDefault();
					whiteboardStore.setAnnotationTool('annotation-circle');
					return;
				case 'a':
					e.preventDefault();
					whiteboardStore.setAnnotationTool('annotation-arrow');
					return;
				case 't':
					e.preventDefault();
					whiteboardStore.setAnnotationTool('annotation-stamp');
					return;
			}
		}

		// Selection shortcuts (no modifier needed)
		// Delete selected elements
		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (whiteboardStore.hasSelection) {
				e.preventDefault();
				whiteboardStore.deleteSelected();
				return;
			}
		}

		// Start typing to edit shape label when a single shape is selected
		// Triggers on printable characters (length 1) or Enter
		if (!isCtrl && !e.altKey && whiteboardStore.selectedIds.size === 1) {
			const selectedId = [...whiteboardStore.selectedIds][0];
			const selectedElement = whiteboardStore.currentPage?.elements.find(
				(el) => el.id === selectedId
			);
			if (selectedElement?.type === 'shape') {
				// Check if key is a printable character or Enter
				if (e.key.length === 1 || e.key === 'Enter') {
					e.preventDefault();
					// Pass the character if it's printable (not Enter)
					const initialChar = e.key.length === 1 ? e.key : undefined;
					canvasRef?.startEditingShapeLabel(selectedId, initialChar);
					return;
				}
			}
		}

		// Escape - exit annotation mode, fullscreen, or clear selection
		if (e.key === 'Escape') {
			// First priority: exit annotation mode
			if (whiteboardStore.isAnnotationMode) {
				e.preventDefault();
				whiteboardStore.exitAnnotationMode();
				return;
			}
			if (isFullscreen) {
				e.preventDefault();
				isFullscreen = false;
				return;
			}
			if (whiteboardStore.hasSelection) {
				e.preventDefault();
				whiteboardStore.clearSelection();
				return;
			}
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
				case 'm':
					e.preventDefault();
					whiteboardStore.setTool('marker');
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
				case 'z':
					e.preventDefault();
					whiteboardStore.setTool('laser');
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
	class={isFullscreen
		? 'fixed inset-0 z-50 grid grid-rows-[auto_1fr] bg-gray-200'
		: `whiteboard-container grid grid-rows-[auto_1fr] bg-gray-200 ${className}`}
	onwheel={handleWheel}
>
	<!-- Top bar -->
	<div
		class="whiteboard-topbar flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-1.5 text-xs text-gray-600"
	>
		<!-- Left: FileDrawer toggle + Document info -->
		<div class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
			<!-- FileDrawer toggle -->
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={() => whiteboardStore.toggleFileDrawer()}
				title="Fichiers (Ctrl+O)"
				aria-label="Ouvrir les fichiers"
				class="h-7 w-7 flex-shrink-0 p-0"
			>
				<FolderOpen class="h-4 w-4" />
			</Button>

			<!-- Document title with sync indicator -->
			<div class="flex min-w-0 items-center gap-1.5">
				{#if hasUnsavedChanges || syncState.status === 'modified'}
					<span
						class="h-2 w-2 flex-shrink-0 rounded-full bg-orange-500"
						title="Modifications non sauvegardées"
					></span>
				{/if}
				<span class="truncate font-medium">{whiteboardStore.document?.title ?? 'Sans titre'}</span>
			</div>

			<span class="flex-shrink-0 text-muted-foreground">
				Page {currentPageIdx + 1}/{pageCount}
			</span>
			<span class="hidden flex-shrink-0 text-muted-foreground sm:inline"
				>{pageWidth}×{pageHeight}</span
			>
			{#if isPageExpanded}
				<button
					type="button"
					onclick={() => whiteboardStore.resetPageToOriginal()}
					class="flex-shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 transition-colors hover:bg-blue-200"
					title="Page étendue à {expansionPercent}% - Cliquer pour remettre à la taille originale"
				>
					Étendue
				</button>
			{/if}
		</div>

		<!-- Right: Actions -->
		<div class="flex flex-shrink-0 items-center gap-1">
			<!-- Annotation mode toggle -->
			<Button
				type="button"
				variant={whiteboardStore.isAnnotationMode ? 'default' : 'ghost'}
				size="sm"
				onclick={() => whiteboardStore.toggleAnnotationMode()}
				title="Mode annotation (Ctrl+Shift+A)"
				aria-label="Mode annotation"
				class="h-7 w-7 p-0"
			>
				<PenTool class="h-4 w-4" />
			</Button>

			<!-- Add page button -->
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleAddPage}
				title="Ajouter une page"
				aria-label="Ajouter une page"
				class="h-7 w-7 p-0"
			>
				<Plus class="h-4 w-4" />
			</Button>

			<div class="mx-1 h-4 w-px bg-border"></div>

			<!-- Zoom controls -->
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={zoomOut}
				title="Zoom arrière (Ctrl+-)"
				aria-label="Zoom arrière"
				class="h-7 w-7 p-0"
			>
				<ZoomOut class="h-4 w-4" />
			</Button>
			<button
				type="button"
				onclick={zoomToFit}
				class="min-w-[3rem] rounded-md px-1.5 py-0.5 text-xs font-medium hover:bg-accent"
				title="Ajuster à la fenêtre (Ctrl+0)"
				aria-label="Zoom: {zoomPercent}%"
			>
				{zoomPercent}%
			</button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={zoomIn}
				title="Zoom avant (Ctrl++)"
				aria-label="Zoom avant"
				class="h-7 w-7 p-0"
			>
				<ZoomIn class="h-4 w-4" />
			</Button>

			<div class="mx-1 h-4 w-px bg-border"></div>

			<!-- Page navigation -->
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handlePrevPage}
				disabled={!canGoToPrevPage}
				title="Page précédente (Page Up)"
				aria-label="Page précédente"
				class="h-7 w-7 p-0"
			>
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleNextPage}
				disabled={!canGoToNextPage}
				title="Page suivante (Page Down)"
				aria-label="Page suivante"
				class="h-7 w-7 p-0"
			>
				<ChevronRight class="h-4 w-4" />
			</Button>

			<div class="mx-1 h-4 w-px bg-border"></div>

			<!-- Thumbnails toggle -->
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={() => whiteboardStore.toggleSidebar()}
				title="Miniatures"
				aria-label="Afficher les miniatures"
				class="h-7 w-7 p-0"
			>
				<PanelRight class="h-4 w-4" />
			</Button>

			<!-- Fullscreen toggle -->
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={toggleFullscreen}
				title={isFullscreen ? 'Quitter le plein écran (Echap)' : 'Plein écran'}
				aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
				class="h-7 w-7 p-0"
			>
				{#if isFullscreen}
					<Minimize2 class="h-4 w-4" />
				{:else}
					<Maximize2 class="h-4 w-4" />
				{/if}
			</Button>
		</div>
	</div>

	<!-- Main content area with sidebars -->
	<div class="whiteboard-main relative min-h-0 overflow-hidden">
		<!-- File Drawer (left) -->
		<FileDrawer />

		<!-- Canvas area -->
		<div
			bind:this={canvasAreaEl}
			class="whiteboard-canvas-area flex h-full items-center justify-center"
			class:cursor-grab={isPanToolActive && canPan && !isPanning}
			class:cursor-grabbing={isPanning}
			onpointerdown={handlePanStart}
			onpointermove={handlePanMove}
			onpointerup={handlePanEnd}
			onpointercancel={handlePanEnd}
			role="application"
			aria-label="Zone de dessin"
		>
			<!-- Canvas wrapper with shadow -->
			<div
				class="whiteboard-page-wrapper relative shrink-0 shadow-lg"
				class:transition-transform={!isPanning}
				style="width: {canvasWidth}px; height: {canvasHeight}px; transform: translate({panX}px, {panY}px);"
			>
				<WhiteboardCanvas
					bind:this={canvasRef}
					class="h-full w-full"
					scale={effectiveScale}
					{contextMenuRef}
					onEdgeScroll={handleEdgeScroll}
				/>
			</div>
		</div>

		<!-- Context Menu (rendered outside transformed area for correct fixed positioning) -->
		<ContextMenu bind:this={contextMenuRef} />

		<!-- Style Panel (left side) -->
		<StylePanel />

		<!-- Floating Toolbar (bottom center) - hidden in annotation mode -->
		{#if !whiteboardStore.isAnnotationMode}
			<FloatingToolbar />
		{/if}

		<!-- Annotation Toolbar (bottom center, shown in annotation mode) -->
		<AnnotationToolbar />

		<!-- Page thumbnails sidebar (right) -->
		<PageThumbnails />
	</div>
</div>

<!-- Template Picker Modal for new documents -->
<TemplatePickerModal
	open={whiteboardStore.newDocumentPickerOpen}
	onSelect={handleNewDocumentTemplateSelect}
	onClose={handleNewDocumentPickerClose}
/>

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
