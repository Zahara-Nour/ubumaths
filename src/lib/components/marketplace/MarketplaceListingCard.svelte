<script lang="ts">
	import type { MarketplaceListing } from '$lib/types/marketplace';
	import type { VipCard as VipCardType } from '$lib/types/vip-card';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { Clock, Eye, MessageSquare } from 'lucide-svelte';
	import gidouilleImage from '$lib/assets/images/gidouille.png';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import VipCard from '$lib/components/VipCard.svelte';
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';

	// Props
	let { listing, onclick } = $props<{
		listing: MarketplaceListing;
		onclick?: () => void;
	}>();

	// Check if user has a proposal on this listing
	let myProposal = $derived(marketplaceStore.myProposals.find((p) => p.listing_id === listing.id));

	// Calculate time until expiry
	let expiryText = $derived.by(() => {
		if (!listing.expires_at) return '';

		const expiryDate = new Date(listing.expires_at);
		const now = new Date();

		if (expiryDate < now) {
			return 'Expiré';
		}

		return formatDistanceToNow(expiryDate, {
			addSuffix: false,
			locale: fr
		});
	});

	// Check if expiring soon (less than 24 hours)
	let isExpiringSoon = $derived.by(() => {
		if (!listing.expires_at) return false;

		const expiryDate = new Date(listing.expires_at);
		const now = new Date();
		const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

		return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
	});

	// Get listing type badge variant
	let typeVariant = $derived<'default' | 'secondary'>(
		listing.listing_type === 'sell' ? 'default' : 'secondary'
	);

	// Group offered cards by template for display
	let offeredCardsGrouped = $derived.by(() => {
		if (!listing.offered_cards?.length) return [];
		const groups = new Map<string, { card: VipCardType; count: number }>();
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
						imagePath: card.template.image_path ?? undefined,
						rarity: card.template.rarity as VipCardType['rarity']
					},
					count: 1
				});
			}
		}
		return Array.from(groups.values());
	});

	// Group wanted templates for display (already unique by template)
	let wantedCardsGrouped = $derived.by(() => {
		if (!listing.wanted_templates?.length) return [];
		return listing.wanted_templates.map((template) => ({
			card: {
				id: template.id,
				name: template.name,
				description: template.description,
				imagePath: template.image_path ?? undefined,
				rarity: template.rarity as VipCardType['rarity']
			} as VipCardType,
			count: 1
		}));
	});
</script>

<Card.Root
	role="button"
	tabindex={0}
	{onclick}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onclick?.()}
	aria-label={`Annonce ${listing.listing_type === 'sell' ? 'vente' : 'achat'} par ${listing.creator?.username || 'Anonyme'}`}
	class="cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg focus:ring-2 focus:ring-primary focus:outline-none"
>
	<Card.Header class="pb-3">
		<div class="flex items-start justify-between gap-2">
			<div class="flex gap-1">
				<Badge variant={typeVariant} class="text-xs">
					{listing.listing_type === 'sell' ? 'Vente' : 'Achat'}
				</Badge>
				{#if myProposal}
					<Badge
						variant={myProposal.status === 'pending'
							? 'secondary'
							: myProposal.status === 'accepted'
								? 'default'
								: 'destructive'}
						class="text-xs"
					>
						{myProposal.status === 'pending'
							? 'Proposé'
							: myProposal.status === 'accepted'
								? 'Accepté'
								: 'Refusé'}
					</Badge>
				{/if}
			</div>
			{#if isExpiringSoon}
				<Badge variant="destructive" class="text-xs">Expire bientôt</Badge>
			{/if}
		</div>

		{#if listing.description}
			<Card.Description class="line-clamp-2 text-xs">
				{listing.description}
			</Card.Description>
		{/if}
	</Card.Header>

	<Card.Content class="space-y-3">
		<!-- Creator Info -->
		<div class="flex items-center gap-2">
			<UserAvatar
				avatar_url={listing.creator?.avatar_url}
				role="student"
				firstname={listing.creator?.username}
				class="h-6 w-6"
			/>
			<span class="truncate text-xs text-muted-foreground">
				{listing.creator?.username || 'Anonyme'}
			</span>
		</div>

		<!-- Offer/Demand with VipCard -->
		<div class="space-y-3">
			<!-- Offered Cards -->
			<div class="space-y-1">
				<span class="text-xs font-medium">Offre:</span>
				<div class="flex items-center gap-2">
					{#if offeredCardsGrouped.length > 0}
						{#each offeredCardsGrouped as group (group.card.id)}
							<VipCard card={group.card} size="sm" clickable={false} count={group.count} />
						{/each}
					{/if}
					{#if listing.offered_gidouilles && listing.offered_gidouilles > 0}
						<div
							class="flex items-center gap-0.5 rounded bg-yellow-50 px-1.5 py-0.5 text-xs dark:bg-yellow-950/30"
						>
							<span class="font-medium">{listing.offered_gidouilles.toLocaleString('fr-FR')}</span>
							<img src={gidouilleImage} alt="Gidouille" class="h-3 w-3" />
						</div>
					{/if}
					{#if !offeredCardsGrouped.length && !listing.offered_gidouilles}
						<span class="text-xs text-muted-foreground italic">Rien</span>
					{/if}
				</div>
			</div>
			<!-- Wanted Cards -->
			<div class="space-y-1">
				<span class="text-xs font-medium">Demande:</span>
				<div class="flex items-center gap-2">
					{#if wantedCardsGrouped.length > 0}
						{#each wantedCardsGrouped as group (group.card.id)}
							<VipCard card={group.card} size="sm" clickable={false} count={group.count} />
						{/each}
					{/if}
					{#if listing.wanted_gidouilles && listing.wanted_gidouilles > 0}
						<div
							class="flex items-center gap-0.5 rounded bg-yellow-50 px-1.5 py-0.5 text-xs dark:bg-yellow-950/30"
						>
							<span class="font-medium">{listing.wanted_gidouilles.toLocaleString('fr-FR')}</span>
							<img src={gidouilleImage} alt="Gidouille" class="h-3 w-3" />
						</div>
					{/if}
					{#if !wantedCardsGrouped.length && !listing.wanted_gidouilles}
						<span class="text-xs text-muted-foreground italic">Rien</span>
					{/if}
				</div>
			</div>
		</div>
	</Card.Content>

	<Card.Footer class="pt-3 pb-3">
		<div class="flex w-full items-center justify-between text-xs text-muted-foreground">
			<div class="flex items-center gap-3">
				{#if listing.proposal_count > 0}
					<span class="flex items-center gap-1">
						<MessageSquare class="h-3 w-3" />
						{listing.proposal_count}
					</span>
				{/if}
				{#if listing.view_count > 0}
					<span class="flex items-center gap-1">
						<Eye class="h-3 w-3" />
						{listing.view_count}
					</span>
				{/if}
			</div>

			<span class="flex items-center gap-1">
				<Clock class="h-3 w-3" />
				{expiryText}
			</span>
		</div>
	</Card.Footer>
</Card.Root>
