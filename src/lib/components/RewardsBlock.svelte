<!--
	Rewards Block Component
	========================

	Displays a summary of student rewards with 3 tiles:
	1. Gidouilles - Total count with treasure chest image
	2. VIP Cards - Total owned cards count
	3. Riddles - Total solved riddles count

	Used in: StudentDashboard.svelte
-->

<script lang="ts">
	import coffreGidouilles from '$lib/assets/images/coffre-gidouilles-transparent2.png';
	import vipMemberImage from '$lib/assets/images/VIP-member.png';
	import enigmeImage from '$lib/assets/images/enigme.png';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { getStudentCardCounts } from '$lib/utils/vip-cards';
	import { resolve } from '$app/paths';

	interface Props {
		gidouilles: number;
		vipCards: StudentVipCards;
		riddlesSolved: number;
	}

	let { gidouilles, vipCards, riddlesSolved }: Props = $props();

	// Calculate total VIP cards owned
	const cardCounts = $derived(getStudentCardCounts(vipCards));
	const totalCardsOwned = $derived(
		Array.from(cardCounts.values()).reduce((sum, count) => sum + count, 0)
	);
</script>

<div class="rounded-lg border border-border bg-card p-6 shadow">
	<!-- Header -->
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-foreground">Mes Récompenses</h2>
		<p class="mt-1 text-sm text-muted-foreground">Tes accomplissements et trésors collectés</p>
	</div>

	<!-- Tiles Grid -->
	<div class="grid gap-4 md:grid-cols-3">
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

		<!-- VIP Cards Tile -->
		<a
			href={resolve('/dashboard')}
			class="group relative flex items-center gap-4 overflow-hidden rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-100 p-6 transition-all hover:shadow-lg dark:border-purple-800 dark:from-purple-950 dark:to-pink-950"
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
		</a>

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
