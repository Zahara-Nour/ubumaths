<!--
	Banc de test : une lecture seule, avec le dictionnaire posé comme par la page.
-->
<script lang="ts">
	import { provideReaderGrade } from '#lib/dictionary/reader-grade.ts';
	import { readingOf, structureFromLatex } from '#lib/mathAST/structure/index.ts';
	import StructureReading from '#lib/components/structure/StructureReading.svelte';
	import { provideStructureLexicon } from '#lib/components/structure/structure-lexicon.svelte.ts';

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
