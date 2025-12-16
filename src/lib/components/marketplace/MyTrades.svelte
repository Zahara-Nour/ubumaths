<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import type { MarketplaceTrade } from '$lib/types/marketplace';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import SkeletonList from '$lib/components/skeleton/SkeletonList.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import {
		ArrowLeftRight,
		Clock,
		CheckCircle,
		XCircle,
		MessageSquare,
		RefreshCw,
		AlertCircle
	} from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import TradeNegotiationModal from './TradeNegotiationModal.svelte';
	import { page } from '$app/stores';

	// Get current user ID
	let userId = $derived($page.data.user?.id);

	// State
	let selectedTab = $state<'active' | 'completed'>('active');
	let selectedTrade = $state<MarketplaceTrade | null>(null);

	// Filter trades by status
	let activeTrades = $derived(
		marketplaceStore.activeTrades.filter((t) => t.status === 'negotiating')
	);

	let completedTrades = $derived(
		marketplaceStore.activeTrades.filter(
			(t) => t.status === 'completed' || t.status === 'cancelled'
		)
	);

	// Check if it's my turn to respond
	function isMyTurn(trade: MarketplaceTrade): boolean {
		return trade.last_offer_by !== null && trade.last_offer_by !== userId;
	}

	// Get trade partner info
	function getTradePartner(trade: MarketplaceTrade) {
		if (trade.initiator_id === userId) {
			return trade.partner;
		} else {
			return trade.initiator;
		}
	}

	// Format time
	function formatTime(dateString: string) {
		return formatDistanceToNow(new Date(dateString), {
			addSuffix: true,
			locale: fr
		});
	}

	// Open trade negotiation
	function openTradeNegotiation(trade: MarketplaceTrade) {
		selectedTrade = trade;
		marketplaceStore.selectTrade(trade);
	}

	// Close trade negotiation
	function closeTradeNegotiation() {
		selectedTrade = null;
		marketplaceStore.selectTrade(null);
	}

	// Cancel trade
	async function cancelTrade(tradeId: string) {
		if (!confirm('Êtes-vous sûr de vouloir annuler cet échange ?')) return;

		await marketplaceStore.cancelTrade(tradeId);
	}

	// Refresh trades
	function refresh() {
		marketplaceStore.fetchMyTrades();
	}

	// Type for current offer structure
	interface CurrentOffer {
		from_initiator?: { cards?: string[]; gidouilles?: number };
		from_partner?: { cards?: string[]; gidouilles?: number };
	}

	// Get offer summary
	function getOfferSummary(trade: MarketplaceTrade) {
		const isInitiator = trade.initiator_id === userId;
		const offer = trade.current_offer as CurrentOffer | null;
		const myOffer = isInitiator ? offer?.from_initiator : offer?.from_partner;
		const theirOffer = isInitiator ? offer?.from_partner : offer?.from_initiator;

		const myParts = [];
		const theirParts = [];

		if (myOffer) {
			if (myOffer.cards?.length) {
				myParts.push(`${myOffer.cards.length} carte${myOffer.cards.length > 1 ? 's' : ''}`);
			}
			if (myOffer.gidouilles && myOffer.gidouilles > 0) {
				myParts.push(`${myOffer.gidouilles} gidouilles`);
			}
		}

		if (theirOffer) {
			if (theirOffer.cards?.length) {
				theirParts.push(
					`${theirOffer.cards.length} carte${theirOffer.cards.length > 1 ? 's' : ''}`
				);
			}
			if (theirOffer.gidouilles && theirOffer.gidouilles > 0) {
				theirParts.push(`${theirOffer.gidouilles} gidouilles`);
			}
		}

		return {
			my: myParts.length > 0 ? myParts.join(' + ') : 'Rien',
			their: theirParts.length > 0 ? theirParts.join(' + ') : 'Rien'
		};
	}
</script>

<div class="space-y-4">
	<!-- Header with stats -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div class="text-sm text-muted-foreground">
				Total: {marketplaceStore.activeTrades.length} échange(s)
			</div>
			{#if marketplaceStore.pendingActions.trades > 0}
				<Badge variant="destructive">
					{marketplaceStore.pendingActions.trades} en attente de votre réponse
				</Badge>
			{/if}
		</div>
		<Button variant="outline" size="icon" onclick={refresh} aria-label="Actualiser les échanges">
			<RefreshCw class="h-4 w-4" />
		</Button>
	</div>

	<!-- Tabs for trade status -->
	<Tabs.Root bind:value={selectedTab}>
		<Tabs.List>
			<Tabs.Trigger value="active">
				Négociations ({activeTrades.length})
			</Tabs.Trigger>
			<Tabs.Trigger value="completed">
				Terminés ({completedTrades.length})
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Active Trades -->
		<Tabs.Content value="active" class="mt-4 space-y-4">
			{#if marketplaceStore.isLoading.trades}
				<SkeletonList itemCount={3} />
			{:else if marketplaceStore.errors.trades}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<AlertCircle class="mx-auto mb-4 h-12 w-12 text-destructive" />
						<h3 class="mb-2 font-semibold">Erreur de chargement</h3>
						<p class="mb-4 text-muted-foreground">Impossible de charger vos échanges</p>
						<Button onclick={refresh}>Réessayer</Button>
					</Card.Content>
				</Card.Root>
			{:else if activeTrades.length === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<ArrowLeftRight class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 font-semibold">Aucun échange actif</h3>
						<p class="text-muted-foreground">
							Commencez un échange avec un ami ou répondez à une annonce
						</p>
					</Card.Content>
				</Card.Root>
			{:else}
				{#each activeTrades as trade (trade.id)}
					{@const partner = getTradePartner(trade)}
					{@const myTurn = isMyTurn(trade)}
					{@const offerSummary = getOfferSummary(trade)}

					<Card.Root class={myTurn ? 'ring-2 ring-primary' : ''}>
						<Card.Header>
							<div class="flex items-start justify-between">
								<div class="flex items-center gap-3">
									<Avatar.Root class="h-10 w-10">
										<Avatar.Image
											src={partner?.avatar_url || '/default-avatar.jpg'}
											alt={partner?.username}
										/>
										<Avatar.Fallback>
											{partner?.username?.charAt(0).toUpperCase() || '?'}
										</Avatar.Fallback>
									</Avatar.Root>

									<div>
										<Card.Title class="text-lg">
											Échange avec {partner?.username || 'Anonyme'}
										</Card.Title>
										<Card.Description>
											{trade.trade_type === 'friend' ? 'Échange direct' : 'Via marketplace'}
										</Card.Description>
									</div>
								</div>

								<div class="flex flex-col items-end gap-2">
									{#if myTurn}
										<Badge variant="destructive">Votre tour</Badge>
									{:else if trade.last_offer_by === userId}
										<Badge variant="secondary">En attente</Badge>
									{:else}
										<Badge variant="outline">Nouvelle offre</Badge>
									{/if}
								</div>
							</div>

							<div class="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
								<span class="flex items-center gap-1">
									<Clock class="h-3 w-3" />
									Démarré {formatTime(trade.created_at)}
								</span>
								{#if trade.updated_at !== trade.created_at}
									<span class="flex items-center gap-1">
										<RefreshCw class="h-3 w-3" />
										Mis à jour {formatTime(trade.updated_at)}
									</span>
								{/if}
							</div>
						</Card.Header>

						<Card.Content>
							<div class="space-y-3">
								<h4 class="text-sm font-medium">Offre actuelle</h4>
								<div class="grid grid-cols-2 gap-4">
									<div class="space-y-1">
										<div class="text-xs text-muted-foreground">Vous offrez</div>
										<div class="font-medium">{offerSummary.my}</div>
									</div>
									<div class="space-y-1">
										<div class="text-xs text-muted-foreground">{partner?.username} offre</div>
										<div class="font-medium">{offerSummary.their}</div>
									</div>
								</div>

								{#if trade.last_offer_by}
									<div class="text-xs text-muted-foreground">
										Dernière offre par {trade.last_offer_by === userId ? 'vous' : partner?.username}
									</div>
								{/if}
							</div>
						</Card.Content>

						<Card.Footer class="flex justify-between">
							<Button
								variant={myTurn ? 'default' : 'outline'}
								size="sm"
								onclick={() => openTradeNegotiation(trade)}
							>
								<MessageSquare class="mr-2 h-4 w-4" />
								{myTurn ? 'Répondre' : 'Voir la négociation'}
							</Button>
							<Button variant="ghost" size="sm" onclick={() => cancelTrade(trade.id)}>
								<XCircle class="mr-2 h-4 w-4" />
								Annuler
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			{/if}
		</Tabs.Content>

		<!-- Completed Trades -->
		<Tabs.Content value="completed" class="mt-4 space-y-4">
			{#if completedTrades.length === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<CheckCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 font-semibold">Aucun échange terminé</h3>
						<p class="text-muted-foreground">Les échanges terminés apparaîtront ici</p>
					</Card.Content>
				</Card.Root>
			{:else}
				{#each completedTrades as trade (trade.id)}
					{@const partner = getTradePartner(trade)}

					<Card.Root>
						<Card.Content class="py-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<Avatar.Root class="h-8 w-8">
										<Avatar.Image
											src={partner?.avatar_url || '/default-avatar.jpg'}
											alt={partner?.username}
										/>
										<Avatar.Fallback>
											{partner?.username?.charAt(0).toUpperCase() || '?'}
										</Avatar.Fallback>
									</Avatar.Root>

									<div>
										<h4 class="font-medium">
											Échange avec {partner?.username || 'Anonyme'}
										</h4>
										<p class="text-sm text-muted-foreground">
											{trade.status === 'completed' ? 'Complété' : 'Annulé'}
											{formatTime(trade.updated_at)}
										</p>
									</div>
								</div>

								<Badge variant={trade.status === 'completed' ? 'success' : 'outline'}>
									{#if trade.status === 'completed'}
										<CheckCircle class="mr-1 h-3 w-3" />
										Complété
									{:else}
										<XCircle class="mr-1 h-3 w-3" />
										Annulé
									{/if}
								</Badge>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Trade Negotiation Modal -->
{#if selectedTrade}
	{@const isOpen = !!selectedTrade}
	<TradeNegotiationModal trade={selectedTrade} open={isOpen} onClose={closeTradeNegotiation} />
{/if}
