<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import type { MarketplaceListing, CreateProposalData } from '$lib/types/marketplace';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import VipCardSelector from './VipCardSelector.svelte';
	import VipCardHolo from '$lib/components/VipCardHolo.svelte';
	import { Info, Coins, ArrowRight } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { VipCard } from '$lib/types/vip-card';

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
		return listing.wanted_templates.map((template) => ({
			id: template.id,
			name: template.name,
			description: template.description,
			imagePath: template.image_path ?? undefined,
			rarity: template.rarity as VipCard['rarity'],
			category: template.category as VipCard['category']
		}));
	});

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

			const success = await marketplaceStore.createProposal(listing.id, data);

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
			<Dialog.Description>
				Proposez un echange pour l'annonce "{listing.title}"
			</Dialog.Description>
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
					<Avatar.Root class="h-8 w-8">
						<Avatar.Image
							src={listing.creator?.avatar_url || '/default-avatar.jpg'}
							alt={listing.creator?.username}
						/>
						<Avatar.Fallback>
							{listing.creator?.username?.charAt(0).toUpperCase() || '?'}
						</Avatar.Fallback>
					</Avatar.Root>
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
									<div class="w-12">
										<VipCardHolo
											{card}
											enableDescriptionOverlay={false}
											enableRarityIndicator={true}
											enablePopover={false}
											enable3d={false}
											enableHoloEffect={false}
										/>
									</div>
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
								<Coins class="h-4 w-4 text-yellow-500" />
								<span class="font-semibold">{listing.wanted_gidouilles}</span>
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
					{#if marketplaceStore.myVipCards.length > 0}
						<VipCardSelector
							cards={marketplaceStore.myVipCards}
							bind:selectedCardIds={offeredCardIds}
							mode="multiple"
							excludeLocked={true}
							maxSelection={marketplaceStore.config?.max_cards_per_trade || 10}
							compact={true}
						/>
					{:else}
						<p class="py-4 text-center text-sm text-muted-foreground">
							Vous n'avez pas de cartes VIP disponibles
						</p>
					{/if}
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
						max={Math.min(
							marketplaceStore.userGidouilles,
							marketplaceStore.config?.max_gidouilles_per_trade || 10000
						)}
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
			<Button variant="outline" onclick={() => (open = false)}>Annuler</Button>
			<Button onclick={handleSubmit} disabled={!isValid || isSubmitting}>
				{isSubmitting ? 'Envoi...' : 'Envoyer la proposition'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
