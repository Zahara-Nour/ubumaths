<script lang="ts">
	import type { MarketplaceListing, MarketplaceProposal } from '$lib/types/marketplace';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import VipCard from '$lib/components/VipCard.svelte';
	import { RARITY_COLORS, RARITY_LABELS } from '$lib/constants/vip-card-ui';
	import { CheckCircle, XCircle, ArrowDown } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	// Props
	let {
		proposal,
		listing = undefined,
		open = $bindable(false),
		onResponse = async () => {}
	} = $props<{
		proposal: MarketplaceProposal;
		listing?: MarketplaceListing | null;
		open?: boolean;
		onResponse?: (action: 'accept' | 'reject', message?: string) => Promise<void>;
	}>();

	// State
	let responseMessage = $state('');
	let isSubmitting = $state(false);

	// Format time
	function formatTime(dateString: string) {
		return formatDistanceToNow(new Date(dateString), {
			addSuffix: true,
			locale: fr
		});
	}

	// Handle accept
	async function handleAccept() {
		if (isSubmitting) return;

		isSubmitting = true;
		try {
			await onResponse('accept', responseMessage || undefined);
			open = false;
		} finally {
			isSubmitting = false;
		}
	}

	// Handle reject
	async function handleReject() {
		if (isSubmitting) return;

		isSubmitting = true;
		try {
			await onResponse('reject', responseMessage || undefined);
			open = false;
		} finally {
			isSubmitting = false;
		}
	}

	// Reset on open
	$effect(() => {
		if (open) {
			responseMessage = '';
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] max-w-lg overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Répondre à la proposition</Dialog.Title>
			<Dialog.Description>
				Proposition de {proposal.proposer?.username || 'Anonyme'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Proposer Info -->
			<div class="flex items-center gap-3">
				<UserAvatar
					avatar_url={proposal.proposer?.avatar_url}
					role="student"
					firstname={proposal.proposer?.username}
				/>
				<div>
					<div class="font-medium">{proposal.proposer?.username || 'Anonyme'}</div>
					<div class="text-sm text-muted-foreground">
						Proposé {formatTime(proposal.created_at)}
					</div>
				</div>
			</div>

			<!-- My Listing (what I offered/asked) -->
			{#if listing}
				<div class="space-y-2 rounded-lg border bg-muted/30 p-4">
					<h4 class="font-medium">
						Mon annonce ({listing.listing_type === 'sell' ? 'Vente' : 'Achat'})
					</h4>

					{#if listing.offered_cards?.length}
						<div>
							<p class="mb-1 text-xs font-medium text-muted-foreground">Je propose :</p>
							<div class="flex flex-wrap gap-2">
								{#each listing.offered_cards as card (card.id)}
									<div class="flex items-center gap-2 rounded-md border bg-background p-2">
										<VipCard
											card={{
												id: card.template_id,
												name: card.template?.name ?? 'Inconnue',
												description: card.template?.description ?? '',
												imagePath: card.template?.image_path ?? undefined,
												rarity: card.template?.rarity ?? 'common',
												category: undefined
											}}
											size="sm"
											clickable={false}
										/>
										<span class="text-xs font-medium">{card.template?.name ?? 'Inconnue'}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
					{#if listing.offered_gidouilles && listing.offered_gidouilles > 0}
						<p class="text-sm text-muted-foreground">
							Je propose : {listing.offered_gidouilles} gidouilles
						</p>
					{/if}

					{#if listing.wanted_templates?.length}
						<div>
							<p class="mb-1 text-xs font-medium text-muted-foreground">Je recherche :</p>
							<div class="flex flex-wrap gap-2">
								{#each listing.wanted_templates as template (template.id)}
									<div class="flex items-center gap-2 rounded-md border bg-background p-2">
										<VipCard
											card={{
												id: template.id,
												name: template.name,
												description: template.description,
												imagePath: template.image_path ?? undefined,
												rarity: template.rarity,
												category: undefined
											}}
											size="sm"
											clickable={false}
										/>
										<span class="text-xs font-medium">{template.name}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
					{#if listing.wanted_gidouilles && listing.wanted_gidouilles > 0}
						<p class="text-sm text-muted-foreground">
							Je demande : {listing.wanted_gidouilles} gidouilles
						</p>
					{/if}
				</div>

				<div class="flex justify-center">
					<ArrowDown class="h-5 w-5 text-muted-foreground" />
				</div>
			{/if}

			<!-- Proposal Details (what the proposer offers) -->
			<div class="space-y-2 rounded-lg border p-4">
				<h4 class="font-medium">Offre de {proposal.proposer?.username || 'Anonyme'}</h4>
				{#if proposal.offered_cards?.length}
					<div class="flex flex-wrap gap-2">
						{#each proposal.offered_cards as card (card.id)}
							<div class="flex items-center gap-2 rounded-md border p-2">
								<VipCard
									card={{
										id: card.template_id,
										name: card.template?.name ?? 'Inconnue',
										description: card.template?.description ?? '',
										imagePath: card.template?.image_path ?? undefined,
										rarity: card.template?.rarity ?? 'common',
										category: undefined
									}}
									size="sm"
									clickable={false}
								/>
								<div class="text-sm">
									<div class="font-medium">{card.template?.name ?? 'Inconnue'}</div>
									{#if card.template?.rarity}
										<Badge
											variant="outline"
											class="border {RARITY_COLORS[card.template.rarity]} text-xs"
										>
											{RARITY_LABELS[card.template.rarity]}
										</Badge>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{:else if proposal.offered_card_ids?.length}
					<p class="text-sm text-muted-foreground">
						{proposal.offered_card_ids.length} carte(s)
					</p>
				{/if}
				{#if proposal.offered_gidouilles && proposal.offered_gidouilles > 0}
					<p class="text-sm text-muted-foreground">
						{proposal.offered_gidouilles} gidouilles
					</p>
				{/if}
				{#if !proposal.offered_card_ids?.length && !proposal.offered_gidouilles}
					<p class="text-sm text-muted-foreground">Aucune offre spécifiée</p>
				{/if}
			</div>

			{#if proposal.message}
				<div class="space-y-2 rounded-lg border p-4">
					<h4 class="font-medium">Message du proposant</h4>
					<p class="text-sm">{proposal.message}</p>
				</div>
			{/if}

			<!-- Response Message -->
			<div class="space-y-2">
				<Label for="response">Message de réponse (optionnel)</Label>
				<Textarea
					id="response"
					bind:value={responseMessage}
					placeholder="Ajoutez un message pour expliquer votre décision..."
					rows={3}
					maxlength={500}
				/>
				<p class="text-xs text-muted-foreground">
					{responseMessage.length}/500 caractères
				</p>
			</div>
		</div>

		<Dialog.Footer class="gap-2 sm:gap-0">
			<Button variant="outline" onclick={() => (open = false)} disabled={isSubmitting}>
				Annuler
			</Button>
			<Button variant="destructive" onclick={handleReject} disabled={isSubmitting}>
				<XCircle class="mr-2 h-4 w-4" />
				Refuser
			</Button>
			<Button variant="default" onclick={handleAccept} disabled={isSubmitting}>
				<CheckCircle class="mr-2 h-4 w-4" />
				Accepter
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
