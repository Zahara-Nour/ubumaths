<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import ExerciseSelector from '$lib/components/worksheets/ExerciseSelector.svelte';
	import SectionManager from '$lib/components/worksheets/SectionManager.svelte';
	import ExerciseList from '$lib/components/worksheets/ExerciseList.svelte';
	import ExerciseConfigModal from '$lib/components/worksheets/ExerciseConfigModal.svelte';
	import PdfPreview from '$lib/components/worksheets/PdfPreview.svelte';
	import CorrectionManager from '$lib/components/worksheets/CorrectionManager.svelte';
	import WorksheetAssignmentForm from '$lib/components/worksheets/WorksheetAssignmentForm.svelte';
	import MetadataCards from '$lib/components/worksheets/MetadataCards.svelte';
	import ErrorReportsPanel from '$lib/components/worksheets/teacher/ErrorReportsPanel.svelte';
	import {
		ArrowLeft,
		Send,
		Archive,
		RotateCcw,
		FileText,
		Loader2,
		FileDown,
		Users,
		Plus,
		FilePenLine,
		Pencil,
		UserPlus,
		AlertCircle
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import type {
		WorksheetWithRelations,
		WorksheetSectionRow,
		WorksheetExerciseWithExercise,
		WorksheetAssignmentWithRelations
	} from '$lib/types/worksheets';
	import {
		WORKSHEET_TYPE_ICONS,
		WORKSHEET_TYPE_LABELS,
		WORKSHEET_STATUS_VARIANTS,
		WORKSHEET_STATUS_LABELS,
		ASSIGNMENT_STATUS_LABELS
	} from '$lib/utils/worksheet-constants';
	import type { Exercise } from '$lib/exercises/types';
	import { DEFAULT_TEMPLATES } from '$lib/worksheets/default-templates';

	let { data }: { data: PageData } = $props();

	// Loading states
	let publishing = $state(false);
	let unpublishing = $state(false);
	let archiving = $state(false);
	let unarchiving = $state(false);
	let addingExercises = $state(false);

	// Exercise selector state
	let exerciseSelectorOpen = $state(false);

	// Exercise config modal state
	let configModalOpen = $state(false);
	let selectedExercise = $state<WorksheetExerciseWithExercise | null>(null);

	// Extended assignment type with multi-class support
	type AssignmentWithExtras = WorksheetAssignmentWithRelations & {
		correctionStatus?: unknown;
	};

	// Assignment state
	let assignments = $state<AssignmentWithExtras[]>([]);
	let assignmentsLoading = $state(false);
	let showAssignmentForm = $state(false);
	let editingAssignment = $state<AssignmentWithExtras | null>(null);
	let selectedAssignment = $state<AssignmentWithExtras | null>(null);
	let classes = $state<{ id: string; name: string }[]>([]);

	// Templates state - initialize with default templates
	let templates = $state<{ id: string; name: string; description: string | null }[]>(
		DEFAULT_TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: t.description }))
	);

	// Type-safe worksheet access with local state for updates
	let worksheetData = $state(data.worksheet as WorksheetWithRelations);

	// Pending changes for metadata editing (single source of truth for edits)
	let pendingChanges = $state<Partial<WorksheetWithRelations>>({});

	// Update local state when data changes (e.g., after invalidateAll)
	$effect(() => {
		worksheetData = data.worksheet as WorksheetWithRelations;
		pendingChanges = {}; // Reset pending changes when server data changes
	});

	// Effective worksheet = server data + pending changes (for display)
	let effectiveWorksheet = $derived.by(() => {
		const merged = { ...worksheetData, ...pendingChanges };
		// Deep merge config if both exist
		if (pendingChanges.config && worksheetData.config) {
			merged.config = { ...worksheetData.config, ...pendingChanges.config };
		}
		return merged as WorksheetWithRelations;
	});

	// Check if there are pending changes
	let hasPendingChanges = $derived(Object.keys(pendingChanges).length > 0);

	// Load templates on mount (needed for editing)
	onMount(() => {
		loadTemplates();
	});

	// Derived values
	let worksheet = $derived(worksheetData);
	let isDraft = $derived(worksheet.status === 'draft');

	// Get IDs of already added exercises
	let existingExerciseIds = $derived(worksheet.exercises?.map((e) => e.exercise_id) ?? []);

	/**
	 * Handle status change (publish/unpublish/archive/unarchive)
	 */
	type StatusAction = 'publish' | 'unpublish' | 'archive' | 'unarchive';

	async function handleStatusChange(action: StatusAction) {
		const actionConfig: Record<
			StatusAction,
			{
				status: 'published' | 'archived' | 'draft';
				setLoading: () => void;
				resetLoading: () => void;
				success: string;
				error: string;
			}
		> = {
			publish: {
				status: 'published',
				setLoading: () => (publishing = true),
				resetLoading: () => (publishing = false),
				success: 'Feuille publiee',
				error: 'Erreur lors de la publication'
			},
			unpublish: {
				status: 'draft',
				setLoading: () => (unpublishing = true),
				resetLoading: () => (unpublishing = false),
				success: 'Feuille depubliee',
				error: 'Erreur lors de la depublication'
			},
			archive: {
				status: 'archived',
				setLoading: () => (archiving = true),
				resetLoading: () => (archiving = false),
				success: 'Feuille archivee',
				error: "Erreur lors de l'archivage"
			},
			unarchive: {
				status: 'draft',
				setLoading: () => (unarchiving = true),
				resetLoading: () => (unarchiving = false),
				success: 'Feuille restauree en brouillon',
				error: 'Erreur lors de la restauration'
			}
		};

		const config = actionConfig[action];
		config.setLoading();

		try {
			const response = await fetch(`/api/worksheets/${worksheet.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: config.status })
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
				throw new Error(error.message || config.error);
			}

			toaster.success(config.success);
			await invalidateAll();
		} catch (error) {
			console.error('Status change error:', error);
			toaster.error(error instanceof Error ? error.message : config.error);
		} finally {
			config.resetLoading();
		}
	}

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
	 * Load available templates from database (includes seeded default templates)
	 */
	async function loadTemplates() {
		try {
			const response = await fetch('/api/worksheets/templates?include_public=true');
			const data = await response.json();
			if (response.ok && data.templates?.length > 0) {
				// Use templates from database (includes seeded default templates)
				templates = data.templates;
			}
			// If API returns empty, keep the initial default templates from state
		} catch (err) {
			console.error('Error loading templates:', err);
			// On error, keep the initial default templates from state
		}
	}

	/**
	 * Handle assignment form success (create or edit)
	 */
	async function handleAssignmentFormSuccess(): Promise<void> {
		showAssignmentForm = false;
		editingAssignment = null;
		await loadAssignments();
	}

	/**
	 * Handle edit assignment click
	 */
	function handleEditAssignment(assignment: AssignmentWithExtras, event: MouseEvent): void {
		event.stopPropagation();
		editingAssignment = assignment;
		showAssignmentForm = true;
	}

	/**
	 * Handle assignment update (refresh)
	 */
	async function handleAssignmentUpdate() {
		await loadAssignments();
	}

	/**
	 * Handle field change from MetadataCards (updates pending changes)
	 */
	function handleFieldChange(field: string, value: unknown) {
		pendingChanges = { ...pendingChanges, [field]: value };
	}

	/**
	 * Handle saving all pending changes to the server
	 */
	async function handleSaveChanges(): Promise<void> {
		if (!hasPendingChanges) return;

		const response = await fetch(`/api/worksheets/${worksheet.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(pendingChanges)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Erreur serveur' }));
			throw new Error(errorData.message || 'Erreur lors de la sauvegarde');
		}

		// Update local worksheet data with the response
		const { worksheet: updatedWorksheet } = await response.json();
		worksheetData = { ...worksheetData, ...updatedWorksheet };

		// Clear pending changes after successful save
		pendingChanges = {};

		toaster.success('Modifications enregistrees');
	}

	/**
	 * Cancel all pending changes
	 */
	function handleCancelChanges() {
		pendingChanges = {};
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
		<div class="flex gap-1">
			{#if worksheet.status === 'draft'}
				<Button
					variant="default"
					size="icon"
					disabled={publishing}
					onclick={() => handleStatusChange('publish')}
					title="Publier"
				>
					{#if publishing}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<Send class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
			{#if worksheet.status === 'published'}
				<Button
					variant="outline"
					size="icon"
					disabled={unpublishing}
					onclick={() => handleStatusChange('unpublish')}
					title="Repasser en brouillon"
				>
					{#if unpublishing}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<FilePenLine class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
			{#if worksheet.status !== 'archived'}
				<Button
					variant="outline"
					size="icon"
					disabled={archiving}
					onclick={() => handleStatusChange('archive')}
					title="Archiver"
				>
					{#if archiving}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<Archive class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
			{#if worksheet.status === 'archived'}
				<Button
					variant="outline"
					size="icon"
					disabled={unarchiving}
					onclick={() => handleStatusChange('unarchive')}
					title="Restaurer"
				>
					{#if unarchiving}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<RotateCcw class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
		</div>
	</div>

	<!-- Content -->
	<div class="space-y-6">
		<!-- Metadata with inline editing -->
		<MetadataCards
			worksheet={effectiveWorksheet}
			{templates}
			{hasPendingChanges}
			onFieldChange={isDraft ? handleFieldChange : undefined}
			onSave={isDraft ? handleSaveChanges : undefined}
			onCancel={isDraft ? handleCancelChanges : undefined}
		/>

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
			<Tabs.List class="grid w-full grid-cols-4">
				<Tabs.Trigger value="exercises">
					<FileText class="mr-2 h-4 w-4" />
					Exercices
				</Tabs.Trigger>
				<Tabs.Trigger value="assignments" disabled={worksheet.status === 'draft'}>
					<Users class="mr-2 h-4 w-4" />
					Assignations
				</Tabs.Trigger>
				<Tabs.Trigger value="reports" disabled={worksheet.status === 'draft'}>
					<AlertCircle class="mr-2 h-4 w-4" />
					Signalements
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
								Publiez la feuille pour pouvoir creer des assignations.
							</p>
						</Card.Content>
					</Card.Root>
				{:else if showAssignmentForm}
					<WorksheetAssignmentForm
						worksheetId={worksheet.id}
						worksheetTitle={worksheet.title}
						{classes}
						assignment={editingAssignment ?? undefined}
						onSuccess={handleAssignmentFormSuccess}
						onCancel={() => {
							showAssignmentForm = false;
							editingAssignment = null;
						}}
					/>
				{:else if selectedAssignment}
					<!-- Correction Manager for selected assignment -->
					{@const selectedClasses =
						selectedAssignment.classes ||
						(selectedAssignment.class ? [selectedAssignment.class] : [])}
					{@const selectedStudents = selectedAssignment.assigned_students || []}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<h3 class="text-lg font-medium">
									{selectedAssignment.title || worksheet.title}
								</h3>
								<div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
									<Users class="h-4 w-4" />
									{#if selectedClasses.length === 0}
										<span>Aucune classe</span>
									{:else if selectedClasses.length === 1}
										<span>{selectedClasses[0].name}</span>
									{:else}
										{#each selectedClasses as cls (cls.id)}
											<Badge variant="outline" class="text-xs">{cls.name}</Badge>
										{/each}
									{/if}
									{#if selectedStudents.length > 0}
										<span class="text-muted-foreground">
											+ {selectedStudents.length} eleve(s) individuel(s)
										</span>
									{/if}
								</div>
							</div>
							<div class="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={(e) => {
										if (selectedAssignment) {
											handleEditAssignment(selectedAssignment, e);
										}
									}}
								>
									<Pencil class="mr-2 h-4 w-4" />
									Modifier
								</Button>
								<Button variant="outline" onclick={() => (selectedAssignment = null)}>
									<ArrowLeft class="mr-2 h-4 w-4" />
									Retour
								</Button>
							</div>
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
								Nouvelle assignation
							</Button>
						</div>

						{#if assignmentsLoading}
							<Card.Root>
								<Card.Content class="py-8 text-center">
									<Loader2 class="mx-auto h-6 w-6 animate-spin" />
									<p class="mt-2 text-sm text-muted-foreground">Chargement des assignations...</p>
								</Card.Content>
							</Card.Root>
						{:else if assignments.length === 0}
							<Card.Root>
								<Card.Content class="py-8 text-center">
									<Users class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
									<p class="text-muted-foreground">Aucune assignation pour cette feuille.</p>
									<p class="mt-1 text-sm text-muted-foreground">
										Cliquez sur "Nouvelle assignation" pour distribuer cette feuille a une classe.
									</p>
								</Card.Content>
							</Card.Root>
						{:else}
							<div class="grid gap-4">
								{#each assignments as assignment (assignment.id)}
									{@const assignmentClasses =
										assignment.classes || (assignment.class ? [assignment.class] : [])}
									{@const assignedStudents = assignment.assigned_students || []}
									<Card.Root
										class="cursor-pointer transition-colors hover:bg-muted/50"
										onclick={() => (selectedAssignment = assignment)}
									>
										<Card.Content class="p-4">
											<div class="flex items-start justify-between gap-4">
												<div class="min-w-0 flex-1 space-y-2">
													<div class="flex items-center gap-2">
														<h4 class="truncate font-medium">
															{assignment.title || worksheet.title}
														</h4>
														<Badge
															variant={assignment.status === 'active' ? 'default' : 'secondary'}
														>
															{ASSIGNMENT_STATUS_LABELS[assignment.status] || assignment.status}
														</Badge>
													</div>

													<!-- Classes list -->
													<div class="flex flex-wrap items-center gap-1.5">
														<Users class="h-4 w-4 text-muted-foreground" />
														{#if assignmentClasses.length === 0}
															<span class="text-sm text-muted-foreground">Aucune classe</span>
														{:else if assignmentClasses.length === 1}
															<span class="text-sm text-muted-foreground">
																{assignmentClasses[0].name}
															</span>
														{:else}
															{#each assignmentClasses as cls (cls.id)}
																<Badge variant="outline" class="text-xs">
																	{cls.name}
																</Badge>
															{/each}
														{/if}
													</div>

													<!-- Individual students count -->
													{#if assignedStudents.length > 0}
														<div class="flex items-center gap-1.5">
															<UserPlus class="h-4 w-4 text-muted-foreground" />
															<span class="text-sm text-muted-foreground">
																{assignedStudents.length} eleve(s) individuel(s)
															</span>
														</div>
													{/if}

													{#if assignment.closes_at}
														<p class="text-xs text-muted-foreground">
															Visible jusqu'au: {new Date(assignment.closes_at).toLocaleDateString(
																'fr-FR'
															)}
														</p>
													{/if}
												</div>

												<!-- Right side: correction mode and action buttons -->
												<div class="flex flex-col items-end gap-2">
													<div class="text-right text-sm text-muted-foreground">
														<p class="text-xs">Mode correction:</p>
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
													<div class="flex gap-1">
														<Button
															variant="ghost"
															size="sm"
															href="/dashboard/teacher/worksheets/{worksheet.id}/assignments/{assignment.id}/reports"
															onclick={(e) => e.stopPropagation()}
															title="Voir les signalements"
														>
															<AlertCircle class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onclick={(e) => handleEditAssignment(assignment, e)}
															title="Modifier l'assignation"
														>
															<Pencil class="h-4 w-4" />
														</Button>
													</div>
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

			<!-- Reports Tab -->
			<Tabs.Content value="reports" class="space-y-6">
				{#if worksheet.status === 'draft'}
					<Card.Root>
						<Card.Content class="py-8 text-center">
							<p class="text-muted-foreground">
								Publiez la feuille pour pouvoir consulter les signalements.
							</p>
						</Card.Content>
					</Card.Root>
				{:else if selectedAssignment}
					<!-- Show reports for selected assignment -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h3 class="text-lg font-medium">
								Signalements: {selectedAssignment.title || worksheet.title}
							</h3>
							<Button variant="outline" onclick={() => (selectedAssignment = null)}>
								<ArrowLeft class="mr-2 h-4 w-4" />
								Retour aux assignations
							</Button>
						</div>
						<ErrorReportsPanel worksheetId={worksheet.id} assignmentId={selectedAssignment.id} />
					</div>
				{:else}
					<!-- No assignment selected, show message to select one -->
					<Card.Root>
						<Card.Content class="py-12 text-center">
							<AlertCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
							<p class="text-muted-foreground">
								Veuillez d'abord sélectionner une assignation dans l'onglet "Assignations" pour voir
								ses signalements.
							</p>
						</Card.Content>
					</Card.Root>
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
