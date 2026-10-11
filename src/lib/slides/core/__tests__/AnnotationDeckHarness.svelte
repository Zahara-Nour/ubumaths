<script lang="ts">
	// Banc de test : une diapositive annotable suivie de deux diapositives ordinaires
	import Deck from '../Deck.svelte';
	import Slide from '../Slide.svelte';
	import AnnotatableSlide from '../AnnotatableSlide.svelte';
	import ContextProbe from './ContextProbe.svelte';
	import type { DeckContext } from '../types.js';

	interface Props {
		onprobe: (context: DeckContext) => void;
	}

	let { onprobe }: Props = $props();
</script>

<input data-testid="champ-hors-deck" aria-label="Champ hors du diaporama" />
<div style="width: 800px; height: 450px;">
	<Deck config={{ hash: false }}>
		<AnnotatableSlide>
			{#snippet content()}
				<p>Diapositive annotable</p>
				<ContextProbe {onprobe} />
			{/snippet}
		</AnnotatableSlide>
		<Slide><p>Diapositive 1</p></Slide>
		<Slide><p>Diapositive 2</p></Slide>
	</Deck>
</div>
