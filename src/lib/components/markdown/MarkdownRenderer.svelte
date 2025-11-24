<!--
	MarkdownRenderer Component
	==========================

	Main orchestrator component for rendering markdown content.
	Takes markdown content, parses it to AST, and renders using
	specialized node components.

	Features:
	- Parses markdown to AST using parseMarkdown()
	- Supports multiple display modes: rendered, raw, both
	- Renders block nodes with appropriate components
	- Graceful error handling for parse failures
	- Callback support for blank detection

	Note: This component does NOT perform variable instantiation.
	Content should already be resolved before rendering.

	@see markdown-parser.ts for AST generation
	@see nodes/ for individual node renderers
	@module components/markdown/MarkdownRenderer
-->
<script lang="ts">
	import { parseMarkdown } from '$lib/exercises/parser/markdown-parser';
	import type { DocumentNode, ParseOptions } from '$lib/exercises/types';
	import type { BlankState, MarkdownDisplayMode } from './types';
	import { getCachedAST, setCachedAST } from '$lib/utils/markdown-cache';

	// Import node components
	import ParagraphNode from './nodes/ParagraphNode.svelte';
	import HeadingNode from './nodes/HeadingNode.svelte';
	import MathBlock from './nodes/MathBlock.svelte';
	import HorizontalRule from './nodes/HorizontalRule.svelte';
	import ListNode from './nodes/ListNode.svelte';
	import TableNode from './nodes/TableNode.svelte';
	import ImageDisplay from './nodes/ImageDisplay.svelte';
	import CodeBlock from './nodes/CodeBlock.svelte';
	import Blockquote from './nodes/Blockquote.svelte';

	// Raw markdown viewer with syntax highlighting
	import MarkdownRaw from './MarkdownRaw.svelte';

	interface Props {
		/** Markdown content to render (template or resolved instance) */
		content: string;
		/** Display mode: 'rendered' | 'raw' | 'both' */
		mode?: MarkdownDisplayMode;
		/** Options passed to the markdown parser */
		parseOptions?: ParseOptions;
		/** Additional CSS classes for the container */
		class?: string;
		/** Callback when a blank placeholder is found (for fill_in_blanks) */
		onBlankFound?: (index: number) => void;
		/** State of all blanks (indexed by blank index) - for fill_in_blanks */
		blankStates?: Map<number, BlankState>;
		/** Callback when a blank value changes */
		onBlankChange?: (index: number, value: string) => void;
		/** Callback when user submits a blank (Enter key) */
		onBlankSubmit?: (index: number) => void;
		/** Whether blanks are disabled (e.g., after submission) */
		blanksDisabled?: boolean;
	}

	let {
		content,
		mode = 'rendered',
		parseOptions = {},
		class: className = '',
		onBlankFound,
		blankStates,
		onBlankChange,
		onBlankSubmit,
		blanksDisabled = false
	}: Props = $props();

	/**
	 * Parse the markdown content into an AST.
	 * Uses LRU cache to avoid re-parsing identical content.
	 * Returns null if parsing fails.
	 */
	let ast = $derived.by<DocumentNode | null>(() => {
		if (!content) {
			return { type: 'document', children: [] };
		}

		// Check cache first
		const cached = getCachedAST(content, parseOptions);
		if (cached) {
			return cached;
		}

		// Parse and cache
		try {
			const parsed = parseMarkdown(content, parseOptions);
			setCachedAST(content, parsed, parseOptions);
			return parsed;
		} catch (error) {
			console.error('Markdown parse error:', error);
			return null;
		}
	});

	// Track blanks found during render (for future use with onBlankFound)
	// This will be enhanced when blank handling is implemented
	$effect(() => {
		if (onBlankFound && ast) {
			// TODO: Implement blank detection during AST traversal
			// This will be part of the fill_in_blanks feature
		}
	});
</script>

{#if mode === 'rendered' || mode === 'both'}
	<div class="markdown-content {className}">
		{#if ast}
			{#each ast.children as node (node)}
				{#if node.type === 'paragraph'}
					<ParagraphNode
						children={node.children}
						{blankStates}
						{onBlankChange}
						{onBlankSubmit}
						{blanksDisabled}
					/>
				{:else if node.type === 'heading'}
					<HeadingNode level={node.level} children={node.children} />
				{:else if node.type === 'math-block'}
					<MathBlock latex={node.latex} />
				{:else if node.type === 'horizontal-rule'}
					<HorizontalRule />
				{:else if node.type === 'list'}
					<ListNode ordered={node.ordered} start={node.start} items={node.items} />
				{:else if node.type === 'table'}
					<TableNode header={node.header} rows={node.rows} alignments={node.alignments} />
				{:else if node.type === 'image'}
					<ImageDisplay
						src={node.src}
						alt={node.alt}
						title={node.title}
						sizeClass={node.sizeClass}
						widthPercent={node.widthPercent}
						alignment={node.alignment}
						caption={node.caption}
						originalWidth={node.originalWidth}
						originalHeight={node.originalHeight}
					/>
				{:else if node.type === 'code-block'}
					<CodeBlock code={node.code} language={node.language} />
				{:else if node.type === 'blockquote'}
					<Blockquote children={node.children} />
				{/if}
			{/each}
		{:else}
			<p class="text-muted-foreground">Erreur de parsing du markdown</p>
		{/if}
	</div>
{/if}

{#if mode === 'raw' || mode === 'both'}
	<MarkdownRaw {content} />
{/if}

<style>
	/* Prose-like styling for markdown content */
	.markdown-content {
		line-height: 1.6;
	}

	/* Spacing between block elements */
	.markdown-content > :global(*) {
		margin-bottom: 1rem;
	}

	.markdown-content > :global(*:last-child) {
		margin-bottom: 0;
	}
</style>
