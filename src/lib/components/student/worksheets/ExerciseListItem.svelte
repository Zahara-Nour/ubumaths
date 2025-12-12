<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle, FileText } from 'lucide-svelte';
	import type { StudentExerciseView } from '$lib/types/worksheets';
	import type { MasteryStatus } from '$lib/types/exercise-mastery';
	import { MASTERY_LABELS, MASTERY_COLORS } from '$lib/types/exercise-mastery';

	interface Props {
		exercise: StudentExerciseView;
		index: number;
		masteryStatus?: MasteryStatus;
		onclick: () => void;
	}

	let { exercise, index, masteryStatus, onclick }: Props = $props();

	// Only show mastery badge if status is not 'not_worked'
	let showMasteryBadge = $derived(masteryStatus && masteryStatus !== 'not_worked');
	let masteryColors = $derived(masteryStatus ? MASTERY_COLORS[masteryStatus] : null);
	let masteryLabel = $derived(masteryStatus ? MASTERY_LABELS[masteryStatus] : null);

	let hasCorrection = $derived(exercise.correction_visible && exercise.correction !== null);
	let pointsLabel = $derived(
		exercise.points !== null ? `${exercise.points} point${exercise.points !== 1 ? 's' : ''}` : null
	);
</script>

<button
	type="button"
	{onclick}
	class="flex w-full items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
	aria-label="Ouvrir l'exercice {index}"
>
	<div
		class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
	>
		<span class="text-sm font-semibold">{index}</span>
	</div>

	<div class="flex-1">
		<span class="font-medium">Exercice {index}</span>
		{#if exercise.custom_instructions}
			<p class="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
				{exercise.custom_instructions}
			</p>
		{/if}
	</div>

	<div class="flex items-center gap-2">
		{#if hasCorrection}
			<CheckCircle class="h-4 w-4 text-green-600" />
		{:else}
			<FileText class="h-4 w-4 text-muted-foreground" />
		{/if}

		{#if pointsLabel}
			<Badge variant="outline" class="font-normal">
				{pointsLabel}
			</Badge>
		{/if}

		{#if showMasteryBadge && masteryColors && masteryLabel}
			<Badge
				variant="outline"
				class="{masteryColors.bg} {masteryColors.text} {masteryColors.border} font-normal"
			>
				{masteryLabel}
			</Badge>
		{/if}
	</div>
</button>
