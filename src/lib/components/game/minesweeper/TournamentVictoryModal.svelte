<!--
	TournamentVictoryModal Component
	================================

	Displays a victory screen for tournament games.
	No gidouilles are awarded during the tournament - rewards come at the end.

	USAGE:
	```typescript
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import TournamentVictoryModal from '$lib/components/game/minesweeper/TournamentVictoryModal.svelte';

	modalStack.push({
		component: TournamentVictoryModal,
		props: {
			timeSeconds: 125,
			gameNumber: 3,
			difficulty: 'intermediate',
			onPlayAgain: () => { ... },
			onBackToTournament: () => { ... }
		}
	});
	```
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { RotateCcw, ArrowLeft, Trophy } from 'lucide-svelte';
	import type { Difficulty } from '$lib/types/minesweeper';
	import { DIFFICULTY_LABELS } from '$lib/types/minesweeper';
	import { formatDuration } from '$lib/utils/format';

	interface Props {
		timeSeconds: number;
		gameNumber: number;
		difficulty: Difficulty;
		onPlayAgain: () => void;
		onBackToTournament: () => void;
	}

	let { timeSeconds, gameNumber, difficulty, onPlayAgain, onBackToTournament }: Props = $props();

	// Time performance assessment
	const timePerformance = $derived.by(() => {
		// Reference times for each difficulty
		const refTimes: Record<Difficulty, number> = {
			beginner: 180,
			intermediate: 600,
			expert: 1200
		};
		const refTime = refTimes[difficulty];
		const ratio = timeSeconds / refTime;

		if (ratio <= 0.33)
			return { label: 'Temps incroyable !', emoji: '⚡', color: 'text-yellow-500' };
		if (ratio <= 0.66) return { label: 'Excellent temps !', emoji: '🚀', color: 'text-green-500' };
		if (ratio <= 1.0) return { label: 'Bon temps !', emoji: '👍', color: 'text-blue-500' };
		return { label: 'Terminé !', emoji: '✓', color: 'text-muted-foreground' };
	});
</script>

<Card.Root class="animate-in zoom-in-95 mx-4 w-full max-w-md duration-200">
	<Card.Header class="pb-2">
		<div class="flex items-center justify-center gap-2">
			<Trophy class="h-8 w-8 text-yellow-500" />
			<Card.Title class="text-2xl font-bold">Victoire !</Card.Title>
		</div>
	</Card.Header>

	<Card.Content class="space-y-4">
		<!-- Game info -->
		<div class="text-center text-sm text-muted-foreground">
			Partie {gameNumber} - {DIFFICULTY_LABELS[difficulty]}
		</div>

		<!-- Time display -->
		<div class="py-4 text-center">
			<div class="text-4xl font-bold text-primary">
				{formatDuration(timeSeconds)}
			</div>
			<div class="mt-2 flex items-center justify-center gap-2">
				<span class={timePerformance.color}>{timePerformance.emoji}</span>
				<span class={`text-sm ${timePerformance.color}`}>{timePerformance.label}</span>
			</div>
		</div>

		<!-- Tournament info -->
		<div class="rounded-lg bg-muted/50 p-4 text-center">
			<p class="text-sm text-muted-foreground">
				Ce temps sera pris en compte pour le classement du tournoi.
			</p>
			<p class="mt-2 text-xs text-muted-foreground">Seules vos meilleures parties comptent !</p>
		</div>
	</Card.Content>

	<Card.Footer class="flex justify-center gap-3 pt-2">
		<Button variant="outline" onclick={onBackToTournament} class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Classement
		</Button>
		<Button variant="default" onclick={onPlayAgain} class="gap-2">
			<RotateCcw class="h-4 w-4" />
			Rejouer
		</Button>
	</Card.Footer>
</Card.Root>
