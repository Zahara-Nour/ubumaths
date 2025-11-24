/**
 * Shared Markdown Library
 * ========================
 *
 * Provides branded types and utilities for working with template
 * and resolved markdown in the UbuMaths application.
 *
 * @module shared/markdown
 */

// Export all types
export type { TemplateMarkdown, ResolvedMarkdown, MarkdownContent } from './types';

// Export all helper functions
export {
	templateMarkdown,
	resolvedMarkdown,
	hasUnresolvedSyntax,
	isTemplateMarkdown,
	isResolvedMarkdown,
	tryAsResolved,
	extractPlaceholders,
	getPlaceholderTypes
} from './types';
