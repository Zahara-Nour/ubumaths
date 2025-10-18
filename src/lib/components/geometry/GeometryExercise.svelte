<script lang="ts">
	/**
	 * GeometryExercise Component
	 * Main wrapper for geometry exercises with validation, hints, and grading
	 * Orchestrates MathGraphEditor/Viewer with exercise logic
	 */

	import { onMount, onDestroy } from 'svelte';
	import MathGraphViewer from './MathGraphViewer.svelte';
	import MathGraphEditor from './MathGraphEditor.svelte';
	import GeometryHints from './GeometryHints.svelte';
	import GeometryValidationFeedback from './GeometryValidationFeedback.svelte';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type {
		GeometryExercise,
		GeometryExerciseAttempt,
		MathGraphApp,
		ValidationResults
	} from '$lib/types/geometry';

	interface Props {
		exercise: GeometryExercise;
		attempt?: GeometryExerciseAttempt | null;
		onSubmit?: (results: ValidationResults) => void;
		onSave?: (figureState: string) => void;
		onHintUsed?: (hintLevel: string, penalty: number) => void;
	}

	let { exercise, attempt = null, onSubmit, onSave, onHintUsed }: Props = $props();

	let mathGraphApp: MathGraphApp | null = $state(null);
	let editorRef: any = $state(null);
	let validationResults: ValidationResults | null = $state(null);
	let isValidating = $state(false);
	let showHints = $state(false);
	let currentStep = $state(0);
	let timeSpent = $state(0);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let activeTime = $state(0); // For future active time tracking
	let lastActivityTime = Date.now();
	let timeInterval: number | null = null;
	let autoSaveInterval: number | null = null;

	// Derived states
	const isEditable = $derived(
		exercise.exercise_type !== 'view' && exercise.exercise_type !== 'explore'
	);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const hasSteps = $derived(exercise.validation_mode === 'step_by_step'); // For future step tracking
	const canSubmit = $derived(mathGraphApp !== null && !isValidating);

	onMount(() => {
		startTimeTracking();
		startAutoSave();

		// Load attempt state if exists
		if (attempt?.current_figure_state) {
			// Figure will be loaded via component props
		}
	});

	onDestroy(() => {
		stopTimeTracking();
		stopAutoSave();
	});

	function handleMathGraphReady(app: MathGraphApp) {
		mathGraphApp = app;
		console.log('MathGraph initialized:', app);

		// Set up activity tracking
		setupActivityTracking();
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function handleMathGraphChange(app: MathGraphApp) { // For future auto-validation
		lastActivityTime = Date.now();

		// Auto-validate in real-time for certain exercise types
		if (exercise.exercise_type === 'measure' && exercise.validation_mode === 'automatic') {
			// Could trigger automatic validation here
		}
	}

	function setupActivityTracking() {
		if (!mathGraphApp?.svgApi) return;

		// Track mouse/touch activity on the SVG
		const svg = mathGraphApp.svgApi;

		const updateActivity = () => {
			lastActivityTime = Date.now();
		};

		svg.addEventListener('mousedown', updateActivity);
		svg.addEventListener('touchstart', updateActivity);
		svg.addEventListener('mousemove', updateActivity);
	}

	function startTimeTracking() {
		timeInterval = window.setInterval(() => {
			timeSpent++;

			// Only count as active if activity in last 30 seconds
			if (Date.now() - lastActivityTime < 30000) {
				activeTime++;
			}
		}, 1000);
	}

	function stopTimeTracking() {
		if (timeInterval !== null) {
			clearInterval(timeInterval);
			timeInterval = null;
		}
	}

	function startAutoSave() {
		autoSaveInterval = window.setInterval(async () => {
			await handleAutoSave();
		}, 30000); // Auto-save every 30 seconds
	}

	function stopAutoSave() {
		if (autoSaveInterval !== null) {
			clearInterval(autoSaveInterval);
			autoSaveInterval = null;
		}
	}

	async function handleAutoSave() {
		if (!mathGraphApp || !onSave) return;

		try {
			// Get current figure state
			// Note: This needs to be implemented in the API wrapper
			const figureState = ''; // await getCurrentFigureState(mathGraphApp);

			if (figureState) {
				onSave(figureState);
			}
		} catch (error) {
			console.error('Auto-save failed:', error);
		}
	}

	async function handleValidate() {
		if (!mathGraphApp) {
			toaster.error('Éditeur non initialisé');
			return;
		}

		isValidating = true;

		try {
			// Import validation service dynamically
			const { validateExercise } = await import('$lib/services/geometry-validator');

			// Run validation
			const results = await validateExercise(mathGraphApp, exercise);

			validationResults = results;

			// Show feedback
			if (results.isValid) {
				toaster.success(`Excellent ! Score: ${results.score}/${results.maxScore}`);
			} else {
				toaster.warning(`Score: ${results.score}/${results.maxScore}. Continue !`);
			}
		} catch (error) {
			console.error('Validation error:', error);
			toaster.error('Erreur lors de la validation');
		} finally {
			isValidating = false;
		}
	}

	async function handleSubmit() {
		await handleValidate();

		if (validationResults && onSubmit) {
			onSubmit(validationResults);
		}
	}

	function handleHintRequested(hintLevel: string, penalty: number) {
		if (onHintUsed) {
			onHintUsed(hintLevel, penalty);
		}
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<div class="geometry-exercise">
	<!-- Exercise Header -->
	<div class="exercise-header">
		<div class="exercise-info">
			<h2 class="text-2xl font-bold">{exercise.title}</h2>
			{#if exercise.description}
				<p class="text-muted-foreground">{exercise.description}</p>
			{/if}
		</div>

		<div class="exercise-stats">
			<div class="stat">
				<span class="stat-label">Temps:</span>
				<span class="stat-value">{formatTime(timeSpent)}</span>
			</div>
			{#if exercise.time_limit_seconds}
				<div class="stat">
					<span class="stat-label">Limite:</span>
					<span class="stat-value">{formatTime(exercise.time_limit_seconds)}</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Instructions -->
	<div class="instructions">
		<h3 class="font-semibold">Instructions:</h3>
		<p>{exercise.instructions}</p>
	</div>

	<!-- MathGraph Component -->
	<div class="mathgraph-wrapper">
		{#if isEditable}
			<MathGraphEditor
				bind:this={editorRef}
				figure={attempt?.current_figure_state || exercise.initial_figure || ''}
				width={exercise.tools_allowed?.length ? 800 : 850}
				level={exercise.grade_level === 'elementary'
					? 0
					: exercise.grade_level === 'middle'
						? 1
						: exercise.grade_level === 'high'
							? 2
							: 3}
				allowedTools={exercise.tools_allowed}
				gridVisible={exercise.grid_visible}
				axisVisible={exercise.axis_visible}
				onReady={handleMathGraphReady}
				onChange={handleMathGraphChange}
				onError={(err) => toaster.error(err.message)}
			/>
		{:else}
			<MathGraphViewer
				figure={exercise.initial_figure || ''}
				width={850}
				level={exercise.grade_level === 'elementary'
					? 0
					: exercise.grade_level === 'middle'
						? 1
						: exercise.grade_level === 'high'
							? 2
							: 3}
				interactive={exercise.exercise_type === 'explore'}
				displayMeasures={exercise.measurements_visible}
				gridVisible={exercise.grid_visible}
				onReady={handleMathGraphReady}
				onError={(err) => toaster.error(err.message)}
			/>
		{/if}
	</div>

	<!-- Validation Feedback -->
	{#if validationResults}
		<GeometryValidationFeedback results={validationResults} />
	{/if}

	<!-- Hints Section -->
	{#if showHints}
		<GeometryHints exerciseId={exercise.id} {currentStep} onHintUsed={handleHintRequested} />
	{/if}

	<!-- Action Buttons -->
	<div class="actions">
		<Button variant="outline" onclick={() => (showHints = !showHints)}>
			{showHints ? 'Masquer les indices' : 'Afficher les indices'}
		</Button>

		{#if isEditable}
			<Button variant="secondary" onclick={handleValidate} disabled={!canSubmit || isValidating}>
				{isValidating ? 'Validation...' : 'Valider'}
			</Button>

			<Button onclick={handleSubmit} disabled={!canSubmit || isValidating}>Soumettre</Button>
		{/if}
	</div>
</div>

<style>
	.geometry-exercise {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.exercise-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
		padding: 1rem;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
	}

	.exercise-info {
		flex: 1;
	}

	.exercise-stats {
		display: flex;
		gap: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--primary));
		font-variant-numeric: tabular-nums;
	}

	.instructions {
		padding: 1rem;
		background: hsl(var(--muted) / 0.3);
		border-left: 4px solid hsl(var(--primary));
		border-radius: 0.25rem;
	}

	.instructions h3 {
		margin-bottom: 0.5rem;
	}

	.mathgraph-wrapper {
		display: flex;
		justify-content: center;
		padding: 1rem;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid hsl(var(--border));
	}
</style>
