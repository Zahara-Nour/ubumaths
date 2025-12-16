<script lang="ts">
	import type { MarketplaceListing } from '$lib/types/marketplace';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Clock, Eye, MessageSquare } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	// Props
	let {
		listing,
		open = $bindable(false),
		onclose = () => {},
		isOwner = false
	} = $props<{
		listing: MarketplaceListing;
		open?: boolean;
		onclose?: () => void;
		isOwner?: boolean;
	}>();

	// Format time
	function formatTime(dateString: string) {
		return formatDistanceToNow(new Date(dateString), {
			addSuffix: true,
			locale: fr
		});
	}

	// Close handler
	function handleClose() {
		open = false;
		onclose();
	}
</script>

<Dialog.Root bind:open onOpenChange={(v) => !v && handleClose()}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center justify-between">
				{listing.title}
				<Badge variant={listing.listing_type === 'sell' ? 'default' : 'secondary'}>
					{listing.listing_type === 'sell' ? 'Vente' : 'Achat'}
				</Badge>
			</Dialog.Title>
			{#if listing.description}
				<Dialog.Description>
					{listing.description}
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Creator Info -->
			<div class="flex items-center gap-3">
				<Avatar.Root class="h-10 w-10">
					<Avatar.Image
						src={listing.creator?.avatar_url || '/default-avatar.jpg'}
						alt={listing.creator?.username}
					/>
					<Avatar.Fallback>
						{listing.creator?.username?.charAt(0).toUpperCase() || '?'}
					</Avatar.Fallback>
				</Avatar.Root>
				<div>
					<div class="font-medium">{listing.creator?.username || 'Anonyme'}</div>
					<div class="text-sm text-muted-foreground">
						Créé {formatTime(listing.created_at)}
					</div>
				</div>
			</div>

			<!-- Stats -->
			<div class="flex items-center gap-4 text-sm text-muted-foreground">
				<span class="flex items-center gap-1">
					<Clock class="h-4 w-4" />
					Expire {formatTime(listing.expires_at)}
				</span>
				<span class="flex items-center gap-1">
					<Eye class="h-4 w-4" />
					{listing.view_count} vue(s)
				</span>
				<span class="flex items-center gap-1">
					<MessageSquare class="h-4 w-4" />
					{listing.proposal_count} proposition(s)
				</span>
			</div>

			<!-- Offer/Demand Details -->
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2 rounded-lg border p-4">
					<h4 class="font-medium">Offre</h4>
					{#if listing.offered_card_ids?.length}
						<p>{listing.offered_card_ids.length} carte(s)</p>
					{/if}
					{#if listing.offered_gidouilles}
						<p>{listing.offered_gidouilles} gidouilles</p>
					{/if}
					{#if !listing.offered_card_ids?.length && !listing.offered_gidouilles}
						<p class="text-muted-foreground">Rien</p>
					{/if}
				</div>

				<div class="space-y-2 rounded-lg border p-4">
					<h4 class="font-medium">Demande</h4>
					{#if listing.wanted_card_template_ids?.length}
						<p>{listing.wanted_card_template_ids.length} type(s) de carte</p>
					{/if}
					{#if listing.wanted_gidouilles}
						<p>{listing.wanted_gidouilles} gidouilles</p>
					{/if}
					{#if !listing.wanted_card_template_ids?.length && !listing.wanted_gidouilles}
						<p class="text-muted-foreground">Rien</p>
					{/if}
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleClose}>Fermer</Button>
			{#if !isOwner}
				<Button>Faire une proposition</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
