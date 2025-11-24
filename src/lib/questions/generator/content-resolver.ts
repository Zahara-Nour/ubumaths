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

import type { ContentField, ResolvedVariable } from '../types';
import type { TemplateMarkdown, ResolvedMarkdown } from '$lib/shared/markdown';
import { resolvedMarkdown, templateMarkdown } from '$lib/shared/markdown';
import { resolveVariableExpression } from './variable-resolver';
import { resolveColorReferences } from '../parser/color-parser';
import { convertToMarkdownSyntax } from './syntax-adapter';
import { contentFieldsToMarkdown } from './content-to-markdown';

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
	// Convert Questions syntax to Markdown before resolution if needed
	let resolvedContent = convertToMarkdownSyntax(markdown);

	// Resolve variables, random expressions, and eval expressions
	resolvedContent = resolveVariableExpression(resolvedContent, resolvedVariables, seed);

	// Also resolve color references (after variable resolution)
	resolvedContent = resolveColorReferences(resolvedContent, seed);

	return resolvedMarkdown(resolvedContent);
}

/**
 * Backward compatibility: resolve ContentField arrays
 *
 * @deprecated Use resolveMarkdownContent with TemplateMarkdown instead
 * @param fields - Array of content fields (old format)
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Array of resolved content fields
 */
export function resolveContentFields(
	fields: ContentField[],
	resolvedVariables: ResolvedVariable[],
	seed?: number
): ContentField[] {
	return fields.map((field) => resolveContentField(field, resolvedVariables, seed));
}

/**
 * Backward compatibility: resolve a single content field
 *
 * @deprecated Internal use only for backward compatibility
 * @param field - Content field to resolve
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved content field
 */
export function resolveContentField(
	field: ContentField,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): ContentField {
	// Convert Questions syntax to Markdown before resolution
	const markdownContent = convertToMarkdownSyntax(field.content);

	// Resolve content for both text and image fields (image URLs may contain variables)
	let resolvedContent = resolveVariableExpression(markdownContent, resolvedVariables, seed);

	// Also resolve color references (after variable resolution)
	resolvedContent = resolveColorReferences(resolvedContent, seed);

	return {
		type: field.type,
		content: resolvedContent
	};
}

/**
 * Convert ContentField array to TemplateMarkdown for migration
 *
 * Helps with migration from old ContentField[] format to new TemplateMarkdown format
 *
 * @param fields - ContentField array (old format)
 * @returns TemplateMarkdown string
 */
export function contentFieldsToTemplateMarkdown(fields: ContentField[]): TemplateMarkdown {
	if (!fields || fields.length === 0) {
		return templateMarkdown('');
	}

	const markdown = contentFieldsToMarkdown(fields);
	return templateMarkdown(markdown);
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
	// Convert Questions syntax to Markdown before resolution
	const markdownExpression = convertToMarkdownSyntax(expression);

	let resolved = resolveVariableExpression(markdownExpression, resolvedVariables, seed);
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
