/**
 * Tests for Markdown Types
 * =========================
 *
 * Type tests and usage examples for branded markdown types.
 */

import { describe, it, expect } from 'vitest';
import {
	templateMarkdown,
	resolvedMarkdown,
	hasUnresolvedSyntax,
	isTemplateMarkdown,
	isResolvedMarkdown,
	tryAsResolved,
	extractPlaceholders,
	getPlaceholderTypes,
	type TemplateMarkdown,
	type ResolvedMarkdown,
	type MarkdownContent
} from './types';

describe('Markdown Types', () => {
	describe('Branded type creation', () => {
		it('should create TemplateMarkdown from string', () => {
			const template = templateMarkdown('Hello {{name}}');
			expect(template).toBe('Hello {{name}}');
			// Type assertion to verify branding
			const _typeCheck: TemplateMarkdown = template;
		});

		it('should create ResolvedMarkdown from string', () => {
			const resolved = resolvedMarkdown('Hello World');
			expect(resolved).toBe('Hello World');
			// Type assertion to verify branding
			const _typeCheck: ResolvedMarkdown = resolved;
		});
	});

	describe('hasUnresolvedSyntax', () => {
		it('should detect variable placeholders', () => {
			expect(hasUnresolvedSyntax('{{name}}')).toBe(true);
			expect(hasUnresolvedSyntax('{{userName}}')).toBe(true);
			expect(hasUnresolvedSyntax('Hello {{name}}!')).toBe(true);
		});

		it('should detect random placeholders', () => {
			expect(hasUnresolvedSyntax('{{random:1..10}}')).toBe(true);
			expect(hasUnresolvedSyntax('{{random:2.3}}')).toBe(true);
			expect(hasUnresolvedSyntax('{{random:1..10!5}}')).toBe(true);
			expect(hasUnresolvedSyntax('{{random:1..10!5,7..9}}')).toBe(true);
		});

		it('should detect eval placeholders', () => {
			expect(hasUnresolvedSyntax('{{eval:a+b}}')).toBe(true);
			expect(hasUnresolvedSyntax('{{eval:x*2+y}}')).toBe(true);
		});

		it('should detect blank placeholders', () => {
			expect(hasUnresolvedSyntax('{{blank:1}}')).toBe(true);
			expect(hasUnresolvedSyntax('{{blank:42}}')).toBe(true);
		});

		it('should return false for resolved content', () => {
			expect(hasUnresolvedSyntax('Hello World')).toBe(false);
			expect(hasUnresolvedSyntax('$x^2 + y^2 = z^2$')).toBe(false);
			expect(hasUnresolvedSyntax('# Heading\n\nParagraph')).toBe(false);
			expect(hasUnresolvedSyntax('![alt](url)')).toBe(false);
		});

		it('should handle edge cases', () => {
			expect(hasUnresolvedSyntax('')).toBe(false);
			expect(hasUnresolvedSyntax('{')).toBe(false);
			expect(hasUnresolvedSyntax('{}')).toBe(false);
			expect(hasUnresolvedSyntax('{test}')).toBe(false);
			expect(hasUnresolvedSyntax('{ {test} }')).toBe(false);
		});
	});

	describe('Type guards', () => {
		it('should identify TemplateMarkdown', () => {
			const template: MarkdownContent = templateMarkdown('Hello {{name}}');
			expect(isTemplateMarkdown(template)).toBe(true);
			expect(isResolvedMarkdown(template)).toBe(false);
		});

		it('should identify ResolvedMarkdown', () => {
			const resolved: MarkdownContent = resolvedMarkdown('Hello World');
			expect(isResolvedMarkdown(resolved)).toBe(true);
			expect(isTemplateMarkdown(resolved)).toBe(false);
		});

		it('should handle templates without placeholders', () => {
			// Even if created as template, if no placeholders, it's considered resolved
			const template: MarkdownContent = templateMarkdown('Hello World');
			expect(isResolvedMarkdown(template)).toBe(true);
			expect(isTemplateMarkdown(template)).toBe(false);
		});
	});

	describe('tryAsResolved', () => {
		it('should convert template without placeholders to resolved', () => {
			const template = templateMarkdown('Hello World');
			const resolved = tryAsResolved(template);
			expect(resolved).not.toBeNull();
			expect(resolved).toBe('Hello World');
		});

		it('should return null for template with placeholders', () => {
			const template = templateMarkdown('Hello {{name}}');
			const resolved = tryAsResolved(template);
			expect(resolved).toBeNull();
		});
	});

	describe('extractPlaceholders', () => {
		it('should extract all unique placeholders', () => {
			const content = `
				{{a}} + {{b}} = {{eval:a+b}}
				{{a}} is repeated
				Random: {{random:1..10}}
				Fill: {{blank:1}}
			`;
			const placeholders = extractPlaceholders(content);
			expect(placeholders).toContain('{{a}}');
			expect(placeholders).toContain('{{b}}');
			expect(placeholders).toContain('{{eval:a+b}}');
			expect(placeholders).toContain('{{random:1..10}}');
			expect(placeholders).toContain('{{blank:1}}');
			// Should not have duplicates
			expect(placeholders.filter((p) => p === '{{a}}').length).toBe(1);
		});

		it('should return empty array for resolved content', () => {
			const placeholders = extractPlaceholders('Hello World');
			expect(placeholders).toEqual([]);
		});

		it('should handle complex expressions', () => {
			// Note: Nested {{}} are not actually valid in our syntax
			// Variables inside eval should be referenced without brackets
			const content = '{{eval:a+b*2}}';
			const placeholders = extractPlaceholders(content);
			expect(placeholders).toContain('{{eval:a+b*2}}');

			// Test multiple placeholders on same line
			const content2 = '{{a}} + {{b}} = {{eval:a+b}}';
			const placeholders2 = extractPlaceholders(content2);
			expect(placeholders2).toContain('{{a}}');
			expect(placeholders2).toContain('{{b}}');
			expect(placeholders2).toContain('{{eval:a+b}}');
		});
	});

	describe('getPlaceholderTypes', () => {
		it('should identify variable placeholders', () => {
			const types = getPlaceholderTypes('{{name}} and {{age}}');
			expect(types.variables).toBe(true);
			expect(types.random).toBe(false);
			expect(types.eval).toBe(false);
			expect(types.blanks).toBe(false);
		});

		it('should identify random placeholders', () => {
			const types = getPlaceholderTypes('{{random:1..10}}');
			expect(types.variables).toBe(false);
			expect(types.random).toBe(true);
			expect(types.eval).toBe(false);
			expect(types.blanks).toBe(false);
		});

		it('should identify eval placeholders', () => {
			const types = getPlaceholderTypes('{{eval:x+y}}');
			expect(types.variables).toBe(false);
			expect(types.random).toBe(false);
			expect(types.eval).toBe(true);
			expect(types.blanks).toBe(false);
		});

		it('should identify blank placeholders', () => {
			const types = getPlaceholderTypes('{{blank:1}}');
			expect(types.variables).toBe(false);
			expect(types.random).toBe(false);
			expect(types.eval).toBe(false);
			expect(types.blanks).toBe(true);
		});

		it('should identify multiple types', () => {
			const types = getPlaceholderTypes('{{a}} + {{random:1..10}} = {{eval:a+5}} {{blank:1}}');
			expect(types.variables).toBe(true);
			expect(types.random).toBe(true);
			expect(types.eval).toBe(true);
			expect(types.blanks).toBe(true);
		});

		it('should return all false for resolved content', () => {
			const types = getPlaceholderTypes('Hello World');
			expect(types.variables).toBe(false);
			expect(types.random).toBe(false);
			expect(types.eval).toBe(false);
			expect(types.blanks).toBe(false);
		});
	});

	describe('Type safety examples', () => {
		it('should enforce type safety in functions', () => {
			// Function that only accepts templates
			function processTemplate(template: TemplateMarkdown): string {
				return `Processing: ${template}`;
			}

			// Function that only accepts resolved
			function renderMarkdown(markdown: ResolvedMarkdown): string {
				return `Rendering: ${markdown}`;
			}

			// This would cause TypeScript errors if uncommented:
			// processTemplate(resolvedMarkdown('Hello'));
			// renderMarkdown(templateMarkdown('{{name}}'));

			// Correct usage
			const template = templateMarkdown('{{name}}');
			expect(processTemplate(template)).toBe('Processing: {{name}}');

			const resolved = resolvedMarkdown('John');
			expect(renderMarkdown(resolved)).toBe('Rendering: John');
		});

		it('should work with type narrowing', () => {
			function handleMarkdown(content: MarkdownContent): string {
				if (isTemplateMarkdown(content)) {
					// TypeScript knows content is TemplateMarkdown here
					return `Template: ${content}`;
				} else {
					// TypeScript knows content is ResolvedMarkdown here
					return `Resolved: ${content}`;
				}
			}

			expect(handleMarkdown(templateMarkdown('{{x}}'))).toBe('Template: {{x}}');
			expect(handleMarkdown(resolvedMarkdown('5'))).toBe('Resolved: 5');
		});
	});
});
