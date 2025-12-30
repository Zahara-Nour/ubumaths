<script lang="ts">
	/**
	 * Campus Game Page
	 *
	 * A dice-based board game where players flip numbered tokens.
	 * The goal is to flip all tokens using as few dice rolls as possible.
	 *
	 * Game Rules:
	 * - Roll two dice to get available points
	 * - Select tokens whose sum <= available points
	 * - Doubles give double points (max 20)
	 * - Chain reaction (B2): If one number token remains on an alignment, it flips automatically
	 * - Stars (25 pts) only flip via chain reaction
	 */

	import { Button } from '$lib/components/ui/button';
	import { Dices, RotateCcw, Trophy, ArrowRight, Star, Home, Upload, Medal } from 'lucide-svelte';
	import confetti from 'canvas-confetti';
	import { game } from './game.svelte';
	import { GRID_SIZE, type Token, type ChainReactionStep } from './types';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';

	// Props
	let { data }: { data: PageData } = $props();

	// Check if user is authenticated
	const isAuthenticated = $derived(!!data.user);

	// Animation state
	let isRolling = $state(false);
	let diceAnimation = $state({ die1: 1, die2: 1 });
	let showChainHighlight = $state<{ row: number; col: number }[]>([]);

	// Leaderboard state
	let isSubmitting = $state(false);
	let scoreSubmitted = $state(false);
	let submittedRank = $state<number | null>(null);

	/**
	 * Effect: Trigger confetti animation on win
	 */
	$effect(() => {
		if (game.hasWon) {
			confetti({
				particleCount: 150,
				spread: 100,
				origin: { y: 0.6 },
				colors: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
			});
		}
	});

	/**
	 * Start a new game
	 */
	function handleNewGame() {
		game.startNewGame();
		scoreSubmitted = false;
		submittedRank = null;
	}

	/**
	 * Roll the dice with animation
	 */
	async function handleRoll() {
		if (game.status !== 'rolling') return;

		isRolling = true;

		// Animate dice rolling
		const animationDuration = 500;
		const interval = 50;
		const iterations = animationDuration / interval;

		for (let i = 0; i < iterations; i++) {
			diceAnimation = {
				die1: Math.floor(Math.random() * 6) + 1,
				die2: Math.floor(Math.random() * 6) + 1
			};
			await new Promise((r) => setTimeout(r, interval));
		}

		// Get actual roll result
		const roll = game.roll();
		diceAnimation = { die1: roll.die1, die2: roll.die2 };
		isRolling = false;
	}

	/**
	 * Handle token click
	 */
	function handleTokenClick(row: number, col: number) {
		if (game.status !== 'selecting') return;
		game.toggleSelection(row, col);
	}

	/**
	 * Confirm selection and handle chain reactions
	 */
	async function handleConfirm() {
		if (game.selectedPositions.length === 0) {
			// Pass turn
			await game.passTurn();
			return;
		}

		const steps = await game.confirmSelection();
		await animateChainReactions(steps);
	}

	/**
	 * Pass turn (use no points)
	 */
	async function handlePass() {
		await game.passTurn();
	}

	/**
	 * Animate chain reactions
	 */
	async function animateChainReactions(steps: ChainReactionStep[]) {
		for (let i = 0; i < steps.length; i++) {
			showChainHighlight = steps[i].positions;

			// Wait for animation
			await new Promise((r) => setTimeout(r, 600));
		}

		showChainHighlight = [];
	}

	/**
	 * Submit score to leaderboard
	 */
	async function handleSubmitScore() {
		if (!isAuthenticated || isSubmitting || scoreSubmitted) return;

		isSubmitting = true;

		try {
			const response = await fetch('/api/games/campus/score', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					rollCount: game.rollCount,
					totalPointsUsed: game.totalPointsUsed
				})
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la soumission');
			}

			const result = await response.json();
			scoreSubmitted = true;
			submittedRank = result.rank;
			toaster.success(`Score enregistré ! Rang : ${result.rank}`);
		} catch {
			toaster.error('Erreur lors de la soumission du score');
		} finally {
			isSubmitting = false;
		}
	}

	/**
	 * Check if a position is selected
	 */
	function isSelected(row: number, col: number): boolean {
		return game.selectedPositions.some((p) => p.row === row && p.col === col);
	}

	/**
	 * Check if a position is highlighted by chain reaction
	 */
	function isChainHighlighted(row: number, col: number): boolean {
		return showChainHighlight.some((p) => p.row === row && p.col === col);
	}

	/**
	 * Get token display class
	 */
	function getTokenClass(token: Token, row: number, col: number): string {
		const classes = ['token'];

		if (token.flipped) {
			classes.push('flipped');
		} else {
			if (token.type === 'star') {
				classes.push('star');
			}
			if (isSelected(row, col)) {
				classes.push('selected');
			}
			if (isChainHighlighted(row, col)) {
				classes.push('chain-highlight');
			}
		}

		return classes.join(' ');
	}

	/**
	 * Get dice face display
	 */
	function getDiceFace(value: number): string {
		const faces = ['', '\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'];
		return faces[value] || '\u2680';
	}
</script>

<svelte:head>
	<title>Campus - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<a href="/games" class="flex items-center gap-2 text-muted-foreground hover:text-foreground">
			<Home class="h-5 w-5" />
			<span class="text-sm">Jeux</span>
		</a>
		<h1 class="text-2xl font-bold">Campus</h1>
		<Button variant="ghost" size="icon" onclick={handleNewGame} title="Nouvelle partie">
			<RotateCcw class="h-5 w-5" />
		</Button>
	</div>

	<!-- Game not started -->
	{#if game.status === 'not_started'}
		<div class="flex flex-col items-center justify-center gap-6 py-12">
			<div class="text-center">
				<h2 class="mb-2 text-xl font-semibold">Bienvenue dans Campus !</h2>
				<p class="max-w-md text-muted-foreground">
					Retournez tous les jetons en utilisant le moins de lancers de dés possible. La somme des
					jetons choisis doit être inférieure ou égale aux points des dés.
				</p>
			</div>

			<div class="rounded-lg bg-muted p-4 text-sm">
				<h3 class="mb-2 font-semibold">Règles spéciales :</h3>
				<ul class="list-inside list-disc space-y-1 text-muted-foreground">
					<li><strong>Double</strong> : Points doublés (max 20)</li>
					<li>
						<strong>Réaction en chaîne</strong> : Si un seul jeton reste sur une ligne/colonne/diagonale,
						il se retourne automatiquement
					</li>
					<li><strong>Étoiles</strong> : Se retournent uniquement par réaction en chaîne</li>
				</ul>
			</div>

			<Button size="lg" onclick={handleNewGame} class="gap-2">
				<Dices class="h-5 w-5" />
				Commencer
			</Button>
		</div>

		<!-- Game in progress or won -->
	{:else}
		<!-- Stats bar -->
		<div class="mb-4 flex justify-around rounded-lg bg-muted p-3 text-sm">
			<div class="text-center">
				<div class="text-muted-foreground">Lancers</div>
				<div class="text-xl font-bold">{game.rollCount}</div>
			</div>
			<div class="text-center">
				<div class="text-muted-foreground">Points utilisés</div>
				<div class="text-xl font-bold">{game.totalPointsUsed}</div>
			</div>
			<div class="text-center">
				<div class="text-muted-foreground">Restants</div>
				<div class="text-xl font-bold">{game.unflippedCount}</div>
			</div>
		</div>

		<!-- Dice section -->
		{#if game.status !== 'won'}
			<div class="mb-4 flex flex-col items-center gap-3">
				<!-- Dice display -->
				<div class="flex items-center gap-4">
					<span class="text-5xl transition-transform duration-100" class:animate-bounce={isRolling}>
						{getDiceFace(diceAnimation.die1)}
					</span>
					<span class="text-5xl transition-transform duration-100" class:animate-bounce={isRolling}>
						{getDiceFace(diceAnimation.die2)}
					</span>
				</div>

				<!-- Roll button or points info -->
				{#if game.status === 'rolling'}
					<Button onclick={handleRoll} disabled={isRolling} class="gap-2">
						<Dices class="h-4 w-4" />
						{isRolling ? 'Lancement...' : 'Lancer les dés'}
					</Button>
				{:else if game.currentRoll}
					<div class="text-center">
						<div class="text-lg font-semibold">
							{#if game.currentRoll.isDouble}
								<span class="text-amber-500">Double !</span>
							{/if}
							Points disponibles :
							<span class="text-primary">{game.currentRoll.availablePoints}</span>
						</div>
						{#if game.selectedPositions.length > 0}
							<div class="text-sm text-muted-foreground">
								Sélection : {game.selectedSum} / {game.pointsRemaining}
								{#if game.isSelectionValid}
									<span class="text-green-500">✓</span>
								{:else}
									<span class="text-red-500">✗</span>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Game board -->
		<div class="mb-4 flex justify-center">
			<div
				class="grid gap-1"
				style="grid-template-columns: repeat({GRID_SIZE}, minmax(0, 1fr)); width: min(100%, 360px);"
			>
				{#each game.grid as row, rowIndex (rowIndex)}
					{#each row as token, colIndex (`${rowIndex}-${colIndex}`)}
						<button
							class={getTokenClass(token, rowIndex, colIndex)}
							onclick={() => handleTokenClick(rowIndex, colIndex)}
							disabled={token.flipped || token.type === 'star' || game.status !== 'selecting'}
							aria-label={token.flipped
								? 'Jeton retourné'
								: token.type === 'star'
									? 'Étoile'
									: `Jeton ${token.value}`}
						>
							{#if !token.flipped}
								{#if token.type === 'star'}
									<Star class="h-5 w-5 fill-amber-400 text-amber-400" />
								{:else}
									{token.value}
								{/if}
							{/if}
						</button>
					{/each}
				{/each}
			</div>
		</div>

		<!-- Action buttons -->
		{#if game.status === 'selecting'}
			<div class="flex justify-center gap-3">
				<Button variant="outline" onclick={handlePass}>Passer</Button>
				<Button onclick={handleConfirm} disabled={!game.isSelectionValid} class="gap-2">
					<ArrowRight class="h-4 w-4" />
					Confirmer
				</Button>
			</div>
		{/if}

		<!-- Win screen -->
		{#if game.status === 'won'}
			<div
				class="mt-6 flex flex-col items-center gap-4 rounded-lg bg-green-50 p-6 dark:bg-green-950"
			>
				<Trophy class="h-12 w-12 text-amber-500" />
				<h2 class="text-2xl font-bold text-green-700 dark:text-green-300">Bravo !</h2>
				<div class="text-center">
					<p class="text-muted-foreground">Vous avez retourné tous les jetons en</p>
					<p class="text-xl font-semibold">
						{game.rollCount} lancer{game.rollCount > 1 ? 's' : ''} ({game.totalPointsUsed} points)
					</p>
					<p class="mt-2 text-muted-foreground">
						Score : <span class="font-bold">{game.score}</span>
					</p>
				</div>

				<!-- Leaderboard submission -->
				{#if isAuthenticated}
					{#if scoreSubmitted}
						<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
							<Medal class="h-5 w-5" />
							<span>Score enregistré ! Rang : {submittedRank}</span>
						</div>
					{:else}
						<Button
							variant="secondary"
							onclick={handleSubmitScore}
							disabled={isSubmitting}
							class="gap-2"
						>
							<Upload class="h-4 w-4" />
							{isSubmitting ? 'Envoi...' : 'Enregistrer au classement'}
						</Button>
					{/if}
				{:else}
					<p class="text-sm text-muted-foreground">
						<a href="/auth/login" class="text-primary underline">Connectez-vous</a> pour enregistrer
						votre score au classement.
					</p>
				{/if}

				<Button onclick={handleNewGame} class="gap-2">
					<RotateCcw class="h-4 w-4" />
					Rejouer
				</Button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.token {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: 600;
		border-radius: 0.375rem;
		border: 2px solid transparent;
		background-color: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.token:hover:not(:disabled) {
		transform: scale(1.05);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.token:disabled {
		cursor: default;
	}

	.token.flipped {
		background-color: hsl(var(--muted));
		color: transparent;
		cursor: default;
	}

	.token.star {
		background-color: hsl(var(--warning, 45 93% 47%));
		cursor: not-allowed;
	}

	.token.selected {
		border-color: hsl(var(--ring));
		box-shadow: 0 0 0 3px hsl(var(--ring) / 0.3);
		transform: scale(1.05);
	}

	.token.chain-highlight {
		animation: chain-pulse 0.5s ease-in-out;
		background-color: hsl(var(--destructive));
	}

	@keyframes chain-pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
	}

	/* Responsive font size for tokens */
	@media (max-width: 400px) {
		.token {
			font-size: 0.875rem;
		}
	}
</style>
