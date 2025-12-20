/**
 * Ubumark Library - Main Entry Point
 * ===========================================
 *
 * Complete markdown processing library for UbuMaths educational content.
 * Provides parsing, parameterization, and template resolution for mathematical exercises.
 *
 * @module ubumark
 *
 * @example Basic parsing
 * ```typescript
 * import { parseMarkdown } from '$lib/ubumark';
 *
 * const doc = parseMarkdown('# Title\n\nSome **bold** text with $x = 5$');
 * ```
 *
 * @example Template resolution
 * ```typescript
 * import { resolveVariables, resolveText, templateMarkdown } from '$lib/ubumark';
 *
 * const variables = [
 *   { name: 'a', expression: '{{random:1..10}}' },
 *   { name: 'b', expression: '{{random:1..10}}' },
 *   { name: 'sum', expression: '{{eval:a+b}}' }
 * ];
 *
 * const template = templateMarkdown('{{a}} + {{b}} = {{sum}}');
 * const resolved = resolveVariables(variables, 12345);
 * const text = resolveText(template, resolved);
 * ```
 *
 * @example Validation
 * ```typescript
 * import { validateVariables, detectCircularDependencies } from '$lib/ubumark';
 *
 * const result = validateVariables(variables);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 *
 * const circularResult = detectCircularDependencies(variables);
 * if (!circularResult.valid) {
 *   console.error('Circular dependency detected:', circularResult.errors[0].path);
 * }
 * ```
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// AST Types
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
	VariationTableNode,
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
} from './types';

// Variation Table Types
export type {
	VariationPosition,
	VariationMarker,
	SignValueSign,
	SignValueMarker,
	SignValue,
	SignRow,
	VariationValue,
	VariationRow,
	DomainPoint,
	TableRow as VariationTableRow,
	VariationTableParseError,
	VariationTableParseResult
} from './types';

// Parser Types
export type { ParseOptions, ParseResult, MathPlaceholder, RenderOptions } from './types';

// Template Types (Branded Types)
export type { TemplateMarkdown, ResolvedMarkdown, MarkdownContent } from './types';

// Parameterization Types
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
} from './types';

// Code block types
export type { CodeBlockRange } from './parser';

// ============================================================================
// CONSTANT EXPORTS
// ============================================================================

export { DEFAULT_IMAGE_SIZE_MAPPINGS } from './types';
export { GLOBAL_DISPLAY_DEFAULTS } from './parameterization';

// ============================================================================
// TEMPLATE UTILITIES
// ============================================================================

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
} from './types';

// ============================================================================
// PARSER EXPORTS
// ============================================================================

export {
	// Main parse function
	parseMarkdown,
	// Utility functions
	escapeMarkdown,
	stripMarkdown,
	countWords,
	getSummary,
	// AST traversal
	walkAST,
	findNodes
} from './parser';

// Math Extraction
export {
	// Core extraction
	extractMath,
	// Placeholder detection
	isMathPlaceholder,
	getPlaceholderIndex,
	// Restoration
	findPlaceholder,
	splitTextWithPlaceholders,
	// Utilities
	getMathStats
} from './parser';

// Sub-parsers (advanced usage)
export {
	// List parser
	parseList,
	findListBlocks,
	isListItem,
	getListType,
	countListItems,
	flattenList,
	// Table parser
	parseTable,
	findTableBlocks,
	isTableRow,
	isAlignmentRow,
	isValidTable,
	getColumnCount,
	getRowCount,
	getCellValue,
	tableToArray,
	isEmptyTable,
	// Code block parser
	parseCodeBlock,
	findCodeBlocks,
	isCodeFence,
	containsMathPlaceholders,
	extractLanguage,
	isCodeBlockClosed,
	countCodeLines,
	getFenceStyle,
	// Blockquote parser
	parseBlockquote,
	findBlockquoteBlocks,
	isBlockquoteLine,
	extractBlockquoteContent,
	getBlockquoteLevel,
	hasNestedBlockquotes,
	normalizeBlockquoteLines
} from './parser';

// ============================================================================
// PARAMETERIZATION EXPORTS
// ============================================================================

// Display Options
export { resolveDisplayOptions } from './parameterization';

// Parsers
export {
	tokenize,
	parseVariableReference,
	parseRandomSpec,
	parseEvalExpression,
	parseEvalExpressionWithModifiers
} from './parameterization';

// Resolvers
export {
	resolveVariables,
	resolveExpression,
	generateRandomNumber,
	resolveText
} from './parameterization';

export type { ResolveTextOptions } from './parameterization';

// Validators
export { detectCircularDependencies, validateVariables } from './parameterization';

// Expression Transforms
export { applyDisplayTransforms, canTransform, getExpressionStructure } from './parameterization';

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

// List depth analysis
export { getMaxEnumerateDepth, getEnumerateDepth } from './utils/list-depth';

// ============================================================================
// GENERATOR EXPORTS
// ============================================================================

// LaTeX Generator
export { generateLatex, escapeLatex, resolveLatexImagePath, markdownToLatex } from './generators';

// Typst Generator
export {
	generateTypst,
	escapeTypst,
	escapeTypstBrackets,
	resolveTypstImagePath,
	markdownToTypst,
	transpileImage,
	convertLatexToTypstMath
} from './generators';

// ============================================================================
// IMPORTER EXPORTS
// ============================================================================

// LaTeX Importer
export {
	// Main transpiler function
	transpileLatexToMarkdown,
	// Splitter functions
	splitStatementAndSolution,
	detectSplitMethod,
	// Tokenizer
	tokenizeLatex,
	// Types
	type LatexToMarkdownOptions,
	type TranspileResult,
	type TranspileWarning,
	type SplitResult,
	type SplitMethod
} from './importers';
