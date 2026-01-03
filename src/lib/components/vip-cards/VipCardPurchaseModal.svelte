<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Coins, ShoppingCart, AlertCircle, Check } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { VipCard } from '$lib/types/vip-card';
	import { RARITY_PRICES } from '$lib/types/vip-card';
	import { RARITY_ACCENT_COLORS, RARITY_LABELS } from '$lib/constants/vip-card-ui';

	// Result from server after successful purchase
	interface PurchaseResult {
		instanceId: string;
		cardId: string;
		purchasedAt: string;
		acquiredFrom: string;
		usesRemaining: number | null;
	}

	interface Props {
		open: boolean;
		card: VipCard;
		currentBalance: number;
		onOptimisticPurchase?: (price: number) => void;
		onPurchaseComplete?: (result: PurchaseResult) => void;
		onPurchaseError?: (price: number) => void;
	}

	let {
		open = $bindable(),
		card,
		currentBalance,
		onOptimisticPurchase,
		onPurchaseComplete,
		onPurchaseError
	}: Props = $props();

	let isPurchasing = $state(false);
	let purchaseSuccess = $state(false);
	let error = $state<string | null>(null);

	// Get card price
	let cardPrice = $derived(card.basePrice ?? RARITY_PRICES[card.rarity] ?? 20);
	let canAfford = $derived(currentBalance >= cardPrice);
	let newBalance = $derived(currentBalance - cardPrice);

	// Success display duration
	const SUCCESS_DISPLAY_MS = 1500;

	async function handlePurchase() {
		if (!canAfford) {
			error = 'Gidouilles insuffisantes';
			return;
		}

		isPurchasing = true;
		error = null;

		// 1. OPTIMISTIC UPDATE - instant UI feedback
		onOptimisticPurchase?.(cardPrice);

		try {
			const response = await fetch('/api/vip-cards/purchase', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cardId: card.id })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || "Erreur lors de l'achat");
			}

			const result = await response.json();

			if (result.success && result.instance) {
				purchaseSuccess = true;
				toaster.success(`${card.name} achetee !`);

				// 2. SYNC FROM SERVER - update cache with server data
				onPurchaseComplete?.(result.instance);

				// Close modal after short delay
				setTimeout(() => {
					open = false;
					purchaseSuccess = false;
				}, SUCCESS_DISPLAY_MS);
			} else {
				throw new Error(result.error || 'Achat echoue');
			}
		} catch (err) {
			// 3. ROLLBACK - revert optimistic update on error
			onPurchaseError?.(cardPrice);
			error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(error);
		} finally {
			isPurchasing = false;
		}
	}

	function handleClose() {
		if (!isPurchasing) {
			open = false;
			error = null;
			purchaseSuccess = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<ShoppingCart class="h-5 w-5" />
				Acheter une carte VIP
			</Dialog.Title>
			<Dialog.Description>Confirmer l'achat de cette carte VIP</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			{#if purchaseSuccess}
				<!-- Success State -->
				<div class="flex flex-col items-center gap-4 py-6">
					<div class="rounded-full bg-green-100 p-3">
						<Check class="h-8 w-8 text-green-600" />
					</div>
					<p class="text-lg font-semibold text-green-600">Achat reussi !</p>
					<p class="text-sm text-muted-foreground">
						{card.name} a ete ajoutee a ta collection
					</p>
				</div>
			{:else}
				<!-- Card Preview -->
				<div class="flex items-center gap-4 rounded-lg border bg-card p-4">
					{#if card.imagePath}
						<img src={card.imagePath} alt={card.name} class="h-20 w-20 rounded-lg object-cover" />
					{:else}
						<div class="flex h-20 w-20 items-center justify-center rounded-lg bg-muted">
							<ShoppingCart class="h-8 w-8 text-muted-foreground" />
						</div>
					{/if}
					<div class="flex-1">
						<h3 class="font-semibold">{card.name}</h3>
						<p class="line-clamp-2 text-sm text-muted-foreground">{card.description}</p>
						<div class="mt-1 flex items-center gap-2">
							<span class="text-xs {RARITY_ACCENT_COLORS[card.rarity]}">
								{RARITY_LABELS[card.rarity]}
							</span>
							{#if card.usesTotal}
								<span class="text-xs text-muted-foreground">
									({card.usesTotal} utilisation{card.usesTotal > 1 ? 's' : ''})
								</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Price Summary -->
				<div class="space-y-2 rounded-lg border bg-muted/50 p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Prix</span>
						<span class="flex items-center gap-1 font-semibold">
							<Coins class="h-4 w-4 text-yellow-500" />
							{cardPrice}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Solde actuel</span>
						<span class="flex items-center gap-1">
							<Coins class="h-4 w-4 text-yellow-500" />
							{currentBalance.toFixed(1)}
						</span>
					</div>
					<hr class="my-2" />
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">Solde apres achat</span>
						<span
							class="flex items-center gap-1 font-semibold {canAfford
								? 'text-green-600'
								: 'text-red-600'}"
						>
							<Coins class="h-4 w-4 text-yellow-500" />
							{canAfford ? newBalance.toFixed(1) : 'Insuffisant'}
						</span>
					</div>
				</div>

				<!-- Error Message -->
				{#if error}
					<div
						class="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
					>
						<AlertCircle class="h-4 w-4 shrink-0" />
						{error}
					</div>
				{/if}

				<!-- Warning if can't afford -->
				{#if !canAfford}
					<div
						class="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200"
					>
						<AlertCircle class="h-4 w-4 shrink-0" />
						Gidouilles insuffisantes. Il te manque {(cardPrice - currentBalance).toFixed(1)} gidouilles.
					</div>
				{/if}
			{/if}
		</div>

		{#if !purchaseSuccess}
			<Dialog.Footer>
				<Button variant="outline" onclick={handleClose} disabled={isPurchasing}>Annuler</Button>
				<Button onclick={handlePurchase} disabled={!canAfford || isPurchasing} class="gap-2">
					{#if isPurchasing}
						<span
							class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						></span>
						Achat en cours...
					{:else}
						<ShoppingCart class="h-4 w-4" />
						Acheter pour {cardPrice}
						<Coins class="h-4 w-4 text-yellow-300" />
					{/if}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
