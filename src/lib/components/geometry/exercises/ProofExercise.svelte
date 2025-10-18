<!--
  Proof Exercise Component
  Students write geometric proofs step-by-step
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
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { BookOpen, Check, Plus, Trash2, MoveUp, MoveDown } from 'lucide-svelte';
	import { validateExercise } from '$lib/services/geometry-validator';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface ProofStep {
		id: string;
		statement: string;
		justification: string;
	}

	interface Props {
		exercise: GeometryExercise;
		attempt?: GeometryExerciseAttempt | null;
		onValidate?: (results: ValidationResults) => void;
		onSave?: (data: { steps: ProofStep[]; attempts: number }) => void;
	}

	let { exercise, attempt = null, onValidate, onSave }: Props = $props();

	// State
	let mathGraphApp: MathGraphApp | null = $state(null);
	let proofSteps = $state<ProofStep[]>([]);
	let validationResults: ValidationResults | null = $state(null);
	let attemptCount = $state(attempt?.attempts_count ?? 0);
	let isValidating = $state(false);
	let hasSubmitted = $state(false);

	// Common justifications
	const commonJustifications = [
		'Définition',
		'Propriété des angles opposés par le sommet',
		'Propriété des angles alternes-internes',
		'Propriété des angles correspondants',
		"Somme des angles d'un triangle",
		'Théorème de Pythagore',
		'Réciproque du théorème de Pythagore',
		'Propriété de la médiatrice',
		'Propriété de la bissectrice',
		'Propriété du cercle',
		'Propriété du parallélogramme',
		'Théorème de Thalès',
		'Réciproque du théorème de Thalès',
		'Autre'
	];

	// Initialize from previous attempt
	$effect(() => {
		if (attempt?.student_answer) {
			const savedSteps = attempt.student_answer as ProofStep[];
			if (Array.isArray(savedSteps)) {
				proofSteps = savedSteps.map((step) => ({ ...step }));
			}
		} else {
			// Initialize with one empty step
			proofSteps = [{ id: generateId(), statement: '', justification: '' }];
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
	 * Generate unique ID
	 */
	function generateId(): string {
		return `step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Handle MathGraph app ready
	 */
	function handleAppReady(app: MathGraphApp) {
		mathGraphApp = app;
	}

	/**
	 * Add new proof step
	 */
	function addStep() {
		proofSteps = [...proofSteps, { id: generateId(), statement: '', justification: '' }];
	}

	/**
	 * Remove proof step
	 */
	function removeStep(index: number) {
		if (proofSteps.length <= 1) {
			toaster.warning('Au moins une étape est requise');
			return;
		}
		proofSteps = proofSteps.filter((_, i) => i !== index);
	}

	/**
	 * Move step up
	 */
	function moveStepUp(index: number) {
		if (index === 0) return;
		const newSteps = [...proofSteps];
		[newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
		proofSteps = newSteps;
	}

	/**
	 * Move step down
	 */
	function moveStepDown(index: number) {
		if (index === proofSteps.length - 1) return;
		const newSteps = [...proofSteps];
		[newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
		proofSteps = newSteps;
	}

	/**
	 * Update step statement
	 */
	function updateStatement(index: number, value: string) {
		proofSteps[index].statement = value;
		proofSteps = [...proofSteps];
	}

	/**
	 * Update step justification
	 */
	function updateJustification(index: number, value: string) {
		proofSteps[index].justification = value;
		proofSteps = [...proofSteps];
	}

	/**
	 * Validate proof
	 */
	async function handleValidate() {
		if (!mathGraphApp) {
			toaster.error('Erreur: Figure non chargée');
			return;
		}

		// Check if all steps are filled
		const emptySteps = proofSteps.filter(
			(step) => !step.statement.trim() || !step.justification.trim()
		);
		if (emptySteps.length > 0) {
			toaster.warning('Veuillez compléter toutes les étapes de la démonstration');
			return;
		}

		isValidating = true;
		attemptCount++;

		try {
			// For proof exercises, validation is typically manual or based on expected steps
			// Here we'll do a basic validation against expected proof steps if configured
			const expectedSteps = exercise.validation_config?.expectedProofSteps as
				| ProofStep[]
				| undefined;

			if (expectedSteps && Array.isArray(expectedSteps)) {
				// Validate against expected steps
				let score = 0;
				const maxScore = expectedSteps.length * 10;
				const errors: string[] = [];
				const feedback: string[] = [];

				// Check number of steps
				if (proofSteps.length !== expectedSteps.length) {
					feedback.push(`Nombre d'étapes: ${proofSteps.length} (attendu: ${expectedSteps.length})`);
				}

				// Compare each step
				for (let i = 0; i < Math.min(proofSteps.length, expectedSteps.length); i++) {
					const studentStep = proofSteps[i];
					const expectedStep = expectedSteps[i];

					// Check statement (fuzzy match)
					const statementMatch =
						studentStep.statement.toLowerCase().includes(expectedStep.statement.toLowerCase()) ||
						expectedStep.statement.toLowerCase().includes(studentStep.statement.toLowerCase());

					// Check justification
					const justificationMatch =
						studentStep.justification.toLowerCase() === expectedStep.justification.toLowerCase();

					if (statementMatch && justificationMatch) {
						score += 10;
						feedback.push(`✓ Étape ${i + 1}: Correcte`);
					} else if (statementMatch) {
						score += 5;
						feedback.push(`△ Étape ${i + 1}: Affirmation correcte, justification incorrecte`);
					} else {
						errors.push(`✗ Étape ${i + 1}: Incorrecte`);
					}
				}

				validationResults = {
					isValid: score >= maxScore * 0.8,
					score,
					maxScore,
					errors,
					warnings: [],
					feedback,
					measurements: {},
					objectsCreated: [],
					objectsMissing: [],
					objectsIncorrect: []
				};
			} else {
				// No expected steps configured - manual review required
				validationResults = {
					isValid: false,
					score: 0,
					maxScore: 100,
					errors: [],
					warnings: ['Cette démonstration nécessite une évaluation manuelle par le professeur'],
					feedback: ['Votre démonstration a été enregistrée et sera évaluée par le professeur.'],
					measurements: {},
					objectsCreated: [],
					objectsMissing: [],
					objectsIncorrect: []
				};
			}

			hasSubmitted = true;

			// Notify parent
			onValidate?.(validationResults);

			// Show feedback
			if (validationResults.isValid) {
				toaster.success(`Bravo! Démonstration correcte!`);
			} else if (validationResults.warnings.length > 0) {
				toaster.info('Démonstration enregistrée pour évaluation manuelle');
			} else {
				toaster.warning('Démonstration incomplète ou incorrecte. Réessayez!');
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
	 * Auto-save progress
	 */
	function handleAutoSave() {
		onSave?.({
			steps: proofSteps,
			attempts: attemptCount
		});
	}

	/**
	 * Get step status
	 */
	function getStepStatus(index: number): 'complete' | 'incomplete' {
		const step = proofSteps[index];
		return step.statement.trim() && step.justification.trim() ? 'complete' : 'incomplete';
	}
</script>

<div class="proof-exercise space-y-6">
	<!-- Header Card -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="rounded-full bg-indigo-100 p-2 dark:bg-indigo-900">
						<BookOpen class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
					</div>
					<div>
						<Card.Title>{exercise.title}</Card.Title>
						<Card.Description>Exercice de démonstration</Card.Description>
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

	<!-- Figure -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Figure</Card.Title>
		</Card.Header>
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

	<!-- Proof Steps -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title class="text-base">Démonstration</Card.Title>
					<Card.Description>
						Rédigez votre démonstration étape par étape avec les justifications
					</Card.Description>
				</div>
				<Button size="sm" onclick={addStep}>
					<Plus class="mr-2 h-4 w-4" />
					Ajouter une étape
				</Button>
			</div>
		</Card.Header>

		<Card.Content class="space-y-6">
			{#each proofSteps as step, index (index)}
				{@const status = getStepStatus(index)}
				<div class="proof-step space-y-3">
					<!-- Step Header -->
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full font-medium
								{status === 'complete'
									? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
									: 'bg-muted text-muted-foreground'}"
							>
								{#if status === 'complete'}
									<Check class="h-4 w-4" />
								{:else}
									{index + 1}
								{/if}
							</div>
							<span class="font-medium">Étape {index + 1}</span>
						</div>

						<!-- Step Actions -->
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								onclick={() => moveStepUp(index)}
								disabled={index === 0}
							>
								<MoveUp class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => moveStepDown(index)}
								disabled={index === proofSteps.length - 1}
							>
								<MoveDown class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => removeStep(index)}
								disabled={proofSteps.length <= 1}
							>
								<Trash2 class="h-4 w-4 text-destructive" />
							</Button>
						</div>
					</div>

					<!-- Statement -->
					<div class="space-y-2">
						<label for="statement-{step.id}" class="text-sm font-medium"> Affirmation </label>
						<Textarea
							id="statement-{step.id}"
							placeholder="Exemple: Les droites (AB) et (CD) sont parallèles"
							value={step.statement}
							oninput={(e) => updateStatement(index, e.currentTarget.value)}
							rows={2}
							disabled={hasSubmitted && validationResults?.isValid}
						/>
					</div>

					<!-- Justification -->
					<div class="space-y-2">
						<label for="justification-{step.id}" class="text-sm font-medium"> Justification </label>
						<Select.Root
							selected={{ value: step.justification, label: step.justification || 'Choisir...' }}
							onSelectedChange={(selected) => {
								if (selected) {
									updateJustification(index, selected.value);
								}
							}}
							disabled={hasSubmitted && validationResults?.isValid}
						>
							<Select.Trigger>
								<Select.Value placeholder="Choisir une justification..." />
							</Select.Trigger>
							<Select.Content>
								{#each commonJustifications as justification, i (i)}
									<Select.Item value={justification}>{justification}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>

						{#if step.justification === 'Autre'}
							<Textarea
								placeholder="Précisez votre justification..."
								value={step.statement}
								oninput={(e) => updateJustification(index, e.currentTarget.value)}
								rows={2}
							/>
						{/if}
					</div>

					{#if index < proofSteps.length - 1}
						<div class="border-b"></div>
					{/if}
				</div>
			{/each}
		</Card.Content>

		<Card.Footer class="flex justify-between">
			<Button variant="outline" onclick={addStep}>
				<Plus class="mr-2 h-4 w-4" />
				Ajouter une étape
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
					Valider ma démonstration
				{/if}
			</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Validation Results -->
	{#if validationResults}
		<GeometryValidationFeedback results={validationResults} />
	{/if}

	<!-- Tips -->
	<Card.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
		<Card.Header>
			<Card.Title class="text-base text-blue-900 dark:text-blue-100">
				Conseils pour rédiger une démonstration
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<ul class="space-y-2 text-sm text-blue-800 dark:text-blue-200">
				<li class="flex items-start gap-2">
					<Check class="mt-0.5 h-4 w-4 flex-shrink-0" />
					<span>Chaque affirmation doit être accompagnée d'une justification précise</span>
				</li>
				<li class="flex items-start gap-2">
					<Check class="mt-0.5 h-4 w-4 flex-shrink-0" />
					<span>Utilisez les propriétés et théorèmes vus en cours</span>
				</li>
				<li class="flex items-start gap-2">
					<Check class="mt-0.5 h-4 w-4 flex-shrink-0" />
					<span>Suivez un ordre logique dans votre raisonnement</span>
				</li>
				<li class="flex items-start gap-2">
					<Check class="mt-0.5 h-4 w-4 flex-shrink-0" />
					<span>Soyez précis dans vos notations géométriques</span>
				</li>
			</ul>
		</Card.Content>
	</Card.Root>
</div>

<style>
	.proof-exercise {
		max-width: 900px;
		margin: 0 auto;
	}

	.proof-step {
		padding: 1rem;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border));
	}
</style>
