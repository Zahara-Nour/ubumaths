<script lang="ts">
	/**
	 * Spreadsheet Edit Page
	 *
	 * Loads a saved spreadsheet and allows editing with auto-save.
	 * Features:
	 * - Loads spreadsheet data into the store on mount
	 * - Auto-saves changes to the database every 2 seconds
	 * - Shows save status to the user
	 * - Full spreadsheet functionality (formulas, formatting, etc.)
	 */

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Spreadsheet from '$lib/components/spreadsheet/Spreadsheet.svelte';
	import { spreadsheetStore } from '$lib/spreadsheet/store.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { ArrowLeft, Save, Loader2 } from 'lucide-svelte';

	let { data } = $props();

	// Save state tracking
	let isSaving = $state(false);
	let lastSaveTime = $state<Date | null>(null);
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	// Load spreadsheet data into store on mount
	onMount(() => {
		if (data.spreadsheet?.data) {
			try {
				spreadsheetStore.importData(data.spreadsheet.data);
			} catch (error) {
				console.error('Failed to import spreadsheet data:', error);
				toaster.error('Erreur lors du chargement de la feuille de calcul');
			}
		}

		// Cleanup on unmount
		return () => {
			if (saveTimeout) {
				clearTimeout(saveTimeout);
			}
		};
	});

	// Auto-save logic using $effect
	$effect(() => {
		// Watch for unsaved changes
		if (spreadsheetStore.hasUnsavedChanges && data.spreadsheet?.id) {
			// Clear previous timeout
			if (saveTimeout) clearTimeout(saveTimeout);

			// Schedule save after 2 seconds of inactivity
			saveTimeout = setTimeout(async () => {
				await saveToDatabase();
			}, 2000);
		}
	});

	/**
	 * Save spreadsheet data to the database
	 */
	async function saveToDatabase() {
		if (!data.spreadsheet?.id || isSaving) return;

		isSaving = true;

		try {
			const response = await fetch(`/api/spreadsheets/${data.spreadsheet.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					data: spreadsheetStore.exportData()
				})
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la sauvegarde');
			}

			lastSaveTime = new Date();
		} catch (error) {
			console.error('Save error:', error);
			toaster.error('Erreur lors de la sauvegarde');
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Format last save time for display
	 */
	function formatSaveTime(time: Date | null): string {
		if (!time) return 'Non sauvegarde';

		const now = new Date();
		const seconds = Math.floor((now.getTime() - time.getTime()) / 1000);

		if (seconds < 5) return 'A l instant';
		if (seconds < 60) return `Il y a ${seconds}s`;

		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `Il y a ${minutes}min`;

		return time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}

	/**
	 * Navigate back to spreadsheet list
	 */
	function goBack() {
		goto('/spreadsheet');
	}
</script>

<svelte:head>
	<title>{data.spreadsheet?.name ?? 'Tableur'} - UbuMaths</title>
</svelte:head>

<div class="spreadsheet-edit-page">
	<!-- Header -->
	<header class="page-header">
		<div class="header-left">
			<Button variant="ghost" size="sm" onclick={goBack} class="gap-2">
				<ArrowLeft class="h-4 w-4" />
				Retour
			</Button>
			<div>
				<h1 class="text-2xl font-bold">{data.spreadsheet?.name ?? 'Sans titre'}</h1>
				{#if data.spreadsheet?.description}
					<p class="text-sm text-muted-foreground">{data.spreadsheet.description}</p>
				{/if}
			</div>
		</div>

		<!-- Save status -->
		<div class="save-status text-sm text-muted-foreground">
			{#if isSaving}
				<div class="flex items-center gap-2">
					<Loader2 class="h-4 w-4 animate-spin" />
					<span>Sauvegarde...</span>
				</div>
			{:else}
				<div class="flex items-center gap-2">
					<Save class="h-4 w-4" />
					<span>{formatSaveTime(lastSaveTime)}</span>
				</div>
			{/if}
		</div>
	</header>

	<!-- Spreadsheet -->
	<div class="spreadsheet-content">
		<Spreadsheet />
	</div>
</div>

<style>
	.spreadsheet-edit-page {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 4rem);
		padding: 1rem;
		gap: 1rem;
	}

	.page-header {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.spreadsheet-content {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.save-status {
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.spreadsheet-edit-page {
			padding: 0.5rem;
			gap: 0.75rem;
		}

		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.header-left {
			width: 100%;
		}

		.page-header h1 {
			font-size: 1.25rem;
		}
	}
</style>
