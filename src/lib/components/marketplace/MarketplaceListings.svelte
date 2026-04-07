<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import SkeletonList from '$lib/components/skeleton/SkeletonList.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { RefreshCw, ShoppingBag } from 'lucide-svelte';
	import MarketplaceListingCard from './MarketplaceListingCard.svelte';
	import ListingDetailsModal from './ListingDetailsModal.svelte';
	import type { MarketplaceListing } from '$lib/types/marketplace';

	// State
	let selectedSort = $state<string>('recent');
	let selectedListing = $state<MarketplaceListing | null>(null);

	// Filter options
	const sortOptions = [
		{ value: 'recent', label: 'Plus récents' },
		{ value: 'expiring_soon', label: 'Expire bientôt' },
		{ value: 'popular', label: 'Plus populaires' }
	];

	// Apply filters
	function applyFilters() {
		marketplaceStore.setFilters({
			sort_by: selectedSort as 'recent' | 'expiring_soon' | 'popular'
		});
	}

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

<div class="space-y-3">
	<!-- Sort + refresh -->
	<div class="flex items-center gap-2">
		<div class="w-36 sm:w-40">
			<MySelect
				type="single"
				bind:value={selectedSort}
				items={sortOptions}
				onchange={applyFilters}
			/>
		</div>
		<div class="flex-1"></div>
		<Button variant="outline" size="icon" onclick={refresh} aria-label="Actualiser">
			<RefreshCw class="h-4 w-4" />
		</Button>
	</div>

	<!-- Listings Grid -->
	{#if marketplaceStore.isLoading.listings && marketplaceStore.listings.length === 0}
		<SkeletonList itemCount={8} />
	{:else if marketplaceStore.errors.listings}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="mb-4 text-destructive">Erreur lors du chargement des annonces</p>
				<Button onclick={refresh}>Réessayer</Button>
			</Card.Content>
		</Card.Root>
	{:else if marketplaceStore.listings.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<ShoppingBag class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
				<h3 class="mb-2 font-semibold">Aucune annonce trouvée</h3>
				<p class="text-muted-foreground">Soyez le premier à créer une annonce !</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each marketplaceStore.listings as listing (listing.id)}
				<MarketplaceListingCard {listing} onclick={() => openListingDetails(listing)} />
			{/each}
		</div>

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
	<ListingDetailsModal
		listing={selectedListing}
		open={isOpen}
		onclose={closeListingDetails}
		isOwner={selectedListing.creator_id === marketplaceStore.currentUserId}
	/>
{/if}
