<script lang="ts">
	/**
	 * MoveHistory - Display chronological list of game moves
	 *
	 * Shows questions, answers, and guesses with visual indicators
	 * for correct/incorrect answers.
	 */

	import { QUESTION_INFO, type GuessWhoMove } from '$lib/types/guess-who';
	import { cn } from '$lib/utils';

	interface Props {
		moves: GuessWhoMove[];
		player1Name: string;
		player2Name: string;
		currentUserId: string;
		class?: string;
	}

	let { moves, player1Name, player2Name, currentUserId, class: className = '' }: Props = $props();

	// Get player name by ID
	function getPlayerName(playerId: string): string {
		// For display purposes, use "Vous" for current user
		if (playerId === currentUserId) return 'Vous';
		return playerId === currentUserId ? player1Name : player2Name;
	}

	// Get French question text
	function getQuestionText(move: GuessWhoMove): string {
		if (!move.questionType) return '';

		const info = QUESTION_INFO.find((q) => q.type === move.questionType);
		if (!info) return move.questionType;

		let text = info.labelFr;
		if (move.questionParam !== null) {
			text = text.replace('...', String(move.questionParam));
		}

		return text;
	}

	// Sort moves by move number (newest first for game history feel)
	const sortedMoves = $derived([...moves].sort((a, b) => b.moveNumber - a.moveNumber));
</script>

<div class="move-history {className}">
	<h3 class="mb-3 text-lg font-semibold">Historique</h3>

	{#if sortedMoves.length === 0}
		<p class="text-sm text-muted-foreground">Aucune action pour le moment.</p>
	{:else}
		<div class="space-y-2">
			{#each sortedMoves as move (move.id)}
				<div
					class={cn(
						'move-item rounded-md border p-3 text-sm',
						move.isCorrect === false && 'border-destructive/50 bg-destructive/5'
					)}
				>
					{#if move.moveType === 'question'}
						<!-- Question asked -->
						<p class="font-medium">
							<span class="text-primary">{getPlayerName(move.playerId)}</span>
							a demandé :
						</p>
						<p class="mt-1 italic">{getQuestionText(move)}</p>
					{:else if move.moveType === 'answer'}
						<!-- Answer given -->
						<p class="font-medium">
							<span class="text-primary">{getPlayerName(move.playerId)}</span>
							a répondu :
						</p>
						<p class="mt-1 flex items-center gap-2">
							<span class="font-semibold">{move.answer ? 'Oui' : 'Non'}</span>
							{#if move.isCorrect === true}
								<span class="text-green-600" aria-label="Correct">✓</span>
							{:else if move.isCorrect === false}
								<span class="text-destructive" aria-label="Incorrect">✗</span>
								<span class="text-xs text-muted-foreground">
									(correct : {move.correctAnswer ? 'Oui' : 'Non'})
								</span>
							{/if}
						</p>
					{:else if move.moveType === 'guess'}
						<!-- Guess made -->
						<p class="font-medium">
							<span class="text-primary">{getPlayerName(move.playerId)}</span>
							a deviné :
						</p>
						<p class="mt-1 flex items-center gap-2">
							<span class="text-lg font-semibold">{move.guessedNumber}</span>
							{#if move.isCorrect === true}
								<span class="font-bold text-green-600">✓ Correct !</span>
							{:else if move.isCorrect === false}
								<span class="text-destructive">✗ Incorrect</span>
							{/if}
						</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.move-history {
		width: 100%;
		max-width: 500px;
	}

	.move-item {
		transition: all 0.2s ease;
	}

	.move-item:hover {
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
</style>
