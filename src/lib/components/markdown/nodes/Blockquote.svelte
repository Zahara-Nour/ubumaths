<!--
	Blockquote Component
	====================

	Renders a blockquote with:
	- Recursive support for nested blockquotes
	- Rich content support (paragraphs, lists, etc.)
	- Styled border and background
	- Accessible styling

	@see types.ts BlockquoteNode for the AST node type
-->
<script lang="ts">
	import type { BlockNode, InlineNode, ListItemNode } from '$lib/custom-markdown';
	import ParagraphNode from './ParagraphNode.svelte';
	import HeadingNode from './HeadingNode.svelte';
	import MathBlock from './MathBlock.svelte';
	import ImageDisplay from './ImageDisplay.svelte';
	import ListNode from './ListNode.svelte';
	import TableNode from './TableNode.svelte';
	import HorizontalRule from './HorizontalRule.svelte';
	import CodeBlock from './CodeBlock.svelte';
	// Self-import for recursive rendering (Svelte 5 pattern)
	import Blockquote from './Blockquote.svelte';

	interface Props {
		children: BlockNode[];
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();

	/**
	 * Type guards for different block node types
	 */
	function isParagraphNode(node: BlockNode): node is { type: 'paragraph'; children: InlineNode[] } {
		return node.type === 'paragraph';
	}

	function isHeadingNode(
		node: BlockNode
	): node is { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: InlineNode[] } {
		return node.type === 'heading';
	}

	function isMathBlockNode(node: BlockNode): node is { type: 'math-block'; expression: string; syntax: 'latex' | 'custom' } {
		return node.type === 'math-block';
	}

	function isListNode(
		node: BlockNode
	): node is { type: 'list'; ordered: boolean; start?: number; items: ListItemNode[] } {
		return node.type === 'list';
	}

	function isTableNode(node: BlockNode): node is {
		type: 'table';
		header: { content: string; align?: 'left' | 'center' | 'right' }[];
		rows: { content: string; align?: 'left' | 'center' | 'right' }[][];
		alignments: ('left' | 'center' | 'right')[];
	} {
		return node.type === 'table';
	}

	function isImageNode(node: BlockNode): node is {
		type: 'image';
		src: string;
		alt?: string;
		title?: string;
		sizeClass?: 'inline' | 'small' | 'medium' | 'large' | 'full';
		widthPercent?: number;
		alignment?: 'left' | 'center' | 'right';
		caption?: string;
		originalWidth?: number;
		originalHeight?: number;
	} {
		return node.type === 'image';
	}

	function isBlockquoteNode(
		node: BlockNode
	): node is { type: 'blockquote'; children: BlockNode[] } {
		return node.type === 'blockquote';
	}

	function isCodeBlockNode(
		node: BlockNode
	): node is { type: 'code-block'; code: string; language?: string } {
		return node.type === 'code-block';
	}
</script>

<blockquote
	class="my-4 border-l-4 border-muted-foreground/30 bg-muted/30 py-2 pl-4 text-foreground italic {className}"
>
	{#each children as child, index (index)}
		{#if isParagraphNode(child)}
			<ParagraphNode children={child.children} />
		{:else if isHeadingNode(child)}
			<HeadingNode level={child.level} children={child.children} />
		{:else if isMathBlockNode(child)}
			<MathBlock expression={child.expression} syntax={child.syntax} />
		{:else if isListNode(child)}
			<ListNode ordered={child.ordered} start={child.start} items={child.items} />
		{:else if isTableNode(child)}
			<TableNode header={child.header} rows={child.rows} alignments={child.alignments} />
		{:else if isImageNode(child)}
			<ImageDisplay
				src={child.src}
				alt={child.alt}
				title={child.title}
				sizeClass={child.sizeClass}
				widthPercent={child.widthPercent}
				alignment={child.alignment}
				caption={child.caption}
				originalWidth={child.originalWidth}
				originalHeight={child.originalHeight}
			/>
		{:else if isBlockquoteNode(child)}
			<!-- Recursive blockquote rendering -->
			<Blockquote children={child.children} />
		{:else if isCodeBlockNode(child)}
			<CodeBlock code={child.code} language={child.language} />
		{:else if child.type === 'horizontal-rule'}
			<HorizontalRule />
		{/if}
	{/each}
</blockquote>
