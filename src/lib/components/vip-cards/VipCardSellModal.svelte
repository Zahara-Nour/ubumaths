<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, Check, Sparkles } from 'lucide-svelte';
	import gidouilleImage from '$lib/assets/images/gidouille.png';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { VipCard } from '$lib/types/vip-card';
	import { RARITY_ACCENT_COLORS, RARITY_LABELS } from '$lib/constants/vip-card-ui';

	interface Props {
		open: boolean;
		card: VipCard;
		instanceId: string;
		sellPrice: number;
		currentBalance: number;
		onSellComplete?: (sellPrice: number) => void;
		onSellError?: () => void;
	}

	let {
		open = $bindable(),
		card,
		instanceId,
		sellPrice,
		currentBalance,
		onSellComplete,
		onSellError
	}: Props = $props();

	let isSelling = $state(false);
	let sellSuccess = $state(false);
	let confirmedPrice = $state(0);
	let error = $state<string | null>(null);

	let newBalance = $derived(Math.round((currentBalance + sellPrice) * 100) / 100);

	// Format number with French locale
	function fmt(n: number): string {
		return n.toLocaleString('fr-FR');
	}

	const SUCCESS_DISPLAY_MS = 1500;

	async function handleSell() {
		isSelling = true;
		error = null;

		try {
			const response = await fetch('/api/vip-cards/sell', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cardInstanceId: instanceId })
			});

			if (!response.ok) {
				const data = await response.json().catch(() => null);
				const message = data?.error || data?.message || 'Erreur lors de la vente';
				throw new Error(message);
			}

			const result = await response.json();

			if (result.success) {
				confirmedPrice = result.sellPrice ?? sellPrice;
				sellSuccess = true;
				toaster.success(`${card.name} vendue pour ${confirmedPrice}g !`);
				onSellComplete?.(confirmedPrice);

				setTimeout(() => {
					open = false;
					sellSuccess = false;
				}, SUCCESS_DISPLAY_MS);
			} else {
				throw new Error(result.error || 'Vente echouee');
			}
		} catch (err) {
			onSellError?.();
			error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(error);
		} finally {
			isSelling = false;
		}
	}

	function handleClose() {
		if (!isSelling) {
			open = false;
			error = null;
			sellSuccess = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<img src={gidouilleImage} alt="Gidouille" class="h-5 w-5" />
				Vendre une carte VIP
			</Dialog.Title>
			<Dialog.Description>Revendre cette carte contre des gidouilles</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			{#if sellSuccess}
				<!-- Success State -->
				<div class="flex flex-col items-center gap-4 py-6">
					<div class="rounded-full bg-green-100 p-3">
						<Check class="h-8 w-8 text-green-600" />
					</div>
					<p class="text-lg font-semibold text-green-600">Carte vendue !</p>
					<p class="text-sm text-muted-foreground">
						+{fmt(confirmedPrice)} gidouilles ajoutees a ton solde
					</p>
				</div>
			{:else}
				<!-- Card Preview -->
				<div class="flex items-center gap-4 rounded-lg border bg-card p-4">
					{#if card.imagePath}
						<img src={card.imagePath} alt={card.name} class="h-20 w-20 rounded-lg object-cover" />
					{:else}
						<div class="flex h-20 w-20 items-center justify-center rounded-lg bg-muted">
							<Sparkles class="h-8 w-8 text-muted-foreground" />
						</div>
					{/if}
					<div class="flex-1">
						<h3 class="font-semibold">{card.name}</h3>
						<p class="line-clamp-2 text-sm text-muted-foreground">{card.description}</p>
						<div class="mt-1">
							<span class="text-xs {RARITY_ACCENT_COLORS[card.rarity]}">
								{RARITY_LABELS[card.rarity]}
							</span>
						</div>
					</div>
				</div>

				<!-- Price Summary -->
				<div class="space-y-2 rounded-lg border bg-muted/50 p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Prix de vente</span>
						<span class="flex items-center gap-1 font-semibold text-amber-600">
							+{fmt(sellPrice)}
							<img src={gidouilleImage} alt="Gidouille" class="h-4 w-4" />
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Solde actuel</span>
						<span class="flex items-center gap-1">
							{fmt(currentBalance)}
							<img src={gidouilleImage} alt="Gidouille" class="h-4 w-4" />
						</span>
					</div>
					<hr class="my-2" />
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">Solde apres vente</span>
						<span class="flex items-center gap-1 font-semibold text-green-600">
							{fmt(newBalance)}
							<img src={gidouilleImage} alt="Gidouille" class="h-4 w-4" />
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
			{/if}
		</div>

		{#if !sellSuccess}
			<Dialog.Footer>
				<Button variant="outline" onclick={handleClose} disabled={isSelling}>Annuler</Button>
				<Button
					onclick={handleSell}
					disabled={isSelling}
					class="gap-2 bg-amber-500 text-white hover:bg-amber-600"
				>
					{#if isSelling}
						<span
							class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						></span>
						Vente en cours...
					{:else}
						Vendre pour {fmt(sellPrice)}
						<img src={gidouilleImage} alt="Gidouille" class="h-4 w-4" />
					{/if}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
