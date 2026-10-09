<!--
	HeadingNode Component
	=====================

	Renders a heading with inline children.
	Uses recursive rendering for inline content.

	Titres décalés d'un niveau : `#` → <h2>, `##` → <h3>… (`######` reste <h6>).
	Le contenu s'affiche toujours dans une page qui a déjà son <h1>. La classe
	`md-h{level}` garde la taille du niveau d'origine (cf. app.css, `main .md-hN`).

	Features:
	- Supports heading levels 1-6
	- Renders children inline (text, math, etc.)
	- Proper styling for each heading level
	- Handles whitespace preservation for math-inline

	@see ExerciseDisplay.svelte for usage context
	@see ParagraphNode.svelte for similar inline rendering
-->
<script lang="ts">
	import { sanitizeUrl } from '$lib/utils/sanitize';
	import type { InlineNode } from '$lib/ubumark';
	import type { ExerciseHint } from '$lib/exercises/types';
	import MathInline from './MathInline.svelte';
	import TextNode from './TextNode.svelte';
	import HintReference from './HintReference.svelte';

	interface Props {
		level: 1 | 2 | 3 | 4 | 5 | 6;
		children: InlineNode[];
		class?: string;
		/** Callback when a hashtag is clicked */
		onHashtagClick?: (tag: string) => void;
		/** Callback when a mention is clicked */
		onMentionClick?: (username: string) => void;
		/** Available hints for {{hint:id}} references */
		hints?: ExerciseHint[];
		/** Callback when a hint is opened */
		onHintOpen?: (hintId: string) => void;
	}

	let {
		level,
		children,
		class: className = '',
		onHashtagClick,
		onMentionClick,
		hints = [],
		onHintOpen
	}: Props = $props();

	// Heading size classes based on level (consistent with TipTap editor)
	const headingClasses: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
		1: 'text-2xl font-bold mb-3 mt-4',
		2: 'text-xl font-bold mb-2 mt-3',
		3: 'text-lg font-bold mb-2 mt-3',
		4: 'text-base font-semibold mb-2 mt-2',
		5: 'text-base font-semibold mb-1 mt-2',
		6: 'text-sm font-medium mb-1 mt-2'
	};

	let headingClass = $derived(`md-h${level} ${headingClasses[level]} text-foreground ${className}`);
	// Le seul <h1> d'une page est son titre propre : le contenu commence au niveau 2
	let tag = $derived(`h${Math.min(level + 1, 6)}`);

	/**
	 * Check if adjacent node is math-inline for whitespace handling
	 */
	function isMathNode(node: InlineNode | undefined): boolean {
		return node?.type === 'math-inline';
	}

	/**
	 * Handle whitespace preservation for text adjacent to math
	 * Uses en-space for better visibility
	 */
	function adjustTextForMath(
		content: string,
		prevIsMath: boolean,
		nextIsMath: boolean
	): { content: string; hasLeadingSpace: boolean; hasTrailingSpace: boolean } {
		let adjusted = content;
		const hasLeadingSpace = content.startsWith(' ') && prevIsMath;
		const hasTrailingSpace = content.endsWith(' ') && nextIsMath;

		if (hasLeadingSpace) {
			adjusted = adjusted.slice(1);
		}
		if (hasTrailingSpace) {
			adjusted = adjusted.slice(0, -1);
		}

		return { content: adjusted, hasLeadingSpace, hasTrailingSpace };
	}
</script>

<svelte:element this={tag} class={headingClass}>
	{#each children as child, index (index)}
		{#if child.type === 'text'}
			{@const prevIsMath = isMathNode(children[index - 1])}
			{@const nextIsMath = isMathNode(children[index + 1])}
			{@const adjusted = adjustTextForMath(child.content, prevIsMath, nextIsMath)}
			{#if adjusted.hasLeadingSpace}&ensp;{/if}<TextNode
				content={adjusted.content}
				bold={child.bold}
				italic={child.italic}
				code={child.code}
				term={child.term}
			/>{#if adjusted.hasTrailingSpace}&ensp;{/if}
		{:else if child.type === 'math-inline'}
			{#key child.expression}<MathInline
					expression={child.expression}
					syntax={child.syntax}
				/>{/key}
		{:else if child.type === 'link'}
			<a
				href={sanitizeUrl(child.url)}
				title={child.title}
				class="text-primary underline hover:text-primary/80"
				target="_blank"
				rel="noopener noreferrer"
			>
				{child.text}
			</a>
		{:else if child.type === 'hashtag'}
			{#if onHashtagClick}
				<button
					type="button"
					class="hashtag cursor-pointer font-medium text-primary hover:text-primary/80"
					onclick={() => onHashtagClick?.(child.tag)}
				>
					#{child.tag}
				</button>
			{:else}
				<!-- Pas de page de recherche par étiquette : du texte, pas un lien mort -->
				<span class="hashtag font-medium text-primary">#{child.tag}</span>
			{/if}
		{:else if child.type === 'mention'}
			{#if onMentionClick}
				<button
					type="button"
					class="mention cursor-pointer font-medium text-primary hover:text-primary/80"
					onclick={() => onMentionClick?.(child.username)}
				>
					@{child.username}
				</button>
			{:else}
				<!-- Pas de page de profil public : du texte, pas un lien mort -->
				<span class="mention font-medium text-primary">@{child.username}</span>
			{/if}
		{:else if child.type === 'hint-reference'}
			<HintReference hintId={child.hintId} {hints} {onHintOpen} />
		{:else if child.type === 'line-break'}
			{#if child.hard}<br />{/if}
		{/if}
	{/each}
</svelte:element>
