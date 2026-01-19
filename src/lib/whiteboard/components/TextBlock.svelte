<script lang="ts">
	/**
	 * TextBlock - Editable text block for the whiteboard
	 *
	 * Displays markdown content with EDIT/VIEW modes:
	 * - VIEW: MarkdownRenderer with double-click to edit
	 * - EDIT: RichTextEditor with escape/click-outside to save
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import { MIN_TEXT_BLOCK_WIDTH, MIN_TEXT_BLOCK_HEIGHT } from '../stores/whiteboard.svelte';
	import type { TextBlockElement } from '../types/document';
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** The text block element data */
		element: TextBlockElement;
		/** Whether this block is currently being edited */
		isEditing: boolean;
		/** Whether this block is currently selected */
		isSelected?: boolean;
		/** Callback when edit mode should start */
		onStartEdit: () => void;
		/** Callback when edit mode should end */
		onEndEdit: () => void;
		/** Scale factor for coordinate transformation */
		scale?: number;
	}

	let {
		element,
		isEditing,
		isSelected = false,
		onStartEdit,
		onEndEdit,
		scale = 1
	}: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Local content for editing (synced on save) */
	let editContent = $state(element.markdownContent);

	/** Reference to RichTextEditor to call getMarkdown() synchronously */
	let editorRef: ReturnType<typeof RichTextEditor> | null = $state(null);

	/** Drag state */
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let elementStartX = $state(0);
	let elementStartY = $state(0);

	/** Resize state */
	let isResizing = $state(false);
	let resizeHandle = $state<string | null>(null);
	let resizeStartX = $state(0);
	let resizeStartY = $state(0);
	let elementStartWidth = $state(0);
	let elementStartHeight = $state(0);

	/** Container reference for click-outside detection */
	let containerEl: HTMLDivElement | null = $state(null);

	/** Edit container reference for focus management */
	let editContainerEl: HTMLDivElement | null = $state(null);

	// ==========================================================================
	// Derived
	// ==========================================================================

	/** Block position and size */
	let left = $derived(element.position.x);
	let top = $derived(element.position.y);
	let width = $derived(element.width);
	let height = $derived(element.height);
	let fontFamily = $derived(element.fontFamily);

	// ==========================================================================
	// Effects
	// ==========================================================================

	// Sync content when element changes (external update)
	$effect(() => {
		if (!isEditing) {
			editContent = element.markdownContent;
		}
	});

	// Handle click outside when editing
	$effect(() => {
		if (!isEditing) return;

		function handleClickOutside(e: MouseEvent) {
			if (containerEl && !containerEl.contains(e.target as Node)) {
				saveAndClose();
			}
		}

		// Use capture phase to intercept clicks before they bubble
		// This avoids race conditions with the double-click handler
		document.addEventListener('click', handleClickOutside, { capture: true });

		return () => {
			document.removeEventListener('click', handleClickOutside, { capture: true });
		};
	});

	// Focus the editor when entering edit mode
	$effect(() => {
		if (!isEditing || !editContainerEl) return;

		// Focus the contenteditable element inside RichTextEditor
		requestAnimationFrame(() => {
			const editable = editContainerEl?.querySelector('[contenteditable="true"]');
			if (editable instanceof HTMLElement) {
				editable.focus();
			}
		});
	});

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleDoubleClick(e: MouseEvent) {
		if (isEditing) return;
		e.stopPropagation();
		editContent = element.markdownContent;
		onStartEdit();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isEditing) {
			e.preventDefault();
			saveAndClose();
		}
	}

	function saveAndClose() {
		// Get markdown synchronously from editor to avoid debounce timing issues
		const content = editorRef?.getMarkdown?.() ?? editContent;
		// Save content to store
		whiteboardStore.updateTextBlockContent(element.id, content);
		onEndEdit();
	}

	// --- Drag handlers (VIEW mode only) ---

	function handlePointerDown(e: PointerEvent) {
		if (isEditing || isResizing) return;

		e.preventDefault();
		e.stopPropagation();

		// First click: select the element
		if (!isSelected) {
			if (e.shiftKey) {
				// Add to selection
				whiteboardStore.selectElement(element.id, true);
			} else {
				// Replace selection
				whiteboardStore.clearSelection();
				whiteboardStore.selectElement(element.id);
			}
			// Capture pointer for potential drag
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			elementStartX = element.position.x;
			elementStartY = element.position.y;
			return;
		}

		// Already selected: start drag immediately
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		elementStartX = element.position.x;
		elementStartY = element.position.y;

		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handleDragMove(e: PointerEvent) {
		if (!isDragging) return;

		const deltaX = (e.clientX - dragStartX) / scale;
		const deltaY = (e.clientY - dragStartY) / scale;

		whiteboardStore.moveTextBlock(element.id, {
			x: elementStartX + deltaX,
			y: elementStartY + deltaY
		});
	}

	function handleDragEnd(e: PointerEvent) {
		if (isDragging) {
			isDragging = false;
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		}
	}

	// --- Resize handlers (VIEW mode only) ---

	function handleResizeStart(e: PointerEvent, handle: string) {
		if (isEditing) return;

		e.preventDefault();
		e.stopPropagation();

		isResizing = true;
		resizeHandle = handle;
		resizeStartX = e.clientX;
		resizeStartY = e.clientY;
		elementStartWidth = element.width;
		elementStartHeight = element.height;
		elementStartX = element.position.x;
		elementStartY = element.position.y;

		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handleResizeMove(e: PointerEvent) {
		if (!isResizing || !resizeHandle) return;

		const deltaX = (e.clientX - resizeStartX) / scale;
		const deltaY = (e.clientY - resizeStartY) / scale;

		let newWidth = elementStartWidth;
		let newHeight = elementStartHeight;
		let newX = elementStartX;
		let newY = elementStartY;

		// Handle different resize directions
		if (resizeHandle.includes('e')) {
			newWidth = elementStartWidth + deltaX;
		}
		if (resizeHandle.includes('w')) {
			newWidth = elementStartWidth - deltaX;
			newX = elementStartX + deltaX;
		}
		if (resizeHandle.includes('s')) {
			newHeight = elementStartHeight + deltaY;
		}
		if (resizeHandle.includes('n')) {
			newHeight = elementStartHeight - deltaY;
			newY = elementStartY + deltaY;
		}

		// Apply minimum constraints
		newWidth = Math.max(newWidth, MIN_TEXT_BLOCK_WIDTH);
		newHeight = Math.max(newHeight, MIN_TEXT_BLOCK_HEIGHT);

		// Adjust position if west or north resize hit minimum
		if (resizeHandle.includes('w') && newWidth === MIN_TEXT_BLOCK_WIDTH) {
			newX = elementStartX + elementStartWidth - MIN_TEXT_BLOCK_WIDTH;
		}
		if (resizeHandle.includes('n') && newHeight === MIN_TEXT_BLOCK_HEIGHT) {
			newY = elementStartY + elementStartHeight - MIN_TEXT_BLOCK_HEIGHT;
		}

		// Use combined method to create single history entry
		whiteboardStore.resizeAndMoveTextBlock(element.id, newWidth, newHeight, { x: newX, y: newY });
	}

	function handleResizeEnd(e: PointerEvent) {
		if (isResizing) {
			isResizing = false;
			resizeHandle = null;
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
	bind:this={containerEl}
	class="text-block absolute"
	class:editing={isEditing}
	class:selected={isSelected && !isEditing}
	class:dragging={isDragging}
	style="left: {left * scale}px; top: {top * scale}px; width: {width * scale}px; height: {height *
		scale}px;"
	ondblclick={handleDoubleClick}
	onpointerdown={!isEditing ? handlePointerDown : undefined}
	onpointermove={handleDragMove}
	onpointerup={handleDragEnd}
	onpointercancel={handleDragEnd}
	role="article"
	aria-label="Bloc de texte{isEditing ? ' (en édition)' : ''}"
>
	{#if isEditing}
		<!-- EDIT Mode: RichTextEditor -->
		<div
			bind:this={editContainerEl}
			class="edit-container h-full w-full overflow-auto rounded border-2 border-primary bg-white shadow-lg"
			style:font-family={fontFamily}
		>
			<RichTextEditor
				bind:this={editorRef}
				mode="form"
				bind:markdownValue={editContent}
				preset="minimal"
				minHeight="{height - 20}px"
			/>
		</div>
	{:else}
		<!-- VIEW Mode: MarkdownRenderer -->
		<div
			class="view-container h-full w-full overflow-auto rounded border border-border/50 bg-white p-2 hover:border-border"
			style:font-family={fontFamily}
		>
			{#if element.markdownContent}
				<MarkdownRenderer content={element.markdownContent} />
			{:else}
				<p class="text-muted-foreground italic">Double-cliquer pour éditer...</p>
			{/if}
		</div>

		<!-- Resize handles (only when selected in VIEW mode) -->
		{#if isSelected}
			<div
				class="resize-handle resize-n"
				onpointerdown={(e) => handleResizeStart(e, 'n')}
				onpointermove={handleResizeMove}
				onpointerup={handleResizeEnd}
				role="slider"
				aria-label="Redimensionner vers le haut"
				tabindex="-1"
			></div>
			<div
				class="resize-handle resize-s"
				onpointerdown={(e) => handleResizeStart(e, 's')}
				onpointermove={handleResizeMove}
				onpointerup={handleResizeEnd}
				role="slider"
				aria-label="Redimensionner vers le bas"
				tabindex="-1"
			></div>
			<div
				class="resize-handle resize-e"
				onpointerdown={(e) => handleResizeStart(e, 'e')}
				onpointermove={handleResizeMove}
				onpointerup={handleResizeEnd}
				role="slider"
				aria-label="Redimensionner vers la droite"
				tabindex="-1"
			></div>
			<div
				class="resize-handle resize-w"
				onpointerdown={(e) => handleResizeStart(e, 'w')}
				onpointermove={handleResizeMove}
				onpointerup={handleResizeEnd}
				role="slider"
				aria-label="Redimensionner vers la gauche"
				tabindex="-1"
			></div>
			<div
				class="resize-handle resize-ne"
				onpointerdown={(e) => handleResizeStart(e, 'ne')}
				onpointermove={handleResizeMove}
				onpointerup={handleResizeEnd}
				role="slider"
				aria-label="Redimensionner coin supérieur droit"
				tabindex="-1"
			></div>
			<div
				class="resize-handle resize-nw"
				onpointerdown={(e) => handleResizeStart(e, 'nw')}
				onpointermove={handleResizeMove}
				onpointerup={handleResizeEnd}
				role="slider"
				aria-label="Redimensionner coin supérieur gauche"
				tabindex="-1"
			></div>
			<div
				class="resize-handle resize-se"
				onpointerdown={(e) => handleResizeStart(e, 'se')}
				onpointermove={handleResizeMove}
				onpointerup={handleResizeEnd}
				role="slider"
				aria-label="Redimensionner coin inférieur droit"
				tabindex="-1"
			></div>
			<div
				class="resize-handle resize-sw"
				onpointerdown={(e) => handleResizeStart(e, 'sw')}
				onpointermove={handleResizeMove}
				onpointerup={handleResizeEnd}
				role="slider"
				aria-label="Redimensionner coin inférieur gauche"
				tabindex="-1"
			></div>
		{/if}
	{/if}
</div>

<style>
	.text-block {
		touch-action: none;
		user-select: none;
	}

	.text-block:not(.editing) {
		cursor: move;
	}

	.text-block.editing {
		z-index: 100;
	}

	.text-block.dragging {
		opacity: 0.8;
	}

	.text-block.selected {
		outline: 2px solid rgb(59, 130, 246);
		outline-offset: 2px;
	}

	/* Resize handles */
	.resize-handle {
		position: absolute;
		background: transparent;
	}

	.resize-handle:hover {
		background: rgba(59, 130, 246, 0.3);
	}

	/* Edge handles */
	.resize-n,
	.resize-s {
		left: 8px;
		right: 8px;
		height: 8px;
		cursor: ns-resize;
	}

	.resize-n {
		top: -4px;
	}

	.resize-s {
		bottom: -4px;
	}

	.resize-e,
	.resize-w {
		top: 8px;
		bottom: 8px;
		width: 8px;
		cursor: ew-resize;
	}

	.resize-e {
		right: -4px;
	}

	.resize-w {
		left: -4px;
	}

	/* Corner handles */
	.resize-ne,
	.resize-nw,
	.resize-se,
	.resize-sw {
		width: 12px;
		height: 12px;
	}

	.resize-ne {
		top: -4px;
		right: -4px;
		cursor: nesw-resize;
	}

	.resize-nw {
		top: -4px;
		left: -4px;
		cursor: nwse-resize;
	}

	.resize-se {
		bottom: -4px;
		right: -4px;
		cursor: nwse-resize;
	}

	.resize-sw {
		bottom: -4px;
		left: -4px;
		cursor: nesw-resize;
	}

	/* View container hover state */
	.view-container {
		transition: border-color 0.2s;
	}
</style>
