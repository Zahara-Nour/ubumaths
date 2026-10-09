<!--
	LexiconTerm Component
	=====================

	Mot cliquable (lot 2 du lexique) : un mot de l'énoncé repéré dans le
	dictionnaire mathématique. Un clic ouvre sa fiche, au niveau de l'élève :
	chaque sens visible, ses définitions, et un lien vers le glossaire.

	Le niveau vient du contexte « lexique » (lexicon-context.ts). La fiche
	coupe ce contexte : ses définitions ne soulignent pas leurs propres mots.

	@see lexicon/linker.ts pour le repérage
	@see HintReference.svelte pour le même motif bouton + popover
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import * as Popover from '$lib/components/ui/popover';
	import { lexiconCard } from '$lib/lexicon/card';
	import InlineMarkdown from '../InlineMarkdown.svelte';
	import { provideLexicon, readLexicon } from '../lexicon-context';

	interface Props {
		/** Entrées du dictionnaire ouvertes par ce mot (plusieurs pour un homonyme) */
		ids: string[];
		/** Le mot tel qu'il est écrit dans l'énoncé, avec sa mise en forme */
		children: Snippet;
	}

	let { ids, children }: Props = $props();

	const lexicon = readLexicon();
	provideLexicon(() => null);

	let card = $derived.by(() => {
		const grade = lexicon();
		return grade ? lexiconCard(ids, grade) : [];
	});
</script>

{#if card.length === 0}{@render children()}{:else}<Popover.Root
		><Popover.Trigger
			>{#snippet child({ props })}<button
					{...props}
					type="button"
					class="lexicon-term cursor-pointer underline decoration-primary/50 decoration-dotted underline-offset-4 hover:decoration-primary"
					>{@render children()}</button
				>{/snippet}</Popover.Trigger
		><Popover.Content class="w-80 max-w-[90vw] space-y-3 text-left" align="start">
			{#each card as entry (entry.id)}
				<div class="space-y-1">
					<p class="font-semibold text-foreground">
						{entry.term}{#if entry.sense}<span
								class="ml-1 text-sm font-normal text-muted-foreground italic">({entry.sense})</span
							>{/if}
					</p>
					{#if entry.seeTerm}
						<p class="text-xs text-muted-foreground">Voir : {entry.seeTerm}</p>
					{/if}
					{#each entry.definitions as definition (definition)}
						<div class="text-sm text-foreground">
							<InlineMarkdown content={definition} />
						</div>
					{/each}
				</div>
			{/each}
			<a
				href="{resolve('/glossaire')}?q={encodeURIComponent(card[0].term)}"
				class="inline-block text-sm text-primary underline">Voir dans le glossaire</a
			>
		</Popover.Content></Popover.Root
	>{/if}

<style>
	/* Le mot garde la police et la couleur du texte : seul le soulignement pointillé le signale */
	.lexicon-term {
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
	}
</style>
