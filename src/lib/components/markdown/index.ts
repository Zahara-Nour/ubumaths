/**
 * Markdown Rendering System
 * =========================
 *
 * Unified markdown rendering for Questions and Exercises.
 * This module provides components and utilities for parsing,
 * rendering, and interacting with mathematical markdown content.
 *
 * @module components/markdown
 *
 * @example Basic rendering
 * ```svelte
 * <script>
 *   import { MarkdownRenderer } from '$lib/components/markdown';
 * </script>
 *
 * <MarkdownRenderer content="Calculate $2 + 3$" />
 * ```
 *
 * @example With blanks
 * ```svelte
 * <script>
 *   import { MarkdownRenderer, type BlankState } from '$lib/components/markdown';
 *
 *   const blankStates = new Map<number, BlankState>([[1, { index: 1, value: '' }]]);
 * </script>
 *
 * <MarkdownRenderer
 *   content="The answer is {{blank:1}}"
 *   {blankStates}
 *   onBlankChange={(index, value) => console.log(index, value)}
 * />
 * ```
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// AST Node Types (re-exported from exercises/types)
export type {
	BaseNode,
	TextNode,
	MathInlineNode,
	MathBlockNode,
	ParagraphNode,
	HeadingNode,
	ListItemNode,
	ListNode,
	TableCellNode,
	TableNode,
	ImageNode,
	HorizontalRuleNode,
	BlockquoteNode,
	CodeBlockNode,
	LineBreakNode,
	InlineNode,
	BlockNode,
	ASTNode,
	DocumentNode
} from './types';

// Image Types
export type { ImageSizeClass, ImageAlignment, ImageSizeMapping } from './types';
export { DEFAULT_IMAGE_SIZE_MAPPINGS } from './types';

// Parser and Render Options
export type { ParseOptions, RenderOptions } from './types';

// Utility Types
export type { ParseResult, MathPlaceholder } from './types';

// Display Mode
export type { MarkdownDisplayMode } from './types';

// Component Props
export type { NodeRendererProps, MarkdownRendererOptions } from './types';

// Blank Types
export type { BlankState, BlankInputProps } from './types';

// Syntax Highlighting
export type { VariableHighlightConfig } from './types';

// Default Values
export { DEFAULT_HIGHLIGHT_CONFIG, DEFAULT_RENDERER_OPTIONS } from './types';

// ============================================================================
// COMPONENT EXPORTS
// ============================================================================

// Main renderer component
export { default as MarkdownRenderer } from './MarkdownRenderer.svelte';

// Markdown editor component
export { default as MarkdownEditor } from './MarkdownEditor.svelte';

// Editor Types
export type { ImageUploadConfig } from './types';

// Node components - named with Component suffix to avoid conflicts with AST types
export { default as MathBlockComponent } from './nodes/MathBlock.svelte';
export { default as MathInlineComponent } from './nodes/MathInline.svelte';
export { default as ParagraphNodeComponent } from './nodes/ParagraphNode.svelte';
export { default as HeadingNodeComponent } from './nodes/HeadingNode.svelte';
export { default as HorizontalRuleComponent } from './nodes/HorizontalRule.svelte';
export { default as TextNodeComponent } from './nodes/TextNode.svelte';

// Raw markdown viewer with syntax highlighting
export { default as MarkdownRaw } from './MarkdownRaw.svelte';

// Block-level node components
export { default as ListNodeComponent } from './nodes/ListNode.svelte';
export { default as TableNodeComponent } from './nodes/TableNode.svelte';
export { default as ImageDisplayComponent } from './nodes/ImageDisplay.svelte';
export { default as CodeBlockComponent } from './nodes/CodeBlock.svelte';
export { default as BlockquoteComponent } from './nodes/Blockquote.svelte';
export { default as VariationTableComponent } from './nodes/VariationTable.svelte';

// Utilities
export { escapeHtml } from './utils';

// Interactive components (fill-in-the-blank)
export { default as BlankInputComponent } from './nodes/BlankInput.svelte';
