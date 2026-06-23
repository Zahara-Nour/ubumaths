<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import type { MarketplaceListing, CreateProposalData } from '$lib/types/marketplace';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import TradeCardSelector from './trade/TradeCardSelector.svelte';
	import VipCard from '$lib/components/VipCard.svelte';
	import { Info, ArrowRight } from '@lucide/svelte';
	import gidouilleImage from '$lib/assets/images/gidouille.png';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { VipCard as VipCardType } from '$lib/types/vip-card';

	// Props
	let {
		listing,
		open = $bindable(false),
		onSuccess = () => {}
	} = $props<{
		listing: MarketplaceListing;
		open?: boolean;
		onSuccess?: () => void;
	}>();

	// Form state
	let offeredCardIds = $state<string[]>([]);
	let offeredGidouilles = $state(0);
	let message = $state('');
	let isSubmitting = $state(false);

	// Validation
	let isValid = $derived.by(() => {
		// Must offer something
		const hasOffer = offeredCardIds.length > 0 || offeredGidouilles > 0;
		if (!hasOffer) return false;

		// Check if user has enough gidouilles
		if (offeredGidouilles > marketplaceStore.userGidouilles) return false;

		return true;
	});

	// Convert wanted templates to VipCard format for display
	let wantedCardsForDisplay = $derived.by(() => {
		if (!listing.wanted_templates?.length) return [];
		return listing.wanted_templates.map(
			(template: NonNullable<typeof listing.wanted_templates>[0]) => ({
				id: template.id,
				name: template.name,
				description: template.description,
				imagePath: template.image_path ?? undefined,
				rarity: template.rarity as VipCardType['rarity'],
				category: template.category as VipCardType['category']
			})
		);
	});

	// Convert VipCardWithLockStatus to TradeCard format
	let tradeCards = $derived(
		marketplaceStore.myVipCards
			.filter((c) => !c.is_locked)
			.map((c) => ({
				instanceId: c.id,
				cardId: c.template_id,
				earnedAt: c.earned_at,
				usedAt: null // Unlocked cards are not yet used
			}))
	);

	// Reset form
	function resetForm() {
		offeredCardIds = [];
		offeredGidouilles = 0;
		message = '';
	}

	// Submit form
	async function handleSubmit() {
		if (!isValid || isSubmitting) return;

		isSubmitting = true;

		try {
			const data: CreateProposalData = {
				offered_card_ids: offeredCardIds.length > 0 ? offeredCardIds : undefined,
				offered_gidouilles: offeredGidouilles > 0 ? offeredGidouilles : undefined,
				message: message.trim() || undefined
			};

			const success = await marketplaceStore.submitProposal(listing.id, data);

			if (success) {
				toaster.success('Proposition envoyee !');
				open = false;
				resetForm();
				onSuccess();
			}
		} finally {
			isSubmitting = false;
		}
	}

	// Reset when closing
	$effect(() => {
		if (!open) {
			resetForm();
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Faire une proposition</Dialog.Title>
			<Dialog.Description>Proposez un échange pour cette annonce</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-4"
		>
			<!-- Listing Summary -->
			<div class="space-y-3 rounded-lg border bg-muted/30 p-4">
				<div class="flex items-center gap-3">
					<UserAvatar
						avatar_url={listing.creator?.avatar_url}
						role="student"
						firstname={listing.creator?.username}
						class="h-8 w-8"
					/>
					<div>
						<div class="font-medium">{listing.creator?.username || 'Anonyme'}</div>
						<Badge
							variant={listing.listing_type === 'sell' ? 'default' : 'secondary'}
							class="text-xs"
						>
							{listing.listing_type === 'sell' ? 'Vente' : 'Achat'}
						</Badge>
					</div>
				</div>

				<!-- What listing owner wants -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-muted-foreground">Recherche</h4>
					<div class="flex flex-wrap items-center gap-2">
						{#if wantedCardsForDisplay.length > 0}
							<div class="flex gap-2">
								{#each wantedCardsForDisplay.slice(0, 3) as card (card.id)}
									<VipCard {card} size="sm" clickable={false} />
								{/each}
								{#if wantedCardsForDisplay.length > 3}
									<span class="text-sm text-muted-foreground"
										>+{wantedCardsForDisplay.length - 3}</span
									>
								{/if}
							</div>
						{/if}
						{#if listing.wanted_gidouilles && listing.wanted_gidouilles > 0}
							<div
								class="flex items-center gap-1 rounded-lg bg-yellow-50 px-2 py-1 dark:bg-yellow-950/30"
							>
								<span class="font-semibold"
									>{listing.wanted_gidouilles.toLocaleString('fr-FR')}</span
								>
								<img src={gidouilleImage} alt="Gidouille" class="h-4 w-4" />
							</div>
						{/if}
						{#if !wantedCardsForDisplay.length && !listing.wanted_gidouilles}
							<span class="text-sm text-muted-foreground italic">Pas de demande specifique</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Arrow indicator -->
			<div class="flex justify-center">
				<ArrowRight class="h-6 w-6 rotate-90 text-muted-foreground" />
			</div>

			<!-- Your Offer Section -->
			<div class="space-y-3 rounded-lg border p-4">
				<h3 class="font-medium">Votre offre</h3>
				<p class="text-sm text-muted-foreground">
					Selectionnez les cartes et/ou gidouilles que vous proposez en echange
				</p>

				<!-- Card Selection -->
				<div class="space-y-2">
					<Label>Vos cartes VIP</Label>
					<TradeCardSelector cards={tradeCards} bind:selectedCardIds={offeredCardIds} />
				</div>

				<!-- Gidouilles -->
				<div class="space-y-2">
					<Label for="offered-gidouilles">
						Gidouilles
						<span class="ml-2 text-xs text-muted-foreground">
							(Solde: {marketplaceStore.userGidouilles})
						</span>
					</Label>
					<Input
						id="offered-gidouilles"
						type="number"
						bind:value={offeredGidouilles}
						min={0}
						max={Math.min(marketplaceStore.userGidouilles, 10000)}
						placeholder="0"
						class={offeredGidouilles > marketplaceStore.userGidouilles ? 'border-destructive' : ''}
					/>
					{#if offeredGidouilles > marketplaceStore.userGidouilles}
						<p class="text-xs text-destructive">
							Vous n'avez pas assez de gidouilles (solde: {marketplaceStore.userGidouilles})
						</p>
					{/if}
				</div>
			</div>

			<!-- Message -->
			<div class="space-y-2">
				<Label for="message">Message (optionnel)</Label>
				<Textarea
					id="message"
					bind:value={message}
					placeholder="Ajoutez un message pour expliquer votre proposition..."
					rows={3}
					maxlength={500}
				/>
				<p class="text-xs text-muted-foreground">
					{message.length}/500 caracteres
				</p>
			</div>

			<!-- Info -->
			<div class="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
				<Info class="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
				<div class="text-xs text-blue-900 dark:text-blue-100">
					<p>Votre proposition sera envoyee au createur de l'annonce.</p>
					<p class="mt-1">Si elle est acceptee, l'echange sera effectue automatiquement.</p>
				</div>
			</div>
		</form>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>{lore.actions.cancel}</Button>
			<Button onclick={handleSubmit} disabled={!isValid || isSubmitting}>
				{isSubmitting ? 'Envoi...' : 'Envoyer la proposition'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
