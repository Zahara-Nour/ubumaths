<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	// Props
	let {
		gamesPlayed,
		gamesWon,
		bestTime,
		totalGidouilles,
		difficulty
	}: {
		gamesPlayed: number;
		gamesWon: number;
		bestTime: number | null;
		totalGidouilles: number;
		difficulty: string;
	} = $props();

	// Computed values
	const winRate = $derived.by(() => {
		if (gamesPlayed === 0) return 0;
		return ((gamesWon / gamesPlayed) * 100).toFixed(1);
	});

	const formattedBestTime = $derived.by(() => {
		if (bestTime === null) return 'Aucun';
		const minutes = Math.floor(bestTime / 60);
		const seconds = bestTime % 60;
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	});

	const difficultyLabel = $derived.by(() => {
		const labels: Record<string, string> = {
			beginner: 'Débutant',
			intermediate: 'Intermédiaire',
			expert: 'Expert'
		};
		return labels[difficulty] || difficulty;
	});

	const formattedGidouilles = $derived.by(() => {
		return totalGidouilles.toLocaleString('fr-FR');
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<span aria-hidden="true">📊</span>
			<span>Vos statistiques ({difficultyLabel})</span>
		</Card.Title>
	</Card.Header>
	<Card.Content>
		<dl class="space-y-3">
			<!-- Games played -->
			<div class="flex items-center justify-between">
				<dt class="text-sm text-muted-foreground">Parties jouées</dt>
				<dd class="font-semibold tabular-nums">{gamesPlayed}</dd>
			</div>

			<!-- Victories -->
			<div class="flex items-center justify-between">
				<dt class="text-sm text-muted-foreground">Victoires</dt>
				<dd class="font-semibold tabular-nums">
					{gamesWon}
					{#if gamesPlayed > 0}
						<span class="ml-1 text-sm text-muted-foreground">({winRate}%)</span>
					{/if}
				</dd>
			</div>

			<!-- Best time -->
			<div class="flex items-center justify-between">
				<dt class="text-sm text-muted-foreground">Meilleur temps</dt>
				<dd class="font-mono font-semibold tabular-nums">{formattedBestTime}</dd>
			</div>

			<!-- Total gidouilles -->
			<div class="flex items-center justify-between border-t border-border pt-3">
				<dt class="flex items-center gap-1 text-sm text-muted-foreground">
					<span aria-hidden="true">💰</span>
					<span>Gidouilles gagnées</span>
				</dt>
				<dd class="text-lg font-bold text-primary tabular-nums">{formattedGidouilles}</dd>
			</div>
		</dl>

		{#if gamesPlayed === 0}
			<p class="mt-4 text-center text-sm text-muted-foreground italic">
				Jouez votre première partie pour commencer !
			</p>
		{/if}
	</Card.Content>
</Card.Root>
