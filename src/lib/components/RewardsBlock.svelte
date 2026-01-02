<!--
	Rewards Block Component
	========================

	Displays a summary of student rewards with 3 tiles:
	1. Gidouilles - Total count with treasure chest image
	2. Bonus - Bonus points count (opens history modal on click)
	3. VIP Cards - Total owned cards count (opens modal on click)

	Used in: StudentDashboard.svelte

	CACHE USAGE:
	- Derives gidouilles, bonus, and vipCards from studentCache
	- studentId passed as prop for modal context
	- Reactive to cache updates via $derived
-->

<script lang="ts">
	import coffreGidouilles from '$lib/assets/images/coffre-gidouilles-transparent2.png';
	import coupDoubleImage from '$lib/assets/images/coup-double.png';
	import vipMemberImage from '$lib/assets/images/VIP-member.png';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { getStudentCardCounts } from '$lib/utils/vip-cards';
	import StudentVipCardsModal from '$lib/components/StudentVipCardsModal.svelte';
	import BonusHistoryModal from '$lib/components/BonusHistoryModal.svelte';
	import GidouilleHistoryModal from '$lib/components/GidouilleHistoryModal.svelte';
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';

	interface Props {
		riddlesSolved: number; // Not in cache, passed as prop (unused - Riddles tile removed)
		studentId: string; // Needed for modal
	}

	let { riddlesSolved: _riddlesSolved, studentId }: Props = $props();

	// Derive rewards from cache (reactive to cache updates)
	const rewards = $derived(studentCache.getRewardsSync());
	const gidouilles = $derived(rewards?.gidouilles ?? 0);
	const bonus = $derived(rewards?.bonus ?? 0);
	const vipCards = $derived<StudentVipCards>(rewards?.vip_cards ?? {});

	// Calculate total VIP cards owned
	const cardCounts = $derived(getStudentCardCounts(vipCards));
	const totalCardsOwned = $derived(
		Array.from(cardCounts.values()).reduce((sum, count) => sum + count, 0)
	);

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

	// Open bonus history modal
	function openBonusHistoryModal() {
		modalStack.push({
			component: BonusHistoryModal,
			props: {},
			canDismiss: true
		});
	}

	// Open gidouille history modal
	function openGidouilleHistoryModal() {
		modalStack.push({
			component: GidouilleHistoryModal,
			props: {},
			canDismiss: true
		});
	}
</script>

<div class="rounded-lg border border-border bg-card p-6 shadow">
	<!-- Header -->
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-foreground">Mes Récompenses</h2>
		<p class="mt-1 text-sm text-muted-foreground">Tes accomplissements et trésors collectés</p>
	</div>

	<!-- Tiles Grid -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Gidouilles Tile -->
		<button
			type="button"
			onclick={openGidouilleHistoryModal}
			class="group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden p-6 text-left transition-all hover:shadow-lg"
		>
			<!-- Image -->
			<div class="flex-shrink-0">
				<img
					src={coffreGidouilles}
					alt="Coffre de Gidouilles"
					class="h-20 w-20 transition-transform group-hover:scale-110"
				/>
			</div>

			<!-- Stats -->
			<div class="flex-1">
				<p class="text-sm font-medium text-amber-800 dark:text-amber-200">Gidouilles</p>
				<p class="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{gidouilles}</p>
			</div>
		</button>

		<!-- Bonus Tile -->
		<button
			type="button"
			onclick={openBonusHistoryModal}
			class="group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden p-6 text-left transition-all hover:shadow-lg"
		>
			<!-- Image -->
			<div class="flex-shrink-0">
				<img
					src={coupDoubleImage}
					alt="Bonus"
					class="h-20 w-20 transition-transform group-hover:scale-110"
				/>
			</div>

			<!-- Stats -->
			<div class="flex-1">
				<p class="text-sm font-medium text-amber-800 dark:text-amber-200">Bonus</p>
				<p class="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{bonus}</p>
			</div>
		</button>

		<!-- VIP Cards Tile -->
		<button
			type="button"
			onclick={openVipCardsModal}
			class="group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden p-6 text-center transition-all hover:shadow-lg"
		>
			<!-- Image -->
			<div class="flex-shrink-0">
				<img
					src={vipMemberImage}
					alt="Cartes VIP"
					class="h-20 w-20 transition-transform group-hover:scale-110"
				/>
			</div>

			<!-- Stats -->
			<div class="flex-1">
				<p class="text-sm font-medium text-amber-800 dark:text-amber-200">Cartes VIP</p>
				<p class="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
					{totalCardsOwned}
				</p>
			</div>
		</button>
	</div>
</div>
