<!--
	DefeatModal Component
	=====================

	Displays a simple defeat screen with encouragement.

	USAGE:
	```typescript
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import DefeatModal from '$lib/components/game/minesweeper/DefeatModal.svelte';

	modalStack.push({
		component: DefeatModal,
		props: {
			difficulty: 'beginner',
			timeElapsed: 45,
			cellsRevealed: 42,
			totalCells: 71,
			onPlayAgain: () => { ... },
			onClose: () => modalStack.pop()
		}
	});
	```
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { X, RotateCcw } from 'lucide-svelte';
	import type { Difficulty } from '$lib/types/minesweeper';
	import { DIFFICULTY_LABELS } from '$lib/types/minesweeper';
	import { formatDuration } from '$lib/utils/format';

	interface Props {
		difficulty: Difficulty;
		timeElapsed: number;
		cellsRevealed: number;
		totalCells: number;
		onPlayAgain: () => void;
		onClose: () => void;
	}

	let { difficulty, timeElapsed, cellsRevealed, totalCells, onPlayAgain, onClose }: Props =
		$props();

	// Calculate progress percentage
	const progressPercent = $derived(Math.round((cellsRevealed / totalCells) * 100));

	// Encouragement message based on progress
	const encouragementMessage = $derived.by(() => {
		if (progressPercent < 25) {
			return 'Début difficile, mais chaque partie est une leçon !';
		}
		if (progressPercent < 50) {
			return 'Bon début ! Continuez à pratiquer.';
		}
		if (progressPercent < 75) {
			return 'Vous étiez sur la bonne voie ! Encore un effort.';
		}
		return 'Si proche ! La prochaine sera la bonne.';
	});

	// Handle play again - delegate entirely to callback
	// The callback is responsible for closing the modal and starting a new game
	function handlePlayAgain() {
		onPlayAgain();
	}
</script>

<Card.Root class="animate-in zoom-in-95 mx-4 w-full max-w-sm duration-200">
	<Card.Header class="pb-2">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-2">
				<span class="text-3xl">💥</span>
				<Card.Title class="text-2xl font-bold">Défaite</Card.Title>
			</div>
			<Button variant="ghost" size="icon" onclick={onClose} aria-label="Fermer">
				<X class="h-4 w-4" />
			</Button>
		</div>
	</Card.Header>

	<Card.Content class="space-y-4">
		<!-- Progress stats -->
		<div class="py-2 text-center">
			<div class="text-lg font-medium">
				{cellsRevealed}/{totalCells} cases révélées
			</div>
			<div class="text-sm text-muted-foreground">
				en {formatDuration(timeElapsed)} ({DIFFICULTY_LABELS[difficulty]})
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
		</div>
	</Card.Content>

	<Card.Footer class="flex justify-center pt-2">
		<Button variant="default" onclick={handlePlayAgain} class="gap-2">
			<RotateCcw class="h-4 w-4" />
			Réessayer
		</Button>
	</Card.Footer>
</Card.Root>
