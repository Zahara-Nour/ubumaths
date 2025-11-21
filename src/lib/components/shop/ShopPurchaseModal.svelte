<script lang="ts">
	import { shopStore } from '$lib/stores/shop.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		ShoppingCart,
		Coins,
		Package,
		AlertCircle,
		Plus,
		Minus,
		CheckCircle
	} from 'lucide-svelte';
	import type { ShopItemWithStatus, ShopItemRarity } from '$lib/types/shop';

	// Props
	let { open = $bindable(), item } = $props<{
		open: boolean;
		item: ShopItemWithStatus;
	}>();

	// State
	let quantity = $state(1);
	let isPurchasing = $state(false);
	let purchaseSuccess = $state(false);

	// Computed
	let totalPrice = $derived(item.final_price * quantity);
	let canAfford = $derived(shopStore.gidouillesBalance >= totalPrice);
	let maxQuantity = $derived.by(() => {
		// Check various limits
		let max = 99; // Default max

		// Check if stackable
		if (item.properties?.stackable === false) {
			max = Math.min(max, 1);
		}

		// Check max owned limit
		if (item.max_owned_per_student) {
			max = Math.min(max, item.max_owned_per_student - item.owned_quantity);
		}

		// Check daily limit
		if (item.daily_purchase_limit) {
			// Note: We'd need to track daily purchases to enforce this properly
			max = Math.min(max, item.daily_purchase_limit);
		}

		// Check affordability
		if (item.final_price > 0) {
			max = Math.min(max, Math.floor(shopStore.gidouillesBalance / item.final_price));
		}

		return Math.max(1, max);
	});

	// Get rarity info
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

	// Handle quantity change
	function adjustQuantity(delta: number) {
		quantity = Math.max(1, Math.min(maxQuantity, quantity + delta));
	}

	// Handle purchase
	async function handlePurchase() {
		if (!canAfford || isPurchasing) return;

		isPurchasing = true;
		purchaseSuccess = false;

		const success = await shopStore.purchaseItem(item.id, quantity);

		if (success) {
			purchaseSuccess = true;
			// Close modal after a short delay to show success
			setTimeout(() => {
				open = false;
				// Reset state
				quantity = 1;
				purchaseSuccess = false;
			}, 1500);
		}

		isPurchasing = false;
	}

	// Reset on open
	$effect(() => {
		if (open) {
			quantity = 1;
			purchaseSuccess = false;
			isPurchasing = false;
		}
	});

	let rarityInfo = $derived(getRarityInfo(item.rarity as ShopItemRarity));
	let categoryIcon = $derived(getCategoryIcon(item.category));
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Confirmer l'achat</Dialog.Title>
		</Dialog.Header>

		{#if purchaseSuccess}
			<!-- Success state -->
			<div class="flex flex-col items-center justify-center py-8" role="status" aria-live="polite">
				<CheckCircle class="h-16 w-16 text-green-500" />
				<h3 class="mt-4 text-lg font-semibold">Achat réussi !</h3>
				<p class="mt-2 text-center text-sm text-muted-foreground">
					Vous avez acheté {quantity}× {item.display_name}
				</p>
			</div>
		{:else}
			<!-- Item details -->
			<div class="space-y-4">
				<!-- Item preview -->
				<div class="rounded-lg border bg-card p-4">
					<div class="flex gap-4">
						<!-- Icon -->
						<div class="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
							{#if item.icon_url}
								<img
									src={item.icon_url}
									alt={item.display_name}
									class="h-full w-full object-contain"
								/>
							{:else}
								<span class="text-2xl" aria-hidden="true">{categoryIcon}</span>
							{/if}
						</div>

						<!-- Info -->
						<div class="flex-1">
							<h3 class="font-semibold">{item.display_name}</h3>
							<div class="mt-1 flex items-center gap-2">
								<Badge variant="secondary" class="text-xs">
									{rarityInfo.label}
								</Badge>
								<Badge variant="outline" class="text-xs">
									{item.category}
								</Badge>
							</div>
							{#if item.description}
								<p class="mt-2 text-sm text-muted-foreground">
									{item.description}
								</p>
							{/if}
						</div>
					</div>

					<!-- Current ownership -->
					{#if item.owned_quantity > 0}
						<div class="mt-3 flex items-center gap-2 rounded bg-muted/50 px-3 py-2">
							<Package class="h-4 w-4 text-muted-foreground" />
							<span class="text-sm">
								Vous possédez déjà : <strong>{item.owned_quantity}</strong>
							</span>
						</div>
					{/if}
				</div>

				<!-- Quantity selector -->
				{#if maxQuantity > 1}
					<div>
						<Label for="quantity">Quantité</Label>
						<div class="mt-2 flex items-center gap-2">
							<Button
								onclick={() => adjustQuantity(-1)}
								disabled={quantity <= 1}
								size="icon"
								variant="outline"
								aria-label="Diminuer la quantité"
							>
								<Minus class="h-4 w-4" />
							</Button>
							<Input
								id="quantity"
								type="number"
								bind:value={quantity}
								min="1"
								max={maxQuantity}
								class="w-20 text-center"
							/>
							<Button
								onclick={() => adjustQuantity(1)}
								disabled={quantity >= maxQuantity}
								size="icon"
								variant="outline"
								aria-label="Augmenter la quantité"
							>
								<Plus class="h-4 w-4" />
							</Button>
							<span class="text-sm text-muted-foreground">
								(max: {maxQuantity})
							</span>
						</div>
					</div>
				{/if}

				<!-- Price summary -->
				<div class="space-y-2 rounded-lg border bg-muted/20 p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm">Prix unitaire</span>
						<div class="flex items-center gap-1">
							<Coins class="h-4 w-4 text-yellow-500" />
							<span>{item.final_price}</span>
						</div>
					</div>
					{#if quantity > 1}
						<div class="flex items-center justify-between">
							<span class="text-sm">Quantité</span>
							<span>×{quantity}</span>
						</div>
						<div class="border-t pt-2">
							<div class="flex items-center justify-between">
								<span class="font-semibold">Total</span>
								<div class="flex items-center gap-1 text-lg font-bold">
									<Coins class="h-5 w-5 text-yellow-500" />
									<span>{totalPrice}</span>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Balance check -->
				<div class="space-y-2">
					<div class="flex items-center justify-between text-sm">
						<span>Votre solde</span>
						<div class="flex items-center gap-1">
							<Coins class="h-4 w-4 text-yellow-500" />
							<span class={canAfford ? '' : 'text-destructive'}>
								{shopStore.gidouillesBalance}
							</span>
						</div>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span>Après l'achat</span>
						<div class="flex items-center gap-1">
							<Coins class="h-4 w-4 text-yellow-500" />
							<span class={canAfford ? 'text-green-600' : 'text-destructive'}>
								{shopStore.gidouillesBalance - totalPrice}
							</span>
						</div>
					</div>
				</div>

				{#if !canAfford}
					<div class="flex items-start gap-2 rounded-lg bg-destructive/10 p-3" role="alert">
						<AlertCircle class="mt-0.5 h-4 w-4 text-destructive" />
						<div class="text-sm text-destructive">
							<p class="font-semibold">Gidouilles insuffisantes</p>
							<p>Il vous manque {totalPrice - shopStore.gidouillesBalance} gidouilles.</p>
						</div>
					</div>
				{/if}
			</div>

			<Dialog.Footer class="gap-2">
				<Button onclick={() => (open = false)} variant="outline" disabled={isPurchasing}>
					Annuler
				</Button>
				<Button onclick={handlePurchase} disabled={!canAfford || isPurchasing} class="gap-2">
					{#if isPurchasing}
						<span class="animate-spin">⏳</span>
						Achat en cours...
					{:else}
						<ShoppingCart class="h-4 w-4" />
						Acheter pour {totalPrice} gidouilles
					{/if}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
