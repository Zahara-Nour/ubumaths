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

// ============================================================================
// PROBABILITY TREE GENERATORS
// ============================================================================

export { generateProbabilityTreeLatex } from './probability-tree-latex';
export { generateProbabilityTreeTypst } from './probability-tree-typst';
export type { ProbTreeLatexOptions } from './probability-tree-latex';
export type { ProbTreeTypstOptions } from './probability-tree-typst';
