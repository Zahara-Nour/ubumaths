<script lang="ts">
	import { onDestroy } from 'svelte';
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import SkeletonList from '$lib/components/skeleton/SkeletonList.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Search, Filter, Grid3x3, List, RefreshCw, ShoppingBag } from 'lucide-svelte';
	import MarketplaceListingCard from './MarketplaceListingCard.svelte';
	import ListingDetailsModal from './ListingDetailsModal.svelte';
	import type { MarketplaceListing } from '$lib/types/marketplace';

	// State
	let viewMode = $state<'grid' | 'list'>('grid');
	let searchQuery = $state('');
	let selectedType = $state<string>('all');
	let selectedSort = $state<string>('recent');
	let selectedRarity = $state<string>('all');
	let showFilters = $state(false);
	let selectedListing = $state<MarketplaceListing | null>(null);

	// Debounce timer for search
	let searchTimer: ReturnType<typeof setTimeout>;

	// Filter options
	const typeOptions = [
		{ value: 'all', label: 'Tous' },
		{ value: 'sell', label: 'Vente' },
		{ value: 'buy', label: 'Achat' }
	];

	const sortOptions = [
		{ value: 'recent', label: 'Plus récents' },
		{ value: 'expiring_soon', label: 'Expire bientôt' },
		{ value: 'popular', label: 'Plus populaires' }
	];

	const rarityOptions = [
		{ value: 'all', label: 'Toutes' },
		{ value: 'common', label: 'Commune' },
		{ value: 'rare', label: 'Rare' },
		{ value: 'epic', label: 'Épique' },
		{ value: 'legendary', label: 'Légendaire' }
	];

	// Apply filters
	function applyFilters() {
		marketplaceStore.setFilters({
			type: selectedType === 'all' ? undefined : (selectedType as 'sell' | 'buy'),
			sort_by: selectedSort as 'recent' | 'expiring_soon' | 'popular',
			card_rarity:
				selectedRarity === 'all'
					? undefined
					: (selectedRarity as 'common' | 'rare' | 'epic' | 'legendary'),
			search: searchQuery || undefined
		});
	}

	// Handle search with debounce
	function handleSearch(value: string) {
		searchQuery = value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			applyFilters();
		}, 500);
	}

	// Cleanup timer on unmount
	onDestroy(() => {
		clearTimeout(searchTimer);
	});

	// Load more listings
	function loadMore() {
		marketplaceStore.fetchListings(true);
	}

	// Refresh listings
	function refresh() {
		marketplaceStore.fetchListings(false);
	}

	// Open listing details
	function openListingDetails(listing: MarketplaceListing) {
		selectedListing = listing;
	}

	// Close listing details
	function closeListingDetails() {
		selectedListing = null;
	}
</script>

<div class="space-y-4">
	<!-- Search and Filters Bar -->
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-3 sm:flex-row">
			<!-- Search Input -->
			<div class="relative flex-1">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Rechercher des annonces..."
					value={searchQuery}
					oninput={(e) => handleSearch(e.currentTarget.value)}
					class="pl-10"
				/>
			</div>

			<!-- Filter Buttons -->
			<div class="flex gap-2">
				<Button
					variant="outline"
					size="icon"
					onclick={() => (showFilters = !showFilters)}
					class="relative"
				>
					<Filter class="h-4 w-4" />
					{#if selectedType !== 'all' || selectedRarity !== 'all'}
						<span class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary"></span>
					{/if}
				</Button>

				<Button
					variant="outline"
					size="icon"
					onclick={refresh}
					aria-label="Actualiser les annonces"
				>
					<RefreshCw class="h-4 w-4" />
				</Button>

				<!-- View Mode Toggle -->
				<div class="hidden gap-1 rounded-md border p-1 sm:flex">
					<Button
						variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
						size="icon"
						onclick={() => (viewMode = 'grid')}
					>
						<Grid3x3 class="h-4 w-4" />
					</Button>
					<Button
						variant={viewMode === 'list' ? 'secondary' : 'ghost'}
						size="icon"
						onclick={() => (viewMode = 'list')}
					>
						<List class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>

		<!-- Expandable Filters -->
		{#if showFilters}
			<Card.Root>
				<Card.Content class="pt-6">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div class="space-y-2">
							<Label>Type d'annonce</Label>
							<MySelect
								type="single"
								bind:value={selectedType}
								items={typeOptions}
								onchange={applyFilters}
							/>
						</div>

						<div class="space-y-2">
							<Label>Rareté des cartes</Label>
							<MySelect
								type="single"
								bind:value={selectedRarity}
								items={rarityOptions}
								onchange={applyFilters}
							/>
						</div>

						<div class="space-y-2">
							<Label>Trier par</Label>
							<MySelect
								type="single"
								bind:value={selectedSort}
								items={sortOptions}
								onchange={applyFilters}
							/>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- Results Count -->
	{#if !marketplaceStore.isLoading.listings && marketplaceStore.listings.length > 0}
		<div class="text-sm text-muted-foreground">
			{marketplaceStore.listings.length} annonce(s) trouvée(s)
		</div>
	{/if}

	<!-- Listings Grid/List -->
	{#if marketplaceStore.isLoading.listings && marketplaceStore.listings.length === 0}
		<!-- Loading skeletons -->
		<SkeletonList itemCount={8} />
	{:else if marketplaceStore.errors.listings}
		<!-- Error state -->
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="mb-4 text-destructive">Erreur lors du chargement des annonces</p>
				<Button onclick={refresh}>Réessayer</Button>
			</Card.Content>
		</Card.Root>
	{:else if marketplaceStore.listings.length === 0}
		<!-- Empty state -->
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<ShoppingBag class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
				<h3 class="mb-2 font-semibold">Aucune annonce trouvée</h3>
				<p class="mb-4 text-muted-foreground">
					{#if searchQuery || selectedType !== 'all' || selectedRarity !== 'all'}
						Essayez de modifier vos filtres
					{:else}
						Soyez le premier à créer une annonce !
					{/if}
				</p>
				{#if searchQuery || selectedType !== 'all' || selectedRarity !== 'all'}
					<Button
						variant="outline"
						onclick={() => {
							searchQuery = '';
							selectedType = 'all';
							selectedRarity = 'all';
						}}
					>
						Réinitialiser les filtres
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Listings display -->
		<div
			class={viewMode === 'grid'
				? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
				: 'space-y-4'}
		>
			{#each marketplaceStore.listings as listing (listing.id)}
				<MarketplaceListingCard {listing} {viewMode} onclick={() => openListingDetails(listing)} />
			{/each}
		</div>

		<!-- Load More Button -->
		{#if marketplaceStore.pagination.listings.hasMore}
			<div class="mt-6 text-center">
				<Button variant="outline" onclick={loadMore} disabled={marketplaceStore.isLoading.listings}>
					{#if marketplaceStore.isLoading.listings}
						<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
						Chargement...
					{:else}
						Charger plus
					{/if}
				</Button>
			</div>
		{/if}
	{/if}
</div>

<!-- Listing Details Modal -->
{#if selectedListing}
	{@const isOpen = !!selectedListing}
	<ListingDetailsModal listing={selectedListing} open={isOpen} onclose={closeListingDetails} />
{/if}
