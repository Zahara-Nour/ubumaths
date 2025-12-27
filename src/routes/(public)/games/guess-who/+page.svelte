<script lang="ts">
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import MySelect from '$lib/components/ui/my-select/MySelect.svelte';
	import { GAME_PACKS, type GamePackId } from '$lib/types/guess-who';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isCreating = $state(false);
	let selectedPackId = $state<GamePackId>('naturals_medium');

	// Convert GAME_PACKS to select items
	const packItems = Object.values(GAME_PACKS).map((pack) => ({
		value: pack.id,
		label: `${pack.nameFr} (${pack.level})`
	}));

	// Get description of selected pack
	const selectedPackDescription = $derived(GAME_PACKS[selectedPackId]?.descriptionFr ?? '');

	/**
	 * Create a new game
	 * Redirects to login if not authenticated, otherwise creates game and redirects to it
	 */
	async function handleCreateGame() {
		// Check authentication
		if (!data.isAuthenticated) {
			toaster.info('Connectez-vous pour créer une partie');
			goto('/auth/login?redirect=/games/guess-who');
			return;
		}

		isCreating = true;

		try {
			const response = await fetch('/api/games/guess-who/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ packId: selectedPackId })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Erreur lors de la création de la partie');
			}

			const result = await response.json();

			// Redirect to the game page
			toaster.success('Partie créée ! Partagez le lien pour inviter un joueur.');
			goto(`/games/guess-who/${result.game.id}`);
		} catch (error) {
			console.error('Failed to create game:', error);
			toaster.error(
				error instanceof Error ? error.message : 'Erreur lors de la création de la partie'
			);
		} finally {
			isCreating = false;
		}
	}
</script>

<svelte:head>
	<title>Devine Qui Math - UbuMaths</title>
	<meta
		name="description"
		content="Jouez à Devine Qui Math : un jeu de déduction mathématique en duo !"
	/>
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
	<div class="mx-auto max-w-4xl space-y-8">
		<!-- Header -->
		<div class="space-y-3 text-center">
			<h1 class="text-4xl font-bold text-foreground md:text-5xl">Devine Qui Math</h1>
			<p class="text-lg text-muted-foreground">
				Un jeu de déduction mathématique pour deux joueurs
			</p>
		</div>

		<!-- Main Card -->
		<Card class="space-y-6 p-8">
			<!-- Introduction -->
			<div class="space-y-3">
				<h2 class="text-2xl font-semibold text-foreground">Comment jouer ?</h2>
				<p class="text-muted-foreground">
					Chaque joueur a un nombre secret. Posez des questions mathématiques à votre adversaire
					pour deviner son nombre avant qu'il ne devine le vôtre ! Choisissez un pack adapté à votre
					niveau.
				</p>
			</div>

			<Separator />

			<!-- Available Packs -->
			<div class="space-y-4">
				<h3 class="text-xl font-semibold text-foreground">Packs disponibles</h3>
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each Object.values(GAME_PACKS) as pack (pack.id)}
						<div
							class="rounded-lg border p-3 transition-colors {selectedPackId === pack.id
								? 'border-primary bg-primary/5'
								: 'border-border'}"
						>
							<div class="mb-1 flex items-center justify-between">
								<span class="font-medium text-foreground">{pack.nameFr}</span>
								<span
									class="rounded-full px-2 py-0.5 text-xs {pack.level === 'CM1'
										? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
										: pack.level === 'CM2'
											? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
											: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}"
								>
									{pack.level}
								</span>
							</div>
							<p class="text-sm text-muted-foreground">{pack.descriptionFr}</p>
						</div>
					{/each}
				</div>
			</div>

			<Separator />

			<!-- Pack Selection & Create Game -->
			<div class="space-y-4">
				<div class="space-y-2">
					<label for="pack-select" class="text-sm font-medium text-foreground">
						Choisissez un pack de jeu
					</label>
					<MySelect
						type="single"
						bind:value={selectedPackId}
						items={packItems}
						placeholder="Sélectionner un pack..."
					/>
					{#if selectedPackDescription}
						<p class="text-sm text-muted-foreground">{selectedPackDescription}</p>
					{/if}
				</div>

				<div class="flex justify-center pt-2">
					<Button onclick={handleCreateGame} disabled={isCreating} class="px-8 py-6 text-lg">
						{#if isCreating}
							Création en cours...
						{:else}
							Créer une partie
						{/if}
					</Button>
				</div>
			</div>

			<Separator />

			<!-- Game Rules -->
			<div class="space-y-4">
				<h3 class="text-xl font-semibold text-foreground">Règles du jeu</h3>

				<div class="space-y-4">
					<!-- Setup -->
					<div>
						<h4 class="mb-2 font-medium text-foreground">Préparation</h4>
						<ul class="space-y-1.5 text-sm text-muted-foreground">
							<li class="flex gap-3">
								<span class="text-lg">1️⃣</span>
								<span>Créez une partie et partagez le lien avec votre adversaire</span>
							</li>
							<li class="flex gap-3">
								<span class="text-lg">2️⃣</span>
								<span>Chaque joueur reçoit une grille de 24 nombres et un nombre secret</span>
							</li>
							<li class="flex gap-3">
								<span class="text-lg">3️⃣</span>
								<span>Le nombre secret de chaque joueur est présent sur la grille commune</span>
							</li>
						</ul>
					</div>

					<!-- Gameplay -->
					<div>
						<h4 class="mb-2 font-medium text-foreground">Déroulement</h4>
						<ul class="space-y-1.5 text-sm text-muted-foreground">
							<li class="flex gap-3">
								<span class="text-lg">❓</span>
								<span
									>À votre tour, posez une question mathématique sur le nombre secret de votre
									adversaire (ex: "Est-il pair ?", "Est-il divisible par 3 ?")</span
								>
							</li>
							<li class="flex gap-3">
								<span class="text-lg">✅</span>
								<span>Votre adversaire répond par Oui ou Non</span>
							</li>
							<li class="flex gap-3">
								<span class="text-lg">🎯</span>
								<span>Si la réponse est correcte, vous gagnez un tour bonus</span>
							</li>
							<li class="flex gap-3">
								<span class="text-lg">🚫</span>
								<span
									>Éliminez les nombres impossibles sur votre grille en fonction des réponses</span
								>
							</li>
							<li class="flex gap-3">
								<span class="text-lg">💡</span>
								<span
									>Quand vous pensez avoir trouvé, faites une proposition finale (attention, une
									seule tentative !)</span
								>
							</li>
						</ul>
					</div>

					<!-- Victory Conditions -->
					<div>
						<h4 class="mb-2 font-medium text-foreground">Conditions de victoire</h4>
						<ul class="space-y-1.5 text-sm text-muted-foreground">
							<li class="flex gap-3">
								<span class="text-lg">🏆</span>
								<span>Devinez correctement le nombre secret de votre adversaire en premier</span>
							</li>
							<li class="flex gap-3">
								<span class="text-lg">💥</span>
								<span>Ou attendez que votre adversaire fasse une proposition incorrecte</span>
							</li>
							<li class="flex gap-3">
								<span class="text-lg">⏰</span>
								<span>Si un joueur abandonne ou se déconnecte, l'autre gagne automatiquement</span>
							</li>
						</ul>
					</div>
				</div>
			</div>

			<Separator />

			<!-- Questions Examples -->
			<div class="space-y-3">
				<h3 class="text-xl font-semibold text-foreground">Types de questions disponibles</h3>
				<div class="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
					<div class="flex gap-2">
						<span>•</span>
						<span>Est-il pair / impair ?</span>
					</div>
					<div class="flex gap-2">
						<span>•</span>
						<span>Est-il premier ?</span>
					</div>
					<div class="flex gap-2">
						<span>•</span>
						<span>Est-il un carré parfait ?</span>
					</div>
					<div class="flex gap-2">
						<span>•</span>
						<span>Est-il divisible par... ?</span>
					</div>
					<div class="flex gap-2">
						<span>•</span>
						<span>Est-il supérieur / inférieur à... ?</span>
					</div>
					<div class="flex gap-2">
						<span>•</span>
						<span>Son chiffre des unités / dizaines est-il... ?</span>
					</div>
					<div class="flex gap-2">
						<span>•</span>
						<span>La somme de ses chiffres est-elle... ?</span>
					</div>
				</div>
			</div>
		</Card>

		<!-- Strategy Tips -->
		<Card class="bg-muted/50 p-6">
			<h3 class="mb-3 font-semibold text-foreground">Conseils stratégiques</h3>
			<ul class="space-y-2 text-sm text-muted-foreground">
				<li class="flex gap-3">
					<span>💡</span>
					<span
						>Commencez par des questions qui éliminent environ la moitié des nombres (pair/impair,
						supérieur/inférieur à 50)</span
					>
				</li>
				<li class="flex gap-3">
					<span>💡</span>
					<span>Utilisez les questions sur les chiffres des unités et dizaines pour préciser</span>
				</li>
				<li class="flex gap-3">
					<span>💡</span>
					<span
						>N'oubliez pas de répondre honnêtement aux questions de votre adversaire (le jeu vérifie
						!)</span
					>
				</li>
				<li class="flex gap-3">
					<span>💡</span>
					<span>Ne devinez pas trop tôt : une proposition incorrecte vous fait perdre !</span>
				</li>
			</ul>
		</Card>
	</div>
</main>
