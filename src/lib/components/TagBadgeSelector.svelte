<!--
	TagBadgeSelector Component
	==========================

	A badge-based tag selector that displays selected tags as badges
	with a modal for selecting existing tags or creating new ones.

	Features:
	- Selected tags displayed as badges with X on hover to remove
	- Modal with all existing tags sorted alphabetically
	- Text input to create new tags (saved to database)
	- Loading states for API calls

	Usage:
	```svelte
	<script lang="ts">
	  import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';

	  let selectedTags = $state<string[]>(['algèbre', 'équations']);
	</script>

	<TagBadgeSelector bind:value={selectedTags} />
	```
-->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { X, Plus, Loader2 } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Types
	interface Tag {
		id: string;
		name: string;
		created_by: string | null;
		created_at: string;
	}

	// Props interface
	interface Props {
		value: string[];
		placeholder?: string;
		disabled?: boolean;
		maxSelections?: number;
	}

	let {
		value = $bindable([]),
		placeholder = 'Ajouter des tags',
		disabled = false,
		maxSelections
	}: Props = $props();

	// State
	let isModalOpen = $state(false);
	let pendingSelection = $state<string[]>([]);
	let availableTags = $state<Tag[]>([]);
	let newTagName = $state('');
	let isLoading = $state(false);
	let isCreating = $state(false);
	let loadError = $state<string | null>(null);

	// Derived: Can add more selections
	let canAddMore = $derived(maxSelections === undefined || value.length < maxSelections);

	// Derived: Filtered tags based on search
	let filteredTags = $derived.by(() => {
		const search = newTagName.toLowerCase().trim();
		if (!search) return availableTags;
		return availableTags.filter((tag) => tag.name.toLowerCase().includes(search));
	});

	// Derived: Check if entered tag already exists
	let tagAlreadyExists = $derived.by(() => {
		const search = newTagName.toLowerCase().trim();
		if (!search) return false;
		return availableTags.some((tag) => tag.name.toLowerCase() === search);
	});

	// Derived: Can create new tag
	let canCreateTag = $derived.by(() => {
		const trimmed = newTagName.trim();
		return trimmed.length > 0 && trimmed.length <= 50 && !tagAlreadyExists && !isCreating;
	});

	/**
	 * Fetch available tags from API
	 */
	async function fetchTags(): Promise<void> {
		isLoading = true;
		loadError = null;

		try {
			const response = await fetch('/api/tags');
			if (!response.ok) {
				throw new Error('Failed to fetch tags');
			}
			const data = await response.json();
			availableTags = data.tags;
		} catch (err) {
			console.error('Error fetching tags:', err);
			loadError = 'Impossible de charger les tags';
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Create a new tag via API
	 */
	async function createTag(): Promise<void> {
		const trimmedName = newTagName.trim();
		if (!trimmedName || tagAlreadyExists || isCreating) return;

		isCreating = true;

		try {
			const response = await fetch('/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: trimmedName })
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to create tag');
			}

			const newTag: Tag = await response.json();

			// Add to available tags and sort
			availableTags = [...availableTags, newTag].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

			// Add to pending selection
			if (!pendingSelection.includes(newTag.name)) {
				if (maxSelections === undefined || pendingSelection.length < maxSelections) {
					pendingSelection = [...pendingSelection, newTag.name];
				}
			}

			// Clear input
			newTagName = '';

			toaster.success(`Tag "${newTag.name}" cree`);
		} catch (err) {
			console.error('Error creating tag:', err);
			toaster.error('Impossible de creer le tag');
		} finally {
			isCreating = false;
		}
	}

	/**
	 * Remove a tag from selection
	 */
	function removeTag(tag: string): void {
		if (disabled) return;
		value = value.filter((t) => t !== tag);
	}

	/**
	 * Open modal and initialize state
	 */
	function openModal(): void {
		if (disabled) return;
		pendingSelection = [...value];
		newTagName = '';
		isModalOpen = true;
		fetchTags();
	}

	/**
	 * Toggle a tag in pending selection
	 */
	function toggleTag(tagName: string): void {
		const isSelected = pendingSelection.includes(tagName);

		if (isSelected) {
			pendingSelection = pendingSelection.filter((t) => t !== tagName);
		} else {
			if (maxSelections !== undefined && pendingSelection.length >= maxSelections) {
				return;
			}
			pendingSelection = [...pendingSelection, tagName];
		}
	}

	/**
	 * Confirm selection and close modal
	 */
	function confirmSelection(): void {
		value = [...pendingSelection];
		isModalOpen = false;
	}

	/**
	 * Cancel and close modal
	 */
	function cancelSelection(): void {
		isModalOpen = false;
	}

	/**
	 * Handle modal open state change
	 */
	function handleOpenChange(open: boolean): void {
		if (!open) {
			cancelSelection();
		}
		isModalOpen = open;
	}

	/**
	 * Check if a tag is in pending selection
	 */
	function isTagSelected(tagName: string): boolean {
		return pendingSelection.includes(tagName);
	}

	/**
	 * Check if we can select more tags in modal
	 */
	let canSelectMoreInModal = $derived(
		maxSelections === undefined || pendingSelection.length < maxSelections
	);

	/**
	 * Handle key press in input (Enter to create)
	 */
	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (canCreateTag) {
				createTag();
			} else if (tagAlreadyExists) {
				// If tag exists, toggle its selection
				const existingTag = availableTags.find(
					(t) => t.name.toLowerCase() === newTagName.toLowerCase().trim()
				);
				if (existingTag) {
					toggleTag(existingTag.name);
					newTagName = '';
				}
			}
		}
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<!-- Selected tag badges -->
	{#each value as tag (tag)}
		<Badge variant="secondary" class="group flex items-center gap-1 pr-1 transition-colors">
			<span>{tag}</span>
			<button
				type="button"
				onclick={() => removeTag(tag)}
				{disabled}
				class="ml-1 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 focus:opacity-100 disabled:cursor-not-allowed"
				aria-label="Supprimer {tag}"
			>
				<X class="h-3 w-3" />
			</button>
		</Badge>
	{/each}

	<!-- Add button -->
	{#if value.length === 0}
		<!-- Empty state: button with text -->
		<Button
			variant="outline"
			size="sm"
			onclick={openModal}
			disabled={disabled || !canAddMore}
			class="gap-1"
			aria-label={placeholder}
		>
			<Plus class="h-4 w-4" />
			<span>{placeholder}</span>
		</Button>
	{:else if canAddMore}
		<!-- Has selections: just the + button -->
		<Button
			variant="outline"
			size="icon"
			class="h-6 w-6"
			onclick={openModal}
			{disabled}
			aria-label="Ajouter un tag"
		>
			<Plus class="h-4 w-4" />
		</Button>
	{/if}
</div>

<!-- Selection Modal -->
<Dialog.Root open={isModalOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Selectionner les tags</Dialog.Title>
			{#if maxSelections !== undefined}
				<Dialog.Description>
					{pendingSelection.length} / {maxSelections} tags selectionnes
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<!-- New tag input -->
			<div class="space-y-2">
				<div class="flex gap-2">
					<Input
						type="text"
						bind:value={newTagName}
						onkeydown={handleKeydown}
						placeholder="Nouveau tag ou rechercher..."
						class="flex-1"
						maxlength={50}
						disabled={isCreating}
					/>
					<Button
						variant="outline"
						size="icon"
						onclick={createTag}
						disabled={!canCreateTag}
						aria-label="Creer le tag"
					>
						{#if isCreating}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							<Plus class="h-4 w-4" />
						{/if}
					</Button>
				</div>
				{#if newTagName.trim() && tagAlreadyExists}
					<p class="text-xs text-muted-foreground">
						Ce tag existe deja, cliquez pour le selectionner
					</p>
				{:else if newTagName.trim() && canCreateTag}
					<p class="text-xs text-muted-foreground">
						Appuyez sur Entree ou cliquez + pour creer ce tag
					</p>
				{/if}
			</div>

			<!-- Tags list -->
			{#if isLoading}
				<div class="flex items-center justify-center py-8">
					<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			{:else if loadError}
				<div class="py-4 text-center text-sm text-destructive">
					{loadError}
					<Button variant="link" size="sm" onclick={fetchTags} class="ml-2">Reessayer</Button>
				</div>
			{:else if filteredTags.length === 0}
				<div class="py-4 text-center text-sm text-muted-foreground">
					{#if newTagName.trim()}
						Aucun tag correspondant. Creez-en un nouveau!
					{:else}
						Aucun tag disponible. Creez le premier!
					{/if}
				</div>
			{:else}
				<div class="max-h-64 overflow-y-auto">
					<div class="flex flex-wrap gap-2">
						{#each filteredTags as tag (tag.id)}
							{@const selected = isTagSelected(tag.name)}
							{@const canSelect = selected || canSelectMoreInModal}
							<button
								type="button"
								onclick={() => toggleTag(tag.name)}
								disabled={!canSelect}
								class="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								aria-pressed={selected}
								aria-label="{selected ? 'Deselectionner' : 'Selectionner'} {tag.name}"
							>
								<Badge
									variant={selected ? 'default' : 'outline'}
									class="cursor-pointer transition-colors hover:bg-accent {selected
										? 'hover:bg-primary/90'
										: ''}"
								>
									{tag.name}
								</Badge>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer class="gap-2 sm:gap-0">
			<Button variant="outline" onclick={cancelSelection}>Annuler</Button>
			<Button onclick={confirmSelection}>Confirmer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
