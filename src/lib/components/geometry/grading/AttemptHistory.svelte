<!--
  Attempt History Component
  Shows a list of all attempts with scores and trends
-->
<script lang="ts">
	import type { GeometryExerciseAttempt } from '$lib/types/geometry';
	import { GradeUtils } from '$lib/services/geometry-grade-utils';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Calendar, Clock, Award, TrendingUp, TrendingDown, Minus, Eye } from 'lucide-svelte';

	interface Props {
		attempts: GeometryExerciseAttempt[];
		maxScore: number;
		onViewAttempt?: (attempt: GeometryExerciseAttempt) => void;
	}

	let { attempts, maxScore, onViewAttempt }: Props = $props();

	// Sort attempts by date (most recent first)
	const sortedAttempts = $derived(
		[...attempts].sort(
			(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		)
	);

	// Calculate statistics
	const stats = $derived(GradeUtils.calculateAttemptStatistics(attempts));
	const trend = $derived(GradeUtils.getTrend(attempts));

	/**
	 * Get trend icon for attempt
	 */
	function getAttemptTrend(attempt: GeometryExerciseAttempt, index: number): string {
		if (index === sortedAttempts.length - 1) return '→'; // First attempt

		const previousAttempt = sortedAttempts[index + 1];
		const currentScore = attempt.score_earned ?? 0;
		const previousScore = previousAttempt.score_earned ?? 0;

		if (currentScore > previousScore) return '↗';
		if (currentScore < previousScore) return '↘';
		return '→';
	}

	/**
	 * Get trend color
	 */
	function getTrendColor(attempt: GeometryExerciseAttempt, index: number): string {
		const trendIcon = getAttemptTrend(attempt, index);
		if (trendIcon === '↗') return 'text-green-600 dark:text-green-400';
		if (trendIcon === '↘') return 'text-red-600 dark:text-red-400';
		return 'text-muted-foreground';
	}
</script>

<div class="attempt-history space-y-4">
	<!-- Statistics Summary -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title class="text-base">Statistiques</Card.Title>
					<Card.Description>
						{stats.count} tentative{stats.count > 1 ? 's' : ''}
					</Card.Description>
				</div>
				<div class="flex items-center gap-2 text-lg font-bold {trend.color}">
					<span>{trend.icon}</span>
					<span
						>{trend.trend === 'improving'
							? 'En progression'
							: trend.trend === 'declining'
								? 'En baisse'
								: 'Stable'}</span
					>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				<div class="space-y-1">
					<p class="text-xs text-muted-foreground">Meilleur</p>
					<p class="text-lg font-bold text-green-600 dark:text-green-400">
						{GradeUtils.formatScore(stats.best, maxScore)}
					</p>
				</div>
				<div class="space-y-1">
					<p class="text-xs text-muted-foreground">Moyenne</p>
					<p class="text-lg font-bold">
						{GradeUtils.formatScore(stats.average, maxScore)}
					</p>
				</div>
				<div class="space-y-1">
					<p class="text-xs text-muted-foreground">Médiane</p>
					<p class="text-lg font-bold">
						{GradeUtils.formatScore(stats.median, maxScore)}
					</p>
				</div>
				<div class="space-y-1">
					<p class="text-xs text-muted-foreground">Pire</p>
					<p class="text-lg font-bold text-red-600 dark:text-red-400">
						{GradeUtils.formatScore(stats.worst, maxScore)}
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Attempts List -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Historique des tentatives</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				{#each sortedAttempts as attempt, index}
					{@const percentage = ((attempt.score_earned ?? 0) / maxScore) * 100}
					{@const scoreColor = GradeUtils.getScoreColor(percentage)}
					{@const trendIcon = getAttemptTrend(attempt, index)}
					{@const trendColor = getTrendColor(attempt, index)}

					<div class="rounded-lg border p-4 transition-colors hover:bg-muted/50">
						<div class="flex items-center justify-between">
							<!-- Left: Attempt Info -->
							<div class="flex items-center gap-4">
								<!-- Attempt Number -->
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full {scoreColor.bg}"
								>
									<span class="text-lg font-bold {scoreColor.text}">
										#{attempt.attempts_count}
									</span>
								</div>

								<!-- Details -->
								<div class="space-y-1">
									<div class="flex items-center gap-3">
										<span class="text-lg font-bold {scoreColor.text}">
											{GradeUtils.formatScore(attempt.score_earned ?? 0, maxScore)}
										</span>
										<span class="text-sm text-muted-foreground">
											({Math.round(percentage)}%)
										</span>
										<span class="text-lg {trendColor}">
											{trendIcon}
										</span>
									</div>

									<div class="flex items-center gap-4 text-xs text-muted-foreground">
										<div class="flex items-center gap-1">
											<Calendar class="h-3 w-3" />
											<span>{GradeUtils.formatDate(attempt.created_at)}</span>
										</div>

										{#if attempt.time_spent_seconds}
											<div class="flex items-center gap-1">
												<Clock class="h-3 w-3" />
												<span>{GradeUtils.formatTime(attempt.time_spent_seconds)}</span>
											</div>
										{/if}

										{#if attempt.hints_used && attempt.hints_used > 0}
											<div class="text-orange-600 dark:text-orange-400">
												{attempt.hints_used} indice{attempt.hints_used > 1 ? 's' : ''}
											</div>
										{/if}

										{#if attempt.is_complete}
											<div class="text-green-600 dark:text-green-400">✓ Terminé</div>
										{/if}
									</div>
								</div>
							</div>

							<!-- Right: Actions -->
							{#if onViewAttempt}
								<Button variant="ghost" size="sm" onclick={() => onViewAttempt?.(attempt)}>
									<Eye class="mr-2 h-4 w-4" />
									Voir
								</Button>
							{/if}
						</div>

						<!-- Progress Bar -->
						<div class="mt-3 h-2 w-full rounded-full bg-muted">
							<div
								class="h-full rounded-full transition-all {scoreColor.bg}"
								style="width: {percentage}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>
</div>

<style>
	.attempt-history {
		max-width: 900px;
	}
</style>
