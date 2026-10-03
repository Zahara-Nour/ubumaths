<!--
	@component
	RestrictedRichText — affiche un contenu écrit par un ÉLÈVE et lu par d'AUTRES
	(messagerie, signalements de fiches), sans rien qui charge une ressource
	externe ni exécute de code.

	`RichTextDisplay` monte l'éditeur complet en lecture seule : vidéo et image
	externes, `\htmlStyle`, couleur de texte (`textStyle`) y passaient tels quels
	(audit du 2026-10-03). Ici, le JSON TipTap est converti en markdown et rendu
	par `MarkdownRenderer` en mode restreint (décision S1). Un ancien contenu en
	HTML brut est réduit à son TEXTE, lu dans un document inerte.

	@example
	<RestrictedRichText content={message.content} class="prose prose-sm" />
-->
<script lang="ts">
	import type { JSONContent } from '@tiptap/core';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { tipTapToMarkdown } from './markdown-export';

	interface Props {
		/** JSON TipTap (objet ou chaîne JSON), ou ancien contenu HTML / texte */
		content: unknown;
		class?: string;
	}

	let { content, class: className = '' }: Props = $props();

	const markdown = $derived(toMarkdown(content));

	function isTipTapDoc(value: unknown): value is JSONContent {
		return typeof value === 'object' && value !== null && (value as JSONContent).type === 'doc';
	}

	/**
	 * Le texte d'un ancien contenu HTML. `DOMParser` construit un document INERTE :
	 * ni image chargée, ni script exécuté.
	 */
	function htmlToText(html: string): string {
		if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, ' ');
		const parsed = new DOMParser().parseFromString(html, 'text/html');
		return parsed.body.textContent ?? '';
	}

	/** Message illisible (JSON malformé) : on l'annonce, sans planter la page */
	const UNREADABLE = '[contenu illisible]';

	function toMarkdown(value: unknown): string {
		try {
			return convert(value);
		} catch {
			return UNREADABLE;
		}
	}

	function convert(value: unknown): string {
		if (isTipTapDoc(value)) return tipTapToMarkdown(value);
		if (typeof value !== 'string') return '';
		try {
			const parsed: unknown = JSON.parse(value);
			if (isTipTapDoc(parsed)) return tipTapToMarkdown(parsed);
		} catch {
			// Pas du JSON : ancien contenu HTML ou texte
		}
		return /<[a-z][\s\S]*>/i.test(value) ? htmlToText(value) : value;
	}
</script>

<MarkdownRenderer content={markdown} restricted class={className} />
