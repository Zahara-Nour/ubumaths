<!--
	Banc de test : pose le niveau de l'élève connecté comme le fait le layout
	racine, puis le dictionnaire comme la page, et rend l'explorateur.
-->
<script lang="ts">
	import { provideReaderGrade } from '$lib/lexicon/reader-grade';
	import StructureExplorer from '../StructureExplorer.svelte';
	import { provideStructureLexicon } from '../structure-lexicon.svelte';

	interface Props {
		latex: string;
		readerGrade: string | null;
	}

	let { latex, readerGrade }: Props = $props();

	provideReaderGrade(() => readerGrade);
	provideStructureLexicon();
</script>

<StructureExplorer {latex} />
