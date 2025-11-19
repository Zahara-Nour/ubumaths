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
			{@const game = minesweeperStore.currentGame}
			<div class="space-y-6">
				<!-- Header with back button and game info -->
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-foreground md:text-4xl">Démineur</h1>
						<p class="mt-1 text-sm text-muted-foreground">
							Difficulté: <span class="font-semibold capitalize">
								{#if game.difficulty === 'beginner'}
									Débutant
								{:else if game.difficulty === 'intermediate'}
									Intermédiaire
								{:else}
									Expert
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
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
					<!-- Board (main area) -->
					<div class="lg:col-span-3">
						<Card class="p-6">
							<div class="flex justify-center">
								<MinesweeperBoard
									difficulty={game.difficulty}
									gameState={game}
									onCellReveal={(row, col) => minesweeperStore.revealCell(row, col)}
									onCellFlag={(row, col) => minesweeperStore.toggleFlag(row, col)}
									onCellChord={(row, col) => minesweeperStore.chordClick(row, col)}
									disabled={game.status === 'won' || game.status === 'lost'}
								/>
							</div>
						</Card>
					</div>

					<!-- Controls (sidebar) -->
					<div class="space-y-4">
						<GameControls
							timeElapsed={game.timeElapsed}
							minesRemaining={game.minesCount - game.flagsUsed}
							gameStatus={game.status}
							onReset={() => startNewGame()}
							difficulty={game.difficulty}
							hintsUsed={game.hintsUsed || 0}
							onUseHint={() => minesweeperStore.useHint()}
							isAuthenticated={data.isAuthenticated}
							isLoading={minesweeperStore.isLoading}
						/>
					</div>
				</div>

				<!-- Error message if any -->
				{#if minesweeperStore.error}
					<Card class="border-destructive bg-destructive/10 p-4">
						<p class="text-sm text-destructive">{minesweeperStore.error}</p>
					</Card>
				{/if}
			</div>
		{:else}
			<!-- Menu (difficulty selection) -->
			<div class="mx-auto max-w-2xl space-y-8">
				<div class="space-y-3 text-center">
					<h1 class="text-4xl font-bold text-foreground md:text-5xl">Démineur</h1>
					<p class="text-lg text-muted-foreground">
						Révélez les cellules sans faire exploser les mines!
					</p>
				</div>

				<Card class="space-y-6 p-8">
					<div>
						<h2 class="mb-4 text-xl font-semibold text-foreground">Choisir la difficulté</h2>
						<DifficultySelector
							selected={selectedDifficulty}
							onChange={handleDifficultySelect}
							disabled={minesweeperStore.isLoading}
						/>
					</div>

					{#if data.isAuthenticated}
						<div>
							<Separator />
							<div class="mt-6 border-t pt-6">
								<h3 class="mb-3 text-sm font-semibold text-foreground">Continuer une partie</h3>
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
								<p class="mt-2 text-xs text-muted-foreground">
									Reprendre votre dernière partie en cours
								</p>
							</div>
						</div>

						<!-- Links to stats and leaderboard -->
						<div>
							<Separator />
							<div class="mt-6 space-y-2 border-t pt-6">
								<h3 class="mb-3 text-sm font-semibold text-foreground">Mes statistiques</h3>
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
							<p class="text-sm text-destructive">{minesweeperStore.error}</p>
						</Card>
					{/if}
				</Card>

				<!-- Rules -->
				<Card class="bg-muted/50 p-6">
					<h3 class="mb-3 font-semibold text-foreground">Règles du jeu</h3>
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
							<span>⚡</span>
							<span
								><strong>Révélation rapide :</strong> Shift+Clic ou clic molette sur une cellule révélée
								pour révéler tous les voisins si le nombre de drapeaux est correct</span
							>
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
