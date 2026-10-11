<!--
	Banc de test : pose le niveau de l'élève connecté comme le fait le layout
	racine, puis rend une QuestionCard.
-->
<script lang="ts">
	import QuestionCard from '../QuestionCard.svelte';
	import { provideReaderGrade } from '$lib/lexicon/reader-grade';
	import type { QuestionInstance } from '$lib/questions/types';

	interface Props {
		instance: QuestionInstance;
		readerGrade: string | null;
	}

	let { instance, readerGrade }: Props = $props();

	provideReaderGrade(() => readerGrade);
</script>

<QuestionCard interactive {instance} />
