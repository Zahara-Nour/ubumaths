<script lang="ts">
	import VipCardHolo from '$lib/components/VipCardHolo.svelte';
	import { VIP_CARDS, type VipCard, type StudentVipCards } from '$lib/types/vip-card';
	import { getStudentCardCounts } from '$lib/utils/vip-cards';

	interface Props {
		vipCards: StudentVipCards;
	}

	let { vipCards }: Props = $props();

	// Get student's card counts (only unused cards)
	const cardCounts = $derived(getStudentCardCounts(vipCards));

	// Group cards by rarity
	const cardsByRarity = $derived({
		common: VIP_CARDS.filter((c) => c.rarity === 'common'),
		rare: VIP_CARDS.filter((c) => c.rarity === 'rare'),
		epic: VIP_CARDS.filter((c) => c.rarity === 'epic'),
		legendary: VIP_CARDS.filter((c) => c.rarity === 'legendary')
	});

	// Calculate stats for each rarity
	const rarityStats = $derived({
		common: {
			owned: cardsByRarity.common.filter((c) => cardCounts.has(c.id)).length,
			total: cardsByRarity.common.length
		},
		rare: {
			owned: cardsByRarity.rare.filter((c) => cardCounts.has(c.id)).length,
			total: cardsByRarity.rare.length
		},
		epic: {
			owned: cardsByRarity.epic.filter((c) => cardCounts.has(c.id)).length,
			total: cardsByRarity.epic.length
		},
		legendary: {
			owned: cardsByRarity.legendary.filter((c) => cardCounts.has(c.id)).length,
			total: cardsByRarity.legendary.length
		}
	});

	// Overall collection progress
	const totalOwned = $derived(
		rarityStats.common.owned +
			rarityStats.rare.owned +
			rarityStats.epic.owned +
			rarityStats.legendary.owned
	);
	const totalCards = 26;
	const progressPercent = $derived(Math.round((totalOwned / totalCards) * 100));

	// Helper to get card count
	function getCardCount(card: VipCard): number {
		return cardCounts.get(card.id) ?? 0;
	}

	// Helper to check if card is owned
	function isCardOwned(card: VipCard): boolean {
		return cardCounts.has(card.id);
	}

	// Rarity labels in French
	const rarityLabels = {
		common: 'Commun',
		rare: 'Rare',
		epic: 'Épique',
		legendary: 'Légendaire'
	};
</script>

<div class="space-y-6">
	<!-- Collection Progress Header -->
	<div class="rounded-lg border border-border bg-card p-6 text-card-foreground">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-2xl font-bold">Ma Collection VIP</h2>
			<span class="text-xl font-semibold text-primary">
				{totalOwned} / {totalCards}
			</span>
		</div>

		<!-- Progress Bar -->
		<div class="h-4 w-full overflow-hidden rounded-full bg-muted">
			<div
				class="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
				style="width: {progressPercent}%"
			></div>
		</div>
		<p class="mt-2 text-sm text-muted-foreground">{progressPercent}% de la collection complétée</p>
	</div>

	<!-- Common Cards -->
	<div class="rounded-lg border border-border bg-card p-6 text-card-foreground">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-xl font-bold">{rarityLabels.common}</h3>
			<span class="text-sm font-medium text-muted-foreground">
				{rarityStats.common.owned} / {rarityStats.common.total}
			</span>
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{#each cardsByRarity.common as card (card.id)}
				<div class:grayscale={!isCardOwned(card)} class:opacity-50={!isCardOwned(card)}>
					<VipCardHolo {card} count={getCardCount(card)} />
				</div>
			{/each}
		</div>
	</div>

	<!-- Rare Cards -->
	<div class="rounded-lg border border-border bg-card p-6 text-card-foreground">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-xl font-bold">{rarityLabels.rare}</h3>
			<span class="text-sm font-medium text-muted-foreground">
				{rarityStats.rare.owned} / {rarityStats.rare.total}
			</span>
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{#each cardsByRarity.rare as card (card.id)}
				<div class:grayscale={!isCardOwned(card)} class:opacity-50={!isCardOwned(card)}>
					<VipCardHolo {card} count={getCardCount(card)} />
				</div>
			{/each}
		</div>
	</div>

	<!-- Epic Cards -->
	<div class="rounded-lg border border-border bg-card p-6 text-card-foreground">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-xl font-bold">{rarityLabels.epic}</h3>
			<span class="text-sm font-medium text-muted-foreground">
				{rarityStats.epic.owned} / {rarityStats.epic.total}
			</span>
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{#each cardsByRarity.epic as card (card.id)}
				<div class:grayscale={!isCardOwned(card)} class:opacity-50={!isCardOwned(card)}>
					<VipCardHolo {card} count={getCardCount(card)} />
				</div>
			{/each}
		</div>
	</div>

	<!-- Legendary Cards -->
	<div class="rounded-lg border border-border bg-card p-6 text-card-foreground">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-xl font-bold">{rarityLabels.legendary}</h3>
			<span class="text-sm font-medium text-muted-foreground">
				{rarityStats.legendary.owned} / {rarityStats.legendary.total}
			</span>
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{#each cardsByRarity.legendary as card (card.id)}
				<div class:grayscale={!isCardOwned(card)} class:opacity-50={!isCardOwned(card)}>
					<VipCardHolo {card} count={getCardCount(card)} />
				</div>
			{/each}
		</div>
	</div>
</div>
