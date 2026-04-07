<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import ConsentButton from '$lib/components/ConsentButton.svelte';
	import { Plus, ShoppingBag, Package, Store, Bell, RefreshCw } from 'lucide-svelte';

	// Import components
	import MarketplaceListings from '$lib/components/marketplace/MarketplaceListings.svelte';
	import MyListings from '$lib/components/marketplace/MyListings.svelte';
	import StudentActivityFeed from '$lib/components/marketplace/StudentActivityFeed.svelte';
	import CreateListingModal from '$lib/components/marketplace/CreateListingModal.svelte';
	import VipCardShopSection from '$lib/components/vip-cards/VipCardShopSection.svelte';

	// Props from server
	let { data } = $props();

	// State
	let activeTab = $state<string>('shop');
	let showCreateModal = $state(false);
	let annonceView = $state<'all' | 'mine'>('all');

	// Initialize stores
	$effect(() => {
		if (data.supabase && data.user) {
			marketplaceStore.init(data.supabase, data.user.id);
		}

		return () => {
			marketplaceStore.cleanup();
		};
	});

	// Computed
	let totalPending = $derived(
		marketplaceStore.pendingActions.listings +
			marketplaceStore.pendingActions.trades +
			marketplaceStore.pendingActions.proposals
	);

	// Check if user can create more listings
	let canCreateListing = $derived(
		!marketplaceStore.config ||
			marketplaceStore.stats.my_active_listings <
				(marketplaceStore.config.max_listings_per_student ?? 5)
	);
</script>

<svelte:head>
	<title>Marketplace - Ubumaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-6">
	<!-- Header -->
	<div class="mb-4">
		<h1 class="flex items-center gap-3 text-2xl font-bold">
			<ShoppingBag class="h-7 w-7 text-primary" />
			Marketplace
		</h1>
	</div>

	<!-- 3 Flat Tabs -->
	<Tabs.Root bind:value={activeTab} class="w-full">
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="shop" class="gap-2">
				<Store class="h-4 w-4" />
				Boutique
			</Tabs.Trigger>
			<Tabs.Trigger value="annonces" class="gap-2">
				<Package class="h-4 w-4" />
				Annonces
			</Tabs.Trigger>
			<Tabs.Trigger value="activity" class="relative gap-2">
				<Bell class="h-4 w-4" />
				Activité
				{#if totalPending > 0}
					<Badge variant="destructive" class="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
						{totalPending}
					</Badge>
				{/if}
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Tab 1: Boutique -->
		<Tabs.Content value="shop" class="mt-6">
			<VipCardShopSection supabase={data.supabase} userId={data.user.id} />
		</Tabs.Content>

		<!-- Tab 2: Annonces -->
		<Tabs.Content value="annonces" class="mt-6">
			<!-- Header: pills + action button -->
			<div class="mb-4 flex items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<Button
						variant={annonceView === 'all' ? 'default' : 'outline'}
						size="sm"
						class="shrink-0 gap-1.5"
						onclick={() => (annonceView = 'all')}
					>
						Toutes
					</Button>
					<Button
						variant={annonceView === 'mine' ? 'default' : 'outline'}
						size="sm"
						class="shrink-0 gap-1.5"
						onclick={() => (annonceView = 'mine')}
					>
						Mes annonces
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8"
						onclick={() => {
							if (annonceView === 'all') {
								marketplaceStore.fetchListings(true);
							} else {
								marketplaceStore.fetchMyListings();
							}
						}}
						aria-label="Actualiser"
					>
						<RefreshCw class="h-3.5 w-3.5" />
					</Button>
				</div>
				<ConsentButton
					size="sm"
					onclick={() => (showCreateModal = true)}
					disabled={!canCreateListing}
					class="gap-1.5 sm:gap-2"
				>
					<Plus class="h-4 w-4" />
					<span class="hidden sm:inline">Nouvelle annonce</span>
				</ConsentButton>
			</div>

			<!-- Content based on pill selection -->
			{#if annonceView === 'all'}
				<MarketplaceListings />
			{:else}
				<MyListings />
			{/if}
		</Tabs.Content>

		<!-- Tab 3: Activité -->
		<Tabs.Content value="activity" class="mt-6">
			<StudentActivityFeed userId={data.user.id} />
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Create Listing Modal -->
{#if showCreateModal}
	<CreateListingModal bind:open={showCreateModal} />
{/if}
