<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';

	type LeaderboardEntry = {
		student_id: string;
		firstname: string | null;
		lastname: string | null;
		role: string | null;
		avg_top_10: number | null;
		top_games_count: number | null;
		[key: string]: unknown;
	};

	let {
		entries,
		currentUserId = null
	}: {
		entries: LeaderboardEntry[];
		currentUserId: string | null;
	} = $props();

	const rankedPlayers = $derived(entries.filter((e) => (e.top_games_count || 0) >= 10));

	const studentRankMap = $derived.by(() => {
		const map = new Map<string, number>();
		let studentPos = 0;
		for (const entry of rankedPlayers) {
			if (entry.role === 'student') {
				studentPos++;
				map.set(entry.student_id, studentPos);
			}
		}
		return map;
	});

	function getMedalEmoji(rank: number): string {
		return (
			{
				1: '🥇',
				2: '🥈',
				3: '🥉'
			}[rank] || ''
		);
	}

	function formatPoints(points: number): string {
		return points.toLocaleString('fr-FR');
	}
</script>

{#if rankedPlayers.length > 0}
	<div class="overflow-x-auto rounded-lg border border-border">
		<table class="w-full text-sm">
			<thead class="border-b border-border bg-muted/50">
				<tr>
					<th class="w-16 px-3 py-3 text-center font-semibold text-foreground">Rang</th>
					<th class="px-3 py-3 text-left font-semibold text-foreground">Joueur</th>
					<th class="px-3 py-3 text-center font-semibold text-foreground">Moyenne</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border">
				{#each rankedPlayers as entry (entry.student_id)}
					{@const studentRank = studentRankMap.get(entry.student_id)}
					<tr
						class="transition-colors hover:bg-muted/50 {entry.student_id === currentUserId
							? 'bg-primary/10'
							: ''}"
					>
						<td class="px-3 py-3 text-center font-bold text-foreground">
							{#if studentRank}
								<span class="text-lg">{getMedalEmoji(studentRank)}</span>
								<span class="ml-2 text-sm">#{studentRank}</span>
							{/if}
						</td>
						<td class="px-3 py-3">
							<p class="font-semibold text-foreground">
								{entry.firstname || ''}
								<span class="hidden sm:inline">{entry.lastname || ''}</span>
							</p>
							{#if entry.student_id === currentUserId}
								<Badge class="mt-1" variant="default">Vous</Badge>
							{/if}
						</td>
						<td class="px-3 py-3 text-center">
							<span class="font-mono font-bold text-primary">
								{formatPoints(entry.avg_top_10 || 0)}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
