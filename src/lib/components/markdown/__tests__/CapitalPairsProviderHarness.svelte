<!--
	Banc de test : pose le sens de `AB` comme le fait une carte de question
	(`QuestionCard`, `FlashCard`…), puis rend un MarkdownRenderer qui doit en hériter.
-->
<script lang="ts">
	import MarkdownRenderer from '../MarkdownRenderer.svelte';
	import { provideCapitalPairs } from '../content-capital-pairs';
	import type { CapitalPairs } from '$lib/mathAST/parser/types';

	interface Props {
		content: string;
		capitalPairs?: CapitalPairs;
	}

	let { content, capitalPairs }: Props = $props();

	provideCapitalPairs(() => capitalPairs);
</script>

<MarkdownRenderer {content} />
