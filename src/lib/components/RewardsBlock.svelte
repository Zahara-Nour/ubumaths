<!--
	Rewards & Warnings Block Component
	====================================

	Displays a summary of student rewards and warnings with 4 tiles:
	1. Gidouilles - Count with gidouille icon (opens history modal)
	2. Bonus - Count with star icon (opens history modal)
	3. VIP Cards - Unused cards count with VIP miniature (opens cards modal)
	4. Warnings - Score X/20 with color-coded badge and breakdown by type

	Uses same icons as teacher's StudentQuickActionsTable for consistency.

	Used in: StudentDashboard.svelte

	CACHE USAGE:
	- Derives gidouilles, bonus, and vipCards from studentCache
	- Derives warnings from studentCache (keyed by periodId)
	- studentId passed as prop for modal context
	- Reactive to cache updates via $derived
-->

<script lang="ts">
	import { Star } from 'lucide-svelte';
	import gidouilleImg from '$lib/assets/images/gidouille.png';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { getTotalUnusedCards } from '$lib/utils/vip-cards';
	import StudentVipCardsModal from '$lib/components/StudentVipCardsModal.svelte';
	import StudentJournalModal from '$lib/components/rewards/StudentJournalModal.svelte';
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { WARNING_TYPE_LABELS, type WarningType } from '$lib/types/warnings';
	import type { StudentWarningCounts } from '$lib/server/warnings';

	interface Props {
		riddlesSolved: number; // Not in cache, passed as prop (unused - Riddles tile removed)
		studentId: string; // Needed for modal
		periodId: string | null; // Academic period for warnings
	}

	let { riddlesSolved: _riddlesSolved, studentId, periodId }: Props = $props();

	// Derive rewards from cache (reactive to cache updates)
	const rewards = $derived(studentCache.getRewardsSync());
	const gidouilles = $derived(rewards?.gidouilles ?? 0);
	const bonus = $derived(rewards?.bonus ?? 0);
	const vipCards = $derived<StudentVipCards>(rewards?.vip_cards ?? {});

	// Count unused VIP cards only (aligned with teacher view)
	const unusedVipCardCount = $derived(getTotalUnusedCards(vipCards));

	// Derive warnings from cache (SvelteMap ensures proper reactivity)
	const warningsData = $derived(periodId ? studentCache.getWarningsSync(periodId) : null);
	const warningCounts = $derived<StudentWarningCounts>(
		warningsData?.counts ?? { C: 0, M: 0, R: 0, T: 0 }
	);
	const totalWarnings = $derived(
		warningCounts.C + warningCounts.M + warningCounts.R + warningCounts.T
	);
	const warningScore = $derived(Math.max(0, Math.min(20, 20 - totalWarnings)));

	/**
	 * Get warning score badge variant (same logic as teacher dashboard)
	 */
	function getScoreBadgeVariant(score: number): 'default' | 'destructive' | 'secondary' {
		if (score >= 15) return 'default'; // Green
		if (score >= 10) return 'secondary'; // Orange
		return 'destructive'; // Red
	}

	// Open VIP cards modal
	function openVipCardsModal() {
		modalStack.push({
			component: StudentVipCardsModal,
			props: {
				studentId
			},
			canDismiss: true
		});
	}

	// Open bonus journal modal
	function openBonusJournal() {
		modalStack.push({
			component: StudentJournalModal,
			props: {
				rewardType: 'bonus',
				title: 'Journal des Bonus'
			},
			canDismiss: true
		});
	}

	// Open gidouille journal modal
	function openGidouilleJournal() {
		modalStack.push({
			component: StudentJournalModal,
			props: {
				rewardType: 'gidouilles',
				title: 'Journal des Gidouilles'
			},
			canDismiss: true
		});
	}

	// Open warnings journal modal
	function openWarningsJournal() {
		modalStack.push({
			component: StudentJournalModal,
			props: {
				rewardType: 'warning',
				title: 'Journal des Avertissements'
			},
			canDismiss: true
		});
	}
</script>

<div class="rounded-lg border border-border bg-card p-6 shadow">
	<!-- Header -->
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-foreground">Récompenses & Avertissements</h2>
	</div>

	<!-- Tiles Grid -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Gidouilles Tile -->
		<button
			type="button"
			onclick={openGidouilleJournal}
			class="group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-lg border border-border p-6 text-left transition-all hover:shadow-lg"
		>
			<div class="flex-shrink-0">
				<img
					src={gidouilleImg}
					alt="Gidouilles"
					class="h-10 w-10 transition-transform group-hover:scale-110"
				/>
			</div>
			<div class="flex-1">
				<p class="text-sm font-medium text-amber-800 dark:text-amber-200">Gidouilles</p>
				<p class="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{gidouilles}</p>
			</div>
		</button>

		<!-- Bonus Tile -->
		<button
			type="button"
			onclick={openBonusJournal}
			class="group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-lg border border-border p-6 text-left transition-all hover:shadow-lg"
		>
			<div class="flex-shrink-0">
				<Star
					class="h-10 w-10 fill-amber-400 text-amber-400 transition-transform group-hover:scale-110"
				/>
			</div>
			<div class="flex-1">
				<p class="text-sm font-medium text-amber-800 dark:text-amber-200">Bonus</p>
				<p class="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{bonus}</p>
			</div>
		</button>

		<!-- VIP Cards Tile -->
		<button
			type="button"
			onclick={openVipCardsModal}
			class="group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-lg border border-border p-6 text-left transition-all hover:shadow-lg"
		>
			<!-- VIP Card Miniature (same as teacher dashboard) -->
			<div class="flex-shrink-0">
				<div
					class="flex h-14 w-10 items-center justify-center overflow-hidden rounded-sm border border-amber-400 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-sm transition-transform group-hover:scale-110"
				>
					<span
						class="text-xs font-black tracking-tight text-white"
						style="text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.3);">VIP</span
					>
				</div>
			</div>
			<div class="flex-1">
				<p class="text-sm font-medium text-amber-800 dark:text-amber-200">Cartes VIP</p>
				<p class="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
					{unusedVipCardCount}
				</p>
			</div>
		</button>

		<!-- Warnings Tile -->
		<button
			type="button"
			onclick={openWarningsJournal}
			class="group relative flex w-full cursor-pointer flex-col gap-3 overflow-hidden rounded-lg border border-border p-6 text-left transition-all hover:shadow-lg"
		>
			<!-- Score -->
			<div class="flex items-center gap-3">
				<div class="flex-shrink-0">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-sm"
					>
						<span class="text-sm leading-none font-bold">!</span>
					</div>
				</div>
				<div class="flex-1">
					<p class="text-sm font-medium text-muted-foreground">Avertissements</p>
					<div class="mt-1">
						<Badge variant={getScoreBadgeVariant(warningScore)} class="px-3 py-1 text-lg">
							{warningScore}/20
						</Badge>
					</div>
				</div>
			</div>

			<!-- Warning breakdown by type -->
			{#if totalWarnings > 0}
				<div class="flex flex-wrap gap-1.5 border-t border-border pt-3">
					{#each ['R', 'T', 'M', 'C'] as type (type)}
						{@const count = warningCounts[type as WarningType]}
						{#if count > 0}
							<Badge variant="destructive" class="text-xs">
								{WARNING_TYPE_LABELS[type as WarningType]}: {count}
							</Badge>
						{/if}
					{/each}
				</div>
			{/if}
		</button>
	</div>
</div>
