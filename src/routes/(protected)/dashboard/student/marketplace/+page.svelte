<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import { page } from '$app/stores';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Plus, ShoppingBag, Package, ArrowLeftRight } from 'lucide-svelte';

	// Import components
	import MarketplaceListings from '$lib/components/marketplace/MarketplaceListings.svelte';
	import MyListings from '$lib/components/marketplace/MyListings.svelte';
	import MyTrades from '$lib/components/marketplace/MyTrades.svelte';
	import CreateListingModal from '$lib/components/marketplace/CreateListingModal.svelte';

	// Props from server
	let { data } = $props();

	// State
	let activeTab = $state<string>('browse');
	let showCreateModal = $state(false);

	// Initialize store
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
				marketplaceStore.config.max_active_listings_per_student
	);

	let maxListingsReached = $derived(
		marketplaceStore.config &&
			marketplaceStore.stats.my_active_listings >=
				marketplaceStore.config.max_active_listings_per_student
	);
</script>

<svelte:head>
	<title>Marketplace - Ubumaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-6">
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold">
				<ShoppingBag class="h-8 w-8 text-primary" />
				Marketplace
			</h1>
			<p class="mt-1 text-muted-foreground">
				Échange des cartes VIP et des gidouilles avec tes camarades
			</p>
		</div>

		<div class="flex gap-2">
			{#if maxListingsReached}
				<div class="text-sm text-muted-foreground">
					Limite d'annonces atteinte ({marketplaceStore.config?.max_active_listings_per_student})
				</div>
			{/if}
			<Button onclick={() => (showCreateModal = true)} disabled={!canCreateListing} class="gap-2">
				<Plus class="h-4 w-4" />
				Nouvelle annonce
			</Button>
		</div>
	</div>

	<!-- Stats Bar -->
	{#if marketplaceStore.stats}
		<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
			<div class="rounded-lg border bg-card p-3">
				<div class="text-2xl font-bold">{marketplaceStore.stats.active_listings}</div>
				<div class="text-xs text-muted-foreground">Annonces actives</div>
			</div>
			<div class="rounded-lg border bg-card p-3">
				<div class="text-2xl font-bold">{marketplaceStore.stats.my_active_listings}</div>
				<div class="text-xs text-muted-foreground">Mes annonces</div>
			</div>
			<div class="rounded-lg border bg-card p-3">
				<div class="text-2xl font-bold">{marketplaceStore.stats.my_pending_proposals}</div>
				<div class="text-xs text-muted-foreground">Propositions en attente</div>
			</div>
			<div class="rounded-lg border bg-card p-3">
				<div class="text-2xl font-bold">{marketplaceStore.stats.my_active_trades}</div>
				<div class="text-xs text-muted-foreground">Échanges actifs</div>
			</div>
		</div>
	{/if}

	<!-- Main Content Tabs -->
	<Tabs.Root bind:value={activeTab} class="w-full">
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="browse" class="gap-2">
				<ShoppingBag class="h-4 w-4" />
				Parcourir
			</Tabs.Trigger>
			<Tabs.Trigger value="my-listings" class="relative gap-2">
				<Package class="h-4 w-4" />
				Mes annonces
				{#if marketplaceStore.pendingActions.listings > 0}
					<Badge variant="destructive" class="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
						{marketplaceStore.pendingActions.listings}
					</Badge>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="trades" class="relative gap-2">
				<ArrowLeftRight class="h-4 w-4" />
				Échanges
				{#if marketplaceStore.pendingActions.trades > 0}
					<Badge variant="destructive" class="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
						{marketplaceStore.pendingActions.trades}
					</Badge>
				{/if}
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="browse" class="mt-6">
			<MarketplaceListings />
		</Tabs.Content>

		<Tabs.Content value="my-listings" class="mt-6">
			<MyListings />
		</Tabs.Content>

		<Tabs.Content value="trades" class="mt-6">
			<MyTrades />
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Create Listing Modal -->
{#if showCreateModal}
	<CreateListingModal bind:open={showCreateModal} />
{/if}
