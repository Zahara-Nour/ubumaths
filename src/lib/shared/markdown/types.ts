/**
 * Shared Markdown Library - Type Definitions
 * ===========================================
 *
 * Branded types for distinguishing between template and resolved markdown.
 * Ensures type safety when working with our custom markdown syntax.
 *
 * Custom Markdown Syntax:
 * - Variables: {{variable}}
 * - Random: {{random:1-10}}, {{random:2.3}}, {{random:1-10!5}}
 * - Eval: {{eval:a+b}}
 * - Blanks: {{blank:N}}
 * - Inline math: $inline math$
 * - Block math: $$block math$$
 * - Images: ![alt](url)
 * - Standard markdown: headers, lists, tables, etc.
 *
 * @module shared/markdown/types
 */

// ============================================================================
// BRANDED TYPES
// ============================================================================

/**
 * Template markdown containing parameterization syntax
 *
 * This type represents markdown strings that may contain unresolved placeholders
 * such as {{variable}}, {{random:}}, {{eval:}}, or {{blank:N}}.
 * These strings require resolution before they can be rendered.
 *
 * @example Template with variables
 * ```typescript
 * const template: TemplateMarkdown = templateMarkdown(`
 *   # Exercise {{exerciseNumber}}
 *   Calculate: {{a}} + {{b}} = {{blank:1}}
 * `);
 * ```
 *
 * @example Template with random values
 * ```typescript
 * const template: TemplateMarkdown = templateMarkdown(`
 *   A number between {{random:1-10}} and {{random:20-30}}
 * `);
 * ```
 *
 * @example Template with expressions
 * ```typescript
 * const template: TemplateMarkdown = templateMarkdown(`
 *   The result is {{eval:a*b+c}}
 * `);
 * ```
 */
export type TemplateMarkdown = string & { readonly __brand: 'TemplateMarkdown' };

/**
 * Resolved markdown ready for rendering
 *
 * This type represents markdown strings where all parameterization placeholders
 * have been resolved to concrete values. These strings are ready to be passed
 * to the MarkdownRenderer component for display.
 *
 * @example Resolved markdown
 * ```typescript
 * const resolved: ResolvedMarkdown = resolvedMarkdown(`
 *   # Exercise 5
 *   Calculate: 12 + 7 = ___
 * `);
 * ```
 *
 * @example Math content
 * ```typescript
 * const resolved: ResolvedMarkdown = resolvedMarkdown(`
 *   The equation $x^2 + 3x + 2 = 0$ has two solutions.
 *   $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
 * `);
 * ```
 */
export type ResolvedMarkdown = string & { readonly __brand: 'ResolvedMarkdown' };

/**
 * Union type for any markdown content
 *
 * Useful when a function can accept either template or resolved markdown.
 */
export type MarkdownContent = TemplateMarkdown | ResolvedMarkdown;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a TemplateMarkdown branded type from a string
 *
 * This function performs a type cast without validation.
 * The string is assumed to potentially contain parameterization syntax.
 *
 * @param content - The markdown string that may contain templates
 * @returns The string branded as TemplateMarkdown
 *
 * @example
 * ```typescript
 * const template = templateMarkdown('Calculate {{a}} + {{b}}');
 * ```
 */
export function templateMarkdown(content: string): TemplateMarkdown {
	return content as TemplateMarkdown;
}

/**
 * Creates a ResolvedMarkdown branded type from a string
 *
 * This function performs a type cast without validation.
 * The string is assumed to have all placeholders already resolved.
 *
 * @param content - The markdown string with resolved values
 * @returns The string branded as ResolvedMarkdown
 *
 * @example
 * ```typescript
 * const resolved = resolvedMarkdown('Calculate 5 + 3');
 * ```
 */
export function resolvedMarkdown(content: string): ResolvedMarkdown {
	return content as ResolvedMarkdown;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Regex patterns for detecting unresolved syntax
 */
const UNRESOLVED_PATTERNS = {
	/** Matches {{anything}} including nested braces */
	placeholder: /\{\{[^}]+\}\}/,
	/** Matches {{variable}} pattern */
	variable: /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/,
	/** Matches {{random:...}} pattern */
	random: /\{\{random:[^}]+\}\}/,
	/** Matches {{eval:...}} pattern */
	eval: /\{\{eval:[^}]+\}\}/,
	/** Matches {{blank:N}} pattern where N is a number */
	blank: /\{\{blank:\d+\}\}/
};

/**
 * Checks if a string contains unresolved parameterization syntax
 *
 * This function detects the presence of any placeholder patterns that
 * indicate the string is a template requiring resolution.
 *
 * @param content - The markdown string to check
 * @returns true if the string contains unresolved placeholders, false otherwise
 *
 * @example
 * ```typescript
 * hasUnresolvedSyntax('Hello {{name}}'); // true
 * hasUnresolvedSyntax('Hello World'); // false
 * hasUnresolvedSyntax('Calculate {{random:1-10}}'); // true
 * hasUnresolvedSyntax('Calculate 7'); // false
 * ```
 */
export function hasUnresolvedSyntax(content: string): boolean {
	return UNRESOLVED_PATTERNS.placeholder.test(content);
}

/**
 * Type guard for TemplateMarkdown
 *
 * Checks if a markdown content is a template (contains unresolved syntax).
 *
 * @param content - The markdown content to check
 * @returns true if content is TemplateMarkdown, false if ResolvedMarkdown
 *
 * @example
 * ```typescript
 * const content: MarkdownContent = getContent();
 * if (isTemplateMarkdown(content)) {
 *   // TypeScript knows content is TemplateMarkdown here
 *   const resolved = await resolveTemplate(content);
 * }
 * ```
 */
export function isTemplateMarkdown(content: MarkdownContent): content is TemplateMarkdown {
	return hasUnresolvedSyntax(content);
}

/**
 * Type guard for ResolvedMarkdown
 *
 * Checks if a markdown content is resolved (no unresolved syntax).
 *
 * @param content - The markdown content to check
 * @returns true if content is ResolvedMarkdown, false if TemplateMarkdown
 *
 * @example
 * ```typescript
 * const content: MarkdownContent = getContent();
 * if (isResolvedMarkdown(content)) {
 *   // TypeScript knows content is ResolvedMarkdown here
 *   render(content);
 * }
 * ```
 */
export function isResolvedMarkdown(content: MarkdownContent): content is ResolvedMarkdown {
	return !hasUnresolvedSyntax(content);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Attempts to convert TemplateMarkdown to ResolvedMarkdown
 *
 * This function checks if a template actually contains any unresolved syntax.
 * If not, it can be safely treated as resolved markdown.
 *
 * @param template - The template markdown to check
 * @returns ResolvedMarkdown if no unresolved syntax, null otherwise
 *
 * @example
 * ```typescript
 * const template = templateMarkdown('Hello World'); // No placeholders
 * const resolved = tryAsResolved(template); // Returns ResolvedMarkdown
 *
 * const template2 = templateMarkdown('Hello {{name}}');
 * const resolved2 = tryAsResolved(template2); // Returns null
 * ```
 */
export function tryAsResolved(template: TemplateMarkdown): ResolvedMarkdown | null {
	if (!hasUnresolvedSyntax(template)) {
		return template as unknown as ResolvedMarkdown;
	}
	return null;
}

/**
 * Extracts all unresolved placeholders from markdown content
 *
 * Useful for debugging or analyzing what needs to be resolved.
 * Handles nested braces correctly.
 *
 * @param content - The markdown content to analyze
 * @returns Array of unique placeholder strings found
 *
 * @example
 * ```typescript
 * const placeholders = extractPlaceholders(templateMarkdown(`
 *   {{a}} + {{b}} = {{eval:a+b}}
 *   Random: {{random:1-10}}
 * `));
 * // Returns: ['{{a}}', '{{b}}', '{{eval:a+b}}', '{{random:1-10}}']
 * ```
 */
export function extractPlaceholders(content: string): string[] {
	const placeholders: string[] = [];
	let depth = 0;
	let start = -1;

	for (let i = 0; i < content.length - 1; i++) {
		if (content[i] === '{' && content[i + 1] === '{') {
			if (depth === 0) {
				start = i;
			}
			depth++;
			i++; // Skip next character since we processed it
		} else if (content[i] === '}' && content[i + 1] === '}') {
			depth--;
			if (depth === 0 && start !== -1) {
				placeholders.push(content.substring(start, i + 2));
				start = -1;
			}
			i++; // Skip next character since we processed it
		}
	}

	return [...new Set(placeholders)];
}

/**
 * Gets the type of placeholders present in the content
 *
 * @param content - The markdown content to analyze
 * @returns Object with boolean flags for each placeholder type
 *
 * @example
 * ```typescript
 * const types = getPlaceholderTypes(templateMarkdown('{{a}} + {{random:1-10}}'));
 * // Returns: { variables: true, random: true, eval: false, blanks: false }
 * ```
 */
export function getPlaceholderTypes(content: string): {
	variables: boolean;
	random: boolean;
	eval: boolean;
	blanks: boolean;
} {
	return {
		variables: UNRESOLVED_PATTERNS.variable.test(content),
		random: UNRESOLVED_PATTERNS.random.test(content),
		eval: UNRESOLVED_PATTERNS.eval.test(content),
		blanks: UNRESOLVED_PATTERNS.blank.test(content)
	};
}
