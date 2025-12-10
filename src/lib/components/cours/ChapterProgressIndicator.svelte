<!--
	ChapterProgressIndicator Component
	===================================

	Visual progress indicator for chapter.
	Shows circular or bar indicator with percentage display,
	color-coded by progress level.

	@module components/cours/ChapterProgressIndicator
-->
<script lang="ts">
	import type { ChapterProgress } from '$lib/types/chapters';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';
	import { CheckCircle2, Circle, Target, HelpCircle } from 'lucide-svelte';

	// Props
	interface Props {
		progress: ChapterProgress;
		variant?: 'circular' | 'bar' | 'compact';
		showDetails?: boolean;
	}

	let { progress, variant = 'circular', showDetails = true }: Props = $props();

	// Calculate overall progress (weighted average of checklist and quiz)
	const overallProgress = $derived.by(() => {
		const checklistWeight = 0.6;
		const quizWeight = 0.4;

		let total = 0;
		let weights = 0;

		if (progress.totalChecklistItems > 0) {
			total += progress.checklistProgress * checklistWeight;
			weights += checklistWeight;
		}

		if (progress.totalQuizQuestions > 0) {
			total += progress.quizScore * quizWeight;
			weights += quizWeight;
		}

		if (weights === 0) return 0;
		return Math.round(total / weights);
	});

	// Color classes based on progress
	const colorClasses = $derived.by(() => {
		if (overallProgress >= 80) {
			return {
				text: 'text-green-600 dark:text-green-400',
				bg: 'bg-green-500',
				bgLight: 'bg-green-100 dark:bg-green-900/30',
				stroke: 'stroke-green-500'
			};
		}
		if (overallProgress >= 50) {
			return {
				text: 'text-orange-600 dark:text-orange-400',
				bg: 'bg-orange-500',
				bgLight: 'bg-orange-100 dark:bg-orange-900/30',
				stroke: 'stroke-orange-500'
			};
		}
		if (overallProgress >= 20) {
			return {
				text: 'text-amber-600 dark:text-amber-400',
				bg: 'bg-amber-500',
				bgLight: 'bg-amber-100 dark:bg-amber-900/30',
				stroke: 'stroke-amber-500'
			};
		}
		return {
			text: 'text-red-600 dark:text-red-400',
			bg: 'bg-red-500',
			bgLight: 'bg-red-100 dark:bg-red-900/30',
			stroke: 'stroke-red-500'
		};
	});

	// Circumference for circular progress
	const circumference = 2 * Math.PI * 45;
	const strokeDashoffset = $derived(circumference - (overallProgress / 100) * circumference);
</script>

{#if variant === 'circular'}
	<!-- Circular progress indicator -->
	<div class="flex flex-col items-center gap-4">
		<div class="relative h-32 w-32">
			<!-- Background circle -->
			<svg class="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
				<circle
					cx="50"
					cy="50"
					r="45"
					fill="none"
					stroke="currentColor"
					stroke-width="8"
					class="text-muted/30"
				/>
				<!-- Progress circle -->
				<circle
					cx="50"
					cy="50"
					r="45"
					fill="none"
					stroke-width="8"
					stroke-linecap="round"
					stroke-dasharray={circumference}
					stroke-dashoffset={strokeDashoffset}
					class={colorClasses.stroke}
					style="transition: stroke-dashoffset 0.5s ease-in-out;"
				/>
			</svg>

			<!-- Center content -->
			<div class="absolute inset-0 flex flex-col items-center justify-center">
				<span class={cn('text-3xl font-bold', colorClasses.text)}>
					{overallProgress}%
				</span>
			</div>
		</div>

		{#if showDetails}
			<!-- Progress breakdown -->
			<div class="w-full max-w-xs space-y-3">
				{#if progress.totalChecklistItems > 0}
					<div class="flex items-center gap-3">
						<Target class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
						<div class="flex-1">
							<div class="mb-1 flex justify-between text-xs">
								<span class="text-muted-foreground">Objectifs</span>
								<span class={cn('font-medium', colorClasses.text)}>
									{progress.completedChecklistItems}/{progress.totalChecklistItems}
								</span>
							</div>
							<Progress value={progress.checklistProgress} max={100} class="h-1.5" />
						</div>
					</div>
				{/if}

				{#if progress.totalQuizQuestions > 0}
					<div class="flex items-center gap-3">
						<HelpCircle class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
						<div class="flex-1">
							<div class="mb-1 flex justify-between text-xs">
								<span class="text-muted-foreground">Quiz</span>
								<span class={cn('font-medium', colorClasses.text)}>
									{progress.correctQuizQuestions}/{progress.totalQuizQuestions}
								</span>
							</div>
							<Progress value={progress.quizScore} max={100} class="h-1.5" />
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{:else if variant === 'bar'}
	<!-- Bar progress indicator -->
	<div class="space-y-4">
		<!-- Overall progress -->
		<div class="space-y-2">
			<div class="flex justify-between text-sm">
				<span class="font-medium">Progression globale</span>
				<span class={cn('font-bold', colorClasses.text)}>{overallProgress}%</span>
			</div>
			<Progress value={overallProgress} max={100} class="h-3" />
		</div>

		{#if showDetails}
			<!-- Detailed breakdown -->
			<div class="grid grid-cols-2 gap-4 pt-2">
				{#if progress.totalChecklistItems > 0}
					<div class={cn('rounded-lg p-3', colorClasses.bgLight)}>
						<div class="mb-2 flex items-center gap-2">
							<Target class="h-4 w-4" />
							<span class="text-xs font-medium">Objectifs</span>
						</div>
						<div class={cn('text-2xl font-bold', colorClasses.text)}>
							{progress.checklistProgress}%
						</div>
						<div class="text-xs text-muted-foreground">
							{progress.completedChecklistItems}/{progress.totalChecklistItems} complete{progress.completedChecklistItems >
							1
								? 's'
								: ''}
						</div>
					</div>
				{/if}

				{#if progress.totalQuizQuestions > 0}
					<div class={cn('rounded-lg p-3', colorClasses.bgLight)}>
						<div class="mb-2 flex items-center gap-2">
							<HelpCircle class="h-4 w-4" />
							<span class="text-xs font-medium">Quiz</span>
						</div>
						<div class={cn('text-2xl font-bold', colorClasses.text)}>
							{progress.quizScore}%
						</div>
						<div class="text-xs text-muted-foreground">
							{progress.correctQuizQuestions}/{progress.totalQuizQuestions} correct{progress.correctQuizQuestions >
							1
								? 's'
								: ''}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<!-- Compact variant -->
	<div class="flex items-center gap-3">
		<!-- Mini circular indicator -->
		<div class="relative h-10 w-10 flex-shrink-0">
			<svg class="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
				<circle
					cx="50"
					cy="50"
					r="45"
					fill="none"
					stroke="currentColor"
					stroke-width="10"
					class="text-muted/30"
				/>
				<circle
					cx="50"
					cy="50"
					r="45"
					fill="none"
					stroke-width="10"
					stroke-linecap="round"
					stroke-dasharray={circumference}
					stroke-dashoffset={strokeDashoffset}
					class={colorClasses.stroke}
				/>
			</svg>
		</div>

		<!-- Text info -->
		<div class="min-w-0 flex-1">
			<div class={cn('text-sm font-bold', colorClasses.text)}>
				{overallProgress}%
			</div>
			{#if showDetails}
				<div class="truncate text-xs text-muted-foreground">
					{#if progress.totalChecklistItems > 0}
						{progress.completedChecklistItems}/{progress.totalChecklistItems} objectifs
					{/if}
					{#if progress.totalChecklistItems > 0 && progress.totalQuizQuestions > 0}
						,
					{/if}
					{#if progress.totalQuizQuestions > 0}
						{progress.correctQuizQuestions}/{progress.totalQuizQuestions} quiz
					{/if}
				</div>
			{/if}
		</div>

		<!-- Status icon -->
		{#if overallProgress === 100}
			<CheckCircle2 class="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
		{:else if overallProgress > 0}
			<Circle class="h-5 w-5 flex-shrink-0 text-muted-foreground/50" />
		{/if}
	</div>
{/if}
