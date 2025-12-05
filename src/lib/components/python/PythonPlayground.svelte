<script lang="ts">
	// Imports
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import PythonToolbar from './PythonToolbar.svelte';
	import PythonEditor from './PythonEditor.svelte';
	import PythonOutput from './PythonOutput.svelte';
	import PythonSplitter from './PythonSplitter.svelte';
	import PythonSaveDialog from './PythonSaveDialog.svelte';
	import PythonFileManager from './PythonFileManager.svelte';
	import PythonMigrationPrompt from './PythonMigrationPrompt.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import type { Database } from '$lib/types/database';

	// Types
	type Profile = Database['public']['Tables']['profiles']['Row'];
	type User = { id: string; email?: string };

	// Props
	let {
		user = null,
		profile = null
	}: {
		user?: User | null;
		profile?: Profile | null;
	} = $props();

	// Constants
	const STORAGE_KEY = 'ubumaths-python-splitter';
	const DEFAULT_WIDTH = 50;
	const MIN_WIDTH = 20;
	const MAX_WIDTH = 80;

	// Derived state from store
	let canExecute = $derived(pythonStore.isReady);
	let isExecuting = $derived(pythonStore.isExecuting);
	let isModified = $derived(pythonStore.isModified);
	let isLoggedIn = $derived(user !== null);
	let currentFileName = $derived(pythonStore.currentFile?.title ?? null);
	let isModifiedFromCloud = $derived(pythonStore.isModifiedFromCloud);
	let isSaving = $derived(pythonStore.isSaving);

	// Fullscreen state
	let isFullscreen = $state(false);

	// Splitter state
	let leftPanelWidth = $state(DEFAULT_WIDTH);
	let containerRef: HTMLDivElement | null = $state(null);

	// Dialog state
	let saveDialogOpen = $state(false);
	let fileManagerOpen = $state(false);

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

	function handleSave(): void {
		const success = pythonStore.saveCode();
		if (success) {
			toaster.success('Code sauvegardé');
		}
	}

	function handleShare(): void {
		try {
			const shareUrl = pythonStore.generateShareUrl();
			if (browser && navigator.clipboard) {
				navigator.clipboard.writeText(shareUrl);
				toaster.success('Lien copie dans le presse-papiers');
			}
		} catch (error) {
			if (error instanceof Error) {
				toaster.error(error.message);
			} else {
				toaster.error('Erreur lors de la generation du lien de partage');
			}
		}
	}

	function handleSaveToCloud(): void {
		saveDialogOpen = true;
	}

	function handleOpenFiles(): void {
		fileManagerOpen = true;
	}

	function handleNewFile(): void {
		pythonStore.newFile();
		toaster.success('Nouveau fichier cree');
	}

	function toggleFullscreen(): void {
		isFullscreen = !isFullscreen;
	}

	// Handle Escape key to exit fullscreen
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && isFullscreen) {
			isFullscreen = false;
		}
	}

	// Splitter handlers
	function handleSplitterDrag(deltaX: number): void {
		if (!containerRef) return;

		const containerWidth = containerRef.offsetWidth;
		const deltaPercent = (deltaX / containerWidth) * 100;
		const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, leftPanelWidth + deltaPercent));
		leftPanelWidth = newWidth;
	}

	function resetSplitterWidth(): void {
		leftPanelWidth = DEFAULT_WIDTH;
	}

	// Save splitter width to localStorage
	$effect(() => {
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY, String(leftPanelWidth));
	});

	// Initialize Pyodide when component mounts
	onMount(() => {
		pythonStore.initPyodide();

		// Load splitter width from localStorage
		if (browser) {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = parseFloat(saved);
				if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
					leftPanelWidth = parsed;
				}
			}
		}
	});

	// Clean up worker when component unmounts
	onDestroy(() => {
		pythonStore.destroy();
	});

	// Handle body scroll when fullscreen
	$effect(() => {
		if (!browser) return;

		if (isFullscreen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		// Cleanup on unmount
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class={isFullscreen
		? 'fixed inset-0 z-50 flex flex-col bg-background'
		: 'flex h-full flex-col rounded-lg border border-border bg-card shadow-lg'}
>
	<!-- Toolbar -->
	<PythonToolbar
		onExecute={handleExecute}
		onClear={handleClear}
		onCopy={handleCopy}
		onReset={handleReset}
		onShare={handleShare}
		onToggleFullscreen={toggleFullscreen}
		onIncreaseFontSize={() => pythonStore.increaseFontSize()}
		onDecreaseFontSize={() => pythonStore.decreaseFontSize()}
		onSaveToCloud={handleSaveToCloud}
		onOpenFiles={handleOpenFiles}
		onNewFile={handleNewFile}
		{canExecute}
		{isExecuting}
		{isModified}
		{isFullscreen}
		{isLoggedIn}
		{currentFileName}
		{isModifiedFromCloud}
		{isSaving}
		fontSize={pythonStore.fontSize}
	/>

	<!-- Main content area -->
	<!-- Mobile: stacked layout -->
	<div class="flex min-h-[500px] flex-1 flex-col lg:hidden">
		<!-- Editor -->
		<div class="flex flex-1 flex-col border-b border-border">
			<div class="border-b border-border bg-muted/50 px-4 py-2">
				<span class="text-sm font-medium text-muted-foreground">Code Python</span>
			</div>
			<div class="relative flex-1 overflow-hidden bg-background">
				<PythonEditor
					bind:value={pythonStore.code}
					errorLine={pythonStore.errorLine}
					disabled={isExecuting}
					fontSize={pythonStore.fontSize}
					onExecute={handleExecute}
					onSave={handleSave}
				/>
			</div>
		</div>

		<!-- Output -->
		<div class="flex flex-1 flex-col">
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
						latexOutput={pythonStore.latexOutput}
						plotlyData={pythonStore.plotlyData}
						errorLine={pythonStore.errorLine}
						executionTime={pythonStore.executionTime}
						showPedagogicErrors={pythonStore.showPedagogicErrors}
					/>
				{/if}
				{#if pythonStore.isLoadingPackages}
					<div class="mt-2 flex items-center gap-2 rounded bg-muted/50 px-3 py-2 text-sm">
						<div
							class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
						></div>
						<span class="text-muted-foreground"
							>Chargement de {pythonStore.packagesLoading.join(', ')}...</span
						>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Desktop: side-by-side layout with resizable splitter -->
	<div bind:this={containerRef} class="hidden min-h-[500px] flex-1 lg:flex">
		<!-- Left: Editor -->
		<div class="flex flex-col overflow-hidden" style="width: {leftPanelWidth}%">
			<div class="border-b border-border bg-muted/50 px-4 py-2">
				<span class="text-sm font-medium text-muted-foreground">Code Python</span>
			</div>
			<div class="relative flex-1 overflow-hidden bg-background">
				<PythonEditor
					bind:value={pythonStore.code}
					errorLine={pythonStore.errorLine}
					disabled={isExecuting}
					fontSize={pythonStore.fontSize}
					onExecute={handleExecute}
					onSave={handleSave}
				/>
			</div>
		</div>

		<!-- Splitter -->
		<PythonSplitter onDrag={handleSplitterDrag} onDoubleClick={resetSplitterWidth} />

		<!-- Right: Output -->
		<div class="flex flex-1 flex-col overflow-hidden">
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
						latexOutput={pythonStore.latexOutput}
						plotlyData={pythonStore.plotlyData}
						errorLine={pythonStore.errorLine}
						executionTime={pythonStore.executionTime}
						showPedagogicErrors={pythonStore.showPedagogicErrors}
					/>
				{/if}
				{#if pythonStore.isLoadingPackages}
					<div class="mt-2 flex items-center gap-2 rounded bg-muted/50 px-3 py-2 text-sm">
						<div
							class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
						></div>
						<span class="text-muted-foreground"
							>Chargement de {pythonStore.packagesLoading.join(', ')}...</span
						>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Migration prompt (shown when logged in user has local code) -->
<PythonMigrationPrompt {isLoggedIn} onSaveToCloud={handleSaveToCloud} />

<!-- Save to cloud dialog -->
<PythonSaveDialog bind:open={saveDialogOpen} />

<!-- File manager dialog -->
<PythonFileManager bind:open={fileManagerOpen} {profile} />
