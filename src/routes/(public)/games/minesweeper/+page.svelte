<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { minesweeperStore } from '$lib/stores/minesweeper.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import MinesweeperBoard from '$lib/components/game/minesweeper/MinesweeperBoard.svelte';
	import GameControls from '$lib/components/game/minesweeper/GameControls.svelte';
	import DifficultySelector from '$lib/components/game/minesweeper/DifficultySelector.svelte';
	import SavedGameInfo from '$lib/components/game/minesweeper/SavedGameInfo.svelte';
	import PremiumBanner from '$lib/components/game/minesweeper/PremiumBanner.svelte';
	import AchievementToast from '$lib/components/game/minesweeper/AchievementToast.svelte';
	import type { PageData } from './$types';
	import type { GameState, Difficulty } from '$lib/types/minesweeper';

	let { data }: { data: PageData } = $props();

	// Game state
	let gameStarted = $state(false);
	let selectedDifficulty = $state<Difficulty>('beginner');
	let savedGame = $state<GameState | null>(null);
	let isLoadingSavedGame = $state(false);

	// Initialize store and load saved game on mount
	onMount(async () => {
		if (data.isAuthenticated && data.user && data.profile && data.supabase) {
			// Initialize store with Supabase client
			minesweeperStore.init(data.supabase, data.profile);

			// Try to load saved game
			isLoadingSavedGame = true;
			try {
				await minesweeperStore.loadSavedGame();
				// Check if a saved game was loaded
				if (
					minesweeperStore.currentGame &&
					minesweeperStore.currentGame.status === 'in_progress'
				) {
					savedGame = minesweeperStore.currentGame;
					// Reset the current game so we stay on menu
					minesweeperStore.currentGame = null;
				}
			} catch (error) {
				console.error('Failed to load saved game:', error);
			} finally {
				isLoadingSavedGame = false;
			}
		} else {
			// Initialize store for public users (no Supabase)
			minesweeperStore.init(null, null);

			// Try to load from localStorage
			isLoadingSavedGame = true;
			try {
				await minesweeperStore.loadSavedGame();
				if (
					minesweeperStore.currentGame &&
					minesweeperStore.currentGame.status === 'in_progress'
				) {
					savedGame = minesweeperStore.currentGame;
					// Reset the current game so we stay on menu
					minesweeperStore.currentGame = null;
				}
			} catch (error) {
				console.error('Failed to load saved game from localStorage:', error);
			} finally {
				isLoadingSavedGame = false;
			}
		}
	});

	// Handle difficulty selection (just update the selected difficulty)
	function handleDifficultySelect(difficulty: Difficulty) {
		selectedDifficulty = difficulty;
	}

	// Start a new game
	async function startNewGame() {
		gameStarted = true;
		await minesweeperStore.startNewGame(selectedDifficulty);
	}

	// Continue saved game
	function continueGame() {
		if (savedGame) {
			gameStarted = true;
			minesweeperStore.currentGame = savedGame;
			savedGame = null;
		}
	}

	// Return to menu
	function backToMenu() {
		gameStarted = false;
		savedGame = null;
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
					<!-- Difficulty selector with cards -->
					<DifficultySelector
						selected={selectedDifficulty}
						onSelect={handleDifficultySelect}
						disabled={minesweeperStore.isLoading || isLoadingSavedGame}
					/>

					<Separator />

					<!-- Game launch section -->
					<div class="space-y-4">
						<h3 class="text-sm font-medium text-foreground">Lancer une partie</h3>

						<!-- Saved game info (if exists) -->
						{#if savedGame}
							<SavedGameInfo {savedGame} />
						{/if}

						<!-- Launch buttons -->
						<div class="flex flex-col gap-3 sm:flex-row">
							<!-- New game button (always visible) -->
							<Button
								onclick={startNewGame}
								class="flex-1"
								disabled={minesweeperStore.isLoading || isLoadingSavedGame}
							>
								{#if minesweeperStore.isLoading}
									Création...
								{:else}
									Nouvelle partie
								{/if}
							</Button>

							<!-- Continue game button (only if saved game exists) -->
							{#if savedGame}
								<Button
									onclick={continueGame}
									variant="secondary"
									class="flex-1"
									disabled={minesweeperStore.isLoading || isLoadingSavedGame}
								>
									{#if isLoadingSavedGame}
										Chargement...
									{:else}
										Continuer la partie
									{/if}
								</Button>
							{/if}
						</div>
					</div>

					{#if data.isAuthenticated}
						<!-- Links to stats, achievements, and leaderboard -->
						<div>
							<Separator />
							<div class="space-y-2 pt-6">
								<h3 class="mb-3 text-sm font-medium text-foreground">Mes statistiques</h3>
								<a href="/dashboard/student/minesweeper/stats" class="block">
									<Button variant="outline" class="w-full justify-start">
										<span class="mr-2">📊</span>
										Voir mes statistiques
									</Button>
								</a>
								<a href="/dashboard/student/minesweeper/achievements" class="block">
									<Button variant="outline" class="w-full justify-start">
										<span class="mr-2">🏅</span>
										Mes succès
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

<!-- Achievement toasts (display when achievements are unlocked) -->
{#each minesweeperStore.newlyUnlockedAchievements as achievement, index (achievement.achievement_id + (achievement.difficulty || ''))}
	<AchievementToast
		{achievement}
		onClose={() => {
			// Remove this achievement from the list
			const achievements = [...minesweeperStore.newlyUnlockedAchievements];
			achievements.splice(index, 1);
			minesweeperStore.newlyUnlockedAchievements = achievements;
		}}
		autoDismiss={5000}
	/>
{/each}

<style>
	:global(:root) {
		--font-scale: 1;
	}
</style>
