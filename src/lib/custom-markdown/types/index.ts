/**
 * Custom Markdown Types - Barrel Export
 * ======================================
 *
 * Central export point for all custom markdown types.
 * Re-exports types from ast, parser, template, and parameterization modules.
 *
 * @module custom-markdown/types
 */

// ============================================================================
// AST TYPES
// ============================================================================

export type {
	// Base
	BaseNode,
	// Inline nodes
	TextNode,
	MathInlineNode,
	LineBreakNode,
	BlankNode,
	LinkNode,
	HashtagNode,
	MentionNode,
	InlineNode,
	// Block nodes
	ParagraphNode,
	HeadingNode,
	ListItemNode,
	ListNode,
	TableCellNode,
	TableNode,
	MathBlockNode,
	ImageNode,
	VideoNode,
	HorizontalRuleNode,
	BlockquoteNode,
	CodeBlockNode,
	BlockNode,
	// Composite
	ASTNode,
	DocumentNode,
	// Image types
	ImageSizeClass,
	ImageAlignment,
	ImageSizeMapping,
	// Video types
	VideoProvider,
	// Input state
	InputState
} from './ast';

export { DEFAULT_IMAGE_SIZE_MAPPINGS } from './ast';

// ============================================================================
// PARSER TYPES
// ============================================================================

export type { ParseOptions, ParseResult, MathPlaceholder, RenderOptions } from './parser';

// ============================================================================
// TEMPLATE TYPES (Branded Types)
// ============================================================================

export type { TemplateMarkdown, ResolvedMarkdown, MarkdownContent } from './template';

export {
	// Helper functions
	templateMarkdown,
	resolvedMarkdown,
	// Type guards
	hasUnresolvedSyntax,
	isTemplateMarkdown,
	isResolvedMarkdown,
	// Utility functions
	tryAsResolved,
	extractPlaceholders,
	getPlaceholderTypes
} from './template';

// ============================================================================
// PARAMETERIZATION TYPES
// ============================================================================

export type {
	// Tokens
	Token,
	// Variables
	Variable,
	ResolvedVariable,
	// Random
	NumberOrVariable,
	Exclusion,
	RandomSpec,
	// Eval
	EvalModifiers,
	ParsedEvalExpression,
	// Resolution
	ResolutionContext,
	ValidationResult,
	ValidationError,
	// Display
	DisplayOptions
} from './parameterization';
