<script lang="ts">
	// Banc de test : une seule diapositive (la première est affichée), UbuMark ou simple texte
	import Deck from '../Deck.svelte';
	import Slide from '../Slide.svelte';
	import UbuMarkSlide from '../UbuMarkSlide.svelte';
	import type { SlideTheme } from '../types.js';

	interface Props {
		/** Contenu UbuMark ; absent : une diapositive simple avec un paragraphe */
		content?: string;
		background?: string;
		theme?: SlideTheme;
	}

	let { content, background, theme }: Props = $props();
</script>

<div class="bg-background" style="width: 800px; height: 450px;">
	<Deck config={{ hash: false }}>
		{#if content === undefined}
			<Slide {background} {theme}>
				<p class="texte-simple">Texte simple</p>
			</Slide>
		{:else}
			<UbuMarkSlide {content} {background} {theme} />
		{/if}
	</Deck>
</div>
