<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle, AlertCircle } from 'lucide-svelte';
	import ReportErrorButton from '$lib/components/worksheets/ReportErrorButton.svelte';
	import type { StudentExerciseView, StudentErrorReportView } from '$lib/types/worksheets';
	import type { MasteryStatus } from '$lib/types/exercise-mastery';

	interface Props {
		exercise: StudentExerciseView;
		index: number;
		masteryStatus?: MasteryStatus;
		assignmentId: string;
		existingReport: StudentErrorReportView | null;
		onclick: () => void;
		onReportCreated: (report: StudentErrorReportView) => void;
	}

	let {
		exercise,
		index,
		masteryStatus,
		assignmentId,
		existingReport,
		onclick,
		onReportCreated
	}: Props = $props();

	let hasCorrection = $derived(exercise.correction_visible && exercise.correction !== null);
	let pointsLabel = $derived(
		exercise.points !== null ? `${exercise.points} point${exercise.points !== 1 ? 's' : ''}` : null
	);
</script>

<div class="flex w-full items-center gap-3 rounded-lg border bg-card p-4">
	<!-- Clickable area for opening exercise -->
	<button
		type="button"
		{onclick}
		class="flex flex-1 items-center gap-3 text-left transition-colors hover:opacity-80"
		aria-label="Ouvrir l'exercice {index}"
	>
		<div
			class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
		>
			<span class="text-sm font-semibold">{index}</span>
		</div>

		<div class="flex-1">
			<span class="font-medium"
				>Exercice {index}{#if exercise.title}&nbsp;: {exercise.title}{/if}</span
			>
			{#if exercise.custom_instructions}
				<p class="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
					{exercise.custom_instructions}
				</p>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if hasCorrection}
				<Badge
					variant="outline"
					class="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
				>
					Correction
				</Badge>
			{/if}

			{#if pointsLabel}
				<Badge variant="outline" class="font-normal">
					{pointsLabel}
				</Badge>
			{/if}

			{#if masteryStatus === 'mastered'}
				<CheckCircle class="h-5 w-5 text-green-600" aria-label="Maîtrisé" />
			{:else if masteryStatus === 'needs_review'}
				<AlertCircle class="h-5 w-5 text-amber-500" aria-label="À retravailler" />
			{/if}
		</div>
	</button>

	<!-- Report button - separate from clickable area -->
	<div role="presentation" onclick={(e) => e.stopPropagation()}>
		<ReportErrorButton
			{assignmentId}
			exerciseId={exercise.exercise_id}
			exercisePosition={exercise.position}
			{existingReport}
			{onReportCreated}
		/>
	</div>
</div>
