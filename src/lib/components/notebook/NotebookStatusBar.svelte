<script lang="ts">
	/**
	 * NotebookStatusBar Component
	 *
	 * Displays notebook status information with autosave indicators
	 * Features:
	 * - Kernel status (initializing/ready/busy/error)
	 * - Save status (autosaving, saving, unsaved, saved confirmation)
	 * - Last saved time (with relative formatting)
	 * - Cell count
	 * - Execution queue status
	 * - Visual indicators: pulsing dot for autosave, checkmark for saved confirmation
	 */

	import type { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import { Circle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-svelte';

	// Props
	let {
		notebook = null as NotebookStore | null
	}: {
		notebook?: NotebookStore | null;
	} = $props();

	// Derived state
	let kernelStatus = $derived.by(() => {
		if (!notebook) return 'disconnected';
		if (notebook.hasError) return 'error';
		if (notebook.isLoading2) return 'initializing';
		if (notebook.isExecutingAny) return 'busy';
		if (notebook.isReady) return 'ready';
		return 'idle';
	});

	let kernelStatusText = $derived.by(() => {
		switch (kernelStatus) {
			case 'disconnected':
				return 'Noyau déconnecté';
			case 'error':
				return 'Erreur du noyau';
			case 'initializing':
				return 'Initialisation...';
			case 'busy':
				return 'Exécution en cours...';
			case 'ready':
				return 'Noyau prêt';
			case 'idle':
				return 'Noyau inactif';
			default:
				return 'Statut inconnu';
		}
	});

	let kernelIcon = $derived.by(() => {
		switch (kernelStatus) {
			case 'disconnected':
				return Circle;
			case 'error':
				return AlertCircle;
			case 'initializing':
			case 'busy':
				return Loader2;
			case 'ready':
				return CheckCircle2;
			default:
				return Circle;
		}
	});

	let kernelColorClass = $derived.by(() => {
		switch (kernelStatus) {
			case 'error':
				return 'text-destructive';
			case 'busy':
			case 'initializing':
				return 'text-primary';
			case 'ready':
				return 'text-green-600 dark:text-green-400';
			default:
				return 'text-muted-foreground';
		}
	});

	let cellCount = $derived(notebook?.cells.length ?? 0);
	let queuedCellsCount = $derived(notebook?.executionQueue.length ?? 0);
	let isSaving = $derived(notebook?.isSaving ?? false);
	let isAutoSaving = $derived(notebook?.isAutoSaving ?? false);
	let isModified = $derived(notebook?.isModified ?? false);
	let lastSavedTime = $derived(notebook?.lastSavedTime ?? null);

	// State for "Saved" confirmation display
	let showSavedConfirmation = $state(false);
	let savedConfirmationTimeout: ReturnType<typeof setTimeout> | null = null;

	// Watch for successful autosave completion
	$effect(() => {
		// When autosave completes (isAutoSaving becomes false) and not modified anymore
		if (!isAutoSaving && !isSaving && !isModified && lastSavedTime) {
			// Show brief "Saved" confirmation (500ms)
			showSavedConfirmation = true;

			// Clear any previous timeout
			if (savedConfirmationTimeout) {
				clearTimeout(savedConfirmationTimeout);
			}

			// Hide confirmation after 500ms
			savedConfirmationTimeout = setTimeout(() => {
				showSavedConfirmation = false;
				savedConfirmationTimeout = null;
			}, 500);
		}
	});

	// Format last saved time with save status
	let lastSavedText = $derived.by(() => {
		if (!notebook?.notebook) return '';
		if (isAutoSaving) return 'Sauvegarde automatique...';
		if (isSaving) return 'Enregistrement...';
		if (showSavedConfirmation) return 'Enregistré';
		if (isModified) return 'Non enregistré';
		if (!lastSavedTime) return '';

		const now = new Date();
		const diffMs = now.getTime() - lastSavedTime.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return "Enregistré à l'instant";
		if (diffMins < 60) return `Enregistré il y a ${diffMins} min`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `Enregistré il y a ${diffHours} h`;
		return `Enregistré le ${lastSavedTime.toLocaleDateString()}`;
	});
</script>

<div class="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-xs">
	<!-- Left side: Kernel status -->
	<div class="flex items-center gap-4">
		<!-- Kernel status -->
		{#if kernelIcon}
			{@const KernelIcon = kernelIcon}
			<div class="flex items-center gap-1.5 {kernelColorClass}">
				<KernelIcon
					class="size-3.5 {kernelStatus === 'busy' || kernelStatus === 'initializing'
						? 'animate-spin'
						: ''}"
				/>
				<span class="font-medium">{kernelStatusText}</span>
			</div>
		{/if}

		<!-- Queue status -->
		{#if queuedCellsCount > 0}
			<div class="flex items-center gap-1.5 text-muted-foreground">
				<span>File d'attente:</span>
				<span class="font-medium text-primary">{queuedCellsCount}</span>
			</div>
		{/if}

		<!-- Loading progress -->
		{#if notebook?.isLoading2 && notebook.loadingProgress > 0}
			<div class="flex items-center gap-2 text-muted-foreground">
				<div class="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
					<div
						class="h-full bg-primary transition-all duration-300"
						style="width: {notebook.loadingProgress}%"
					></div>
				</div>
				<span>{notebook.loadingProgress}%</span>
			</div>
		{/if}
	</div>

	<!-- Right side: Cell count and save status -->
	<div class="flex items-center gap-4 text-muted-foreground">
		<!-- Cell count -->
		<div>
			<span class="font-medium">{cellCount}</span>
			{cellCount === 1 ? 'cellule' : 'cellules'}
		</div>

		<!-- Save status -->
		<div
			class={isAutoSaving
				? 'flex items-center gap-1 text-primary'
				: showSavedConfirmation
					? 'flex items-center gap-1 text-green-600 dark:text-green-400'
					: isModified
						? 'text-amber-600 dark:text-amber-400'
						: ''}
		>
			{#if isAutoSaving}
				<div class="size-2 animate-pulse rounded-full bg-primary"></div>
			{:else if showSavedConfirmation}
				<CheckCircle2 class="size-3" />
			{/if}
			{lastSavedText}
		</div>
	</div>
</div>
