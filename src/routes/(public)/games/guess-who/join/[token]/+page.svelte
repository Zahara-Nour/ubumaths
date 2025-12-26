<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isJoining = $state(false);
	let hasAttemptedJoin = $state(false);

	/**
	 * Auto-join if authenticated, otherwise wait for user action
	 */
	onMount(() => {
		if (data.isAuthenticated && !hasAttemptedJoin) {
			handleJoinGame();
		}
	});

	/**
	 * Join the game via API
	 */
	async function handleJoinGame() {
		if (!data.isAuthenticated) {
			// Redirect to login with the join URL as redirect target
			goto(`/auth/login?redirect=/games/guess-who/join/${data.token}`);
			return;
		}

		hasAttemptedJoin = true;
		isJoining = true;

		try {
			const response = await fetch('/api/games/guess-who/join', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token: data.token })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Erreur lors de la connexion à la partie');
			}

			const result = await response.json();

			// Redirect to the game page
			toaster.success('Partie rejointe ! La partie commence maintenant.');
			goto(`/games/guess-who/${result.game.id}`);
		} catch (error) {
			console.error('Failed to join game:', error);
			toaster.error(
				error instanceof Error ? error.message : 'Erreur lors de la connexion à la partie'
			);
			isJoining = false;
			hasAttemptedJoin = false;
		}
	}
</script>

<svelte:head>
	<title>Rejoindre une partie - Devine Qui Math</title>
</svelte:head>

<main
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4"
>
	<Card class="w-full max-w-md space-y-6 p-8">
		{#if isJoining}
			<!-- Loading State -->
			<div class="text-center">
				<div class="mb-4 text-6xl">⏳</div>
				<h2 class="mb-2 text-2xl font-semibold text-foreground">Connexion en cours...</h2>
				<p class="text-sm text-muted-foreground">
					Veuillez patienter pendant que nous vous connectons à la partie.
				</p>
			</div>
		{:else if !data.isAuthenticated}
			<!-- Not Authenticated -->
			<div class="space-y-4 text-center">
				<div class="text-6xl">🎮</div>
				<h2 class="text-2xl font-semibold text-foreground">Rejoindre la partie</h2>
				<p class="text-sm text-muted-foreground">
					Vous avez été invité à une partie de Devine Qui Math. Connectez-vous pour commencer à
					jouer !
				</p>
				<Button onclick={handleJoinGame} class="w-full">Se connecter et rejoindre</Button>
			</div>
		{:else}
			<!-- Authenticated but error occurred -->
			<div class="space-y-4 text-center">
				<div class="text-6xl">⚠️</div>
				<h2 class="text-2xl font-semibold text-foreground">Erreur</h2>
				<p class="text-sm text-muted-foreground">
					Une erreur s'est produite lors de la tentative de connexion à la partie.
				</p>
				<div class="flex flex-col gap-2">
					<Button onclick={handleJoinGame} class="w-full">Réessayer</Button>
					<Button variant="outline" onclick={() => goto('/games/guess-who')} class="w-full">
						Retour à l'accueil
					</Button>
				</div>
			</div>
		{/if}
	</Card>
</main>
