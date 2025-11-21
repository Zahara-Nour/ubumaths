<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { GameState } from '$lib/types/minesweeper';
	import { DIFFICULTY_CONFIGS } from '$lib/types/minesweeper';

	// Props
	let { savedGame }: { savedGame: GameState | null } = $props();

	// Format time as MM:SS
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	// Get difficulty label in French
	function getDifficultyLabel(difficulty: string): string {
		switch (difficulty) {
			case 'beginner':
				return 'Débutant';
			case 'intermediate':
				return 'Intermédiaire';
			case 'expert':
				return 'Expert';
			default:
				return difficulty;
		}
	}

	// Get difficulty badge color
	function getDifficultyVariant(difficulty: string): 'default' | 'secondary' | 'destructive' {
		switch (difficulty) {
			case 'beginner':
				return 'secondary';
			case 'intermediate':
				return 'default';
			case 'expert':
				return 'destructive';
			default:
				return 'default';
		}
	}

	// Calculate progress percentage and details
	const progressInfo = $derived(() => {
		if (!savedGame) return null;

		const config = DIFFICULTY_CONFIGS[savedGame.difficulty];
		const totalCells = config.rows * config.cols;
		const percentage = Math.round((savedGame.cellsRevealed / totalCells) * 100);

		return {
			revealed: savedGame.cellsRevealed,
			total: totalCells,
			percentage
		};
	});
</script>

{#if savedGame && progressInfo}
	<div class="rounded-lg border border-border bg-card/50 p-3 text-sm">
		<div class="flex flex-wrap items-center gap-2">
			<!-- Difficulty badge -->
			<Badge variant={getDifficultyVariant(savedGame.difficulty)}>
				{getDifficultyLabel(savedGame.difficulty)}
			</Badge>

			<!-- Progress -->
			<span class="text-muted-foreground">
				Progression : <span class="font-medium text-foreground"
					>{progressInfo()!.revealed}/{progressInfo()!.total} cases</span
				>
				<span class="text-xs">({progressInfo()!.percentage}%)</span>
			</span>

			<!-- Time -->
			<span class="text-muted-foreground">
				Temps : <span class="font-medium text-foreground">{formatTime(savedGame.timeElapsed)}</span>
			</span>
		</div>
	</div>
{/if}
