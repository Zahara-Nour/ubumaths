<script lang="ts">
	import { lore } from '$lib/config/lore';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import type { GameLeaderboardRow } from '$lib/types/database-helpers';

	let { rows }: { rows: GameLeaderboardRow[] } = $props();

	function medal(rank: number): string {
		return ({ 1: '🥇', 2: '🥈', 3: '🥉' } as Record<number, string>)[rank] ?? '';
	}

	function formatScore(score: number): string {
		return Math.round(score).toLocaleString('fr-FR');
	}

	function initial(name: string): string {
		return (name?.trim()?.[0] ?? '?').toUpperCase();
	}
</script>

<div class="overflow-x-auto rounded-lg border border-border">
	<table class="w-full text-sm">
		<thead class="border-b border-border bg-muted/50">
			<tr>
				<th class="w-16 px-3 py-3 text-center font-semibold text-foreground">Rang</th>
				<th class="px-3 py-3 text-left font-semibold text-foreground">Joueur</th>
				<th class="px-3 py-3 text-right font-semibold text-foreground">Score</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-border/50">
			{#each rows as row (row.user_id)}
				<tr
					class="transition-colors hover:bg-muted/30 {row.is_me
						? 'bg-primary/5 ring-1 ring-primary/20 ring-inset'
						: ''} {row.is_teacher ? 'bg-muted/30' : ''}"
				>
					<td class="px-3 py-2 text-center">
						{#if row.rank === null}
							<span class="text-muted-foreground">—</span>
						{:else}
							<span class="font-semibold text-foreground">{medal(row.rank) || row.rank}</span>
						{/if}
					</td>
					<td class="px-3 py-2">
						<div class="flex items-center gap-2">
							<Avatar.Root class="h-8 w-8 flex-shrink-0">
								<Avatar.Image src={row.avatar_url ?? ''} alt={row.firstname} />
								<Avatar.Fallback class="bg-muted text-xs">{initial(row.firstname)}</Avatar.Fallback>
							</Avatar.Root>
							<span class="text-foreground">{row.firstname}</span>
							{#if row.is_teacher}
								<Badge variant="secondary">{lore.entities.teacher}</Badge>
							{:else if row.is_me}
								<Badge variant="secondary">Vous</Badge>
							{/if}
						</div>
					</td>
					<td class="px-3 py-2 text-right font-mono font-medium text-foreground">
						{formatScore(row.score)}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
