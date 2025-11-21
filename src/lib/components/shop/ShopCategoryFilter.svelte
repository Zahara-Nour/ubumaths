<script lang="ts">
	import { shopStore } from '$lib/stores/shop.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import type { ShopItemCategory } from '$lib/types/shop';

	// Categories with icons and labels
	const categories: Array<{
		value: ShopItemCategory | 'all';
		label: string;
		icon: string;
		description: string;
	}> = [
		{
			value: 'all',
			label: 'Tous',
			icon: '🎯',
			description: 'Tous les objets'
		},
		{
			value: 'consumable',
			label: 'Consommables',
			icon: '🧪',
			description: 'Objets à usage unique'
		},
		{
			value: 'booster',
			label: 'Boosters',
			icon: '⚡',
			description: 'Améliorations temporaires'
		},
		{
			value: 'cosmetic',
			label: 'Cosmétiques',
			icon: '✨',
			description: 'Personnalisation visuelle'
		},
		{
			value: 'utility',
			label: 'Utilitaires',
			icon: '🔧',
			description: 'Outils pratiques'
		}
	];

	// Current selected category
	let selectedCategory = $derived(shopStore.filters.category);

	// Count items per category
	let categoryCounts = $derived.by(() => {
		const counts: Partial<Record<ShopItemCategory | 'all', number>> = {
			all: shopStore.shopItems.length
		};

		for (const item of shopStore.shopItems) {
			const cat = item.category as ShopItemCategory;
			counts[cat] = (counts[cat] || 0) + 1;
		}

		return counts;
	});

	// Handle category selection
	function selectCategory(category: ShopItemCategory | 'all') {
		shopStore.setCategory(category);
	}
</script>

<div class="space-y-2">
	<h3 class="text-sm font-medium text-muted-foreground">Catégories</h3>

	<!-- Mobile: Horizontal scroll -->
	<div class="flex gap-2 overflow-x-auto pb-2 sm:hidden">
		{#each categories as category (category.value)}
			{@const count = categoryCounts[category.value] || 0}
			<Button
				onclick={() => selectCategory(category.value)}
				variant={selectedCategory === category.value ? 'default' : 'outline'}
				size="sm"
				class="flex-shrink-0 gap-2"
			>
				<span class="text-lg" aria-hidden="true">{category.icon}</span>
				<span>{category.label}</span>
				{#if count > 0}
					<Badge variant="secondary" class="ml-1 px-1 py-0 text-xs">
						{count}
					</Badge>
				{/if}
			</Button>
		{/each}
	</div>

	<!-- Desktop: Grid -->
	<div class="hidden grid-cols-5 gap-2 sm:grid">
		{#each categories as category (category.value)}
			{@const count = categoryCounts[category.value] || 0}
			{@const isSelected = selectedCategory === category.value}
			<button
				onclick={() => selectCategory(category.value)}
				class="group relative overflow-hidden rounded-lg border bg-card p-3 text-left transition-all hover:shadow-md {isSelected
					? 'border-primary bg-primary/5'
					: 'border-border hover:border-primary/50'}"
			>
				<!-- Selection indicator -->
				{#if isSelected}
					<div class="absolute top-0 left-0 h-1 w-full bg-primary"></div>
				{/if}

				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="mb-1 text-2xl" aria-hidden="true">{category.icon}</div>
						<div class="text-sm font-medium">
							{category.label}
						</div>
						<div class="mt-0.5 text-xs text-muted-foreground">
							{category.description}
						</div>
					</div>
					{#if count > 0}
						<Badge variant={isSelected ? 'default' : 'secondary'} class="ml-2">
							{count}
						</Badge>
					{/if}
				</div>
			</button>
		{/each}
	</div>
</div>
