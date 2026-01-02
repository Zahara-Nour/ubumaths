<!--
	TournamentVictoryModal Component
	================================

	Displays a victory screen for tournament games with 3BV-based scoring.
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
			grid3bv: 48,
			score: 145,
			actual3bvs: 0.384,
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
		grid3bv: number;
		score: number;
		actual3bvs: number;
		onPlayAgain: () => void;
		onBackToTournament: () => void;
	}

	let {
		timeSeconds,
		gameNumber,
		difficulty,
		grid3bv,
		score,
		actual3bvs,
		onPlayAgain,
		onBackToTournament
	}: Props = $props();

	// Score performance assessment
	const scorePerformance = $derived.by(() => {
		// Score ranges: 10-300, with 100 being "reference" performance
		if (score >= 200)
			return { label: 'Performance exceptionnelle !', emoji: '⚡', color: 'text-yellow-500' };
		if (score >= 150)
			return { label: 'Excellente efficacite !', emoji: '🚀', color: 'text-green-500' };
		if (score >= 100) return { label: 'Bonne performance !', emoji: '👍', color: 'text-blue-500' };
		if (score >= 50) return { label: 'Continue comme ca !', emoji: '💪', color: 'text-cyan-500' };
		return { label: 'Partie terminee !', emoji: '✓', color: 'text-muted-foreground' };
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

		<!-- Score display (primary metric) -->
		<div class="py-4 text-center">
			<div class="text-4xl font-bold text-primary">
				{score} pts
			</div>
			<div class="mt-2 flex items-center justify-center gap-2">
				<span class={scorePerformance.color}>{scorePerformance.emoji}</span>
				<span class={`text-sm ${scorePerformance.color}`}>{scorePerformance.label}</span>
			</div>
		</div>

		<!-- 3BV metrics (educational) -->
		<div class="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
			<div>
				<div class="text-xs text-muted-foreground">Temps</div>
				<div class="font-mono font-semibold">{formatDuration(timeSeconds)}</div>
			</div>
			<div>
				<div class="text-xs text-muted-foreground">3BV</div>
				<div class="font-mono font-semibold">{grid3bv}</div>
			</div>
			<div>
				<div class="text-xs text-muted-foreground">3BV/s</div>
				<div class="font-mono font-semibold">{actual3bvs.toFixed(2)}</div>
			</div>
		</div>

		<!-- Tournament info -->
		<div class="rounded-lg border border-border bg-card p-3 text-center">
			<p class="text-sm text-muted-foreground">
				Ce score sera pris en compte pour le classement du tournoi.
			</p>
			<p class="mt-1 text-xs text-muted-foreground">Seuls vos meilleurs scores comptent !</p>
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
