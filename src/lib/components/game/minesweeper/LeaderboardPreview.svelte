<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	// Props
	let {
		difficulty,
		topPlayers,
		isAuthenticated = false
	}: {
		difficulty: string;
		topPlayers: Array<{ rank: number; name: string; time: number }>;
		isAuthenticated?: boolean;
	} = $props();

	// Difficulty label in French
	const difficultyLabel = $derived.by(() => {
		const labels: Record<string, string> = {
			beginner: 'Débutant',
			intermediate: 'Intermédiaire',
			expert: 'Expert'
		};
		return labels[difficulty] || difficulty;
	});

	// Medal emoji based on rank
	function getMedal(rank: number): string {
		const medals: Record<number, string> = {
			1: '🥇',
			2: '🥈',
			3: '🥉'
		};
		return medals[rank] || '';
	}

	// Format time as MM:SS
	function formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	// Anonymize name for public users (show only first letter + ".")
	function displayName(name: string): string {
		if (isAuthenticated) return name;
		return name.charAt(0).toUpperCase() + '.';
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<span aria-hidden="true">🏆</span>
			<span>Classement ({difficultyLabel})</span>
		</Card.Title>
	</Card.Header>
	<Card.Content>
		{#if topPlayers.length === 0}
			<p class="text-sm text-muted-foreground text-center py-4 italic">
				Aucun record pour l'instant. Soyez le premier !
			</p>
		{:else}
			<ol class="space-y-2 mb-4" aria-label="Top 3 des meilleurs temps">
				{#each topPlayers as player (player.rank)}
					<li
						class="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
					>
						<div class="flex items-center gap-3">
							<span class="text-xl" aria-hidden="true">{getMedal(player.rank)}</span>
							<div>
								<div class="font-semibold">{displayName(player.name)}</div>
								{#if !isAuthenticated}
									<div class="text-xs text-muted-foreground">Connectez-vous pour voir le nom complet</div>
								{/if}
							</div>
						</div>
						<div class="font-mono font-bold tabular-nums">{formatTime(player.time)}</div>
					</li>
				{/each}
			</ol>

			<Button asChild variant="outline" size="sm" class="w-full">
				<a href="/games/minesweeper/leaderboard?difficulty={difficulty}">
					Voir le classement complet
					<span class="ml-2" aria-hidden="true">→</span>
				</a>
			</Button>
		{/if}

		{#if !isAuthenticated && topPlayers.length > 0}
			<p class="text-xs text-muted-foreground text-center mt-4 italic">
				Créez un compte pour apparaître dans le classement !
			</p>
		{/if}
	</Card.Content>
</Card.Root>
