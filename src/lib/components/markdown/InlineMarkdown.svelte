<!--
	InlineMarkdown Component
	========================

	Renders a single line of markdown content inline (no block wrapper).
	Useful for titles, labels, or any context where inline math expressions
	need to be rendered within a span.

	Takes markdown content as a string, parses it, and renders the first
	paragraph's inline content using InlineRenderer.

	@example
	```svelte
	<InlineMarkdown content="Title with $x^2$" />
	```

	@see InlineRenderer.svelte for the inline rendering
	@see MarkdownRenderer.svelte for full markdown rendering
-->
<script lang="ts">
	import { parseMarkdown } from '$lib/ubumark';
	import type { InlineNode, ParagraphNode } from '$lib/ubumark';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';
	import InlineRenderer from './InlineRenderer.svelte';
	import { provideContentLocale } from './content-locale';
	import type { ContentLocale } from '$lib/types/locale';

	interface Props {
		/** Markdown content to render inline */
		content: string;
		/** Additional CSS classes */
		class?: string;
		/** Configuration for generic function names (f, g, h, P, Q, etc.) */
		genericFunctions?: GenericFunctionConfig | null;
		/** Langue du contenu (séparateur décimal) ; absente : celle du parent, sinon fr */
		locale?: ContentLocale;
	}

	let { content, class: className = '', genericFunctions, locale }: Props = $props();

	provideContentLocale(() => locale);

	/**
	 * Parse the content and extract inline nodes from the first paragraph.
	 * Returns empty array if parsing fails or no paragraph found.
	 */
	let inlineNodes = $derived.by<InlineNode[]>(() => {
		if (!content) return [];

		try {
			const ast = parseMarkdown(content);
			// Find the first paragraph node
			const paragraph = ast.children.find(
				(node): node is ParagraphNode => node.type === 'paragraph'
			);
			return paragraph?.children ?? [];
		} catch (error) {
			console.error('InlineMarkdown parse error:', error);
			return [];
		}
	});
</script>

{#if inlineNodes.length > 0}
	<InlineRenderer children={inlineNodes} class={className} {genericFunctions} />
{:else if content}
	<!-- Fallback to plain text if parsing fails -->
	<span class={className}>{content}</span>
{/if}
