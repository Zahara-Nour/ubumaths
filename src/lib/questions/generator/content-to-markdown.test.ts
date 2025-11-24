/**
 * Tests for ContentField to Markdown conversion
 */

import { describe, it, expect } from 'vitest';
import {
	contentFieldToMarkdown,
	contentFieldsToMarkdown,
	choicesToMarkdown
} from './content-to-markdown';
import type { ContentField } from '../types';

describe('contentFieldToMarkdown', () => {
	it('converts text field to markdown', () => {
		const field: ContentField = { type: 'text', content: 'Calculate $$2+3$$' };
		expect(contentFieldToMarkdown(field)).toBe('Calculate $$2+3$$');
	});

	it('converts image field with alt text to markdown', () => {
		const field: ContentField = {
			type: 'image',
			content: '/img/triangle.png',
			alt: 'A triangle'
		};
		expect(contentFieldToMarkdown(field)).toBe('![A triangle](/img/triangle.png)');
	});

	it('converts image field without alt text to markdown', () => {
		const field: ContentField = { type: 'image', content: '/img/graph.png' };
		expect(contentFieldToMarkdown(field)).toBe('![](/img/graph.png)');
	});

	it('handles empty text content', () => {
		const field: ContentField = { type: 'text', content: '' };
		expect(contentFieldToMarkdown(field)).toBe('');
	});
});

describe('contentFieldsToMarkdown', () => {
	it('converts single text field', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Calculate $$3 \\times 4$$' }];
		expect(contentFieldsToMarkdown(fields)).toBe('Calculate $$3 \\times 4$$');
	});

	it('converts multiple text fields with paragraph breaks', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'First paragraph.' },
			{ type: 'text', content: 'Second paragraph.' }
		];
		expect(contentFieldsToMarkdown(fields)).toBe('First paragraph.\n\nSecond paragraph.');
	});

	it('converts mixed text and image fields', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Look at the image below:' },
			{ type: 'image', content: '/img/graph.png', alt: 'A graph' },
			{ type: 'text', content: 'What is the value of $$x$$?' }
		];
		expect(contentFieldsToMarkdown(fields)).toBe(
			'Look at the image below:\n\n![A graph](/img/graph.png)\n\nWhat is the value of $$x$$?'
		);
	});

	it('filters out empty fields', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Hello' },
			{ type: 'text', content: '' },
			{ type: 'text', content: 'World' }
		];
		expect(contentFieldsToMarkdown(fields)).toBe('Hello\n\nWorld');
	});

	it('returns empty string for empty array', () => {
		expect(contentFieldsToMarkdown([])).toBe('');
	});

	it('returns empty string for undefined/null', () => {
		expect(contentFieldsToMarkdown(undefined as unknown as ContentField[])).toBe('');
		expect(contentFieldsToMarkdown(null as unknown as ContentField[])).toBe('');
	});

	it('preserves LaTeX expressions unchanged', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Solve: $$\\frac{x}{2} = 5$$' }];
		expect(contentFieldsToMarkdown(fields)).toBe('Solve: $$\\frac{x}{2} = 5$$');
	});
});

describe('choicesToMarkdown', () => {
	it('converts choices array to markdown strings', () => {
		const choices = [
			{ content: [{ type: 'text' as const, content: '$$x = 5$$' }], isCorrect: true },
			{ content: [{ type: 'text' as const, content: '$$x = 3$$' }], isCorrect: false }
		];
		expect(choicesToMarkdown(choices)).toEqual(['$$x = 5$$', '$$x = 3$$']);
	});

	it('handles choices with multiple content fields', () => {
		const choices = [
			{
				content: [
					{ type: 'text' as const, content: 'Option A:' },
					{ type: 'image' as const, content: '/img/a.png', alt: 'Graph A' }
				],
				isCorrect: true
			}
		];
		expect(choicesToMarkdown(choices)).toEqual(['Option A:\n\n![Graph A](/img/a.png)']);
	});

	it('preserves originalIndex for shuffled choices', () => {
		const choices = [
			{ content: [{ type: 'text' as const, content: 'Choice 1' }], originalIndex: 2 },
			{ content: [{ type: 'text' as const, content: 'Choice 2' }], originalIndex: 0 }
		];
		// choicesToMarkdown just extracts markdown, doesn't care about originalIndex
		expect(choicesToMarkdown(choices)).toEqual(['Choice 1', 'Choice 2']);
	});
});
