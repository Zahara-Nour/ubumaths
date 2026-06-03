<script lang="ts">
	/**
	 * CellGutter Component
	 *
	 * Displays the execution count indicator for notebook cells
	 * Shows [In X] for code cells with different states
	 */

	import type { CellExecutionState, CellType } from '$lib/types/notebook';

	// Props
	let {
		executionCount = null as number | null,
		state = 'idle' as CellExecutionState,
		type = 'code' as CellType,
		isDirty = false
	}: {
		executionCount?: number | null;
		state?: CellExecutionState;
		type?: CellType;
		/**
		 * True when a code cell's source has changed since the last
		 * execution. Renders a small blue dot next to the [In N] label,
		 * mirroring Colab's "modified since last run" indicator. Only
		 * meaningful for code cells with executionCount !== null.
		 */
		isDirty?: boolean;
	} = $props();

	// Derived state
	let displayText = $derived.by(() => {
		if (type !== 'code') return '';
		if (state === 'running') return 'In [*]';
		if (executionCount === null) return 'In [ ]';
		return `In [${executionCount}]`;
	});

	let colorClass = $derived.by(() => {
		if (state === 'running') return 'text-primary';
		if (state === 'error') return 'text-destructive';
		if (state === 'success') return 'text-green-600 dark:text-green-400';
		return 'text-muted-foreground';
	});
</script>

{#if type === 'code'}
	<div
		class="flex h-full min-w-[80px] items-start justify-end gap-1.5 pt-3 pr-3 font-mono text-sm {colorClass}"
	>
		{displayText}
		{#if isDirty && state !== 'running'}
			<span
				class="mt-1 inline-block size-2 shrink-0 rounded-full bg-blue-500"
				aria-label="Cellule modifiée depuis la dernière exécution"
				title="Cellule modifiée depuis la dernière exécution"
			></span>
		{/if}
	</div>
{:else}
	<div class="min-w-[80px]"></div>
{/if}
