<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { toaster } from '$lib/stores/toaster.svelte';
	import ExerciseSelector from '$lib/components/worksheets/ExerciseSelector.svelte';
	import SectionManager from '$lib/components/worksheets/SectionManager.svelte';
	import ExerciseList from '$lib/components/worksheets/ExerciseList.svelte';
	import ExerciseConfigModal from '$lib/components/worksheets/ExerciseConfigModal.svelte';
	import PdfPreview from '$lib/components/worksheets/PdfPreview.svelte';
	import CorrectionManager from '$lib/components/worksheets/CorrectionManager.svelte';
	import WorksheetAssignmentForm from '$lib/components/worksheets/WorksheetAssignmentForm.svelte';
	import {
		ArrowLeft,
		Pencil,
		MoreHorizontal,
		Send,
		Archive,
		RotateCcw,
		Clock,
		FileText,
		Calendar,
		GraduationCap,
		Tag,
		ListOrdered,
		Loader2,
		FileDown,
		Users,
		Plus
	} from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import type {
		WorksheetWithRelations,
		WorksheetSectionRow,
		WorksheetExerciseWithExercise,
		WorksheetAssignmentRow,
		WorksheetAssignmentInsert
	} from '$lib/types/worksheets';
	import { formatGradeShort } from '$lib/utils/grades';
	import {
		WORKSHEET_TYPE_ICONS,
		WORKSHEET_TYPE_LABELS,
		WORKSHEET_STATUS_VARIANTS,
		WORKSHEET_STATUS_LABELS,
		ASSIGNMENT_STATUS_LABELS,
		formatDate,
		formatDuration
	} from '$lib/utils/worksheet-constants';
	import type { GradeCode } from '$lib/types/grades';
	import type { Exercise } from '$lib/exercises/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Loading states
	let publishing = $state(false);
	let archiving = $state(false);
	let unarchiving = $state(false);
	let addingExercises = $state(false);

	// Exercise selector state
	let exerciseSelectorOpen = $state(false);

	// Exercise config modal state
	let configModalOpen = $state(false);
	let selectedExercise = $state<WorksheetExerciseWithExercise | null>(null);

	// Assignment state
	let assignments = $state<(WorksheetAssignmentRow & { correctionStatus?: unknown })[]>([]);
	let assignmentsLoading = $state(false);
	let showAssignmentForm = $state(false);
	let selectedAssignment = $state<(WorksheetAssignmentRow & { correctionStatus?: unknown }) | null>(
		null
	);
	let classes = $state<{ id: string; name: string }[]>([]);

	// Type-safe worksheet access with local state for updates
	// This allows both local optimistic updates AND server data sync
	// eslint-disable-next-line svelte/prefer-writable-derived -- intentional local state + server sync pattern
	let worksheetData = $state(data.worksheet as WorksheetWithRelations);

	// Update local state when data changes (e.g., after invalidateAll)
	$effect(() => {
		worksheetData = data.worksheet as WorksheetWithRelations;
	});

	// Derived values
	let worksheet = $derived(worksheetData);
	let isDraft = $derived(worksheet.status === 'draft');

	// Get IDs of already added exercises
	let existingExerciseIds = $derived(worksheet.exercises?.map((e) => e.exercise_id) ?? []);

	// Show toast on form result
	$effect(() => {
		if (form?.success) {
			toaster.success(form.message || 'Operation reussie');
		} else if (form?.message) {
			toaster.error(form.message);
		}
	});

	/**
	 * Handle adding selected exercises to worksheet
	 */
	async function handleAddExercises(exercises: Exercise[]): Promise<void> {
		if (exercises.length === 0) return;

		addingExercises = true;

		try {
			// Get current max position
			const currentMaxPosition = worksheet.exercises?.length ?? 0;

			// Add exercises sequentially to maintain order
			let addedCount = 0;
			for (let i = 0; i < exercises.length; i++) {
				const exercise = exercises[i];
				const response = await fetch(`/api/worksheets/${worksheet.id}/exercises`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						exercise_id: exercise.id,
						position: currentMaxPosition + i + 1
					})
				});

				if (response.ok) {
					addedCount++;
				} else {
					const errorData = await response.json().catch(() => ({}));
					console.error(`Failed to add exercise ${exercise.id}:`, errorData);
				}
			}

			if (addedCount > 0) {
				toaster.success(`${addedCount} exercice(s) ajoute(s)`);
				// Refresh the page data to show new exercises
				await invalidateAll();
			}

			if (addedCount < exercises.length) {
				toaster.warning(`${exercises.length - addedCount} exercice(s) n'ont pas pu etre ajoutes`);
			}
		} catch (err) {
			console.error('Error adding exercises:', err);
			toaster.error("Erreur lors de l'ajout des exercices");
		} finally {
			addingExercises = false;
			exerciseSelectorOpen = false;
		}
	}

	/**
	 * Handle sections change from SectionManager
	 */
	function handleSectionsChange(newSections: WorksheetSectionRow[]) {
		worksheetData = {
			...worksheetData,
			sections: newSections
		};
	}

	/**
	 * Handle exercises change from ExerciseList
	 */
	function handleExercisesChange(newExercises: WorksheetExerciseWithExercise[]) {
		worksheetData = {
			...worksheetData,
			exercises: newExercises
		};
	}

	/**
	 * Handle edit exercise click - open config modal
	 */
	function handleEditExercise(exercise: WorksheetExerciseWithExercise) {
		selectedExercise = exercise;
		configModalOpen = true;
	}

	/**
	 * Handle exercise config save
	 */
	function handleExerciseSave(updatedExercise: WorksheetExerciseWithExercise) {
		const newExercises = (worksheet.exercises ?? []).map((e) =>
			e.id === updatedExercise.id ? updatedExercise : e
		);
		handleExercisesChange(newExercises);
	}

	/**
	 * Load assignments for the worksheet
	 */
	async function loadAssignments() {
		assignmentsLoading = true;
		try {
			const response = await fetch(`/api/worksheets/${worksheet.id}/assignments`);
			const data = await response.json();
			if (response.ok) {
				assignments = data.assignments || [];
			}
		} catch (err) {
			console.error('Error loading assignments:', err);
		} finally {
			assignmentsLoading = false;
		}
	}

	/**
	 * Load user's classes
	 */
	async function loadClasses() {
		try {
			const response = await fetch('/api/classes');
			const data = await response.json();
			if (response.ok) {
				classes = data.classes || [];
			}
		} catch (err) {
			console.error('Error loading classes:', err);
		}
	}

	/**
	 * Handle assignment creation
	 */
	async function handleCreateAssignment(assignmentData: WorksheetAssignmentInsert) {
		const response = await fetch(`/api/worksheets/${worksheet.id}/assignments`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(assignmentData)
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || 'Erreur lors de la creation');
		}

		showAssignmentForm = false;
		await loadAssignments();
	}

	/**
	 * Handle assignment update (refresh)
	 */
	async function handleAssignmentUpdate() {
		await loadAssignments();
	}
</script>

<svelte:head>
	<title>{worksheet.title || 'Feuille'} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-5xl py-6">
	<!-- Header -->
	<div class="mb-6 flex items-start justify-between">
		<div class="flex items-start gap-4">
			<Button variant="ghost" size="icon" href="/dashboard/teacher/worksheets" class="mt-1">
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<div class="flex items-center gap-3">
					<h1 class="text-3xl font-bold">{worksheet.title || '(Sans titre)'}</h1>
					<Badge variant={WORKSHEET_STATUS_VARIANTS[worksheet.status]}>
						{WORKSHEET_STATUS_LABELS[worksheet.status]}
					</Badge>
				</div>
				{#if worksheet.type}
					{@const TypeIcon = WORKSHEET_TYPE_ICONS[worksheet.type]}
					<p class="mt-1 text-muted-foreground">
						<span class="inline-flex items-center gap-1">
							<TypeIcon class="h-4 w-4" />
							{WORKSHEET_TYPE_LABELS[worksheet.type]}
						</span>
					</p>
				{/if}
			</div>
		</div>

		<!-- Actions -->
		<div class="flex gap-2">
			<Button variant="outline" href="/dashboard/teacher/worksheets/{worksheet.id}/edit">
				<Pencil class="mr-2 h-4 w-4" />
				Modifier
			</Button>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button variant="outline" size="icon">
						<MoreHorizontal class="h-4 w-4" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					{#if worksheet.status === 'draft'}
						<form
							method="POST"
							action="?/publish"
							use:enhance={() => {
								publishing = true;
								return async ({ result, update }) => {
									await update();
									if (result.type === 'success') {
										await invalidateAll();
									}
									publishing = false;
								};
							}}
						>
							<DropdownMenu.Item>
								<button type="submit" disabled={publishing} class="flex w-full items-center gap-2">
									<Send class="h-4 w-4" />
									{publishing ? 'Publication...' : 'Publier'}
								</button>
							</DropdownMenu.Item>
						</form>
					{/if}
					{#if worksheet.status !== 'archived'}
						<form
							method="POST"
							action="?/archive"
							use:enhance={() => {
								archiving = true;
								return async ({ result, update }) => {
									await update();
									if (result.type === 'success') {
										await invalidateAll();
									}
									archiving = false;
								};
							}}
						>
							<DropdownMenu.Item>
								<button type="submit" disabled={archiving} class="flex w-full items-center gap-2">
									<Archive class="h-4 w-4" />
									{archiving ? 'Archivage...' : 'Archiver'}
								</button>
							</DropdownMenu.Item>
						</form>
					{/if}
					{#if worksheet.status === 'archived'}
						<form
							method="POST"
							action="?/unarchive"
							use:enhance={() => {
								unarchiving = true;
								return async ({ result, update }) => {
									await update();
									if (result.type === 'success') {
										await invalidateAll();
									}
									unarchiving = false;
								};
							}}
						>
							<DropdownMenu.Item>
								<button type="submit" disabled={unarchiving} class="flex w-full items-center gap-2">
									<RotateCcw class="h-4 w-4" />
									{unarchiving ? 'Restauration...' : 'Restaurer en brouillon'}
								</button>
							</DropdownMenu.Item>
						</form>
					{/if}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	<!-- Content -->
	<div class="space-y-6">
		<!-- Description -->
		{#if worksheet.description}
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">Description</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="whitespace-pre-wrap">{worksheet.description}</p>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Metadata grid -->
		<div class="grid gap-4 md:grid-cols-2">
			<!-- Left column -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">Informations</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<!-- Duration -->
					<div class="flex items-center gap-3">
						<Clock class="h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-sm text-muted-foreground">Duree estimee</p>
							<p class="font-medium">{formatDuration(worksheet.estimated_duration_minutes)}</p>
						</div>
					</div>

					<Separator />

					<!-- Grade levels -->
					<div class="flex items-start gap-3">
						<GraduationCap class="mt-0.5 h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-sm text-muted-foreground">Niveaux scolaires</p>
							{#if worksheet.grade_levels && worksheet.grade_levels.length > 0}
								<div class="mt-1 flex flex-wrap gap-1">
									{#each worksheet.grade_levels as grade, i (i)}
										<Badge variant="outline">
											{formatGradeShort(grade as unknown as GradeCode)}
										</Badge>
									{/each}
								</div>
							{:else}
								<p class="font-medium">-</p>
							{/if}
						</div>
					</div>

					<Separator />

					<!-- Tags -->
					<div class="flex items-start gap-3">
						<Tag class="mt-0.5 h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-sm text-muted-foreground">Tags</p>
							{#if worksheet.tags && worksheet.tags.length > 0}
								<div class="mt-1 flex flex-wrap gap-1">
									{#each worksheet.tags as tag (tag)}
										<Badge variant="secondary">{tag}</Badge>
									{/each}
								</div>
							{:else}
								<p class="font-medium">-</p>
							{/if}
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Right column -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">Statistiques</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<!-- Points total -->
					<div class="flex items-center gap-3">
						<ListOrdered class="h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-sm text-muted-foreground">Points total</p>
							<p class="font-medium">{worksheet.total_points ?? 0} points</p>
						</div>
					</div>

					<Separator />

					<!-- Exercises count -->
					<div class="flex items-center gap-3">
						<FileText class="h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-sm text-muted-foreground">Exercices</p>
							<p class="font-medium">{worksheet.exercises?.length ?? 0} exercice(s)</p>
						</div>
					</div>

					<Separator />

					<!-- Dates -->
					<div class="flex items-center gap-3">
						<Calendar class="h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-sm text-muted-foreground">Cree le</p>
							<p class="font-medium">{formatDate(worksheet.created_at)}</p>
						</div>
					</div>

					{#if worksheet.published_at}
						<div class="ml-7 flex items-center gap-3">
							<div>
								<p class="text-sm text-muted-foreground">Publie le</p>
								<p class="font-medium">{formatDate(worksheet.published_at)}</p>
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Main content tabs -->
		<Tabs.Root
			value="exercises"
			class="mt-6"
			onValueChange={(value) => {
				if (value === 'assignments') {
					loadAssignments();
					loadClasses();
				}
			}}
		>
			<Tabs.List class="grid w-full grid-cols-3">
				<Tabs.Trigger value="exercises">
					<FileText class="mr-2 h-4 w-4" />
					Exercices
				</Tabs.Trigger>
				<Tabs.Trigger value="assignments" disabled={worksheet.status === 'draft'}>
					<Users class="mr-2 h-4 w-4" />
					Devoirs
				</Tabs.Trigger>
				<Tabs.Trigger value="pdf">
					<FileDown class="mr-2 h-4 w-4" />
					PDF
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Exercises Tab -->
			<Tabs.Content value="exercises" class="space-y-6">
				<!-- Sections management (only for draft worksheets) -->
				{#if isDraft}
					<SectionManager
						worksheetId={worksheet.id}
						sections={worksheet.sections ?? []}
						readonly={!isDraft}
						onSectionsChange={handleSectionsChange}
					/>
				{/if}

				<!-- Exercise list with drag-and-drop -->
				<div class="space-y-4">
					{#if isDraft}
						<div class="flex justify-end">
							{#if addingExercises}
								<Button variant="outline" disabled>
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Ajout en cours...
								</Button>
							{:else}
								<ExerciseSelector
									bind:open={exerciseSelectorOpen}
									onSelect={handleAddExercises}
									selectedIds={existingExerciseIds}
								/>
							{/if}
						</div>
					{/if}

					<ExerciseList
						worksheetId={worksheet.id}
						exercises={worksheet.exercises ?? []}
						sections={worksheet.sections ?? []}
						readonly={!isDraft}
						onExercisesChange={handleExercisesChange}
						onEditExercise={handleEditExercise}
					/>
				</div>
			</Tabs.Content>

			<!-- Assignments Tab -->
			<Tabs.Content value="assignments" class="space-y-6">
				{#if worksheet.status === 'draft'}
					<Card.Root>
						<Card.Content class="py-8 text-center">
							<p class="text-muted-foreground">
								Publiez la feuille de travail pour pouvoir creer des devoirs.
							</p>
						</Card.Content>
					</Card.Root>
				{:else if showAssignmentForm}
					<WorksheetAssignmentForm
						worksheetId={worksheet.id}
						worksheetTitle={worksheet.title}
						{classes}
						onSubmit={handleCreateAssignment}
						onCancel={() => (showAssignmentForm = false)}
					/>
				{:else if selectedAssignment}
					<!-- Correction Manager for selected assignment -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<h3 class="text-lg font-medium">
									{selectedAssignment.title || worksheet.title}
								</h3>
								<p class="text-sm text-muted-foreground">
									Classe: {(selectedAssignment as { class?: { name?: string } }).class?.name ||
										'N/A'}
								</p>
							</div>
							<Button variant="outline" onclick={() => (selectedAssignment = null)}>
								<ArrowLeft class="mr-2 h-4 w-4" />
								Retour a la liste
							</Button>
						</div>
						<CorrectionManager
							assignment={selectedAssignment}
							correctionStatus={selectedAssignment.correctionStatus as {
								mode: 'manual' | 'immediate' | 'scheduled' | 'after_due';
								isReleased: boolean;
								releaseAt: string | null;
								studentsWithAccess: number;
								totalStudents: number;
							} | null}
							worksheetId={worksheet.id}
							onUpdate={handleAssignmentUpdate}
						/>
					</div>
				{:else}
					<!-- Assignments List -->
					<div class="space-y-4">
						<div class="flex justify-end">
							<Button onclick={() => (showAssignmentForm = true)}>
								<Plus class="mr-2 h-4 w-4" />
								Nouveau devoir
							</Button>
						</div>

						{#if assignmentsLoading}
							<Card.Root>
								<Card.Content class="py-8 text-center">
									<Loader2 class="mx-auto h-6 w-6 animate-spin" />
									<p class="mt-2 text-sm text-muted-foreground">Chargement des devoirs...</p>
								</Card.Content>
							</Card.Root>
						{:else if assignments.length === 0}
							<Card.Root>
								<Card.Content class="py-8 text-center">
									<Users class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
									<p class="text-muted-foreground">Aucun devoir cree pour cette feuille.</p>
									<p class="mt-1 text-sm text-muted-foreground">
										Cliquez sur "Nouveau devoir" pour assigner cette feuille a une classe.
									</p>
								</Card.Content>
							</Card.Root>
						{:else}
							<div class="grid gap-4">
								{#each assignments as assignment (assignment.id)}
									<Card.Root
										class="cursor-pointer transition-colors hover:bg-muted/50"
										onclick={() => (selectedAssignment = assignment)}
									>
										<Card.Content class="p-4">
											<div class="flex items-center justify-between">
												<div class="space-y-1">
													<div class="flex items-center gap-2">
														<h4 class="font-medium">
															{assignment.title || worksheet.title}
														</h4>
														<Badge
															variant={assignment.status === 'active' ? 'default' : 'secondary'}
														>
															{ASSIGNMENT_STATUS_LABELS[assignment.status] || assignment.status}
														</Badge>
													</div>
													<p class="text-sm text-muted-foreground">
														Classe: {(assignment as { class?: { name?: string } }).class?.name ||
															'N/A'}
													</p>
													{#if assignment.due_at}
														<p class="text-xs text-muted-foreground">
															Date limite: {new Date(assignment.due_at).toLocaleDateString('fr-FR')}
														</p>
													{/if}
												</div>
												<div class="text-right text-sm text-muted-foreground">
													<p>Mode correction:</p>
													<Badge variant="outline">
														{assignment.correction_release_mode === 'manual'
															? 'Manuel'
															: assignment.correction_release_mode === 'immediate'
																? 'Immediat'
																: assignment.correction_release_mode === 'scheduled'
																	? 'Programme'
																	: 'Apres date limite'}
													</Badge>
												</div>
											</div>
										</Card.Content>
									</Card.Root>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</Tabs.Content>

			<!-- PDF Tab -->
			<Tabs.Content value="pdf" class="space-y-6">
				<PdfPreview {worksheet} />
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>

<!-- Exercise configuration modal -->
<ExerciseConfigModal
	bind:open={configModalOpen}
	exercise={selectedExercise}
	worksheetId={worksheet.id}
	sections={worksheet.sections ?? []}
	onSave={handleExerciseSave}
/>
