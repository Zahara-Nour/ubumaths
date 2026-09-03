<script lang="ts">
	/**
	 * UntranslatedExercisesNotice - exercises that will come out in French
	 *
	 * An English worksheet falls back to French per field rather than leaving a
	 * hole, which is the right behaviour but a silent one: without this notice
	 * the language mix is only discovered on the printed sheet.
	 *
	 * Shown both next to the exercise list (where you fix it) and above the PDF
	 * preview (where you notice it) — the first version lived only next to the
	 * list, and the teacher looking at the preview saw nothing.
	 *
	 * @example
	 * <UntranslatedExercisesNotice exercises={worksheet.exercises ?? []} config={worksheet.config} />
	 */

	import { untranslatedExercises } from '$lib/exercises/translation-status';
	import { worksheetLocale, type WorksheetConfig } from '$lib/types/worksheets';
	import type { WorksheetExerciseWithExercise } from '$lib/types/worksheets';

	let {
		exercises = [],
		config,
		class: className = ''
	}: {
		exercises?: WorksheetExerciseWithExercise[];
		config: WorksheetConfig | null | undefined;
		class?: string;
	} = $props();

	const missing = $derived(
		worksheetLocale(config) === 'en' ? untranslatedExercises(exercises) : []
	);
</script>

{#if missing.length > 0}
	<div class="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm {className}">
		<p class="font-medium text-foreground">
			{missing.length}
			{missing.length > 1 ? 'exercices sortiront' : 'exercice sortira'} en français
		</p>
		<p class="mt-1 text-muted-foreground">
			Cette fiche est en anglais. Sans version anglaise, l'énoncé français est utilisé :
			{missing.map((e) => e.title ?? 'sans titre').join(', ')}
		</p>
	</div>
{/if}
