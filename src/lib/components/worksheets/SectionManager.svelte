<!--
	SectionManager Component
	========================

	Manages worksheet sections: create, edit, delete, and reorder.

	Features:
	- Display list of sections with titles and instructions
	- Add new section with title and optional instructions
	- Edit section (inline)
	- Delete section (with confirmation)
	- Drag and drop to reorder sections (with optimistic UI)

	Usage:
	```svelte
	<SectionManager
		worksheetId={worksheet.id}
		sections={worksheet.sections}
		readonly={worksheet.status !== 'draft'}
		onSectionsChange={handleSectionsChange}
	/>
	```
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Plus, Pencil, Trash2, GripVertical, Loader2, Save, X } from 'lucide-svelte';
	import type { WorksheetSectionRow } from '$lib/types/worksheets';

	// Types
	interface Props {
		worksheetId: string;
		sections: WorksheetSectionRow[];
		readonly?: boolean;
		onSectionsChange?: (sections: WorksheetSectionRow[]) => void;
	}

	// Props
	let { worksheetId, sections = [], readonly = false, onSectionsChange }: Props = $props();

	// State
	let isAdding = $state(false);
	let isSubmitting = $state(false);
	let newSectionTitle = $state('');
	let newSectionInstructions = $state('');

	// Edit state
	let editingSectionId = $state<string | null>(null);
	let editTitle = $state('');
	let editInstructions = $state('');
	let isSavingEdit = $state(false);

	// Delete state
	let deletingSectionId = $state<string | null>(null);
	let deleteConfirmOpen = $state(false);
	let isDeleting = $state(false);

	// Drag state
	let draggedSection = $state<WorksheetSectionRow | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let isSaving = $state(false);

	// Derived
	let sortedSections = $derived([...sections].sort((a, b) => a.position - b.position));

	/**
	 * Open the add section form
	 */
	function openAddForm() {
		isAdding = true;
		newSectionTitle = '';
		newSectionInstructions = '';
	}

	/**
	 * Cancel adding new section
	 */
	function cancelAdd() {
		isAdding = false;
		newSectionTitle = '';
		newSectionInstructions = '';
	}

	/**
	 * Create a new section
	 */
	async function createSection() {
		if (!newSectionTitle.trim()) {
			toaster.error('Le titre est requis');
			return;
		}

		isSubmitting = true;

		try {
			const nextPosition =
				sections.length > 0 ? Math.max(...sections.map((s) => s.position)) + 1 : 1;

			const response = await fetch(`/api/worksheets/${worksheetId}/sections`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newSectionTitle.trim(),
					instructions: newSectionInstructions.trim() || null,
					position: nextPosition
				})
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la creation');
			}

			const data = await response.json();
			const newSections = [...sections, data.section];
			onSectionsChange?.(newSections);

			toaster.success('Section creee');
			cancelAdd();
		} catch (err) {
			console.error('Error creating section:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la creation');
		} finally {
			isSubmitting = false;
		}
	}

	/**
	 * Start editing a section
	 */
	function startEdit(section: WorksheetSectionRow) {
		editingSectionId = section.id;
		editTitle = section.title;
		editInstructions = section.instructions || '';
	}

	/**
	 * Cancel editing
	 */
	function cancelEdit() {
		editingSectionId = null;
		editTitle = '';
		editInstructions = '';
	}

	/**
	 * Save section edits
	 */
	async function saveEdit() {
		if (!editingSectionId || !editTitle.trim()) {
			toaster.error('Le titre est requis');
			return;
		}

		isSavingEdit = true;

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/sections/${editingSectionId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: editTitle.trim(),
					instructions: editInstructions.trim() || null
				})
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la mise a jour');
			}

			const data = await response.json();
			const newSections = sections.map((s) => (s.id === editingSectionId ? data.section : s));
			onSectionsChange?.(newSections);

			toaster.success('Section mise a jour');
			cancelEdit();
		} catch (err) {
			console.error('Error updating section:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la mise a jour');
		} finally {
			isSavingEdit = false;
		}
	}

	/**
	 * Open delete confirmation
	 */
	function confirmDelete(sectionId: string) {
		deletingSectionId = sectionId;
		deleteConfirmOpen = true;
	}

	/**
	 * Delete a section
	 */
	async function deleteSection() {
		if (!deletingSectionId) return;

		isDeleting = true;

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/sections/${deletingSectionId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la suppression');
			}

			const newSections = sections.filter((s) => s.id !== deletingSectionId);
			onSectionsChange?.(newSections);

			toaster.success('Section supprimee');
		} catch (err) {
			console.error('Error deleting section:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
		} finally {
			isDeleting = false;
			deletingSectionId = null;
			deleteConfirmOpen = false;
		}
	}

	/**
	 * Handle drag start
	 */
	function handleDragStart(e: DragEvent, section: WorksheetSectionRow) {
		if (readonly || isSaving || editingSectionId) {
			e.preventDefault();
			return;
		}
		draggedSection = section;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', section.id);
		}
	}

	/**
	 * Handle drag over a specific section position
	 */
	function handleDragOver(e: DragEvent, index: number) {
		if (readonly || !draggedSection) return;
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverIndex = index;
	}

	/**
	 * Handle drag over the container (for dropping at the end)
	 */
	function handleDragOverContainer(e: DragEvent) {
		if (readonly || !draggedSection) return;
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		// Only set to end if not over a specific item
		if (dragOverIndex === null) {
			dragOverIndex = sortedSections.length;
		}
	}

	/**
	 * Handle drop
	 */
	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (readonly || !draggedSection || dragOverIndex === null) {
			resetDragState();
			return;
		}

		const sourceIndex = sortedSections.findIndex((s) => s.id === draggedSection!.id);
		let targetIndex = dragOverIndex;

		// Check if anything changed
		if (targetIndex === sourceIndex || targetIndex === sourceIndex + 1) {
			resetDragState();
			return;
		}

		// Adjust target index if dropping after the source
		if (targetIndex > sourceIndex) {
			targetIndex = targetIndex - 1;
		}

		// Build new order
		const newOrder = [...sortedSections];
		const [removed] = newOrder.splice(sourceIndex, 1);
		newOrder.splice(targetIndex, 0, removed);

		// Build updates with normalized positions
		const updates: { id: string; position: number }[] = [];
		newOrder.forEach((section, idx) => {
			const newPosition = idx + 1;
			if (section.position !== newPosition) {
				updates.push({ id: section.id, position: newPosition });
			}
		});

		resetDragState();

		if (updates.length === 0) return;

		// Optimistic UI: apply changes immediately
		const previousSections = [...sections];
		const newSections = sections.map((s) => {
			const update = updates.find((u) => u.id === s.id);
			return update ? { ...s, position: update.position } : s;
		});
		onSectionsChange?.(newSections);

		// Save to server (rollback on error)
		await saveSectionOrder(updates, previousSections);
	}

	/**
	 * Save section order to server with rollback on error
	 */
	async function saveSectionOrder(
		updates: { id: string; position: number }[],
		previousSections: WorksheetSectionRow[]
	) {
		isSaving = true;

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/sections`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sections: updates })
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la sauvegarde');
			}
		} catch (err) {
			console.error('Error saving section order:', err);
			// Rollback to previous state
			onSectionsChange?.(previousSections);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Reset drag state
	 */
	function resetDragState() {
		draggedSection = null;
		dragOverIndex = null;
	}

	/**
	 * Handle drag end
	 */
	function handleDragEnd() {
		resetDragState();
	}
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between pb-3">
		<div>
			<Card.Title class="text-lg">Sections</Card.Title>
			<Card.Description>
				{sections.length} section(s)
				{#if isSaving}
					<span class="ml-2 inline-flex items-center text-primary">
						<Loader2 class="mr-1 h-3 w-3 animate-spin" />
						Sauvegarde...
					</span>
				{/if}
			</Card.Description>
		</div>
		{#if !readonly && !isAdding}
			<Button variant="outline" size="sm" onclick={openAddForm}>
				<Plus class="mr-2 h-4 w-4" />
				Ajouter une section
			</Button>
		{/if}
	</Card.Header>
	<Card.Content>
		<!-- Add new section form -->
		{#if isAdding}
			<div class="mb-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4">
				<h4 class="mb-3 font-medium">Nouvelle section</h4>
				<div class="space-y-3">
					<div class="space-y-2">
						<Label for="new-section-title">Titre *</Label>
						<Input
							id="new-section-title"
							bind:value={newSectionTitle}
							placeholder="Titre de la section"
						/>
					</div>
					<div class="space-y-2">
						<Label for="new-section-instructions">Instructions (optionnel)</Label>
						<Textarea
							id="new-section-instructions"
							bind:value={newSectionInstructions}
							placeholder="Instructions pour cette section..."
							rows={2}
						/>
					</div>
					<div class="flex justify-end gap-2">
						<Button variant="outline" size="sm" onclick={cancelAdd} disabled={isSubmitting}>
							Annuler
						</Button>
						<Button
							size="sm"
							onclick={createSection}
							disabled={isSubmitting || !newSectionTitle.trim()}
						>
							{#if isSubmitting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							Creer
						</Button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Sections list -->
		{#if sortedSections.length === 0}
			<div class="py-6 text-center text-muted-foreground">
				<p>Aucune section</p>
				{#if !readonly}
					<p class="mt-1 text-sm">Les exercices sans section apparaitront dans "Sans section"</p>
				{/if}
			</div>
		{:else}
			<div
				class="space-y-2"
				role="list"
				aria-label="Liste des sections"
				ondragover={handleDragOverContainer}
				ondrop={handleDrop}
			>
				{#each sortedSections as section, index (section.id)}
					{@const isEditing = editingSectionId === section.id}
					{@const isDragging = draggedSection?.id === section.id}
					{@const isDropBefore = dragOverIndex === index && !isDragging}

					<!-- Drop indicator before this item -->
					{#if isDropBefore}
						<div class="h-1 rounded bg-primary"></div>
					{/if}

					<div
						class="group flex items-start gap-3 rounded-lg border p-3 transition-all {isEditing
							? 'border-primary bg-primary/5'
							: 'hover:bg-muted/50'} {isDragging ? 'opacity-50' : ''} {!readonly &&
						!isEditing &&
						!isSaving
							? 'cursor-grab active:cursor-grabbing'
							: ''} {isSaving ? 'cursor-not-allowed opacity-70' : ''}"
						draggable={!readonly && !isEditing && !isSaving}
						role="listitem"
						aria-label="Section {section.title}"
						ondragstart={(e) => handleDragStart(e, section)}
						ondragend={handleDragEnd}
						ondragover={(e) => handleDragOver(e, index)}
					>
						<!-- Drag handle / position indicator -->
						<div class="flex flex-col items-center pt-1 text-muted-foreground">
							<GripVertical class="h-4 w-4" />
							<span class="mt-1 text-xs">{index + 1}</span>
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							{#if isEditing}
								<!-- Edit mode -->
								<div class="space-y-3">
									<div class="space-y-2">
										<Label for="edit-title-{section.id}">Titre</Label>
										<Input id="edit-title-{section.id}" bind:value={editTitle} />
									</div>
									<div class="space-y-2">
										<Label for="edit-instructions-{section.id}">Instructions</Label>
										<Textarea
											id="edit-instructions-{section.id}"
											bind:value={editInstructions}
											rows={2}
										/>
									</div>
									<div class="flex justify-end gap-2">
										<Button
											variant="outline"
											size="sm"
											onclick={cancelEdit}
											disabled={isSavingEdit}
										>
											<X class="mr-1 h-3 w-3" />
											Annuler
										</Button>
										<Button
											size="sm"
											onclick={saveEdit}
											disabled={isSavingEdit || !editTitle.trim()}
										>
											{#if isSavingEdit}
												<Loader2 class="mr-2 h-4 w-4 animate-spin" />
											{:else}
												<Save class="mr-1 h-3 w-3" />
											{/if}
											Enregistrer
										</Button>
									</div>
								</div>
							{:else}
								<!-- View mode -->
								<div>
									<h4 class="font-medium">{section.title}</h4>
									{#if section.instructions}
										<p class="mt-1 text-sm text-muted-foreground">{section.instructions}</p>
									{/if}
								</div>
							{/if}
						</div>

						<!-- Actions -->
						{#if !readonly && !isEditing}
							<div
								class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<!-- Edit -->
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7"
									onclick={() => startEdit(section)}
									aria-label="Modifier"
								>
									<Pencil class="h-3 w-3" />
								</Button>

								<!-- Delete -->
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
									onclick={() => confirmDelete(section.id)}
									aria-label="Supprimer"
								>
									<Trash2 class="h-3 w-3" />
								</Button>
							</div>
						{/if}
					</div>
				{/each}

				<!-- Drop indicator at end -->
				{#if dragOverIndex === sortedSections.length && draggedSection}
					<div class="h-1 rounded bg-primary"></div>
				{/if}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<!-- Delete confirmation dialog -->
<ConfirmDialog
	bind:open={deleteConfirmOpen}
	title="Supprimer la section"
	description="Cette action est irreversible. Les exercices de cette section seront deplaces vers 'Sans section'."
	confirmLabel={isDeleting ? 'Suppression...' : 'Supprimer'}
	onConfirm={deleteSection}
	onCancel={() => (deletingSectionId = null)}
/>
