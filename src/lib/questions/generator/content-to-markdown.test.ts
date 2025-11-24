/**
 * Tests for ContentField to Markdown conversion
 *
 * NOTE: These functions have been moved to content-resolver.ts as internal helpers.
 * This test file is kept for backward compatibility testing of the conversion logic.
 */

import { describe, it, expect } from 'vitest';
import { contentFieldsToTemplateMarkdown } from './content-resolver';
import type { ContentField } from '../types';

describe('ContentField to Markdown Conversion', () => {
	it('converts single text field', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Calculate $$3 \\times 4$$' }];
		const result = contentFieldsToTemplateMarkdown(fields);
		expect(result).toBe('Calculate $$3 \\times 4$$');
	});

	it('converts multiple text fields with paragraph breaks', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'First paragraph.' },
			{ type: 'text', content: 'Second paragraph.' }
		];
		const result = contentFieldsToTemplateMarkdown(fields);
		expect(result).toBe('First paragraph.\n\nSecond paragraph.');
	});

	it('converts mixed text and image fields', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Look at the image below:' },
			{ type: 'image', content: '/img/graph.png', alt: 'A graph' },
			{ type: 'text', content: 'What is the value of $$x$$?' }
		];
		const result = contentFieldsToTemplateMarkdown(fields);
		expect(result).toBe(
			'Look at the image below:\n\n![A graph](/img/graph.png)\n\nWhat is the value of $$x$$?'
		);
	});

	it('filters out empty fields', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Hello' },
			{ type: 'text', content: '' },
			{ type: 'text', content: 'World' }
		];
		const result = contentFieldsToTemplateMarkdown(fields);
		expect(result).toBe('Hello\n\nWorld');
	});

	it('returns empty string for empty array', () => {
		const result = contentFieldsToTemplateMarkdown([]);
		expect(result).toBe('');
	});

	it('preserves LaTeX expressions unchanged', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Solve: $$\\frac{x}{2} = 5$$' }];
		const result = contentFieldsToTemplateMarkdown(fields);
		expect(result).toBe('Solve: $$\\frac{x}{2} = 5$$');
	});

	it('handles image field with alt text', () => {
		const fields: ContentField[] = [
			{ type: 'image', content: '/img/triangle.png', alt: 'A triangle' }
		];
		const result = contentFieldsToTemplateMarkdown(fields);
		expect(result).toBe('![A triangle](/img/triangle.png)');
	});

	it('handles image field without alt text', () => {
		const fields: ContentField[] = [{ type: 'image', content: '/img/graph.png' }];
		const result = contentFieldsToTemplateMarkdown(fields);
		expect(result).toBe('![](/img/graph.png)');
	});

	it('converts choices with multiple content fields', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Option A:' },
			{ type: 'image', content: '/img/a.png', alt: 'Graph A' }
		];
		const result = contentFieldsToTemplateMarkdown(fields);
		expect(result).toBe('Option A:\n\n![Graph A](/img/a.png)');
	});
});
