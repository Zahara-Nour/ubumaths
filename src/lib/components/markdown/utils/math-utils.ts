/**
 * Math Utilities for Markdown Rendering
 *
 * Provides utility functions for converting math expressions to LaTeX
 * and extracting prompt indices from math nodes.
 *
 * @module components/markdown/utils/math-utils
 */

import { parseCustomSafe } from '$lib/mathAST/parser/custom';
import { toLatex, parseLatexSafe } from '$lib/mathAST';
import type { MathNode } from '$lib/mathAST/types';
import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';

/**
 * Convert a math expression to LaTeX for rendering.
 *
 * If the syntax is already LaTeX, returns the expression unchanged.
 * If the syntax is custom, parses and converts to LaTeX.
 * On parse error, returns LaTeX that displays the error in red.
 *
 * @param expression - The math expression string
 * @param syntax - The syntax type: 'latex' or 'custom'
 * @param genericFunctions - Optional configuration for generic function names.
 *   - undefined: Use parser defaults (f, g, h, u, v, w, F, G, H)
 *   - null: Disable generic function parsing entirely
 *   - GenericFunctionConfig: Custom configuration
 * @returns LaTeX string suitable for MathLive rendering
 */
export function expressionToLatex(
	expression: string,
	syntax: 'latex' | 'custom',
	genericFunctions?: GenericFunctionConfig | null
): string {
	if (syntax === 'latex') return expression;

	const result = parseCustomSafe(expression, { genericFunctions });
	if (result.ast) {
		return toLatex(result.ast);
	}

	// On error, display error message in red
	const errorMsg = result.errors?.[0]?.message ?? 'Parse error';
	const escapedMsg = errorMsg.replace(/[\\{}#$%&_^~]/g, '\\$&');
	return `\\textcolor{red}{\\text{${escapedMsg}}}`;
}

/**
 * Find all HoleNode indices in a math AST.
 *
 * Recursively traverses the AST to find all hole nodes (placeholders)
 * and returns their unique indices sorted in ascending order.
 *
 * @param node - The root MathNode to traverse
 * @returns Array of unique hole indices, sorted
 */
function findHoleIndices(node: MathNode): number[] {
	const indices: number[] = [];

	function traverse(n: MathNode): void {
		if (n.type === 'hole') {
			indices.push(n.index);
		}
		// Traverse children based on node type
		if ('left' in n && n.left) traverse(n.left as MathNode);
		if ('right' in n && n.right) traverse(n.right as MathNode);
		if ('operand' in n && n.operand) traverse(n.operand as MathNode);
		if ('base' in n && n.base) traverse(n.base as MathNode);
		if ('exponent' in n && n.exponent) traverse(n.exponent as MathNode);
		if ('numerator' in n && n.numerator) traverse(n.numerator as MathNode);
		if ('denominator' in n && n.denominator) traverse(n.denominator as MathNode);
		if ('argument' in n && n.argument) traverse(n.argument as MathNode);
		if ('content' in n && n.content) traverse(n.content as MathNode);
		if ('expression' in n && n.expression) traverse(n.expression as MathNode);
		if ('subscript' in n && n.subscript) traverse(n.subscript as MathNode);
		if ('superscript' in n && n.superscript) traverse(n.superscript as MathNode);
		if ('outer' in n && n.outer) traverse(n.outer as MathNode);
		if ('inner' in n && n.inner) traverse(n.inner as MathNode);
		if ('power' in n && n.power) traverse(n.power as MathNode);
		if ('children' in n && Array.isArray(n.children)) {
			n.children.forEach((child) => traverse(child as MathNode));
		}
		if ('args' in n && Array.isArray(n.args)) {
			n.args.forEach((arg) => traverse(arg as MathNode));
		}
	}

	traverse(node);
	return [...new Set(indices)].sort((a, b) => a - b);
}

/**
 * Extract prompt/placeholder indices from a math expression.
 *
 * Parses the expression using the appropriate parser based on syntax
 * and extracts all hole node indices.
 *
 * @param expression - The math expression string
 * @param syntax - The syntax type: 'latex' or 'custom'
 * @returns Array of unique hole indices, sorted
 */
export function extractPromptIndices(expression: string, syntax: 'latex' | 'custom'): number[] {
	const result = syntax === 'latex' ? parseLatexSafe(expression) : parseCustomSafe(expression);
	if (!result.ast) return [];
	return findHoleIndices(result.ast);
}

/**
 * Check if expression has prompts/placeholders.
 *
 * @param expression - The math expression string
 * @param syntax - The syntax type: 'latex' or 'custom'
 * @returns true if the expression contains at least one hole node
 */
export function hasPrompts(expression: string, syntax: 'latex' | 'custom'): boolean {
	return extractPromptIndices(expression, syntax).length > 0;
}
