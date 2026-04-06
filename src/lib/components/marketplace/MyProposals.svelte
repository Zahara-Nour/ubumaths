<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	function formatTime(dateString: string) {
		return formatDistanceToNow(new Date(dateString), {
			addSuffix: true,
			locale: fr
		});
	}

	function statusLabel(status: string) {
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

	function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
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

	let isLoading = $derived(marketplaceStore.isLoading.proposals);
	let proposals = $derived(marketplaceStore.myProposals);
</script>

<div class="space-y-4">
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
		</div>
	{:else if proposals.length === 0}
		<div class="py-8 text-center text-sm text-muted-foreground">
			Vous n'avez envoyé aucune proposition.
		</div>
	{:else}
		{#each proposals as proposal (proposal.id)}
			{@const listing = proposal.listing as
				| { id: string; title: string; creator_id: string; status: string }
				| undefined}
			<Card.Root>
				<Card.Content class="flex items-center justify-between gap-4 p-4">
					<div class="min-w-0 flex-1 space-y-1">
						<div class="flex items-center gap-2">
							<span class="truncate font-medium">
								{listing?.title || (listing ? 'Annonce' : 'Annonce supprimée')}
							</span>
							<Badge variant={statusVariant(proposal.status)}>
								{statusLabel(proposal.status)}
							</Badge>
						</div>
						<div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
							<span class="flex items-center gap-1">
								<Clock class="h-3 w-3" />
								{formatTime(proposal.created_at)}
							</span>
							{#if proposal.offered_gidouilles}
								<span>{proposal.offered_gidouilles} gidouilles offertes</span>
							{/if}
							{#if proposal.offered_card_ids?.length}
								<span>{proposal.offered_card_ids.length} carte(s) offerte(s)</span>
							{/if}
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
					{#if proposal.status === 'pending'}
						<Button
							variant="outline"
							size="sm"
							onclick={async () => {
								await marketplaceStore.cancelProposal?.(proposal.id);
							}}
						>
							Retirer
						</Button>
					{/if}
				</Card.Content>
			</Card.Root>
		{/each}
	{/if}
</div>
