<!--
	ListNode Component
	==================

	Renders an ordered or unordered list with support for:
	- Nested lists (recursive rendering)
	- Custom starting number for ordered lists
	- Rich content in list items (paragraphs, nested lists, etc.)

	The component handles recursive rendering by importing BlockRenderer
	which in turn can render nested ListNode components.

	@see ExerciseDisplay.svelte for original renderList() implementation
-->
<script lang="ts">
	import type { ListItemNode, ASTNode, InlineNode } from '$lib/exercises/types';
	import ParagraphNode from './ParagraphNode.svelte';
	import MathBlock from './MathBlock.svelte';
	import ImageDisplay from './ImageDisplay.svelte';
	import HorizontalRule from './HorizontalRule.svelte';
	import HeadingNode from './HeadingNode.svelte';
	import TableNode from './TableNode.svelte';
	// Self-import for recursive rendering (Svelte 5 pattern)
	import ListNode from './ListNode.svelte';

	interface Props {
		ordered: boolean;
		start?: number;
		items: ListItemNode[];
		class?: string;
	}

	let { ordered, start = 1, items, class: className = '' }: Props = $props();

	// CSS class for list type
	let listClass = $derived(ordered ? 'list-decimal' : 'list-disc');

	/**
	 * Check if node is a list node for recursive rendering
	 */
	function isListNode(
		node: ASTNode
	): node is { type: 'list'; ordered: boolean; start?: number; items: ListItemNode[] } {
		return node.type === 'list';
	}

	/**
	 * Check if node is an image node
	 */
	function isImageNode(node: ASTNode): node is {
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

	/**
	 * Check if node is a paragraph node
	 */
	function isParagraphNode(node: ASTNode): node is { type: 'paragraph'; children: InlineNode[] } {
		return node.type === 'paragraph';
	}

	/**
	 * Check if node is a heading node
	 */
	function isHeadingNode(
		node: ASTNode
	): node is { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: InlineNode[] } {
		return node.type === 'heading';
	}

	/**
	 * Check if node is a math-block node
	 */
	function isMathBlockNode(node: ASTNode): node is { type: 'math-block'; latex: string } {
		return node.type === 'math-block';
	}

	/**
	 * Check if node is a table node
	 */
	function isTableNode(node: ASTNode): node is {
		type: 'table';
		header: { content: string; align?: 'left' | 'center' | 'right' }[];
		rows: { content: string; align?: 'left' | 'center' | 'right' }[][];
		alignments: ('left' | 'center' | 'right')[];
	} {
		return node.type === 'table';
	}
</script>

{#if ordered}
	<ol class="{listClass} my-4 text-foreground {className}" start={start > 1 ? start : undefined}>
		{#each items as item, itemIndex (itemIndex)}
			<li class="mb-2 ml-6 text-foreground">
				{#each item.children as child, childIndex (childIndex)}
					{#if isListNode(child)}
						<!-- Recursive list rendering -->
						<ListNode ordered={child.ordered} start={child.start} items={child.items} />
					{:else if isParagraphNode(child)}
						<ParagraphNode children={child.children} />
					{:else if isHeadingNode(child)}
						<HeadingNode level={child.level} children={child.children} />
					{:else if isMathBlockNode(child)}
						<MathBlock latex={child.latex} />
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
					{:else if isTableNode(child)}
						<TableNode header={child.header} rows={child.rows} alignments={child.alignments} />
					{:else if child.type === 'horizontal-rule'}
						<HorizontalRule />
					{/if}
				{/each}
			</li>
		{/each}
	</ol>
{:else}
	<ul class="{listClass} my-4 text-foreground {className}">
		{#each items as item, itemIndex (itemIndex)}
			<li class="mb-2 ml-6 text-foreground">
				{#each item.children as child, childIndex (childIndex)}
					{#if isListNode(child)}
						<!-- Recursive list rendering -->
						<ListNode ordered={child.ordered} start={child.start} items={child.items} />
					{:else if isParagraphNode(child)}
						<ParagraphNode children={child.children} />
					{:else if isHeadingNode(child)}
						<HeadingNode level={child.level} children={child.children} />
					{:else if isMathBlockNode(child)}
						<MathBlock latex={child.latex} />
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
					{:else if isTableNode(child)}
						<TableNode header={child.header} rows={child.rows} alignments={child.alignments} />
					{:else if child.type === 'horizontal-rule'}
						<HorizontalRule />
					{/if}
				{/each}
			</li>
		{/each}
	</ul>
{/if}
