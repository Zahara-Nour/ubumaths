/**
 * Custom Markdown Types - Barrel Export
 * ======================================
 *
 * Central export point for all custom markdown types.
 * Re-exports types from ast, parser, template, and parameterization modules.
 *
 * @module ubumark/types
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
	HintReferenceNode,
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
	VariationTableNode,
	ProbabilityTreeNode,
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
// VARIATION TABLE TYPES
// ============================================================================

export type {
	// Position and markers
	VariationPosition,
	VariationMarker,
	// Sign row types
	SignValueSign,
	SignValueMarker,
	SignValue,
	SignRow,
	// Variation row types
	VariationValue,
	VariationRow,
	// Domain types
	DomainPoint,
	// Utility types
	TableRow,
	VariationTableParseError,
	VariationTableParseResult
} from './variation-table';

// ============================================================================
// PROBABILITY TREE TYPES
// ============================================================================

export type {
	// Probability value
	ProbabilityFormat,
	ProbabilityValue,
	// Tree structure
	ProbTreeBranch,
	ProbTreeNode,
	// Configuration
	ProbTreeConfig,
	// Parser types
	ProbTreeParseError,
	ProbTreeParseWarning,
	ProbTreeParseResult,
	ProbTreeBlockRange,
	// Utility types
	TreePath,
	CumulativeProbability
} from './probability-tree';

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
