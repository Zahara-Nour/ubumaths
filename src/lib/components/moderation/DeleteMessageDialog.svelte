<!--
	DeleteMessageDialog Component
	=============================

	Confirmation dialog for deleting a message with required reason.

	Props:
		- open: Dialog open state (bindable)
		- messageId: ID of message to delete
		- onSuccess: Callback after successful deletion

	Features:
		- Dialog for confirmation
		- Textarea for reason (5-500 chars)
		- Character count
		- Form validation
		- Loading state
		- Toast notifications
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import { Loader2 } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Component Props
	interface Props {
		open?: boolean;
		messageId: string | null;
		onSuccess?: () => void;
	}

	let { open = $bindable(false), messageId, onSuccess = () => {} }: Props = $props();

	// State
	let reason = $state('');
	let isDeleting = $state(false);

	/**
	 * Character count
	 */
	const characterCount = $derived(reason.length);

	/**
	 * Check if form is valid
	 */
	const isValid = $derived(reason.trim().length >= 5 && reason.length <= 500);

	/**
	 * Delete message
	 */
	async function deleteMessage(): Promise<void> {
		if (!messageId || !isValid) return;

		isDeleting = true;

		try {
			const response = await fetch(`/api/moderation/messages/${messageId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: reason.trim() })
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(error || 'Failed to delete message');
			}

			toaster.success('Message supprimé avec succès');
			closeDialog();
			onSuccess();
		} catch (error) {
			console.error('Failed to delete message:', error);
			toaster.error('Erreur lors de la suppression du message');
		} finally {
			isDeleting = false;
		}
	}

	/**
	 * Close dialog and reset form
	 */
	function closeDialog(): void {
		open = false;
		reason = '';
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Supprimer ce message ?</Dialog.Title>
			<Dialog.Description>
				Cette action est irréversible. Le message sera masqué pour tous les participants.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-2 py-4">
			<Label for="delete-reason">Raison de la suppression</Label>
			<Textarea
				id="delete-reason"
				bind:value={reason}
				placeholder="Expliquez pourquoi vous supprimez ce message..."
				rows={4}
				disabled={isDeleting}
				class="resize-none"
			/>
			<p class="text-sm text-muted-foreground">
				{characterCount} / 500 caractères
				{#if characterCount < 5}
					<span class="text-destructive">(minimum 5 caractères)</span>
				{/if}
			</p>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={closeDialog} disabled={isDeleting}>Annuler</Button>
			<Button variant="destructive" onclick={deleteMessage} disabled={!isValid || isDeleting}>
				{#if isDeleting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Supprimer le message
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
