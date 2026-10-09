<!--
	TextNode Component
	==================

	Renders text with optional formatting (bold, italic, code).
	Handles HTML escaping for security.

	Features:
	- Supports bold, italic, and code formatting
	- XSS protection via HTML escaping
	- Inherits text color from parent

	@see ExerciseDisplay.svelte for usage context
-->
<script lang="ts">
	import { escapeHtml } from '../utils';
	import type { DetailKind, TermLink } from '$lib/ubumark';
	import { inlineDetailClass } from '../detail-styles';
	import LexiconTerm from './LexiconTerm.svelte';

	interface Props {
		content: string;
		bold?: boolean;
		italic?: boolean;
		code?: boolean;
		/** Détail de correction en ligne `[texte]{.rappel}` (ADR 0017) */
		detail?: DetailKind;
		/** Mot du dictionnaire repéré : il ouvre sa fiche (mots cliquables) */
		term?: TermLink;
		class?: string;
	}

	let {
		content,
		bold = false,
		italic = false,
		code = false,
		detail,
		term,
		class: rawClassName = ''
	}: Props = $props();

	let className = $derived(`${rawClassName} ${inlineDetailClass(detail)}`.trim());

	// Escape content for safe rendering
	let escapedContent = $derived(escapeHtml(content));
</script>

{#snippet formatted()}{#if code}
		<code class="rounded bg-muted px-1 py-0.5 text-sm text-foreground {className}"
			>{#if bold}<strong
					>{#if italic}<em>{@html escapedContent}</em>{:else}{@html escapedContent}{/if}</strong
				>{:else if italic}<em>{@html escapedContent}</em>{:else}{@html escapedContent}{/if}</code
		>
	{:else if bold}
		<strong class={className}
			>{#if italic}<em>{@html escapedContent}</em>{:else}{@html escapedContent}{/if}</strong
		>
	{:else if italic}
		<em class={className}>{@html escapedContent}</em>
	{:else}
		<span class={className}>{@html escapedContent}</span>
	{/if}{/snippet}

{#if term}<LexiconTerm ids={term.ids}>{@render formatted()}</LexiconTerm
	>{:else}{@render formatted()}{/if}
