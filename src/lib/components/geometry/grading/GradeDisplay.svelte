<!--
  Grade Display Component
  Shows grade results with score, percentage, and letter grade
-->
<script lang="ts">
	import type { GradeResult } from '$lib/services/geometry-grader';
	import { GradeUtils } from '$lib/services/geometry-grade-utils';
	import * as Card from '$lib/components/ui/card';
	import {
		Award,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		TrendingUp, // For future trend indicators
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		TrendingDown, // For future trend indicators
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		Minus // For future neutral indicators
	} from 'lucide-svelte';

	interface Props {
		gradeResult: GradeResult;
		showDetails?: boolean;
		showPenalties?: boolean;
	}

	let { gradeResult, showDetails = true, showPenalties = true }: Props = $props();

	const scoreColor = $derived(GradeUtils.getScoreColor(gradeResult.percentage));
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const letterGradeColor = $derived(GradeUtils.getLetterGradeColor(gradeResult.grade)); // For future letter grade styling
	const performanceTier = $derived(GradeUtils.getPerformanceTier(gradeResult.percentage));
</script>

<Card.Root class="border-2 {scoreColor.border}">
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="rounded-full {scoreColor.bg} p-3">
					<Award class="h-6 w-6 {scoreColor.text}" />
				</div>
				<div>
					<Card.Title class="text-2xl {scoreColor.text}">
						{gradeResult.grade}
					</Card.Title>
					<Card.Description>
						{Math.round(gradeResult.percentage)}% - {performanceTier.tier}
					</Card.Description>
				</div>
			</div>

			<div class="text-right">
				<div class="text-2xl font-bold {scoreColor.text}">
					{GradeUtils.formatScore(gradeResult.finalScore, gradeResult.maxScore)}
				</div>
				<div class="text-sm text-muted-foreground">
					{gradeResult.passed ? 'Réussi ✓' : 'Non réussi ✗'}
				</div>
			</div>
		</div>
	</Card.Header>

	{#if showDetails}
		<Card.Content class="space-y-4">
			<!-- Progress Bar -->
			<div class="space-y-2">
				<div class="flex justify-between text-sm">
					<span class="text-muted-foreground">Progression</span>
					<span class="font-medium">{Math.round(gradeResult.percentage)}%</span>
				</div>
				<div class="h-3 w-full rounded-full bg-muted">
					<div
						class="h-full rounded-full transition-all {scoreColor.bg}"
						style="width: {gradeResult.percentage}%"
					></div>
				</div>
			</div>

			<!-- Score Breakdown -->
			<div class="grid gap-3">
				<div class="flex items-center justify-between rounded-lg bg-muted p-3">
					<span class="text-sm text-muted-foreground">Score brut</span>
					<span class="font-medium">
						{GradeUtils.formatScore(gradeResult.rawScore, gradeResult.maxScore)}
					</span>
				</div>

				{#if showPenalties && gradeResult.penalties.total > 0}
					<!-- Hint Penalties -->
					{#if gradeResult.penalties.hints}
						<div
							class="flex items-center justify-between rounded-lg bg-orange-50 p-3 dark:bg-orange-950"
						>
							<span class="text-sm text-orange-700 dark:text-orange-300">
								Pénalité indices ({gradeResult.penalties.hints.hintsUsed})
							</span>
							<span class="font-medium text-orange-700 dark:text-orange-300">
								-{Math.round(gradeResult.penalties.hints.totalPenalty)}
							</span>
						</div>
					{/if}

					<!-- Time Penalties -->
					{#if gradeResult.penalties.time}
						<div
							class="flex items-center justify-between rounded-lg bg-orange-50 p-3 dark:bg-orange-950"
						>
							<span class="text-sm text-orange-700 dark:text-orange-300"> Pénalité temps </span>
							<span class="font-medium text-orange-700 dark:text-orange-300">
								-{Math.round(gradeResult.penalties.time.penalty)}
							</span>
						</div>
					{/if}

					<!-- Attempt Penalties -->
					{#if gradeResult.penalties.attempts && gradeResult.penalties.attempts > 0}
						<div
							class="flex items-center justify-between rounded-lg bg-orange-50 p-3 dark:bg-orange-950"
						>
							<span class="text-sm text-orange-700 dark:text-orange-300">
								Pénalité tentatives
							</span>
							<span class="font-medium text-orange-700 dark:text-orange-300">
								-{Math.round(gradeResult.penalties.attempts)}
							</span>
						</div>
					{/if}

					<!-- Total Penalties -->
					<div class="flex items-center justify-between rounded-lg bg-red-50 p-3 dark:bg-red-950">
						<span class="text-sm font-medium text-red-700 dark:text-red-300">
							Total pénalités
						</span>
						<span class="font-bold text-red-700 dark:text-red-300">
							-{Math.round(gradeResult.penalties.total)}
						</span>
					</div>
				{/if}

				<!-- Final Score -->
				<div class="flex items-center justify-between rounded-lg {scoreColor.bg} p-3">
					<span class="text-sm font-medium {scoreColor.text}">Score final</span>
					<span class="text-lg font-bold {scoreColor.text}">
						{GradeUtils.formatScore(gradeResult.finalScore, gradeResult.maxScore)}
					</span>
				</div>
			</div>

			<!-- Performance Message -->
			<div
				class="rounded-lg border-2 border-dashed p-4 text-center"
				style="border-color: {performanceTier.color}"
			>
				<p class="text-sm font-medium" style="color: {performanceTier.color}">
					{performanceTier.message}
				</p>
			</div>

			<!-- Feedback -->
			{#if gradeResult.feedback.length > 0}
				<div class="space-y-2">
					<h4 class="text-sm font-medium">Commentaires:</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						{#each gradeResult.feedback as comment, i (i)}
							<li class="flex items-start gap-2">
								<span class="mt-1 text-xs">•</span>
								<span>{comment}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</Card.Content>
	{/if}
</Card.Root>
