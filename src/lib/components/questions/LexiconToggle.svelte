<!--
	LexiconToggle Component
	=======================

	Bouton « Mots du dictionnaire » d'une carte de question (R6 du chantier
	`mots-cliquables`) : affiche ou masque le soulignement des mots du
	dictionnaire, sur toutes les cartes, choix mémorisé sur l'appareil.

	Absent si la carte n'a aucun mot repéré (B6) ou hors d'une carte de question.

	@see lexicon/visibility.svelte.ts pour la préférence
	@see markdown/nodes/LexiconTerm.svelte pour le rendu des mots
-->
<script lang="ts">
	import { BookOpen } from '@lucide/svelte';
	import { readLexiconCardTerms } from '#lib/components/markdown/lexicon-context.ts';
	import { lexiconShown, setLexiconShown } from '#lib/dictionary/visibility.svelte.ts';
	import { cn } from '#lib/utils.ts';

	interface Props {
		/** Placement dans la carte */
		class?: string;
	}

	let { class: className }: Props = $props();

	const cardTerms = readLexiconCardTerms();

	// L'état se dit par aria-pressed seulement (titre fixe : pas d'annonce contradictoire)
	let shown = $derived(lexiconShown());
</script>

{#if cardTerms && cardTerms.count > 0}
	<button
		type="button"
		class={cn(
			'inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:bg-muted aria-pressed:text-primary',
			className
		)}
		aria-label="Mots du dictionnaire"
		title="Mots du dictionnaire"
		aria-pressed={shown}
		onclick={() => setLexiconShown(!shown)}
	>
		<BookOpen class="h-4 w-4" aria-hidden="true" />
	</button>
{/if}
