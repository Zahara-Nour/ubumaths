<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { ShoppingCart, Package, AlertCircle, Lock, Coins } from 'lucide-svelte';
	import type { ShopItemWithStatus, ShopItemRarity } from '$lib/types/shop';

	// Props
	let { item, onPurchase } = $props<{
		item: ShopItemWithStatus;
		onPurchase: () => void;
	}>();

	// Get rarity color and label
	function getRarityInfo(rarity: ShopItemRarity) {
		switch (rarity) {
			case 'common':
				return { color: 'bg-gray-500', label: 'Commun' };
			case 'uncommon':
				return { color: 'bg-green-500', label: 'Peu commun' };
			case 'rare':
				return { color: 'bg-blue-500', label: 'Rare' };
			case 'epic':
				return { color: 'bg-purple-500', label: 'Épique' };
			case 'legendary':
				return { color: 'bg-orange-500', label: 'Légendaire' };
			default:
				return { color: 'bg-gray-500', label: 'Commun' };
		}
	}

	// Get category icon
	function getCategoryIcon(category: string) {
		switch (category) {
			case 'consumable':
				return '🧪';
			case 'booster':
				return '⚡';
			case 'cosmetic':
				return '✨';
			case 'utility':
				return '🔧';
			default:
				return '📦';
		}
	}

	// Computed
	let rarityInfo = $derived(getRarityInfo(item.rarity as ShopItemRarity));
	let hasDiscount = $derived(item.discount_percentage && item.discount_percentage > 0);
	let categoryIcon = $derived(getCategoryIcon(item.category));
</script>

<Card class="group relative overflow-hidden transition-all hover:shadow-lg">
	<!-- Rarity banner -->
	<div class="{rarityInfo.color} absolute top-0 left-0 h-1 w-full"></div>

	<!-- Discount badge if applicable -->
	{#if hasDiscount}
		<Badge variant="destructive" class="absolute top-2 right-2 z-10">
			-{item.discount_percentage}%
		</Badge>
	{/if}

	<CardContent class="p-4">
		<!-- Icon/Image placeholder -->
		<div class="mb-3 flex h-24 w-full items-center justify-center rounded-lg bg-muted">
			{#if item.icon_url}
				<img src={item.icon_url} alt={item.display_name} class="h-full w-full object-contain" />
			{:else}
				<span class="text-4xl">{categoryIcon}</span>
			{/if}
		</div>

		<!-- Item name and rarity -->
		<div class="mb-2">
			<h3 class="line-clamp-1 font-semibold">{item.display_name}</h3>
			<Badge variant="secondary" class="mt-1 text-xs">
				{rarityInfo.label}
			</Badge>
		</div>

		<!-- Description -->
		{#if item.description}
			<p class="mb-3 line-clamp-2 text-sm text-muted-foreground">
				{item.description}
			</p>
		{/if}

		<!-- Price -->
		<div class="mb-3 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Coins class="h-4 w-4 text-yellow-500" />
				{#if hasDiscount}
					<span class="text-sm text-muted-foreground line-through">
						{item.base_price}
					</span>
					<span class="font-bold text-primary">
						{item.final_price}
					</span>
				{:else}
					<span class="font-bold">
						{item.final_price}
					</span>
				{/if}
			</div>

			<!-- Ownership indicator -->
			{#if item.owned_quantity > 0}
				<div class="flex items-center gap-1 text-sm text-muted-foreground">
					<Package class="h-3 w-3" />
					<span>×{item.owned_quantity}</span>
				</div>
			{/if}
		</div>

		<!-- Purchase limits warning -->
		{#if item.purchase_limit_reason}
			<div class="bg-warning/10 mb-3 flex items-start gap-2 rounded p-2">
				<AlertCircle class="text-warning mt-0.5 h-3 w-3" />
				<span class="text-warning text-xs">{item.purchase_limit_reason}</span>
			</div>
		{/if}

		<!-- Purchase button -->
		<Button onclick={onPurchase} disabled={!item.can_purchase} class="w-full" size="sm">
			{#if !item.can_purchase}
				<Lock class="mr-2 h-3 w-3" />
				Non disponible
			{:else}
				<ShoppingCart class="mr-2 h-3 w-3" />
				Acheter
			{/if}
		</Button>
	</CardContent>
</Card>
