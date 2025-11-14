<script lang="ts">
	import type { MarketplaceListing } from '$lib/types/marketplace';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Clock, Eye, MessageSquare, Coins } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	// Props
	let {
		listing,
		viewMode = 'grid',
		onclick
	} = $props<{
		listing: MarketplaceListing;
		viewMode?: 'grid' | 'list';
		onclick?: () => void;
	}>();

	// Calculate time until expiry
	let expiryText = $derived(() => {
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
	let isExpiringSoon = $derived(() => {
		if (!listing.expires_at) return false;

		const expiryDate = new Date(listing.expires_at);
		const now = new Date();
		const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

		return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
	});

	// Get listing type badge variant
	let typeVariant = $derived(listing.listing_type === 'sell' ? 'default' : 'secondary');

	// Get status badge variant
	let statusVariant = $derived(() => {
		switch (listing.status) {
			case 'active':
				return 'default';
			case 'expired':
				return 'destructive';
			case 'completed':
				return 'success';
			case 'cancelled':
				return 'outline';
			default:
				return 'outline';
		}
	});

	// Format offer/demand text
	let offerText = $derived(() => {
		const parts = [];

		if (listing.offered_card_ids?.length) {
			parts.push(
				`${listing.offered_card_ids.length} carte${listing.offered_card_ids.length > 1 ? 's' : ''}`
			);
		}

		if (listing.offered_gidouilles && listing.offered_gidouilles > 0) {
			parts.push(`${listing.offered_gidouilles} gidouilles`);
		}

		return parts.length > 0 ? parts.join(' + ') : 'Rien';
	});

	let demandText = $derived(() => {
		const parts = [];

		if (listing.wanted_card_template_ids?.length) {
			parts.push(
				`${listing.wanted_card_template_ids.length} type${listing.wanted_card_template_ids.length > 1 ? 's' : ''} de carte`
			);
		}

		if (listing.wanted_gidouilles && listing.wanted_gidouilles > 0) {
			parts.push(`${listing.wanted_gidouilles} gidouilles`);
		}

		return parts.length > 0 ? parts.join(' + ') : 'Rien';
	});
</script>

{#if viewMode === 'grid'}
	<!-- Grid View Card -->
	<Card.Root
		role="button"
		tabindex="0"
		{onclick}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onclick?.()}
		aria-label={`Annonce: ${listing.title} par ${listing.creator?.username || 'Anonyme'}`}
		class="cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg focus:ring-2 focus:ring-primary focus:outline-none"
	>
		<Card.Header class="pb-3">
			<div class="flex items-start justify-between gap-2">
				<Badge variant={typeVariant} class="text-xs">
					{listing.listing_type === 'sell' ? 'Vente' : 'Achat'}
				</Badge>
				{#if isExpiringSoon()}
					<Badge variant="destructive" class="text-xs">Expire bientôt</Badge>
				{/if}
			</div>

			<Card.Title class="line-clamp-1 text-base">
				{listing.title}
			</Card.Title>

			{#if listing.description}
				<Card.Description class="line-clamp-2 text-xs">
					{listing.description}
				</Card.Description>
			{/if}
		</Card.Header>

		<Card.Content class="space-y-3">
			<!-- Creator Info -->
			<div class="flex items-center gap-2">
				<Avatar.Root class="h-6 w-6">
					<Avatar.Image
						src={listing.creator?.avatar_url || '/default-avatar.jpg'}
						alt={listing.creator?.username}
					/>
					<Avatar.Fallback>
						{listing.creator?.username?.charAt(0).toUpperCase() || '?'}
					</Avatar.Fallback>
				</Avatar.Root>
				<span class="truncate text-xs text-muted-foreground">
					{listing.creator?.username || 'Anonyme'}
				</span>
			</div>

			<!-- Offer/Demand Summary -->
			<div class="space-y-2">
				<div class="flex items-start gap-2">
					<span class="min-w-[50px] text-xs font-medium">Offre:</span>
					<span class="text-xs text-muted-foreground">{offerText()}</span>
				</div>
				<div class="flex items-start gap-2">
					<span class="min-w-[50px] text-xs font-medium">Demande:</span>
					<span class="text-xs text-muted-foreground">{demandText()}</span>
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
					{expiryText()}
				</span>
			</div>
		</Card.Footer>
	</Card.Root>
{:else}
	<!-- List View Card -->
	<Card.Root
		role="button"
		tabindex="0"
		{onclick}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onclick?.()}
		aria-label={`Annonce: ${listing.title} par ${listing.creator?.username || 'Anonyme'}`}
		class="cursor-pointer transition-shadow hover:shadow-md focus:ring-2 focus:ring-primary focus:outline-none"
	>
		<Card.Content class="p-4">
			<div class="flex items-center gap-4">
				<!-- Avatar -->
				<Avatar.Root class="h-10 w-10 shrink-0">
					<Avatar.Image
						src={listing.creator?.avatar_url || '/default-avatar.jpg'}
						alt={listing.creator?.username}
					/>
					<Avatar.Fallback>
						{listing.creator?.username?.charAt(0).toUpperCase() || '?'}
					</Avatar.Fallback>
				</Avatar.Root>

				<!-- Main Content -->
				<div class="min-w-0 flex-1">
					<div class="mb-1 flex items-start justify-between gap-2">
						<h3 class="truncate font-medium">{listing.title}</h3>
						<div class="flex shrink-0 items-center gap-2">
							<Badge variant={typeVariant} class="text-xs">
								{listing.listing_type === 'sell' ? 'Vente' : 'Achat'}
							</Badge>
							{#if isExpiringSoon()}
								<Badge variant="destructive" class="text-xs">Expire bientôt</Badge>
							{/if}
						</div>
					</div>

					{#if listing.description}
						<p class="mb-2 line-clamp-1 text-sm text-muted-foreground">
							{listing.description}
						</p>
					{/if}

					<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
						<span>Par {listing.creator?.username || 'Anonyme'}</span>
						<span>Offre: {offerText()}</span>
						<span>Demande: {demandText()}</span>

						<div class="ml-auto flex items-center gap-3">
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
							<span class="flex items-center gap-1">
								<Clock class="h-3 w-3" />
								{expiryText()}
							</span>
						</div>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
{/if}
