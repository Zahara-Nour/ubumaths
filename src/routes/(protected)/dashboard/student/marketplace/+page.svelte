<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import ConsentButton from '$lib/components/ConsentButton.svelte';
	import { Plus, ShoppingBag, Package, ArrowLeftRight, Store } from 'lucide-svelte';

	// Import components
	import MarketplaceListings from '$lib/components/marketplace/MarketplaceListings.svelte';
	import MyListings from '$lib/components/marketplace/MyListings.svelte';
	import MyTrades from '$lib/components/marketplace/MyTrades.svelte';
	import CreateListingModal from '$lib/components/marketplace/CreateListingModal.svelte';
	import VipCardShopSection from '$lib/components/vip-cards/VipCardShopSection.svelte';

	// Props from server
	let { data } = $props();

	// State
	let activeTab = $state<string>('shop');
	let showCreateModal = $state(false);

	// Initialize stores
	$effect(() => {
		if (data.supabase && data.user) {
			marketplaceStore.init(data.supabase, data.user.id);
		}

		return () => {
			marketplaceStore.cleanup();
		};
	});

	// Computed (unused but kept for potential future use)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
		<p class="text-sm text-muted-foreground">Boutique et échange de cartes VIP</p>
	</div>

	<!-- Main Content Tabs -->
	<Tabs.Root bind:value={activeTab} class="w-full">
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="shop" class="gap-2">
				<Store class="h-4 w-4" />
				Boutique
			</Tabs.Trigger>
			<Tabs.Trigger value="exchanges" class="relative gap-2">
				<ArrowLeftRight class="h-4 w-4" />
				Échanges
				{#if marketplaceStore.pendingActions.listings + marketplaceStore.pendingActions.trades > 0}
					<Badge variant="destructive" class="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
						{marketplaceStore.pendingActions.listings + marketplaceStore.pendingActions.trades}
					</Badge>
				{/if}
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="shop" class="mt-6">
			<VipCardShopSection supabase={data.supabase} userId={data.user.id} />
		</Tabs.Content>

		<Tabs.Content value="exchanges" class="mt-6">
			<!-- Stats + Action Bar -->
			<div
				class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/50 p-3"
			>
				<div class="flex flex-wrap gap-4 text-sm">
					<span class="text-muted-foreground">
						<span class="font-semibold text-foreground"
							>{marketplaceStore.stats.active_listings}</span
						> annonces
					</span>
					<span class="text-muted-foreground">
						<span class="font-semibold text-foreground"
							>{marketplaceStore.stats.my_active_listings}</span
						> miennes
					</span>
					<span class="text-muted-foreground">
						<span class="font-semibold text-foreground"
							>{marketplaceStore.stats.my_pending_proposals}</span
						> propositions
					</span>
					<span class="text-muted-foreground">
						<span class="font-semibold text-foreground"
							>{marketplaceStore.stats.my_active_trades}</span
						> échanges
					</span>
				</div>
				<ConsentButton
					size="sm"
					onclick={() => (showCreateModal = true)}
					disabled={!canCreateListing}
					class="gap-1.5"
				>
					<Plus class="h-4 w-4" />
					Nouvelle annonce
				</ConsentButton>
			</div>

			<!-- Nested tabs for exchanges -->
			<Tabs.Root value="browse" class="w-full">
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
						Mes échanges
						{#if marketplaceStore.pendingActions.trades > 0}
							<Badge variant="destructive" class="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
								{marketplaceStore.pendingActions.trades}
							</Badge>
						{/if}
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="browse" class="mt-4">
					<MarketplaceListings />
				</Tabs.Content>

				<Tabs.Content value="my-listings" class="mt-4">
					<MyListings />
				</Tabs.Content>

				<Tabs.Content value="trades" class="mt-4">
					<MyTrades />
				</Tabs.Content>
			</Tabs.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Create Listing Modal -->
{#if showCreateModal}
	<CreateListingModal bind:open={showCreateModal} />
{/if}
