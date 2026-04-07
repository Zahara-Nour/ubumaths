<script lang="ts">
	import type { MarketplaceListing } from '$lib/types/marketplace';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import gidouilleImage from '$lib/assets/images/gidouille.png';
	import VipCard from '$lib/components/VipCard.svelte';
	import CreateProposalModal from './CreateProposalModal.svelte';
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';

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

	// Check if user already has a proposal on this listing
	let myProposal = $derived(marketplaceStore.myProposals.find((p) => p.listing_id === listing.id));

	// Can accept directly: user can fulfill exactly what the listing demands
	let canAcceptDirectly = $derived.by(() => {
		if (isOwner || myProposal?.status === 'pending') return false;

		const wantedGidouilles = listing.wanted_gidouilles || 0;
		const wantedTemplates = listing.wanted_card_template_ids || [];

		// Case 1: Sell listing — wants gidouilles only
		if (wantedTemplates.length === 0 && wantedGidouilles > 0) {
			return marketplaceStore.userGidouilles >= wantedGidouilles;
		}

		// Case 2: Buy listing — wants specific cards (+ optionally gidouilles)
		if (wantedTemplates.length > 0) {
			// Check gidouilles
			if (wantedGidouilles > 0 && marketplaceStore.userGidouilles < wantedGidouilles) {
				return false;
			}
			// Check that user owns unlocked cards matching each wanted template
			const availableCards = marketplaceStore.myVipCards.filter((c) => !c.is_locked);
			const remainingTemplates = [...wantedTemplates];
			for (const templateId of remainingTemplates) {
				const match = availableCards.find(
					(c) => c.template_id === templateId && !remainingTemplates.includes(c.id)
				);
				if (!match) return false;
			}
			return true;
		}

		return false;
	});

	// Find card instance IDs that match the wanted templates (for direct accept)
	function findMatchingCardIds(): string[] {
		const wantedTemplates = listing.wanted_card_template_ids || [];
		const availableCards = marketplaceStore.myVipCards.filter((c) => !c.is_locked);
		const usedIds = new Set<string>();
		const matchedIds: string[] = [];

		for (const templateId of wantedTemplates) {
			const match = availableCards.find((c) => c.template_id === templateId && !usedIds.has(c.id));
			if (match) {
				matchedIds.push(match.id);
				usedIds.add(match.id);
			}
		}
		return matchedIds;
	}

	let isAccepting = $state(false);

	async function acceptDirectly() {
		if (isAccepting) return;
		isAccepting = true;
		try {
			const wantedTemplates = listing.wanted_card_template_ids || [];
			const wantedGidouilles = listing.wanted_gidouilles || 0;

			const proposalData: { offered_card_ids?: string[]; offered_gidouilles?: number } = {};

			if (wantedTemplates.length > 0) {
				proposalData.offered_card_ids = findMatchingCardIds();
			}
			if (wantedGidouilles > 0) {
				proposalData.offered_gidouilles = wantedGidouilles;
			}

			const success = await marketplaceStore.submitProposal(listing.id, proposalData);
			if (success) {
				handleClose();
			}
		} finally {
			isAccepting = false;
		}
	}

	// Close handler
	function handleClose() {
		open = false;
		onclose();
	}

	// Group offered cards by template
	let offeredCardsGrouped = $derived.by(() => {
		if (!listing.offered_cards?.length) return [];
		const groups = new Map<
			string,
			{
				card: {
					id: string;
					name: string;
					description: string;
					imagePath: string | null;
					rarity: string;
				};
				count: number;
			}
		>();
		for (const card of listing.offered_cards) {
			const existing = groups.get(card.template_id);
			if (existing) {
				existing.count++;
			} else {
				groups.set(card.template_id, {
					card: {
						id: card.template_id,
						name: card.template.name,
						description: card.template.description,
						imagePath: card.template.image_path,
						rarity: card.template.rarity
					},
					count: 1
				});
			}
		}
		return Array.from(groups.values());
	});

	// Wanted templates (already unique)
	let wantedCardsGrouped = $derived.by(() => {
		if (!listing.wanted_templates?.length) return [];
		return listing.wanted_templates.map((template) => ({
			card: {
				id: template.id,
				name: template.name,
				description: template.description,
				imagePath: template.image_path,
				rarity: template.rarity
			},
			count: 1
		}));
	});
</script>

<Dialog.Root bind:open onOpenChange={(v) => !v && handleClose()}>
	<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>
				{listing.listing_type === 'sell' ? 'Vente' : 'Achat'}
			</Dialog.Title>
			{#if listing.description}
				<Dialog.Description>
					{listing.description}
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Offer/Demand Details with Cards -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Offered Section -->
				<div class="space-y-3 rounded-lg border p-4">
					<h4 class="text-sm font-semibold">Offre</h4>

					{#if offeredCardsGrouped.length > 0}
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
							{#each offeredCardsGrouped as group (group.card.id)}
								<VipCard card={group.card} size="sm" clickable={false} count={group.count} />
							{/each}
						</div>
					{/if}

					{#if listing.offered_gidouilles && listing.offered_gidouilles > 0}
						<div class="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/30">
							<span class="font-semibold">{listing.offered_gidouilles.toLocaleString('fr-FR')}</span
							>
							<img src={gidouilleImage} alt="Gidouille" class="h-5 w-5" />
						</div>
					{/if}

					{#if !offeredCardsGrouped.length && !listing.offered_gidouilles}
						<p class="text-muted-foreground italic">Aucune offre</p>
					{/if}
				</div>

				<!-- Wanted Section -->
				<div class="space-y-3 rounded-lg border p-4">
					<h4 class="text-sm font-semibold">Demande</h4>

					{#if wantedCardsGrouped.length > 0}
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
							{#each wantedCardsGrouped as group (group.card.id)}
								<VipCard card={group.card} size="sm" clickable={false} count={group.count} />
							{/each}
						</div>
					{/if}

					{#if listing.wanted_gidouilles && listing.wanted_gidouilles > 0}
						<div class="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/30">
							<span class="font-semibold">{listing.wanted_gidouilles.toLocaleString('fr-FR')}</span>
							<img src={gidouilleImage} alt="Gidouille" class="h-5 w-5" />
						</div>
					{/if}

					{#if !wantedCardsGrouped.length && !listing.wanted_gidouilles}
						<p class="text-muted-foreground italic">Aucune demande spécifique</p>
					{/if}
				</div>
			</div>
		</div>

		<Dialog.Footer class="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
			{#if !isOwner && myProposal}
				<div class="flex-1 text-sm">
					{#if myProposal.status === 'pending'}
						<Badge variant="secondary">Proposition en attente</Badge>
					{:else if myProposal.status === 'accepted'}
						<Badge variant="default">Proposition acceptée</Badge>
					{:else if myProposal.status === 'rejected'}
						<Badge variant="destructive">Proposition refusée</Badge>
						{#if myProposal.response_message}
							<span class="ml-2 text-xs text-muted-foreground">{myProposal.response_message}</span>
						{/if}
					{/if}
				</div>
			{/if}
			{#if !isOwner}
				{#if myProposal?.status === 'pending'}
					<Button disabled>Proposition envoyée</Button>
				{:else}
					{#if canAcceptDirectly}
						<Button onclick={acceptDirectly} disabled={isAccepting} class="gap-1.5">
							<img src={gidouilleImage} alt="Gidouille" class="h-4 w-4" />
							{#if isAccepting}
								Envoi...
							{:else if (listing.wanted_card_template_ids?.length ?? 0) > 0 && (listing.wanted_gidouilles ?? 0) > 0}
								Accepter (carte + {listing.wanted_gidouilles?.toLocaleString('fr-FR')} gidouilles)
							{:else if (listing.wanted_card_template_ids?.length ?? 0) > 0}
								Accepter l'échange
							{:else}
								Accepter pour {listing.wanted_gidouilles?.toLocaleString('fr-FR')} gidouilles
							{/if}
						</Button>
					{/if}
					<Button variant="outline" onclick={() => (showProposalModal = true)}>
						{myProposal?.status === 'rejected' ? 'Reproposer' : 'Autre proposition'}
					</Button>
				{/if}
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Proposal Modal -->
{#if !isOwner}
	<CreateProposalModal {listing} bind:open={showProposalModal} onSuccess={handleClose} />
{/if}
