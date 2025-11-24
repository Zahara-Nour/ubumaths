<!--
	ParagraphNode Component
	=======================

	Renders a paragraph with inline children (text, math, line breaks).
	Handles whitespace preservation for math-inline elements.

	Features:
	- Recursive rendering of inline children
	- Whitespace preservation adjacent to math elements
	- Proper styling with Tailwind

	Problem solved:
	`display: inline-block` on math-field elements causes adjacent
	whitespace to collapse. We convert spaces adjacent to math-inline
	elements to non-breaking spaces (en-space) to preserve them.

	@see ExerciseDisplay.svelte for original implementation
	@see HeadingNode.svelte for similar inline rendering
-->
<script lang="ts">
	import type { InlineNode } from '$lib/exercises/types';
	import MathInline from './MathInline.svelte';
	import TextNode from './TextNode.svelte';

	interface Props {
		children: InlineNode[];
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();

	/**
	 * Check if adjacent node is math-inline for whitespace handling
	 */
	function isMathNode(node: InlineNode | undefined): boolean {
		return node?.type === 'math-inline';
	}

	/**
	 * Handle whitespace preservation for text adjacent to math.
	 * Uses en-space for better visibility.
	 *
	 * We use &ensp; rather than word-joiner (U+2060) because:
	 * - &ensp; is universally supported and well-understood
	 * - Line breaks right before/after math expressions are rarely desirable
	 * - It reliably prevents whitespace collapse in all browsers
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

<p class="mb-4 text-foreground {className}">
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
			/>{#if adjusted.hasTrailingSpace}&ensp;{/if}
		{:else if child.type === 'math-inline'}
			<MathInline latex={child.latex} />
		{:else if child.type === 'line-break'}
			{#if child.hard}<br />{/if}
		{/if}
	{/each}
</p>
