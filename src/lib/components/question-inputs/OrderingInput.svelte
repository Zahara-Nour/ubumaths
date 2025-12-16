<!--
	Ordering Input Component
	========================

	Drag-and-drop interface for ordering items in correct sequence.
	Uses native HTML5 drag-and-drop API.

	Props:
	- items: Array of items to order (with id, content, originalIndex)
	- orderedIndexes: Array of current order (bindable)
	- disabled: Whether dragging is disabled
	- showValidation: Whether to show correct/incorrect indicators
	- correctOrder: Array of correct indexes (for validation)
-->

<script lang="ts">
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { convertLegacyLatexToMarkdown } from '$lib/utils/latex-syntax-adapter';
	import { GripVertical, Check, X } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface OrderingItem {
		id: string;
		content: string;
		originalIndex: number;
	}

	interface Props {
		items: OrderingItem[];
		orderedIndexes?: number[];
		disabled?: boolean;
		showValidation?: boolean;
		correctOrder?: number[];
	}

	let {
		items,
		orderedIndexes = $bindable([]),
		disabled = false,
		showValidation = false,
		correctOrder = []
	}: Props = $props();

	// Initialize ordered indexes if empty
	$effect(() => {
		if (orderedIndexes.length === 0 && items.length > 0) {
			orderedIndexes = items.map((_, i) => i);
		}
	});

	// Derived: reordered items based on orderedIndexes
	const orderedItems = $derived(orderedIndexes.map((index) => items[index]));

	// Drag state
	let draggedIndex = $state<number | null>(null);
	let dropTargetIndex = $state<number | null>(null);

	// Handle drag start
	function handleDragStart(e: DragEvent, index: number) {
		if (disabled) {
			e.preventDefault();
			return;
		}

		draggedIndex = index;

		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	// Handle drag over
	function handleDragOver(e: DragEvent, index: number) {
		if (disabled || draggedIndex === null) return;

		e.preventDefault();

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}

		dropTargetIndex = index;
	}

	// Handle drag leave
	function handleDragLeave() {
		dropTargetIndex = null;
	}

	// Handle drop
	function handleDrop(e: DragEvent, targetIndex: number) {
		if (disabled || draggedIndex === null) return;

		e.preventDefault();

		const sourceIndex = draggedIndex;

		if (sourceIndex !== targetIndex) {
			// Reorder items
			const newOrder = [...orderedIndexes];
			const [removed] = newOrder.splice(sourceIndex, 1);
			newOrder.splice(targetIndex, 0, removed);
			orderedIndexes = newOrder;
		}

		// Reset drag state
		draggedIndex = null;
		dropTargetIndex = null;
	}

	// Handle drag end
	function handleDragEnd() {
		draggedIndex = null;
		dropTargetIndex = null;
	}

	// Check if item is correctly positioned
	function isCorrectPosition(currentIndex: number): boolean {
		if (!showValidation || correctOrder.length === 0) return false;
		return orderedIndexes[currentIndex] === correctOrder[currentIndex];
	}
</script>

<div class="ordering-container">
	<!-- Ordering list -->
	<div class="ordering-list">
		{#each orderedItems as item, i (item.id)}
			{@const isBeingDragged = draggedIndex === i}
			{@const isDropTarget = dropTargetIndex === i}
			{@const correct = showValidation && isCorrectPosition(i)}
			{@const incorrect = showValidation && !isCorrectPosition(i)}

			<div
				class={cn(
					'ordering-item',
					isBeingDragged && 'dragging',
					isDropTarget && 'drop-target',
					correct && 'correct',
					incorrect && 'incorrect',
					disabled && 'disabled'
				)}
				draggable={!disabled}
				ondragstart={(e) => handleDragStart(e, i)}
				ondragover={(e) => handleDragOver(e, i)}
				ondragleave={handleDragLeave}
				ondrop={(e) => handleDrop(e, i)}
				ondragend={handleDragEnd}
				role="button"
				tabindex={disabled ? -1 : 0}
				aria-label="Item {i + 1}: {item.content}"
			>
				<!-- Drag handle -->
				{#if !disabled}
					<span class="drag-handle">
						<GripVertical class="h-5 w-5" />
					</span>
				{/if}

				<!-- Position number -->
				<span class="position-number">{i + 1}</span>

				<!-- Item content -->
				<div class="item-content">
					<MarkdownRenderer content={convertLegacyLatexToMarkdown(item.content)} />
				</div>

				<!-- Validation indicator -->
				{#if showValidation}
					<span class="validation-icon">
						{#if correct}
							<Check class="h-5 w-5 text-green-600" />
						{:else}
							<X class="h-5 w-5 text-red-600" />
						{/if}
					</span>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Helper text -->
	{#if !disabled && !showValidation}
		<div class="helper-text">
			<span class="text-xs text-muted-foreground">
				Glissez-déposez les éléments pour les ordonner correctement
			</span>
		</div>
	{/if}
</div>

<style>
	.ordering-container {
		width: 100%;
	}

	.ordering-list {
		display: flex;
		flex-direction: column;
		gap: calc(0.5rem * var(--font-scale, 1));
	}

	.ordering-item {
		display: flex;
		align-items: center;
		gap: calc(0.75rem * var(--font-scale, 1));
		padding: calc(1rem * var(--font-scale, 1));
		font-size: calc(1rem * var(--font-scale, 1));
		border: 2px solid hsl(var(--border));
		border-radius: calc(0.5rem * var(--font-scale, 1));
		background: hsl(var(--background));
		cursor: move;
		transition: all 0.2s ease;
		user-select: none;
	}

	.ordering-item:hover:not(.disabled) {
		border-color: hsl(var(--primary));
		background: hsl(var(--muted) / 0.5);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.ordering-item.dragging {
		opacity: 0.5;
		transform: scale(0.98);
	}

	.ordering-item.drop-target {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.1);
		border-style: dashed;
	}

	.ordering-item.correct {
		border-color: rgb(34, 197, 94); /* green-600 */
		background: rgb(220, 252, 231); /* green-100 */
	}

	:global(.dark) .ordering-item.correct {
		border-color: rgb(34, 197, 94);
		background: rgb(20, 83, 45); /* green-950 */
	}

	.ordering-item.incorrect {
		border-color: rgb(220, 38, 38); /* red-600 */
		background: rgb(254, 226, 226); /* red-100 */
	}

	:global(.dark) .ordering-item.incorrect {
		border-color: rgb(220, 38, 38);
		background: rgb(69, 10, 10); /* red-950 */
	}

	.ordering-item.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.drag-handle {
		display: inline-flex;
		align-items: center;
		color: hsl(var(--muted-foreground));
		cursor: grab;
	}

	.ordering-item.dragging .drag-handle {
		cursor: grabbing;
	}

	.position-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: calc(2rem * var(--font-scale, 1));
		min-height: calc(2rem * var(--font-scale, 1));
		padding: calc(0.25rem * var(--font-scale, 1));
		font-weight: 700;
		font-size: calc(0.875rem * var(--font-scale, 1));
		border-radius: calc(0.375rem * var(--font-scale, 1));
		background: hsl(var(--muted));
		color: hsl(var(--foreground));
	}

	.ordering-item.correct .position-number {
		background: rgb(34, 197, 94); /* green-600 */
		color: white;
	}

	.ordering-item.incorrect .position-number {
		background: rgb(220, 38, 38); /* red-600 */
		color: white;
	}

	.item-content {
		flex: 1;
		min-width: 0;
	}

	.validation-icon {
		display: inline-flex;
		align-items: center;
	}

	.helper-text {
		margin-top: calc(0.5rem * var(--font-scale, 1));
		font-size: calc(0.75rem * var(--font-scale, 1));
		color: hsl(var(--muted-foreground));
	}
</style>
