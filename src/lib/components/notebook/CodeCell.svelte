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
	import { Button } from '$lib/components/ui/button';
	import { Play, Square } from 'lucide-svelte';

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

	// Functions
	function handleExecute(): void {
		onExecute();
	}

	function handleStop(): void {
		if (notebook) {
			notebook.stopExecution();
		}
	}
</script>

<div class="group relative w-full">
	<!-- Code editor -->
	<div
		class="relative overflow-hidden rounded-lg border transition-colors {isActive
			? 'border-primary ring-2 ring-primary/20'
			: 'border-border'} {hasError ? 'border-destructive' : ''}"
	>
		<!-- Execute button overlay -->
		{#if !isReadonly}
			<div class="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
				{#if isRunning}
					<Button
						variant="ghost"
						size="sm"
						onclick={handleStop}
						class="h-8 gap-1.5 bg-background/80 backdrop-blur-sm hover:bg-background"
						aria-label="Arrêter l'exécution"
					>
						<Square class="size-3.5" />
						<span class="text-xs">Arrêter</span>
					</Button>
				{:else}
					<Button
						variant="ghost"
						size="sm"
						onclick={handleExecute}
						class="h-8 gap-1.5 bg-background/80 backdrop-blur-sm hover:bg-background"
						aria-label="Exécuter la cellule"
					>
						<Play class="size-3.5" />
						<span class="text-xs">Exécuter</span>
					</Button>
				{/if}
			</div>
		{/if}

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
				<span class="text-xs font-medium text-primary">Exécution...</span>
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
