<!--
	Harnais de test : FillBlanksInput avec `values` lié en `$state`, comme
	QuestionCard (`bind:values`) — le parent renvoie la valeur saisie au bloc
-->
<script lang="ts">
	import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
	import type { InstanceBlank } from '$lib/questions/types';
	import type { ResolvedMarkdown } from '$lib/ubumark';

	interface Props {
		statement: ResolvedMarkdown;
		blanks: InstanceBlank[];
		/** Relevé des valeurs, à chaque changement */
		onValues?: (values: string[]) => void;
	}

	let { statement, blanks, onValues }: Props = $props();

	let values = $state<string[]>([]);

	$effect(() => {
		onValues?.($state.snapshot(values));
	});
</script>

<FillBlanksInput {statement} {blanks} bind:values validationResults={[]} />
