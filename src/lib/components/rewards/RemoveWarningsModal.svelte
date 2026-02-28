<!--
	RemoveWarningsModal Component
	==============================
	Modal for removing student warnings via remove-bulk (soft-delete, atomic RPC).

	Props:
	- studentId: string - Student UUID
	- classId: string - Class UUID
	- periodId: string - Academic period UUID
	- count: number - Number of warnings to remove
	- warningType?: 'C' | 'M' | 'R' | 'T' - Optional filter by type
	- studentName?: string - Student name for display
	- onComplete?: () => void - Callback on success

	Flow:
	1. Display confirmation summary (count + type)
	2. User confirms
	3. API call to remove-bulk with warning_types array
	4. Success → Feedback → Return
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { X } from 'lucide-svelte';
	import { WARNING_TYPE_LABELS } from '$lib/types/warnings';

	interface Props {
		studentId: string;
		classId: string;
		periodId: string;
		count: number;
		warningType?: 'C' | 'M' | 'R' | 'T';
		studentName?: string;
		cardName?: string;
		onComplete?: () => void | Promise<void>;
	}

	let {
		studentId,
		classId,
		periodId,
		count,
		warningType,
		studentName,
		cardName,
		onComplete
	}: Props = $props();

	// State
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	// Warning type labels (from shared constants)
	const warningTypeLabels = WARNING_TYPE_LABELS;

	// Warning type colors
	const warningTypeColors: Record<'C' | 'M' | 'R' | 'T', string> = {
		C: 'bg-red-500',
		M: 'bg-orange-500',
		R: 'bg-yellow-500',
		T: 'bg-blue-500'
	};

	/**
	 * Build the warning_types array for the RPC.
	 * If warningType is specified: E.g. count=3 + warningType='C' → ['C','C','C']
	 * If not specified: distribute removals across types with active warnings.
	 */
	function buildWarningTypes(): ('C' | 'M' | 'R' | 'T')[] {
		if (warningType) {
			return Array.from({ length: count }, () => warningType);
		}

		// No specific type: distribute across types that have active warnings
		const currentCounts = teacherCache.getWarningsSync(classId, periodId)?.get(studentId) || {
			C: 0,
			M: 0,
			R: 0,
			T: 0
		};

		const types: ('C' | 'M' | 'R' | 'T')[] = [];
		const remaining = { ...currentCounts };
		const typeOrder: ('C' | 'M' | 'R' | 'T')[] = ['C', 'M', 'R', 'T'];

		for (let i = 0; i < count && types.length < count; i++) {
			for (const t of typeOrder) {
				if (remaining[t] > 0 && types.length < count) {
					types.push(t);
					remaining[t]--;
				}
			}
		}

		return types;
	}

	/**
	 * Build a display summary string
	 */
	function buildSummary(): string {
		if (warningType) {
			return `${count} ${warningTypeLabels[warningType]}`;
		}
		return `${count} avertissement${count > 1 ? 's' : ''}`;
	}

	/**
	 * Handle warnings removal with optimistic cache update
	 */
	async function handleRemove() {
		submitting = true;
		error = null;

		// Build warning_types array for the RPC
		const warningTypes = buildWarningTypes();

		// STEP 1: Save current state for rollback
		const previousCounts = teacherCache.getWarningsSync(classId, periodId)?.get(studentId) || {
			C: 0,
			M: 0,
			R: 0,
			T: 0
		};

		// STEP 2: Apply optimistic update (decrement counts)
		const newCounts = { ...previousCounts };
		for (const type of warningTypes) {
			if (newCounts[type] > 0) {
				newCounts[type]--;
			}
		}

		teacherCache.updateWarningsOptimistic(classId, periodId, studentId, newCounts);

		try {
			const response = await fetch('/api/warnings/remove-bulk', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					student_id: studentId,
					class_id: classId,
					academic_period_id: periodId,
					warning_types: warningTypes,
					deletion_context: cardName
						? { source: 'vip_card' as const, card_name: cardName }
						: { source: 'teacher' as const }
				})
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Echec de la suppression');
			}

			const result = await response.json();

			// SUCCESS: Cache already has correct optimistic value
			toaster.success(
				`${result.removed} avertissement${result.removed > 1 ? 's' : ''} supprime${result.removed > 1 ? 's' : ''} !`
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
</script>

<!-- Modal Content (ModalStackRenderer provides backdrop and click-to-close) -->
<div
	class="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
	role="dialog"
	aria-modal="true"
	aria-labelledby="remove-warnings-title"
>
	<!-- Header with close button -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 id="remove-warnings-title" class="text-2xl font-bold">Supprimer des avertissements</h2>
			{#if studentName}
				<p class="text-sm text-muted-foreground">Pour {studentName}</p>
			{/if}
		</div>
		<button
			onclick={handleClose}
			class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
			aria-label="Fermer"
		>
			<X class="h-4 w-4" />
		</button>
	</div>

	{#if error && !submitting}
		<!-- Error State -->
		<div class="flex flex-col items-center gap-4 py-8">
			<p class="text-lg text-destructive">{error}</p>
		</div>
	{:else if success}
		<!-- Success State -->
		<div class="flex flex-col items-center gap-4 py-8">
			<p class="text-lg font-semibold">Avertissements supprimes !</p>
		</div>
	{:else}
		<!-- Confirmation Summary -->
		<div class="py-4">
			<div class="flex items-center gap-3 rounded-lg bg-muted p-4">
				{#if warningType}
					<Badge class={cn('text-white', warningTypeColors[warningType])}>
						{warningType}
					</Badge>
				{/if}
				<p class="text-base">
					<span class="font-bold">{buildSummary()}</span>
					{#if warningType}
						<span class="text-muted-foreground">
							({warningTypeLabels[warningType]})
						</span>
					{/if}
					{count > 1 ? ' seront supprimes' : ' sera supprime'}
				</p>
			</div>
		</div>
	{/if}

	<!-- Footer -->
	{#if !success}
		<div class="mt-6 flex justify-end gap-3">
			<Button variant="outline" onclick={handleClose} disabled={submitting}>Annuler</Button>
			<Button variant="destructive" onclick={handleRemove} disabled={submitting}>
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
