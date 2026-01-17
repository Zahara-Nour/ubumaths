<script lang="ts">
	/**
	 * ShapeLabelLayer - Container for all shape labels on the whiteboard
	 *
	 * Manages shape label rendering and edit state.
	 * Renders labels as HTML overlay (like TextBlockLayer) for rich text support.
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type { ShapeElement } from '../types/document';
	import { hasLabelContent } from '../utils/label-parser';
	import ShapeLabel from './ShapeLabel.svelte';

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

	/** ID of the shape whose label is currently being edited */
	let editingShapeId = $state<string | null>(null);

	// ==========================================================================
	// Derived
	// ==========================================================================

	/** Current page elements */
	let elements = $derived(whiteboardStore.currentPage?.elements ?? []);

	/** Filter to shape elements (all shapes, not just those with labels) */
	let shapeElements = $derived(elements.filter((el): el is ShapeElement => el.type === 'shape'));

	/** Shapes that have labels OR are being edited */
	let shapesWithLabels = $derived(
		shapeElements.filter(
			(shape) => hasLabelContent(shape.labelMarkdown) || shape.id === editingShapeId
		)
	);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleEndEdit() {
		editingShapeId = null;
	}

	function handleContentChange(shapeId: string, content: string) {
		whiteboardStore.updateShapeLabel(shapeId, content);
	}

	// ==========================================================================
	// Public API
	// ==========================================================================

	/**
	 * Start editing a shape's label
	 * Called from parent component when text tool clicks on a shape
	 */
	export function startEditingShape(shapeId: string): void {
		editingShapeId = shapeId;
	}

	/**
	 * Check if any shape label is currently being edited
	 */
	export function isEditing(): boolean {
		return editingShapeId !== null;
	}

	/**
	 * Exit edit mode if currently editing
	 */
	export function exitEditMode(): void {
		editingShapeId = null;
	}

	/**
	 * Get the ID of the shape currently being edited
	 */
	export function getEditingShapeId(): string | null {
		return editingShapeId;
	}
</script>

<div class="shape-label-layer pointer-events-none absolute inset-0">
	{#each shapesWithLabels as shape (shape.id)}
		<ShapeLabel
			element={shape}
			isEditing={editingShapeId === shape.id}
			onEndEdit={handleEndEdit}
			onContentChange={(content) => handleContentChange(shape.id, content)}
			{scale}
		/>
	{/each}
</div>
