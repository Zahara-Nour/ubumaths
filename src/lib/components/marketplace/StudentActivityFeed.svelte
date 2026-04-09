<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import type { MarketplaceProposal, MarketplaceTrade } from '$lib/types/marketplace';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Send,
		Inbox,
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
		type: 'proposal-sent' | 'proposal-received' | 'trade';
		date: string;
		requiresAction: boolean;
		summary?: string;
		data: MarketplaceProposal | MarketplaceTrade;
	};

	// Build summary for a received proposal (from the listing owner's perspective)
	// Format: "Reçu [ce que le proposeur a offert]"
	function buildReceivedProposalSummary(proposal: MarketplaceProposal): string {
		const parts: string[] = [];
		if (proposal.offered_cards?.length) {
			const grouped: Record<string, number> = {};
			for (const c of proposal.offered_cards) {
				const name = c.template?.name ?? '?';
				if (name !== '?') grouped[name] = (grouped[name] || 0) + 1;
			}
			const names = Object.entries(grouped).map(([n, c]) => (c > 1 ? `${c}x ${n}` : n));
			if (names.length > 0) parts.push(names.join(' + '));
		}
		if (proposal.offered_gidouilles && proposal.offered_gidouilles > 0) {
			parts.push(`${proposal.offered_gidouilles} gidouilles`);
		}
		return parts.length > 0 ? `Reçu ${parts.join(' + ')}` : 'Proposition';
	}

	// Merge proposals and trades into unified feed
	let activityItems = $derived.by(() => {
		const items: ActivityItem[] = [];

		// Add sent proposals
		for (const proposal of marketplaceStore.myProposals) {
			items.push({
				id: `proposal-sent-${proposal.id}`,
				type: 'proposal-sent',
				date: proposal.created_at,
				requiresAction: false,
				summary: (proposal as MarketplaceProposal & { summary?: string }).summary,
				data: proposal
			});
		}

		// Add received proposals
		for (const proposal of marketplaceStore.receivedProposals) {
			if (proposal.proposer_id === userId) continue;
			items.push({
				id: `proposal-recv-${proposal.id}`,
				type: 'proposal-received',
				date: proposal.created_at,
				requiresAction: proposal.status === 'pending',
				summary: buildReceivedProposalSummary(proposal),
				data: proposal
			});
		}

		// Add trades (skip marketplace trades — they're shown as proposals)
		for (const trade of marketplaceStore.activeTrades) {
			if (trade.trade_type === 'marketplace' && trade.status === 'completed') continue;
			const isMyTurn = trade.last_offer_by !== null && trade.last_offer_by !== userId;
			items.push({
				id: `trade-${trade.id}`,
				type: 'trade',
				date: trade.updated_at,
				requiresAction: trade.status === 'negotiating' && isMyTurn,
				data: trade
			});
		}

		// Sort by date descending (most recent first)
		items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
				{#if item.type === 'proposal-sent' || item.type === 'proposal-received'}
					<!-- PROPOSAL ITEM -->
					{@const proposal = item.data as MarketplaceProposal}
					{@const isSent = item.type === 'proposal-sent'}
					<Card.Root class={item.requiresAction ? 'ring-2 ring-primary' : ''}>
						<Card.Content class="p-4">
							<div
								class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
							>
								<div class="flex items-start gap-3">
									<div
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {isSent
											? 'bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400'
											: 'bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'}"
									>
										{#if isSent}
											<Send class="h-4 w-4" />
										{:else}
											<Inbox class="h-4 w-4" />
										{/if}
									</div>
									<div class="min-w-0 space-y-1">
										<div class="flex flex-wrap items-center gap-2">
											<span class="text-sm font-medium">
												{item.summary || 'Proposition'}
											</span>
											<Badge variant={proposalStatusVariant(proposal.status)}>
												{proposalStatusLabel(proposal.status)}
											</Badge>
										</div>
										<div class="text-xs text-muted-foreground">
											<span class="flex items-center gap-1">
												<Clock class="h-3 w-3" />
												{formatTime(proposal.created_at)}
												{#if !isSent && proposal.proposer?.username}
													— de {proposal.proposer.username}
												{/if}
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
								{#if isSent && proposal.status === 'pending'}
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
