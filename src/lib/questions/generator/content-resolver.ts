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
 * Regex to match expression markers at the start of math content.
 */
const EXPR_MARKER_REGEX = /^<<expr:(expression[a-zA-Z0-9]*)>>/;

/**
 * Convert content inside $...$ and $$...$$ from custom syntax to LaTeX
 *
 * After variable resolution, math zones contain custom mathAST syntax.
 * This function converts that syntax to LaTeX for rendering.
 *
 * Handles:
 * - `<<expr:NAME>>` markers: stripped before parsing, re-added after conversion
 * - `?` hole markers: preserved as `?` via toLatex({ preserveHoles: true }).
 *   Without this, the parser would emit \placeholder[N]{} with local 1-based
 *   indices per zone. assignBlankIndices needs raw `?` to assign global 0-based
 *   indices across statement blanks, text blanks, AND expression answerFormats.
 *
 * Note: ~...~ and ~~...~~ zones are NOT converted - they stay in custom
 * syntax for answer comparison and other non-display purposes.
 *
 * @param content - Content with resolved variables
 * @returns Content with math zones converted to LaTeX
 */
function convertMathZonesToLatex(content: string): string {
	let result = content;

	// Helper to convert a single expression, handling markers and ? preservation
	const convertExpression = (expr: string): string => {
		// Check for and strip expression marker <<expr:NAME>>
		let prefix = '';
		let mathContent = expr;
		const markerMatch = mathContent.match(EXPR_MARKER_REGEX);
		if (markerMatch) {
			prefix = markerMatch[0];
			mathContent = mathContent.slice(markerMatch[0].length);
		}

		const parseResult = parseCustomSafe(mathContent.trim());
		if (parseResult.ast) {
			// preserveHoles: ? stays as ? (not \placeholder[N]{}) for assignBlankIndices
			const latex = toLatex(parseResult.ast, { preserveHoles: true });
			return prefix + latex;
		}
		// On parse error, return original (will show error at render time)
		return prefix + mathContent;
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
	// Use displayValue when available (e.g., removeSpaces inserts {} between digits)
	let resolvedContent = resolveVariableExpression(markdown, resolvedVariables, seed, {
		useDisplayValue: true
	});

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
 * Insert <<expr:NAME>> markers before expression variable references in template markdown.
 *
 * For each {{expressionNAME}} reference where NAME is in the expressionNames set,
 * inserts `<<expr:NAME>>` before the reference. After variable resolution,
 * this produces `<<expr:NAME>>resolvedValue` in the output.
 *
 * @param content - Template markdown content
 * @param expressionNames - Set of variable names starting with "expression"
 * @returns Modified content with markers inserted
 */
export function insertExpressionMarkers(content: string, expressionNames: Set<string>): string {
	if (expressionNames.size === 0) return content;

	return content.replace(/\{\{(expression[a-zA-Z0-9]*)\}\}/g, (match, name: string) => {
		if (expressionNames.has(name)) {
			return `<<expr:${name}>>${match}`;
		}
		return match;
	});
}

/**
 * Resolve an answerFormat string: variable resolution + LaTeX conversion.
 *
 * The answerFormat can contain variable references (e.g., "{{a}}^?") and
 * custom mathAST syntax. This function:
 * 1. Resolves variables: "{{a}}^?" → "5^?"
 * 2. Converts to LaTeX, preserving ? markers: "5^?" → "5^{?}"
 *
 * The ? markers are preserved for later replacement by assignBlankIndices.
 *
 * @param answerFormat - Answer format template string
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved answerFormat in LaTeX with ? markers preserved
 */
export function resolveAnswerFormat(
	answerFormat: string,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string {
	// Stage 1: Resolve variables and color references
	let resolved = resolveVariableExpression(answerFormat, resolvedVariables, seed);
	resolved = resolveColorReferences(resolved, seed);

	// Stage 2: Convert to LaTeX
	// preserveHoles: ? stays as ? (not \placeholder[N]{}) for assignBlankIndices
	const parseResult = parseCustomSafe(resolved.trim());
	if (parseResult.ast) {
		resolved = toLatex(parseResult.ast, { preserveHoles: true });
	}

	return resolved;
}

/**
 * Convert a resolved expectedAnswer to LaTeX (for flash back display).
 *
 * @param expectedAnswer - Resolved expected answer string (e.g., "5", "10^5")
 * @returns LaTeX string, or undefined if conversion fails
 */
export function convertToLatex(expression: string): string {
	const parseResult = parseCustomSafe(expression.trim());
	if (parseResult.ast) {
		// preserveHoles: ? stays as ? (not \placeholder[N]{}) for assignBlankIndices
		return toLatex(parseResult.ast, { preserveHoles: true });
	}
	return expression;
}

/**
 * Resolve correctChoiceIndex (can be string, array of strings, or undefined for fill_in_blanks)
 *
 * @param solution - correctChoiceIndex from template (expected answer index)
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved correctChoiceIndex, or undefined if input is undefined
 */
export function resolveSolution(
	solution: string | string[],
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string | string[];
export function resolveSolution(
	solution: string | string[] | undefined,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string | string[] | undefined;
export function resolveSolution(
	solution: string | string[] | undefined,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string | string[] | undefined {
	if (solution === undefined) return undefined;

	if (Array.isArray(solution)) {
		return solution.map((sol) => resolveExpression(sol, resolvedVariables, seed));
	}

	return resolveExpression(solution, resolvedVariables, seed);
}
