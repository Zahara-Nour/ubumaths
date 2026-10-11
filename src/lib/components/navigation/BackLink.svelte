<!--
@component
Lien de retour vers la page parente, posé au-dessus du titre de la page.

Règle (docs/pratiques/composants-ui.md#backlink--bouton-retour-obligatoire) : la destination est la page
parente, lue dans l'adresse de la page — jamais l'historique du navigateur. Une page
qui a deux parents possibles le dit dans son adresse (`?fiche=<uuid>`).

Props :
- href : page parente
- label : « Retour aux séries », « Retour à la fiche »… (jamais « Retour » seul)
- kind : 'back' (défaut) ou 'quit' pour une page où l'élève est en pleine activité
  (test, révision, fiche en cours) : « Quitter » dit qu'on interrompt, pas qu'on navigue
- confirmLeave : si défini, demande confirmation avant de partir (modifications non
  enregistrées) ; un refus annule la navigation, le lien reste un vrai lien
-->
<script lang="ts">
	import { ArrowLeft, X } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		href,
		label,
		kind = 'back',
		confirmLeave,
		class: className
	}: {
		href: string;
		label: string;
		kind?: 'back' | 'quit';
		confirmLeave?: string;
		class?: string;
	} = $props();

	function handleClick(event: MouseEvent) {
		// Ouverture dans un nouvel onglet : rien n'est perdu, aucune question à poser
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
		if (confirmLeave && !confirm(confirmLeave)) event.preventDefault();
	}
</script>

<!-- Marge négative : la flèche s'aligne sur le bord gauche du titre, la zone de clic reste large -->
<a
	{href}
	data-sveltekit-preload-data="hover"
	onclick={handleClick}
	class={cn(
		'mb-2 -ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none',
		className
	)}
>
	{#if kind === 'quit'}
		<X class="size-4 shrink-0" aria-hidden="true" />
	{:else}
		<ArrowLeft class="size-4 shrink-0" aria-hidden="true" />
	{/if}
	{label}
</a>
