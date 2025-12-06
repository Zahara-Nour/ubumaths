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

	import type { NotebookCell } from '$lib/types/notebook';
	import type { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import CellGutter from './CellGutter.svelte';
	import CodeCell from './CodeCell.svelte';
	import MarkdownCell from './MarkdownCell.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Trash2, ChevronUp, ChevronDown } from 'lucide-svelte';

	// Props
	let {
		cell = $bindable() as NotebookCell,
		isActive = false,
		isReadonly = false,
		isFirst = false,
		isLast = false,
		notebook = null as NotebookStore | null,
		onSelect = () => {},
		onDelete = () => {},
		onMoveUp = () => {},
		onMoveDown = () => {},
		onExecute = () => {}
	}: {
		cell: NotebookCell;
		isActive?: boolean;
		isReadonly?: boolean;
		isFirst?: boolean;
		isLast?: boolean;
		notebook?: NotebookStore | null;
		onSelect?: () => void;
		onDelete?: () => void;
		onMoveUp?: () => void;
		onMoveDown?: () => void;
		onExecute?: () => void;
	} = $props();

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
	<CellGutter executionCount={cell.execution_count} state={cell.state} type={cell.type} />

	<!-- Cell content -->
	<div class="flex-1">
		{#if cell.type === 'code'}
			<CodeCell bind:cell {isActive} {isReadonly} {notebook} {onExecute} />
		{:else}
			<MarkdownCell bind:cell {isActive} {isReadonly} />
		{/if}
	</div>

	<!-- Cell actions toolbar (visible on hover or when active) -->
	{#if !isReadonly}
		<div
			class="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 {isActive
				? 'opacity-100'
				: ''}"
		>
			<!-- Move up -->
			{#if !isFirst}
				<Button
					variant="ghost"
					size="sm"
					onclick={onMoveUp}
					class="h-7 w-7 p-0"
					aria-label="Déplacer vers le haut"
				>
					<ChevronUp class="size-4" />
				</Button>
			{/if}

			<!-- Move down -->
			{#if !isLast}
				<Button
					variant="ghost"
					size="sm"
					onclick={onMoveDown}
					class="h-7 w-7 p-0"
					aria-label="Déplacer vers le bas"
				>
					<ChevronDown class="size-4" />
				</Button>
			{/if}

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
