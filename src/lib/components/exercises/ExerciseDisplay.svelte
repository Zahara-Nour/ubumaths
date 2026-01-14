<!--
	ExerciseDisplay Component
	==========================

	Displays exercises with support for both template mode (teacher preview)
	and instance mode (student view) with parameterized content.

	FEATURES:
	- Template mode: Show sample instances with regeneration button
	- Instance mode: Show resolved exercise instances
	- Supports static and parameterized exercises
	- On-demand mode: "Try New Problem" button for practice
	- Renders markdown with MathLive math rendering via MarkdownRenderer
	- Show/hide solution toggle
	- Exercise variations: Display variation label and resolved hints
	- Hint system: Pass resolved hints to MarkdownRenderer for {{hint:id}} references
	- Responsive design with loading states
	- Accessible keyboard navigation

	DISTRIBUTION MODES:
	- on_demand: Generate new values on each click (infinite practice)
	- per_student: Consistent values per student (personalized homework)
	- per_group: Same values for all students in group (class work)

	@see src/lib/exercises/generator/instance-generator.ts
	@see src/lib/components/markdown/MarkdownRenderer.svelte
-->
<script lang="ts">
	import {
		generateExerciseInstance,
		generateStudentSeed,
		generateGroupSeed
	} from '$lib/exercises/generator/instance-generator';
	import type { Exercise, ExerciseInstance } from '$lib/exercises/types';
	import { getExerciseContentSafe } from '$lib/exercises/types';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';
	import { Button } from '$lib/components/ui/button';
	import { MarkdownRenderer } from '$lib/components/markdown';

	interface Props {
		exercise: Exercise;
		mode?: 'template' | 'instance';
		userId?: string;
		groupId?: string;
		showSolution?: boolean;
		/** Explicit variation index (for exercises with variations) */
		variationIndex?: number;
		/** Explicit seed for parameterized exercises */
		seed?: number;
	}

	let {
		exercise = $bindable(),
		mode = 'instance',
		userId = undefined,
		groupId = undefined,
		showSolution = $bindable(false),
		variationIndex = undefined,
		seed = undefined
	}: Props = $props();

	// ============================================================================
	// STATE
	// ============================================================================

	// Current instance (resolved with specific variable values)
	let currentInstance = $state<ExerciseInstance | null>(null);

	// Error state for generation failures
	let generationError = $state<string | null>(null);

	// Loading state for async generation (future: if needed)
	let isGenerating = $state(false);

	// ============================================================================
	// INSTANCE GENERATION
	// ============================================================================

	/**
	 * Generate a new exercise instance with resolved variables
	 *
	 * Determines appropriate seed based on mode and distribution:
	 * - Explicit seed prop: Use that seed directly
	 * - Template mode: Random seed for preview
	 * - Instance mode + per_student: Deterministic seed from userId
	 * - Instance mode + per_group: Deterministic seed from groupId
	 * - Instance mode + on_demand: Random seed (unless userId/groupId provided)
	 */
	function generateInstance() {
		// Determine seed based on distribution mode or explicit prop
		let effectiveSeed: number | undefined;

		if (seed !== undefined) {
			// Explicit seed from prop takes precedence
			effectiveSeed = seed;
		} else if (mode === 'template') {
			// Teacher preview - use random seed for demonstration
			effectiveSeed = Math.floor(Math.random() * 1000000);
		} else {
			// Student view - use appropriate seeding strategy
			if (exercise.distribution_mode === 'per_student' && userId) {
				// Each student gets consistent values
				effectiveSeed = generateStudentSeed(exercise.id, userId);
			} else if (exercise.distribution_mode === 'per_group' && groupId) {
				// All students in group see same values
				effectiveSeed = generateGroupSeed(exercise.id, groupId);
			} else if (exercise.distribution_mode === 'on_demand') {
				// Random each time (undefined seed)
				effectiveSeed = undefined;
			} else {
				// Fallback: warn if missing required IDs
				if (exercise.distribution_mode === 'per_student' && !userId) {
					generationError = 'Mode per_student nécessite userId';
					currentInstance = null;
					return;
				}
				if (exercise.distribution_mode === 'per_group' && !groupId) {
					generationError = 'Mode per_group nécessite groupId';
					currentInstance = null;
					return;
				}
				effectiveSeed = undefined;
			}
		}

		// Generate instance with variation index if provided
		const result = generateExerciseInstance(exercise, {
			seed: effectiveSeed,
			variationIndex: variationIndex
		});

		if (result.success && result.instance) {
			currentInstance = result.instance;
			generationError = null;
		} else {
			generationError = result.errors?.join(', ') || 'Échec de la génération';
			currentInstance = null;
		}
	}

	// Auto-generate instance when exercise, variationIndex, or seed changes
	$effect(() => {
		// Track dependencies explicitly
		const _exercise = exercise;
		const _variationIndex = variationIndex;
		const _seed = seed;
		void _exercise;
		void _variationIndex;
		void _seed;

		if (mode === 'instance') {
			generateInstance();
		}
	});

	// ============================================================================
	// DERIVED VALUES
	// ============================================================================

	// Get content from variations (single source of truth)
	// Use variationIndex if provided, otherwise default to 0
	let exerciseContent = $derived(getExerciseContentSafe(exercise, variationIndex ?? 0));

	// Determine which content to display (instance or template)
	let displayStatementMd = $derived(
		currentInstance ? currentInstance.statement_md : exerciseContent.statement_md
	);

	let displaySolutionMd = $derived(
		currentInstance ? currentInstance.solution_md : exerciseContent.solution_md
	);

	// Hints from resolved variation (if available)
	let displayHints = $derived(currentInstance?.resolvedHints);

	/**
	 * Build GenericFunctionConfig from exercise.generic_functions.
	 *
	 * - undefined: Exercise doesn't specify → use parser defaults
	 * - []: Empty array → disable generic function parsing
	 * - ['f', 'P', ...]: Custom list → use those identifiers
	 */
	let genericFunctionsConfig = $derived.by<GenericFunctionConfig | undefined>(() => {
		if (exercise.generic_functions === undefined || exercise.generic_functions === null) {
			// Use parser defaults
			return undefined;
		}
		// Custom configuration from exercise
		return {
			names: exercise.generic_functions,
			allowDerivatives: true,
			allowInverse: true
		};
	});
</script>

<!-- ============================================================================ -->
<!-- TEMPLATE MODE BANNER (Teacher Preview) -->
<!-- ============================================================================ -->
{#if mode === 'template'}
	<div
		class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
	>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h4 class="font-semibold text-blue-900 dark:text-blue-100">Aperçu du template</h4>
				<p class="text-sm text-blue-700 dark:text-blue-300">
					{#if exercise.variables && exercise.variables.length > 0}
						Les élèves verront des valeurs différentes à chaque instance.
					{:else}
						Exercice statique (sans paramètres).
					{/if}
				</p>
			</div>
			{#if exercise.variables && exercise.variables.length > 0}
				<Button
					onclick={generateInstance}
					variant="outline"
					size="sm"
					class="text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900"
				>
					🎲 Autres valeurs
				</Button>
			{/if}
		</div>
	</div>
{/if}

<!-- ============================================================================ -->
<!-- ON-DEMAND REGENERATION BUTTON (Student Practice) -->
<!-- ============================================================================ -->
{#if exercise.distribution_mode === 'on_demand' && mode === 'instance' && exercise.variables && exercise.variables.length > 0}
	<div class="mb-4 flex justify-end">
		<Button onclick={generateInstance} variant="outline" size="sm">🎲 Nouveau problème</Button>
	</div>
{/if}

<!-- ============================================================================ -->
<!-- ERROR STATE -->
<!-- ============================================================================ -->
{#if generationError}
	<div class="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
		<p class="text-sm font-medium text-destructive">Erreur de génération</p>
		<p class="mt-1 text-sm text-destructive/80">{generationError}</p>
	</div>
{/if}

<!-- ============================================================================ -->
<!-- LOADING STATE -->
<!-- ============================================================================ -->
{#if isGenerating}
	<div class="flex justify-center p-8">
		<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
	</div>
{:else}
	<!-- ============================================================================ -->
	<!-- STATEMENT -->
	<!-- ============================================================================ -->
	<div class="exercise-statement exercise-content">
		<MarkdownRenderer
			content={displayStatementMd}
			genericFunctions={genericFunctionsConfig}
			hints={displayHints}
		/>
	</div>

	<!-- ============================================================================ -->
	<!-- SOLUTION TOGGLE -->
	<!-- ============================================================================ -->
	<div class="mt-6 flex items-center justify-between border-t border-border pt-4">
		<Button onclick={() => (showSolution = !showSolution)} variant="secondary" size="sm">
			{showSolution ? 'Masquer' : 'Afficher'} la solution
		</Button>

		{#if mode === 'template' && currentInstance && exercise.variables && exercise.variables.length > 0}
			<details class="text-sm">
				<summary class="cursor-pointer text-muted-foreground hover:text-foreground">
					Valeurs des variables
				</summary>
				<div class="mt-2 rounded-lg bg-muted p-3">
					<table class="w-full text-sm">
						<tbody>
							{#each currentInstance.resolvedVariables as variable (variable.name)}
								<tr class="border-b border-border last:border-0">
									<td class="py-1 pr-4 font-mono font-medium">{variable.name}</td>
									<td class="py-1 font-mono">{variable.value}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</details>
		{/if}
	</div>

	<!-- ============================================================================ -->
	<!-- SOLUTION -->
	<!-- ============================================================================ -->
	{#if showSolution}
		<div class="solution exercise-content mt-6 rounded-lg border border-border bg-muted/30 p-4">
			<h3 class="mb-3 text-lg font-semibold text-foreground">Solution</h3>
			<MarkdownRenderer
				content={displaySolutionMd}
				genericFunctions={genericFunctionsConfig}
				hints={displayHints}
			/>
		</div>
	{/if}
{/if}

<style>
	/* Use Lora serif font for exercise content */
	.exercise-content {
		font-family: 'Lora', Georgia, 'Times New Roman', serif;
	}
</style>
