<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import type { MarketplaceProposal, MarketplaceTrade } from '$lib/types/marketplace';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Send,
		ArrowLeftRight,
		Clock,
		CheckCircle,
		XCircle,
		Plus,
		Loader2,
		MessageSquare
	} from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { goto } from '$app/navigation';
	import TradeNegotiationModal from './TradeNegotiationModal.svelte';
	import StartFriendTradeModal from './StartFriendTradeModal.svelte';
	import { page } from '$app/stores';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	// Get supabase from page data (needed for StartFriendTradeModal)
	let supabase = $derived($page.data.supabase);

	// State
	let selectedTrade = $state<MarketplaceTrade | null>(null);
	let showStartTradeModal = $state(false);

	// Unified activity item type
	type ActivityItem = {
		id: string;
		type: 'proposal' | 'trade';
		date: string;
		requiresAction: boolean;
		data: MarketplaceProposal | MarketplaceTrade;
	};

	// Merge proposals and trades into unified feed
	let activityItems = $derived.by(() => {
		const items: ActivityItem[] = [];

		// Add proposals
		for (const proposal of marketplaceStore.myProposals) {
			items.push({
				id: `proposal-${proposal.id}`,
				type: 'proposal',
				date: proposal.created_at,
				requiresAction: proposal.status !== 'pending' && proposal.status !== 'withdrawn',
				data: proposal
			});
		}

		// Add trades
		for (const trade of marketplaceStore.activeTrades) {
			const isMyTurn = trade.last_offer_by !== null && trade.last_offer_by !== userId;
			items.push({
				id: `trade-${trade.id}`,
				type: 'trade',
				date: trade.updated_at,
				requiresAction: trade.status === 'negotiating' && isMyTurn,
				data: trade
			});
		}

		// Sort: requiresAction first, then by date descending
		items.sort((a, b) => {
			if (a.requiresAction !== b.requiresAction) {
				return a.requiresAction ? -1 : 1;
			}
			return new Date(b.date).getTime() - new Date(a.date).getTime();
		});

		return items;
	});

	// Loading state
	let isLoading = $derived(
		marketplaceStore.isLoading.proposals && marketplaceStore.isLoading.trades
	);

	// Format time
	function formatTime(dateString: string) {
		return formatDistanceToNow(new Date(dateString), {
			addSuffix: true,
			locale: fr
		});
	}

	// Get trade partner
	function getTradePartner(trade: MarketplaceTrade) {
		if (trade.initiator_id === userId) {
			return trade.partner;
		}
		return trade.initiator;
	}

	// Handle trade click
	function handleTradeClick(trade: MarketplaceTrade) {
		if (trade.trade_type === 'friend') {
			goto(`/dashboard/student/marketplace/trade/${trade.id}`);
			return;
		}
		selectedTrade = trade;
		marketplaceStore.selectTrade(trade);
	}

	// Close trade negotiation
	function closeTradeNegotiation() {
		selectedTrade = null;
		marketplaceStore.selectTrade(null);
	}

	// Handle trade started
	function handleTradeStarted(tradeId: string) {
		showStartTradeModal = false;
		goto(`/dashboard/student/marketplace/trade/${tradeId}`);
	}

	// Proposal status helpers
	function proposalStatusLabel(status: string) {
		switch (status) {
			case 'pending':
				return 'En attente';
			case 'accepted':
				return 'Acceptée';
			case 'rejected':
				return 'Refusée';
			case 'withdrawn':
				return 'Retirée';
			default:
				return status;
		}
	}

	function proposalStatusVariant(
		status: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'pending':
				return 'secondary';
			case 'accepted':
				return 'default';
			case 'rejected':
				return 'destructive';
			default:
				return 'outline';
		}
	}
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex justify-end">
		<Button size="sm" onclick={() => (showStartTradeModal = true)} class="gap-1.5">
			<Plus class="h-4 w-4" />
			<span class="hidden sm:inline">Nouvel échange</span>
		</Button>
	</div>

	<!-- Feed -->
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
		</div>
	{:else if activityItems.length === 0}
		<Card.Root>
			<Card.Content class="py-8 text-center">
				<MessageSquare class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
				<h3 class="mb-2 font-semibold">Aucune activité</h3>
				<p class="text-muted-foreground">Vos propositions et échanges apparaîtront ici</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-3">
			{#each activityItems as item (item.id)}
				{#if item.type === 'proposal'}
					<!-- PROPOSAL ITEM -->
					{@const proposal = item.data as MarketplaceProposal & { summary?: string }}
					<Card.Root class={item.requiresAction ? 'ring-2 ring-primary' : ''}>
						<Card.Content class="p-4">
							<div
								class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
							>
								<div class="flex items-start gap-3">
									<div
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
									>
										<Send class="h-4 w-4" />
									</div>
									<div class="min-w-0 space-y-1">
										<div class="flex flex-wrap items-center gap-2">
											<span class="text-sm font-medium">
												{proposal.summary || 'Proposition'}
											</span>
											<Badge variant={proposalStatusVariant(proposal.status)}>
												{proposalStatusLabel(proposal.status)}
											</Badge>
										</div>
										<div class="text-xs text-muted-foreground">
											<span class="flex items-center gap-1">
												<Clock class="h-3 w-3" />
												{formatTime(proposal.created_at)}
											</span>
										</div>
										{#if proposal.response_message}
											<div class="mt-1 rounded bg-muted p-2 text-xs">
												{#if proposal.status === 'accepted'}
													<CheckCircle class="mr-1 inline h-3 w-3 text-green-500" />
												{:else if proposal.status === 'rejected'}
													<XCircle class="mr-1 inline h-3 w-3 text-destructive" />
												{/if}
												{proposal.response_message}
											</div>
										{/if}
									</div>
								</div>
								{#if proposal.status === 'pending'}
									<Button
										variant="outline"
										size="sm"
										class="shrink-0 self-end sm:self-center"
										onclick={async () => {
											await marketplaceStore.cancelProposal?.(proposal.id);
										}}
									>
										Retirer
									</Button>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				{:else}
					<!-- TRADE ITEM -->
					{@const trade = item.data as MarketplaceTrade}
					{@const partner = getTradePartner(trade)}
					{@const isMyTurn = trade.last_offer_by !== null && trade.last_offer_by !== userId}
					<Card.Root class={item.requiresAction ? 'ring-2 ring-primary' : ''}>
						<Card.Content class="p-4">
							<div
								class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
							>
								<div class="flex items-start gap-3">
									<div
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
									>
										<ArrowLeftRight class="h-4 w-4" />
									</div>
									<div class="min-w-0 space-y-1">
										<div class="flex flex-wrap items-center gap-2">
											<span class="text-sm font-medium">
												Échange avec {partner?.username || 'Anonyme'}
											</span>
											{#if trade.status === 'negotiating'}
												{#if isMyTurn}
													<Badge variant="destructive">Votre tour</Badge>
												{:else if trade.last_offer_by === userId}
													<Badge variant="secondary">En attente</Badge>
												{:else}
													<Badge variant="outline">Nouvelle offre</Badge>
												{/if}
											{:else if trade.status === 'completed'}
												<Badge variant="default">
													<CheckCircle class="mr-1 h-3 w-3" />
													Complété
												</Badge>
											{:else}
												<Badge variant="outline">
													<XCircle class="mr-1 h-3 w-3" />
													Annulé
												</Badge>
											{/if}
										</div>
										<div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
											<span class="flex items-center gap-1">
												<Clock class="h-3 w-3" />
												{formatTime(trade.updated_at)}
											</span>
											<span>
												{trade.trade_type === 'friend' ? 'Échange direct' : 'Via marketplace'}
											</span>
										</div>
									</div>
								</div>
								{#if trade.status === 'negotiating'}
									<Button
										variant={isMyTurn ? 'default' : 'outline'}
										size="sm"
										class="shrink-0 self-end sm:self-center"
										onclick={() => handleTradeClick(trade)}
									>
										{isMyTurn ? 'Répondre' : 'Voir'}
									</Button>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<!-- Trade Negotiation Modal -->
{#if selectedTrade}
	{@const isOpen = !!selectedTrade}
	<TradeNegotiationModal trade={selectedTrade} open={isOpen} onClose={closeTradeNegotiation} />
{/if}

<!-- Start Friend Trade Modal -->
{#if supabase && userId}
	<StartFriendTradeModal
		bind:open={showStartTradeModal}
		onClose={() => (showStartTradeModal = false)}
		onTradeStarted={handleTradeStarted}
		{supabase}
		{userId}
	/>
{/if}
