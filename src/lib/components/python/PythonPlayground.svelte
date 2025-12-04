<script lang="ts">
	// Imports
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import PythonToolbar from './PythonToolbar.svelte';
	import PythonEditor from './PythonEditor.svelte';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

	// Derived state from store
	let canExecute = $derived(pythonStore.isReady);
	let isExecuting = $derived(pythonStore.isExecuting);
	let hasOutput = $derived(pythonStore.hasOutput);

	// Functions
	function handleExecute(): void {
		pythonStore.execute();
	}

	function handleClear(): void {
		pythonStore.clearOutput();
	}

	function handleCopy(): void {
		if (browser && navigator.clipboard) {
			navigator.clipboard.writeText(pythonStore.code);
		}
	}

	function handleReset(): void {
		pythonStore.resetCode();
	}

	// Initialize Pyodide when component mounts
	onMount(() => {
		pythonStore.initPyodide();
	});

	// Clean up worker when component unmounts
	onDestroy(() => {
		pythonStore.destroy();
	});
</script>

<div class="flex h-full flex-col rounded-lg border border-border bg-card shadow-lg">
	<!-- Toolbar -->
	<PythonToolbar
		onExecute={handleExecute}
		onClear={handleClear}
		onCopy={handleCopy}
		onReset={handleReset}
		{canExecute}
		{isExecuting}
	/>

	<!-- Main content area -->
	<div class="grid min-h-[500px] flex-1 lg:grid-cols-2">
		<!-- Left: Editor placeholder -->
		<div class="flex flex-col border-b border-border lg:border-r lg:border-b-0">
			<div class="border-b border-border bg-muted/50 px-4 py-2">
				<span class="text-sm font-medium text-muted-foreground">Code Python</span>
			</div>
			<div class="relative flex-1 overflow-hidden bg-background">
				<PythonEditor
					bind:value={pythonStore.code}
					errorLine={pythonStore.errorLine}
					disabled={isExecuting}
					onExecute={handleExecute}
				/>
			</div>
		</div>

		<!-- Right: Output placeholder -->
		<div class="flex flex-col">
			<div class="border-b border-border bg-muted/50 px-4 py-2">
				<span class="text-sm font-medium text-muted-foreground">Sortie</span>
				{#if pythonStore.executionTime > 0}
					<span class="ml-2 text-xs text-muted-foreground">
						({pythonStore.executionTime}ms)
					</span>
				{/if}
			</div>
			<div
				class="flex-1 overflow-auto bg-muted/20 p-4"
				role="region"
				aria-label="Sortie d'exécution Python"
				aria-live="polite"
			>
				{#if pythonStore.isLoading}
					<!-- Loading state -->
					<div class="flex flex-col items-center justify-center gap-4 py-8">
						<div
							class="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
						></div>
						<div class="text-center">
							<p class="font-medium text-foreground">{pythonStore.loadingStage}</p>
							<p class="text-sm text-muted-foreground">{pythonStore.loadingProgress}%</p>
						</div>
					</div>
				{:else if !hasOutput}
					<!-- Empty state -->
					<div
						class="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"
					>
						<p>Aucune sortie</p>
						<p class="text-sm">Cliquez sur "Exécuter" ou appuyez sur Ctrl+Entrée</p>
					</div>
				{:else}
					<!-- Output display -->
					<div class="flex flex-col gap-4">
						{#if pythonStore.stdout}
							<div>
								<div class="mb-1 text-xs font-medium text-muted-foreground">stdout</div>
								<pre
									class="rounded bg-background p-3 font-mono text-sm whitespace-pre-wrap text-foreground">{pythonStore.stdout}</pre>
							</div>
						{/if}

						{#if pythonStore.stderr}
							<div>
								<div class="mb-1 text-xs font-medium text-destructive">stderr</div>
								<pre
									class="rounded bg-destructive/10 p-3 font-mono text-sm whitespace-pre-wrap text-destructive">{pythonStore.stderr}</pre>
							</div>
						{/if}

						{#if pythonStore.plotData}
							<div>
								<div class="mb-1 text-xs font-medium text-muted-foreground">Plot</div>
								<img
									src={pythonStore.plotData}
									alt="Graphique matplotlib"
									class="max-w-full rounded border border-border"
								/>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
