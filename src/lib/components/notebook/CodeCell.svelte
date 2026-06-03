<script lang="ts">
	/**
	 * CodeCell Component
	 *
	 * Python code cell with execution capabilities
	 * Features:
	 * - PythonEditor for code editing
	 * - Execute button
	 * - Loading spinner when running
	 * - Output display below
	 * - Autocompletion via executor
	 */

	import type { NotebookCell } from '$lib/types/notebook';
	import type { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import PythonEditor from '$lib/components/python/PythonEditor.svelte';
	import CellOutputs from './CellOutputs.svelte';

	// Props
	let {
		cell = $bindable() as NotebookCell,
		isActive = false,
		isReadonly = false,
		notebook = null as NotebookStore | null,
		onExecute = () => {}
	}: {
		cell: NotebookCell;
		isActive?: boolean;
		isReadonly?: boolean;
		notebook?: NotebookStore | null;
		onExecute?: () => void;
	} = $props();

	// Derived state
	let isRunning = $derived(cell.state === 'running');
	let hasError = $derived(cell.state === 'error');

	// Elapsed-time counter while the cell is executing. Only surfaced when
	// the execution lasts longer than `TIMER_VISIBLE_THRESHOLD_S` seconds,
	// so short cells stay quiet. Pattern stolen from Colab's "Running…
	// (3s)" badge.
	const TIMER_VISIBLE_THRESHOLD_S = 2;
	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		if (isRunning) {
			const startMs = Date.now();
			elapsedSeconds = 0;
			timerInterval = setInterval(() => {
				elapsedSeconds = Math.floor((Date.now() - startMs) / 1000);
			}, 250);
			return () => {
				if (timerInterval) {
					clearInterval(timerInterval);
					timerInterval = null;
				}
				elapsedSeconds = 0;
			};
		}
	});

	let showElapsed = $derived(isRunning && elapsedSeconds >= TIMER_VISIBLE_THRESHOLD_S);

	// Functions
	function handleExecute(): void {
		onExecute();
	}
</script>

<div class="group relative w-full">
	<!-- Code editor -->
	<div
		class="relative overflow-hidden rounded-lg border transition-colors {isActive
			? 'border-primary ring-2 ring-primary/20'
			: 'border-border'} {hasError ? 'border-destructive' : ''}"
	>
		<!-- Execute / stop buttons live in the gutter now (see CellGutter
		     under the [In N] label). The overlay was removed to consolidate
		     the run affordance with the cell's identity column. -->

		<!-- Python editor -->
		<div class="min-h-[100px]">
			<PythonEditor
				bind:value={cell.source}
				disabled={isReadonly}
				executor={notebook}
				onExecute={handleExecute}
			/>
		</div>

		<!-- Loading indicator -->
		{#if isRunning}
			<div class="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-primary/10 px-2 py-1">
				<div
					class="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent"
				></div>
				<span class="text-xs font-medium text-primary">
					Exécution{showElapsed ? `… ${elapsedSeconds}s` : '…'}
				</span>
			</div>
		{/if}
	</div>

	<!-- Cell outputs -->
	{#if cell.outputs.length > 0}
		<div class="mt-2 ml-4">
			<CellOutputs outputs={cell.outputs} />
		</div>
	{/if}
</div>
