<!--
	Student Riddles Leaderboard Page
	==================================
	Global leaderboard for riddle achievements
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Trophy, User, ArrowLeft, Crown } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	let { data }: { data: PageData } = $props();

	function getRankBadge(rank: number) {
		if (rank === 1) return '🥇';
		if (rank === 2) return '🥈';
		if (rank === 3) return '🥉';
		return rank;
	}

	function getRankColor(rank: number) {
		if (rank === 1) return 'text-yellow-500 dark:text-yellow-400';
		if (rank === 2) return 'text-gray-400';
		if (rank === 3) return 'text-amber-600 dark:text-amber-500';
		return 'text-muted-foreground';
	}

	function isCurrentUser(studentId: string) {
		return studentId === data.currentUserId;
	}
</script>

<svelte:head>
	<title>Classement Énigmes - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6">
		<Button variant="ghost" href="/dashboard/student/riddles" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour aux énigmes
		</Button>

		<h1 class="flex items-center gap-2 text-3xl font-bold">
			<Trophy class="h-8 w-8 text-primary" />
			Classement des Énigmes
		</h1>
		<p class="mt-2 text-muted-foreground">Qui a résolu le plus d'énigmes ?</p>
	</div>

	<!-- User Rank Banner -->
	{#if data.currentUserRank}
		<Card.Root class="mb-6 border-2 border-primary">
			<Card.Content class="flex items-center justify-between pt-6">
				<div class="flex items-center gap-3">
					<Crown class="h-8 w-8 text-primary" />
					<div>
						<p class="text-sm text-muted-foreground">Ta position</p>
						<p class="text-2xl font-bold">#{data.currentUserRank}</p>
					</div>
				</div>
				{#if data.currentUserRank <= 3}
					<div class="text-4xl">
						{getRankBadge(data.currentUserRank)}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Podium (Top 3) -->
	{#if data.leaderboard.length >= 3}
		<div class="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
			<!-- 2nd Place -->
			<div class="order-1 flex flex-col items-center">
				<div class="mb-1 text-2xl sm:mb-2 sm:text-4xl">🥈</div>
				<Avatar.Root class="h-10 w-10 border-2 border-gray-400 sm:h-16 sm:w-16 sm:border-4">
					<Avatar.Image src={data.leaderboard[1].profile.avatar_url} alt="Avatar 2ème" />
					<Avatar.Fallback>
						<User class="h-4 w-4 sm:h-6 sm:w-6" />
					</Avatar.Fallback>
				</Avatar.Root>
				<p class="mt-1 line-clamp-1 text-center text-xs font-medium sm:mt-2 sm:text-sm">
					{data.leaderboard[1].profile.firstname || ''}
				</p>
				<p class="text-base font-bold text-yellow-600 sm:text-lg dark:text-yellow-400">
					{data.leaderboard[1].total_gidouilles_from_riddles}
				</p>
				<p class="hidden text-xs text-muted-foreground sm:block">
					{data.leaderboard[1].riddles_completed} énigmes
				</p>
			</div>

			<!-- 1st Place -->
			<div class="order-2 flex flex-col items-center">
				<div class="mb-1 text-3xl sm:mb-2 sm:text-5xl">🥇</div>
				<Avatar.Root class="h-14 w-14 border-2 border-yellow-500 sm:h-20 sm:w-20 sm:border-4">
					<Avatar.Image src={data.leaderboard[0].profile.avatar_url} alt="Avatar 1er" />
					<Avatar.Fallback>
						<User class="h-5 w-5 sm:h-8 sm:w-8" />
					</Avatar.Fallback>
				</Avatar.Root>
				<p class="mt-1 line-clamp-1 text-center text-sm font-bold sm:mt-2">
					{data.leaderboard[0].profile.firstname || ''}
				</p>
				<p class="text-xl font-bold text-yellow-600 sm:text-2xl dark:text-yellow-400">
					{data.leaderboard[0].total_gidouilles_from_riddles}
				</p>
				<p class="hidden text-xs text-muted-foreground sm:block">
					{data.leaderboard[0].riddles_completed} énigmes
				</p>
			</div>

			<!-- 3rd Place -->
			<div class="order-3 flex flex-col items-center">
				<div class="mb-1 text-2xl sm:mb-2 sm:text-4xl">🥉</div>
				<Avatar.Root class="h-10 w-10 border-2 border-amber-600 sm:h-16 sm:w-16 sm:border-4">
					<Avatar.Image src={data.leaderboard[2].profile.avatar_url} alt="Avatar 3ème" />
					<Avatar.Fallback>
						<User class="h-4 w-4 sm:h-6 sm:w-6" />
					</Avatar.Fallback>
				</Avatar.Root>
				<p class="mt-1 line-clamp-1 text-center text-xs font-medium sm:mt-2 sm:text-sm">
					{data.leaderboard[2].profile.firstname || ''}
				</p>
				<p class="text-base font-bold text-yellow-600 sm:text-lg dark:text-yellow-400">
					{data.leaderboard[2].total_gidouilles_from_riddles}
				</p>
				<p class="hidden text-xs text-muted-foreground sm:block">
					{data.leaderboard[2].riddles_completed} énigmes
				</p>
			</div>
		</div>
	{/if}

	<!-- Full Leaderboard -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Classement complet</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if data.leaderboard.length > 0}
				<div class="space-y-2">
					{#each data.leaderboard as entry (entry.student_id)}
						<div
							class={cn(
								'flex items-center justify-between rounded-lg border p-3 transition-colors',
								isCurrentUser(entry.student_id) && 'border-primary bg-primary/5'
							)}
						>
							<div class="flex items-center gap-3">
								<!-- Rank -->
								<div
									class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold {getRankColor(
										entry.rank
									)}"
								>
									{getRankBadge(entry.rank)}
								</div>

								<!-- Avatar -->
								<Avatar.Root>
									<Avatar.Image src={entry.profile.avatar_url} alt="Avatar élève" />
									<Avatar.Fallback>
										<User class="h-4 w-4" />
									</Avatar.Fallback>
								</Avatar.Root>

								<!-- Info -->
								<div>
									<p class="font-medium">
										{entry.profile.firstname || ''}
										{entry.profile.lastname || ''}
										{#if isCurrentUser(entry.student_id)}
											<Badge variant="outline" class="ml-2">Toi</Badge>
										{/if}
									</p>
									<p class="text-sm text-muted-foreground">
										{entry.riddles_completed} énigme{entry.riddles_completed > 1 ? 's' : ''} réussie{entry.riddles_completed >
										1
											? 's'
											: ''}
									</p>
								</div>
							</div>

							<!-- Score -->
							<div class="text-right">
								<p class="text-xl font-bold text-yellow-600 dark:text-yellow-400">
									{entry.total_gidouilles_from_riddles}
								</p>
								<p class="text-xs text-muted-foreground">gidouilles</p>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="py-8 text-center text-muted-foreground">
					Aucun classement disponible pour le moment.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
