<!--
  CategorySelector
  ================

  Liste déroulante d'une catégorie (thème, domaine, sous-domaine) construite sur
  MySelect, avec une entrée « ➕ Ajouter… » qui ouvre une fenêtre de saisie.

  - `options` : valeurs proposées (déjà filtrées par le parent)
  - `value` : valeur choisie (bindable) ; '' = aucune
  - `allowEmpty` : ajoute une entrée « Aucun » (champ facultatif)
  - `onAddNew` : appelé avec la nouvelle valeur ; la valeur est aussi sélectionnée
  - `addDisabledHint` : si renseigné, « Ajouter… » est désactivé et ce texte s'affiche
    sous la liste (ex. « Choisis d'abord un thème »)

  Usage :
    <CategorySelector label="Thème" bind:value={theme} options={themeOptions} required
      onValueChange={(v) => (theme = v)} onAddNew={addTheme} />
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Plus } from '@lucide/svelte';

	interface Props {
		label: string;
		value: string;
		options: string[];
		placeholder?: string;
		required?: boolean;
		/** Ajoute une entrée « Aucun » qui remet la valeur à '' */
		allowEmpty?: boolean;
		onValueChange: (value: string) => void;
		onAddNew?: (newValue: string) => void;
		/** Désactive « Ajouter… » et affiche cette indication (parent non choisi) */
		addDisabledHint?: string;
	}

	// Valeurs sentinelles : jamais des catégories réelles
	const ADD_NEW = '__add_new__';
	const NONE = '__none__';

	let {
		label,
		value = $bindable(),
		options,
		placeholder = 'Sélectionner…',
		required = false,
		allowEmpty = false,
		onValueChange,
		onAddNew,
		addDisabledHint = ''
	}: Props = $props();

	const uid = $props.id();
	const inputId = `${uid}-new-category`;

	let dialogOpen = $state(false);
	let newCategoryName = $state('');

	// Valeur affichée par MySelect : suit `value`, mais peut être écrasée un instant
	// par la sentinelle « Ajouter… » avant d'être remise à la valeur réelle
	let selectValue = $derived(value ?? '');

	const items = $derived([
		...(allowEmpty ? [{ value: NONE, label: 'Aucun' }] : []),
		...options.map((option) => ({ value: option, label: option })),
		...(onAddNew
			? [{ value: ADD_NEW, label: '➕ Ajouter…', disabled: Boolean(addDisabledHint) }]
			: [])
	]);

	function select(newValue: string) {
		value = newValue;
		onValueChange(newValue);
	}

	function handleSelectChange(selected: string) {
		if (selected === ADD_NEW) {
			// Ne pas laisser « Ajouter… » affiché comme valeur choisie
			selectValue = value ?? '';
			if (!addDisabledHint) dialogOpen = true;
			return;
		}
		select(selected === NONE ? '' : selected);
	}

	function closeDialog() {
		dialogOpen = false;
		newCategoryName = '';
	}

	function handleAddCategory() {
		const trimmed = newCategoryName.trim();
		if (!trimmed) return;

		// Valeur déjà proposée : on la sélectionne simplement, sans doublon
		if (!options.includes(trimmed)) onAddNew?.(trimmed);
		select(trimmed);
		closeDialog();
	}
</script>

<div class="space-y-2">
	<Label>
		{label}
		{#if required}
			<span class="text-destructive">*</span>
		{/if}
	</Label>

	<MySelect
		type="single"
		bind:value={selectValue}
		{items}
		{placeholder}
		{required}
		triggerAriaLabel={`${label} : ${value || 'aucun'}`}
		onValueChange={handleSelectChange}
	/>
	{#if onAddNew && addDisabledHint}
		<p class="text-xs text-muted-foreground">{addDisabledHint}</p>
	{/if}
</div>

{#if onAddNew}
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content class="sm:max-w-[425px]">
			<Dialog.Header>
				<Dialog.Title>Ajouter une catégorie</Dialog.Title>
				<Dialog.Description>
					Nouvelle valeur pour « {label} ». Elle sera immédiatement disponible dans la liste.
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-2 py-4">
				<Label for={inputId}>Nom de la catégorie</Label>
				<Input
					id={inputId}
					bind:value={newCategoryName}
					placeholder="Ex. : Algèbre, Géométrie…"
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							handleAddCategory();
						}
					}}
				/>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={closeDialog}>Annuler</Button>
				<Button onclick={handleAddCategory} disabled={!newCategoryName.trim()}>
					<Plus class="mr-2 h-4 w-4" />
					Ajouter
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
