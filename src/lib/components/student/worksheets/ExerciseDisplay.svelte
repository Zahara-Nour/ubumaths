<!--
	ExerciseDisplay Component
	=========================
	Displays a single exercise with its statement and optional correction.
	Used in the student worksheet detail page.

	Props:
	- exercise: StudentExerciseView - The exercise data
	- index: number - The exercise position (1-based) for display
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle, ChevronDown, ChevronUp, Info } from 'lucide-svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { StudentExerciseView } from '$lib/types/worksheets';

	interface Props {
		exercise: StudentExerciseView;
		index: number;
	}

	let { exercise, index }: Props = $props();

	// Track if correction is expanded
	let correctionOpen = $state(false);

	// Derived values
	let hasCorrection = $derived(exercise.correction_visible && exercise.correction !== null);
	let pointsLabel = $derived(
		exercise.points !== null ? `${exercise.points} point${exercise.points > 1 ? 's' : ''}` : null
	);

	// Toggle correction visibility
	function toggleCorrection() {
		correctionOpen = !correctionOpen;
	}
</script>

<Card.Root>
	<Card.Header class="pb-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<!-- Exercise Number and Title -->
			<Card.Title class="text-lg">
				Exercice {index}{#if exercise.title}&nbsp;: {exercise.title}{/if}
			</Card.Title>

			<!-- Points Badge -->
			{#if pointsLabel}
				<Badge variant="outline" class="font-normal">
					{pointsLabel}
				</Badge>
			{/if}
		</div>

		<!-- Custom Instructions -->
		{#if exercise.custom_instructions}
			<div
				class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50"
			>
				<div class="flex items-start gap-2">
					<Info class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
					<p class="text-sm text-amber-700 dark:text-amber-300">
						{exercise.custom_instructions}
					</p>
				</div>
			</div>
		{/if}
	</Card.Header>

	<Card.Content class="space-y-4">
		<!-- Statement -->
		<div class="prose prose-sm max-w-none dark:prose-invert">
			<MarkdownRenderer content={exercise.statement} />
		</div>

		<!-- Correction (collapsible) -->
		{#if hasCorrection}
			<div
				class="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50"
			>
				<Button
					variant="ghost"
					onclick={toggleCorrection}
					class="w-full justify-between px-4 py-3 hover:bg-green-100 dark:hover:bg-green-900/50"
				>
					<div class="flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
						<CheckCircle class="h-4 w-4" />
						Correction
					</div>
					{#if correctionOpen}
						<ChevronUp class="h-4 w-4 text-green-600 dark:text-green-400" />
					{:else}
						<ChevronDown class="h-4 w-4 text-green-600 dark:text-green-400" />
					{/if}
				</Button>
				{#if correctionOpen}
					<div class="border-t border-green-200 px-4 py-3 dark:border-green-900">
						<div
							class="prose prose-sm max-w-none text-green-800 dark:text-green-200 dark:prose-invert"
						>
							<MarkdownRenderer content={exercise.correction ?? ''} />
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
