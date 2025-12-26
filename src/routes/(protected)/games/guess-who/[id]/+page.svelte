<script lang="ts">
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { WaitingScreen, GameScreen, ResultScreen } from '$lib/components/guess-who';
	import { Card } from '$lib/components/ui/card';
	import type { PageData } from './$types';
	import type {
		GuessWhoGame,
		GuessWhoMove,
		GameStatus,
		MoveType,
		QuestionType
	} from '$lib/types/guess-who';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	let { data }: { data: PageData } = $props();

	// Reactive game state
	let game = $state<GuessWhoGame>(data.game);
	let mySecretNumber = $state(data.mySecretNumber);
	let moves = $state<GuessWhoMove[]>(data.moves);
	let eliminatedNumbers = $state<number[]>(data.eliminatedNumbers);
	let playerNames = $state<Record<string, string>>(data.playerNames);

	// Realtime subscription
	let gameChannel: RealtimeChannel | null = null;
	let movesChannel: RealtimeChannel | null = null;

	/**
	 * Initialize realtime subscriptions
	 */
	function initRealtimeSubscriptions() {
		// Subscribe to game updates
		gameChannel = data.supabase
			.channel(`game:${game.id}`)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'guess_who_games',
					filter: `id=eq.${game.id}`
				},
				(payload) => {
					// Update game state
					const updated = payload.new;
					game = {
						id: updated.id,
						player1Id: updated.player1_id,
						player2Id: updated.player2_id,
						status: updated.status as GameStatus,
						gridNumbers: updated.grid_numbers,
						currentTurnPlayerId: updated.current_turn_player_id,
						bonusTurnsRemaining: updated.bonus_turns_remaining,
						winnerId: updated.winner_id,
						shareToken: updated.share_token,
						turnStartedAt: updated.turn_started_at,
						createdAt: updated.created_at,
						updatedAt: updated.updated_at
					};

					// Show toast when game status changes
					if (updated.status === 'in_progress' && data.game.status === 'waiting') {
						toaster.success('Un adversaire a rejoint la partie !');
					}
				}
			)
			.subscribe();

		// Subscribe to new moves
		movesChannel = data.supabase
			.channel(`moves:${game.id}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'guess_who_moves',
					filter: `game_id=eq.${game.id}`
				},
				(payload) => {
					const newMove = payload.new;
					const move: GuessWhoMove = {
						id: newMove.id,
						gameId: newMove.game_id,
						playerId: newMove.player_id,
						moveNumber: newMove.move_number,
						moveType: newMove.move_type as MoveType,
						questionType: newMove.question_type as QuestionType | null,
						questionParam: newMove.question_param,
						answer: newMove.answer,
						isCorrect: newMove.is_correct,
						correctAnswer: newMove.correct_answer,
						guessedNumber: newMove.guessed_number,
						createdAt: newMove.created_at
					};

					// Add move to list if not already present
					if (!moves.find((m) => m.id === move.id)) {
						moves = [...moves, move];
					}
				}
			)
			.subscribe();
	}

	/**
	 * Cleanup realtime subscriptions
	 */
	function cleanupRealtimeSubscriptions() {
		if (gameChannel) {
			data.supabase.removeChannel(gameChannel);
			gameChannel = null;
		}
		if (movesChannel) {
			data.supabase.removeChannel(movesChannel);
			movesChannel = null;
		}
	}

	/**
	 * Handle share link copy
	 */
	function handleCopyShareLink() {
		const shareUrl = `${window.location.origin}/games/guess-who/join/${game.shareToken}`;
		navigator.clipboard.writeText(shareUrl).then(() => {
			toaster.success('Lien copié dans le presse-papiers !');
		});
	}

	/**
	 * Handle game abandonment
	 */
	async function handleAbandon() {
		if (!confirm('Voulez-vous vraiment abandonner cette partie ?')) {
			return;
		}

		try {
			const response = await fetch(`/api/games/guess-who/${game.id}/abandon`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Erreur lors de l'abandon de la partie");
			}

			toaster.info('Partie abandonnée');
			goto('/games/guess-who');
		} catch (error) {
			console.error('Failed to abandon game:', error);
			toaster.error(
				error instanceof Error ? error.message : "Erreur lors de l'abandon de la partie"
			);
		}
	}

	/**
	 * Handle returning to menu
	 */
	function handleReturnToMenu() {
		goto('/games/guess-who');
	}

	/**
	 * Initialize subscriptions on mount, cleanup on unmount
	 */
	$effect(() => {
		initRealtimeSubscriptions();

		return () => {
			cleanupRealtimeSubscriptions();
		};
	});

	// Derive current screen based on game status
	let currentScreen = $derived.by(() => {
		if (game.status === 'waiting') {
			return 'waiting';
		} else if (game.status === 'in_progress') {
			return 'game';
		} else {
			return 'result';
		}
	});
</script>

<svelte:head>
	<title>Devine Qui Math - Partie en cours</title>
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
	<div class="mx-auto max-w-7xl">
		{#if currentScreen === 'waiting'}
			<!-- Waiting for opponent -->
			<WaitingScreen
				shareToken={game.shareToken}
				onCopyLink={handleCopyShareLink}
				onAbandon={handleAbandon}
			/>
		{:else if currentScreen === 'game'}
			<!-- Active game -->
			<GameScreen
				{game}
				{mySecretNumber}
				myPlayerId={data.myPlayerId}
				{moves}
				{eliminatedNumbers}
				{playerNames}
				supabase={data.supabase}
				onAbandon={handleAbandon}
			/>
		{:else if currentScreen === 'result'}
			<!-- Game finished -->
			<ResultScreen
				{game}
				myPlayerId={data.myPlayerId}
				{playerNames}
				{moves}
				onReturnToMenu={handleReturnToMenu}
			/>
		{:else}
			<!-- Fallback: Unknown state -->
			<Card class="p-8 text-center">
				<div class="mb-4 text-5xl">⚠️</div>
				<h2 class="mb-2 text-xl font-semibold text-foreground">État inattendu</h2>
				<p class="text-sm text-muted-foreground">La partie est dans un état inattendu.</p>
			</Card>
		{/if}
	</div>
</main>
