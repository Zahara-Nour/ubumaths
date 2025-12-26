<script lang="ts">
	/**
	 * ResultScreen - Displayed when game ends
	 *
	 * Shows victory/defeat state, reveals both secret numbers,
	 * and provides options to play again or leave.
	 */

	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { cn } from '$lib/utils';
	import { Trophy, Frown, RotateCcw, Home } from 'lucide-svelte';

	interface Props {
		winnerId: string | null;
		isWinner: boolean;
		isAbandoned?: boolean;
		mySecretNumber: number;
		opponentSecretNumber?: number;
		opponentName: string;
		onPlayAgain: () => void;
		onLeave: () => void;
		class?: string;
	}

	let {
		winnerId: _winnerId,
		isWinner,
		isAbandoned = false,
		mySecretNumber,
		opponentSecretNumber,
		opponentName,
		onPlayAgain,
		onLeave,
		class: className = ''
	}: Props = $props();

	// Determine the result message
	const resultMessage = $derived.by(() => {
		if (isAbandoned) {
			return isWinner ? 'Votre adversaire a abandonne !' : 'Partie abandonnee';
		}
		return isWinner ? 'Vous avez gagne !' : 'Vous avez perdu...';
	});

	const resultSubMessage = $derived.by(() => {
		if (isAbandoned) {
			return isWinner ? 'Victoire par forfait' : 'La partie a ete interrompue';
		}
		return isWinner
			? 'Bravo ! Vous avez trouve le nombre secret !'
			: 'Votre adversaire a trouve votre nombre secret';
	});
</script>

<div class={cn('flex min-h-[400px] items-center justify-center p-4', className)}>
	<Card class="w-full max-w-md p-6">
		<!-- Result Header -->
		<div class="mb-6 text-center">
			{#if isWinner}
				<div class="mb-4 flex justify-center">
					<div class="animate-bounce rounded-full bg-yellow-100 p-4 dark:bg-yellow-900/30">
						<Trophy class="h-16 w-16 text-yellow-600 dark:text-yellow-400" />
					</div>
				</div>
				<h2 class="text-3xl font-bold text-green-600 dark:text-green-400">
					{resultMessage}
				</h2>
			{:else}
				<div class="mb-4 flex justify-center">
					<div class="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
						<Frown class="h-16 w-16 text-red-600 dark:text-red-400" />
					</div>
				</div>
				<h2 class="text-3xl font-bold text-red-600 dark:text-red-400">
					{resultMessage}
				</h2>
			{/if}
			<p class="mt-2 text-muted-foreground">{resultSubMessage}</p>
		</div>

		<Separator class="my-4" />

		<!-- Secret numbers reveal -->
		<div class="mb-6 space-y-4">
			<h3 class="text-center text-lg font-semibold text-foreground">Les nombres secrets</h3>

			<div class="grid grid-cols-2 gap-4">
				<!-- My secret number -->
				<div class="rounded-lg bg-muted/50 p-4 text-center">
					<p class="mb-1 text-sm text-muted-foreground">Votre nombre</p>
					<Badge
						variant="secondary"
						class={cn(
							'px-4 py-2 text-2xl font-bold',
							!isWinner && 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
						)}
					>
						{mySecretNumber}
					</Badge>
				</div>

				<!-- Opponent's secret number -->
				<div class="rounded-lg bg-muted/50 p-4 text-center">
					<p class="mb-1 text-sm text-muted-foreground">{opponentName}</p>
					<Badge
						variant="secondary"
						class={cn(
							'px-4 py-2 text-2xl font-bold',
							isWinner && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
						)}
					>
						{opponentSecretNumber ?? '?'}
					</Badge>
				</div>
			</div>
		</div>

		<!-- Stats summary (placeholder for future enhancement) -->
		{#if !isAbandoned}
			<div class="mb-6 rounded-lg bg-muted/30 p-4">
				<div class="grid grid-cols-2 gap-4 text-center text-sm">
					<div>
						<p class="text-muted-foreground">Adversaire</p>
						<p class="font-semibold text-foreground">{opponentName}</p>
					</div>
					<div>
						<p class="text-muted-foreground">Resultat</p>
						<p class={cn('font-semibold', isWinner ? 'text-green-600' : 'text-red-600')}>
							{isWinner ? 'Victoire' : 'Defaite'}
						</p>
					</div>
				</div>
			</div>
		{/if}

		<Separator class="my-4" />

		<!-- Action buttons -->
		<div class="flex flex-col gap-3 sm:flex-row">
			<Button onclick={onPlayAgain} variant="default" class="flex-1">
				<RotateCcw class="mr-2 h-4 w-4" />
				Rejouer
			</Button>
			<Button onclick={onLeave} variant="outline" class="flex-1">
				<Home class="mr-2 h-4 w-4" />
				Quitter
			</Button>
		</div>
	</Card>
</div>

<style>
	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	.animate-bounce {
		animation: bounce 1s ease-in-out infinite;
	}
</style>
