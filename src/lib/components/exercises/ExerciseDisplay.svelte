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
	import { Button } from '$lib/components/ui/button';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import FontSelector from '$lib/components/FontSelector.svelte';

	interface Props {
		exercise: Exercise;
		mode?: 'template' | 'instance';
		userId?: string;
		groupId?: string;
		showSolution?: boolean;
	}

	let {
		exercise = $bindable(),
		mode = 'instance',
		userId = undefined,
		groupId = undefined,
		showSolution = $bindable(false)
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
	 * - Template mode: Random seed for preview
	 * - Instance mode + per_student: Deterministic seed from userId
	 * - Instance mode + per_group: Deterministic seed from groupId
	 * - Instance mode + on_demand: Random seed (unless userId/groupId provided)
	 */
	function generateInstance() {
		// Check if exercise is parameterized
		if (!exercise.variables || exercise.variables.length === 0) {
			// Non-parameterized exercise - no need to generate instance
			currentInstance = null;
			generationError = null;
			return;
		}

		// Determine seed based on distribution mode
		let seed: number | undefined;

		if (mode === 'template') {
			// Teacher preview - use random seed for demonstration
			seed = Math.floor(Math.random() * 1000000);
		} else {
			// Student view - use appropriate seeding strategy
			if (exercise.distribution_mode === 'per_student' && userId) {
				// Each student gets consistent values
				seed = generateStudentSeed(exercise.id, userId);
			} else if (exercise.distribution_mode === 'per_group' && groupId) {
				// All students in group see same values
				seed = generateGroupSeed(exercise.id, groupId);
			} else if (exercise.distribution_mode === 'on_demand') {
				// Random each time (undefined seed)
				seed = undefined;
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
				seed = undefined;
			}
		}

		// Generate instance
		const result = generateExerciseInstance(exercise, { seed });

		if (result.success && result.instance) {
			currentInstance = result.instance;
			generationError = null;
		} else {
			generationError = result.errors?.join(', ') || 'Échec de la génération';
			currentInstance = null;
		}
	}

	// Auto-generate instance when exercise changes or on mount
	$effect(() => {
		if (mode === 'instance') {
			generateInstance();
		}
	});

	// ============================================================================
	// DERIVED VALUES
	// ============================================================================

	// Determine which content to display (instance or template)
	let displayStatementMd = $derived(
		currentInstance ? currentInstance.statement_md : exercise.statement_md
	);

	let displaySolutionMd = $derived(
		currentInstance ? currentInstance.solution_md : exercise.solution_md
	);
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
		<MarkdownRenderer content={displayStatementMd} />
	</div>

	<!-- ============================================================================ -->
	<!-- SOLUTION TOGGLE & FONT SELECTOR -->
	<!-- ============================================================================ -->
	<div class="mt-6 flex items-center justify-between border-t border-border pt-4">
		<div class="flex items-center gap-2">
			<Button onclick={() => (showSolution = !showSolution)} variant="secondary" size="sm">
				{showSolution ? 'Masquer' : 'Afficher'} la solution
			</Button>
			<FontSelector />
		</div>

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
			<MarkdownRenderer content={displaySolutionMd} />
		</div>
	{/if}
{/if}

<!--
	Styles are now handled by MarkdownRenderer and its node components.
	No additional CSS required here.
-->
