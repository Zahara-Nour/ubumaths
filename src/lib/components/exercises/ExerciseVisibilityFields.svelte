<!--
	Visibilité d'un exercice : « publique » et « Afficher sur Google ».

	Un exercice public est lisible par qui a son lien ; il n'apparaît sur Google
	(sitemap, pas de noindex) que si le professeur coche la seconde case, après
	une fenêtre d'alerte. La case Google est grisée tant que l'exercice n'est pas
	public, et décocher « publique » la décoche aussi (la base refuse « privé +
	Google »).
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';

	// Types

	interface Props {
		isPublic?: boolean;
		searchIndexed?: boolean;
		/** Appelé après chaque changement effectif (formulaire « modifié »). */
		onchange?: () => void;
	}

	// Constantes

	const DIALOG_TITLE = 'Afficher cet exercice sur Google ?';
	const DIALOG_DESCRIPTION =
		'Il pourra apparaître dans les résultats de recherche et être lu par n’importe qui, sans lien ni compte. Son contenu pourra être copié. Si vous changez d’avis, le retirer de Google peut prendre plusieurs jours.';

	// Props

	let { isPublic = $bindable(false), searchIndexed = $bindable(false), onchange }: Props = $props();

	// Variables

	let confirmOpen = $state(false);

	// Functions

	function handlePublicChange(checked: boolean) {
		// Privé ⇒ pas sur Google, dans la même saisie
		if (!checked) searchIndexed = false;
		onchange?.();
	}

	function handleSearchIndexedChange(checked: boolean) {
		if (checked) {
			// La case ne se coche qu'à la confirmation de la fenêtre
			searchIndexed = false;
			confirmOpen = true;
			return;
		}
		onchange?.();
	}

	function confirmSearchIndexed() {
		searchIndexed = true;
		onchange?.();
	}
</script>

<div
	class="rounded-lg border p-4 {isPublic
		? 'border-green-500/50 bg-green-50 dark:bg-green-950/20'
		: 'bg-muted/30'}"
>
	<div class="flex items-start gap-3">
		<MyCheckbox
			bind:checked={isPublic}
			label="{lore.learning.exercise} publique"
			onchange={handlePublicChange}
		/>
	</div>
	<p class="mt-2 text-sm text-muted-foreground">
		{#if isPublic}
			Cette {lore.learning.exercise} est accessible a tous via son lien direct.
		{:else}
			Cette {lore.learning.exercise} est privée. Seuls les eleves assignes ou avec un lien de partage
			peuvent y acceder.
		{/if}
	</p>

	<div class="mt-4 flex items-start gap-3">
		<MyCheckbox
			bind:checked={searchIndexed}
			label="Afficher sur Google"
			disabled={!isPublic}
			onchange={handleSearchIndexedChange}
		/>
	</div>
	<p class="mt-2 text-sm text-muted-foreground">
		{#if !isPublic}
			Réservé aux {lore.learning.exercise.toLowerCase()}s publiques.
		{:else if searchIndexed}
			Google peut l’afficher dans ses résultats de recherche.
		{:else}
			Google ne l’affiche pas dans ses résultats : seul son lien y donne accès.
		{/if}
	</p>
</div>

<ConfirmDialog
	bind:open={confirmOpen}
	title={DIALOG_TITLE}
	description={DIALOG_DESCRIPTION}
	confirmLabel="Afficher sur Google"
	cancelLabel="Annuler"
	variant="default"
	onConfirm={confirmSearchIndexed}
/>
