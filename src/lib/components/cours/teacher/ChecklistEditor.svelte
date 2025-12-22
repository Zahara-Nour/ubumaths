<!--
	ChecklistEditor Component
	=========================

	Editor for managing checklist items.
	Allows adding, editing, deleting, and reordering items.

	@module components/cours/teacher/ChecklistEditor
-->
<script lang="ts">
	import type { ChapterChecklistItem } from '$lib/types/chapters';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';
	import {
		Plus,
		Trash2,
		GripVertical,
		Pencil,
		Check,
		X,
		ChevronUp,
		ChevronDown,
		Target
	} from 'lucide-svelte';

	// Props - callbacks are now optional (using form actions instead)
	interface Props {
		items: ChapterChecklistItem[];
		chapterId: string;
	}

	let { items, chapterId }: Props = $props();

	// Local state
	let newContent = $state('');
	let newDescription = $state('');
	let editingId = $state<string | null>(null);
	let editContent = $state('');
	let editDescription = $state('');
	let isAdding = $state(false);

	// Sort items by display order
	const sortedItems = $derived([...items].sort((a, b) => a.displayOrder - b.displayOrder));

	// Form refs for programmatic submission
	let _addFormRef: HTMLFormElement | null = $state(null);
	let _updateFormRef: HTMLFormElement | null = $state(null);

	// Add new item - now handled by form action
	function handleAddSuccess() {
		// Reset form after successful submission
		newContent = '';
		newDescription = '';
		isAdding = false;
	}

	// Start editing an item
	function startEdit(item: ChapterChecklistItem) {
		editingId = item.id;
		editContent = item.content;
		editDescription = item.description ?? '';
	}

	// Cancel editing
	function cancelEdit() {
		editingId = null;
		editContent = '';
		editDescription = '';
	}

	// Save edit - now handled via form action
	function handleEditSuccess() {
		cancelEdit();
	}

	// Form submission state
	let isSubmitting = $state(false);

	// Move item up - form action
	let _moveUpFormRef: HTMLFormElement | null = $state(null);

	// Move item down - form action
	let _moveDownFormRef: HTMLFormElement | null = $state(null);
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Target class="h-5 w-5 text-primary" />
				<Card.Title>Objectifs du chapitre</Card.Title>
			</div>
			<span class="text-sm text-muted-foreground">
				{items.length} objectif{items.length > 1 ? 's' : ''}
			</span>
		</div>
		<Card.Description>Definissez les objectifs que les eleves doivent atteindre.</Card.Description>
	</Card.Header>

	<Card.Content class="space-y-4">
		<!-- Existing items list -->
		{#if sortedItems.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground">
				Aucun objectif. Ajoutez-en un ci-dessous.
			</p>
		{:else}
			<ul class="space-y-2">
				{#each sortedItems as item, index (item.id)}
					<li
						class={cn(
							'group flex items-start gap-2 rounded-lg border bg-card p-3 transition-all',
							editingId === item.id && 'ring-2 ring-primary'
						)}
					>
						<!-- Drag handle with form actions for reordering -->
						<div class="flex flex-col items-center gap-1 pt-1">
							<form method="POST" action="?/reorderChecklistItem" use:enhance>
								<input type="hidden" name="itemId" value={item.id} />
								<input type="hidden" name="direction" value="up" />
								<button
									type="submit"
									class="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
									disabled={index === 0}
									aria-label="Monter"
								>
									<ChevronUp class="h-4 w-4" />
								</button>
							</form>
							<GripVertical class="h-4 w-4 text-muted-foreground/50" />
							<form method="POST" action="?/reorderChecklistItem" use:enhance>
								<input type="hidden" name="itemId" value={item.id} />
								<input type="hidden" name="direction" value="down" />
								<button
									type="submit"
									class="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
									disabled={index === sortedItems.length - 1}
									aria-label="Descendre"
								>
									<ChevronDown class="h-4 w-4" />
								</button>
							</form>
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							{#if editingId === item.id}
								<!-- Edit mode -->
								<div class="space-y-2">
									<Input
										bind:value={editContent}
										placeholder="Contenu de l'objectif"
										class="text-sm"
									/>
									<Textarea
										bind:value={editDescription}
										placeholder="Description (optionnel)"
										rows={2}
										class="text-sm"
									/>
								</div>
							{:else}
								<!-- Display mode -->
								<p class="text-sm font-medium">{item.content}</p>
								{#if item.description}
									<p class="mt-1 text-xs text-muted-foreground">
										{item.description}
									</p>
								{/if}
							{/if}
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-1">
							{#if editingId === item.id}
								<!-- Edit actions - form for update -->
								<form
									method="POST"
									action="?/updateChecklistItem"
									use:enhance={() => {
										isSubmitting = true;
										return async ({ update }) => {
											isSubmitting = false;
											handleEditSuccess();
											await update();
										};
									}}
								>
									<input type="hidden" name="itemId" value={item.id} />
									<input type="hidden" name="content" value={editContent} />
									<input type="hidden" name="description" value={editDescription} />
									<Button
										type="submit"
										variant="ghost"
										size="icon-sm"
										disabled={!editContent.trim() || isSubmitting}
									>
										<Check class="h-4 w-4 text-green-600" />
									</Button>
								</form>
								<Button variant="ghost" size="icon-sm" onclick={cancelEdit}>
									<X class="h-4 w-4 text-red-600" />
								</Button>
							{:else}
								<!-- Normal actions -->
								<Button
									variant="ghost"
									size="icon-sm"
									onclick={() => startEdit(item)}
									class="opacity-0 transition-opacity group-hover:opacity-100"
								>
									<Pencil class="h-4 w-4" />
								</Button>
								<form method="POST" action="?/deleteChecklistItem" use:enhance>
									<input type="hidden" name="itemId" value={item.id} />
									<Button
										type="submit"
										variant="ghost"
										size="icon-sm"
										class="text-destructive opacity-0 transition-opacity group-hover:opacity-100"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</form>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Add new item form -->
		{#if isAdding}
			<form
				method="POST"
				action="?/addChecklistItem"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						handleAddSuccess();
						await update();
					};
				}}
				class="space-y-3 rounded-lg border-2 border-dashed border-primary/50 p-4"
			>
				<input type="hidden" name="chapterId" value={chapterId} />

				<div class="space-y-2">
					<Label for="new-content">Nouvel objectif</Label>
					<Input
						id="new-content"
						name="content"
						bind:value={newContent}
						placeholder="Ex: Savoir additionner deux fractions"
						autofocus
					/>
				</div>

				<div class="space-y-2">
					<Label for="new-description">Description (optionnel)</Label>
					<Textarea
						id="new-description"
						name="description"
						bind:value={newDescription}
						placeholder="Details supplementaires..."
						rows={2}
					/>
				</div>

				<div class="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => {
							isAdding = false;
							newContent = '';
							newDescription = '';
						}}
					>
						Annuler
					</Button>
					<Button type="submit" size="sm" disabled={!newContent.trim() || isSubmitting}>
						<Plus class="mr-1 h-4 w-4" />
						Ajouter
					</Button>
				</div>
			</form>
		{:else}
			<Button
				variant="outline"
				class="w-full"
				onclick={() => {
					isAdding = true;
				}}
			>
				<Plus class="mr-2 h-4 w-4" />
				Ajouter un objectif
			</Button>
		{/if}
	</Card.Content>
</Card.Root>
