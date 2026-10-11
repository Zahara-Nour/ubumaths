<script lang="ts">
	// Banc de test : une diapositive UbuMark sur le fond du thème, comme la présentation des carnets
	import Deck from '../Deck.svelte';
	import UbuMarkSlide from '../UbuMarkSlide.svelte';

	interface Props {
		content: string;
	}

	let { content }: Props = $props();
</script>

<div class="bg-background" style="width: 800px; height: 450px;">
	<Deck config={{ hash: false }}>
		<UbuMarkSlide {content} />
	</Deck>
</div>
