/**
 * Custom Markdown Parser - Barrel Export
 * =======================================
 *
 * Central export point for all markdown parsing utilities.
 * This module provides a complete markdown parsing solution with
 * support for math expressions, lists, tables, code blocks, and more.
 *
 * @module ubumark/parser
 */

// ============================================================================
// MAIN PARSER EXPORTS
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
} from './markdown-parser';

// ============================================================================
// MATH EXTRACTOR EXPORTS
// ============================================================================

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
} from './math-extractor';

// ============================================================================
// SUB-PARSER EXPORTS (for advanced usage)
// ============================================================================

// List parser
export {
	parseList,
	findListBlocks,
	isListItem,
	getListType,
	countListItems,
	flattenList
} from './list-parser';

// Table parser
export {
	parseTable,
	findTableBlocks,
	isTableRow,
	isAlignmentRow,
	isValidTable,
	getColumnCount,
	getRowCount,
	getCellValue,
	tableToArray,
	isEmptyTable
} from './table-parser';

// Code block parser
export {
	parseCodeBlock,
	findCodeBlocks,
	isCodeFence,
	containsMathPlaceholders,
	extractLanguage,
	isCodeBlockClosed,
	countCodeLines,
	getFenceStyle
} from './code-block-parser';

export type { CodeBlockRange } from './code-block-parser';

// Blockquote parser
export {
	parseBlockquote,
	findBlockquoteBlocks,
	isBlockquoteLine,
	extractBlockquoteContent,
	getBlockquoteLevel,
	hasNestedBlockquotes,
	normalizeBlockquoteLines
} from './blockquote-parser';

// Variation table parser
export {
	parseVariationTable,
	parseVariationTableContent,
	findVariationBlocks,
	isVariationBlockStart,
	isBlockEnd,
	hasSignRows,
	hasVariationRows,
	getSignRows,
	getVariationRows,
	getDomainPointCount
} from './variation-table-parser';

export type { VariationBlockRange } from './variation-table-parser';

// ============================================================================
// TYPE RE-EXPORTS (for convenience)
// ============================================================================

export type {
	// AST Node types
	ASTNode,
	BlockNode,
	InlineNode,
	// Block nodes
	ParagraphNode,
	HeadingNode,
	CodeBlockNode,
	BlockquoteNode,
	ListNode,
	ListItemNode,
	HorizontalRuleNode,
	ImageNode,
	TableNode,
	TableCellNode,
	MathBlockNode,
	VariationTableNode,
	// Inline nodes
	TextNode,
	MathInlineNode,
	LineBreakNode,
	BlankNode,
	// Document
	DocumentNode,
	// Parser types
	ParseOptions,
	MathPlaceholder,
	// Image types
	ImageSizeClass,
	ImageAlignment,
	// Variation table types
	VariationPosition,
	VariationMarker,
	SignValue,
	SignRow,
	VariationValue,
	VariationRow,
	DomainPoint,
	TableRow,
	VariationTableParseError,
	VariationTableParseResult
} from '../types';
