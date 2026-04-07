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

	// Build text summary for a listing (e.g. "1 carte Jeu + 5 gidouilles pour 1 carte Batman")
	function getListingSummary(listing: MarketplaceListing): string {
		// Offer side
		const offerParts: string[] = [];
		if (listing.offered_cards?.length) {
			const grouped: Record<string, { name: string; count: number }> = {};
			for (const c of listing.offered_cards) {
				const existing = grouped[c.template_id];
				if (existing) existing.count++;
				else grouped[c.template_id] = { name: c.template.name, count: 1 };
			}
			for (const { name, count } of Object.values(grouped)) {
				offerParts.push(count > 1 ? `${count} cartes ${name}` : `1 carte ${name}`);
			}
		}
		if (listing.offered_gidouilles && listing.offered_gidouilles > 0) {
			offerParts.push(`${listing.offered_gidouilles.toLocaleString('fr-FR')} gidouilles`);
		}

		// Demand side
		const demandParts: string[] = [];
		if (listing.wanted_templates?.length) {
			for (const t of listing.wanted_templates) {
				demandParts.push(`1 carte ${t.name}`);
			}
		}
		if (listing.wanted_gidouilles && listing.wanted_gidouilles > 0) {
			demandParts.push(`${listing.wanted_gidouilles.toLocaleString('fr-FR')} gidouilles`);
		}

		const offer = offerParts.length > 0 ? offerParts.join(' + ') : 'rien';
		const demand = demandParts.length > 0 ? demandParts.join(' + ') : 'rien';

		return `${offer} pour ${demand}`;
	}

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
					<!-- Active listing: compact card -->
					{@const proposals = getListingProposals(listing.id)}
					{@const pendingCount = getPendingProposalsCount(listing.id)}

					<Card.Root>
						<Card.Content class="p-3">
							<!-- Line 1: title + stats + cancel button -->
							<div class="flex items-center gap-2">
								<span class="text-sm font-semibold">
									{listing.title || (listing.listing_type === 'sell' ? 'Vente' : 'Achat')}
								</span>
								<div class="flex items-center gap-2 text-xs text-muted-foreground">
									<span class="flex items-center gap-0.5">
										<Clock class="h-3 w-3" />
										{formatTime(listing.expires_at)}
									</span>
									<span class="flex items-center gap-0.5">
										<Eye class="h-3 w-3" />
										{listing.view_count}
									</span>
									<span class="flex items-center gap-0.5">
										<MessageSquare class="h-3 w-3" />
										{listing.proposal_count}
									</span>
								</div>
								{#if pendingCount > 0}
									<Badge variant="destructive" class="px-1.5 py-0 text-[10px]"
										>{pendingCount} nouvelle(s)</Badge
									>
								{/if}
								<div class="flex-1"></div>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
									onclick={() => requestCancelListing(listing.id)}
								>
									<Trash2 class="h-3 w-3" />
								</Button>
							</div>

							<!-- Line 2: text summary of offer/demand -->
							<p class="mt-1 text-xs text-muted-foreground">
								{getListingSummary(listing)}
							</p>

							<!-- Line 3: proposals if any -->
							{#if proposals.length > 0}
								<div class="mt-2 flex flex-wrap items-center gap-2">
									{#each proposals.slice(0, 3) as proposal (proposal.id)}
										<div class="flex items-center gap-1.5 rounded-md border px-2 py-1">
											<UserAvatar
												avatar_url={proposal.proposer?.avatar_url}
												role="student"
												firstname={proposal.proposer?.username}
												class="h-4 w-4"
											/>
											<span class="text-xs">{proposal.proposer?.username || 'Anonyme'}</span>
											{#if proposal.status === 'pending'}
												<Button
													size="sm"
													variant="outline"
													class="h-5 px-1.5 text-[10px]"
													onclick={() => openProposalResponse(proposal, listing)}
												>
													Répondre
												</Button>
											{:else}
												<Badge
													variant={proposal.status === 'accepted' ? 'success' : 'secondary'}
													class="px-1 py-0 text-[10px]"
												>
													{proposal.status === 'accepted' ? '✓' : '✗'}
												</Badge>
											{/if}
										</div>
									{/each}
									{#if proposals.length > 3}
										<span class="text-xs text-muted-foreground"
											>+{proposals.length - 3} autre(s)</span
										>
									{/if}
								</div>
							{/if}
						</Card.Content>
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
