<!--
	Banc de test : pose le niveau de l'élève connecté comme le fait le layout
	racine, puis rend le champ ; `latex` est lu par le test après un déplacement
	ou une saisie.
-->
<script lang="ts">
	import { provideReaderGrade } from '$lib/lexicon/reader-grade';
	import StructureField from '../StructureField.svelte';

	interface Props {
		latex: string;
		readerGrade?: string | null;
		structure?: boolean;
		reading?: boolean;
		move?: boolean;
		touch?: boolean;
	}

	let {
		latex = $bindable(),
		readerGrade = null,
		structure = true,
		reading = false,
		move = true,
		touch = false
	}: Props = $props();

	provideReaderGrade(() => readerGrade);
</script>

<StructureField bind:latex {structure} {reading} {move} {touch} lift={false} />
<div data-testid="latex">{latex}</div>
