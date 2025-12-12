<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle, FileText } from 'lucide-svelte';
	import type { StudentExerciseView } from '$lib/types/worksheets';

	interface Props {
		exercise: StudentExerciseView;
		index: number;
		onclick: () => void;
	}

	let { exercise, index, onclick }: Props = $props();

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
	</div>
</button>
