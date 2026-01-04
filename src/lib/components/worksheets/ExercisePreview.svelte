<!--
	ExercisePreview Component
	=========================

	Displays a compact preview of an exercise with math rendering.
	Used in the ExerciseSelector to preview exercises before adding them.

	Features:
	- Title and statement preview with math rendering
	- Difficulty, grade levels, and tags display
	- Optional solution toggle
	- Variables indicator for parameterized exercises

	Usage:
	```svelte
	<ExercisePreview
	  exercise={exerciseData}
	  showSolution={false}
	/>
	```
-->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Variable, Eye, EyeOff, GraduationCap, Tag } from 'lucide-svelte';
	import { formatGradeShort } from '$lib/utils/grades';
	import type { GradeCode } from '$lib/types/grades';
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import type { Exercise } from '$lib/exercises/types';
	import { getExerciseContentSafe } from '$lib/exercises/types';

	// Props
	interface Props {
		exercise: Exercise;
		compact?: boolean;
	}

	let { exercise, compact = false }: Props = $props();

	// Get content from variations (single source of truth)
	let content = $derived(getExerciseContentSafe(exercise));

	// Local state for solution toggle
	let showSolution = $state(false);

	// Derived values
	let hasVariables = $derived(exercise.variables && exercise.variables.length > 0);

	/**
	 * Get difficulty badge variant
	 */
	function getDifficultyVariant(difficulty: number): 'default' | 'secondary' | 'destructive' {
		if (difficulty === 1) return 'default';
		if (difficulty === 2) return 'secondary';
		return 'destructive';
	}

	/**
	 * Get difficulty label
	 */
	function getDifficultyLabel(difficulty: number): string {
		if (difficulty === 1) return 'Facile';
		if (difficulty === 2) return 'Moyen';
		return 'Difficile';
	}
</script>

<div class="space-y-4">
	<!-- Header with metadata -->
	<div class="space-y-2">
		{#if exercise.title}
			<h3 class="text-lg font-semibold text-foreground">{exercise.title}</h3>
		{/if}

		<!-- Metadata badges -->
		<div class="flex flex-wrap items-center gap-2">
			<!-- Difficulty -->
			<Badge variant={getDifficultyVariant(exercise.difficulty)}>
				{getDifficultyLabel(exercise.difficulty)}
			</Badge>

			<!-- Parameterized indicator -->
			{#if hasVariables}
				<Badge variant="outline" class="gap-1">
					<Variable class="h-3 w-3" />
					Parametrable
				</Badge>
			{/if}

			<!-- Grade levels -->
			{#if exercise.grade_levels && exercise.grade_levels.length > 0}
				<div class="flex items-center gap-1">
					<GraduationCap class="h-4 w-4 text-muted-foreground" />
					{#each exercise.grade_levels.slice(0, 3) as grade (grade)}
						<Badge variant="outline" class="text-xs">
							{formatGradeShort(grade as GradeCode)}
						</Badge>
					{/each}
					{#if exercise.grade_levels.length > 3}
						<span class="text-xs text-muted-foreground">+{exercise.grade_levels.length - 3}</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Tags -->
		{#if exercise.tags && exercise.tags.length > 0 && !compact}
			<div class="flex flex-wrap items-center gap-1">
				<Tag class="h-3 w-3 text-muted-foreground" />
				{#each exercise.tags.slice(0, 5) as tag (tag)}
					<Badge variant="secondary" class="text-xs">{tag}</Badge>
				{/each}
				{#if exercise.tags.length > 5}
					<span class="text-xs text-muted-foreground">+{exercise.tags.length - 5}</span>
				{/if}
			</div>
		{/if}
	</div>

	<Separator />

	<!-- Exercise content preview -->
	<div class="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-4">
		<ExerciseDisplay {exercise} mode="template" bind:showSolution />
	</div>

	<!-- Solution toggle for compact mode -->
	{#if compact && content.solution_md}
		<div class="flex justify-end">
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (showSolution = !showSolution)}
				class="gap-2"
			>
				{#if showSolution}
					<EyeOff class="h-4 w-4" />
					Masquer solution
				{:else}
					<Eye class="h-4 w-4" />
					Voir solution
				{/if}
			</Button>
		</div>
	{/if}

	<!-- Variables info for parameterized exercises -->
	{#if hasVariables && !compact}
		<div
			class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950"
		>
			<p class="text-sm text-blue-700 dark:text-blue-300">
				<span class="font-medium">Exercice parametrable:</span>
				{exercise.variables?.length} variable(s) definies. Chaque eleve recevra des valeurs differentes.
			</p>
		</div>
	{/if}
</div>
