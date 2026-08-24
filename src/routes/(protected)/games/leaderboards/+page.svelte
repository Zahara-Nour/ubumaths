<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { resolve } from '$app/paths';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Trophy } from '@lucide/svelte';
	import UnifiedLeaderboardTable from '$lib/components/game/leaderboard/UnifiedLeaderboardTable.svelte';
	import MinesweeperDetailTable from '$lib/components/game/leaderboard/MinesweeperDetailTable.svelte';
	import { LEADERBOARD_GAMES, LEADERBOARD_SCOPES, gameLabel } from '$lib/games/leaderboards';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// At least one real student in the current ranking (the teacher alone ≠ a ranking).
	const hasStudents = $derived(data.rows.some((r) => !r.is_teacher));

	const emptyMessage = $derived(
		data.scope === 'class'
			? 'Aucun camarade classé pour l’instant.'
			: data.scope === 'grade'
				? `Aucun ${lore.entities.student} de ton niveau classé pour l’instant.`
				: `Aucun ${lore.entities.student} de ton école classé pour l’instant.`
	);
</script>

<svelte:head>
	<title>Classements | Chiphre</title>
	<meta
		name="description"
		content="Classements des jeux Chiphre ({lore.entities.class}, niveau, école)"
	/>
</svelte:head>

<div class="mx-auto max-w-4xl p-4 md:p-6">
	<div class="mb-6 text-center">
		<div class="mb-3 flex justify-center">
			<div
				class="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg"
			>
				<Trophy class="h-7 w-7 text-white" />
			</div>
		</div>
		<h1 class="mb-1 text-2xl font-bold text-foreground md:text-3xl">Classements</h1>
		<p class="text-sm text-muted-foreground">
			Compare tes scores dans ton {lore.entities.class}, ton niveau et ton école
		</p>
	</div>

	<!-- Game selector (segmented links) -->
	<div class="mb-4 flex flex-wrap justify-center gap-2">
		{#each LEADERBOARD_GAMES as g (g.value)}
			<a
				href="{resolve('/games/leaderboards')}?game={g.value}&scope={data.scope}"
				data-sveltekit-noscroll
				aria-current={data.game === g.value ? 'page' : undefined}
				class="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors {data.game ===
				g.value
					? 'border-primary bg-primary/10 text-foreground'
					: 'border-border text-muted-foreground hover:text-foreground'}"
			>
				<span aria-hidden="true">{g.emoji}</span>
				<span>{g.label}</span>
			</a>
		{/each}
	</div>

	<!-- Scope tabs (segmented links) -->
	<div class="mb-6 flex justify-center">
		<div class="inline-flex rounded-lg border border-border bg-muted/30 p-1">
			{#each LEADERBOARD_SCOPES as s (s.value)}
				<a
					href="{resolve('/games/leaderboards')}?game={data.game}&scope={s.value}"
					data-sveltekit-noscroll
					aria-current={data.scope === s.value ? 'page' : undefined}
					class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {data.scope ===
					s.value
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					{s.label}
				</a>
			{/each}
		</div>
	</div>

	<Separator class="mb-6" />

	<!-- Unified ranking (total_points / best_score / total_score) -->
	{#if hasStudents}
		<UnifiedLeaderboardTable rows={data.rows} />
	{:else}
		<Card class="p-10 text-center">
			<Trophy class="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
			<p class="text-muted-foreground">{emptyMessage}</p>
		</Card>
	{/if}

	<!-- Minesweeper detailed view (avg of the 10 best games), same scope -->
	{#if data.game === 'minesweeper' && data.minesweeperDetail && data.minesweeperDetail.length > 0}
		<div class="mt-10">
			<h2 class="mb-1 text-lg font-semibold text-foreground">
				{gameLabel('minesweeper')} — vue détaillée
			</h2>
			<p class="mb-4 text-sm text-muted-foreground">
				Classement par moyenne des 10 meilleures parties
			</p>
			<MinesweeperDetailTable rows={data.minesweeperDetail} />
		</div>
	{/if}
</div>
