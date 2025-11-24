/**
 * Content Resolver
 * ================
 *
 * Resolves markdown templates by replacing variables and generating
 * random values in markdown content.
 *
 * Uses variable-resolver which wraps shared library for full resolution pipeline.
 *
 * @module questions/generator/content-resolver
 */

import type { ResolvedVariable } from '../types';
import type { TemplateMarkdown, ResolvedMarkdown } from '$lib/shared/markdown';
import { resolvedMarkdown } from '$lib/shared/markdown';
import { resolveVariableExpression } from './variable-resolver';
import { resolveColorReferences } from '../parser/color-parser';

/**
 * Resolve markdown content by replacing all placeholders with values
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
	// Database now stores pure markdown syntax ({{...}}) directly
	// No conversion needed anymore - use markdown as-is

	// Resolve variables, random expressions, and eval expressions
	let resolvedContent = resolveVariableExpression(markdown, resolvedVariables, seed);

	// Also resolve color references (after variable resolution)
	resolvedContent = resolveColorReferences(resolvedContent, seed);

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
 * Resolve answer (can be string or array of strings)
 *
 * @param answer - Answer from template
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved answer
 */
export function resolveAnswer(
	answer: string | string[],
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string | string[] {
	if (Array.isArray(answer)) {
		return answer.map((ans) => resolveExpression(ans, resolvedVariables, seed));
	}

	return resolveExpression(answer, resolvedVariables, seed);
}
