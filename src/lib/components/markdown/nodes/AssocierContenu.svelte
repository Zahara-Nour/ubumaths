<!--
	AssocierContenu — un élément (ou une étiquette) d'un ```associer
	=================================================================

	Texte et formules : `InlineMarkdown`, sur une ligne. Élément qui contient un bloc
	(```courbe, lot 2 du chantier `docs/wip/associer-progress.md`) : rendu en blocs,
	en petit (largeur bornée : 130 à 180 px), pour que deux colonnes tiennent au
	téléphone.

	@module components/markdown/nodes/AssocierContenu
-->
<script lang="ts">
	import { associerItemHasBlock } from '$lib/ubumark/parser/associer-parser';
	import InlineMarkdown from '../InlineMarkdown.svelte';
	import MarkdownRenderer from '../MarkdownRenderer.svelte';

	// Types
	interface Props {
		content: string;
	}

	let { content }: Props = $props();

	// Variables
	let hasBlock = $derived(associerItemHasBlock(content));
</script>

{#if hasBlock}
	<span class="associer-bloc" data-associer-bloc>
		<MarkdownRenderer {content} />
	</span>
{:else}
	<InlineMarkdown {content} />
{/if}

<style>
	.associer-bloc {
		display: block;
		width: clamp(130px, 38vw, 180px);
		text-align: left;
		/* Le geste (trait, pose) se fait sur la case entière, pas dans la figure */
		pointer-events: none;
	}

	.associer-bloc :global(> *) {
		margin-block: 0;
	}
</style>
