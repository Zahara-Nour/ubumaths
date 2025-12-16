<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { cn } from '$lib/utils';
	import { Separator } from '$lib/components/ui/separator';

	// Types
	type MatchResult = {
		winnerId: string;
		gidouilles: number;
		baseReward: number;
		speedBonus: number;
		eloChange: number;
		newElo: number;
		timeSeconds: number;
		opponentName?: string;
	} | null;

	// Props
	let {
		result,
		currentUserId,
		difficulty,
		matchType,
		onPlayAgain,
		onReturnToMenu
	}: {
		result: MatchResult;
		currentUserId: string;
		difficulty: string;
		matchType: 'quick' | 'ranked';
		onPlayAgain: () => void;
		onReturnToMenu: () => void;
	} = $props();

	// Derived
	let isWinner = $derived(result?.winnerId === currentUserId);
	let isDraw = $derived(result?.winnerId === 'draw');

	let formattedTime = $derived.by(() => {
		if (!result) return '0:00';
		const minutes = Math.floor(result.timeSeconds / 60);
		const seconds = result.timeSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	let difficultyLabel = $derived.by(() => {
		const labels: Record<string, string> = {
			beginner: 'Débutant',
			intermediate: 'Intermédiaire',
			expert: 'Expert'
		};
		return labels[difficulty] || difficulty;
	});

	let matchTypeLabel = $derived(matchType === 'quick' ? 'Rapide' : 'Classé');

	let eloChangeText = $derived.by(() => {
		if (!result || matchType !== 'ranked') return '';
		const change = result.eloChange;
		const sign = change >= 0 ? '+' : '';
		return `${sign}${change}`;
	});

	let eloChangeColor = $derived.by(() => {
		if (!result) return '';
		return result.eloChange >= 0
			? 'text-green-600 dark:text-green-400'
			: 'text-red-600 dark:text-red-400';
	});
</script>

{#if result}
	<div class="flex min-h-[400px] items-center justify-center p-4">
		<Card class="w-full max-w-md p-6">
			<!-- Result Header -->
			<div class="mb-6 text-center">
				{#if isDraw}
					<div class="mb-3 text-6xl">🤝</div>
					<h2 class="text-3xl font-bold text-foreground">ÉGALITÉ</h2>
				{:else if isWinner}
					<div class="mb-3 animate-bounce text-6xl">🏆</div>
					<h2 class="text-3xl font-bold text-green-600 dark:text-green-400">VICTOIRE!</h2>
				{:else}
					<div class="mb-3 text-6xl">💔</div>
					<h2 class="text-3xl font-bold text-red-600 dark:text-red-400">DÉFAITE</h2>
				{/if}
			</div>

			<Separator class="my-4" />

			<!-- Match Summary -->
			<div class="mb-4 text-center text-sm text-muted-foreground">
				<p>{difficultyLabel} • {matchTypeLabel} {formattedTime ? `• ${formattedTime}` : ''}</p>
				{#if !isWinner && !isDraw && result.opponentName}
					<p class="mt-1">
						Victoire de: <strong class="text-foreground">{result.opponentName}</strong>
					</p>
				{/if}
			</div>

			<!-- Rewards (only if winner) -->
			{#if isWinner && result.gidouilles > 0}
				<div class="mb-4 rounded-lg bg-muted/50 p-4">
					<h3 class="mb-3 flex items-center gap-2 font-semibold text-foreground">
						<span>💰</span>
						<span>Récompenses:</span>
					</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Récompense de base:</span>
							<span class="font-medium text-foreground">{result.baseReward} gidouilles</span>
						</div>
						{#if result.speedBonus > 0}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Bonus de vitesse:</span>
								<span class="font-medium text-green-600 dark:text-green-400"
									>{result.speedBonus} gidouilles</span
								>
							</div>
						{/if}
						<Separator class="my-2" />
						<div class="flex justify-between text-base">
							<span class="font-semibold text-foreground">Total:</span>
							<span class="font-bold text-primary">{result.gidouilles} gidouilles</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- ELO Change (ranked only) -->
			{#if matchType === 'ranked' && !isDraw}
				<div class="mb-4 rounded-lg bg-muted/50 p-4">
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-2 font-semibold text-foreground">
							<span>{result.eloChange >= 0 ? '📈' : '📉'}</span>
							<span>ELO:</span>
						</span>
						<div class="text-right">
							<span class={cn('text-lg font-bold', eloChangeColor)}>{eloChangeText}</span>
							<p class="text-sm text-muted-foreground">
								{result.newElo - result.eloChange} → {result.newElo}
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="mt-6 flex flex-col gap-3 sm:flex-row">
				<Button onclick={onPlayAgain} variant="default" class="flex-1">
					<span class="mr-2">🎮</span>
					Rejouer
				</Button>
				<Button onclick={onReturnToMenu} variant="outline" class="flex-1">
					<span class="mr-2">🏠</span>
					Retour au menu
				</Button>
			</div>
		</Card>
	</div>
{/if}
