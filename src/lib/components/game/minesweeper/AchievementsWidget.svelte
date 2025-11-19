<script lang="ts">
	import { Trophy } from 'lucide-svelte';
	import AchievementBadge from './AchievementBadge.svelte';

	interface Achievement {
		id: string;
		achievement_id: string;
		name: string;
		description: string;
		icon: string;
		difficulty: string | null;
		unlocked_at: string;
		game_id: string;
	}

	interface AchievementStats {
		total_unlocked: number;
		total_possible: number;
		progress_percentage: number;
	}

	interface Props {
		achievements: Achievement[];
		stats: AchievementStats;
	}

	let { achievements, stats }: Props = $props();

	// Get most recent 4 achievements
	const recentAchievements = $derived(
		[...achievements]
			.sort((a, b) => {
				return new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime();
			})
			.slice(0, 4)
	);
</script>

<div class="space-y-4 rounded-lg border border-border bg-card p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-bold text-foreground">Succès Démineur</h2>
		<span class="text-sm font-medium text-muted-foreground">
			{stats.total_unlocked}/{stats.total_possible}
		</span>
	</div>

	<!-- Progress bar -->
	<div class="h-2 overflow-hidden rounded-full bg-muted">
		<div
			class="h-full bg-primary transition-all duration-300"
			style="width: {stats.progress_percentage}%"
		></div>
	</div>

	<!-- Recent achievements or empty state -->
	{#if recentAchievements.length > 0}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-4">
			{#each recentAchievements as achievement (achievement.id)}
				<AchievementBadge
					achievement_id={achievement.achievement_id}
					name={achievement.name}
					description={achievement.description}
					icon={achievement.icon}
					difficulty={achievement.difficulty}
					is_unlocked={true}
					unlocked_at={achievement.unlocked_at}
					size="small"
				/>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center py-8 text-center">
			<Trophy class="mb-3 h-12 w-12 text-muted-foreground opacity-50" />
			<p class="text-sm text-muted-foreground">
				Aucun succès débloqué. Jouez au Démineur pour en débloquer !
			</p>
		</div>
	{/if}

	<!-- Link to full achievements page -->
	<a
		href="/dashboard/student/minesweeper/achievements"
		class="flex items-center justify-center gap-2 text-sm text-primary transition-colors hover:underline"
	>
		Voir tous les succès
		<span>→</span>
	</a>
</div>
