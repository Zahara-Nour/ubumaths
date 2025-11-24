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

	interface Props {
		content: string;
		bold?: boolean;
		italic?: boolean;
		code?: boolean;
		class?: string;
	}

	let {
		content,
		bold = false,
		italic = false,
		code = false,
		class: className = ''
	}: Props = $props();

	// Escape content for safe rendering
	let escapedContent = $derived(escapeHtml(content));
</script>

{#if code}
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
{/if}
