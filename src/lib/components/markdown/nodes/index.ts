/**
 * Markdown Node Components
 * ========================
 *
 * Svelte 5 components for rendering markdown AST nodes.
 * Used by the unified markdown rendering system.
 *
 * Components are organized by complexity:
 * - Simple: TextNode, MathInline, MathBlock, HorizontalRule
 * - Block: ParagraphNode, HeadingNode, CodeBlock, Blockquote
 * - Complex: ListNode, TableNode, ImageDisplay (with recursive/rich content support)
 *
 * @module components/markdown/nodes
 */

// Simple inline/block components
export { default as MathInline } from './MathInline.svelte';
export { default as MathBlock } from './MathBlock.svelte';
export { default as TextNode } from './TextNode.svelte';
export { default as HorizontalRule } from './HorizontalRule.svelte';

// Block-level text components
export { default as HeadingNode } from './HeadingNode.svelte';
export { default as ParagraphNode } from './ParagraphNode.svelte';
export { default as CodeBlock } from './CodeBlock.svelte';
export { default as Blockquote } from './Blockquote.svelte';

// Complex components with recursive/rich content support
export { default as ImageDisplay } from './ImageDisplay.svelte';
export { default as ListNode } from './ListNode.svelte';
export { default as TableNode } from './TableNode.svelte';
