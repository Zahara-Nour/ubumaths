<script lang="ts">
	import { shopStore } from '$lib/stores/shop.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Package, Box } from 'lucide-svelte';
	import InventoryItemCard from './InventoryItemCard.svelte';
	import type { ShopItemCategory } from '$lib/types/shop';

	// State
	let activeCategory = $state<ShopItemCategory | 'equipped' | 'all'>('all');

	// Get items based on active category
	let displayedItems = $derived.by(() => {
		if (activeCategory === 'all') {
			return shopStore.inventory;
		} else if (activeCategory === 'equipped') {
			return shopStore.equippedItems;
		} else {
			return shopStore.inventory.filter((item) => item.template.category === activeCategory);
		}
	});

	// Count items per category
	let categoryCounts = $derived.by(() => {
		const counts: Record<string, number> = {
			all: shopStore.inventory.length,
			equipped: shopStore.equippedItems.length,
			consumable: 0,
			booster: 0,
			cosmetic: 0,
			utility: 0
		};

		for (const item of shopStore.inventory) {
			const cat = item.template.category as ShopItemCategory;
			counts[cat] = (counts[cat] || 0) + 1;
		}

		return counts;
	});

	// Loading and error states
	let isLoading = $derived(shopStore.isLoading.inventory);
	let hasError = $derived(shopStore.errors.inventory !== null);

	// Category labels
	const categoryLabels: Record<string, string> = {
		all: 'Tous',
		equipped: 'Équipés',
		consumable: 'Consommables',
		booster: 'Boosters',
		cosmetic: 'Cosmétiques',
		utility: 'Utilitaires'
	};

	// Category icons
	const categoryIcons: Record<string, string> = {
		all: '📦',
		equipped: '⭐',
		consumable: '🧪',
		booster: '⚡',
		cosmetic: '✨',
		utility: '🔧'
	};
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h2 class="flex items-center gap-2 text-2xl font-bold">
			<Package class="h-6 w-6" />
			Mon Inventaire
		</h2>
		<p class="text-muted-foreground">Gérez vos objets, équipements et consommables</p>
	</div>

	<!-- Category Tabs -->
	<Tabs.Root bind:value={activeCategory} class="w-full">
		<Tabs.List class="grid w-full grid-cols-3 lg:grid-cols-6">
			{#each ['all', 'equipped', 'consumable', 'booster', 'cosmetic', 'utility'] as category (category)}
				{@const count = categoryCounts[category] || 0}
				<Tabs.Trigger value={category} class="relative gap-2">
					<span aria-hidden="true">{categoryIcons[category]}</span>
					<span class="hidden sm:inline">{categoryLabels[category]}</span>
					{#if count > 0}
						<Badge variant="secondary" class="ml-1 h-5 px-1 text-xs">
							{count}
						</Badge>
					{/if}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>

		<Tabs.Content value={activeCategory} class="mt-6">
			{#if isLoading}
				<!-- Loading state -->
				<div
					class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
					role="status"
					aria-live="polite"
					aria-label="Chargement de l'inventaire"
				>
					{#each Array(8) as _, i (i)}
						<Skeleton class="h-48 w-full" />
					{/each}
				</div>
			{:else if hasError}
				<!-- Error state -->
				<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<p class="text-destructive">Impossible de charger l'inventaire. Veuillez réessayer.</p>
				</div>
			{:else if displayedItems.length === 0}
				<!-- Empty state -->
				<div class="flex flex-col items-center justify-center rounded-lg border bg-card p-12">
					<Box class="h-16 w-16 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">Aucun objet</h3>
					<p class="mt-2 text-center text-sm text-muted-foreground">
						{#if activeCategory === 'equipped'}
							Vous n'avez aucun objet équipé
						{:else if activeCategory === 'all'}
							Votre inventaire est vide. Visitez la boutique pour acheter des objets !
						{:else}
							Vous n'avez aucun objet de type {categoryLabels[activeCategory].toLowerCase()}
						{/if}
					</p>
					{#if activeCategory === 'all'}
						<Button href="/dashboard/student/marketplace" class="mt-4">Visiter la boutique</Button>
					{/if}
				</div>
			{:else}
				<!-- Items grid -->
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each displayedItems as item (item.id)}
						<InventoryItemCard {item} />
					{/each}
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>

	<!-- Stats Summary -->
	{#if !isLoading && !hasError && shopStore.inventory.length > 0}
		<div class="rounded-lg border bg-card p-4">
			<h3 class="mb-3 font-semibold">Résumé</h3>
			<div class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
				<div>
					<span class="text-muted-foreground">Total d'objets</span>
					<p class="text-xl font-bold">{shopStore.inventory.length}</p>
				</div>
				<div>
					<span class="text-muted-foreground">Équipés</span>
					<p class="text-xl font-bold">{shopStore.equippedItems.length}</p>
				</div>
				<div>
					<span class="text-muted-foreground">Verrouillés</span>
					<p class="text-xl font-bold">
						{shopStore.inventory.filter((i) => i.locked_for_listing_id || i.locked_for_trade_id)
							.length}
					</p>
				</div>
				<div>
					<span class="text-muted-foreground">Expirés bientôt</span>
					<p class="text-xl font-bold">
						{shopStore.inventory.filter((i) => {
							if (!i.expires_at) return false;
							const daysUntilExpiry = Math.ceil(
								(new Date(i.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
							);
							return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
						}).length}
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
