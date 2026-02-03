/**
 * Content Resolver
 * ================
 *
 * Resolves markdown templates by replacing variables and generating
 * random values in markdown content.
 *
 * Uses variable-resolver which wraps shared library for full resolution pipeline.
 *
 * Key feature: After variable resolution, content inside $...$ and $$...$$ delimiters
 * is converted from custom mathAST syntax to LaTeX. Content inside ~...~ and ~~...~~
 * remains in custom syntax (for answer comparison, etc.).
 *
 * @module questions/generator/content-resolver
 */

import type { ResolvedVariable } from '../types';
import type { TemplateMarkdown, ResolvedMarkdown } from '$lib/ubumark';
import { resolvedMarkdown } from '$lib/ubumark';
import { resolveVariableExpression } from './variable-resolver';
import { resolveColorReferences } from '../parser/color-parser';
import { parseCustomSafe, toLatex } from '$lib/mathAST';

// ============================================================================
// MATH ZONE CONVERSION
// ============================================================================

/**
 * Regex patterns for math delimiters
 *
 * Important: Process block math ($$...$$) before inline ($...$) to avoid
 * misinterpreting $$ as two inline delimiters.
 */
const BLOCK_MATH_REGEX = /\$\$([\s\S]+?)\$\$/g;
const INLINE_MATH_REGEX = /\$([^$\n]+)\$/g;

/**
 * Convert content inside $...$ and $$...$$ from custom syntax to LaTeX
 *
 * After variable resolution, math zones contain custom mathAST syntax.
 * This function converts that syntax to LaTeX for rendering.
 *
 * Note: ~...~ and ~~...~~ zones are NOT converted - they stay in custom
 * syntax for answer comparison and other non-display purposes.
 *
 * @param content - Content with resolved variables
 * @returns Content with math zones converted to LaTeX
 *
 * @example
 * ```typescript
 * // Custom syntax in $...$
 * convertMathZonesToLatex('Calculate $a/b$')
 * // → 'Calculate $\\frac{a}{b}$'
 *
 * // Block math
 * convertMathZonesToLatex('$$x^2 + 2x + 1$$')
 * // → '$$x^{2} + 2 x + 1$$'
 *
 * // ~...~ stays unchanged
 * convertMathZonesToLatex('Answer: ~a+b~')
 * // → 'Answer: ~a+b~' (no conversion)
 * ```
 */
function convertMathZonesToLatex(content: string): string {
	let result = content;

	// Helper to convert a single expression
	const convertExpression = (expr: string): string => {
		const parseResult = parseCustomSafe(expr.trim());
		if (parseResult.ast) {
			return toLatex(parseResult.ast);
		}
		// On parse error, return original (will show error at render time)
		return expr;
	};

	// Convert block math $$...$$ first (before inline to avoid conflicts)
	result = result.replace(BLOCK_MATH_REGEX, (_match, innerContent: string) => {
		const converted = convertExpression(innerContent);
		return `$$${converted}$$`;
	});

	// Convert inline math $...$
	result = result.replace(INLINE_MATH_REGEX, (_match, innerContent: string) => {
		const converted = convertExpression(innerContent);
		return `$${converted}$`;
	});

	return result;
}

// ============================================================================
// CONTENT RESOLUTION
// ============================================================================

/**
 * Resolve markdown content by replacing all placeholders with values
 *
 * Pipeline:
 * 1. Replace {{var}}, {{random:...}}, {{eval:...}} with resolved values
 * 2. Resolve color references
 * 3. Convert math zones ($...$, $$...$$) from custom syntax to LaTeX
 *
 * @param markdown - Template markdown containing placeholders
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved markdown ready for rendering
 */
export function resolveMarkdownContent(
	markdown: TemplateMarkdown,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): ResolvedMarkdown {
	// Stage 1: Resolve variables, random expressions, and eval expressions
	let resolvedContent = resolveVariableExpression(markdown, resolvedVariables, seed);

	// Stage 2: Resolve color references
	resolvedContent = resolveColorReferences(resolvedContent, seed);

	// Stage 3: Convert math zones ($...$, $$...$$) from custom to LaTeX
	// Note: ~...~ and ~~...~~ remain in custom syntax
	resolvedContent = convertMathZonesToLatex(resolvedContent);

	return resolvedMarkdown(resolvedContent);
}

/**
 * Resolve a string expression (for answers, blanks, etc.)
 *
 * @param expression - Expression string
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved string
 */
export function resolveExpression(
	expression: string,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string {
	// Database now stores pure markdown syntax ({{...}}) directly
	// No conversion needed anymore
	let resolved = resolveVariableExpression(expression, resolvedVariables, seed);
	// Also resolve color references
	resolved = resolveColorReferences(resolved, seed);
	return resolved;
}

/**
 * Resolve solution (can be string or array of strings)
 *
 * @param solution - Solution from template (expected answer)
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved solution
 */
export function resolveSolution(
	solution: string | string[],
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string | string[] {
	if (Array.isArray(solution)) {
		return solution.map((sol) => resolveExpression(sol, resolvedVariables, seed));
	}

	return resolveExpression(solution, resolvedVariables, seed);
}
