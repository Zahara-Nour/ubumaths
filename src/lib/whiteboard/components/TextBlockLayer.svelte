<script lang="ts">
	/**
	 * TextBlockLayer - Container for all text blocks on the whiteboard
	 *
	 * Manages text block rendering and edit state.
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type { TextBlockElement } from '../types/document';
	import TextBlock from './TextBlock.svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Scale factor for coordinate transformation */
		scale?: number;
	}

	let { scale = 1 }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** ID of the text block currently being edited */
	let editingBlockId = $state<string | null>(null);

	// ==========================================================================
	// Derived
	// ==========================================================================

	/** Current page elements */
	let elements = $derived(whiteboardStore.currentPage?.elements ?? []);

	/** Filter to only text block elements */
	let textBlocks = $derived(
		elements.filter((el): el is TextBlockElement => el.type === 'textblock')
	);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleStartEdit(blockId: string) {
		editingBlockId = blockId;
	}

	function handleEndEdit() {
		editingBlockId = null;
	}

	/**
	 * Create a new text block at the given position and enter edit mode
	 * Called from parent component when text tool is used
	 */
	export function createBlockAtPosition(x: number, y: number): void {
		const newBlockId = whiteboardStore.createTextBlock({ x, y });
		// Enter edit mode immediately
		editingBlockId = newBlockId;
	}

	/**
	 * Check if any block is currently being edited
	 */
	export function isEditing(): boolean {
		return editingBlockId !== null;
	}

	/**
	 * Exit edit mode if currently editing
	 */
	export function exitEditMode(): void {
		editingBlockId = null;
	}
</script>

<div class="text-block-layer pointer-events-none absolute inset-0">
	{#each textBlocks as block (block.id)}
		<div class="pointer-events-auto">
			<TextBlock
				element={block}
				isEditing={editingBlockId === block.id}
				onStartEdit={() => handleStartEdit(block.id)}
				onEndEdit={handleEndEdit}
				{scale}
			/>
		</div>
	{/each}
</div>
