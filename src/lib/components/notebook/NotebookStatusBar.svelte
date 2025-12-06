<script lang="ts">
	/**
	 * NotebookStatusBar Component
	 *
	 * Displays notebook status information
	 * Features:
	 * - Kernel status (initializing/ready/busy/error)
	 * - Last saved time
	 * - Cell count
	 * - Execution queue status
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
	let isModified = $derived(notebook?.isModified ?? false);

	// Format last saved time
	let lastSavedText = $derived.by(() => {
		if (!notebook?.notebook) return '';
		if (isModified) return 'Non enregistré';
		if (isSaving) return 'Enregistrement...';

		const updatedAt = new Date(notebook.notebook.updated_at);
		const now = new Date();
		const diffMs = now.getTime() - updatedAt.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return "Enregistré à l'instant";
		if (diffMins < 60) return `Enregistré il y a ${diffMins} min`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `Enregistré il y a ${diffHours} h`;
		return `Enregistré le ${updatedAt.toLocaleDateString()}`;
	});
</script>

<div class="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-xs">
	<!-- Left side: Kernel status -->
	<div class="flex items-center gap-4">
		<!-- Kernel status -->
		<div class="flex items-center gap-1.5 {kernelColorClass}">
			<svelte:component
				this={kernelIcon}
				class="size-3.5 {kernelStatus === 'busy' || kernelStatus === 'initializing'
					? 'animate-spin'
					: ''}"
			/>
			<span class="font-medium">{kernelStatusText}</span>
		</div>

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
		<div class={isModified ? 'text-amber-600 dark:text-amber-400' : ''}>
			{lastSavedText}
		</div>
	</div>
</div>
