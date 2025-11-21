<script lang="ts">
	import { shopStore } from '$lib/stores/shop.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Search, ShoppingCart, Coins } from 'lucide-svelte';
	import ShopItemCard from './ShopItemCard.svelte';
	import ShopCategoryFilter from './ShopCategoryFilter.svelte';
	import ShopPurchaseModal from './ShopPurchaseModal.svelte';
	import type { ShopItemWithStatus, ShopItemRarity } from '$lib/types/shop';
	import MySelect from '$lib/components/MySelect.svelte';

	// State
	let selectedItemForPurchase = $state<ShopItemWithStatus | null>(null);
	let showPurchaseModal = $state(false);
	let searchValue = $state('');
	let selectedSort = $state<'price' | 'name' | 'rarity'>('price');
	let selectedRarity = $state<ShopItemRarity | 'all'>('all');

	// Rarity options for dropdown
	const rarityOptions = [
		{ value: 'all', label: 'Toutes les raretés' },
		{ value: 'common', label: 'Commun' },
		{ value: 'uncommon', label: 'Peu commun' },
		{ value: 'rare', label: 'Rare' },
		{ value: 'epic', label: 'Épique' },
		{ value: 'legendary', label: 'Légendaire' }
	];

	// Sort options for dropdown
	const sortOptions = [
		{ value: 'price', label: 'Prix croissant' },
		{ value: 'name', label: 'Nom A-Z' },
		{ value: 'rarity', label: 'Rareté' }
	];

	// Handle search
	function handleSearch() {
		shopStore.setSearch(searchValue);
	}

	// Handle sort change
	$effect(() => {
		shopStore.setSortBy(selectedSort);
	});

	// Handle rarity change
	$effect(() => {
		shopStore.setRarity(selectedRarity);
	});

	// Handle purchase click
	function handlePurchaseClick(item: ShopItemWithStatus) {
		selectedItemForPurchase = item;
		showPurchaseModal = true;
	}

	// Get filtered items from store
	let filteredItems = $derived(shopStore.filteredShopItems);
	let isLoading = $derived(shopStore.isLoading.shop);
	let hasError = $derived(shopStore.errors.shop !== null);
</script>

<div class="space-y-6">
	<!-- Header with balance -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-bold">Boutique</h2>
			<p class="text-muted-foreground">Achète des objets avec tes gidouilles</p>
		</div>
		<div class="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm">
			<Coins class="h-5 w-5 text-yellow-500" />
			<span class="text-lg font-semibold">{shopStore.gidouillesBalance}</span>
			<span class="text-sm text-muted-foreground">gidouilles</span>
		</div>
	</div>

	<!-- Filters and Search -->
	<div class="space-y-4">
		<!-- Category Filter -->
		<ShopCategoryFilter />

		<!-- Search and Additional Filters -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
			<!-- Search -->
			<div class="flex flex-1 gap-2">
				<div class="relative flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Rechercher un objet..."
						bind:value={searchValue}
						class="pl-10"
						onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					/>
				</div>
				<Button onclick={handleSearch} size="icon" variant="secondary" aria-label="Rechercher">
					<Search class="h-4 w-4" />
				</Button>
			</div>

			<!-- Rarity Filter -->
			<div class="w-full sm:w-48">
				<MySelect
					type="single"
					bind:value={selectedRarity}
					items={rarityOptions}
					placeholder="Rareté"
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
	</div>

	<!-- Items Grid -->
	{#if isLoading}
		<div
			class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
			role="status"
			aria-live="polite"
			aria-label="Chargement de la boutique"
		>
			{#each Array(8) as _, i (i)}
				<Skeleton class="h-64 w-full" />
			{/each}
		</div>
	{:else if hasError}
		<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
			<p class="text-destructive">Impossible de charger la boutique. Veuillez réessayer.</p>
		</div>
	{:else if filteredItems.length === 0}
		<div class="rounded-lg border bg-card p-12 text-center">
			<ShoppingCart class="mx-auto h-12 w-12 text-muted-foreground" />
			<h3 class="mt-4 text-lg font-semibold">Aucun objet trouvé</h3>
			<p class="mt-2 text-sm text-muted-foreground">
				{#if searchValue || selectedRarity !== 'all'}
					Essayez de modifier vos filtres de recherche
				{:else}
					La boutique est vide pour le moment
				{/if}
			</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each filteredItems as item (item.id)}
				<ShopItemCard {item} onPurchase={() => handlePurchaseClick(item)} />
			{/each}
		</div>
	{/if}
</div>

<!-- Purchase Modal -->
{#if showPurchaseModal && selectedItemForPurchase}
	<ShopPurchaseModal bind:open={showPurchaseModal} item={selectedItemForPurchase} />
{/if}
