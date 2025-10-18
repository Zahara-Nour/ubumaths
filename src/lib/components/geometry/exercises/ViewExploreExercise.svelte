<!--
  View/Explore Exercise Component
  Allows students to view pre-made constructions and explore by dragging points
-->
<script lang="ts">
	import type {
		GeometryExercise,
		GeometryExerciseAttempt,
		MathGraphApp
	} from '$lib/types/geometry';
	import MathGraphViewer from '../MathGraphViewer.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Check, Eye, MousePointerClick, RotateCcw } from 'lucide-svelte';

	interface Props {
		exercise: GeometryExercise;
		attempt?: GeometryExerciseAttempt | null;
		onComplete?: () => void;
		onSave?: (data: { viewTime: number; interactionCount: number }) => void;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let { exercise, attempt = null, onComplete, onSave }: Props = $props(); // attempt for future features

	// State
	let mathGraphApp: MathGraphApp | null = $state(null);
	let viewTime = $state(0);
	let interactionCount = $state(0);
	let isInteracting = $state(false);
	let hasCompleted = $state(false);
	let currentFigure = $state(exercise.base_figure);

	// Timer for view time tracking
	let viewTimer: number | null = null;

	// Track initial state for reset
	let initialFigure = exercise.base_figure;

	// Start timer when component mounts
	$effect(() => {
		viewTimer = window.setInterval(() => {
			viewTime++;
		}, 1000);

		return () => {
			if (viewTimer) {
				clearInterval(viewTimer);
			}
		};
	});

	// Auto-save progress every 30 seconds
	$effect(() => {
		const autoSaveInterval = window.setInterval(() => {
			handleAutoSave();
		}, 30000);

		return () => {
			clearInterval(autoSaveInterval);
		};
	});

	/**
	 * Handle MathGraph app ready
	 */
	function handleAppReady(app: MathGraphApp) {
		mathGraphApp = app;

		// Track interactions (mouse events on SVG)
		if (app.svgApi) {
			app.svgApi.addEventListener('mousedown', handleInteractionStart);
			app.svgApi.addEventListener('mouseup', handleInteractionEnd);
			app.svgApi.addEventListener('touchstart', handleInteractionStart);
			app.svgApi.addEventListener('touchend', handleInteractionEnd);
		}
	}

	/**
	 * Handle interaction start (user is dragging)
	 */
	function handleInteractionStart() {
		isInteracting = true;
	}

	/**
	 * Handle interaction end
	 */
	function handleInteractionEnd() {
		if (isInteracting) {
			interactionCount++;
			isInteracting = false;
		}
	}

	/**
	 * Reset figure to initial state
	 */
	async function handleReset() {
		if (!mathGraphApp) return;

		try {
			await mathGraphApp.setFig({ fig: initialFigure });
			currentFigure = initialFigure;
			interactionCount++;
		} catch (error) {
			console.error('Error resetting figure:', error);
		}
	}

	/**
	 * Mark exercise as complete
	 */
	function handleMarkComplete() {
		hasCompleted = true;
		handleAutoSave();
		onComplete?.();
	}

	/**
	 * Auto-save progress
	 */
	async function handleAutoSave() {
		if (!mathGraphApp) return;

		try {
			// Get current figure state
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const figureState = await mathGraphApp.getFig(); // For future figure state saving

			onSave?.({
				viewTime,
				interactionCount
			});
		} catch (error) {
			console.error('Error saving progress:', error);
		}
	}

	/**
	 * Format time as MM:SS
	 */
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<div class="view-explore-exercise space-y-6">
	<!-- Header Card -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
						<Eye class="h-5 w-5 text-blue-600 dark:text-blue-400" />
					</div>
					<div>
						<Card.Title>{exercise.title}</Card.Title>
						<Card.Description>Exercice d'exploration</Card.Description>
					</div>
				</div>

				<div class="flex items-center gap-4 text-sm">
					<div class="flex items-center gap-2">
						<MousePointerClick class="h-4 w-4 text-muted-foreground" />
						<span class="text-muted-foreground">{interactionCount} interactions</span>
					</div>
					<div class="text-muted-foreground">
						Temps: {formatTime(viewTime)}
					</div>
				</div>
			</div>
		</Card.Header>

		{#if exercise.instructions}
			<Card.Content>
				<div class="rounded-lg bg-muted p-4">
					<p class="text-sm leading-relaxed">{exercise.instructions}</p>
				</div>
			</Card.Content>
		{/if}
	</Card.Root>

	<!-- Exploration Instructions -->
	<Card.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
		<Card.Content class="pt-6">
			<div class="flex items-start gap-3">
				<MousePointerClick class="mt-1 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
				<div class="space-y-2 text-sm">
					<p class="font-medium text-blue-900 dark:text-blue-100">
						Comment explorer cette figure :
					</p>
					<ul class="space-y-1 text-blue-800 dark:text-blue-200">
						<li>• Cliquez et faites glisser les points pour explorer la construction</li>
						<li>• Observez comment les éléments se déplacent les uns par rapport aux autres</li>
						<li>• Identifiez les relations géométriques (parallélisme, perpendicularité, etc.)</li>
						<li>• Utilisez le bouton "Réinitialiser" pour revenir à la figure initiale</li>
					</ul>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- MathGraph Viewer -->
	<Card.Root>
		<Card.Content class="p-6">
			<div class="space-y-4">
				<MathGraphViewer
					figure={currentFigure}
					width={800}
					height={600}
					interactive={true}
					displayGrid={exercise.display_grid}
					displayAxes={exercise.display_axes}
					displayMeasures={exercise.display_measures}
					onReady={handleAppReady}
				/>

				<!-- Action Buttons -->
				<div class="flex items-center justify-between">
					<Button variant="outline" onclick={handleReset}>
						<RotateCcw class="mr-2 h-4 w-4" />
						Réinitialiser
					</Button>

					{#if !hasCompleted}
						<Button onclick={handleMarkComplete}>
							<Check class="mr-2 h-4 w-4" />
							Marquer comme terminé
						</Button>
					{:else}
						<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
							<Check class="h-5 w-5" />
							<span class="font-medium">Exercice terminé</span>
						</div>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Learning Objectives (if provided) -->
	{#if exercise.learning_objectives && exercise.learning_objectives.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Objectifs d'apprentissage</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-2 text-sm">
					{#each exercise.learning_objectives as objective, i (i)}
						<li class="flex items-start gap-2">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
							<span>{objective}</span>
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<style>
	.view-explore-exercise {
		max-width: 900px;
		margin: 0 auto;
	}
</style>
