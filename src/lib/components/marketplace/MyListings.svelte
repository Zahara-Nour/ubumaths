<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import type { MarketplaceListing, MarketplaceProposal } from '$lib/types/marketplace';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import SkeletonList from '$lib/components/skeleton/SkeletonList.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import {
		Package,
		Clock,
		Eye,
		MessageSquare,
		Trash2,
		CheckCircle,
		AlertCircle,
		RefreshCw
	} from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import ListingDetailsModal from './ListingDetailsModal.svelte';
	import ProposalResponseModal from './ProposalResponseModal.svelte';

	// State
	let selectedTab = $state<'active' | 'completed' | 'expired'>('active');
	let selectedListing = $state<MarketplaceListing | null>(null);
	let selectedProposal = $state<MarketplaceProposal | null>(null);
	let respondingToProposal = $state(false);

	// Filter listings by status
	let activeListings = $derived(marketplaceStore.myListings.filter((l) => l.status === 'active'));

	let completedListings = $derived(
		marketplaceStore.myListings.filter((l) => l.status === 'completed')
	);

	let expiredListings = $derived(
		marketplaceStore.myListings.filter((l) => l.status === 'expired' || l.status === 'cancelled')
	);

	// Get proposals for a listing
	function getListingProposals(listingId: string): MarketplaceProposal[] {
		return marketplaceStore.receivedProposals.filter((p) => p.listing_id === listingId);
	}

	// Get pending proposals count for a listing
	function getPendingProposalsCount(listingId: string): number {
		return getListingProposals(listingId).filter((p) => p.status === 'pending').length;
	}

	// Format time
	function formatTime(dateString: string) {
		return formatDistanceToNow(new Date(dateString), {
			addSuffix: true,
			locale: fr
		});
	}

	// Cancel listing
	async function cancelListing(listingId: string) {
		if (!confirm('Êtes-vous sûr de vouloir annuler cette annonce ?')) return;

		await marketplaceStore.cancelListing(listingId);
	}

	// Open proposal response modal
	function openProposalResponse(proposal: MarketplaceProposal) {
		selectedProposal = proposal;
		respondingToProposal = true;
	}

	// Handle proposal response
	async function handleProposalResponse(action: 'accept' | 'reject', message?: string) {
		if (!selectedProposal) return;

		if (action === 'accept') {
			await marketplaceStore.acceptProposal(selectedProposal.id, message);
		} else {
			await marketplaceStore.rejectProposal(selectedProposal.id, message);
		}

		selectedProposal = null;
		respondingToProposal = false;
	}

	// Refresh listings
	function refresh() {
		marketplaceStore.fetchMyListings();
	}
</script>

<div class="space-y-4">
	<!-- Header with stats -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div class="text-sm text-muted-foreground">
				Total: {marketplaceStore.myListings.length} annonce(s)
			</div>
			{#if marketplaceStore.pendingActions.listings > 0}
				<Badge variant="destructive">
					{marketplaceStore.pendingActions.listings} proposition(s) en attente
				</Badge>
			{/if}
		</div>
		<Button variant="outline" size="icon" onclick={refresh} aria-label="Actualiser les annonces">
			<RefreshCw class="h-4 w-4" />
		</Button>
	</div>

	<!-- Tabs for listing status -->
	<Tabs.Root bind:value={selectedTab}>
		<Tabs.List>
			<Tabs.Trigger value="active">
				Actives ({activeListings.length})
			</Tabs.Trigger>
			<Tabs.Trigger value="completed">
				Complétées ({completedListings.length})
			</Tabs.Trigger>
			<Tabs.Trigger value="expired">
				Expirées/Annulées ({expiredListings.length})
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Active Listings -->
		<Tabs.Content value="active" class="mt-4 space-y-4">
			{#if marketplaceStore.isLoading.myListings}
				<SkeletonList itemCount={3} />
			{:else if activeListings.length === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<Package class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 font-semibold">Aucune annonce active</h3>
						<p class="text-muted-foreground">Créez une annonce pour commencer à échanger</p>
					</Card.Content>
				</Card.Root>
			{:else}
				{#each activeListings as listing (listing.id)}
					{@const proposals = getListingProposals(listing.id)}
					{@const pendingCount = getPendingProposalsCount(listing.id)}

					<Card.Root>
						<Card.Header>
							<div class="flex items-start justify-between">
								<div class="space-y-1">
									<Card.Title class="text-lg">
										{listing.title}
									</Card.Title>
									{#if listing.description}
										<Card.Description>
											{listing.description}
										</Card.Description>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									<Badge variant={listing.listing_type === 'sell' ? 'default' : 'secondary'}>
										{listing.listing_type === 'sell' ? 'Vente' : 'Achat'}
									</Badge>
									{#if pendingCount > 0}
										<Badge variant="destructive">
											{pendingCount} nouvelle(s)
										</Badge>
									{/if}
								</div>
							</div>

							<div class="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
								<span class="flex items-center gap-1">
									<Clock class="h-3 w-3" />
									Expire {formatTime(listing.expires_at)}
								</span>
								<span class="flex items-center gap-1">
									<Eye class="h-3 w-3" />
									{listing.view_count} vue(s)
								</span>
								<span class="flex items-center gap-1">
									<MessageSquare class="h-3 w-3" />
									{listing.proposal_count} proposition(s)
								</span>
							</div>
						</Card.Header>

						{#if proposals.length > 0}
							<Card.Content>
								<h4 class="mb-3 font-medium">Propositions reçues</h4>
								<div class="space-y-2">
									{#each proposals.slice(0, 3) as proposal (proposal.id)}
										<div class="flex items-center justify-between rounded-lg border p-3">
											<div class="flex items-center gap-3">
												<Avatar.Root class="h-8 w-8">
													<Avatar.Image
														src={proposal.proposer?.avatar_url || '/default-avatar.jpg'}
														alt={proposal.proposer?.username}
													/>
													<Avatar.Fallback>
														{proposal.proposer?.username?.charAt(0).toUpperCase() || '?'}
													</Avatar.Fallback>
												</Avatar.Root>

												<div>
													<div class="text-sm font-medium">
														{proposal.proposer?.username || 'Anonyme'}
													</div>
													<div class="text-xs text-muted-foreground">
														{formatTime(proposal.created_at)}
													</div>
												</div>
											</div>

											<div class="flex items-center gap-2">
												{#if proposal.status === 'pending'}
													<Button
														size="sm"
														variant="outline"
														onclick={() => openProposalResponse(proposal)}
													>
														Répondre
													</Button>
												{:else}
													<Badge variant={proposal.status === 'accepted' ? 'success' : 'secondary'}>
														{proposal.status === 'accepted' ? 'Acceptée' : 'Refusée'}
													</Badge>
												{/if}
											</div>
										</div>
									{/each}

									{#if proposals.length > 3}
										<Button
											variant="ghost"
											size="sm"
											class="w-full"
											onclick={() => (selectedListing = listing)}
										>
											Voir toutes les propositions ({proposals.length})
										</Button>
									{/if}
								</div>
							</Card.Content>
						{/if}

						<Card.Footer class="flex justify-between">
							<Button variant="outline" size="sm" onclick={() => (selectedListing = listing)}>
								Voir les détails
							</Button>
							<Button variant="destructive" size="sm" onclick={() => cancelListing(listing.id)}>
								<Trash2 class="mr-2 h-4 w-4" />
								Annuler
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			{/if}
		</Tabs.Content>

		<!-- Completed Listings -->
		<Tabs.Content value="completed" class="mt-4 space-y-4">
			{#if completedListings.length === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<CheckCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 font-semibold">Aucune annonce complétée</h3>
						<p class="text-muted-foreground">Les annonces complétées apparaîtront ici</p>
					</Card.Content>
				</Card.Root>
			{:else}
				{#each completedListings as listing (listing.id)}
					<Card.Root>
						<Card.Content class="py-4">
							<div class="flex items-center justify-between">
								<div>
									<h4 class="font-medium">{listing.title}</h4>
									<p class="mt-1 text-sm text-muted-foreground">
										Complétée {formatTime(listing.completed_at ?? listing.created_at)}
									</p>
								</div>
								<Badge variant="success">
									<CheckCircle class="mr-1 h-3 w-3" />
									Complétée
								</Badge>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			{/if}
		</Tabs.Content>

		<!-- Expired/Cancelled Listings -->
		<Tabs.Content value="expired" class="mt-4 space-y-4">
			{#if expiredListings.length === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<AlertCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 font-semibold">Aucune annonce expirée</h3>
						<p class="text-muted-foreground">Les annonces expirées ou annulées apparaîtront ici</p>
					</Card.Content>
				</Card.Root>
			{:else}
				{#each expiredListings as listing (listing.id)}
					<Card.Root>
						<Card.Content class="py-4">
							<div class="flex items-center justify-between">
								<div>
									<h4 class="font-medium">{listing.title}</h4>
									<p class="mt-1 text-sm text-muted-foreground">
										{listing.status === 'expired' ? 'Expirée' : 'Annulée'}
										{formatTime(listing.cancelled_at ?? listing.expires_at)}
									</p>
								</div>
								<Badge variant={listing.status === 'expired' ? 'destructive' : 'outline'}>
									{listing.status === 'expired' ? 'Expirée' : 'Annulée'}
								</Badge>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Listing Details Modal -->
{#if selectedListing}
	{@const isOpen = !!selectedListing}
	<ListingDetailsModal
		listing={selectedListing}
		open={isOpen}
		onclose={() => (selectedListing = null)}
		isOwner={true}
	/>
{/if}

<!-- Proposal Response Modal -->
{#if selectedProposal && respondingToProposal}
	<ProposalResponseModal
		proposal={selectedProposal}
		bind:open={respondingToProposal}
		onResponse={handleProposalResponse}
	/>
{/if}
