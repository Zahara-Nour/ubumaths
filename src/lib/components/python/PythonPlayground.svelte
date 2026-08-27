<script lang="ts">
	// Imports
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import { debugStore } from '$lib/stores/pythonDebug.svelte';
	import PythonToolbar from './PythonToolbar.svelte';
	import PythonEditor from './PythonEditor.svelte';
	import PythonOutput from './PythonOutput.svelte';
	import PythonSplitter from './PythonSplitter.svelte';
	import PythonSaveDialog from './PythonSaveDialog.svelte';
	import PythonFileManager from './PythonFileManager.svelte';
	import PythonMigrationPrompt from './PythonMigrationPrompt.svelte';
	import PythonSettings from './PythonSettings.svelte';
	import { DebugToolbar, DebugPanel } from './debug';
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
	const STORAGE_KEY = 'chiphre-python-splitter';
	const DEFAULT_WIDTH = 50;
	const MIN_WIDTH = 20;
	const MAX_WIDTH = 80;
	// Live-record debounce (Python Tutor style): re-record this long after the
	// last keystroke while in debug mode.
	const LIVE_RECORD_DEBOUNCE_MS = 600;

	// Derived state from store
	let canExecute = $derived(pythonStore.isReady);
	let isExecuting = $derived(pythonStore.isExecuting);
	let isModified = $derived(pythonStore.isModified);
	let isLoggedIn = $derived(user !== null);
	let currentFileName = $derived(pythonStore.currentFile?.title ?? null);
	let isModifiedFromCloud = $derived(pythonStore.isModifiedFromCloud);
	let isSaving = $derived(pythonStore.isSaving);

	// Debug derived state
	let isDebugging = $derived(debugStore.isDebugging);
	let isDebugPaused = $derived(debugStore.isPaused);
	let isDebugRunning = $derived(debugStore.isRunning);
	let isDebugActive = $derived(debugStore.sessionState !== 'idle');
	let isRecordingTrace = $derived(debugStore.isRecording);
	let breakpointLines = $derived(debugStore.breakpoints.map((b) => b.lineNumber));

	// Fullscreen state
	let isFullscreen = $state(false);

	// Splitter state
	let leftPanelWidth = $state(DEFAULT_WIDTH);
	let containerRef: HTMLDivElement | null = $state(null);

	// Live-record state (non-reactive): debounce timer + last code we recorded,
	// so identical code isn't re-run.
	let liveRecordTimer: ReturnType<typeof setTimeout> | null = null;
	let lastRecordedCode: string | null = null;

	// Dialog state
	let saveDialogOpen = $state(false);
	let fileManagerOpen = $state(false);
	let settingsOpen = $state(false);

	// Functions
	// Route every Run trigger (toolbar button, Ctrl+Enter in the editor) through
	// the debug-aware handler:
	//   - Execute mode → plain pythonStore.execute()
	//   - Debug mode   → record the whole execution, then scrub (record-then-replay)
	function handleExecute(): void {
		handleDebugRun();
	}

	function handleToggleDebug(): void {
		// Don't allow toggling while a debug session is mid-flight
		if (debugStore.isRunning) return;
		debugStore.toggleMode();
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

	function handleOpenSettings(): void {
		settingsOpen = true;
	}

	function toggleFullscreen(): void {
		isFullscreen = !isFullscreen;
	}

	// Debug handlers
	// In debug mode, running = record the whole execution (record-then-replay);
	// the student then scrubs / steps through the recorded trace.
	function handleDebugRun(): void {
		if (!pythonStore.isReady) return;

		if (debugStore.mode === 'debug') {
			try {
				lastRecordedCode = pythonStore.code;
				pythonStore.recordDebugSession(pythonStore.code);
			} catch (error) {
				console.error('[PythonPlayground] Debug record failed:', error);
				toaster.error("Erreur lors de l'enregistrement de l'exécution");
				debugStore.resetSession();
			}
		} else {
			pythonStore.execute();
		}
	}

	// Live mode: (re)record the trace ~LIVE_RECORD_DEBOUNCE_MS after the last
	// code change while in debug mode (Python Tutor style). The program runs in
	// the sandboxed worker; the step budget bounds it.
	function scheduleLiveRecord(): void {
		if (liveRecordTimer) clearTimeout(liveRecordTimer);
		liveRecordTimer = setTimeout(function attempt() {
			liveRecordTimer = null;
			if (!debugStore.isDebugging || !pythonStore.isReady) return;
			const code = pythonStore.code;
			if (!code.trim()) return;
			if (code === lastRecordedCode) return; // unchanged since last record
			if (debugStore.isRecording) {
				// A record is in flight — retry shortly.
				liveRecordTimer = setTimeout(attempt, 200);
				return;
			}
			handleDebugRun(); // records and updates lastRecordedCode
		}, LIVE_RECORD_DEBOUNCE_MS);
	}

	// Toggle a breakpoint from the editor gutter (click in the margin).
	function handleToggleBreakpoint(line: number): void {
		debugStore.toggleBreakpoint(line);
	}

	// Handle keyboard shortcuts
	function handleKeydown(event: KeyboardEvent): void {
		// Escape to exit fullscreen
		if (event.key === 'Escape' && isFullscreen) {
			isFullscreen = false;
			return;
		}

		// Debug keyboard shortcuts (only when in debug mode)
		if (debugStore.isDebugging) {
			switch (event.key) {
				case 'F5':
					// F5: force a re-record now (recording is otherwise automatic)
					event.preventDefault();
					if (!debugStore.isRunning) {
						handleDebugRun();
					}
					break;
				case 'F10':
					// F10: next step in the recorded trace
					event.preventDefault();
					debugStore.stepForward();
					break;
				case 'F11':
					// F11: previous step in the recorded trace
					event.preventDefault();
					debugStore.stepBack();
					break;
				case 'F9':
					// F9: Toggle breakpoint (handled by editor via onToggleBreakpoint)
					break;
			}
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

	// Live recording: schedule a (re)record on entering debug mode and on every
	// code change; cancel + reset when leaving debug mode or on teardown.
	$effect(() => {
		void pythonStore.code;
		const active = debugStore.isDebugging && pythonStore.isReady;
		if (active) {
			scheduleLiveRecord();
		} else {
			lastRecordedCode = null;
			if (liveRecordTimer) {
				clearTimeout(liveRecordTimer);
				liveRecordTimer = null;
			}
		}
		return () => {
			if (liveRecordTimer) {
				clearTimeout(liveRecordTimer);
				liveRecordTimer = null;
			}
		};
	});

	// Initialize Pyodide when component mounts
	onMount(() => {
		pythonStore.initPyodide();
		pythonStore.initWithProfile(profile);

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
		onToggleDebug={handleToggleDebug}
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
		onOpenSettings={handleOpenSettings}
		{canExecute}
		{isExecuting}
		{isDebugging}
		{isDebugPaused}
		{isDebugRunning}
		{isModified}
		{isFullscreen}
		{isLoggedIn}
		{currentFileName}
		{isModifiedFromCloud}
		{isSaving}
		fontSize={pythonStore.fontSize}
	/>

	<!-- Debug Toolbar (only visible in debug mode) -->
	{#if isDebugging}
		<div class="border-b border-border px-4 py-2">
			<DebugToolbar disabled={!canExecute || isExecuting} />
		</div>
	{/if}

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
					debugLine={debugStore.currentLine}
					breakpoints={breakpointLines}
					disabled={isExecuting}
					fontSize={pythonStore.fontSize}
					theme={pythonStore.editorTheme}
					executor={pythonStore}
					onExecute={handleExecute}
					onSave={handleSave}
					onToggleBreakpoint={handleToggleBreakpoint}
				/>
			</div>
		</div>

		<!-- Output / Debug Panel -->
		<div class="flex flex-1 flex-col">
			<div class="border-b border-border bg-muted/50 px-4 py-2">
				<span class="text-sm font-medium text-muted-foreground">
					{isDebugActive ? 'Débogueur' : 'Sortie'}
				</span>
			</div>
			<div
				class="flex-1 overflow-auto bg-muted/20 p-4"
				role="region"
				aria-label={isDebugActive ? 'Panneau de débogage' : "Sortie d'exécution Python"}
				aria-live="polite"
			>
				{#if isDebugActive}
					{#if isRecordingTrace}
						<!-- Recording indicator (skips per-step diagram re-render) -->
						<div class="flex flex-col items-center justify-center gap-3 py-8">
							<div
								class="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
							></div>
							<p class="text-sm text-muted-foreground">
								Enregistrement de l'exécution… ({debugStore.stepCount} pas)
							</p>
						</div>
					{:else}
						<!-- Debug panel -->
						<DebugPanel />
					{/if}
				{:else if pythonStore.isLoading}
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
					debugLine={debugStore.currentLine}
					breakpoints={breakpointLines}
					disabled={isExecuting}
					fontSize={pythonStore.fontSize}
					theme={pythonStore.editorTheme}
					executor={pythonStore}
					onExecute={handleExecute}
					onSave={handleSave}
					onToggleBreakpoint={handleToggleBreakpoint}
				/>
			</div>
		</div>

		<!-- Splitter -->
		<PythonSplitter onDrag={handleSplitterDrag} onDoubleClick={resetSplitterWidth} />

		<!-- Right: Output / Debug Panel -->
		<div class="flex flex-1 flex-col overflow-hidden">
			<div class="border-b border-border bg-muted/50 px-4 py-2">
				<span class="text-sm font-medium text-muted-foreground">
					{isDebugActive ? 'Débogueur' : 'Sortie'}
				</span>
			</div>
			<div
				class="flex-1 overflow-auto bg-muted/20 p-4"
				role="region"
				aria-label={isDebugActive ? 'Panneau de débogage' : "Sortie d'exécution Python"}
				aria-live="polite"
			>
				{#if isDebugActive}
					{#if isRecordingTrace}
						<!-- Recording indicator (skips per-step diagram re-render) -->
						<div class="flex flex-col items-center justify-center gap-3 py-8">
							<div
								class="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
							></div>
							<p class="text-sm text-muted-foreground">
								Enregistrement de l'exécution… ({debugStore.stepCount} pas)
							</p>
						</div>
					{:else}
						<!-- Debug panel -->
						<DebugPanel />
					{/if}
				{:else if pythonStore.isLoading}
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

<!-- Settings dialog -->
<PythonSettings bind:open={settingsOpen} />
