<!--
	AchievementList Component
	=========================
	Displays a filterable, sortable list of achievements with stats.

	Props:
	- achievements: Array of achievements with their unlock status and progress
	- loading: Show loading skeleton state
	- emptyMessage: Message to display when no achievements match filters
-->

<script lang="ts">
	import AchievementCard from './AchievementCard.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Trophy, Target, Percent, Star } from 'lucide-svelte';
	import type { Achievement, AchievementRarity } from '$lib/types/achievements';
	import { cn } from '$lib/utils';

	// Type for achievement with status (from props)
	type AchievementWithStatus = {
		achievement: Achievement;
		unlocked: boolean;
		unlockedAt: string | null;
		progress: number | null;
	};

	interface Props {
		achievements: AchievementWithStatus[];
		loading?: boolean;
		emptyMessage?: string;
	}

	let {
		achievements,
		loading = false,
		emptyMessage = 'Aucun achievement trouve'
	}: Props = $props();

	// Filter state
	let filterContext = $state<string>('all');
	let filterStatus = $state<string>('all');
	let filterCategory = $state<string>('all');

	// Sort state
	let sortBy = $state<string>('default');

	// Compact mode
	let compactMode = $state(false);

	// Context filter options
	const contextOptions = [
		{ value: 'all', label: 'Tous les contextes' },
		{ value: 'minesweeper', label: 'Demineur' },
		{ value: 'questions', label: 'Questions' },
		{ value: 'assessments', label: 'Evaluations' },
		{ value: 'srs', label: 'Revision espacee' },
		{ value: 'riddles', label: 'Enigmes' },
		{ value: 'social', label: 'Social' },
		{ value: 'meta', label: 'Meta' }
	];

	// Status filter options
	const statusOptions = [
		{ value: 'all', label: 'Tous' },
		{ value: 'unlocked', label: 'Debloques' },
		{ value: 'locked', label: 'Verrouilles' }
	];

	// Category filter options
	const categoryOptions = [
		{ value: 'all', label: 'Toutes categories' },
		{ value: 'speed', label: 'Vitesse' },
		{ value: 'accuracy', label: 'Precision' },
		{ value: 'streak', label: 'Serie' },
		{ value: 'mastery', label: 'Maitrise' },
		{ value: 'participation', label: 'Participation' },
		{ value: 'social', label: 'Social' },
		{ value: 'collection', label: 'Collection' }
	];

	// Sort options
	const sortOptions = [
		{ value: 'default', label: 'Par defaut' },
		{ value: 'rarity', label: 'Par rarete' },
		{ value: 'date', label: 'Date de deblocage' },
		{ value: 'points', label: 'Points' }
	];

	// Rarity order for sorting
	const rarityOrder: Record<AchievementRarity, number> = {
		legendary: 0,
		epic: 1,
		rare: 2,
		uncommon: 3,
		common: 4
	};

	// Filtered achievements
	let filteredAchievements = $derived.by(() => {
		let result = [...achievements];

		// Filter by context
		if (filterContext !== 'all') {
			result = result.filter((a) => a.achievement.context === filterContext);
		}

		// Filter by status
		if (filterStatus === 'unlocked') {
			result = result.filter((a) => a.unlocked);
		} else if (filterStatus === 'locked') {
			result = result.filter((a) => !a.unlocked);
		}

		// Filter by category
		if (filterCategory !== 'all') {
			result = result.filter((a) => a.achievement.category === filterCategory);
		}

		// Sort
		result.sort((a, b) => {
			switch (sortBy) {
				case 'rarity': {
					const rarityA = a.achievement.metadata?.rarity ?? 'common';
					const rarityB = b.achievement.metadata?.rarity ?? 'common';
					const rarityDiff = rarityOrder[rarityA] - rarityOrder[rarityB];
					if (rarityDiff !== 0) return rarityDiff;
					// Secondary sort by unlocked status
					if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
					return (a.achievement.display_order ?? 0) - (b.achievement.display_order ?? 0);
				}
				case 'date': {
					// Unlocked first, then by date (most recent first)
					if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
					if (a.unlockedAt && b.unlockedAt) {
						return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
					}
					return (a.achievement.display_order ?? 0) - (b.achievement.display_order ?? 0);
				}
				case 'points': {
					const pointsA = a.achievement.metadata?.points ?? a.achievement.points ?? 0;
					const pointsB = b.achievement.metadata?.points ?? b.achievement.points ?? 0;
					// Higher points first
					const pointsDiff = pointsB - pointsA;
					if (pointsDiff !== 0) return pointsDiff;
					if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
					return (a.achievement.display_order ?? 0) - (b.achievement.display_order ?? 0);
				}
				default:
					// Default: unlocked first, then by display_order
					if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
					return (a.achievement.display_order ?? 0) - (b.achievement.display_order ?? 0);
			}
		});

		return result;
	});

	// Statistics
	let stats = $derived.by(() => {
		const total = achievements.length;
		const unlocked = achievements.filter((a) => a.unlocked).length;
		const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
		const totalPoints = achievements
			.filter((a) => a.unlocked)
			.reduce((sum, a) => {
				const points = a.achievement.metadata?.points ?? a.achievement.points ?? 0;
				return sum + points;
			}, 0);

		return { total, unlocked, percentage, totalPoints };
	});

	// Reset all filters
	function resetFilters() {
		filterContext = 'all';
		filterStatus = 'all';
		filterCategory = 'all';
		sortBy = 'default';
	}

	// Check if any filter is active
	let hasActiveFilters = $derived(
		filterContext !== 'all' ||
			filterStatus !== 'all' ||
			filterCategory !== 'all' ||
			sortBy !== 'default'
	);
</script>

{#if loading}
	<!-- Loading State -->
	<div class="space-y-6">
		<!-- Stats skeleton -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			{#each Array(4) as _, i (i)}
				<Skeleton class="h-20 rounded-lg" />
			{/each}
		</div>
		<!-- Filters skeleton -->
		<div class="flex flex-wrap gap-4">
			{#each Array(4) as _, i (i)}
				<Skeleton class="h-10 w-40" />
			{/each}
		</div>
		<!-- Cards skeleton -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _, i (i)}
				<Skeleton class="h-48 rounded-lg" />
			{/each}
		</div>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Stats Section -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<!-- Total achievements -->
			<div class="flex items-center gap-3 rounded-lg border bg-card p-4">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
					<Trophy class="h-5 w-5 text-primary" />
				</div>
				<div>
					<p class="text-2xl font-bold">{stats.total}</p>
					<p class="text-xs text-muted-foreground">Total</p>
				</div>
			</div>

			<!-- Unlocked achievements -->
			<div class="flex items-center gap-3 rounded-lg border bg-card p-4">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
					<Target class="h-5 w-5 text-green-500" />
				</div>
				<div>
					<p class="text-2xl font-bold">{stats.unlocked}</p>
					<p class="text-xs text-muted-foreground">Debloques</p>
				</div>
			</div>

			<!-- Completion percentage -->
			<div class="flex items-center gap-3 rounded-lg border bg-card p-4">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
					<Percent class="h-5 w-5 text-blue-500" />
				</div>
				<div>
					<p class="text-2xl font-bold">{stats.percentage}%</p>
					<p class="text-xs text-muted-foreground">Completion</p>
				</div>
			</div>

			<!-- Total points -->
			<div class="flex items-center gap-3 rounded-lg border bg-card p-4">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
					<Star class="h-5 w-5 text-amber-500" />
				</div>
				<div>
					<p class="text-2xl font-bold">{stats.totalPoints}</p>
					<p class="text-xs text-muted-foreground">Points</p>
				</div>
			</div>
		</div>

		<!-- Filters Section -->
		<div class="flex flex-wrap items-center gap-4">
			<!-- Context filter -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Contexte:</span>
				<MySelect bind:value={filterContext} items={contextOptions} placeholder="Contexte" />
			</div>

			<!-- Status filter -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Statut:</span>
				<MySelect bind:value={filterStatus} items={statusOptions} placeholder="Statut" />
			</div>

			<!-- Category filter -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Categorie:</span>
				<MySelect bind:value={filterCategory} items={categoryOptions} placeholder="Categorie" />
			</div>

			<!-- Sort -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Trier:</span>
				<MySelect bind:value={sortBy} items={sortOptions} placeholder="Tri" />
			</div>

			<!-- Compact mode toggle -->
			<button
				type="button"
				class={cn(
					'rounded-md px-3 py-2 text-sm transition-colors',
					compactMode
						? 'bg-primary text-primary-foreground'
						: 'border bg-background hover:bg-accent'
				)}
				onclick={() => (compactMode = !compactMode)}
				aria-pressed={compactMode}
			>
				{compactMode ? 'Mode complet' : 'Mode compact'}
			</button>

			<!-- Reset filters -->
			{#if hasActiveFilters}
				<button
					type="button"
					class="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
					onclick={resetFilters}
				>
					Reinitialiser
				</button>
			{/if}
		</div>

		<!-- Results counter -->
		<div class="text-sm text-muted-foreground">
			{filteredAchievements.length} achievement{filteredAchievements.length !== 1 ? 's' : ''}
			{#if hasActiveFilters}
				(filtre{filteredAchievements.length !== achievements.length ? 's' : ''} sur {achievements.length})
			{/if}
		</div>

		<!-- Achievements Grid -->
		{#if filteredAchievements.length === 0}
			<!-- Empty state -->
			<div
				class="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center"
			>
				<Trophy class="mb-4 h-12 w-12 text-muted-foreground/50" />
				<p class="text-lg font-medium text-muted-foreground">{emptyMessage}</p>
				{#if hasActiveFilters}
					<button
						type="button"
						class="mt-4 text-sm text-primary hover:underline"
						onclick={resetFilters}
					>
						Effacer les filtres
					</button>
				{/if}
			</div>
		{:else}
			<div
				class={cn(
					'grid gap-4',
					compactMode ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
				)}
			>
				{#each filteredAchievements as item (item.achievement.id)}
					<AchievementCard
						achievement={item.achievement}
						unlocked={item.unlocked}
						unlockedAt={item.unlockedAt}
						progress={item.progress}
						compact={compactMode}
					/>
				{/each}
			</div>
		{/if}
	</div>
{/if}
