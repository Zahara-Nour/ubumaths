<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import type { MinesweeperLeaderboardRow } from '$lib/types/database-helpers';

	let { rows }: { rows: MinesweeperLeaderboardRow[] } = $props();

	// Ranked = teacher reference row OR students with >= 10 qualifying games.
	const ranked = $derived(rows.filter((r) => r.is_teacher || (r.top_games_count ?? 0) >= 10));
	// Provisional = students with < 10 games (no rank yet).
	const provisional = $derived(rows.filter((r) => !r.is_teacher && (r.top_games_count ?? 0) < 10));

	function medal(rank: number): string {
		return ({ 1: '🥇', 2: '🥈', 3: '🥉' } as Record<number, string>)[rank] ?? '';
	}

	function fmt(n: number | null): string {
		return (n ?? 0).toLocaleString('fr-FR');
	}

	function initial(name: string): string {
		return (name?.trim()?.[0] ?? '?').toUpperCase();
	}
</script>

{#if ranked.length > 0}
	<div class="overflow-x-auto rounded-lg border border-border">
		<table class="w-full text-sm">
			<thead class="border-b border-border bg-muted/50">
				<tr>
					<th class="w-16 px-3 py-3 text-center font-semibold text-foreground">Rang</th>
					<th class="px-3 py-3 text-left font-semibold text-foreground">Joueur</th>
					<th class="px-3 py-3 text-center font-semibold text-foreground">Moyenne</th>
					<th class="px-3 py-3 text-center font-semibold text-foreground">Parties</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border/50">
				{#each ranked as row (row.user_id)}
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
									<Avatar.Fallback class="bg-muted text-xs"
										>{initial(row.firstname)}</Avatar.Fallback
									>
								</Avatar.Root>
								<span class="text-foreground">{row.firstname}</span>
								{#if row.is_teacher}
									<Badge variant="secondary">Prof</Badge>
								{:else if row.is_me}
									<Badge variant="secondary">Vous</Badge>
								{/if}
							</div>
						</td>
						<td class="px-3 py-2 text-center font-mono text-foreground">{fmt(row.avg_top_10)}</td>
						<td class="px-3 py-2 text-center text-muted-foreground">{row.top_games_count}/10</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<Card class="p-8 text-center">
		<p class="text-muted-foreground">Aucun joueur classé (10 parties minimum)</p>
	</Card>
{/if}

{#if provisional.length > 0}
	<div class="mt-6">
		<h3 class="mb-3 text-sm font-semibold text-muted-foreground">
			Non classés (moins de 10 parties)
		</h3>
		<div class="overflow-x-auto rounded-lg border border-border/50">
			<table class="w-full text-sm">
				<thead class="border-b border-border bg-muted/30">
					<tr>
						<th class="px-3 py-2 text-left font-medium text-muted-foreground">Joueur</th>
						<th class="px-3 py-2 text-center font-medium text-muted-foreground">Moyenne</th>
						<th class="px-3 py-2 text-center font-medium text-muted-foreground">Parties</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/50">
					{#each provisional as row (row.user_id)}
						<tr
							class="transition-colors hover:bg-muted/30 {row.is_me
								? 'bg-primary/5 ring-1 ring-primary/20 ring-inset'
								: ''}"
						>
							<td class="px-3 py-2">
								<div class="flex items-center gap-2">
									<Avatar.Root class="h-7 w-7 flex-shrink-0">
										<Avatar.Image src={row.avatar_url ?? ''} alt={row.firstname} />
										<Avatar.Fallback class="bg-muted text-xs"
											>{initial(row.firstname)}</Avatar.Fallback
										>
									</Avatar.Root>
									<span class="text-foreground">{row.firstname}</span>
									{#if row.is_me}
										<Badge variant="secondary">Vous</Badge>
									{/if}
								</div>
							</td>
							<td class="px-3 py-2 text-center font-mono text-muted-foreground"
								>{fmt(row.avg_top_10)}</td
							>
							<td class="px-3 py-2 text-center text-muted-foreground">{row.top_games_count}/10</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
