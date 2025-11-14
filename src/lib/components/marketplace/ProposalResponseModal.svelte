<script lang="ts">
	import type { MarketplaceProposal } from '$lib/types/marketplace';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Avatar } from '$lib/components/ui/avatar';
	import { CheckCircle, XCircle } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	// Props
	let {
		proposal,
		open = $bindable(false),
		onResponse = async () => {}
	} = $props<{
		proposal: MarketplaceProposal;
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

		if (
			!confirm(
				"Êtes-vous sûr de vouloir accepter cette proposition ? L'échange sera effectué immédiatement."
			)
		) {
			return;
		}

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
			<Dialog.Title>Répondre à la proposition</Dialog.Title>
			<Dialog.Description>
				Proposition de {proposal.proposer?.username || 'Anonyme'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Proposer Info -->
			<div class="flex items-center gap-3">
				<Avatar.Root class="h-10 w-10">
					<Avatar.Image
						src={proposal.proposer?.avatar_url || '/default-avatar.jpg'}
						alt={proposal.proposer?.username}
					/>
					<Avatar.Fallback>
						{proposal.proposer?.username?.charAt(0).toUpperCase() || '?'}
					</Avatar.Fallback>
				</Avatar.Root>
				<div>
					<div class="font-medium">{proposal.proposer?.username || 'Anonyme'}</div>
					<div class="text-sm text-muted-foreground">
						Proposé {formatTime(proposal.created_at)}
					</div>
				</div>
			</div>

			<!-- Proposal Details -->
			<div class="space-y-2 rounded-lg border p-4">
				<h4 class="font-medium">Offre proposée</h4>
				<div class="text-sm text-muted-foreground">
					{#if proposal.offered_card_ids?.length}
						<p>{proposal.offered_card_ids.length} carte(s)</p>
					{/if}
					{#if proposal.offered_gidouilles && proposal.offered_gidouilles > 0}
						<p>{proposal.offered_gidouilles} gidouilles</p>
					{/if}
					{#if !proposal.offered_card_ids?.length && !proposal.offered_gidouilles}
						<p>Aucune offre spécifiée</p>
					{/if}
				</div>
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
