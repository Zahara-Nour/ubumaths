<!--
	Banc de test : une carte d'exercice pose « longueur », un rendu enfant coupe le sens.
-->
<script lang="ts">
	import MarkdownRenderer from '../MarkdownRenderer.svelte';
	import ClearedCapitalPairsHarness from './ClearedCapitalPairsHarness.svelte';
	import { provideCapitalPairs } from '../content-capital-pairs';

	interface Props {
		content: string;
	}

	let { content }: Props = $props();

	provideCapitalPairs(() => 'length');
</script>

<div data-testid="exercise"><MarkdownRenderer {content} /></div>
<div data-testid="chat"><ClearedCapitalPairsHarness {content} /></div>
