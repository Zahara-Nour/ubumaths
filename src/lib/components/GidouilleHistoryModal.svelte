<!--
	GidouilleHistoryModal Component
	================================
	Modal dialog displaying the history of gidouille changes for a student.

	Shows when gidouilles were:
	- Earned (green, + icon)
	- Spent (orange, arrow icon)
	- Removed (red, X icon)

	Used in: RewardsBlock.svelte (student dashboard)
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X, Plus, ArrowRight, Trash2 } from 'lucide-svelte';
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import gidouilleImage from '$lib/assets/images/gidouille.png';

	// Type for gidouille history entries (matches API response)
	interface GidouilleHistoryEntry {
		id: string;
		delta: number;
		reason: string | null;
		created_at: string;
		created_by_name: string | null;
	}

	// State for history data
	let history = $state<GidouilleHistoryEntry[]>([]);
	let loading = $state(true);
	let errorMessage = $state<string | null>(null);

	// Get current gidouilles count from cache
	const currentGidouilles = $derived(studentCache.getRewardsSync()?.gidouilles ?? 0);

	// Fetch history on mount
	$effect(() => {
		fetchHistory();
	});

	async function fetchHistory() {
		loading = true;
		errorMessage = null;

		try {
			const response = await fetch('/api/student/gidouilles-history');
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Erreur lors du chargement');
			}

			history = data.history;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erreur inconnue';
			errorMessage = message;
			toaster.error(message);
		} finally {
			loading = false;
		}
	}

	// Handle modal close
	function handleClose() {
		modalStack.pop();
	}

	/**
	 * Determine entry type based on delta and reason
	 * - Removed: reason contains "supprim" or "retir"
	 * - Spent: delta < 0 (but not removed)
	 * - Earned: delta > 0
	 */
	function getEntryType(entry: GidouilleHistoryEntry): 'earned' | 'spent' | 'removed' {
		const reason = entry.reason?.toLowerCase() ?? '';
		if (entry.delta < 0 && (reason.includes('supprim') || reason.includes('retir'))) {
			return 'removed';
		}
		if (entry.delta < 0) {
			return 'spent';
		}
		return 'earned';
	}

	/**
	 * Format date in French locale
	 * Example: "15 nov. 2024 - 14:30"
	 */
	function formatDate(isoDate: string): string {
		const date = new Date(isoDate);
		return new Intl.DateTimeFormat('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
</script>

<!-- Modal Content -->
<div
	class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
	role="dialog"
	aria-modal="true"
	aria-labelledby="gidouille-history-title"
>
	<!-- Header with close button -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 id="gidouille-history-title" class="flex items-center gap-2 text-2xl font-bold">
				<img src={gidouilleImage} alt="Gidouille" class="h-6 w-6" />
				Journal des Gidouilles
			</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Solde actuel : <span class="font-semibold text-amber-600">{currentGidouilles}</span> gidouilles
			</p>
		</div>
		<button
			onclick={handleClose}
			class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
			aria-label="Fermer"
		>
			<X class="h-4 w-4" />
		</button>
	</div>

	<!-- Content -->
	{#if loading}
		<!-- Loading State -->
		<div class="flex items-center justify-center py-12">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent"
			></div>
			<span class="ml-3 text-muted-foreground">Chargement...</span>
		</div>
	{:else if errorMessage}
		<!-- Error State -->
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<div
				class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900"
			>
				<X class="h-8 w-8 text-red-600 dark:text-red-400" />
			</div>
			<p class="text-muted-foreground">{errorMessage}</p>
			<Button variant="outline" class="mt-4" onclick={fetchHistory}>Reessayer</Button>
		</div>
	{:else if history.length === 0}
		<!-- Empty State -->
		<div class="flex flex-col items-center justify-center px-4 py-12 text-center">
			<div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
				<img src={gidouilleImage} alt="Gidouille" class="h-10 w-10 opacity-50" />
			</div>
			<h3 class="mb-2 text-lg font-semibold text-foreground">Aucun historique</h3>
			<p class="max-w-sm text-muted-foreground">
				Tu n'as pas encore de gidouilles. Continue a bien travailler !
			</p>
		</div>
	{:else}
		<!-- History List -->
		<div class="space-y-2">
			{#each history as entry (entry.id)}
				{@const entryType = getEntryType(entry)}
				<div
					class="flex items-center gap-3 rounded-lg p-3 {entryType === 'earned'
						? 'bg-green-50 dark:bg-green-950'
						: entryType === 'spent'
							? 'bg-orange-50 dark:bg-orange-950'
							: 'bg-red-50 dark:bg-red-950'}"
				>
					<!-- Icon -->
					<div
						class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full {entryType ===
						'earned'
							? 'bg-green-100 dark:bg-green-900'
							: entryType === 'spent'
								? 'bg-orange-100 dark:bg-orange-900'
								: 'bg-red-100 dark:bg-red-900'}"
					>
						{#if entryType === 'earned'}
							<Plus class="h-5 w-5 text-green-600 dark:text-green-400" />
						{:else if entryType === 'spent'}
							<ArrowRight class="h-5 w-5 text-orange-600 dark:text-orange-400" />
						{:else}
							<Trash2 class="h-5 w-5 text-red-600 dark:text-red-400" />
						{/if}
					</div>

					<!-- Delta -->
					<div
						class="w-12 flex-shrink-0 text-center text-lg font-bold {entryType === 'earned'
							? 'text-green-600 dark:text-green-400'
							: entryType === 'spent'
								? 'text-orange-600 dark:text-orange-400'
								: 'text-red-600 dark:text-red-400'}"
					>
						{entry.delta > 0 ? '+' : ''}{entry.delta}
					</div>

					<!-- Details -->
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-foreground">
							{entry.reason || 'Aucune raison specifiee'}
						</p>
						<p class="text-xs text-muted-foreground">
							{formatDate(entry.created_at)}
							{#if entry.created_by_name}
								<span class="ml-1">- {entry.created_by_name}</span>
							{/if}
						</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Footer -->
	<div class="mt-6 flex justify-end">
		<Button variant="outline" onclick={handleClose}>Fermer</Button>
	</div>
</div>
