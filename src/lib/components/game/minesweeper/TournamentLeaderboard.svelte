<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import { cn } from '$lib/utils';
	import type { TournamentStanding } from '$lib/types/minesweeper';

	// Props
	let {
		standings,
		currentUserId,
		showHeader = true,
		maxRows = 10,
		compact = false,
		isCompleted = false,
		podiumRewards = {}
	}: {
		standings: TournamentStanding[];
		currentUserId: string;
		showHeader?: boolean;
		maxRows?: number;
		compact?: boolean;
		isCompleted?: boolean;
		podiumRewards?: Record<string, number>;
	} = $props();

	// Get reward for a position
	function getReward(position: number): number | null {
		const reward = podiumRewards[String(position)];
		return reward ?? null;
	}

	// Derived state
	let displayedStandings = $derived(standings.slice(0, maxRows));

	// Get medal emoji for top 3
	function getMedalEmoji(position: number): string {
		const medals: Record<number, string> = {
			1: '🥇',
			2: '🥈',
			3: '🥉'
		};
		return medals[position] || '';
	}

	// Format score with "pts" suffix
	function formatScore(score: number): string {
		return `${Math.round(score)} pts`;
	}

	// Get rank CSS class for top 3
	function getRankClass(position: number, isCurrentUser: boolean): string {
		const baseClass = 'transition-colors';
		const highlightClass = isCurrentUser ? 'ring-2 ring-primary ring-inset' : '';

		if (position === 1) {
			return cn(
				baseClass,
				'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500',
				highlightClass
			);
		}
		if (position === 2) {
			return cn(
				baseClass,
				'bg-gray-50 dark:bg-gray-800/50 border-l-4 border-gray-400',
				highlightClass
			);
		}
		if (position === 3) {
			return cn(
				baseClass,
				'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500',
				highlightClass
			);
		}
		return cn(baseClass, 'hover:bg-muted/50', highlightClass);
	}
</script>

{#if standings.length === 0}
	<Card class="p-8 text-center">
		<p class="text-lg text-muted-foreground">Aucun participant pour le moment</p>
		<p class="mt-2 text-sm text-muted-foreground">Soyez le premier a jouer !</p>
	</Card>
{:else}
	<div class="overflow-x-auto rounded-lg border border-border">
		<table class="w-full text-sm">
			{#if showHeader}
				<thead class="border-b border-border bg-muted/50">
					<tr>
						<th
							class={cn(
								'px-4 py-3 text-center font-semibold text-foreground',
								compact && 'px-2 py-2'
							)}
						>
							Position
						</th>
						<th
							class={cn(
								'px-4 py-3 text-left font-semibold text-foreground',
								compact && 'px-2 py-2'
							)}
						>
							Joueur
						</th>
						<th
							class={cn(
								'px-4 py-3 text-center font-semibold text-foreground',
								compact && 'px-2 py-2'
							)}
						>
							Victoires
						</th>
						<th
							class={cn(
								'px-4 py-3 text-center font-semibold text-foreground',
								compact && 'px-2 py-2'
							)}
							title="Score base sur l'efficacite 3BV/s"
						>
							Score moyen
						</th>
						{#if isCompleted}
							<th
								class={cn(
									'px-4 py-3 text-center font-semibold text-foreground',
									compact && 'px-2 py-2'
								)}
							>
								Recompense
							</th>
						{/if}
					</tr>
				</thead>
			{/if}
			<tbody class="divide-y divide-border">
				{#each displayedStandings as entry (entry.student_id)}
					{@const isCurrentUser = entry.student_id === currentUserId}
					<tr class={getRankClass(entry.position, isCurrentUser)}>
						<td class={cn('px-4 py-3 text-center', compact && 'px-2 py-2')}>
							<div class="flex items-center justify-center gap-1">
								{#if entry.position <= 3}
									<span class={cn('text-xl', compact && 'text-lg')}
										>{getMedalEmoji(entry.position)}</span
									>
								{/if}
								<span class={cn('font-bold', compact && 'text-sm')}>#{entry.position}</span>
							</div>
						</td>
						<td class={cn('px-4 py-3', compact && 'px-2 py-2')}>
							<div class="flex items-center gap-2">
								<div class="min-w-0">
									<p class={cn('truncate font-semibold text-foreground', compact && 'text-sm')}>
										{entry.firstname}
										{entry.lastname.charAt(0)}.
									</p>
									{#if isCurrentUser}
										<Badge class="mt-1" variant="default">C'est vous !</Badge>
									{/if}
								</div>
							</div>
						</td>
						<td class={cn('px-4 py-3 text-center', compact && 'px-2 py-2')}>
							<span
								class={cn('font-bold text-green-600 dark:text-green-400', compact && 'text-sm')}
							>
								{entry.games_won}
							</span>
						</td>
						<td class={cn('px-4 py-3 text-center', compact && 'px-2 py-2')}>
							<span class={cn('font-mono font-semibold text-foreground', compact && 'text-sm')}>
								{formatScore(entry.average_score)}
							</span>
						</td>
						{#if isCompleted}
							{@const reward = getReward(entry.position)}
							<td class={cn('px-4 py-3 text-center', compact && 'px-2 py-2')}>
								{#if reward}
									<span class={cn('font-bold text-amber-500', compact && 'text-sm')}>
										+{reward}
									</span>
								{:else}
									<span class="text-muted-foreground">-</span>
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if standings.length > maxRows}
		<p class="mt-2 text-center text-sm text-muted-foreground">
			... et {standings.length - maxRows} autres participants
		</p>
	{/if}
{/if}
