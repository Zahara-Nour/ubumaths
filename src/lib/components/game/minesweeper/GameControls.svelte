<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';
	import HintButton from './HintButton.svelte';

	// Props
	let {
		timeElapsed,
		minesRemaining,
		gameStatus,
		onReset,
		difficulty,
		hintsUsed = 0,
		onUseHint,
		isAuthenticated = false,
		isLoading = false
	}: {
		timeElapsed: number;
		minesRemaining: number;
		gameStatus: 'not_started' | 'in_progress' | 'won' | 'lost';
		onReset: () => void;
		difficulty: string;
		hintsUsed?: number;
		onUseHint?: () => void;
		isAuthenticated?: boolean;
		isLoading?: boolean;
	} = $props();

	// Format time as MM:SS
	const formattedTime = $derived.by(() => {
		const minutes = Math.floor(timeElapsed / 60);
		const seconds = timeElapsed % 60;
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	});

	// Difficulty label in French
	const difficultyLabel = $derived.by(() => {
		const labels: Record<string, string> = {
			beginner: 'Débutant',
			intermediate: 'Intermédiaire',
			expert: 'Expert'
		};
		return labels[difficulty] || difficulty;
	});

	// Status message
	const statusMessage = $derived.by(() => {
		if (gameStatus === 'won') return '🎉 Victoire !';
		if (gameStatus === 'lost') return '💥 Défaite';
		return null;
	});

	// Status color
	const statusColor = $derived.by(() => {
		if (gameStatus === 'won') return 'text-green-600 dark:text-green-400';
		if (gameStatus === 'lost') return 'text-destructive';
		return '';
	});
</script>

<div class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
	<!-- Top row: Mines, Difficulty, Timer -->
	<div class="flex items-center justify-between gap-4 text-sm sm:text-base">
		<div class="flex items-center gap-2 font-mono" aria-label="Mines restantes">
			<span class="text-lg" aria-hidden="true">🚩</span>
			<span class="font-bold tabular-nums">{minesRemaining}</span>
		</div>

		<div
			class="flex items-center gap-2 rounded-md bg-muted px-3 py-1 font-semibold"
			aria-label="Difficulté"
		>
			<span class="text-lg" aria-hidden="true">🎮</span>
			<span>{difficultyLabel}</span>
		</div>

		<div class="flex items-center gap-2 font-mono" aria-label="Temps écoulé">
			<span class="text-lg" aria-hidden="true">⏱️</span>
			<span class="font-bold tabular-nums">{formattedTime}</span>
		</div>
	</div>

	<!-- Status message (if game ended) -->
	{#if statusMessage}
		<div class={cn('text-center text-lg font-bold', statusColor)} role="status" aria-live="polite">
			{statusMessage}
		</div>
	{/if}

	<!-- Reset button -->
	<Button
		onclick={onReset}
		variant="default"
		size="sm"
		class="w-full"
		aria-label="Commencer une nouvelle partie"
	>
		<span class="mr-2" aria-hidden="true">🔄</span>
		Nouvelle partie
	</Button>

	<!-- Hints section (only for authenticated users) -->
	{#if isAuthenticated && onUseHint}
		<div class="border-t border-border pt-3">
			<Tooltip.Provider>
				<HintButton
					{hintsUsed}
					disabled={gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'not_started'}
					{isLoading}
					{onUseHint}
				/>
			</Tooltip.Provider>
		</div>
	{/if}
</div>
