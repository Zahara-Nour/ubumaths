<!--
	Banc de test : pose une langue comme le font la page élève et l'éditeur
	d'exercice, puis rend un MarkdownRenderer SANS prop `locale`, qui doit en hériter.
-->
<script lang="ts">
	import MarkdownRenderer from '../MarkdownRenderer.svelte';
	import { provideContentLocale } from '../content-locale';
	import type { ContentLocale } from '$lib/types/locale';

	interface Props {
		content: string;
		locale: ContentLocale;
	}

	let { content, locale }: Props = $props();

	provideContentLocale(() => locale);
</script>

<MarkdownRenderer {content} />
