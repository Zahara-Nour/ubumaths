<!--
  Measurement Exercise Component
  Students measure geometric properties and input answers
-->
<script lang="ts">
	import type {
		GeometryExercise,
		GeometryExerciseAttempt,
		MathGraphApp,
		ValidationResults
	} from '$lib/types/geometry';
	import MathGraphViewer from '../MathGraphViewer.svelte';
	import GeometryValidationFeedback from '../GeometryValidationFeedback.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Ruler, Check, AlertCircle, RotateCcw } from 'lucide-svelte';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	import { validateExercise } from '$lib/services/geometry-validator'; // For future auto-validation
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Props {
		exercise: GeometryExercise;
		attempt?: GeometryExerciseAttempt | null;
		onValidate?: (results: ValidationResults) => void;
		onSave?: (data: { answers: Record<string, number>; attempts: number }) => void;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let { exercise, attempt = null, onValidate, onSave }: Props = $props(); // attempt for future features

	// State
	let mathGraphApp: MathGraphApp | null = $state(null);
	let answers = $state<Record<string, string>>({});
	let validationResults: ValidationResults | null = $state(null);
	let attemptCount = $state(attempt?.attempts_count ?? 0);
	let isValidating = $state(false);
	let hasSubmitted = $state(false);

	// Get measurement questions from validation config
	const questions = $derived(
		exercise.validation_config?.expectedMeasurements
			? Object.entries(exercise.validation_config.expectedMeasurements).map(([key, value]) => ({
					id: key,
					label: getMeasurementLabel(key),
					expectedValue: value as number,
					unit: getMeasurementUnit(key)
				}))
			: []
	);

	// Initialize answers from previous attempt
	$effect(() => {
		if (attempt?.student_answer) {
			const savedAnswers = attempt.student_answer as Record<string, number>;
			const stringAnswers: Record<string, string> = {};
			for (const [key, value] of Object.entries(savedAnswers)) {
				stringAnswers[key] = value.toString();
			}
			answers = stringAnswers;
		}
	});

	// Auto-save every 30 seconds
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
	}

	/**
	 * Get human-readable label for measurement
	 */
	function getMeasurementLabel(key: string): string {
		// Parse keys like "angle_ABC", "distance_AB", "radius_O"
		if (key.startsWith('angle_')) {
			const points = key.substring(6);
			return `Mesure de l'angle ${points}`;
		} else if (key.startsWith('distance_')) {
			const points = key.substring(9);
			return `Distance ${points}`;
		} else if (key.startsWith('radius_')) {
			const center = key.substring(7);
			return `Rayon du cercle de centre ${center}`;
		} else if (key.startsWith('area_')) {
			return `Aire de la figure`;
		} else if (key.startsWith('perimeter_')) {
			return `Périmètre de la figure`;
		} else {
			// Generic label
			return key.replace(/_/g, ' ');
		}
	}

	/**
	 * Get measurement unit
	 */
	function getMeasurementUnit(key: string): string {
		if (key.startsWith('angle_')) {
			return '°';
		} else if (
			key.startsWith('distance_') ||
			key.startsWith('radius_') ||
			key.startsWith('perimeter_')
		) {
			return 'unités';
		} else if (key.startsWith('area_')) {
			return 'unités²';
		} else {
			return '';
		}
	}

	/**
	 * Update answer
	 */
	function updateAnswer(questionId: string, value: string) {
		answers = { ...answers, [questionId]: value };
	}

	/**
	 * Validate answers
	 */
	async function handleValidate() {
		if (!mathGraphApp) {
			toaster.error('Erreur: Figure non chargée');
			return;
		}

		// Check if all answers are provided
		const missingAnswers = questions.filter((q) => !answers[q.id] || answers[q.id].trim() === '');
		if (missingAnswers.length > 0) {
			toaster.warning('Veuillez répondre à toutes les questions');
			return;
		}

		isValidating = true;
		attemptCount++;

		try {
			// Convert string answers to numbers
			const numericAnswers: Record<string, number> = {};
			for (const [key, value] of Object.entries(answers)) {
				numericAnswers[key] = parseFloat(value);
			}

			// Create modified validation config with student answers
			const modifiedConfig = {
				...exercise.validation_config,
				studentAnswers: numericAnswers
			};

			// Validate
			const results = await validateExercise(mathGraphApp, {
				...exercise,
				validation_config: modifiedConfig
			});

			validationResults = results;
			hasSubmitted = true;

			// Notify parent
			onValidate?.(results);

			// Show feedback
			if (results.isValid) {
				toaster.success(`Bravo! Score: ${results.score}/${results.maxScore}`);
			} else {
				toaster.error(`Score: ${results.score}/${results.maxScore}. Réessayez!`);
			}

			// Auto-save
			handleAutoSave();
		} catch (error) {
			console.error('Validation error:', error);
			toaster.error('Erreur lors de la validation');
		} finally {
			isValidating = false;
		}
	}

	/**
	 * Reset answers
	 */
	function handleReset() {
		answers = {};
		validationResults = null;
		hasSubmitted = false;
	}

	/**
	 * Auto-save progress
	 */
	function handleAutoSave() {
		// Convert string answers to numbers
		const numericAnswers: Record<string, number> = {};
		for (const [key, value] of Object.entries(answers)) {
			const num = parseFloat(value);
			if (!isNaN(num)) {
				numericAnswers[key] = num;
			}
		}

		onSave?.({
			answers: numericAnswers,
			attempts: attemptCount
		});
	}

	/**
	 * Get answer status (correct/incorrect/unanswered)
	 */
	function getAnswerStatus(questionId: string): 'correct' | 'incorrect' | 'unanswered' {
		if (!hasSubmitted || !validationResults) return 'unanswered';

		const question = questions.find((q) => q.id === questionId);
		if (!question) return 'unanswered';

		const studentAnswer = parseFloat(answers[questionId]);
		if (isNaN(studentAnswer)) return 'unanswered';

		const tolerance = exercise.validation_config?.tolerance ?? 2;
		const diff = Math.abs(studentAnswer - question.expectedValue);

		// For angles, use angle tolerance; for distances, use distance tolerance
		const isCorrect = questionId.startsWith('angle_')
			? diff <= tolerance
			: diff <= (tolerance / 100) * question.expectedValue;

		return isCorrect ? 'correct' : 'incorrect';
	}
</script>

<div class="measurement-exercise space-y-6">
	<!-- Header Card -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
						<Ruler class="h-5 w-5 text-purple-600 dark:text-purple-400" />
					</div>
					<div>
						<Card.Title>{exercise.title}</Card.Title>
						<Card.Description>Exercice de mesure</Card.Description>
					</div>
				</div>

				<div class="text-sm text-muted-foreground">
					Tentatives: {attemptCount}
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

	<!-- MathGraph Viewer -->
	<Card.Root>
		<Card.Content class="p-6">
			<MathGraphViewer
				figure={exercise.base_figure}
				width={800}
				height={600}
				interactive={false}
				displayGrid={exercise.display_grid}
				displayAxes={exercise.display_axes}
				displayMeasures={exercise.display_measures}
				onReady={handleAppReady}
			/>
		</Card.Content>
	</Card.Root>

	<!-- Measurement Questions -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Questions</Card.Title>
			<Card.Description>
				Mesurez les éléments demandés et entrez vos réponses ci-dessous
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				{#each questions as question, index (question.id)}
					{@const status = getAnswerStatus(question.id)}
					<div class="flex items-start gap-4">
						<!-- Question Number -->
						<div
							class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-medium
							{status === 'correct'
								? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
								: status === 'incorrect'
									? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
									: 'bg-muted text-muted-foreground'}"
						>
							{#if status === 'correct'}
								<Check class="h-4 w-4" />
							{:else if status === 'incorrect'}
								<AlertCircle class="h-4 w-4" />
							{:else}
								{index + 1}
							{/if}
						</div>

						<!-- Question Content -->
						<div class="flex-1 space-y-2">
							<label for="answer-{question.id}" class="text-sm font-medium">
								{question.label}
							</label>

							<div class="flex items-center gap-2">
								<Input
									id="answer-{question.id}"
									type="number"
									step="0.01"
									placeholder="Votre réponse"
									value={answers[question.id] ?? ''}
									oninput={(e) => updateAnswer(question.id, e.currentTarget.value)}
									disabled={hasSubmitted && validationResults?.isValid}
									class={status === 'correct'
										? 'border-green-500'
										: status === 'incorrect'
											? 'border-red-500'
											: ''}
								/>
								<span class="text-sm text-muted-foreground">{question.unit}</span>
							</div>

							{#if hasSubmitted && status === 'incorrect'}
								<p class="text-sm text-red-600 dark:text-red-400">Réponse incorrecte. Réessayez!</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</Card.Content>

		<Card.Footer class="flex justify-between">
			<Button variant="outline" onclick={handleReset} disabled={!hasSubmitted}>
				<RotateCcw class="mr-2 h-4 w-4" />
				Réinitialiser
			</Button>

			<Button
				onclick={handleValidate}
				disabled={isValidating || (hasSubmitted && validationResults?.isValid)}
			>
				{#if isValidating}
					Validation...
				{:else if hasSubmitted && validationResults?.isValid}
					<Check class="mr-2 h-4 w-4" />
					Validé
				{:else}
					<Check class="mr-2 h-4 w-4" />
					Valider mes réponses
				{/if}
			</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Validation Results -->
	{#if validationResults}
		<GeometryValidationFeedback results={validationResults} />
	{/if}
</div>

<style>
	.measurement-exercise {
		max-width: 900px;
		margin: 0 auto;
	}
</style>
