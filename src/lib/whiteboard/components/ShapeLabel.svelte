<script lang="ts">
	/**
	 * ShapeLabel - Renders a label centered on a shape
	 *
	 * Displays markdown content (including math) centered on a shape.
	 * Supports rotation to follow the shape's angle.
	 *
	 * VIEW mode: Renders parsed markdown via InlineRenderer
	 * EDIT mode: Simple textarea for editing
	 */

	import type { ShapeElement } from '../types/document';
	import { getElementBounds, getBoundsCenter } from '../core/hit-testing';
	import { parseLabelToInline } from '../utils/label-parser';
	import InlineRenderer from '$lib/components/markdown/InlineRenderer.svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** The shape element with label */
		element: ShapeElement;
		/** Scale factor for coordinate transformation */
		scale?: number;
		/** Whether this label is currently being edited */
		isEditing: boolean;
		/** Live position offset during drag (from livePositions) */
		liveOffset?: { dx: number; dy: number } | null;
		/** Live rotation override during rotation (from liveRotations) */
		liveRotation?: number | null;
		/** Callback when edit mode should end */
		onEndEdit: () => void;
		/** Callback when content changes */
		onContentChange: (content: string) => void;
	}

	let {
		element,
		scale = 1,
		isEditing,
		liveOffset = null,
		liveRotation = null,
		onEndEdit,
		onContentChange
	}: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Local content for editing */
	let editContent = $state(element.labelMarkdown ?? '');

	/** Reference to textarea for focus */
	let textareaRef: HTMLTextAreaElement | null = $state(null);

	// ==========================================================================
	// Derived
	// ==========================================================================

	/** Shape bounds and center */
	let bounds = $derived(getElementBounds(element));
	let baseCenter = $derived(getBoundsCenter(bounds));

	/** Effective center including live position offset during drag */
	let center = $derived({
		x: baseCenter.x + (liveOffset?.dx ?? 0),
		y: baseCenter.y + (liveOffset?.dy ?? 0)
	});

	/** Shape rotation (use live rotation if during rotation drag) */
	let rotation = $derived(liveRotation ?? element.rotation ?? 0);

	/** Parsed inline nodes for rendering */
	let inlineNodes = $derived(parseLabelToInline(element.labelMarkdown ?? ''));

	/** Has content to display */
	let hasContent = $derived(inlineNodes.length > 0 || isEditing);

	// ==========================================================================
	// Effects
	// ==========================================================================

	// Sync content when element changes (external update)
	$effect(() => {
		if (!isEditing) {
			editContent = element.labelMarkdown ?? '';
		}
	});

	// Focus textarea when entering edit mode
	$effect(() => {
		if (isEditing && textareaRef) {
			textareaRef.focus();
			textareaRef.select();
		}
	});

	// Handle click outside when editing
	// Note: Cleanup is guaranteed by Svelte 5 $effect - the returned function
	// runs when isEditing changes or component is destroyed
	$effect(() => {
		if (!isEditing) return;

		function handleClickOutside(e: MouseEvent) {
			if (textareaRef && !textareaRef.contains(e.target as Node)) {
				saveAndClose();
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			saveAndClose();
		} else if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			saveAndClose();
		}
	}

	function saveAndClose() {
		onContentChange(editContent.trim());
		onEndEdit();
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		editContent = target.value;
	}
</script>

{#if hasContent}
	<div
		class="shape-label absolute"
		class:editing={isEditing}
		style="
			left: {center.x * scale}px;
			top: {center.y * scale}px;
			transform: translate(-50%, -50%) rotate({rotation}deg);
			pointer-events: {isEditing ? 'auto' : 'none'};
		"
	>
		{#if isEditing}
			<!-- EDIT Mode: Simple textarea -->
			<textarea
				bind:this={textareaRef}
				value={editContent}
				oninput={handleInput}
				onkeydown={handleKeyDown}
				class="label-editor min-w-16 resize-none rounded border-2 border-primary bg-white px-2 py-1 text-center text-sm shadow-lg outline-none"
				rows="1"
				placeholder="Label..."
			></textarea>
		{:else}
			<!-- VIEW Mode: Rendered inline content -->
			<div class="label-view text-sm whitespace-nowrap">
				<InlineRenderer children={inlineNodes} />
			</div>
		{/if}
	</div>
{/if}

<style>
	.shape-label {
		z-index: 10;
	}

	.shape-label.editing {
		z-index: 100;
	}

	.label-view {
		/* Allow overflow - text can extend beyond shape bounds */
		overflow: visible;
		/* Center text */
		text-align: center;
		/* Inherit font from parent */
		font-family: inherit;
	}

	.label-editor {
		/* Auto-grow width based on content */
		min-width: 60px;
		max-width: 300px;
		/* Center text in textarea */
		text-align: center;
	}
</style>
