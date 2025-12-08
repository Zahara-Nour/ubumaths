<!--
  Pending Approval Page

  Displayed to users who have signed up but are awaiting admin approval.
  Uses a modal dialog that logs out the user when clicking outside.
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Clock } from 'lucide-svelte';

	let isLoggingOut = $state(false);
	let dialogOpen = $state(true);

	async function handleLogout() {
		if (isLoggingOut) return;
		isLoggingOut = true;
		try {
			await fetch('/auth/logout', { method: 'POST' });
			await invalidateAll();
			await goto('/');
		} catch (error) {
			console.error('Logout failed:', error);
			// Fallback: reload the page to force logout
			window.location.href = '/';
		}
	}

	function handleInteractOutside(e: Event) {
		e.preventDefault();
		handleLogout();
	}

	function handleEscapeKeydown(e: KeyboardEvent) {
		e.preventDefault();
		handleLogout();
	}
</script>

<div class="min-h-screen bg-background">
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content
			showCloseButton={false}
			onInteractOutside={handleInteractOutside}
			onEscapeKeydown={handleEscapeKeydown}
			class="w-full max-w-md"
		>
			<Dialog.Header class="text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900"
				>
					<Clock class="h-8 w-8 text-amber-600 dark:text-amber-400" />
				</div>
				<Dialog.Title class="text-2xl">En attente d'approbation</Dialog.Title>
			</Dialog.Header>

			<div class="space-y-6 text-center">
				<Dialog.Description>
					Votre compte a été créé avec succès. Un administrateur doit approuver votre inscription
					avant que vous puissiez accéder à l'application.
				</Dialog.Description>

				<p class="text-sm text-muted-foreground">
					Vous recevrez une notification lorsque votre compte sera approuvé.
				</p>

				<p class="text-xs text-muted-foreground italic">
					Cliquez en dehors de cette fenêtre ou appuyez sur Échap pour vous déconnecter.
				</p>

				<Button onclick={handleLogout} variant="outline" class="w-full" disabled={isLoggingOut}>
					{isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
</div>
