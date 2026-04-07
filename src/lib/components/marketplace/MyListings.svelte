<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import type { MarketplaceListing, MarketplaceProposal } from '$lib/types/marketplace';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import SkeletonList from '$lib/components/skeleton/SkeletonList.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import {
		Package,
		Clock,
		Eye,
		MessageSquare,
		Trash2,
		CheckCircle,
		AlertCircle
	} from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import ListingDetailsModal from './ListingDetailsModal.svelte';
	import ProposalResponseModal from './ProposalResponseModal.svelte';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';

	// Constants
	const statusFilterItems = [
		{ value: 'active', label: 'Actives' },
		{ value: 'completed', label: 'Complétées' },
		{ value: 'expired', label: 'Expirées / Annulées' }
	];

	// State
	let statusFilter = $state<'active' | 'completed' | 'expired'>('active');
	let selectedListing = $state<MarketplaceListing | null>(null);
	let selectedProposal = $state<MarketplaceProposal | null>(null);
	let respondingToProposal = $state(false);
	let cancellingListingId = $state<string | null>(null);

	// Filter listings by status
	let filteredListings = $derived.by(() => {
		switch (statusFilter) {
			case 'active':
				return marketplaceStore.myListings.filter((l) => l.status === 'active');
			case 'completed':
				return marketplaceStore.myListings.filter((l) => l.status === 'completed');
			case 'expired':
				return marketplaceStore.myListings.filter(
					(l) => l.status === 'expired' || l.status === 'cancelled'
				);
		}
	});

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
	function requestCancelListing(listingId: string) {
		cancellingListingId = listingId;
	}

	async function confirmCancelListing() {
		if (!cancellingListingId) return;
		await marketplaceStore.cancelListing(cancellingListingId);
		cancellingListingId = null;
	}

	// Open proposal response modal
	let selectedListingForProposal = $state<MarketplaceListing | null>(null);

	function openProposalResponse(proposal: MarketplaceProposal, listing: MarketplaceListing) {
		selectedProposal = proposal;
		selectedListingForProposal = listing;
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
		selectedListingForProposal = null;
		respondingToProposal = false;
	}
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<div class="w-48">
			<MySelect type="single" bind:value={statusFilter} items={statusFilterItems} />
		</div>
		{#if marketplaceStore.pendingActions.listings > 0}
			<Badge variant="destructive">
				{marketplaceStore.pendingActions.listings} en attente
			</Badge>
		{/if}
	</div>

	<!-- Content -->
	{#if marketplaceStore.isLoading.myListings}
		<SkeletonList itemCount={3} />
	{:else if filteredListings.length === 0}
		<!-- Empty state -->
		<Card.Root>
			<Card.Content class="py-12 text-center">
				{#if statusFilter === 'active'}
					<Package class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<h3 class="mb-2 font-semibold">Aucune annonce active</h3>
					<p class="text-muted-foreground">Créez une annonce pour commencer à échanger</p>
				{:else if statusFilter === 'completed'}
					<CheckCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<h3 class="mb-2 font-semibold">Aucune annonce complétée</h3>
					<p class="text-muted-foreground">Les annonces complétées apparaîtront ici</p>
				{:else}
					<AlertCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<h3 class="mb-2 font-semibold">Aucune annonce expirée</h3>
					<p class="text-muted-foreground">Les annonces expirées ou annulées apparaîtront ici</p>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-4">
			{#each filteredListings as listing (listing.id)}
				{#if statusFilter === 'active'}
					<!-- Active listing: full card with proposals and actions -->
					{@const proposals = getListingProposals(listing.id)}
					{@const pendingCount = getPendingProposalsCount(listing.id)}

					<Card.Root>
						<Card.Header class="pb-3">
							<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
								<Card.Title class="text-base">
									{listing.title || (listing.listing_type === 'sell' ? 'Vente' : 'Achat')}
								</Card.Title>
								<div class="flex items-center gap-3 text-xs text-muted-foreground">
									<span class="flex items-center gap-1">
										<Clock class="h-3 w-3" />
										{formatTime(listing.expires_at)}
									</span>
									<span class="flex items-center gap-1">
										<Eye class="h-3 w-3" />
										{listing.view_count}
									</span>
									<span class="flex items-center gap-1">
										<MessageSquare class="h-3 w-3" />
										{listing.proposal_count}
									</span>
								</div>
								{#if pendingCount > 0}
									<Badge variant="destructive" class="text-xs">{pendingCount} nouvelle(s)</Badge>
								{/if}
							</div>
						</Card.Header>

						{#if proposals.length > 0}
							<Card.Content>
								<h4 class="mb-3 font-medium">Propositions reçues</h4>
								<div class="space-y-2">
									{#each proposals.slice(0, 3) as proposal (proposal.id)}
										<div class="flex items-center justify-between rounded-lg border p-3">
											<div class="flex items-center gap-3">
												<UserAvatar
													avatar_url={proposal.proposer?.avatar_url}
													role="student"
													firstname={proposal.proposer?.username}
													class="h-8 w-8"
												/>
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
														onclick={() => openProposalResponse(proposal, listing)}
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
							<Button
								variant="destructive"
								size="sm"
								onclick={() => requestCancelListing(listing.id)}
							>
								<Trash2 class="mr-2 h-4 w-4" />
								Annuler
							</Button>
						</Card.Footer>
					</Card.Root>
				{:else}
					<!-- Completed/Expired listing: simple card -->
					<Card.Root>
						<Card.Content class="py-4">
							<div class="flex items-center justify-between">
								<div>
									<h4 class="font-medium">
										{listing.title || (listing.listing_type === 'sell' ? 'Vente' : 'Achat')}
									</h4>
									<p class="mt-1 text-sm text-muted-foreground">
										{#if listing.status === 'completed'}
											Complétée {formatTime(listing.completed_at ?? listing.created_at)}
										{:else if listing.status === 'expired'}
											Expirée {formatTime(listing.expires_at)}
										{:else}
											Annulée {formatTime(listing.cancelled_at ?? listing.expires_at)}
										{/if}
									</p>
								</div>
								<Badge
									variant={listing.status === 'completed'
										? 'success'
										: listing.status === 'expired'
											? 'destructive'
											: 'outline'}
								>
									{#if listing.status === 'completed'}
										<CheckCircle class="mr-1 h-3 w-3" />
										Complétée
									{:else if listing.status === 'expired'}
										Expirée
									{:else}
										Annulée
									{/if}
								</Badge>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			{/each}
		</div>
	{/if}
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
		listing={selectedListingForProposal}
		bind:open={respondingToProposal}
		onResponse={handleProposalResponse}
	/>
{/if}

<!-- Cancel Listing Confirmation -->
{#if cancellingListingId}
	<ConfirmDialog
		open={true}
		title="Annuler l'annonce"
		description="Les cartes verrouillées pour cette annonce seront débloquées. Cette action est irréversible."
		confirmLabel="Annuler l'annonce"
		onConfirm={confirmCancelListing}
		onCancel={() => (cancellingListingId = null)}
	/>
{/if}
