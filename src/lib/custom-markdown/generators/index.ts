/**
 * Custom Markdown Generators
 * ==========================
 *
 * This module exports generators that convert markdown AST to various output formats.
 *
 * @module custom-markdown/generators
 */

// ============================================================================
// LATEX GENERATOR
// ============================================================================

export {
	generateLatex,
	escapeLatex,
	resolveImagePath as resolveLatexImagePath,
	markdownToLatex
} from './latex-generator';

// ============================================================================
// TYPST GENERATOR
// ============================================================================

export {
	generateTypst,
	escapeTypst,
	escapeTypstBrackets,
	resolveImagePath as resolveTypstImagePath,
	markdownToTypst,
	transpileImage,
	convertLatexToTypstMath
} from './typst-generator';
