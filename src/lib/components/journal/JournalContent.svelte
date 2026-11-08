<!--
	JournalContent — rendu d'un contenu du cahier de texte
	======================================================

	Contenu de séance ou de travail à faire, lu par un élève (page élève) ou par
	le lien public `/cahier/[token]`.

	Le cahier est écrit en ubumark (chantier cahier-ubumark) : rendu par
	`MarkdownRenderer`, jamais par `{@html}` — une balise tapée reste du texte.
	Vidéos de notre stockage seulement (`projectMediaOnly`) : les autres, YouTube
	compris, deviennent des liens (lecteurs anonymes du lien public).

	Plus de lecture HTML : les lignes écrites avant le chantier ont été
	converties le 2026-11-08 ; une balise est du texte.
-->
<script lang="ts">
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { InternalLinkReader } from '$lib/components/markdown/internal-link-context';

	interface Props {
		/** Contenu tel qu'en base, en ubumark. */
		content: string | null | undefined;
		/** Qui lit : détermine où mènent les références. */
		links: InternalLinkReader;
	}

	let { content, links }: Props = $props();
</script>

{#if content?.trim()}
	<MarkdownRenderer {content} internalLinks={links} projectMediaOnly />
{/if}
