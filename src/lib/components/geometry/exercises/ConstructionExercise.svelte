<!--
  Construction Exercise Component
  Students construct geometric figures from scratch or complete partial constructions
-->
<script lang="ts">
	import type {
		GeometryExercise,
		GeometryExerciseAttempt,
		MathGraphApp,
		ValidationResults,
		GeometryHint
	} from '$lib/types/geometry';
	import MathGraphEditor from '../MathGraphEditor.svelte';
	import GeometryValidationFeedback from '../GeometryValidationFeedback.svelte';
	import GeometryHints from '../GeometryHints.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Compass, Check, Save, Eye, EyeOff, Lightbulb, RotateCcw } from 'lucide-svelte';
	import { validateExercise } from '$lib/services/geometry-validator';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Props {
		exercise: GeometryExercise;
		attempt?: GeometryExerciseAttempt | null;
		hints?: GeometryHint[];
		onValidate?: (results: ValidationResults) => void;
		onSave?: (data: {
			figureState: string;
			attempts: number;
			hintsUsed: number;
			hintPenalty: number;
		}) => void;
	}

	let { exercise, attempt = null, hints = [], onValidate, onSave }: Props = $props();

	// State
	let mathGraphApp: MathGraphApp | null = $state(null);
	let editorRef: any = $state(null);
	let validationResults: ValidationResults | null = $state(null);
	let attemptCount = $state(attempt?.attempts_count ?? 0);
	let isValidating = $state(false);
	let isSaving = $state(false);
	let hasSubmitted = $state(false);
	let showHints = $state(false);
	let hintsUsed = $state(0);
	let totalHintPenalty = $state(0);
	let showValidationHelp = $state(false);

	// Auto-save tracking
	let lastSavedState = $state<string | null>(null);
	let autoSaveInterval: number | null = null;

	// Initialize from previous attempt
	let initialFigure = $state(attempt?.current_figure_state ?? exercise.base_figure ?? '');

	// Start auto-save
	$effect(() => {
		autoSaveInterval = window.setInterval(() => {
			handleAutoSave();
		}, 30000); // Every 30 seconds

		return () => {
			if (autoSaveInterval) {
				clearInterval(autoSaveInterval);
			}
		};
	});

	/**
	 * Handle MathGraph app ready
	 */
	function handleAppReady(app: MathGraphApp) {
		mathGraphApp = app;
	}

	/**
	 * Handle figure changes
	 */
	function handleFigureChange(app: MathGraphApp) {
		mathGraphApp = app;
		// Clear validation when figure changes
		if (hasSubmitted) {
			validationResults = null;
			hasSubmitted = false;
		}
	}

	/**
	 * Validate construction
	 */
	async function handleValidate() {
		if (!mathGraphApp) {
			toaster.error('Erreur: Figure non chargée');
			return;
		}

		isValidating = true;
		attemptCount++;

		try {
			// Validate construction
			const results = await validateExercise(mathGraphApp, exercise);

			// Apply hint penalties
			if (totalHintPenalty > 0) {
				results.score = Math.max(0, results.score - (results.maxScore * totalHintPenalty) / 100);
				results.feedback.push(
					`Pénalité pour indices utilisés: -${totalHintPenalty}% (${hintsUsed} indice(s))`
				);
			}

			validationResults = results;
			hasSubmitted = true;

			// Notify parent
			onValidate?.(results);

			// Show feedback
			if (results.isValid) {
				toaster.success(`Bravo! Score: ${Math.round(results.score)}/${results.maxScore}`);
			} else {
				const percentage = Math.round((results.score / results.maxScore) * 100);
				if (percentage >= 50) {
					toaster.warning(
						`Presque! Score: ${Math.round(results.score)}/${results.maxScore} (${percentage}%)`
					);
				} else {
					toaster.error(`Score: ${Math.round(results.score)}/${results.maxScore} (${percentage}%)`);
				}
			}

			// Auto-save
			await handleAutoSave();
		} catch (error) {
			console.error('Validation error:', error);
			toaster.error('Erreur lors de la validation');
		} finally {
			isValidating = false;
		}
	}

	/**
	 * Save current progress
	 */
	async function handleManualSave() {
		isSaving = true;
		try {
			await handleAutoSave();
			toaster.success('Progression sauvegardée');
		} catch (error) {
			console.error('Save error:', error);
			toaster.error('Erreur lors de la sauvegarde');
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Auto-save progress
	 */
	async function handleAutoSave() {
		if (!editorRef) return;

		try {
			const figureState = await editorRef.getCurrentFigure();

			// Only save if state has changed
			if (figureState !== lastSavedState) {
				lastSavedState = figureState;

				onSave?.({
					figureState,
					attempts: attemptCount,
					hintsUsed,
					hintPenalty: totalHintPenalty
				});
			}
		} catch (error) {
			console.error('Auto-save error:', error);
		}
	}

	/**
	 * Reset construction to initial state
	 */
	async function handleReset() {
		if (!mathGraphApp || !editorRef) return;

		try {
			await mathGraphApp.setFig({ fig: initialFigure });
			validationResults = null;
			hasSubmitted = false;
			toaster.info('Construction réinitialisée');
		} catch (error) {
			console.error('Reset error:', error);
			toaster.error('Erreur lors de la réinitialisation');
		}
	}

	/**
	 * Handle hint usage
	 */
	function handleHintUsed(level: string, penalty: number) {
		hintsUsed++;
		totalHintPenalty += penalty;
		toaster.warning(`Indice révélé (-${penalty}%)`);
	}

	/**
	 * Toggle hints panel
	 */
	function toggleHints() {
		showHints = !showHints;
	}

	/**
	 * Toggle validation help
	 */
	function toggleValidationHelp() {
		showValidationHelp = !showValidationHelp;
	}

	/**
	 * Get validation help items
	 */
	const validationHelp = $derived(() => {
		const help: string[] = [];

		if (exercise.validation_config?.requiredObjects) {
			help.push(`Objets requis: ${exercise.validation_config.requiredObjects.join(', ')}`);
		}

		if (exercise.validation_config?.checkParallel) {
			help.push('Vérifier le parallélisme des droites');
		}

		if (exercise.validation_config?.checkPerpendicular) {
			help.push('Vérifier la perpendicularité des droites');
		}

		if (exercise.validation_config?.checkCircle) {
			help.push('Vérifier les propriétés du cercle');
		}

		if (exercise.validation_config?.expectedAngle !== undefined) {
			help.push(`Angle attendu: ${exercise.validation_config.expectedAngle}°`);
		}

		if (exercise.validation_config?.expectedDistance !== undefined) {
			help.push(`Distance attendue: ${exercise.validation_config.expectedDistance} unités`);
		}

		return help;
	});
</script>

<div class="construction-exercise space-y-6">
	<!-- Header Card -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="rounded-full bg-green-100 p-2 dark:bg-green-900">
						<Compass class="h-5 w-5 text-green-600 dark:text-green-400" />
					</div>
					<div>
						<Card.Title>{exercise.title}</Card.Title>
						<Card.Description>Exercice de construction</Card.Description>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<div class="text-sm text-muted-foreground">Tentatives: {attemptCount}</div>
					{#if hintsUsed > 0}
						<div class="text-sm text-orange-600 dark:text-orange-400">
							Indices: {hintsUsed} (-{totalHintPenalty}%)
						</div>
					{/if}
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

	<!-- Main Content with Tabs -->
	<Card.Root>
		<Tabs.Root value="construction" class="w-full">
			<Card.Header>
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="construction">Construction</Tabs.Trigger>
					<Tabs.Trigger value="validation">
						Validation
						{#if validationResults}
							<Check class="ml-2 h-4 w-4 text-green-600 dark:text-green-400" />
						{/if}
					</Tabs.Trigger>
				</Tabs.List>
			</Card.Header>

			<!-- Construction Tab -->
			<Tabs.Content value="construction">
				<Card.Content class="space-y-4 p-6">
					<!-- Tools Info -->
					{#if exercise.tools_allowed && exercise.tools_allowed.length > 0}
						<div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
							<p class="text-sm font-medium text-blue-900 dark:text-blue-100">
								Outils disponibles:
							</p>
							<p class="mt-1 text-sm text-blue-700 dark:text-blue-300">
								{exercise.tools_allowed.join(', ')}
							</p>
						</div>
					{/if}

					<!-- Editor -->
					<MathGraphEditor
						bind:this={editorRef}
						figure={initialFigure}
						width={800}
						height={600}
						displayGrid={exercise.display_grid}
						displayAxes={exercise.display_axes}
						displayMeasures={exercise.display_measures}
						toolsAllowed={exercise.tools_allowed}
						onReady={handleAppReady}
						onChange={handleFigureChange}
					/>

					<!-- Action Buttons -->
					<div class="flex items-center justify-between">
						<div class="flex gap-2">
							<Button variant="outline" onclick={handleReset}>
								<RotateCcw class="mr-2 h-4 w-4" />
								Réinitialiser
							</Button>

							<Button variant="outline" onclick={handleManualSave} disabled={isSaving}>
								<Save class="mr-2 h-4 w-4" />
								{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
							</Button>

							{#if hints.length > 0}
								<Button variant="outline" onclick={toggleHints}>
									<Lightbulb class="mr-2 h-4 w-4" />
									Indices ({hints.length})
								</Button>
							{/if}
						</div>

						<Button onclick={handleValidate} disabled={isValidating}>
							{#if isValidating}
								Validation...
							{:else}
								<Check class="mr-2 h-4 w-4" />
								Valider ma construction
							{/if}
						</Button>
					</div>

					<!-- Hints Panel -->
					{#if showHints && hints.length > 0}
						<GeometryHints {hints} onHintUsed={handleHintUsed} />
					{/if}
				</Card.Content>
			</Tabs.Content>

			<!-- Validation Tab -->
			<Tabs.Content value="validation">
				<Card.Content class="space-y-4 p-6">
					{#if validationResults}
						<GeometryValidationFeedback results={validationResults} />
					{:else}
						<div class="rounded-lg border border-dashed p-8 text-center">
							<p class="text-muted-foreground">
								Validez votre construction pour voir les résultats
							</p>

							<!-- Validation Help -->
							<div class="mt-4">
								<Button variant="ghost" size="sm" onclick={toggleValidationHelp}>
									{#if showValidationHelp}
										<EyeOff class="mr-2 h-4 w-4" />
										Masquer les critères
									{:else}
										<Eye class="mr-2 h-4 w-4" />
										Voir les critères de validation
									{/if}
								</Button>

								{#if showValidationHelp && validationHelp().length > 0}
									<div class="mt-4 rounded-lg bg-muted p-4 text-left">
										<p class="mb-2 text-sm font-medium">Critères de validation:</p>
										<ul class="space-y-1 text-sm text-muted-foreground">
											{#each validationHelp() as item}
												<li>• {item}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</Card.Content>
			</Tabs.Content>
		</Tabs.Root>
	</Card.Root>

	<!-- Learning Tips -->
	{#if exercise.learning_objectives && exercise.learning_objectives.length > 0}
		<Card.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
			<Card.Header>
				<Card.Title class="text-base text-blue-900 dark:text-blue-100">
					Points clés à retenir
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-2 text-sm text-blue-800 dark:text-blue-200">
					{#each exercise.learning_objectives as objective}
						<li class="flex items-start gap-2">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0" />
							<span>{objective}</span>
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<style>
	.construction-exercise {
		max-width: 900px;
		margin: 0 auto;
	}
</style>
