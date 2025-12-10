<!--
	ChecklistEditor Component
	=========================

	Editor for managing checklist items.
	Allows adding, editing, deleting, and reordering items.

	@module components/cours/teacher/ChecklistEditor
-->
<script lang="ts">
	import type { ChapterChecklistItem } from '$lib/types/chapters';
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

	// Types for inputs
	interface CreateChecklistItemInput {
		content: string;
		description: string | null;
	}

	interface UpdateChecklistItemInput {
		content?: string;
		description?: string | null;
	}

	// Props
	interface Props {
		items: ChapterChecklistItem[];
		chapterId: string;
		onAdd: (data: CreateChecklistItemInput) => void;
		onUpdate: (itemId: string, data: UpdateChecklistItemInput) => void;
		onDelete: (itemId: string) => void;
		onReorder: (orderUpdates: { id: string; displayOrder: number }[]) => void;
	}

	let { items, chapterId: _chapterId, onAdd, onUpdate, onDelete, onReorder }: Props = $props();

	// Local state
	let newContent = $state('');
	let newDescription = $state('');
	let editingId = $state<string | null>(null);
	let editContent = $state('');
	let editDescription = $state('');
	let isAdding = $state(false);

	// Sort items by display order
	const sortedItems = $derived([...items].sort((a, b) => a.displayOrder - b.displayOrder));

	// Add new item
	function handleAdd() {
		if (!newContent.trim()) return;

		onAdd({
			content: newContent.trim(),
			description: newDescription.trim() || null
		});

		// Reset form
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

	// Save edit
	function saveEdit() {
		if (!editingId || !editContent.trim()) return;

		onUpdate(editingId, {
			content: editContent.trim(),
			description: editDescription.trim() || null
		});

		cancelEdit();
	}

	// Delete item
	function handleDelete(itemId: string) {
		if (confirm('Supprimer cet objectif ?')) {
			onDelete(itemId);
		}
	}

	// Move item up
	function moveUp(index: number) {
		if (index <= 0) return;

		const newItems = [...sortedItems];
		const temp = newItems[index - 1];
		newItems[index - 1] = newItems[index];
		newItems[index] = temp;

		// Calculate new order updates
		const orderUpdates = newItems.map((item, i) => ({
			id: item.id,
			displayOrder: i
		}));

		onReorder(orderUpdates);
	}

	// Move item down
	function moveDown(index: number) {
		if (index >= sortedItems.length - 1) return;

		const newItems = [...sortedItems];
		const temp = newItems[index + 1];
		newItems[index + 1] = newItems[index];
		newItems[index] = temp;

		// Calculate new order updates
		const orderUpdates = newItems.map((item, i) => ({
			id: item.id,
			displayOrder: i
		}));

		onReorder(orderUpdates);
	}
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
						<!-- Drag handle -->
						<div class="flex flex-col items-center gap-1 pt-1">
							<button
								type="button"
								class="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
								onclick={() => moveUp(index)}
								disabled={index === 0}
								aria-label="Monter"
							>
								<ChevronUp class="h-4 w-4" />
							</button>
							<GripVertical class="h-4 w-4 text-muted-foreground/50" />
							<button
								type="button"
								class="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
								onclick={() => moveDown(index)}
								disabled={index === sortedItems.length - 1}
								aria-label="Descendre"
							>
								<ChevronDown class="h-4 w-4" />
							</button>
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
								<!-- Edit actions -->
								<Button
									variant="ghost"
									size="icon-sm"
									onclick={saveEdit}
									disabled={!editContent.trim()}
								>
									<Check class="h-4 w-4 text-green-600" />
								</Button>
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
								<Button
									variant="ghost"
									size="icon-sm"
									onclick={() => handleDelete(item.id)}
									class="text-destructive opacity-0 transition-opacity group-hover:opacity-100"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Add new item form -->
		{#if isAdding}
			<div class="space-y-3 rounded-lg border-2 border-dashed border-primary/50 p-4">
				<div class="space-y-2">
					<Label for="new-content">Nouvel objectif</Label>
					<Input
						id="new-content"
						bind:value={newContent}
						placeholder="Ex: Savoir additionner deux fractions"
						autofocus
					/>
				</div>

				<div class="space-y-2">
					<Label for="new-description">Description (optionnel)</Label>
					<Textarea
						id="new-description"
						bind:value={newDescription}
						placeholder="Details supplementaires..."
						rows={2}
					/>
				</div>

				<div class="flex justify-end gap-2">
					<Button
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
					<Button size="sm" onclick={handleAdd} disabled={!newContent.trim()}>
						<Plus class="mr-1 h-4 w-4" />
						Ajouter
					</Button>
				</div>
			</div>
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
