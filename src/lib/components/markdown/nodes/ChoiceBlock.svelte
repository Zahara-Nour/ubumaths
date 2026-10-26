<!--
	ChoiceBlock — bloc ```choix rendu par le markdown (hors saisie)
	===============================================================

	Case « choix » corrigée (un parent a posé son résultat, `choice-case-results`) :
	ses choix avec les statuts du QCM, À LEUR PLACE dans l'énoncé rempli. Sinon
	(cours, aperçu, énoncé montré sans saisie) : liste A, B, C non cliquable —
	jamais le code du bloc. La saisie, elle, est dans `FillBlanksInput`.

	@module components/markdown/nodes/ChoiceBlock
-->
<script lang="ts">
	import type { ChoiceNode } from '$lib/ubumark/types/choix';
	import { readChoiceCaseResults } from '../choice-case-results';
	import ChoiceList from './ChoiceList.svelte';

	interface Props {
		node: ChoiceNode;
	}

	let { node }: Props = $props();

	const results = readChoiceCaseResults();
	const corrected = $derived(results().find((choiceCase) => choiceCase.index === node.caseIndex));
</script>

{#if corrected}
	<ChoiceList corrected multiple={corrected.multiple} items={corrected.choices} />
{:else}
	<ChoiceList multiple={node.multiple} items={node.choices.map((content) => ({ content }))} />
{/if}
