<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import type { MarketplaceTrade, CreateTradeOfferData } from '$lib/types/marketplace';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import VipCardSelector from './VipCardSelector.svelte';
	import { ArrowLeftRight, MessageSquare, CheckCircle, XCircle } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Props
	let {
		trade,
		open = $bindable(false),
		onClose = () => {}
	} = $props<{
		trade: MarketplaceTrade;
		open?: boolean;
		onClose?: () => void;
	}>();

	// Get current user ID
	let userId = $derived($page.data.user?.id);

	// State for offer
	let myCardIds = $state<string[]>([]);
	let myGidouilles = $state(0);
	let partnerCardIds = $state<string[]>([]);
	let partnerGidouilles = $state(0);
	let isSubmitting = $state(false);

	// Determine if I'm initiator or partner
	let isInitiator = $derived(trade.initiator_id === userId);
	let partner = $derived(isInitiator ? trade.partner : trade.initiator);

	// Current offers
	let myCurrentOffer = $derived(
		isInitiator ? trade.current_offer?.from_initiator : trade.current_offer?.from_partner
	);

	let theirCurrentOffer = $derived(
		isInitiator ? trade.current_offer?.from_partner : trade.current_offer?.from_initiator
	);

	// Check if it's my turn
	let isMyTurn = $derived(trade.last_offer_by !== null && trade.last_offer_by !== userId);

	// Check if offer is different from current
	let offerChanged = $derived(() => {
		const currentMyCards = myCurrentOffer?.cards || [];
		const currentMyGidouilles = myCurrentOffer?.gidouilles || 0;
		const currentPartnerCards = theirCurrentOffer?.cards || [];
		const currentPartnerGidouilles = theirCurrentOffer?.gidouilles || 0;

		return (
			JSON.stringify(myCardIds.sort()) !== JSON.stringify(currentMyCards.sort()) ||
			myGidouilles !== currentMyGidouilles ||
			JSON.stringify(partnerCardIds.sort()) !== JSON.stringify(currentPartnerCards.sort()) ||
			partnerGidouilles !== currentPartnerGidouilles
		);
	});

	// Submit counter-offer
	async function submitOffer() {
		if (isSubmitting || !offerChanged()) return;

		isSubmitting = true;

		try {
			const offer: CreateTradeOfferData = isInitiator
				? {
						initiator_card_ids: myCardIds.length > 0 ? myCardIds : undefined,
						initiator_gidouilles: myGidouilles > 0 ? myGidouilles : undefined,
						partner_card_ids: partnerCardIds.length > 0 ? partnerCardIds : undefined,
						partner_gidouilles: partnerGidouilles > 0 ? partnerGidouilles : undefined
					}
				: {
						partner_card_ids: myCardIds.length > 0 ? myCardIds : undefined,
						partner_gidouilles: myGidouilles > 0 ? myGidouilles : undefined,
						initiator_card_ids: partnerCardIds.length > 0 ? partnerCardIds : undefined,
						initiator_gidouilles: partnerGidouilles > 0 ? partnerGidouilles : undefined
					};

			const success = await marketplaceStore.submitTradeOffer(trade.id, offer);
			if (success) {
				toaster.success('Offre envoyée');
			}
		} finally {
			isSubmitting = false;
		}
	}

	// Accept current offer
	async function acceptOffer() {
		if (isSubmitting || !isMyTurn) return;

		if (!confirm("Êtes-vous sûr de vouloir accepter cette offre ? L'échange sera définitif.")) {
			return;
		}

		isSubmitting = true;

		try {
			const success = await marketplaceStore.acceptTradeOffer(trade.id);
			if (success) {
				open = false;
				onClose();
			}
		} finally {
			isSubmitting = false;
		}
	}

	// Cancel trade
	async function cancelTrade() {
		if (isSubmitting) return;

		if (!confirm('Êtes-vous sûr de vouloir annuler cet échange ?')) {
			return;
		}

		isSubmitting = true;

		try {
			const success = await marketplaceStore.cancelTrade(trade.id);
			if (success) {
				open = false;
				onClose();
			}
		} finally {
			isSubmitting = false;
		}
	}

	// Initialize offer values
	$effect(() => {
		if (trade) {
			myCardIds = myCurrentOffer?.cards || [];
			myGidouilles = myCurrentOffer?.gidouilles || 0;
			partnerCardIds = theirCurrentOffer?.cards || [];
			partnerGidouilles = theirCurrentOffer?.gidouilles || 0;
		}
	});
</script>

<Dialog.Root bind:open onOpenChange={(v) => !v && onClose()}>
	<Dialog.Content class="max-h-[90vh] max-w-4xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-3">
				<ArrowLeftRight class="h-5 w-5" />
				Négociation avec {partner?.username || 'Anonyme'}
			</Dialog.Title>
			<Dialog.Description>
				{#if isMyTurn}
					C'est votre tour de répondre à l'offre
				{:else if trade.last_offer_by === userId}
					En attente de la réponse de {partner?.username}
				{:else}
					Faites une première offre
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Current Offer Display -->
			<div class="space-y-4">
				<h3 class="font-semibold">Offre actuelle</h3>

				{#if !trade.current_offer || (!myCurrentOffer && !theirCurrentOffer)}
					<div class="py-8 text-center text-muted-foreground">Aucune offre pour le moment</div>
				{:else}
					<div class="space-y-3">
						<div class="rounded-lg border p-4">
							<div class="mb-2 flex items-center gap-2">
								<Avatar.Root class="h-6 w-6">
									<Avatar.Fallback>Vous</Avatar.Fallback>
								</Avatar.Root>
								<span class="font-medium">Vous offrez</span>
							</div>
							<div class="text-sm text-muted-foreground">
								{myCurrentOffer?.cards?.length || 0} carte(s),
								{myCurrentOffer?.gidouilles || 0} gidouilles
							</div>
						</div>

						<div class="flex justify-center">
							<ArrowLeftRight class="h-4 w-4 text-muted-foreground" />
						</div>

						<div class="rounded-lg border p-4">
							<div class="mb-2 flex items-center gap-2">
								<Avatar.Root class="h-6 w-6">
									<Avatar.Image src={partner?.avatar_url || '/default-avatar.jpg'} />
									<Avatar.Fallback>
										{partner?.username?.charAt(0).toUpperCase() || '?'}
									</Avatar.Fallback>
								</Avatar.Root>
								<span class="font-medium">{partner?.username} offre</span>
							</div>
							<div class="text-sm text-muted-foreground">
								{theirCurrentOffer?.cards?.length || 0} carte(s),
								{theirCurrentOffer?.gidouilles || 0} gidouilles
							</div>
						</div>
					</div>

					{#if isMyTurn}
						<Button onclick={acceptOffer} class="w-full" disabled={isSubmitting}>
							<CheckCircle class="mr-2 h-4 w-4" />
							Accepter cette offre
						</Button>
					{/if}
				{/if}
			</div>

			<Separator orientation="vertical" class="hidden lg:block" />

			<!-- Counter-Offer Builder -->
			<div class="space-y-4">
				<h3 class="font-semibold">
					{isMyTurn ? 'Faire une contre-offre' : 'Modifier votre offre'}
				</h3>

				<div class="space-y-4">
					<!-- My offer -->
					<div class="space-y-2">
						<Label>Mes cartes à échanger</Label>
						<div class="max-h-48 overflow-y-auto">
							{#if marketplaceStore.myVipCards.length > 0}
								<VipCardSelector
									cards={marketplaceStore.myVipCards}
									bind:selectedCardIds={myCardIds}
									mode="multiple"
									excludeLocked={true}
									maxSelection={marketplaceStore.config?.max_cards_per_trade || 10}
									compact={true}
								/>
							{:else}
								<p class="py-4 text-center text-sm text-muted-foreground">
									Aucune carte disponible
								</p>
							{/if}
						</div>
					</div>

					<div class="space-y-2">
						<Label for="my-gidouilles">Mes gidouilles</Label>
						<Input
							id="my-gidouilles"
							type="number"
							bind:value={myGidouilles}
							min={0}
							max={marketplaceStore.config?.max_gidouilles_per_trade || 10000}
							placeholder="0"
						/>
					</div>

					<Separator />

					<!-- Partner request -->
					<div class="space-y-2">
						<Label>Cartes demandées à {partner?.username}</Label>
						<p class="text-xs text-muted-foreground">
							Note: Vous ne pouvez pas voir les cartes spécifiques de votre partenaire
						</p>
						<Input
							type="number"
							bind:value={partnerCardIds.length}
							min={0}
							max={marketplaceStore.config?.max_cards_per_trade || 10}
							placeholder="Nombre de cartes demandées"
							disabled
						/>
					</div>

					<div class="space-y-2">
						<Label for="partner-gidouilles">Gidouilles demandés</Label>
						<Input
							id="partner-gidouilles"
							type="number"
							bind:value={partnerGidouilles}
							min={0}
							max={marketplaceStore.config?.max_gidouilles_per_trade || 10000}
							placeholder="0"
						/>
					</div>

					<Button
						onclick={submitOffer}
						disabled={!offerChanged() ||
							isSubmitting ||
							(trade.last_offer_by === userId && isMyTurn)}
						class="w-full"
					>
						{isSubmitting ? 'Envoi...' : "Envoyer l'offre"}
					</Button>
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="destructive" onclick={cancelTrade} disabled={isSubmitting}>
				<XCircle class="mr-2 h-4 w-4" />
				Annuler l'échange
			</Button>
			<Button
				variant="outline"
				onclick={() => {
					open = false;
					onClose();
				}}
			>
				Fermer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
