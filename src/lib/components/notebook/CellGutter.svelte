<script lang="ts">
	/**
	 * CellGutter Component
	 *
	 * Displays the execution count indicator for notebook cells
	 * Shows [In X] for code cells with different states
	 */

	import type { CellExecutionState, CellType } from '$lib/types/notebook';
	import { Button } from '$lib/components/ui/button';
	import { Play, Square } from 'lucide-svelte';

	// Props
	let {
		executionCount = null as number | null,
		state = 'idle' as CellExecutionState,
		type = 'code' as CellType,
		isDirty = false,
		canExecute = false,
		onExecute = () => {},
		onStop = () => {}
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
		/**
		 * Enables the play / stop button rendered under the [In N] label.
		 * The notebook view passes `false` in readonly mode so the gutter
		 * stays purely informative.
		 */
		canExecute?: boolean;
		onExecute?: () => void;
		onStop?: () => void;
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
	<div class="flex h-full min-w-[80px] flex-col items-end gap-1 pt-3 pr-3">
		<!-- [In N] line, plus optional blue dot for "modified since last run" -->
		<div class="flex items-start gap-1.5 font-mono text-sm {colorClass}">
			{displayText}
			{#if isDirty && state !== 'running'}
				<span
					class="mt-1 inline-block size-2 shrink-0 rounded-full bg-blue-500"
					aria-label="Cellule modifiée depuis la dernière exécution"
					title="Cellule modifiée depuis la dernière exécution"
				></span>
			{/if}
		</div>

		<!-- Play / Stop button — visible on hover or while executing.
		     Lives in the gutter rather than the cell's top-right corner so
		     the run affordance is anchored next to the [In N] label, where
		     the cell's identity already lives. -->
		{#if canExecute}
			{#if state === 'running'}
				<Button
					variant="ghost"
					size="sm"
					onclick={onStop}
					class="h-7 w-7 p-0 text-destructive hover:text-destructive"
					aria-label="Arrêter la cellule"
					title="Arrêter (la cellule est en cours d'exécution)"
				>
					<Square class="size-3.5" />
				</Button>
			{:else}
				<Button
					variant="ghost"
					size="sm"
					onclick={onExecute}
					class="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
					aria-label="Exécuter la cellule"
					title="Exécuter la cellule (Ctrl+Entrée)"
				>
					<Play class="size-3.5" />
				</Button>
			{/if}
		{/if}
	</div>
{:else}
	<div class="min-w-[80px]"></div>
{/if}
