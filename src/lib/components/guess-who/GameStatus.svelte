<script lang="ts">
	/**
	 * GameStatus - Display current game state and player turn
	 *
	 * Shows whose turn it is, bonus turns remaining, and whether
	 * the player needs to answer a question.
	 */

	import { cn } from '$lib/utils';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		isMyTurn: boolean;
		currentPlayerName: string;
		bonusTurnsRemaining: number;
		mustAnswer: boolean;
		class?: string;
	}

	let {
		isMyTurn,
		currentPlayerName,
		bonusTurnsRemaining,
		mustAnswer,
		class: className = ''
	}: Props = $props();

	// Determine main message
	const message = $derived.by(() => {
		if (mustAnswer) {
			return 'Répondez à la question !';
		}
		if (isMyTurn) {
			return "C'est votre tour";
		}
		return `Tour de ${currentPlayerName}`;
	});

	// Determine message color
	const messageClass = $derived.by(() => {
		if (mustAnswer) return 'text-orange-600 dark:text-orange-400';
		if (isMyTurn) return 'text-primary';
		return 'text-muted-foreground';
	});
</script>

<div class="game-status {className}">
	<div class="flex flex-col items-center gap-3">
		<!-- Main status message -->
		<h2 class={cn('text-2xl font-bold transition-colors', messageClass)}>
			{message}
		</h2>

		<!-- Bonus turns indicator -->
		{#if bonusTurnsRemaining > 0}
			<Badge variant="secondary" class="flex items-center gap-1">
				<span class="text-lg" aria-hidden="true">⭐</span>
				<span>Tour bonus : {bonusTurnsRemaining} restant{bonusTurnsRemaining > 1 ? 's' : ''}</span>
			</Badge>
		{/if}

		<!-- Visual indicator -->
		<div
			class={cn(
				'h-2 w-32 rounded-full transition-all',
				isMyTurn ? 'bg-primary' : 'bg-muted',
				mustAnswer && 'animate-pulse bg-orange-500'
			)}
			role="presentation"
		></div>
	</div>
</div>

<style>
	.game-status {
		width: 100%;
		padding: 1rem;
		text-align: center;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
