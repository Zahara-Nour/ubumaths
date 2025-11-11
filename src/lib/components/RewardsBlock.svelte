<!--
	Rewards Block Component
	========================

	Displays a summary of student rewards with 4 tiles:
	1. Gidouilles - Total count with treasure chest image
	2. Bonus - Bonus points count with coup-double image
	3. VIP Cards - Total owned cards count (opens modal on click)
	4. Riddles - Total solved riddles count

	Used in: StudentDashboard.svelte

	CACHE USAGE:
	- Derives gidouilles, bonus, and vipCards from studentCache
	- riddlesSolved and studentId still passed as props (not in cache)
	- Reactive to cache updates via $derived
-->

<script lang="ts">
	import coffreGidouilles from '$lib/assets/images/coffre-gidouilles-transparent2.png';
	import coupDoubleImage from '$lib/assets/images/coup-double.png';
	import vipMemberImage from '$lib/assets/images/VIP-member.png';
	import enigmeImage from '$lib/assets/images/enigme.png';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { getStudentCardCounts } from '$lib/utils/vip-cards';
	import { resolve } from '$app/paths';
	import StudentVipCardsModal from '$lib/components/StudentVipCardsModal.svelte';
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';

	interface Props {
		riddlesSolved: number; // Not in cache, passed as prop
		studentId: string; // Needed for modal
	}

	let { riddlesSolved, studentId }: Props = $props();

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
		<a
			href={resolve('/dashboard')}
			class="group relative flex items-center gap-4 overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-6 transition-all hover:shadow-lg dark:border-amber-800 dark:from-amber-950 dark:to-orange-950"
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
		</a>

		<!-- Bonus Tile -->
		<a
			href={resolve('/dashboard')}
			class="group relative flex items-center gap-4 overflow-hidden rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-100 p-6 transition-all hover:shadow-lg dark:border-emerald-800 dark:from-emerald-950 dark:to-teal-950"
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
				<p class="text-sm font-medium text-emerald-800 dark:text-emerald-200">Bonus</p>
				<p class="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{bonus}</p>
			</div>
		</a>

		<!-- VIP Cards Tile -->
		<button
			type="button"
			onclick={openVipCardsModal}
			class="group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-100 p-6 text-left transition-all hover:shadow-lg dark:border-purple-800 dark:from-purple-950 dark:to-pink-950"
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
				<p class="text-sm font-medium text-purple-800 dark:text-purple-200">Cartes VIP</p>
				<p class="mt-1 text-3xl font-bold text-purple-600 dark:text-purple-400">
					{totalCardsOwned}
				</p>
			</div>
		</button>

		<!-- Riddles Tile -->
		<a
			href={resolve('/dashboard/student/riddles')}
			class="group relative flex items-center gap-4 overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-100 p-6 transition-all hover:shadow-lg dark:border-blue-800 dark:from-blue-950 dark:to-cyan-950"
		>
			<!-- Image -->
			<div class="flex-shrink-0">
				<img
					src={enigmeImage}
					alt="Énigmes"
					class="h-20 w-20 transition-transform group-hover:scale-110"
				/>
			</div>

			<!-- Stats -->
			<div class="flex-1">
				<p class="text-sm font-medium text-blue-800 dark:text-blue-200">Énigmes Résolues</p>
				<p class="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">{riddlesSolved}</p>
			</div>
		</a>
	</div>
</div>
