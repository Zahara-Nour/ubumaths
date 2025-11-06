<!--
	RemoveWarningsModal Component
	==============================
	Modal for removing student warnings automatically (first N warnings).

	Props:
	- studentId: string - Student UUID
	- count: number - Number of warnings to remove
	- warningType?: 'C' | 'M' | 'R' | 'T' - Optional filter by type
	- studentName?: string - Student name for display
	- onComplete?: () => void - Callback on success

	Flow:
	1. Load student's warnings
	2. Filter by warningType (if specified)
	3. Display first N warnings that will be removed
	4. User confirms
	5. API call
	6. Success → Feedback → Return
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { X } from 'lucide-svelte';

	interface Warning {
		id: string;
		student_id: string;
		warning_type: 'C' | 'M' | 'R' | 'T';
		description: string | null;
		created_at: string;
	}

	interface Props {
		studentId: string;
		classId: string;
		periodId: string;
		count: number;
		warningType?: 'C' | 'M' | 'R' | 'T';
		studentName?: string;
		preloadedWarnings?: Warning[]; // If provided, skip API loading
		onComplete?: () => void | Promise<void>;
	}

	let {
		studentId,
		classId,
		periodId,
		count,
		warningType,
		studentName,
		preloadedWarnings,
		onComplete
	}: Props = $props();

	// State
	let loading = $state(true);
	let submitting = $state(false);
	let warnings = $state<Warning[]>([]);
	let warningsToRemove = $state<Warning[]>([]);
	let error = $state<string | null>(null);
	let success = $state(false);

	// Warning type labels
	const warningTypeLabels: Record<'C' | 'M' | 'R' | 'T', string> = {
		C: 'Comportement',
		M: 'Matériel',
		R: 'Retard',
		T: 'Travail'
	};

	// Warning type colors
	const warningTypeColors: Record<'C' | 'M' | 'R' | 'T', string> = {
		C: 'bg-red-500',
		M: 'bg-orange-500',
		R: 'bg-yellow-500',
		T: 'bg-blue-500'
	};

	/**
	 * Load student's warnings (or use preloaded ones)
	 */
	async function loadWarnings() {
		loading = true;
		error = null;

		try {
			// If warnings are preloaded, use them directly (skip API call)
			if (preloadedWarnings) {
				warnings = preloadedWarnings;
			} else {
				// Fetch warnings from API
				const response = await fetch(`/api/students/${studentId}/warnings`);
				if (!response.ok) throw new Error('Failed to load warnings');

				const data = await response.json();
				warnings = data.warnings || [];
			}

			// Filter by type if specified
			let filtered = warnings;
			if (warningType) {
				filtered = warnings.filter((w) => w.warning_type === warningType);
			}

			// Sort by date (most recent first) and take first N
			filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
			warningsToRemove = filtered.slice(0, count);

			if (warningsToRemove.length === 0) {
				error = 'Aucun avertissement à supprimer';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur de chargement';
			toaster.error(error);
		} finally {
			loading = false;
		}
	}

	/**
	 * Handle warnings removal with optimistic cache update
	 */
	async function handleRemove() {
		if (warningsToRemove.length === 0) return;

		submitting = true;
		error = null;

		// STEP 1: Save current state for rollback
		const previousCounts = teacherCache.getWarningsSync(classId, periodId)?.get(studentId) || {
			C: 0,
			M: 0,
			R: 0,
			T: 0
		};

		// STEP 2: Apply optimistic update (decrement counts)
		const newCounts = { ...previousCounts };
		for (const warning of warningsToRemove) {
			const type = warning.warning_type;
			if (newCounts[type] > 0) {
				newCounts[type]--;
			}
		}

		teacherCache.updateWarningsOptimistic(classId, periodId, studentId, newCounts);

		try {
			const response = await fetch('/api/warnings/remove-multiple', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId,
					warningIds: warningsToRemove.map((w) => w.id)
				})
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Échec de la suppression');
			}

			const result = await response.json();

			// SUCCESS: Cache already has correct optimistic value
			toaster.success(
				`${result.removed} avertissement${result.removed > 1 ? 's' : ''} supprimé${result.removed > 1 ? 's' : ''} !`
			);
			success = true;

			// Call onComplete callback if provided (e.g., to mark VIP card as used)
			if (onComplete) {
				await onComplete();
			}

			// Close after showing success
			setTimeout(() => {
				modalStack.pop();
			}, 1500);
		} catch (err) {
			// ROLLBACK: Revert to previous state
			teacherCache.updateWarningsOptimistic(classId, periodId, studentId, previousCounts);
			error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(error);
		} finally {
			submitting = false;
		}
	}

	/**
	 * Close modal
	 */
	function handleClose() {
		modalStack.pop();
	}

	/**
	 * Format date for display
	 */
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	// Load warnings on mount
	$effect(() => {
		loadWarnings();
	});
</script>

<!-- Modal Content (ModalStackRenderer provides backdrop and click-to-close) -->
<div
	class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
	role="dialog"
	aria-modal="true"
	aria-labelledby="remove-warnings-title"
>
	<!-- Header with close button -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 id="remove-warnings-title" class="text-2xl font-bold">
				🧹 Supprimer {count} avertissement{count > 1 ? 's' : ''}
			</h2>
			<p class="text-sm text-muted-foreground">
				{#if studentName}
					Pour {studentName}
				{:else}
					Les avertissements suivants seront supprimés
				{/if}
				{#if warningType}
					<span class="ml-2">
						(Type : {warningTypeLabels[warningType]})
					</span>
				{/if}
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

	{#if loading}
		<!-- Loading State -->
		<div class="flex justify-center py-8">
			<div
				class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
			></div>
		</div>
	{:else if error && !submitting}
		<!-- Error State -->
		<div class="flex flex-col items-center gap-4 py-8">
			<div class="text-6xl">❌</div>
			<p class="text-lg text-destructive">{error}</p>
		</div>
	{:else if success}
		<!-- Success State -->
		<div class="flex flex-col items-center gap-4 py-8">
			<div class="text-6xl">✅</div>
			<p class="text-lg font-semibold">Avertissements supprimés !</p>
		</div>
	{:else}
		<!-- Warnings List -->
		<div class="py-4">
			<p class="mb-4 text-sm text-muted-foreground">
				Les <span class="font-bold">{warningsToRemove.length}</span>
				avertissement{warningsToRemove.length > 1 ? 's' : ''} suivant{warningsToRemove.length > 1
					? 's'
					: ''} seront supprimé{warningsToRemove.length > 1 ? 's' : ''} :
			</p>

			<div class="space-y-3">
				{#each warningsToRemove as warning (warning.id)}
					<div class="flex items-center gap-3 rounded-lg bg-muted p-3">
						<Badge class={cn('text-white', warningTypeColors[warning.warning_type])}>
							{warning.warning_type}
						</Badge>
						<div class="flex-1">
							<p class="text-sm font-medium">
								{warningTypeLabels[warning.warning_type]}
							</p>
							{#if warning.description}
								<p class="line-clamp-1 text-xs text-muted-foreground">
									{warning.description}
								</p>
							{/if}
						</div>
						<div class="text-xs text-muted-foreground">
							{formatDate(warning.created_at)}
						</div>
					</div>
				{/each}
			</div>

			{#if warningsToRemove.length < count}
				<p class="mt-4 text-sm text-amber-600">
					⚠️ Seulement {warningsToRemove.length} avertissement{warningsToRemove.length > 1
						? 's'
						: ''} disponible{warningsToRemove.length > 1 ? 's' : ''} (demandé : {count})
				</p>
			{/if}
		</div>
	{/if}

	<!-- Footer -->
	{#if !loading && !success}
		<div class="mt-6 flex justify-end gap-3">
			<Button variant="outline" onclick={handleClose} disabled={submitting}>Annuler</Button>
			<Button
				variant="destructive"
				onclick={handleRemove}
				disabled={warningsToRemove.length === 0 || submitting}
			>
				{#if submitting}
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
					></div>
				{/if}
				Confirmer la suppression
			</Button>
		</div>
	{/if}
</div>
