<script lang="ts">
	import { onDestroy } from 'svelte';
	import { minesweeperStore } from '$lib/stores/minesweeper.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import MinesweeperBoard from '$lib/components/game/minesweeper/MinesweeperBoard.svelte';
	import GameControls from '$lib/components/game/minesweeper/GameControls.svelte';
	import DifficultySelector from '$lib/components/game/minesweeper/DifficultySelector.svelte';
	import PremiumBanner from '$lib/components/game/minesweeper/PremiumBanner.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Game state
	let gameStarted = $state(false);
	let selectedDifficulty = $state<'beginner' | 'intermediate' | 'expert'>('beginner');

	// Initialize store on mount
	$effect(() => {
		if (data.isAuthenticated && data.user && data.profile) {
			// We'll initialize with supabase when needed in component
			gameStarted = false;
		}
	});

	// Handle difficulty selection
	function handleDifficultySelect(difficulty: 'beginner' | 'intermediate' | 'expert') {
		selectedDifficulty = difficulty;
		startNewGame();
	}

	// Start a new game
	async function startNewGame() {
		gameStarted = true;
		await minesweeperStore.startNewGame(selectedDifficulty);
	}

	// Resume saved game (for authenticated users)
	async function resumeGame() {
		gameStarted = true;
		await minesweeperStore.loadSavedGame();
	}

	// Return to menu
	function backToMenu() {
		gameStarted = false;
		minesweeperStore.cleanup();
	}

	// Cleanup on component destroy
	onDestroy(() => {
		minesweeperStore.cleanup();
	});
</script>

<svelte:head>
	<title>Démineur - UbuMaths</title>
	<meta name="description" content="Jouez au Démineur sur UbuMaths et gagnez des gidouilles !" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
	<div class="mx-auto max-w-6xl">
		<!-- Show premium banner if not authenticated -->
		{#if !data.isAuthenticated}
			<PremiumBanner />
		{/if}

		<!-- Game Interface -->
		{#if gameStarted && minesweeperStore.currentGame}
			<div class="space-y-6">
				<!-- Header with back button and game info -->
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl md:text-4xl font-bold text-foreground">Démineur</h1>
						<p class="text-sm text-muted-foreground mt-1">
							Difficulté: <span class="font-semibold capitalize">
								{#if minesweeperStore.currentGame.difficulty === 'beginner'}
									Facile
								{:else if minesweeperStore.currentGame.difficulty === 'intermediate'}
									Intermédiaire
								{:else}
									Difficile
								{/if}
							</span>
						</p>
					</div>
					<Button
						onclick={backToMenu}
						variant="outline"
						class="text-destructive hover:bg-destructive/10"
					>
						Retour au menu
					</Button>
				</div>

				<Separator />

				<!-- Game board and controls in responsive layout -->
				<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
					<!-- Board (main area) -->
					<div class="lg:col-span-3">
						<Card class="p-6">
							<div class="flex justify-center">
								<MinesweeperBoard game={minesweeperStore.currentGame} />
							</div>
						</Card>
					</div>

					<!-- Controls (sidebar) -->
					<div class="space-y-4">
						<GameControls game={minesweeperStore.currentGame} />
					</div>
				</div>

				<!-- Error message if any -->
				{#if minesweeperStore.error}
					<Card class="border-destructive bg-destructive/10 p-4">
						<p class="text-destructive text-sm">{minesweeperStore.error}</p>
					</Card>
				{/if}
			</div>
		{:else}
			<!-- Menu (difficulty selection) -->
			<div class="max-w-2xl mx-auto space-y-8">
				<div class="text-center space-y-3">
					<h1 class="text-4xl md:text-5xl font-bold text-foreground">Démineur</h1>
					<p class="text-muted-foreground text-lg">
						Révélez les cellules sans faire exploser les mines!
					</p>
				</div>

				<Card class="p-8 space-y-6">
					<div>
						<h2 class="text-xl font-semibold text-foreground mb-4">Choisir la difficulté</h2>
						<DifficultySelector
							selected={selectedDifficulty}
							onChange={handleDifficultySelect}
							disabled={minesweeperStore.isLoading}
						/>
					</div>

					{#if data.isAuthenticated}
						<div>
							<Separator />
							<div class="mt-6 pt-6 border-t">
								<h3 class="text-sm font-semibold text-foreground mb-3">Continuer une partie</h3>
								<Button
									onclick={resumeGame}
									variant="outline"
									class="w-full"
									disabled={minesweeperStore.isLoading}
								>
									{#if minesweeperStore.isLoading}
										Chargement...
									{:else}
										Charger la partie sauvegardée
									{/if}
								</Button>
								<p class="text-xs text-muted-foreground mt-2">
									Reprendre votre dernière partie en cours
								</p>
							</div>
						</div>

						<!-- Links to stats and leaderboard -->
						<div>
							<Separator />
							<div class="mt-6 pt-6 border-t space-y-2">
								<h3 class="text-sm font-semibold text-foreground mb-3">Mes statistiques</h3>
								<a href="/dashboard/student/minesweeper/stats" class="block">
									<Button variant="outline" class="w-full justify-start">
										<span class="mr-2">📊</span>
										Voir mes statistiques
									</Button>
								</a>
								<a href="/dashboard/student/minesweeper/leaderboard" class="block">
									<Button variant="outline" class="w-full justify-start">
										<span class="mr-2">🏆</span>
										Classement global
									</Button>
								</a>
							</div>
						</div>
					{/if}

					<!-- Error message if any -->
					{#if minesweeperStore.error}
						<Card class="border-destructive bg-destructive/10 p-4">
							<p class="text-destructive text-sm">{minesweeperStore.error}</p>
						</Card>
					{/if}
				</Card>

				<!-- Rules -->
				<Card class="p-6 bg-muted/50">
					<h3 class="font-semibold text-foreground mb-3">Règles du jeu</h3>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex gap-3">
							<span>👆</span>
							<span>Cliquez sur une cellule pour la révéler</span>
						</li>
						<li class="flex gap-3">
							<span>🚩</span>
							<span>Clic droit pour marquer/démarquer une mine</span>
						</li>
						<li class="flex gap-3">
							<span>💥</span>
							<span>Si vous révélez une mine, vous perdez!</span>
						</li>
						<li class="flex gap-3">
							<span>🎯</span>
							<span>Révélez toutes les cellules sans mines pour gagner</span>
						</li>
						<li class="flex gap-3">
							<span>⏱️</span>
							<span>Votre temps sera enregistré à la fin du jeu</span>
						</li>
					</ul>
				</Card>
			</div>
		{/if}
	</div>
</main>

<style>
	:global(:root) {
		--font-scale: 1;
	}
</style>
