<script lang="ts">
	import type { MarketplaceListing, MarketplaceProposal } from '$lib/types/marketplace';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import VipCard from '$lib/components/VipCard.svelte';
	import gidouilleImage from '$lib/assets/images/gidouille.png';
	import { ArrowDown } from 'lucide-svelte';

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

	// Build text summary for listing (compact)
	function getListingSummary(l: MarketplaceListing): string {
		const parts: string[] = [];

		if (l.offered_cards?.length) {
			const grouped: Record<string, { name: string; count: number }> = {};
			for (const c of l.offered_cards) {
				const existing = grouped[c.template_id];
				if (existing) existing.count++;
				else grouped[c.template_id] = { name: c.template.name, count: 1 };
			}
			for (const { name, count } of Object.values(grouped)) {
				parts.push(count > 1 ? `${count}x ${name}` : name);
			}
		}
		if (l.offered_gidouilles && l.offered_gidouilles > 0) {
			parts.push(`${l.offered_gidouilles.toLocaleString('fr-FR')} gidouilles`);
		}

		const demandParts: string[] = [];
		if (l.wanted_templates?.length) {
			for (const t of l.wanted_templates) {
				demandParts.push(t.name);
			}
		}
		if (l.wanted_gidouilles && l.wanted_gidouilles > 0) {
			demandParts.push(`${l.wanted_gidouilles.toLocaleString('fr-FR')} gidouilles`);
		}

		const offer = parts.length > 0 ? parts.join(' + ') : 'rien';
		const demand = demandParts.length > 0 ? demandParts.join(' + ') : 'rien';
		return `${offer} pour ${demand}`;
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
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Proposition de {proposal.proposer?.username || 'Anonyme'}</Dialog.Title>
		</Dialog.Header>

		<div class="space-y-3">
			<!-- My listing summary (compact text) -->
			{#if listing}
				<div class="rounded-lg border bg-muted/30 px-3 py-2">
					<p class="text-xs text-muted-foreground">
						Mon annonce : {getListingSummary(listing)}
					</p>
				</div>

				<div class="flex justify-center">
					<ArrowDown class="h-4 w-4 text-muted-foreground" />
				</div>
			{/if}

			<!-- Proposal: what they offer (cards as images, no text names) -->
			<div class="rounded-lg border px-3 py-2">
				<p class="mb-2 text-xs font-medium text-muted-foreground">Offre :</p>
				<div class="flex flex-wrap items-center gap-2">
					{#if proposal.offered_cards?.length}
						{#each proposal.offered_cards as card (card.id)}
							<VipCard
								card={{
									id: card.template_id,
									name: card.template?.name ?? 'Inconnue',
									description: card.template?.description ?? '',
									imagePath: card.template?.image_path ?? undefined,
									rarity: card.template?.rarity ?? 'common'
								}}
								size="sm"
								clickable={false}
							/>
						{/each}
					{/if}
					{#if proposal.offered_gidouilles && proposal.offered_gidouilles > 0}
						<div
							class="flex items-center gap-0.5 rounded bg-yellow-50 px-2 py-1 text-sm dark:bg-yellow-950/30"
						>
							<span class="font-medium">{proposal.offered_gidouilles.toLocaleString('fr-FR')}</span>
							<img src={gidouilleImage} alt="Gidouille" class="h-4 w-4" />
						</div>
					{/if}
					{#if !proposal.offered_cards?.length && !proposal.offered_card_ids?.length && !proposal.offered_gidouilles}
						<span class="text-sm text-muted-foreground italic">Rien</span>
					{/if}
				</div>
			</div>

			{#if proposal.message}
				<div class="rounded-lg bg-muted px-3 py-2 text-sm">
					« {proposal.message} »
				</div>
			{/if}

			<!-- Response message -->
			<div class="space-y-1">
				<Label for="response" class="text-xs">Message (optionnel)</Label>
				<Textarea
					id="response"
					bind:value={responseMessage}
					placeholder="Ajouter un message..."
					rows={2}
					maxlength={500}
				/>
			</div>
		</div>

		<Dialog.Footer class="gap-2">
			<Button variant="destructive" onclick={handleReject} disabled={isSubmitting}>Refuser</Button>
			<Button onclick={handleAccept} disabled={isSubmitting}>Accepter</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
