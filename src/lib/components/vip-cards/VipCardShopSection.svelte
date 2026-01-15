<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import ConsentButton from '$lib/components/ConsentButton.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { consent } from '$lib/stores/consent.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Search, ShoppingCart, Sparkles, Gem } from 'lucide-svelte';
	import gidouilleImage from '$lib/assets/images/gidouille.png';
	import MySelect from '$lib/components/MySelect.svelte';
	import VipCardPurchaseModal from './VipCardPurchaseModal.svelte';
	import type { VipCard, VipCardRarity } from '$lib/types/vip-card';
	import { RARITY_PRICES } from '$lib/types/vip-card';
	import {
		RARITY_ORDER,
		RARITY_FILTER_OPTIONS,
		RARITY_SECTION_CONFIG,
		RARITY_DISPLAY_ORDER
	} from '$lib/constants/vip-card-ui';
	import { cn } from '$lib/utils';
	import { syncGidouilles, syncVipCards, rollbackGidouilles } from '$lib/utils/cache-sync';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import type { CacheContext } from '$lib/types/cache-context';
	import type { StudentVipCards } from '$lib/types/vip-card';

	interface Props {
		supabase: unknown; // Only used to detect auth context
		userId: string;
	}

	let { supabase, userId }: Props = $props();

	// State
	let cards = $state<VipCard[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let searchValue = $state('');
	let selectedRarity = $state<VipCardRarity | 'all'>('all');
	let selectedSort = $state<'price' | 'name' | 'rarity'>('price');
	let selectedCard = $state<VipCard | null>(null);
	let showPurchaseModal = $state(false);

	// Balance from studentCache (reactive via sync getter)
	// Returns cached value or 0 if not yet loaded
	let gidouillesBalance = $derived(studentCache.getRewardsSync()?.gidouilles ?? 0);

	// Sort options
	const sortOptions = [
		{ value: 'price', label: 'Prix croissant' },
		{ value: 'name', label: 'Nom A-Z' },
		{ value: 'rarity', label: 'Rarete' }
	];

	// Fetch shop cards from API (balance comes from studentCache)
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
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur inconnue';
		} finally {
			isLoading = false;
		}
	}

	// Initial fetch - load shop cards AND ensure rewards cache is populated
	$effect(() => {
		if (!supabase || !userId) return;

		// Fetch shop cards
		fetchShopData();

		// Ensure rewards cache is populated for balance display
		studentCache.getRewards();
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

	// Group filtered cards by rarity for section display
	let cardsByRarity = $derived.by(() => {
		const grouped: Record<VipCardRarity, VipCard[]> = {
			legendary: [],
			epic: [],
			rare: [],
			common: []
		};

		filteredCards.forEach((card) => {
			grouped[card.rarity].push(card);
		});

		return grouped;
	});

	// Cache context for student
	const cacheContext: CacheContext = { type: 'student' };

	// Handle purchase click
	function handlePurchaseClick(card: VipCard) {
		selectedCard = card;
		showPurchaseModal = true;
	}

	// Handle optimistic purchase - instant gidouilles update before server confirms
	// Following the pattern: gidouilles = predictive optimistic (before API)
	function handleOptimisticPurchase(price: number) {
		syncGidouilles(cacheContext, -price);
	}

	// Handle purchase complete - add new card to cache with server data
	// Following the pattern: VIP cards = server-confirmed (after API success)
	function handlePurchaseComplete(result: {
		instanceId: string;
		cardId: string;
		purchasedAt: string;
		acquiredFrom: string;
		usesRemaining: number | null;
	}) {
		// Get current VIP cards from cache
		const currentRewards = studentCache.getRewardsSync();
		const currentVipCards: StudentVipCards = currentRewards?.vip_cards ?? {};

		// Add new card from server response
		const updatedVipCards: StudentVipCards = {
			...currentVipCards,
			[result.instanceId]: {
				cardId: result.cardId,
				earnedAt: result.purchasedAt,
				purchasedAt: result.purchasedAt,
				acquiredFrom: result.acquiredFrom as 'purchase',
				usedAt: null,
				usesRemaining: result.usesRemaining
			}
		};

		// Update cache with new VIP cards (instant UI update)
		syncVipCards(cacheContext, updatedVipCards);
	}

	// Handle purchase error - rollback gidouilles optimistic update
	function handlePurchaseError(price: number) {
		rollbackGidouilles(cacheContext, -price);
	}

	// Get card price
	function getCardPrice(card: VipCard): number {
		return card.basePrice ?? RARITY_PRICES[card.rarity] ?? 20;
	}

	// Rarity gem colors (same as VipCard component)
	const rarityGemColors = {
		common: { color: '#9ca3af', glow: false },
		rare: { color: '#3b82f6', glow: true },
		epic: { color: '#a855f7', glow: true },
		legendary: { color: '#f59e0b', glow: true }
	};
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
			<img src={gidouilleImage} alt="Gidouille" class="h-5 w-5" />
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
		<div class="space-y-8">
			{#each RARITY_DISPLAY_ORDER as rarity (rarity)}
				{@const rarityCards = cardsByRarity[rarity]}
				{@const config = RARITY_SECTION_CONFIG[rarity]}

				{#if rarityCards.length > 0}
					<section class="space-y-4">
						<!-- Rarity Section Header -->
						<div
							class={cn(
								'flex items-center gap-3 rounded-lg border-2 p-4',
								config.bgColor,
								config.borderColor
							)}
						>
							<Gem class={cn('h-7 w-7', config.color)} />
							<h3 class={cn('text-2xl font-bold', config.color)}>
								{config.label}
							</h3>
							<Badge variant="outline" class={cn('ml-auto text-sm', config.color)}>
								{rarityCards.length}
								{rarityCards.length === 1 ? 'carte' : 'cartes'}
							</Badge>
						</div>

						<!-- Cards Grid -->
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
							{#each rarityCards as card (card.id)}
								{@const price = getCardPrice(card)}
								{@const canAfford = gidouillesBalance >= price}
								{@const canPurchase = canAfford && !consent.isReadOnly}
								<button
									type="button"
									class="group relative flex flex-col overflow-hidden rounded-xl border-3 bg-card transition-all hover:shadow-lg {canPurchase
										? 'cursor-pointer'
										: 'cursor-not-allowed opacity-75'}"
									onclick={() => handlePurchaseClick(card)}
									disabled={!canPurchase}
									title={consent.isReadOnly ? consent.getDisabledTooltip() : undefined}
								>
									<!-- Card Image -->
									<div class="relative aspect-[4/5] w-full overflow-hidden bg-muted">
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

										<!-- Rarity Gem (same as VipCard component) -->
										<div class="absolute top-2 left-2 z-10">
											<div
												class="h-6 w-6 rounded-full bg-white/60 p-1 shadow-lg backdrop-blur-sm"
												style="color: {rarityGemColors[card.rarity].color}; {rarityGemColors[
													card.rarity
												].glow
													? 'filter: drop-shadow(0 0 6px currentColor) drop-shadow(0 0 10px currentColor);'
													: ''}"
											>
												<svg
													class="h-full w-full"
													viewBox="0 0 24 24"
													fill="none"
													xmlns="http://www.w3.org/2000/svg"
												>
													<path
														d="M12 2L4 8L2 12L12 22L22 12L20 8L12 2Z"
														fill="currentColor"
														stroke="currentColor"
														stroke-width="1.5"
														stroke-linejoin="round"
													/>
													<path d="M12 2L8 8H16L12 2Z" fill="white" opacity="0.3" />
													<path d="M4 8L8 8L12 22L4 8Z" fill="black" opacity="0.2" />
													<path d="M20 8L16 8L12 22L20 8Z" fill="black" opacity="0.2" />
												</svg>
											</div>
										</div>

										<!-- Uses Badge (for consumables) -->
										{#if card.usesTotal}
											<div class="absolute top-2 right-2">
												<span
													class="rounded-full bg-background/90 px-2 py-1 text-xs font-semibold backdrop-blur-sm"
												>
													x{card.usesTotal}
												</span>
											</div>
										{/if}
									</div>

									<!-- Card Info -->
									<div class="flex flex-1 flex-col gap-1 p-2">
										<h3 class="line-clamp-1 text-sm font-semibold">{card.name}</h3>
										<p class="line-clamp-2 flex-1 text-xs text-muted-foreground">
											{card.description}
										</p>

										<!-- Price -->
										<div class="flex items-center justify-between border-t pt-1.5">
											<div class="flex items-center gap-1">
												<img src={gidouilleImage} alt="Gidouille" class="h-3.5 w-3.5" />
												<span class="text-sm font-bold">{price}</span>
											</div>
											<ConsentButton
												size="sm"
												variant={canAfford ? 'default' : 'secondary'}
												disabled={!canAfford}
												class="h-7 gap-1 px-2 text-xs"
											>
												<ShoppingCart class="h-3 w-3" />
												{canAfford ? 'Acheter' : 'Insuffisant'}
											</ConsentButton>
										</div>
									</div>
								</button>
							{/each}
						</div>
					</section>
				{/if}
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
