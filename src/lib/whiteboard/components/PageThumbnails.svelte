<script lang="ts">
	/**
	 * PageThumbnails - Sheet overlay with page thumbnails
	 *
	 * Features:
	 * - Thumbnail preview of each page
	 * - Click to navigate
	 * - Drag & drop to reorder
	 * - Add/delete pages (blank or from template)
	 * - Sheet overlay (doesn't reduce canvas width)
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type { Page, ShapeElement, StrokeElement, ImageElement, Point } from '../types/document';
	import { getStrokeDashArray } from '../types/document';
	import { getShapeSvgProps } from '../core/shapes';
	import { smoothStroke, getToolOptions, pointsToSvgPath } from '../core/stroke-smoothing';
	import { Button } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Plus, X, GripVertical, PanelRightOpen, FileText, LayoutTemplate } from 'lucide-svelte';
	import TemplatePickerModal from './TemplatePickerModal.svelte';
	import type { TemplatePageData } from '../types/templates';

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

	/** Template picker modal state */
	let templatePickerOpen = $state(false);

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

	function handleAddFromTemplate() {
		templatePickerOpen = true;
	}

	function handleTemplateSelect(pageData: TemplatePageData) {
		whiteboardStore.addPageFromPageData(pageData);
	}

	function handleTemplatePickerClose() {
		templatePickerOpen = false;
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

	/**
	 * Handle Sheet open/close
	 */
	function handleOpenChange(open: boolean) {
		if (open !== sidebarVisible) {
			whiteboardStore.toggleSidebar();
		}
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

	/**
	 * Get SVG path for a stroke element
	 */
	function getStrokePath(stroke: StrokeElement): string {
		const options = getToolOptions(stroke.toolType, stroke.width, stroke.color, stroke.opacity);
		const outlinePoints = smoothStroke(stroke.points as Point[], options);
		return pointsToSvgPath(outlinePoints);
	}
</script>

<!-- Toggle button (always visible, fixed on right edge) -->
<button
	type="button"
	class="absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-md border border-border bg-background p-2 shadow-sm transition-all hover:bg-accent"
	onclick={toggleSidebar}
	aria-label="Ouvrir les pages"
>
	<PanelRightOpen class="h-5 w-5" />
</button>

<!-- Sheet overlay (preventScroll=false to avoid layout shift) -->
<Sheet.Root open={sidebarVisible} onOpenChange={handleOpenChange} preventScroll={false}>
	<Sheet.Content side="right" class="w-[200px] {className}">
		<Sheet.Header class="border-b pb-3">
			<div class="flex items-center justify-between pr-8">
				<Sheet.Title class="text-sm font-medium">Pages</Sheet.Title>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								type="button"
								variant="ghost"
								size="sm"
								title="Ajouter une page"
								aria-label="Ajouter une page"
								class="h-7 w-7 p-0"
							>
								<Plus class="h-4 w-4" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item onclick={handleAddPage}>
							<FileText class="mr-2 h-4 w-4" />
							Page vide
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={handleAddFromTemplate}>
							<LayoutTemplate class="mr-2 h-4 w-4" />
							Depuis un modele...
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</Sheet.Header>

		<!-- Thumbnails list -->
		<div class="flex-1 overflow-y-auto py-2">
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
						aria-label="Page {index + 1}{isActive
							? ' (active)'
							: ''}. Ctrl+flèches pour réordonner."
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
							<svg
								viewBox="0 0 {page.width} {page.height}"
								class="h-full w-full"
								aria-hidden="true"
							>
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
										<!-- Real stroke rendering -->
										{@const stroke = element as StrokeElement}
										{@const strokePath = getStrokePath(stroke)}
										<path
											d={strokePath}
											fill={stroke.color}
											fill-opacity={stroke.opacity}
											stroke="none"
										/>
									{:else if element.type === 'shape' && element.start && element.end}
										<!-- Real shape rendering -->
										{@const shape = element as ShapeElement}
										{@const props = getShapeSvgProps(
											shape.shapeType,
											shape.start,
											shape.end,
											shape.cornerRadius ?? 0
										)}
										{@const dashArray = getStrokeDashArray(
											shape.strokeStyle ?? 'solid',
											shape.strokeWidth
										)}
										{@const shapeCx = (shape.start.x + shape.end.x) / 2}
										{@const shapeCy = (shape.start.y + shape.end.y) / 2}
										{@const rotation = shape.rotation ?? 0}
										{@const fillValue =
											shape.fillMode === 'solid' ? (shape.fill ?? 'none') : 'none'}
										{#if props.type === 'line'}
											<line
												x1={props.x1}
												y1={props.y1}
												x2={props.x2}
												y2={props.y2}
												stroke={shape.color}
												stroke-width={shape.strokeWidth}
												stroke-linecap="round"
												stroke-dasharray={dashArray}
												opacity={shape.opacity}
												transform={rotation
													? `rotate(${rotation} ${shapeCx} ${shapeCy})`
													: undefined}
											/>
										{:else if props.type === 'rect'}
											<rect
												x={props.x}
												y={props.y}
												width={props.width}
												height={props.height}
												rx={props.cornerRadius}
												ry={props.cornerRadius}
												fill={fillValue}
												stroke={shape.color}
												stroke-width={shape.strokeWidth}
												stroke-dasharray={dashArray}
												opacity={shape.opacity}
												transform={rotation
													? `rotate(${rotation} ${shapeCx} ${shapeCy})`
													: undefined}
											/>
										{:else if props.type === 'ellipse'}
											<ellipse
												cx={props.cx}
												cy={props.cy}
												rx={props.rx}
												ry={props.ry}
												fill={fillValue}
												stroke={shape.color}
												stroke-width={shape.strokeWidth}
												stroke-dasharray={dashArray}
												opacity={shape.opacity}
												transform={rotation
													? `rotate(${rotation} ${shapeCx} ${shapeCy})`
													: undefined}
											/>
										{:else if props.type === 'polygon'}
											<polygon
												points={props.points}
												fill={fillValue}
												stroke={shape.color}
												stroke-width={shape.strokeWidth}
												stroke-linejoin="round"
												stroke-dasharray={dashArray}
												opacity={shape.opacity}
												transform={rotation
													? `rotate(${rotation} ${shapeCx} ${shapeCy})`
													: undefined}
											/>
										{:else if props.type === 'path'}
											<path
												d={props.d}
												fill={fillValue}
												stroke={shape.color}
												stroke-width={shape.strokeWidth}
												stroke-linejoin="round"
												stroke-dasharray={dashArray}
												opacity={shape.opacity}
												transform={rotation
													? `rotate(${rotation} ${shapeCx} ${shapeCy})`
													: undefined}
											/>
										{/if}
									{:else if element.type === 'image' && element.position}
										<!-- Image rendering -->
										{@const img = element as ImageElement}
										{@const imgCx = img.position.x + img.width / 2}
										{@const imgCy = img.position.y + img.height / 2}
										{@const imgRotation = img.rotation ?? 0}
										<image
											href={img.src}
											x={img.position.x}
											y={img.position.y}
											width={img.width}
											height={img.height}
											preserveAspectRatio="none"
											transform={imgRotation
												? `rotate(${imgRotation} ${imgCx} ${imgCy})`
												: undefined}
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

		<Sheet.Footer class="border-t pt-3">
			<div class="w-full text-center text-xs text-muted-foreground">
				{pages.length} page{pages.length > 1 ? 's' : ''}
			</div>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

<!-- Template Picker Modal -->
<TemplatePickerModal
	bind:open={templatePickerOpen}
	onSelect={handleTemplateSelect}
	onClose={handleTemplatePickerClose}
/>

<style>
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
