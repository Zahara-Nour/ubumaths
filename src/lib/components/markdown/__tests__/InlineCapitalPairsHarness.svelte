<!--
	Banc de test : la page pose un sens (l'exercice ouvert), un titre de la liste
	passe le sien à InlineMarkdown, qui doit l'emporter.
-->
<script lang="ts">
	import InlineMarkdown from '../InlineMarkdown.svelte';
	import { provideCapitalPairs } from '../content-capital-pairs';
	import type { CapitalPairs } from '$lib/mathAST/parser/types';

	interface Props {
		content: string;
		pageCapitalPairs?: CapitalPairs;
		capitalPairs?: CapitalPairs;
	}

	let { content, pageCapitalPairs, capitalPairs }: Props = $props();

	provideCapitalPairs(() => pageCapitalPairs);
</script>

<InlineMarkdown {content} {capitalPairs} />
