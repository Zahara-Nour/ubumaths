<script lang="ts">
	/**
	 * PageThumbnails - Sidebar with page thumbnails
	 *
	 * Features:
	 * - Thumbnail preview of each page
	 * - Click to navigate
	 * - Drag & drop to reorder
	 * - Add/delete pages
	 * - Collapsible sidebar
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type { Page } from '../types/document';
	import { Button } from '$lib/components/ui/button';
	import { Plus, X, ChevronLeft, ChevronRight, GripVertical } from 'lucide-svelte';

	// ==========================================================================
	// Constants
	// ==========================================================================

	const THUMBNAIL_WIDTH = 100;

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Optional class for styling */
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Drag & drop state */
	let isDragging = $state(false);
	let draggedIndex = $state<number | null>(null);
	let dropTargetIndex = $state<number | null>(null);

	// ==========================================================================
	// Derived
	// ==========================================================================

	let pages = $derived(whiteboardStore.document?.pages ?? []);
	let currentPageIndex = $derived(whiteboardStore.currentPageIndex);
	let sidebarVisible = $derived(whiteboardStore.sidebarVisible);

	// Reset drag state on window blur (handles interrupted drags)
	$effect(() => {
		const handleBlur = () => {
			if (isDragging) {
				resetDragState();
			}
		};

		window.addEventListener('blur', handleBlur);
		return () => window.removeEventListener('blur', handleBlur);
	});

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handlePageClick(index: number) {
		if (isDragging) return;
		whiteboardStore.goToPage(index);
	}

	function handleAddPage() {
		whiteboardStore.addPage();
	}

	function handleDeletePage(index: number, e: MouseEvent) {
		e.stopPropagation();

		if (pages.length <= 1) return;

		const confirmDelete = confirm(`Voulez-vous vraiment supprimer la page ${index + 1} ?`);

		if (confirmDelete) {
			whiteboardStore.deletePage(index);
		}
	}

	function toggleSidebar() {
		whiteboardStore.toggleSidebar();
	}

	// ==========================================================================
	// Keyboard Handlers
	// ==========================================================================

	function handleThumbnailKeyDown(e: KeyboardEvent, index: number) {
		const isCtrl = e.ctrlKey || e.metaKey;

		// Ctrl+Arrow keys to reorder pages
		if (isCtrl && e.key === 'ArrowUp' && index > 0) {
			e.preventDefault();
			whiteboardStore.reorderPages(index, index - 1);
		} else if (isCtrl && e.key === 'ArrowDown' && index < pages.length - 1) {
			e.preventDefault();
			whiteboardStore.reorderPages(index, index + 1);
		}

		// Enter or Space to select page
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handlePageClick(index);
		}

		// Delete key to delete page
		if (e.key === 'Delete' && pages.length > 1) {
			e.preventDefault();
			const confirmDelete = confirm(`Voulez-vous vraiment supprimer la page ${index + 1} ?`);
			if (confirmDelete) {
				whiteboardStore.deletePage(index);
			}
		}
	}

	// ==========================================================================
	// Drag & Drop Handlers
	// ==========================================================================

	function handleDragStart(e: DragEvent, index: number) {
		if (!e.dataTransfer) return;

		isDragging = true;
		draggedIndex = index;

		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', String(index));

		// Add drag image
		const target = e.currentTarget as HTMLElement;
		if (target) {
			e.dataTransfer.setDragImage(target, 50, 50);
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (!e.dataTransfer) return;

		e.dataTransfer.dropEffect = 'move';
		dropTargetIndex = index;
	}

	function handleDragLeave() {
		// Only clear if we're leaving the drop zone entirely
		// This prevents flickering when moving between elements
	}

	function handleDrop(e: DragEvent, toIndex: number) {
		e.preventDefault();

		if (draggedIndex !== null && draggedIndex !== toIndex) {
			whiteboardStore.reorderPages(draggedIndex, toIndex);
		}

		resetDragState();
	}

	function handleDragEnd() {
		resetDragState();
	}

	function resetDragState() {
		isDragging = false;
		draggedIndex = null;
		dropTargetIndex = null;
	}

	// ==========================================================================
	// Thumbnail Rendering
	// ==========================================================================

	function calculateThumbnailHeight(page: Page): number {
		const aspectRatio = page.height / page.width;
		return Math.round(THUMBNAIL_WIDTH * aspectRatio);
	}

	function getPageElementCounts(page: Page): { strokes: number; shapes: number; texts: number } {
		const strokes = page.elements.filter((el) => el.type === 'stroke').length;
		const shapes = page.elements.filter((el) => el.type === 'shape').length;
		const texts = page.elements.filter((el) => el.type === 'textblock').length;
		return { strokes, shapes, texts };
	}
</script>

<!-- Toggle button (always visible) -->
<button
	type="button"
	class="sidebar-toggle absolute top-1/2 right-0 z-10 -translate-y-1/2 rounded-l-md border border-r-0 border-border bg-background p-1 shadow-sm transition-transform hover:bg-accent"
	class:translate-x-0={!sidebarVisible}
	class:-translate-x-[180px]={sidebarVisible}
	onclick={toggleSidebar}
	aria-label={sidebarVisible ? 'Masquer les pages' : 'Afficher les pages'}
	aria-expanded={sidebarVisible}
>
	{#if sidebarVisible}
		<ChevronRight class="h-4 w-4" />
	{:else}
		<ChevronLeft class="h-4 w-4" />
	{/if}
</button>

<!-- Sidebar -->
<aside
	class="page-thumbnails-sidebar flex h-full w-[180px] flex-col border-l border-border bg-muted/30 transition-transform duration-200 {className}"
	class:translate-x-0={sidebarVisible}
	class:translate-x-full={!sidebarVisible}
	aria-label="Navigation des pages"
>
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-border px-3 py-2">
		<span class="text-sm font-medium">Pages</span>
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
	</div>

	<!-- Thumbnails list -->
	<div class="flex-1 overflow-y-auto p-2">
		<div class="flex flex-col gap-2" role="list" aria-label="Liste des pages">
			{#each pages as page, index (page.id)}
				{@const thumbnailHeight = calculateThumbnailHeight(page)}
				{@const counts = getPageElementCounts(page)}
				{@const isActive = index === currentPageIndex}
				{@const isDropTarget = dropTargetIndex === index && draggedIndex !== index}

				<div
					class="thumbnail-item group relative cursor-pointer rounded-md border-2 transition-all {isActive
						? 'border-primary ring-2 ring-primary/30'
						: ''} {!isActive && !isDropTarget ? 'border-border' : ''} {isDropTarget
						? 'border-dashed border-blue-400 bg-blue-50'
						: ''}"
					class:opacity-50={isDragging && draggedIndex === index}
					draggable="true"
					ondragstart={(e) => handleDragStart(e, index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, index)}
					ondragend={handleDragEnd}
					onclick={() => handlePageClick(index)}
					onkeydown={(e) => handleThumbnailKeyDown(e, index)}
					tabindex="0"
					role="listitem"
					aria-label="Page {index + 1}{isActive ? ' (active)' : ''}. Ctrl+flèches pour réordonner."
					aria-current={isActive ? 'page' : undefined}
				>
					<!-- Drag handle -->
					<div
						class="absolute top-1/2 left-1 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
						aria-hidden="true"
					>
						<GripVertical class="h-4 w-4 text-muted-foreground" />
					</div>

					<!-- Thumbnail preview -->
					<div
						class="thumbnail-preview mx-auto overflow-hidden rounded bg-white"
						style="width: {THUMBNAIL_WIDTH}px; height: {thumbnailHeight}px;"
					>
						<!-- Mini SVG preview of page content -->
						<svg viewBox="0 0 {page.width} {page.height}" class="h-full w-full" aria-hidden="true">
							<!-- Background -->
							<rect
								x="0"
								y="0"
								width={page.width}
								height={page.height}
								fill={page.background.type === 'plain' ? page.background.color : '#ffffff'}
							/>

							<!-- Simplified content preview -->
							{#each page.elements as element (element.id)}
								{#if element.type === 'stroke' && element.points?.length > 0}
									<!-- Simplified stroke as dots -->
									<circle
										cx={element.points[0].x}
										cy={element.points[0].y}
										r="10"
										fill={element.color}
										opacity={element.opacity}
									/>
								{:else if element.type === 'shape' && element.start && element.end}
									<!-- Simplified shape -->
									<rect
										x={Math.min(element.start.x, element.end.x)}
										y={Math.min(element.start.y, element.end.y)}
										width={Math.abs(element.end.x - element.start.x)}
										height={Math.abs(element.end.y - element.start.y)}
										fill="none"
										stroke={element.color}
										stroke-width="5"
									/>
								{:else if element.type === 'textblock' && element.position}
									<!-- Simplified text block -->
									<rect
										x={element.position.x}
										y={element.position.y}
										width={element.width}
										height={element.height}
										fill="#f0f0f0"
										stroke="#ccc"
										stroke-width="2"
									/>
								{/if}
							{/each}
						</svg>
					</div>

					<!-- Page number -->
					<div class="py-1 text-center text-xs text-muted-foreground">
						{index + 1}
						{#if counts.strokes + counts.shapes + counts.texts > 0}
							<span class="ml-1 text-[10px] opacity-70">
								({counts.strokes + counts.shapes + counts.texts})
							</span>
						{/if}
					</div>

					<!-- Delete button -->
					{#if pages.length > 1}
						<button
							type="button"
							class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-destructive/90"
							onclick={(e) => handleDeletePage(index, e)}
							title="Supprimer la page {index + 1}"
							aria-label="Supprimer la page {index + 1}"
						>
							<X class="h-3 w-3" />
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Footer with page count -->
	<div class="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
		{pages.length} page{pages.length > 1 ? 's' : ''}
	</div>
</aside>

<style>
	.page-thumbnails-sidebar {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
	}

	.thumbnail-item:hover {
		background-color: rgba(0, 0, 0, 0.02);
	}

	.thumbnail-preview {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	/* Drag state */
	.thumbnail-item[draggable='true']:active {
		cursor: grabbing;
	}
</style>
