<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import AchievementBadge from './AchievementBadge.svelte';

	interface Achievement {
		achievement_id: string;
		name: string;
		description: string;
		icon: string;
		difficulty_specific: boolean;
		difficulty: string | null;
		is_unlocked: boolean;
		unlocked_at: string | null;
	}

	interface Stats {
		total_unlocked: number;
		total_possible: number;
		progress_percentage: number;
	}

	interface Props {
		achievements: Achievement[];
		stats: Stats;
	}

	let { achievements, stats }: Props = $props();

	// Filter state
	let filter = $state<'all' | 'unlocked' | 'locked'>('all');

	// Sort state
	let sortBy = $state<'recent' | 'alphabetical'>('recent');

	// Filtered and sorted achievements
	const filteredAchievements = $derived(() => {
		let result = achievements;

		// Apply filter
		if (filter === 'unlocked') {
			result = result.filter((a) => a.is_unlocked);
		} else if (filter === 'locked') {
			result = result.filter((a) => !a.is_unlocked);
		}

		// Apply sort
		if (sortBy === 'recent') {
			result = [...result].sort((a, b) => {
				// Unlocked achievements first
				if (a.is_unlocked && !b.is_unlocked) return -1;
				if (!a.is_unlocked && b.is_unlocked) return 1;

				// Then by unlock date (most recent first)
				if (a.unlocked_at && b.unlocked_at) {
					return new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime();
				}

				// Unlocked with date before unlocked without date
				if (a.unlocked_at && !b.unlocked_at) return -1;
				if (!a.unlocked_at && b.unlocked_at) return 1;

				// Alphabetical as fallback
				return a.name.localeCompare(b.name, 'fr');
			});
		} else {
			result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
		}

		return result;
	});

	// Get the filtered achievements value
	const displayedAchievements = $derived(filteredAchievements());
</script>

<div class="space-y-6">
	<!-- Progress header -->
	<div class="space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-2xl font-bold text-foreground">
				Succès ({stats.total_unlocked}/{stats.total_possible})
			</h2>
			<span class="text-sm font-semibold text-muted-foreground">
				{stats.progress_percentage}% complété
			</span>
		</div>

		<!-- Progress bar -->
		<div
			class="h-3 overflow-hidden rounded-full border border-border bg-muted"
			role="progressbar"
			aria-valuenow={stats.progress_percentage}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label="Progression des succès"
		>
			<div
				class={cn(
					'h-full transition-all duration-500 ease-out',
					stats.progress_percentage === 100
						? 'bg-gradient-to-r from-green-500 to-emerald-600'
						: 'bg-primary'
				)}
				style="width: {stats.progress_percentage}%"
			></div>
		</div>

		{#if stats.progress_percentage === 100}
			<p class="text-center text-sm font-semibold text-green-600 dark:text-green-400">
				🎉 Félicitations ! Tous les succès ont été débloqués !
			</p>
		{/if}
	</div>

	<!-- Filters and sort controls -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<!-- Filter buttons -->
		<div class="flex gap-2" role="group" aria-label="Filtrer les succès">
			<Button
				variant={filter === 'all' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (filter = 'all')}
				aria-pressed={filter === 'all'}
			>
				Tous
			</Button>
			<Button
				variant={filter === 'unlocked' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (filter = 'unlocked')}
				aria-pressed={filter === 'unlocked'}
			>
				Débloqués ({achievements.filter((a) => a.is_unlocked).length})
			</Button>
			<Button
				variant={filter === 'locked' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (filter = 'locked')}
				aria-pressed={filter === 'locked'}
			>
				Verrouillés ({achievements.filter((a) => !a.is_unlocked).length})
			</Button>
		</div>

		<!-- Sort buttons -->
		<div class="flex gap-2" role="group" aria-label="Trier les succès">
			<Button
				variant={sortBy === 'recent' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (sortBy = 'recent')}
				aria-pressed={sortBy === 'recent'}
			>
				Plus récents
			</Button>
			<Button
				variant={sortBy === 'alphabetical' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (sortBy = 'alphabetical')}
				aria-pressed={sortBy === 'alphabetical'}
			>
				Alphabétique
			</Button>
		</div>
	</div>

	<!-- Badges grid -->
	{#if displayedAchievements.length === 0}
		<div class="py-12 text-center">
			<p class="text-lg text-muted-foreground">
				{#if filter === 'all'}
					Aucun succès disponible.
				{:else if filter === 'unlocked'}
					Aucun succès débloqué. Jouez pour en débloquer !
				{:else}
					Tous les succès ont été débloqués ! 🎉
				{/if}
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each displayedAchievements as achievement (achievement.achievement_id + (achievement.difficulty || ''))}
				<AchievementBadge
					achievement_id={achievement.achievement_id}
					name={achievement.name}
					description={achievement.description}
					icon={achievement.icon}
					difficulty={achievement.difficulty}
					is_unlocked={achievement.is_unlocked}
					unlocked_at={achievement.unlocked_at}
					size="medium"
				/>
			{/each}
		</div>
	{/if}
</div>
