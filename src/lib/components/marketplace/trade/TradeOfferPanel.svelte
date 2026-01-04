<!--
	TradeOfferPanel Component
	=========================
	Panel displaying one side of the trade (my offer or partner's offer).

	Features:
	- Card selection grid (editable for my panel, read-only for partner)
	- Gidouilles input (editable for my panel)
	- Offer summary
	- Validation button and status

	Props:
	- isMyPanel: boolean - Whether this is the current user's panel
	- cards: VipCardInstance[] - Available cards for selection
	- offer: { cards: string[], gidouilles: number } - Current offer state
	- validated: boolean - Whether offer is validated
	- gidouillesBalance: number - Available gidouilles (for my panel)
	- partnerName?: string - Partner name (for partner panel)
	- onSelectCard?: (cardId: string) => void
	- onDeselectCard?: (cardId: string) => void
	- onSetGidouilles?: (amount: number) => void
	- onValidate?: () => void
-->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Check } from 'lucide-svelte';
	import TradeCardSelector from './TradeCardSelector.svelte';
	import type { VipCardInstance } from '$lib/types/vip-card';
	import gidouilleImg from '$lib/assets/images/gidouille.png';

	// Extended type for cards with instanceId
	type TradeCard = VipCardInstance & { instanceId: string };

	interface Props {
		isMyPanel: boolean;
		cards: TradeCard[];
		offer: { cards: string[]; gidouilles: number };
		validated: boolean;
		gidouillesBalance: number;
		partnerName?: string;
		onSelectCard?: (cardId: string) => void;
		onDeselectCard?: (cardId: string) => void;
		onSetGidouilles?: (amount: number) => void;
	}

	let {
		isMyPanel,
		cards,
		offer,
		validated,
		gidouillesBalance,
		partnerName = 'Partenaire',
		onSelectCard,
		onDeselectCard,
		onSetGidouilles
	}: Props = $props();

	// Local state for gidouilles input
	let gidouillesInput = $state(offer.gidouilles.toString());

	// Sync gidouilles input with offer
	$effect(() => {
		gidouillesInput = offer.gidouilles.toString();
	});

	// Panel title
	let title = $derived(isMyPanel ? 'Mon offre' : partnerName);

	// Offer summary
	let cardCount = $derived(offer.cards.length);
	let summaryText = $derived.by(() => {
		const parts: string[] = [];
		if (cardCount > 0) {
			parts.push(`${cardCount} carte${cardCount > 1 ? 's' : ''}`);
		}
		if (offer.gidouilles > 0) {
			parts.push(`${offer.gidouilles} gidouilles`);
		}
		return parts.length > 0 ? parts.join(' + ') : 'Aucune offre';
	});

	/**
	 * Handle gidouilles input change
	 */
	function handleGidouillesChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		const value = parseInt(input.value, 10);

		if (isNaN(value) || value < 0) {
			gidouillesInput = '0';
			onSetGidouilles?.(0);
		} else {
			// Cap at balance
			const capped = Math.min(value, gidouillesBalance);
			gidouillesInput = capped.toString();
			onSetGidouilles?.(capped);
		}
	}

	/**
	 * Handle card selection
	 */
	function handleSelect(cardId: string): void {
		onSelectCard?.(cardId);
	}

	/**
	 * Handle card deselection
	 */
	function handleDeselect(cardId: string): void {
		onDeselectCard?.(cardId);
	}
</script>

<div class="flex flex-col gap-2">
	<!-- Header -->
	<div class="flex items-center gap-2">
		<h2 class="text-xl font-bold">{title}</h2>
		{#if validated}
			<Badge variant="default" class="gap-1 bg-green-600">
				<Check class="h-3 w-3" />
				Valide
			</Badge>
		{/if}
	</div>

	<!-- Card Selector -->
	<div class="rounded-lg border bg-card p-2">
		<h3 class="mb-2 text-xs font-medium text-muted-foreground">
			{isMyPanel ? 'Selectionnez les cartes' : 'Cartes proposees'}
		</h3>
		<TradeCardSelector
			{cards}
			selectedCardIds={offer.cards}
			readonly={!isMyPanel}
			onSelect={handleSelect}
			onDeselect={handleDeselect}
		/>
	</div>

	<!-- Gidouilles Input (only for my panel) -->
	{#if isMyPanel}
		<div class="flex items-center gap-2 rounded-lg border bg-card p-2">
			<img src={gidouilleImg} alt="Gidouille" class="h-5 w-5" />
			<Input
				id="gidouilles-input"
				type="number"
				min="0"
				max={gidouillesBalance}
				value={gidouillesInput}
				onchange={handleGidouillesChange}
				disabled={validated}
				class="max-w-24"
			/>
			<span class="text-xs text-muted-foreground">/ {gidouillesBalance}</span>
		</div>
	{:else if offer.gidouilles > 0}
		<!-- Show partner's gidouilles offer -->
		<div class="flex items-center gap-2 rounded-lg border bg-card p-2">
			<img src={gidouilleImg} alt="Gidouille" class="h-5 w-5" />
			<span class="font-medium">{offer.gidouilles} gidouilles</span>
		</div>
	{/if}

	<!-- Summary -->
	<div class="rounded-lg bg-muted p-2">
		<p class="text-xs font-medium">
			Resume : <span class="text-foreground">{summaryText}</span>
		</p>
	</div>
</div>
