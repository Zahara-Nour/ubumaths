<script lang="ts">
	/**
	 * ReviewActions Component
	 * =======================
	 *
	 * Approve/Reject action buttons with rejection reason dialog.
	 *
	 * Features:
	 * - Approve button (green)
	 * - Reject button (red) with modal
	 * - Textarea for rejection reason
	 * - Form validation
	 * - Disabled state support
	 */

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { CheckCircle2, XCircle } from 'lucide-svelte';

	interface Props {
		onApprove?: () => void;
		onReject?: (reason: string) => void;
		disabled?: boolean;
	}

	let { onApprove, onReject, disabled = false }: Props = $props();

	// Dialog state
	let isRejectDialogOpen = $state(false);
	let rejectReason = $state('');

	/**
	 * Handle approve action
	 */
	function handleApprove() {
		onApprove?.();
	}

	/**
	 * Handle reject dialog open
	 */
	function handleRejectClick() {
		isRejectDialogOpen = true;
		rejectReason = '';
	}

	/**
	 * Handle reject submission
	 */
	function handleRejectSubmit() {
		if (!rejectReason.trim()) {
			return;
		}

		onReject?.(rejectReason.trim());
		isRejectDialogOpen = false;
		rejectReason = '';
	}

	/**
	 * Handle dialog cancel
	 */
	function handleCancel() {
		isRejectDialogOpen = false;
		rejectReason = '';
	}

	// Form validation
	const isRejectValid = $derived(rejectReason.trim().length > 0);
</script>

<div class="flex items-center justify-end gap-3">
	<!-- Reject Button -->
	{#if onReject}
		<Button variant="destructive" onclick={handleRejectClick} {disabled}>
			<XCircle class="mr-2 h-4 w-4" />
			Rejeter
		</Button>
	{/if}

	<!-- Approve Button -->
	{#if onApprove}
		<Button variant="default" onclick={handleApprove} {disabled}>
			<CheckCircle2 class="mr-2 h-4 w-4" />
			Approuver
		</Button>
	{/if}
</div>

<!-- Reject Reason Dialog -->
<Dialog.Root bind:open={isRejectDialogOpen}>
	<Dialog.Content class="sm:max-w-[525px]">
		<Dialog.Header>
			<Dialog.Title>Rejeter la transformation</Dialog.Title>
			<Dialog.Description>
				Veuillez fournir une raison pour le rejet de cette transformation. Cela aidera à améliorer
				le processus de migration.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<!-- Reason Input -->
			<div class="grid gap-2">
				<Label for="reject-reason">Raison du rejet</Label>
				<Textarea
					id="reject-reason"
					bind:value={rejectReason}
					placeholder="Décrivez le problème ou la raison du rejet..."
					rows={5}
					class="resize-none"
				/>
				<p class="text-xs text-muted-foreground">Minimum 1 caractère requis</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleCancel}>Annuler</Button>
			<Button variant="destructive" onclick={handleRejectSubmit} disabled={!isRejectValid}>
				<XCircle class="mr-2 h-4 w-4" />
				Confirmer le rejet
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
