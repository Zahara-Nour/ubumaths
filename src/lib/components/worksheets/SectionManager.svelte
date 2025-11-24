<!--
	SectionManager Component
	========================

	Manages worksheet sections: create, edit, delete, and reorder.

	Features:
	- Display list of sections with titles and instructions
	- Add new section with title and optional instructions
	- Edit section (inline)
	- Delete section (with confirmation)
	- Reorder sections (up/down buttons)

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
	import {
		Plus,
		Pencil,
		Trash2,
		ChevronUp,
		ChevronDown,
		GripVertical,
		Loader2,
		Save,
		X
	} from 'lucide-svelte';
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

	// Reorder state
	let reorderingId = $state<string | null>(null);

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
	 * Move section up or down
	 */
	async function moveSection(sectionId: string, direction: 'up' | 'down') {
		const currentIndex = sortedSections.findIndex((s) => s.id === sectionId);
		if (currentIndex === -1) return;

		const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
		if (targetIndex < 0 || targetIndex >= sortedSections.length) return;

		reorderingId = sectionId;

		try {
			// Swap positions
			const currentSection = sortedSections[currentIndex];
			const targetSection = sortedSections[targetIndex];

			const updates = [
				{ id: currentSection.id, position: targetSection.position },
				{ id: targetSection.id, position: currentSection.position }
			];

			// Update both sections
			for (const update of updates) {
				const response = await fetch(`/api/worksheets/${worksheetId}/sections/${update.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ position: update.position })
				});

				if (!response.ok) {
					throw new Error('Erreur lors du reordonnancement');
				}
			}

			// Update local state
			const newSections = sections.map((s) => {
				const update = updates.find((u) => u.id === s.id);
				return update ? { ...s, position: update.position } : s;
			});
			onSectionsChange?.(newSections);
		} catch (err) {
			console.error('Error reordering section:', err);
			toaster.error('Erreur lors du reordonnancement');
		} finally {
			reorderingId = null;
		}
	}
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between pb-3">
		<div>
			<Card.Title class="text-lg">Sections</Card.Title>
			<Card.Description>
				{sections.length} section(s)
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
			<div class="space-y-2">
				{#each sortedSections as section, index (section.id)}
					{@const isEditing = editingSectionId === section.id}
					{@const isReordering = reorderingId === section.id}

					<div
						class="group flex items-start gap-3 rounded-lg border p-3 transition-colors {isEditing
							? 'border-primary bg-primary/5'
							: 'hover:bg-muted/50'}"
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
								<!-- Move up -->
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7"
									onclick={() => moveSection(section.id, 'up')}
									disabled={index === 0 || isReordering}
									aria-label="Monter"
								>
									{#if isReordering}
										<Loader2 class="h-3 w-3 animate-spin" />
									{:else}
										<ChevronUp class="h-3 w-3" />
									{/if}
								</Button>

								<!-- Move down -->
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7"
									onclick={() => moveSection(section.id, 'down')}
									disabled={index === sortedSections.length - 1 || isReordering}
									aria-label="Descendre"
								>
									{#if isReordering}
										<Loader2 class="h-3 w-3 animate-spin" />
									{:else}
										<ChevronDown class="h-3 w-3" />
									{/if}
								</Button>

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
