<!--
  Geometry Exercise Wrapper
  Dynamically loads the appropriate exercise component based on exercise type
-->
<script lang="ts">
	import type {
		GeometryExercise,
		GeometryExerciseAttempt,
		GeometryHint,
		ValidationResults
	} from '$lib/types/geometry';
	import {
		ViewExploreExercise,
		MeasurementExercise,
		ConstructionExercise,
		ProofExercise
	} from './exercises';
	import * as Card from '$lib/components/ui/card';
	import { AlertCircle } from 'lucide-svelte';

	interface Props {
		exercise: GeometryExercise;
		attempt?: GeometryExerciseAttempt | null;
		hints?: GeometryHint[];
		onValidate?: (results: ValidationResults) => void;
		onSave?: (data: any) => void;
		onComplete?: () => void;
	}

	let { exercise, attempt = null, hints = [], onValidate, onSave, onComplete }: Props = $props();

	// Determine which component to render based on exercise type
	const ExerciseComponent = $derived(() => {
		switch (exercise.exercise_type) {
			case 'view':
			case 'explore':
				return ViewExploreExercise;

			case 'measure':
				return MeasurementExercise;

			case 'construct':
				return ConstructionExercise;

			case 'proof':
				return ProofExercise;

			default:
				return null;
		}
	});
</script>

<div class="geometry-exercise-wrapper">
	{#if ExerciseComponent()}
		<!-- Svelte 5: Components are dynamic by default -->
		{@const Component = ExerciseComponent()}
		<Component
			{exercise}
			{attempt}
			{hints}
			{onValidate}
			{onSave}
			{onComplete}
		/>
	{:else}
		<!-- Unknown exercise type -->
		<Card.Root class="border-destructive">
			<Card.Header>
				<div class="flex items-center gap-3">
					<div class="rounded-full bg-destructive/10 p-2">
						<AlertCircle class="h-5 w-5 text-destructive" />
					</div>
					<div>
						<Card.Title>Type d'exercice non reconnu</Card.Title>
						<Card.Description>
							Le type d'exercice "{exercise.exercise_type}" n'est pas supporté
						</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-muted-foreground">
					Types supportés: view, explore, measure, construct, proof
				</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<style>
	.geometry-exercise-wrapper {
		width: 100%;
	}
</style>
