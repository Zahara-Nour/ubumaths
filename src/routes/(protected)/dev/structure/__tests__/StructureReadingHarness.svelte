<!--
	Banc de test : une lecture seule, avec le dictionnaire posé comme par la page.
-->
<script lang="ts">
	import { provideReaderGrade } from '$lib/lexicon/reader-grade';
	import { readingOf, structureFromLatex } from '$lib/mathAST/structure';
	import StructureReading from '$lib/components/structure/StructureReading.svelte';
	import { provideStructureLexicon } from '../structure-lexicon.svelte';

	interface Props {
		latex: string;
		interactive?: boolean;
	}

	let { latex, interactive = true }: Props = $props();

	provideReaderGrade(() => null);
	provideStructureLexicon();

	const result = $derived(structureFromLatex(latex));
</script>

{#if result.status === 'ok'}
	<StructureReading reading={readingOf(result.structure)} {interactive} />
{/if}
