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
		type = 'code' as CellType
	}: {
		executionCount?: number | null;
		state?: CellExecutionState;
		type?: CellType;
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
		class="flex h-full min-w-[80px] items-start justify-end pt-3 pr-3 font-mono text-sm {colorClass}"
	>
		{displayText}
	</div>
{:else}
	<div class="min-w-[80px]"></div>
{/if}
