<!--
	InlineRenderer Component
	========================

	Renders inline markdown content without a block wrapper.
	Designed for use in shape labels and other contexts where
	a <span> wrapper is needed instead of <p>.

	Supports:
	- TextNode (plain, bold, italic, code)
	- MathInlineNode ($x^2$, ~custom~)

	Does NOT support (not needed for labels):
	- BlankInput, HintReference, InternalLink, Hashtag, Mention

	@see ParagraphNode.svelte for full inline rendering
	@see ShapeLabel.svelte for primary usage
-->
<script lang="ts">
	import type { InlineNode } from '$lib/ubumark';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';
	import MathInline from './nodes/MathInline.svelte';
	import TextNode from './nodes/TextNode.svelte';
	import { sanitizeUrl } from '$lib/utils/sanitize';

	interface Props {
		/** Inline nodes to render */
		children: InlineNode[];
		/** Additional CSS classes */
		class?: string;
		/** Configuration for generic function names (f, g, h, P, Q, etc.) */
		genericFunctions?: GenericFunctionConfig | null;
	}

	let { children, class: className = '', genericFunctions }: Props = $props();

	/**
	 * Check if adjacent node is inline-block (math) for whitespace handling
	 */
	function isInlineBlockNode(node: InlineNode | undefined): boolean {
		return node?.type === 'math-inline';
	}

	/**
	 * Handle whitespace preservation for text adjacent to math.
	 * Uses en-space to prevent collapse.
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

<span class="inline-renderer {className}">
	{#each children as child, index (index)}
		{#if child.type === 'text'}
			{@const prevIsInlineBlock = isInlineBlockNode(children[index - 1])}
			{@const nextIsInlineBlock = isInlineBlockNode(children[index + 1])}
			{@const adjusted = adjustTextForMath(child.content, prevIsInlineBlock, nextIsInlineBlock)}
			{#if adjusted.hasLeadingSpace}&ensp;{/if}<TextNode
				content={adjusted.content}
				bold={child.bold}
				italic={child.italic}
				code={child.code}
			/>{#if adjusted.hasTrailingSpace}&ensp;{/if}
		{:else if child.type === 'math-inline'}
			{#key child.expression}
				<MathInline expression={child.expression} syntax={child.syntax} {genericFunctions} />
			{/key}
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
		{:else if child.type === 'line-break'}
			{#if child.hard}<br />{/if}
		{/if}
	{/each}
</span>

<style>
	.inline-renderer {
		display: inline;
	}
</style>
