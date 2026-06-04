<!--
	NotebookCodeSlide — Code cell rendered as a presentation slide.

	Presentation-mode wrapper around the read-only view of a code cell:
	  - shows the source via PythonEditor (disabled)
	  - shows the saved outputs via CellOutputs
	  - exposes a ▶ button that runs the cell live through the
	    presentation-scoped NotebookStore (separate Pyodide context from
	    the editor tab)

	No code editing here — the editor route is the only place that mutates
	the notebook content. The teacher can still re-execute cells live for
	demos.
-->
<script lang="ts">
	import type { NotebookCell } from '$lib/types/notebook';
	import type { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import PythonEditor from '$lib/components/python/PythonEditor.svelte';
	import CellOutputs from '$lib/components/notebook/CellOutputs.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Play, Loader2, Square } from 'lucide-svelte';

	interface Props {
		cell: NotebookCell;
		notebook: NotebookStore;
	}

	let { cell, notebook }: Props = $props();

	let isRunning = $derived(cell.state === 'running');
	let isReady = $derived(notebook.isReady);
	let hasError = $derived(cell.state === 'error');

	async function handleRun(): Promise<void> {
		if (isRunning || !isReady) return;
		await notebook.executeCell(cell.id);
	}

	async function handleStop(): Promise<void> {
		notebook.stopExecution();
	}

	// Execution count label, e.g. "In [3]:" or "In [ ]:".
	let executionMarker = $derived(
		cell.execution_count !== null && cell.execution_count !== undefined
			? `[${cell.execution_count}]`
			: '[ ]'
	);
</script>

<div class="flex h-full w-full flex-col gap-4 overflow-auto p-8">
	<!-- Header line: In [N]: marker + Run button -->
	<div class="flex items-center justify-between gap-4">
		<div class="font-mono text-sm text-muted-foreground">
			In {executionMarker}:
		</div>
		<div class="flex items-center gap-2">
			{#if isRunning}
				<Button variant="destructive" size="sm" onclick={handleStop} class="gap-1.5">
					<Square class="size-4" />
					<span>Arrêter</span>
				</Button>
				<span class="text-xs text-muted-foreground">Exécution…</span>
			{:else}
				<Button
					variant="default"
					size="sm"
					onclick={handleRun}
					disabled={!isReady}
					class="gap-1.5"
					title={isReady ? 'Exécuter cette cellule' : 'Pyodide en cours de chargement…'}
				>
					{#if !isReady}
						<Loader2 class="size-4 animate-spin" />
					{:else}
						<Play class="size-4" />
					{/if}
					<span>Exécuter</span>
				</Button>
			{/if}
		</div>
	</div>

	<!-- Code editor in read-only mode — keeps syntax highlighting and the
	     monospace font without exposing edit affordances. -->
	<div
		class="overflow-hidden rounded-lg border {hasError
			? 'border-destructive'
			: 'border-border'} bg-card"
	>
		<PythonEditor value={cell.source} disabled={true} />
	</div>

	<!-- Saved outputs (re-execution updates them in place via the store). -->
	{#if cell.outputs.length > 0}
		<div class="ml-4">
			<CellOutputs outputs={cell.outputs} />
		</div>
	{/if}
</div>
