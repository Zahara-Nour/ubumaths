<!--
	Réinitialisation du mot de passe d'un élève par le prof (PR 3)
	==============================================================

	Bouton → confirmation → mot de passe provisoire affiché UNE fois (copier). L'élève est
	déconnecté et devra choisir le sien à la connexion suivante. Rien n'est gardé : fermer
	la fenêtre ou changer d'élève efface le mot de passe affiché.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Copy, KeyRound, Loader2 } from '@lucide/svelte';

	let { studentId, studentName }: { studentId: string; studentName: string } = $props();

	let open = $state(false);
	let isResetting = $state(false);
	let password = $state<string | null>(null);

	function onOpenChange(next: boolean) {
		open = next;
		if (!next) password = null;
	}

	async function resetPassword() {
		if (isResetting) return;
		isResetting = true;
		try {
			const response = await fetch(`/api/admin/users/${studentId}/password`, { method: 'POST' });
			const body: unknown = await response.json().catch(() => null);
			if (!response.ok) {
				const message =
					body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
						? body.message
						: 'Le mot de passe n’a pas pu être réinitialisé.';
				toaster.error(message);
				return;
			}
			if (
				body &&
				typeof body === 'object' &&
				'password' in body &&
				typeof body.password === 'string'
			) {
				password = body.password;
			}
		} catch {
			toaster.error('Le mot de passe n’a pas pu être réinitialisé.');
		} finally {
			isResetting = false;
		}
	}

	async function copyPassword() {
		if (!password) return;
		try {
			await navigator.clipboard.writeText(password);
			toaster.success('Mot de passe copié');
		} catch {
			toaster.error('Copie impossible : le recopier à la main.');
		}
	}
</script>

<div class="space-y-2">
	<Label class="text-sm font-medium text-muted-foreground">Mot de passe</Label>
	<div>
		<Button variant="outline" size="sm" onclick={() => onOpenChange(true)}>
			<KeyRound class="mr-2 h-4 w-4" aria-hidden="true" />
			Réinitialiser le mot de passe
		</Button>
	</div>
</div>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Réinitialiser le mot de passe</Dialog.Title>
			<Dialog.Description>
				{#if password}
					Mot de passe provisoire de {studentName}. Il ne sera plus affiché : le noter ou le copier
					maintenant.
				{:else}
					{studentName} recevra un mot de passe provisoire, sera déconnecté partout et devra en choisir
					un nouveau à sa prochaine connexion.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if password}
			<div class="flex items-center gap-2">
				<code class="flex-1 rounded-md bg-muted px-3 py-2 text-center font-mono text-lg">
					{password}
				</code>
				<Button variant="outline" size="icon" onclick={copyPassword} aria-label="Copier">
					<Copy class="h-4 w-4" aria-hidden="true" />
				</Button>
			</div>
			<Dialog.Footer>
				<Button onclick={() => onOpenChange(false)}>Fermer</Button>
			</Dialog.Footer>
		{:else}
			<Dialog.Footer>
				<Button variant="outline" onclick={() => onOpenChange(false)} disabled={isResetting}>
					Annuler
				</Button>
				<Button onclick={resetPassword} disabled={isResetting}>
					{#if isResetting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
					{/if}
					Réinitialiser
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
