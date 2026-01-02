<!--
	TournamentDefeatModal Component
	===============================

	Displays a defeat screen for tournament games.
	Encourages players to try again.

	USAGE:
	```typescript
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import TournamentDefeatModal from '$lib/components/game/minesweeper/TournamentDefeatModal.svelte';

	modalStack.push({
		component: TournamentDefeatModal,
		props: {
			timeElapsed: 45,
			cellsRevealed: 42,
			totalCells: 71,
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
	import { RotateCcw, ArrowLeft } from 'lucide-svelte';
	import type { Difficulty } from '$lib/types/minesweeper';
	import { DIFFICULTY_LABELS } from '$lib/types/minesweeper';
	import { formatDuration } from '$lib/utils/format';

	interface Props {
		timeElapsed: number;
		cellsRevealed: number;
		totalCells: number;
		gameNumber: number;
		difficulty: Difficulty;
		onPlayAgain: () => void;
		onBackToTournament: () => void;
	}

	let {
		timeElapsed,
		cellsRevealed,
		totalCells,
		gameNumber,
		difficulty,
		onPlayAgain,
		onBackToTournament
	}: Props = $props();

	// Calculate progress percentage
	const progressPercent = $derived(Math.round((cellsRevealed / totalCells) * 100));

	// Encouragement message based on progress
	const encouragementMessage = $derived.by(() => {
		if (progressPercent < 25) {
			return 'Le tournoi continue ! Tentez votre chance.';
		}
		if (progressPercent < 50) {
			return 'Bon essai ! Continuez pour le classement.';
		}
		if (progressPercent < 75) {
			return 'Vous progressez bien ! Encore un effort.';
		}
		return 'Si proche ! La prochaine sera la bonne.';
	});
</script>

<Card.Root class="animate-in zoom-in-95 mx-4 w-full max-w-sm duration-200">
	<Card.Header class="pb-2">
		<div class="flex items-center justify-center gap-2">
			<span class="text-3xl">💥</span>
			<Card.Title class="text-2xl font-bold">Défaite</Card.Title>
		</div>
	</Card.Header>

	<Card.Content class="space-y-4">
		<!-- Game info -->
		<div class="text-center text-sm text-muted-foreground">
			Partie {gameNumber} - {DIFFICULTY_LABELS[difficulty]}
		</div>

		<!-- Progress stats -->
		<div class="py-2 text-center">
			<div class="text-lg font-medium">
				{cellsRevealed}/{totalCells} cases révélées
			</div>
			<div class="text-sm text-muted-foreground">
				en {formatDuration(timeElapsed)}
			</div>
		</div>

		<!-- Progress bar -->
		<div class="h-2 w-full rounded-full bg-muted">
			<div
				class="h-2 rounded-full bg-primary transition-all"
				style="width: {progressPercent}%"
			></div>
		</div>
		<div class="text-center text-xs text-muted-foreground">{progressPercent}% complété</div>

		<!-- Encouragement -->
		<div class="rounded-lg bg-muted/50 p-3 text-center">
			<p class="text-sm text-muted-foreground">{encouragementMessage}</p>
			<p class="mt-2 text-xs text-muted-foreground">
				Seules les victoires comptent pour le classement.
			</p>
		</div>
	</Card.Content>

	<Card.Footer class="flex justify-center gap-3 pt-2">
		<Button variant="outline" onclick={onBackToTournament} class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Classement
		</Button>
		<Button variant="default" onclick={onPlayAgain} class="gap-2">
			<RotateCcw class="h-4 w-4" />
			Réessayer
		</Button>
	</Card.Footer>
</Card.Root>
