<!--
	ReportedMessageContent
	======================

	Un message du chat lu par le modérateur, rendu comme le destinataire l'a vu
	(écart T36, décision de David du 2026-11-28) : même chemin que le chat
	(`tipTapToMarkdown` → `MarkdownRenderer` en rendu RESTREINT), formules et
	images comprises. `plain_text` n'en retient ni formule, ni légende, ni bloc.

	Props :
		- content : contenu stocké du message (document TipTap)
		- plainText : texte extrait, repli d'un contenu qui n'est pas un document
-->
<script lang="ts">
	import type { JSONContent } from '@tiptap/core';
	import { MarkdownRenderer } from '#lib/components/markdown/index.ts';
	import { tipTapToMarkdown } from '#lib/components/rich-text/markdown-export.ts';

	interface Props {
		content: unknown;
		plainText: string | null;
	}

	let { content, plainText }: Props = $props();

	/** Un document TipTap a un objet `{ type: 'doc' }` ; tout autre contenu retombe sur le texte. */
	function isTipTapDocument(value: unknown): value is JSONContent {
		return typeof value === 'object' && value !== null && 'type' in value && value.type === 'doc';
	}

	const markdown = $derived(isTipTapDocument(content) ? tipTapToMarkdown(content) : '');
</script>

{#if markdown.trim() !== ''}
	<div class="text-sm leading-relaxed break-words">
		<!-- Rendu restreint : contenu d'élève, comme dans le chat (S1) -->
		<MarkdownRenderer content={markdown} restricted />
	</div>
{:else}
	<p class="text-sm whitespace-pre-wrap">{plainText || '[Contenu non disponible]'}</p>
{/if}
