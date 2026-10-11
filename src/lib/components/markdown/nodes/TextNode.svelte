<!--
	TextNode Component
	==================

	Renders text with optional formatting (bold, italic, code).
	Handles HTML escaping for security.

	Features:
	- Supports bold, italic, and code formatting
	- XSS protection via HTML escaping
	- Inherits text color from parent
	- Mots cliquables (lot 2 du lexique) : les mots repérés ouvrent leur fiche

	@see ExerciseDisplay.svelte for usage context
-->
<script lang="ts">
	import { escapeHtml } from '../utils';
	import type { DetailKind, TermRange } from '$lib/ubumark';
	import { inlineDetailClass } from '../detail-styles';
	import LexiconTerm from './LexiconTerm.svelte';

	interface Props {
		content: string;
		bold?: boolean;
		italic?: boolean;
		code?: boolean;
		/** Détail de correction en ligne `[texte]{.rappel}` (ADR 0017) */
		detail?: DetailKind;
		/** Mots du dictionnaire repérés : positions dans le texte du nœud d'origine */
		terms?: TermRange[];
		/** Caractères retirés au début par l'appelant (espace devant une formule) */
		termOffset?: number;
		class?: string;
	}

	let {
		content,
		bold = false,
		italic = false,
		code = false,
		detail,
		terms,
		termOffset = 0,
		class: rawClassName = ''
	}: Props = $props();

	let className = $derived(`${rawClassName} ${inlineDetailClass(detail)}`.trim());

	// Escape content for safe rendering
	let escapedContent = $derived(escapeHtml(content));

	/** Morceaux du texte, chacun ordinaire ou mot cliquable (`ids`). */
	let segments = $derived.by(() => {
		if (!terms?.length) return null;
		const pieces: { text: string; ids?: string[] }[] = [];
		let position = 0;
		for (const term of terms) {
			const start = Math.max(term.start - termOffset, position);
			const end = Math.min(term.end - termOffset, content.length);
			if (end <= start) continue;
			if (start > position) pieces.push({ text: content.slice(position, start) });
			pieces.push({ text: content.slice(start, end), ids: term.ids });
			position = end;
		}
		if (position < content.length) pieces.push({ text: content.slice(position) });
		return pieces;
	});
</script>

{#snippet inner()}{#if segments}{#each segments as segment, i (i)}{#if segment.ids}<LexiconTerm
					ids={segment.ids}>{@html escapeHtml(segment.text)}</LexiconTerm
				>{:else}{@html escapeHtml(
					segment.text
				)}{/if}{/each}{:else}{@html escapedContent}{/if}{/snippet}

{#if code}
	<code class="rounded bg-muted px-1 py-0.5 text-sm text-foreground {className}"
		>{#if bold}<strong
				>{#if italic}<em>{@render inner()}</em>{:else}{@render inner()}{/if}</strong
			>{:else if italic}<em>{@render inner()}</em>{:else}{@render inner()}{/if}</code
	>
{:else if bold}
	<strong class={className}
		>{#if italic}<em>{@render inner()}</em>{:else}{@render inner()}{/if}</strong
	>
{:else if italic}
	<em class={className}>{@render inner()}</em>
{:else}
	<span class={className}>{@render inner()}</span>
{/if}
