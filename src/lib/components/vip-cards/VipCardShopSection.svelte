<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Search, ShoppingCart, Coins, Sparkles } from 'lucide-svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import VipCardPurchaseModal from './VipCardPurchaseModal.svelte';
	import type { VipCard, VipCardRarity } from '$lib/types/vip-card';
	import { RARITY_PRICES } from '$lib/types/vip-card';
	import {
		RARITY_COLORS,
		RARITY_TEXT_COLORS,
		RARITY_LABELS,
		RARITY_ORDER,
		RARITY_FILTER_OPTIONS
	} from '$lib/constants/vip-card-ui';

	interface Props {
		supabase: unknown; // Only used to detect auth context
		userId: string;
	}

	let { supabase, userId }: Props = $props();

	// State
	let cards = $state<VipCard[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let serverBalance = $state(0); // Balance from server
	let optimisticDeduction = $state(0); // Pending deductions
	let searchValue = $state('');
	let selectedRarity = $state<VipCardRarity | 'all'>('all');
	let selectedSort = $state<'price' | 'name' | 'rarity'>('price');
	let selectedCard = $state<VipCard | null>(null);
	let showPurchaseModal = $state(false);

	// Optimistic balance (server balance - pending deductions)
	let gidouillesBalance = $derived(serverBalance - optimisticDeduction);

	// Sort options
	const sortOptions = [
		{ value: 'price', label: 'Prix croissant' },
		{ value: 'name', label: 'Nom A-Z' },
		{ value: 'rarity', label: 'Rarete' }
	];

	// Fetch shop cards and balance from API
	async function fetchShopData() {
		isLoading = true;
		error = null;

		try {
			const shopResponse = await fetch('/api/vip-cards/shop');
			if (!shopResponse.ok) {
				throw new Error('Erreur lors du chargement de la boutique');
			}
			const shopData = await shopResponse.json();
			cards = shopData.cards || [];
			serverBalance = shopData.balance ?? 0;
			optimisticDeduction = 0; // Reset on fresh fetch
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur inconnue';
		} finally {
			isLoading = false;
		}
	}

	// Initial fetch
	$effect(() => {
		if (!supabase || !userId) return;
		fetchShopData();
	});

	// Filtered and sorted cards
	let filteredCards = $derived.by(() => {
		let result = [...cards];

		// Filter by search
		if (searchValue.trim()) {
			const search = searchValue.toLowerCase();
			result = result.filter(
				(c) => c.name.toLowerCase().includes(search) || c.description.toLowerCase().includes(search)
			);
		}

		// Filter by rarity
		if (selectedRarity !== 'all') {
			result = result.filter((c) => c.rarity === selectedRarity);
		}

		// Sort
		if (selectedSort === 'price') {
			result.sort((a, b) => {
				const priceA = a.basePrice ?? RARITY_PRICES[a.rarity];
				const priceB = b.basePrice ?? RARITY_PRICES[b.rarity];
				return priceA - priceB;
			});
		} else if (selectedSort === 'name') {
			result.sort((a, b) => a.name.localeCompare(b.name));
		} else if (selectedSort === 'rarity') {
			result.sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
		}

		return result;
	});

	// Handle purchase click
	function handlePurchaseClick(card: VipCard) {
		selectedCard = card;
		showPurchaseModal = true;
	}

	// Handle optimistic purchase - instant UI update before server confirms
	function handleOptimisticPurchase(price: number) {
		optimisticDeduction += price;
	}

	// Handle purchase complete - refresh from server to get confirmed state
	async function handlePurchaseComplete() {
		await fetchShopData();
	}

	// Handle purchase error - rollback optimistic update
	function handlePurchaseError(price: number) {
		optimisticDeduction = Math.max(0, optimisticDeduction - price);
	}

	// Get card price
	function getCardPrice(card: VipCard): number {
		return card.basePrice ?? RARITY_PRICES[card.rarity] ?? 20;
	}
</script>

<div class="space-y-6">
	<!-- Header with balance -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="flex items-center gap-2 text-2xl font-bold">
				<Sparkles class="h-6 w-6 text-primary" />
				Cartes VIP
			</h2>
			<p class="text-muted-foreground">Achete des cartes VIP avec tes gidouilles</p>
		</div>
		<div class="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 shadow-sm">
			<Coins class="h-5 w-5 text-yellow-500" />
			<span class="text-lg font-semibold">{gidouillesBalance.toFixed(1)}</span>
			<span class="text-sm text-muted-foreground">gidouilles</span>
		</div>
	</div>

	<!-- Filters and Search -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
		<!-- Search -->
		<div class="flex flex-1 gap-2">
			<div class="relative flex-1">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Rechercher une carte..."
					bind:value={searchValue}
					class="pl-10"
				/>
			</div>
		</div>

		<!-- Rarity Filter -->
		<div class="w-full sm:w-48">
			<MySelect
				type="single"
				bind:value={selectedRarity}
				items={RARITY_FILTER_OPTIONS}
				placeholder="Rarete"
			/>
		</div>

		<!-- Sort -->
		<div class="w-full sm:w-48">
			<MySelect
				type="single"
				bind:value={selectedSort}
				items={sortOptions}
				placeholder="Trier par"
			/>
		</div>
	</div>

	<!-- Cards Grid -->
	{#if isLoading}
		<div
			class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
			role="status"
			aria-live="polite"
			aria-label="Chargement de la boutique"
		>
			{#each Array(8) as _, i (i)}
				<Skeleton class="h-64 w-full rounded-lg" />
			{/each}
		</div>
	{:else if error}
		<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
			<p class="text-destructive">{error}</p>
			<Button onclick={fetchShopData} variant="outline" class="mt-4">Reessayer</Button>
		</div>
	{:else if filteredCards.length === 0}
		<div class="rounded-lg border bg-card p-12 text-center">
			<ShoppingCart class="mx-auto h-12 w-12 text-muted-foreground" />
			<h3 class="mt-4 text-lg font-semibold">Aucune carte trouvee</h3>
			<p class="mt-2 text-sm text-muted-foreground">
				{#if searchValue || selectedRarity !== 'all'}
					Essayez de modifier vos filtres de recherche
				{:else}
					Aucune carte VIP n'est disponible a l'achat
				{/if}
			</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each filteredCards as card (card.id)}
				{@const price = getCardPrice(card)}
				{@const canAfford = gidouillesBalance >= price}
				<button
					type="button"
					class="group relative flex flex-col overflow-hidden rounded-lg border-2 transition-all hover:shadow-lg {RARITY_COLORS[
						card.rarity
					]} {canAfford ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}"
					onclick={() => handlePurchaseClick(card)}
					disabled={!canAfford}
				>
					<!-- Card Image -->
					<div class="relative aspect-[3/4] w-full overflow-hidden bg-muted">
						{#if card.imagePath}
							{@const imgPath = card.imagePath}
							<img
								src={imgPath}
								alt={card.name}
								class="h-full w-full object-cover transition-transform group-hover:scale-105"
								onerror={(e) => {
									const target = e.currentTarget as HTMLImageElement;
									target.style.display = 'none';
									const fallback = target.nextElementSibling as HTMLElement | null;
									if (fallback) fallback.classList.remove('hidden');
								}}
							/>
							<div
								class="fallback-icon absolute inset-0 flex hidden h-full w-full items-center justify-center"
							>
								<Sparkles class="h-16 w-16 text-muted-foreground" />
							</div>
						{:else}
							<div class="flex h-full w-full items-center justify-center">
								<Sparkles class="h-16 w-16 text-muted-foreground" />
							</div>
						{/if}

						<!-- Rarity Badge -->
						<div class="absolute top-2 right-2">
							<span
								class="rounded-full px-2 py-1 text-xs font-semibold {RARITY_TEXT_COLORS[
									card.rarity
								]} bg-background/90 backdrop-blur-sm"
							>
								{RARITY_LABELS[card.rarity]}
							</span>
						</div>

						<!-- Uses Badge (for consumables) -->
						{#if card.usesTotal}
							<div class="absolute top-2 left-2">
								<span
									class="rounded-full bg-background/90 px-2 py-1 text-xs font-semibold backdrop-blur-sm"
								>
									x{card.usesTotal}
								</span>
							</div>
						{/if}
					</div>

					<!-- Card Info -->
					<div class="flex flex-1 flex-col gap-2 p-3">
						<h3 class="line-clamp-1 font-semibold">{card.name}</h3>
						<p class="line-clamp-2 flex-1 text-xs text-muted-foreground">
							{card.description}
						</p>

						<!-- Price -->
						<div class="flex items-center justify-between border-t pt-2">
							<div class="flex items-center gap-1">
								<Coins class="h-4 w-4 text-yellow-500" />
								<span class="font-bold">{price}</span>
							</div>
							<Button
								size="sm"
								variant={canAfford ? 'default' : 'secondary'}
								disabled={!canAfford}
								class="gap-1"
							>
								<ShoppingCart class="h-3 w-3" />
								{canAfford ? 'Acheter' : 'Insuffisant'}
							</Button>
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<!-- Purchase Modal -->
{#if showPurchaseModal && selectedCard}
	<VipCardPurchaseModal
		bind:open={showPurchaseModal}
		card={selectedCard}
		currentBalance={gidouillesBalance}
		onOptimisticPurchase={handleOptimisticPurchase}
		onPurchaseComplete={handlePurchaseComplete}
		onPurchaseError={handlePurchaseError}
	/>
{/if}
