<!--
	ExerciseList Component
	======================

	Displays exercises grouped by section with drag-and-drop reordering.

	Features:
	- Display exercises grouped by section (or "Sans section" for ungrouped)
	- Drag and drop to reorder exercises within section
	- Drag and drop to move exercises between sections
	- Show exercise: position number, title, points, variant mode badge
	- Edit button for points and variant config (opens modal)
	- Delete button (remove from worksheet, not from DB)

	Usage:
	```svelte
	<ExerciseList
		worksheetId={worksheet.id}
		exercises={worksheet.exercises}
		sections={worksheet.sections}
		readonly={worksheet.status !== 'draft'}
		onExercisesChange={handleExercisesChange}
		onEditExercise={handleEditExercise}
	/>
	```
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { GripVertical, Pencil, Trash2, Loader2, Settings2 } from 'lucide-svelte';
	import type {
		WorksheetExerciseWithExercise,
		WorksheetSectionRow,
		VariantMode
	} from '$lib/types/worksheets';

	// Types
	interface Props {
		worksheetId: string;
		exercises: WorksheetExerciseWithExercise[];
		sections: WorksheetSectionRow[];
		readonly?: boolean;
		onExercisesChange?: (exercises: WorksheetExerciseWithExercise[]) => void;
		onEditExercise?: (exercise: WorksheetExerciseWithExercise) => void;
	}

	// Props
	let {
		worksheetId,
		exercises = [],
		sections = [],
		readonly = false,
		onExercisesChange,
		onEditExercise
	}: Props = $props();

	// Drag state
	let draggedExercise = $state<WorksheetExerciseWithExercise | null>(null);
	let dragOverSectionId = $state<string | null>(null);
	let dragOverIndex = $state<number | null>(null);

	// Delete state
	let deletingExerciseId = $state<string | null>(null);
	let deleteConfirmOpen = $state(false);
	let isDeleting = $state(false);

	// Saving state
	let isSaving = $state(false);

	// Variant mode labels
	const variantModeLabels: Record<VariantMode, string> = {
		none: 'Aucune',
		individual: 'Individuel',
		n_versions: 'N versions',
		group: 'Groupe'
	};

	// Group exercises by section
	let groupedExercises = $derived.by(() => {
		const groups = new Map<string | null, WorksheetExerciseWithExercise[]>();

		// Initialize groups with all sections
		for (const section of sections) {
			groups.set(section.id, []);
		}
		// Add unsectioned group
		groups.set(null, []);

		// Populate groups
		for (const exercise of exercises) {
			const sectionId = exercise.section_id;
			const group = groups.get(sectionId) ?? [];
			group.push(exercise);
			groups.set(sectionId, group);
		}

		// Sort exercises within each group by position
		for (const group of groups.values()) {
			group.sort((a, b) => a.position - b.position);
		}

		return groups;
	});

	// Get section by id
	function getSectionTitle(sectionId: string | null): string {
		if (!sectionId) return 'Sans section';
		const section = sections.find((s) => s.id === sectionId);
		return section?.title ?? 'Section inconnue';
	}

	// Get sorted section ids (sections by position, then null for unsectioned)
	let sortedSectionIds = $derived.by(() => {
		const sorted = [...sections].sort((a, b) => a.position - b.position).map((s) => s.id);
		sorted.push(null as unknown as string); // Add null for unsectioned
		return sorted as (string | null)[];
	});

	/**
	 * Handle drag start
	 */
	function handleDragStart(e: DragEvent, exercise: WorksheetExerciseWithExercise) {
		if (readonly) return;
		draggedExercise = exercise;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', exercise.id);
		}
	}

	/**
	 * Handle drag over a section
	 */
	function handleDragOverSection(e: DragEvent, sectionId: string | null) {
		if (readonly || !draggedExercise) return;
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverSectionId = sectionId;
	}

	/**
	 * Handle drag over a specific exercise position
	 */
	function handleDragOverExercise(e: DragEvent, sectionId: string | null, index: number) {
		if (readonly || !draggedExercise) return;
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverSectionId = sectionId;
		dragOverIndex = index;
	}

	/**
	 * Handle drag leave
	 */
	function handleDragLeave() {
		// Only clear if we're leaving the entire section
		// This is handled implicitly by dragOverSection updates
	}

	/**
	 * Handle drop
	 */
	async function handleDrop(e: DragEvent, targetSectionId: string | null, targetIndex?: number) {
		e.preventDefault();
		if (readonly || !draggedExercise) return;

		const exercise = draggedExercise;
		const sourceSectionId = exercise.section_id;
		const sourceGroup = groupedExercises.get(sourceSectionId) ?? [];
		const targetGroup = groupedExercises.get(targetSectionId) ?? [];

		// Calculate new position
		let newPosition: number;
		if (targetIndex !== undefined && targetIndex >= 0) {
			// Insert at specific index
			if (targetGroup.length === 0) {
				newPosition = 1;
			} else if (targetIndex >= targetGroup.length) {
				newPosition = targetGroup[targetGroup.length - 1].position + 1;
			} else {
				newPosition = targetGroup[targetIndex].position;
			}
		} else {
			// Append to end
			newPosition = targetGroup.length > 0 ? targetGroup[targetGroup.length - 1].position + 1 : 1;
		}

		// Check if anything changed
		if (sourceSectionId === targetSectionId && exercise.position === newPosition) {
			resetDragState();
			return;
		}

		// Build updates array
		const updates: { id: string; position: number; section_id: string | null }[] = [];

		// Moving to a different section or different position
		if (sourceSectionId !== targetSectionId || targetIndex !== undefined) {
			// Update dragged exercise
			updates.push({
				id: exercise.id,
				position: newPosition,
				section_id: targetSectionId
			});

			// Reorder other exercises in target section (shift positions)
			if (targetIndex !== undefined && targetIndex < targetGroup.length) {
				for (let i = targetIndex; i < targetGroup.length; i++) {
					const ex = targetGroup[i];
					if (ex.id !== exercise.id) {
						updates.push({
							id: ex.id,
							position: ex.position + 1,
							section_id: targetSectionId
						});
					}
				}
			}

			// Reorder exercises in source section (close gap)
			if (sourceSectionId !== targetSectionId) {
				const sourceIndex = sourceGroup.findIndex((ex) => ex.id === exercise.id);
				for (let i = sourceIndex + 1; i < sourceGroup.length; i++) {
					const ex = sourceGroup[i];
					updates.push({
						id: ex.id,
						position: ex.position - 1,
						section_id: sourceSectionId
					});
				}
			}
		}

		resetDragState();

		if (updates.length === 0) return;

		// Save to server
		await saveExerciseOrder(updates);
	}

	/**
	 * Save exercise order to server
	 */
	async function saveExerciseOrder(
		updates: { id: string; position: number; section_id: string | null }[]
	) {
		isSaving = true;

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/exercises`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exercises: updates })
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la sauvegarde');
			}

			// Update local state
			const newExercises = exercises.map((ex) => {
				const update = updates.find((u) => u.id === ex.id);
				if (update) {
					return { ...ex, position: update.position, section_id: update.section_id };
				}
				return ex;
			});

			onExercisesChange?.(newExercises);
		} catch (err) {
			console.error('Error saving exercise order:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Reset drag state
	 */
	function resetDragState() {
		draggedExercise = null;
		dragOverSectionId = null;
		dragOverIndex = null;
	}

	/**
	 * Handle drag end
	 */
	function handleDragEnd() {
		resetDragState();
	}

	/**
	 * Open delete confirmation
	 */
	function confirmDeleteExercise(exerciseId: string) {
		deletingExerciseId = exerciseId;
		deleteConfirmOpen = true;
	}

	/**
	 * Delete exercise from worksheet
	 */
	async function deleteExercise() {
		if (!deletingExerciseId) return;

		isDeleting = true;

		try {
			const response = await fetch(
				`/api/worksheets/${worksheetId}/exercises/${deletingExerciseId}`,
				{
					method: 'DELETE'
				}
			);

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la suppression');
			}

			const newExercises = exercises.filter((e) => e.id !== deletingExerciseId);
			onExercisesChange?.(newExercises);

			toaster.success('Exercice retire de la feuille');
		} catch (err) {
			console.error('Error deleting exercise:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
		} finally {
			isDeleting = false;
			deletingExerciseId = null;
			deleteConfirmOpen = false;
		}
	}

	/**
	 * Get global position number for an exercise
	 */
	function getGlobalPosition(sectionId: string | null, localIndex: number): number {
		let position = 0;
		for (const secId of sortedSectionIds) {
			const group = groupedExercises.get(secId) ?? [];
			if (secId === sectionId) {
				return position + localIndex + 1;
			}
			position += group.length;
		}
		return position + localIndex + 1;
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title>Exercices</Card.Title>
				<Card.Description>
					{exercises.length} exercice(s) dans cette feuille
					{#if isSaving}
						<span class="ml-2 inline-flex items-center text-primary">
							<Loader2 class="mr-1 h-3 w-3 animate-spin" />
							Sauvegarde...
						</span>
					{/if}
				</Card.Description>
			</div>
		</div>
	</Card.Header>
	<Card.Content>
		{#if exercises.length === 0}
			<div class="py-8 text-center text-muted-foreground">
				<p>Aucun exercice dans cette feuille</p>
				{#if !readonly}
					<p class="mt-1 text-sm">Utilisez "Ajouter des exercices" pour commencer</p>
				{/if}
			</div>
		{:else}
			<div class="space-y-4">
				{#each sortedSectionIds as sectionId (sectionId ?? 'unsectioned')}
					{@const sectionExercises = groupedExercises.get(sectionId) ?? []}
					{@const isDropTarget = dragOverSectionId === sectionId}

					<!-- Section header -->
					<div class="space-y-2">
						<h4 class="text-sm font-medium text-muted-foreground">
							{getSectionTitle(sectionId)}
							<span class="ml-1 text-xs">({sectionExercises.length})</span>
						</h4>

						<!-- Drop zone -->
						<div
							class="min-h-[48px] rounded-lg border-2 border-dashed transition-colors {isDropTarget
								? 'border-primary bg-primary/5'
								: 'border-transparent'}"
							role="list"
							aria-label="Liste des exercices pour {getSectionTitle(sectionId)}"
							ondragover={(e) => handleDragOverSection(e, sectionId)}
							ondragleave={handleDragLeave}
							ondrop={(e) => handleDrop(e, sectionId)}
						>
							{#if sectionExercises.length === 0}
								<div class="flex h-12 items-center justify-center text-sm text-muted-foreground">
									{#if !readonly && draggedExercise}
										Deposer ici
									{:else}
										Aucun exercice
									{/if}
								</div>
							{:else}
								<div class="space-y-1 p-1">
									{#each sectionExercises as exercise, index (exercise.id)}
										{@const isDragging = draggedExercise?.id === exercise.id}
										{@const isDropBefore =
											dragOverSectionId === sectionId && dragOverIndex === index}
										{@const globalPos = getGlobalPosition(sectionId, index)}

										<!-- Drop indicator before this item -->
										{#if isDropBefore && !isDragging}
											<div class="h-1 rounded bg-primary"></div>
										{/if}

										<div
											class="group flex items-center gap-2 rounded-md border bg-card p-2 transition-all {isDragging
												? 'opacity-50'
												: 'hover:bg-muted/50'} {!readonly
												? 'cursor-grab active:cursor-grabbing'
												: ''}"
											draggable={!readonly}
											role="listitem"
											aria-label="Exercice {exercise.exercise?.title || 'sans titre'}"
											ondragstart={(e) => handleDragStart(e, exercise)}
											ondragend={handleDragEnd}
											ondragover={(e) => handleDragOverExercise(e, sectionId, index)}
										>
											<!-- Drag handle -->
											{#if !readonly}
												<div class="text-muted-foreground">
													<GripVertical class="h-4 w-4" />
												</div>
											{/if}

											<!-- Position number -->
											<div
												class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
											>
												{globalPos}
											</div>

											<!-- Title and info -->
											<div class="min-w-0 flex-1">
												<div class="flex items-center gap-2">
													<span class="truncate font-medium">
														{exercise.exercise?.title || '(Sans titre)'}
													</span>
													{#if exercise.variant_mode !== 'none'}
														<Badge variant="outline" class="text-xs">
															{variantModeLabels[exercise.variant_mode]}
														</Badge>
													{/if}
												</div>
											</div>

											<!-- Points -->
											<div class="shrink-0 text-sm text-muted-foreground">
												{exercise.points ?? '-'} pts
											</div>

											<!-- Actions -->
											{#if !readonly}
												<div
													class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
												>
													<Button
														variant="ghost"
														size="icon"
														class="h-7 w-7"
														onclick={() => onEditExercise?.(exercise)}
														aria-label="Configurer"
													>
														<Settings2 class="h-3 w-3" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														class="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
														onclick={() => confirmDeleteExercise(exercise.id)}
														aria-label="Retirer"
													>
														<Trash2 class="h-3 w-3" />
													</Button>
												</div>
											{/if}
										</div>
									{/each}

									<!-- Drop indicator at end -->
									{#if dragOverSectionId === sectionId && dragOverIndex === sectionExercises.length}
										<div class="h-1 rounded bg-primary"></div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<!-- Delete confirmation dialog -->
<ConfirmDialog
	bind:open={deleteConfirmOpen}
	title="Retirer l'exercice"
	description="L'exercice sera retire de la feuille mais restera disponible dans la base d'exercices."
	confirmLabel={isDeleting ? 'Suppression...' : 'Retirer'}
	onConfirm={deleteExercise}
	onCancel={() => (deletingExerciseId = null)}
/>
