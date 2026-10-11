<!--
	Banc de test : pose un niveau de lecture comme le fait le cadre d'une
	question, puis rend un MarkdownRenderer SANS prop `lexiconGrade`, qui doit en hériter.
-->
<script lang="ts">
	import MarkdownRenderer from '../MarkdownRenderer.svelte';
	import { provideLexicon } from '../lexicon-context';
	import type { GradeCode } from '$lib/types/grades';

	interface Props {
		content: string;
		grade: GradeCode | null;
	}

	let { content, grade }: Props = $props();

	provideLexicon(() => grade);
</script>

<MarkdownRenderer {content} />
