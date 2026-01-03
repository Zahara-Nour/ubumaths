<script lang="ts">
	import type { MarketplaceListing } from '$lib/types/marketplace';
	import type { VipCard as VipCardType } from '$lib/types/vip-card';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Clock, Eye, MessageSquare, Coins } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import VipCard from '$lib/components/VipCard.svelte';

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

	// Convert offered cards to VipCard format for display (max 3 thumbnails)
	let offeredCardsForDisplay = $derived.by((): VipCardType[] => {
		if (!listing.offered_cards?.length) return [];
		return listing.offered_cards.slice(0, 3).map((card) => ({
			id: card.template_id,
			name: card.template.name,
			description: card.template.description,
			imagePath: card.template.image_path ?? undefined,
			rarity: card.template.rarity as VipCardType['rarity']
		}));
	});

	// Convert wanted templates to VipCard format for display (max 3 thumbnails)
	let wantedCardsForDisplay = $derived.by((): VipCardType[] => {
		if (!listing.wanted_templates?.length) return [];
		return listing.wanted_templates.slice(0, 3).map((template) => ({
			id: template.id,
			name: template.name,
			description: template.description,
			imagePath: template.image_path ?? undefined,
			rarity: template.rarity as VipCardType['rarity']
		}));
	});

	// Count extra cards not shown
	let extraOfferedCount = $derived(Math.max(0, (listing.offered_cards?.length || 0) - 3));
	let extraWantedCount = $derived(Math.max(0, (listing.wanted_templates?.length || 0) - 3));
</script>

{#if viewMode === 'grid'}
	<!-- Grid View Card -->
	<Card.Root
		role="button"
		tabindex={0}
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
				{#if isExpiringSoon}
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

			<!-- Offer/Demand with VipCard -->
			<div class="space-y-3">
				<!-- Offered Cards -->
				<div class="space-y-1">
					<span class="text-xs font-medium">Offre:</span>
					<div class="flex items-center gap-2">
						{#if offeredCardsForDisplay.length > 0}
							{#each offeredCardsForDisplay as card (card.id)}
								<VipCard {card} size="sm" clickable={false} />
							{/each}
							{#if extraOfferedCount > 0}
								<span class="text-xs text-muted-foreground">+{extraOfferedCount}</span>
							{/if}
						{/if}
						{#if listing.offered_gidouilles && listing.offered_gidouilles > 0}
							<div
								class="flex items-center gap-0.5 rounded bg-yellow-50 px-1.5 py-0.5 text-xs dark:bg-yellow-950/30"
							>
								<Coins class="h-3 w-3 text-yellow-500" />
								<span class="font-medium">{listing.offered_gidouilles}</span>
							</div>
						{/if}
						{#if !offeredCardsForDisplay.length && !listing.offered_gidouilles}
							<span class="text-xs text-muted-foreground italic">Rien</span>
						{/if}
					</div>
				</div>
				<!-- Wanted Cards -->
				<div class="space-y-1">
					<span class="text-xs font-medium">Demande:</span>
					<div class="flex items-center gap-2">
						{#if wantedCardsForDisplay.length > 0}
							{#each wantedCardsForDisplay as card (card.id)}
								<VipCard {card} size="sm" clickable={false} />
							{/each}
							{#if extraWantedCount > 0}
								<span class="text-xs text-muted-foreground">+{extraWantedCount}</span>
							{/if}
						{/if}
						{#if listing.wanted_gidouilles && listing.wanted_gidouilles > 0}
							<div
								class="flex items-center gap-0.5 rounded bg-yellow-50 px-1.5 py-0.5 text-xs dark:bg-yellow-950/30"
							>
								<Coins class="h-3 w-3 text-yellow-500" />
								<span class="font-medium">{listing.wanted_gidouilles}</span>
							</div>
						{/if}
						{#if !wantedCardsForDisplay.length && !listing.wanted_gidouilles}
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
{:else}
	<!-- List View Card -->
	<Card.Root
		role="button"
		tabindex={0}
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
							{#if isExpiringSoon}
								<Badge variant="destructive" class="text-xs">Expire bientôt</Badge>
							{/if}
						</div>
					</div>

					{#if listing.description}
						<p class="mb-2 line-clamp-1 text-sm text-muted-foreground">
							{listing.description}
						</p>
					{/if}

					<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
						<span>Par {listing.creator?.username || 'Anonyme'}</span>
						<!-- Offer thumbnails -->
						<div class="flex items-center gap-1.5">
							<span class="font-medium text-foreground">Offre:</span>
							{#if offeredCardsForDisplay.length > 0}
								{#each offeredCardsForDisplay as card (card.id)}
									<VipCard {card} size="sm" clickable={false} />
								{/each}
								{#if extraOfferedCount > 0}
									<span>+{extraOfferedCount}</span>
								{/if}
							{/if}
							{#if listing.offered_gidouilles && listing.offered_gidouilles > 0}
								<span
									class="flex items-center gap-0.5 rounded bg-yellow-50 px-1 py-0.5 dark:bg-yellow-950/30"
								>
									<Coins class="h-3 w-3 text-yellow-500" />
									{listing.offered_gidouilles}
								</span>
							{/if}
							{#if !offeredCardsForDisplay.length && !listing.offered_gidouilles}
								<span class="italic">Rien</span>
							{/if}
						</div>
						<!-- Demand thumbnails -->
						<div class="flex items-center gap-1.5">
							<span class="font-medium text-foreground">Demande:</span>
							{#if wantedCardsForDisplay.length > 0}
								{#each wantedCardsForDisplay as card (card.id)}
									<VipCard {card} size="sm" clickable={false} />
								{/each}
								{#if extraWantedCount > 0}
									<span>+{extraWantedCount}</span>
								{/if}
							{/if}
							{#if listing.wanted_gidouilles && listing.wanted_gidouilles > 0}
								<span
									class="flex items-center gap-0.5 rounded bg-yellow-50 px-1 py-0.5 dark:bg-yellow-950/30"
								>
									<Coins class="h-3 w-3 text-yellow-500" />
									{listing.wanted_gidouilles}
								</span>
							{/if}
							{#if !wantedCardsForDisplay.length && !listing.wanted_gidouilles}
								<span class="italic">Rien</span>
							{/if}
						</div>

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
								{expiryText}
							</span>
						</div>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
{/if}
