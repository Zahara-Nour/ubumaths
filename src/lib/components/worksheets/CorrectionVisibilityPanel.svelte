<!--
	CorrectionVisibilityPanel Component
	====================================

	A panel for managing per-exercise correction visibility on an existing assignment.
	Provides a global toggle and individual toggles for each exercise.

	Features:
	- Global toggle for show_corrections
	- List of exercises with individual toggles
	- Calls the corrections API on change
	- Loading and error states
	- Uses MyCheckbox component

	Usage:
	```svelte
	<CorrectionVisibilityPanel
		worksheetId="..."
		assignmentId="..."
		exercises={[{ id: '...', title: '...', position: 1 }]}
	/>
	```
-->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, Eye, EyeOff, RefreshCw, Info } from 'lucide-svelte';

	// ============================================================================
	// TYPES
	// ============================================================================

	interface Exercise {
		id: string;
		title: string;
		position: number;
	}

	interface ExerciseSetting {
		worksheet_exercise_id: string;
		show_correction: boolean;
	}

	interface CorrectionSettings {
		show_corrections: boolean;
		exercise_settings: ExerciseSetting[];
	}

	// ============================================================================
	// PROPS
	// ============================================================================

	interface Props {
		worksheetId: string;
		assignmentId: string;
		exercises: Exercise[];
	}

	let { worksheetId, assignmentId, exercises }: Props = $props();

	// ============================================================================
	// STATE
	// ============================================================================

	let showCorrections = $state(false);
	let exerciseSettings = $state<Map<string, boolean>>(new Map());
	let isLoading = $state(false);
	let loadError = $state<string | null>(null);
	let pendingGlobal = $state(false);
	let pendingExercises = $state<Set<string>>(new Set());

	// ============================================================================
	// DERIVED
	// ============================================================================

	// Count of exercises with corrections visible
	let visibleCount = $derived.by(() => {
		let count = 0;
		for (const exerciseId of exercises.map((e) => e.id)) {
			// Check if there's an override, otherwise fall back to global setting
			const override = exerciseSettings.get(exerciseId);
			if (override !== undefined) {
				if (override) count++;
			} else if (showCorrections) {
				count++;
			}
		}
		return count;
	});

	// ============================================================================
	// FUNCTIONS
	// ============================================================================

	/**
	 * Fetch current correction settings
	 */
	async function fetchSettings(): Promise<void> {
		isLoading = true;
		loadError = null;

		try {
			const response = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignmentId}/corrections`
			);
			if (!response.ok) {
				throw new Error('Impossible de charger les parametres de correction');
			}
			const data: CorrectionSettings = await response.json();

			showCorrections = data.show_corrections;

			// Build map of exercise-specific settings
			const newMap = new Map<string, boolean>();
			for (const setting of data.exercise_settings) {
				newMap.set(setting.worksheet_exercise_id, setting.show_correction);
			}
			exerciseSettings = newMap;
		} catch (err) {
			console.error('Error fetching correction settings:', err);
			loadError = err instanceof Error ? err.message : 'Erreur lors du chargement';
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Update global show_corrections setting
	 */
	async function updateGlobalSetting(value: boolean): Promise<void> {
		pendingGlobal = true;

		try {
			const response = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignmentId}/corrections`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ show_corrections: value })
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Erreur lors de la mise a jour');
			}

			showCorrections = value;
			toaster.success(value ? 'Corrections activees' : 'Corrections desactivees');
		} catch (err) {
			console.error('Error updating global setting:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la mise a jour');
			// Revert the toggle visually
			showCorrections = !value;
		} finally {
			pendingGlobal = false;
		}
	}

	/**
	 * Update individual exercise correction setting
	 */
	async function updateExerciseSetting(exerciseId: string, value: boolean): Promise<void> {
		pendingExercises = new Set([...pendingExercises, exerciseId]);

		try {
			const response = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignmentId}/corrections`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						worksheet_exercise_id: exerciseId,
						show_correction: value
					})
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Erreur lors de la mise a jour');
			}

			// Update local state
			exerciseSettings = new Map(exerciseSettings.set(exerciseId, value));
			toaster.success('Parametre mis a jour');
		} catch (err) {
			console.error('Error updating exercise setting:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la mise a jour');
		} finally {
			pendingExercises = new Set([...pendingExercises].filter((id) => id !== exerciseId));
		}
	}

	/**
	 * Get the effective visibility for an exercise
	 * Returns the override if set, otherwise the global setting
	 */
	function getExerciseVisibility(exerciseId: string): boolean {
		const override = exerciseSettings.get(exerciseId);
		return override !== undefined ? override : showCorrections;
	}

	/**
	 * Check if an exercise has a specific override
	 */
	function hasOverride(exerciseId: string): boolean {
		return exerciseSettings.has(exerciseId);
	}

	/**
	 * Handle global toggle change
	 */
	function handleGlobalChange(checked: boolean | 'indeterminate'): void {
		if (checked !== 'indeterminate') {
			updateGlobalSetting(checked);
		}
	}

	/**
	 * Handle exercise toggle change
	 */
	function handleExerciseChange(exerciseId: string, checked: boolean | 'indeterminate'): void {
		if (checked !== 'indeterminate') {
			updateExerciseSetting(exerciseId, checked);
		}
	}

	// Load settings on mount - this is intentional side effect for data fetching
	$effect(() => {
		// Read dependencies to track them
		const aid = assignmentId;
		const wid = worksheetId;
		if (aid && wid) {
			fetchSettings();
		}
	});
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<Card.Title class="flex items-center gap-2">
				<Eye class="h-5 w-5" />
				Visibilite des corrections
			</Card.Title>
			<div class="flex items-center gap-2">
				<Badge variant="outline">
					{visibleCount}/{exercises.length} visible(s)
				</Badge>
				<Button variant="ghost" size="icon" onclick={fetchSettings} disabled={isLoading}>
					<RefreshCw class="h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
					<span class="sr-only">Actualiser</span>
				</Button>
			</div>
		</div>
		<Card.Description>
			Gerez la visibilite des corrections pour chaque exercice. Les eleves ne verront que les
			corrections des exercices actives.
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		{#if isLoading && exercises.length === 0}
			<div class="flex items-center justify-center py-8">
				<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		{:else if loadError}
			<div class="py-6 text-center">
				<p class="text-sm text-destructive">{loadError}</p>
				<Button variant="outline" size="sm" onclick={fetchSettings} class="mt-3">Reessayer</Button>
			</div>
		{:else}
			<!-- Global toggle -->
			<div class="rounded-lg border bg-muted/30 p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<MyCheckbox
							checked={showCorrections}
							disabled={pendingGlobal}
							onCheckedChange={handleGlobalChange}
						/>
						<div>
							<p class="font-medium">Afficher les corrections</p>
							<p class="text-xs text-muted-foreground">
								Active ou desactive les corrections pour tous les exercices par defaut
							</p>
						</div>
					</div>
					{#if pendingGlobal}
						<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
					{:else if showCorrections}
						<Eye class="h-5 w-5 text-green-600 dark:text-green-400" />
					{:else}
						<EyeOff class="h-5 w-5 text-muted-foreground" />
					{/if}
				</div>
			</div>

			<Separator />

			<!-- Per-exercise settings -->
			{#if exercises.length === 0}
				<div class="py-6 text-center text-muted-foreground">
					<p class="text-sm">Aucun exercice dans cette feuille de travail</p>
				</div>
			{:else}
				<div class="space-y-1">
					<p class="text-sm font-medium">Parametres par exercice</p>
					<p class="text-xs text-muted-foreground">
						Surchargez le parametre global pour des exercices specifiques
					</p>
				</div>

				<div class="space-y-2">
					{#each exercises.sort((a, b) => a.position - b.position) as exercise (exercise.id)}
						{@const isVisible = getExerciseVisibility(exercise.id)}
						{@const hasExerciseOverride = hasOverride(exercise.id)}
						{@const isPending = pendingExercises.has(exercise.id)}

						<div
							class="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50 {hasExerciseOverride
								? 'border-primary/30 bg-primary/5'
								: ''}"
						>
							<div class="flex items-center gap-3">
								<MyCheckbox
									checked={isVisible}
									disabled={isPending}
									onCheckedChange={(checked) => handleExerciseChange(exercise.id, checked)}
								/>
								<div class="flex items-center gap-2">
									<Badge variant="outline" class="text-xs">
										{exercise.position}
									</Badge>
									<span class="text-sm">{exercise.title || 'Exercice sans titre'}</span>
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if hasExerciseOverride}
									<Badge variant="secondary" class="text-xs">Surcharge</Badge>
								{/if}
								{#if isPending}
									<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
								{:else if isVisible}
									<Eye class="h-4 w-4 text-green-600 dark:text-green-400" />
								{:else}
									<EyeOff class="h-4 w-4 text-muted-foreground" />
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Info alert -->
			<Alert.Root>
				<Info class="h-4 w-4" />
				<Alert.Title>Fonctionnement des surcharges</Alert.Title>
				<Alert.Description>
					Par defaut, tous les exercices utilisent le parametre global. Lorsque vous modifiez un
					exercice individuellement, il conserve son parametre specifique meme si le parametre
					global change.
				</Alert.Description>
			</Alert.Root>
		{/if}
	</Card.Content>
</Card.Root>
