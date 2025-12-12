<!--
	WorksheetAssignmentForm Component
	===================================

	Form for creating and editing worksheet assignments.
	Supports multi-class assignment and individual student selection.

	Features:
	- Multi-class selection with MySelect (type="multiple")
	- Individual student selection with MultiClassStudentSelector
	- Create and Edit modes
	- Availability dates configuration
	- Correction release settings
	- Online consultation mode

	Props:
	- worksheetId: string
	- worksheetTitle: string
	- classes: Array of class objects
	- assignment?: existing assignment for edit mode
	- onSuccess?: callback after success
	- onCancel?: callback for cancel
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import CorrectionSettings from '$lib/components/worksheets/CorrectionSettings.svelte';
	import MultiClassStudentSelector from '$lib/components/worksheets/MultiClassStudentSelector.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, Users, Calendar, FileCheck, Monitor } from 'lucide-svelte';
	import type {
		CorrectionReleaseMode,
		WorksheetAssignmentInsert,
		WorksheetAssignmentWithRelations
	} from '$lib/types/worksheets';

	// ============================================================================
	// TYPES
	// ============================================================================

	interface ClassOption {
		id: string;
		name: string;
	}

	// ============================================================================
	// PROPS
	// ============================================================================

	interface Props {
		worksheetId: string;
		worksheetTitle: string;
		classes: ClassOption[];
		assignment?: WorksheetAssignmentWithRelations;
		onSuccess?: () => void;
		onCancel?: () => void;
	}

	let { worksheetId, worksheetTitle, classes, assignment, onSuccess, onCancel }: Props = $props();

	// ============================================================================
	// DERIVED: Check if edit mode
	// ============================================================================

	let isEditMode = $derived(!!assignment);

	// ============================================================================
	// FORM STATE - Initialize from assignment if editing
	// ============================================================================

	let title = $state<string>(assignment?.title || '');
	let instructions = $state<string>(assignment?.instructions || '');
	let individualized = $state<boolean>(assignment?.individualized ?? true);

	// Multi-class selection - extract class IDs from assignment
	let selectedClassIds = $state<string[]>(
		assignment?.classes?.map((c) => c.id) || (assignment?.class_id ? [assignment.class_id] : [])
	);

	// Individual student selection - extract student IDs from assignment
	let selectedStudentIds = $state<string[]>(assignment?.assigned_students?.map((s) => s.id) || []);

	// Availability dates
	let availableFrom = $state<string>(
		assignment?.available_from
			? new Date(assignment.available_from).toISOString().slice(0, 16)
			: new Date().toISOString().slice(0, 16)
	);
	let closesAt = $state<string>(
		assignment?.closes_at ? new Date(assignment.closes_at).toISOString().slice(0, 16) : ''
	);

	// Correction settings
	let correctionReleaseMode = $state<CorrectionReleaseMode>(
		assignment?.correction_release_mode || 'manual'
	);
	let correctionScheduledDate = $state<string>(
		assignment?.correction_release_at
			? new Date(assignment.correction_release_at).toISOString().slice(0, 16)
			: ''
	);

	// Online consultation mode
	let showCorrections = $state<boolean>(assignment?.show_corrections ?? false);

	// Loading state
	let isSubmitting = $state(false);

	// ============================================================================
	// DERIVED VALUES
	// ============================================================================

	// Class options for multi-select
	let classItems = $derived(
		classes.map((c) => ({
			value: c.id,
			label: c.name
		}))
	);

	// Validation: at least one class or one student must be selected
	let isValid = $derived(
		(selectedClassIds.length > 0 || selectedStudentIds.length > 0) &&
			(correctionReleaseMode !== 'scheduled' || correctionScheduledDate !== '')
	);

	// ============================================================================
	// HANDLERS
	// ============================================================================

	async function handleSubmit(): Promise<void> {
		if (!isValid || isSubmitting) return;

		isSubmitting = true;

		try {
			if (isEditMode && assignment) {
				// PATCH existing assignment
				await updateAssignment();
			} else {
				// POST new assignment
				await createAssignment();
			}

			toaster.success(isEditMode ? 'Assignation mise a jour' : 'Assignation creee avec succes');
			onSuccess?.();
		} catch (err) {
			console.error('Error saving assignment:', err);
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
		} finally {
			isSubmitting = false;
		}
	}

	async function createAssignment(): Promise<void> {
		const assignmentData: WorksheetAssignmentInsert = {
			worksheet_id: worksheetId,
			class_ids: selectedClassIds,
			student_ids: selectedStudentIds,
			title: title || null,
			instructions: instructions || null,
			individualized,
			available_from: availableFrom ? new Date(availableFrom).toISOString() : undefined,
			closes_at: closesAt ? new Date(closesAt).toISOString() : null,
			correction_release_mode: correctionReleaseMode,
			correction_release_at:
				correctionReleaseMode === 'scheduled' && correctionScheduledDate
					? new Date(correctionScheduledDate).toISOString()
					: null,
			show_corrections: showCorrections,
			status: 'active',
			created_by: '' // Will be set by the API
		};

		const response = await fetch(`/api/worksheets/${worksheetId}/assignments`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(assignmentData)
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || "Erreur lors de la creation de l'assignation");
		}
	}

	async function updateAssignment(): Promise<void> {
		if (!assignment) return;

		const updateData = {
			class_ids: selectedClassIds,
			student_ids: selectedStudentIds,
			title: title || null,
			instructions: instructions || null,
			available_from: availableFrom ? new Date(availableFrom).toISOString() : undefined,
			closes_at: closesAt ? new Date(closesAt).toISOString() : null,
			correction_release_mode: correctionReleaseMode,
			correction_release_at:
				correctionReleaseMode === 'scheduled' && correctionScheduledDate
					? new Date(correctionScheduledDate).toISOString()
					: null,
			show_corrections: showCorrections
		};

		const response = await fetch(`/api/worksheets/assignments/${assignment.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updateData)
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || "Erreur lors de la mise a jour de l'assignation");
		}
	}
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Users class="h-5 w-5" />
				{isEditMode ? "Modifier l'assignation" : 'Assigner a des classes'}
			</Card.Title>
			<Card.Description>
				{isEditMode
					? `Modifier l'assignation de "${worksheetTitle}"`
					: `Assigner "${worksheetTitle}" a une ou plusieurs classes`}
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<!-- Multi-class selection -->
			<div class="space-y-2">
				<Label for="class-select">Classes *</Label>
				{#if classes.length === 0}
					<p class="text-sm text-muted-foreground">
						Aucune classe disponible. Creez d'abord une classe.
					</p>
				{:else}
					<MySelect
						type="multiple"
						bind:value={selectedClassIds}
						items={classItems}
						placeholder="Selectionnez une ou plusieurs classes"
					/>
					<p class="text-xs text-muted-foreground">
						{selectedClassIds.length} classe(s) selectionnee(s)
					</p>
				{/if}
			</div>

			<!-- Individual student selection -->
			<div class="space-y-2">
				<MultiClassStudentSelector
					classIds={selectedClassIds}
					bind:selectedStudentIds
					allTeacherClasses={classes}
					disabled={isSubmitting}
				/>
			</div>

			<!-- Validation message -->
			{#if selectedClassIds.length === 0 && selectedStudentIds.length === 0}
				<p class="text-sm text-destructive">Selectionnez au moins une classe ou un eleve.</p>
			{/if}

			<!-- Optional title override -->
			<div class="space-y-2">
				<Label for="title">Titre personnalise (optionnel)</Label>
				<Input
					id="title"
					bind:value={title}
					placeholder="Laissez vide pour utiliser le titre original"
				/>
			</div>

			<!-- Instructions -->
			<div class="space-y-2">
				<Label for="instructions">Instructions supplementaires</Label>
				<Textarea
					id="instructions"
					bind:value={instructions}
					placeholder="Instructions speciales pour les eleves..."
					rows={3}
				/>
			</div>

			<!-- Individualization (only for create mode) -->
			{#if !isEditMode}
				<div class="flex items-start space-x-3">
					<MyCheckbox id="individualized" bind:checked={individualized} />
					<div class="space-y-1">
						<Label for="individualized" class="cursor-pointer font-normal">
							Exercices individualises
						</Label>
						<p class="text-xs text-muted-foreground">
							Chaque eleve recevra une version personnalisee avec des valeurs differentes
						</p>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Calendar class="h-5 w-5" />
				Disponibilite
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Available from -->
				<div class="space-y-2">
					<Label for="available-from">Disponible a partir de</Label>
					<Input id="available-from" type="datetime-local" bind:value={availableFrom} />
				</div>

				<!-- Closes at -->
				<div class="space-y-2">
					<Label for="closes-at">Visible jusqu'au (optionnel)</Label>
					<Input id="closes-at" type="datetime-local" bind:value={closesAt} />
					<p class="text-xs text-muted-foreground">Laissez vide pour une visibilite indefinie</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<FileCheck class="h-5 w-5" />
				Publication des corrections
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<CorrectionSettings
				bind:releaseMode={correctionReleaseMode}
				bind:scheduledDate={correctionScheduledDate}
			/>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Monitor class="h-5 w-5" />
				Mode consultation en ligne
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-start space-x-3">
				<MyCheckbox id="show-corrections" bind:checked={showCorrections} />
				<div class="space-y-1">
					<Label for="show-corrections" class="cursor-pointer font-normal">
						Activer le mode consultation
					</Label>
					<p class="text-xs text-muted-foreground">
						Permet aux eleves de consulter la feuille directement en ligne sur leur tableau de bord.
					</p>
				</div>
			</div>

			{#if showCorrections}
				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950"
				>
					<p class="text-sm text-blue-800 dark:text-blue-200">
						{isEditMode
							? 'Vous pouvez gerer la visibilite des corrections pour chaque exercice depuis la page de gestion.'
							: "Une fois l'assignation creee, vous pourrez gerer la visibilite des corrections pour chaque exercice depuis la page de gestion."}
					</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Form actions -->
	<div class="flex justify-end gap-4">
		{#if onCancel}
			<Button variant="outline" onclick={onCancel} disabled={isSubmitting}>Annuler</Button>
		{/if}
		<Button onclick={handleSubmit} disabled={!isValid || isSubmitting}>
			{#if isSubmitting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{isEditMode ? 'Mise a jour...' : 'Creation...'}
			{:else}
				{isEditMode ? "Mettre a jour l'assignation" : "Creer l'assignation"}
			{/if}
		</Button>
	</div>
</div>
