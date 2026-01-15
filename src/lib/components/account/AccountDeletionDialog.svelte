<script lang="ts">
	/**
	 * Account Deletion Dialog
	 * ========================
	 *
	 * GDPR Art. 17 compliant account deletion UI.
	 *
	 * Features:
	 * - Multi-step confirmation process
	 * - Requires typing exact confirmation phrase
	 * - Shows what will be deleted
	 * - Handles loading and error states
	 * - Redirects to home on success
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AlertTriangle, Loader2, Trash2, X } from 'lucide-svelte';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}

	let { open = $bindable(), onOpenChange }: Props = $props();

	// Confirmation phrase (must match server-side)
	const CONFIRMATION_PHRASE = 'SUPPRIMER MON COMPTE';

	// Component state
	let step = $state<'warning' | 'confirm'>('warning');
	let confirmationInput = $state('');
	let isDeleting = $state(false);
	let error = $state<string | null>(null);

	// Validation
	const isConfirmationValid = $derived(confirmationInput === CONFIRMATION_PHRASE);

	// Reset state when dialog closes
	$effect(() => {
		if (!open) {
			step = 'warning';
			confirmationInput = '';
			error = null;
			isDeleting = false;
		}
	});

	function handleClose() {
		onOpenChange(false);
	}

	function proceedToConfirmation() {
		step = 'confirm';
		error = null;
	}

	async function handleDeleteAccount() {
		if (!isConfirmationValid || isDeleting) return;

		isDeleting = true;
		error = null;

		try {
			const response = await fetch('/api/account/delete', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ confirmation: CONFIRMATION_PHRASE })
			});

			const data = await response.json();

			if (!response.ok) {
				if (response.status === 429) {
					error = 'Vous avez deja fait une demande de suppression. Reessayez dans 24 heures.';
				} else {
					error = data.message || 'Une erreur est survenue. Veuillez reessayer.';
				}
				return;
			}

			// Success - close dialog and redirect
			toaster.success('Votre compte a ete supprime avec succes.');
			handleClose();

			// Redirect to home after a short delay
			setTimeout(() => {
				goto(resolve('/'), { replaceState: true, invalidateAll: true });
			}, 500);
		} catch (err) {
			console.error('Account deletion error:', err);
			error = 'Une erreur reseau est survenue. Verifiez votre connexion.';
		} finally {
			isDeleting = false;
		}
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		{#if step === 'warning'}
			<!-- Step 1: Warning -->
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2 text-destructive">
					<AlertTriangle class="h-5 w-5" />
					Supprimer votre compte
				</Dialog.Title>
				<Dialog.Description>
					Cette action est irreversible. Toutes vos donnees seront definitivement supprimees.
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<div class="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
					<h4 class="mb-2 font-medium text-destructive">Ce qui sera supprime :</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li>• Votre profil et informations personnelles</li>
						<li>• Votre historique de progression</li>
						<li>• Vos messages et conversations</li>
						<li>• Vos fichiers et pieces jointes</li>
						<li>• Vos recompenses et inventaire</li>
					</ul>
				</div>

				<p class="text-sm text-muted-foreground">
					Conformement au RGPD (Article 17), vous avez le droit de demander la suppression de vos
					donnees personnelles. Cette suppression sera effective immediatement.
				</p>
			</div>

			<Dialog.Footer class="flex-col gap-2 sm:flex-row">
				<Button variant="outline" onclick={handleClose} class="w-full sm:w-auto">
					<X class="mr-2 h-4 w-4" />
					Annuler
				</Button>
				<Button variant="destructive" onclick={proceedToConfirmation} class="w-full sm:w-auto">
					Je comprends, continuer
				</Button>
			</Dialog.Footer>
		{:else}
			<!-- Step 2: Confirmation -->
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2 text-destructive">
					<Trash2 class="h-5 w-5" />
					Confirmer la suppression
				</Dialog.Title>
				<Dialog.Description>
					Pour confirmer la suppression definitive de votre compte, veuillez saisir la phrase
					ci-dessous.
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<div class="rounded-lg border bg-muted/50 p-3 text-center">
					<code class="text-sm font-semibold">{CONFIRMATION_PHRASE}</code>
				</div>

				<div class="space-y-2">
					<Label for="confirmation">Saisissez la phrase exacte :</Label>
					<Input
						id="confirmation"
						bind:value={confirmationInput}
						placeholder="Tapez la phrase ci-dessus"
						class={confirmationInput && !isConfirmationValid
							? 'border-destructive focus-visible:ring-destructive'
							: ''}
						disabled={isDeleting}
					/>
					{#if confirmationInput && !isConfirmationValid}
						<p class="text-xs text-destructive">La phrase ne correspond pas exactement.</p>
					{/if}
				</div>

				{#if error}
					<div class="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
						<p class="text-sm text-destructive">{error}</p>
					</div>
				{/if}
			</div>

			<Dialog.Footer class="flex-col gap-2 sm:flex-row">
				<Button
					variant="outline"
					onclick={() => (step = 'warning')}
					disabled={isDeleting}
					class="w-full sm:w-auto"
				>
					Retour
				</Button>
				<Button
					variant="destructive"
					onclick={handleDeleteAccount}
					disabled={!isConfirmationValid || isDeleting}
					class="w-full sm:w-auto"
				>
					{#if isDeleting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Suppression...
					{:else}
						<Trash2 class="mr-2 h-4 w-4" />
						Supprimer definitivement
					{/if}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
