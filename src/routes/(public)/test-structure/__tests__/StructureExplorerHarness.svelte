<!--
	Banc de test : pose le niveau de l'élève connecté comme le fait le layout
	racine, puis le dictionnaire comme la page, et rend l'explorateur.
-->
<script lang="ts">
	import { provideReaderGrade } from '$lib/lexicon/reader-grade';
	import type { CapitalPairs } from '$lib/mathAST/parser';
	import StructureField from '$lib/components/structure/StructureField.svelte';
	import { provideStructureLexicon } from '../structure-lexicon.svelte';

	interface Props {
		latex: string;
		readerGrade: string | null;
		frameLeaves?: boolean;
		capitalPairs?: CapitalPairs;
	}

	let { latex, readerGrade, frameLeaves = true, capitalPairs }: Props = $props();

	provideReaderGrade(() => readerGrade);
	provideStructureLexicon();
</script>

<StructureField {latex} reading {frameLeaves} {capitalPairs} />
