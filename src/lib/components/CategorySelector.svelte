<!--
  CategorySelector Component
  =========================

  A reusable dropdown component for selecting categories (theme, domain, subdomain)
  with the ability to add new categories on-the-fly via a modal dialog.

  Features:
  - Native HTML <select> element styled with Shadcn design
  - "Add new" option that opens a modal dialog
  - Duplicate prevention (checks if category already exists)
  - Keyboard support (Enter key to add category)
  - Bindable value for two-way binding

  Props:
  - label: Display label for the selector
  - value: Current selected value (bindable)
  - options: Array of available category options
  - placeholder: Placeholder text when no value selected
  - required: Whether the field is required (shows red asterisk)
  - onValueChange: Callback when value changes
  - onAddNew: Optional callback when a new category is added

  Usage:
    <CategorySelector
      label="Thème"
      bind:value={theme}
      options={themeOptions}
      required={true}
      onValueChange={(val) => (theme = val)}
      onAddNew={handleAddTheme}
    />
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Plus } from 'lucide-svelte';

	interface Props {
		label: string;
		value: string;
		options: string[];
		placeholder?: string;
		required?: boolean;
		onValueChange: (value: string) => void;
		onAddNew?: (newValue: string) => void;
	}

	let {
		label,
		value = $bindable(),
		options,
		placeholder = 'Sélectionner...',
		required = false,
		onValueChange,
		onAddNew
	}: Props = $props();

	let dialogOpen = $state(false);
	let newCategoryName = $state('');

	/**
	 * Handle select change event
	 * - If "__add_new__" option is selected, open modal dialog
	 * - Otherwise, update value and notify parent
	 */
	function handleSelectChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const selectedValue = target.value;

		if (selectedValue === '__add_new__') {
			dialogOpen = true;
			// Reset select to previous value to prevent showing "__add_new__" as selected
			target.value = value || '';
		} else {
			value = selectedValue;
			onValueChange(selectedValue);
		}
	}

	/**
	 * Handle adding a new category
	 * - Validates input (non-empty, no duplicates)
	 * - Calls parent's onAddNew handler to update options list
	 * - Sets new value as selected
	 * - Closes modal and resets input
	 */
	function handleAddCategory() {
		const trimmed = newCategoryName.trim();
		if (!trimmed) return;

		// Prevent duplicates
		if (options.includes(trimmed)) {
			return;
		}

		// Notify parent to update options array
		if (onAddNew) {
			onAddNew(trimmed);
		}

		// Select the newly added category
		value = trimmed;
		onValueChange(trimmed);

		// Close dialog and reset input
		dialogOpen = false;
		newCategoryName = '';
	}
</script>

<div class="space-y-2">
	<Label for={label}>
		{label}
		{#if required}
			<span class="text-destructive">*</span>
		{/if}
	</Label>

	<select
		id={label}
		bind:value
		onchange={handleSelectChange}
		class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
	>
		<option value="" disabled>{placeholder}</option>
		{#each options as option}
			<option value={option}>{option}</option>
		{/each}

		{#if onAddNew}
			<option value="__add_new__" class="text-primary">➕ Ajouter...</option>
		{/if}
	</select>
</div>

<!-- Add New Category Dialog -->
{#if onAddNew}
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content class="sm:max-w-[425px]">
			<Dialog.Header>
				<Dialog.Title>Ajouter une catégorie</Dialog.Title>
				<Dialog.Description>
					Ajoutez une nouvelle catégorie pour "{label}". Elle sera immédiatement disponible dans la
					liste.
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<div class="space-y-2">
					<Label for="new-category">Nom de la catégorie</Label>
					<Input
						id="new-category"
						bind:value={newCategoryName}
						placeholder="Ex: Algèbre, Géométrie..."
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								handleAddCategory();
							}
						}}
					/>
				</div>
			</div>

			<Dialog.Footer>
				<Button
					variant="outline"
					onclick={() => {
						dialogOpen = false;
						newCategoryName = '';
					}}
				>
					Annuler
				</Button>
				<Button onclick={handleAddCategory} disabled={!newCategoryName.trim()}>
					<Plus class="mr-2 h-4 w-4" />
					Ajouter
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
