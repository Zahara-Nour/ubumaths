<!--
	AchievementLeaderboard Component
	================================
	Displays a ranked leaderboard of users based on achievement points.

	Props:
	- entries: Array of leaderboard entries with rank, name, avatar, points, and count
	- currentUserId: ID of the current user to highlight their row
	- loading: Show loading skeleton state
	- limit: Maximum number of entries to display (default 10)
-->

<script lang="ts">
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Trophy, Medal, Award } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	// Type for leaderboard entry
	export type LeaderboardEntry = {
		rank: number;
		studentName: string;
		avatarUrl: string | null;
		totalPoints: number;
		achievementCount: number;
		userId?: string;
	};

	interface Props {
		entries: LeaderboardEntry[];
		currentUserId?: string | null;
		loading?: boolean;
		limit?: number;
	}

	let { entries, currentUserId = null, loading = false, limit = 10 }: Props = $props();

	// Get displayed entries (limited)
	let displayedEntries = $derived(entries.slice(0, limit));

	// Medal configuration for top 3
	const medalConfig: Record<number, { emoji: string; bgColor: string; borderColor: string }> = {
		1: {
			emoji: '🥇',
			bgColor: 'bg-amber-100 dark:bg-amber-900/30',
			borderColor: 'border-amber-400 dark:border-amber-500'
		},
		2: {
			emoji: '🥈',
			bgColor: 'bg-gray-100 dark:bg-gray-700/50',
			borderColor: 'border-gray-400 dark:border-gray-500'
		},
		3: {
			emoji: '🥉',
			bgColor: 'bg-orange-100 dark:bg-orange-900/30',
			borderColor: 'border-orange-400 dark:border-orange-500'
		}
	};

	// Check if entry is current user
	function isCurrentUser(entry: LeaderboardEntry): boolean {
		if (!currentUserId) return false;
		return entry.userId === currentUserId;
	}

	// Get initials from name for avatar fallback
	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Check if rank is in top 3
	function isTopThree(rank: number): boolean {
		return rank >= 1 && rank <= 3;
	}
</script>

{#if loading}
	<!-- Loading State -->
	<div class="space-y-2">
		{#each Array(Math.min(limit, 5)) as _, i (i)}
			<div class="flex items-center gap-4 rounded-lg border p-3">
				<Skeleton class="h-8 w-8 rounded-full" />
				<Skeleton class="h-10 w-10 rounded-full" />
				<div class="flex-1 space-y-2">
					<Skeleton class="h-4 w-32" />
					<Skeleton class="h-3 w-20" />
				</div>
				<Skeleton class="h-6 w-16" />
			</div>
		{/each}
	</div>
{:else if displayedEntries.length === 0}
	<!-- Empty State -->
	<div
		class="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"
	>
		<Trophy class="mb-3 h-10 w-10 text-muted-foreground/50" />
		<p class="text-sm text-muted-foreground">Aucun classement disponible</p>
	</div>
{:else}
	<!-- Leaderboard List -->
	<div class="space-y-2" role="list">
		{#each displayedEntries as entry (entry.rank)}
			{@const topThree = isTopThree(entry.rank)}
			{@const medal = medalConfig[entry.rank]}
			{@const isCurrent = isCurrentUser(entry)}

			<div
				class={cn(
					'flex items-center gap-3 rounded-lg border p-3 transition-all',
					topThree && medal ? `${medal.bgColor} ${medal.borderColor} border-2` : 'bg-card',
					isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
					!topThree && (entry.rank % 2 === 0 ? 'bg-muted/30' : 'bg-card')
				)}
				role="listitem"
				aria-label={`${entry.rank}${entry.rank === 1 ? 'er' : 'eme'} place: ${entry.studentName} avec ${entry.totalPoints} points`}
			>
				<!-- Rank indicator -->
				<div
					class={cn(
						'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
						topThree ? 'text-2xl' : 'bg-muted text-muted-foreground'
					)}
					aria-hidden="true"
				>
					{#if topThree && medal}
						{medal.emoji}
					{:else}
						{entry.rank}
					{/if}
				</div>

				<!-- Avatar -->
				<Avatar class="h-10 w-10 shrink-0">
					{#if entry.avatarUrl}
						<AvatarImage src={entry.avatarUrl} alt={entry.studentName} />
					{/if}
					<AvatarFallback
						class={cn(
							'text-sm font-medium',
							topThree && entry.rank === 1 && 'bg-amber-200 text-amber-800',
							topThree && entry.rank === 2 && 'bg-gray-200 text-gray-800',
							topThree && entry.rank === 3 && 'bg-orange-200 text-orange-800'
						)}
					>
						{getInitials(entry.studentName)}
					</AvatarFallback>
				</Avatar>

				<!-- Name and achievement count -->
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span
							class={cn(
								'truncate font-medium',
								isCurrent && 'text-primary',
								topThree && entry.rank === 1 && 'text-amber-700 dark:text-amber-400'
							)}
						>
							{entry.studentName}
						</span>
						{#if isCurrent}
							<span class="text-xs text-primary">(vous)</span>
						{/if}
					</div>
					<div class="flex items-center gap-1 text-xs text-muted-foreground">
						<Award class="h-3 w-3" />
						<span>
							{entry.achievementCount} achievement{entry.achievementCount !== 1 ? 's' : ''}
						</span>
					</div>
				</div>

				<!-- Points -->
				<div class="flex shrink-0 items-center gap-1.5 text-right">
					{#if topThree}
						<Medal
							class={cn(
								'h-4 w-4',
								entry.rank === 1 && 'text-amber-500',
								entry.rank === 2 && 'text-gray-500',
								entry.rank === 3 && 'text-orange-500'
							)}
						/>
					{/if}
					<div>
						<span class={cn('font-bold', topThree && 'text-lg')}>
							{entry.totalPoints.toLocaleString('fr-FR')}
						</span>
						<span class="ml-1 text-xs text-muted-foreground">pts</span>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Show more indicator if there are more entries -->
	{#if entries.length > limit}
		<p class="mt-3 text-center text-xs text-muted-foreground">
			+{entries.length - limit} autres participants
		</p>
	{/if}
{/if}
