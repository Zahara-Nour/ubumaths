<script lang="ts">
	import type { MarketplaceListing } from '$lib/types/marketplace';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Clock, Eye, MessageSquare, Coins } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import VipCardHolo from '$lib/components/VipCardHolo.svelte';
	import { RARITY_LABELS, RARITY_COLORS } from '$lib/constants/vip-card-ui';
	import CreateProposalModal from './CreateProposalModal.svelte';

	// Props
	let {
		listing,
		open = $bindable(false),
		onclose = () => {},
		isOwner = false
	} = $props<{
		listing: MarketplaceListing;
		open?: boolean;
		onclose?: () => void;
		isOwner?: boolean;
	}>();

	// State for proposal modal
	let showProposalModal = $state(false);

	// Format time
	function formatTime(dateString: string) {
		return formatDistanceToNow(new Date(dateString), {
			addSuffix: true,
			locale: fr
		});
	}

	// Close handler
	function handleClose() {
		open = false;
		onclose();
	}

	// Convert offered cards to VipCard format
	let offeredCardsForDisplay = $derived.by(() => {
		if (!listing.offered_cards?.length) return [];
		return listing.offered_cards.map((card) => ({
			id: card.template_id,
			name: card.template.name,
			description: card.template.description,
			imagePath: card.template.image_path,
			rarity: card.template.rarity
		}));
	});

	// Convert wanted templates to VipCard format
	let wantedCardsForDisplay = $derived.by(() => {
		if (!listing.wanted_templates?.length) return [];
		return listing.wanted_templates.map((template) => ({
			id: template.id,
			name: template.name,
			description: template.description,
			imagePath: template.image_path,
			rarity: template.rarity
		}));
	});
</script>

<Dialog.Root bind:open onOpenChange={(v) => !v && handleClose()}>
	<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center justify-between">
				{listing.title}
				<Badge variant={listing.listing_type === 'sell' ? 'default' : 'secondary'}>
					{listing.listing_type === 'sell' ? 'Vente' : 'Achat'}
				</Badge>
			</Dialog.Title>
			{#if listing.description}
				<Dialog.Description>
					{listing.description}
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Creator Info -->
			<div class="flex items-center gap-3">
				<Avatar.Root class="h-10 w-10">
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
					<div class="text-sm text-muted-foreground">
						Créé {formatTime(listing.created_at)}
					</div>
				</div>
			</div>

			<!-- Stats -->
			<div class="flex items-center gap-4 text-sm text-muted-foreground">
				<span class="flex items-center gap-1">
					<Clock class="h-4 w-4" />
					Expire {formatTime(listing.expires_at)}
				</span>
				<span class="flex items-center gap-1">
					<Eye class="h-4 w-4" />
					{listing.view_count} vue(s)
				</span>
				<span class="flex items-center gap-1">
					<MessageSquare class="h-4 w-4" />
					{listing.proposal_count} proposition(s)
				</span>
			</div>

			<!-- Offer/Demand Details with Cards -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Offered Section -->
				<div class="space-y-3 rounded-lg border p-4">
					<h4 class="font-semibold text-green-600">Offre</h4>

					{#if offeredCardsForDisplay.length > 0}
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
							{#each offeredCardsForDisplay as card (card.id)}
								<div class="flex flex-col items-center gap-2">
									<div class="w-24">
										<VipCardHolo
											{card}
											enableDescriptionOverlay={true}
											enableRarityIndicator={true}
											enablePopover={false}
											enable3d={true}
										/>
									</div>
									<Badge variant="outline" class="border-2 {RARITY_COLORS[card.rarity]}">
										{RARITY_LABELS[card.rarity]}
									</Badge>
								</div>
							{/each}
						</div>
					{/if}

					{#if listing.offered_gidouilles && listing.offered_gidouilles > 0}
						<div class="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/30">
							<Coins class="h-5 w-5 text-yellow-500" />
							<span class="font-semibold">{listing.offered_gidouilles}</span>
							<span class="text-muted-foreground">gidouilles</span>
						</div>
					{/if}

					{#if !offeredCardsForDisplay.length && !listing.offered_gidouilles}
						<p class="text-muted-foreground italic">Aucune offre</p>
					{/if}
				</div>

				<!-- Wanted Section -->
				<div class="space-y-3 rounded-lg border p-4">
					<h4 class="font-semibold text-blue-600">Demande</h4>

					{#if wantedCardsForDisplay.length > 0}
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
							{#each wantedCardsForDisplay as card (card.id)}
								<div class="flex flex-col items-center gap-2">
									<div class="w-24">
										<VipCardHolo
											{card}
											enableDescriptionOverlay={true}
											enableRarityIndicator={true}
											enablePopover={false}
											enable3d={true}
										/>
									</div>
									<Badge variant="outline" class="border-2 {RARITY_COLORS[card.rarity]}">
										{RARITY_LABELS[card.rarity]}
									</Badge>
								</div>
							{/each}
						</div>
					{/if}

					{#if listing.wanted_gidouilles && listing.wanted_gidouilles > 0}
						<div class="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/30">
							<Coins class="h-5 w-5 text-yellow-500" />
							<span class="font-semibold">{listing.wanted_gidouilles}</span>
							<span class="text-muted-foreground">gidouilles</span>
						</div>
					{/if}

					{#if !wantedCardsForDisplay.length && !listing.wanted_gidouilles}
						<p class="text-muted-foreground italic">Aucune demande spécifique</p>
					{/if}
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleClose}>Fermer</Button>
			{#if !isOwner}
				<Button onclick={() => (showProposalModal = true)}>Faire une proposition</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Proposal Modal -->
{#if !isOwner}
	<CreateProposalModal {listing} bind:open={showProposalModal} onSuccess={handleClose} />
{/if}
