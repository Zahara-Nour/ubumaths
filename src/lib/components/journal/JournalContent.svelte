<!--
	JournalContent — rendu d'un contenu du cahier de texte
	======================================================

	Contenu de séance ou de travail à faire, lu par un élève (page élève) ou par
	le lien public `/cahier/[token]`.

	Le cahier est écrit en ubumark (chantier cahier-ubumark) : rendu par
	`MarkdownRenderer`, jamais par `{@html}` — une balise tapée reste du texte.
	Vidéos de notre stockage seulement (`projectMediaOnly`) : les autres, YouTube
	compris, deviennent des liens (lecteurs anonymes du lien public).

	⚠️ TRANSITOIRE : une ligne encore en HTML (écrite avant le chantier, pas
	encore convertie) garde l'ancienne chaîne — assainissement
	(`transformMathHtml`) PUIS liens des références (`linkifyResourceReferences`,
	qui réinjecte le libellé tel quel et doit donc passer après). Cette branche
	disparaît avec la conversion des données.
-->
<script lang="ts">
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { InternalLinkReader } from '$lib/components/markdown/internal-link-context';
	import { isLegacyHtmlContent } from '$lib/journal/content';
	import { linkifyResourceReferences } from '$lib/resources/linkify';
	import { transformMathHtml } from '$lib/utils/sanitize';

	interface Props {
		/** Contenu tel qu'en base : ubumark, ou HTML hérité. */
		content: string | null | undefined;
		/** Qui lit : détermine où mènent les références. */
		links: InternalLinkReader;
	}

	let { content, links }: Props = $props();

	let legacyHtml = $derived(
		isLegacyHtmlContent(content)
			? linkifyResourceReferences(transformMathHtml(content ?? ''), links)
			: null
	);
</script>

{#if legacyHtml !== null}
	<div class="prose prose-sm max-w-none dark:prose-invert">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- HTML hérité, assaini par transformMathHtml -->
		{@html legacyHtml}
	</div>
{:else if content?.trim()}
	<MarkdownRenderer {content} internalLinks={links} projectMediaOnly />
{/if}
