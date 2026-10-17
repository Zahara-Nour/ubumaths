<!--
	Banc de test : rendu posé DANS une carte qui donne « longueur » (exercice), mais qui
	coupe le sens hérité, comme le chat du tuteur (`clearCapitalPairs`).
-->
<script lang="ts">
	import MarkdownRenderer from '../MarkdownRenderer.svelte';
	import { clearCapitalPairs } from '../content-capital-pairs';

	interface Props {
		content: string;
	}

	let { content }: Props = $props();

	clearCapitalPairs();
</script>

<MarkdownRenderer {content} />
