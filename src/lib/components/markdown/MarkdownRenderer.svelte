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
	- Configurable list numbering schemes (auto-detection or explicit)

	Note: This component does NOT perform variable instantiation.
	Content should already be resolved before rendering.

	@see markdown-parser.ts for AST generation
	@see nodes/ for individual node renderers
	@module components/markdown/MarkdownRenderer
-->
<script lang="ts">
	import { parseMarkdown } from '$lib/custom-markdown';
	import type { DocumentNode, ParseOptions, InputState } from '$lib/custom-markdown';
	import type { MarkdownDisplayMode } from './types';
	import { getCachedAST, setCachedAST } from '$lib/utils/markdown-cache';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';

	// List numbering
	import { listNumberingStore } from '$lib/stores/listNumbering.svelte';
	import { getMaxEnumerateDepth } from '$lib/custom-markdown/utils/list-depth';
	import type { SchemeId, ListNumberingConfig } from '$lib/types/list-numbering';

	// Import node components
	import ParagraphNode from './nodes/ParagraphNode.svelte';
	import HeadingNode from './nodes/HeadingNode.svelte';
	import MathBlock from './nodes/MathBlock.svelte';
	import HorizontalRule from './nodes/HorizontalRule.svelte';
	import ListNode from './nodes/ListNode.svelte';
	import TableNode from './nodes/TableNode.svelte';
	import ImageDisplay from './nodes/ImageDisplay.svelte';
	import VideoDisplay from './nodes/VideoDisplay.svelte';
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
		/** Unified input states for both text blanks and math prompts */
		inputs?: InputState[];
		/** Callback when any input value changes (text or math) */
		onInputChange?: (index: number, value: string) => void;
		/** Callback when user submits a text blank (Enter key) */
		onInputSubmit?: (index: number) => void;
		/** Whether inputs are disabled (e.g., after submission) */
		inputsDisabled?: boolean;
		/** Override list numbering config for this render (uses global store by default) */
		listNumberingOverride?: Partial<ListNumberingConfig>;
		/** Callback when a hashtag is clicked */
		onHashtagClick?: (tag: string) => void;
		/** Callback when a mention is clicked */
		onMentionClick?: (username: string) => void;
		/**
		 * Configuration for generic function names in math parsing.
		 * Controls which identifiers are recognized as function calls (e.g., f(x), P'(x))
		 * vs implicit multiplication.
		 *
		 * - undefined: Use parser defaults (f, g, h, u, v, w, F, G, H)
		 * - null: Disable generic function parsing
		 * - GenericFunctionConfig: Custom configuration
		 */
		genericFunctions?: GenericFunctionConfig | null;
	}

	let {
		content,
		mode = 'rendered',
		parseOptions = {},
		class: className = '',
		onBlankFound,
		inputs = [],
		onInputChange,
		onInputSubmit,
		inputsDisabled = false,
		listNumberingOverride,
		onHashtagClick,
		onMentionClick,
		genericFunctions
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

	/**
	 * Compute the effective numbering scheme for lists.
	 * Uses auto-detection when scheme is 'auto', otherwise uses the specified scheme.
	 */
	const effectiveListScheme = $derived.by<SchemeId | null>(() => {
		// Get config (override takes precedence over store)
		const config = {
			...listNumberingStore.config,
			...listNumberingOverride
		};

		// If scheme is explicitly set (not auto), use it
		if (config.scheme !== 'auto') {
			return config.scheme as SchemeId;
		}

		// Auto-detect based on AST structure
		if (!ast) return null;

		const maxDepth = getMaxEnumerateDepth(ast);
		// If nested lists exist, use nesting scheme; otherwise use flat scheme
		return maxDepth > 1 ? config.schemeWithNesting : config.schemeWithoutNesting;
	});
</script>

{#if mode === 'rendered' || mode === 'both'}
	<div class="markdown-content {className}">
		{#if ast}
			<!-- Key includes genericFunctions to force re-render when it changes -->
			{#each ast.children as node, i (`${i}-${genericFunctions?.names?.length ?? 0}`)}
				{#if node.type === 'paragraph'}
					<ParagraphNode
						children={node.children}
						{inputs}
						{onInputChange}
						{onInputSubmit}
						{inputsDisabled}
						{onHashtagClick}
						{onMentionClick}
						{genericFunctions}
					/>
				{:else if node.type === 'heading'}
					<HeadingNode
						level={node.level}
						children={node.children}
						{onHashtagClick}
						{onMentionClick}
					/>
				{:else if node.type === 'math-block'}
					<MathBlock expression={node.expression} syntax={node.syntax} {genericFunctions} />
				{:else if node.type === 'horizontal-rule'}
					<HorizontalRule />
				{:else if node.type === 'list'}
					<ListNode
						ordered={node.ordered}
						start={node.start}
						items={node.items}
						effectiveScheme={effectiveListScheme}
						{onHashtagClick}
						{onMentionClick}
						{genericFunctions}
					/>
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
				{:else if node.type === 'video'}
					<VideoDisplay
						src={node.src}
						alt={node.alt}
						provider={node.provider}
						videoId={node.videoId}
						sizeClass={node.sizeClass}
						widthPercent={node.widthPercent}
						alignment={node.alignment}
						controls={node.controls}
						autoplay={node.autoplay}
						loop={node.loop}
						muted={node.muted}
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
