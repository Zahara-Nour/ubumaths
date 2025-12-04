<script lang="ts">
	// Imports
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import PythonToolbar from './PythonToolbar.svelte';
	import PythonEditor from './PythonEditor.svelte';
	import PythonOutput from './PythonOutput.svelte';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

	// Derived state from store
	let canExecute = $derived(pythonStore.isReady);
	let isExecuting = $derived(pythonStore.isExecuting);

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

		<!-- Right: Output -->
		<div class="flex flex-col">
			<div class="border-b border-border bg-muted/50 px-4 py-2">
				<span class="text-sm font-medium text-muted-foreground">Sortie</span>
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
							<div class="mt-2 h-2 w-48 overflow-hidden rounded-full bg-muted">
								<div
									class="h-full bg-primary transition-all duration-300"
									style="width: {pythonStore.loadingProgress}%"
								></div>
							</div>
							<p class="mt-1 text-sm text-muted-foreground">{pythonStore.loadingProgress}%</p>
						</div>
					</div>
				{:else}
					<PythonOutput
						stdout={pythonStore.stdout}
						stderr={pythonStore.stderr}
						plotData={pythonStore.plotData}
						errorLine={pythonStore.errorLine}
						executionTime={pythonStore.executionTime}
						showPedagogicErrors={pythonStore.showPedagogicErrors}
					/>
				{/if}
			</div>
		</div>
	</div>
</div>
