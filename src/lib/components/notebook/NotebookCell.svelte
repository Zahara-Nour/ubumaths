<script lang="ts">
	/**
	 * NotebookCell Component
	 *
	 * Wrapper for individual notebook cells
	 * Features:
	 * - Gutter with execution count
	 * - Cell type switching (code/markdown)
	 * - Delete, move up/down buttons
	 * - Click to select
	 */

	import type { NotebookCell, CheckpointCell as CheckpointCellType } from '$lib/types/notebook';
	import type { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import CellGutter from './CellGutter.svelte';
	import CodeCell from './CodeCell.svelte';
	import MarkdownCell from './MarkdownCell.svelte';
	import CheckpointCell from './CheckpointCell.svelte';
	import CheckpointEditor from './CheckpointEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Trash2, GripVertical } from '@lucide/svelte';

	// Props
	let {
		cell = $bindable() as NotebookCell,
		isActive = false,
		isReadonly = false,
		isTeacher = false,
		notebook = null as NotebookStore | null,
		onSelect = () => {},
		onDelete = () => {},
		onExecute = () => {}
	}: {
		cell: NotebookCell;
		isActive?: boolean;
		isReadonly?: boolean;
		isTeacher?: boolean;
		notebook?: NotebookStore | null;
		onSelect?: () => void;
		onDelete?: () => void;
		onExecute?: () => void;
	} = $props();

	// Derived — "modified since last execution" for code cells. The store
	// stamps cell.metadata.last_executed_source at completion; if the live
	// source diverges, the gutter renders the Colab-style blue dot.
	let isDirty = $derived.by(() => {
		if (cell.type !== 'code') return false;
		if (cell.execution_count === null) return false;
		const lastExecuted = cell.metadata?.last_executed_source;
		if (typeof lastExecuted !== 'string') return false;
		return cell.source !== lastExecuted;
	});

	// Functions
	function handleClick(): void {
		if (!isActive) {
			onSelect();
		}
	}
</script>

<div
	class="group relative flex gap-0 border-l-4 py-2 transition-colors {isActive
		? 'border-primary bg-primary/5'
		: 'border-transparent hover:bg-muted/30'}"
	onclick={handleClick}
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			handleClick();
		}
	}}
>
	<!-- Gutter -->
	<CellGutter
		executionCount={cell.execution_count}
		state={cell.state}
		type={cell.type}
		{isDirty}
		canExecute={cell.type === 'code' && !isReadonly}
		{onExecute}
		onStop={() => notebook?.stopExecution()}
	/>

	<!-- Cell content -->
	<div class="flex-1">
		{#if cell.type === 'code'}
			<CodeCell bind:cell {isActive} {isReadonly} {notebook} {onExecute} />
		{:else if cell.type === 'checkpoint'}
			{#if isTeacher && !isReadonly}
				<CheckpointEditor bind:cell={cell as CheckpointCellType} {notebook} />
			{:else}
				<CheckpointCell cell={cell as CheckpointCellType} {notebook} {isReadonly} />
			{/if}
		{:else}
			<MarkdownCell bind:cell {isActive} {isReadonly} />
		{/if}
	</div>

	<!-- Cell actions toolbar (visible on hover or when active).
	     Up/down arrows were removed in favour of svelte-dnd-action drag
	     (the wrapping parent has `use:dndzone`). The grip icon visually
	     advertises the affordance — the actual drag is captured anywhere
	     on the cell wrapper, but anchoring it here is the convention. -->
	{#if !isReadonly}
		<div
			class="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 {isActive
				? 'opacity-100'
				: ''}"
		>
			<!-- Drag handle (visual only — dndzone listens on the parent) -->
			<span
				class="flex h-7 w-7 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
				aria-label="Déplacer la cellule (glisser)"
				title="Glisser pour réordonner"
			>
				<GripVertical class="size-4" />
			</span>

			<!-- Delete -->
			<Button
				variant="ghost"
				size="sm"
				onclick={onDelete}
				class="h-7 w-7 p-0 text-destructive hover:text-destructive"
				aria-label="Supprimer la cellule"
			>
				<Trash2 class="size-4" />
			</Button>
		</div>
	{/if}
</div>
