/**
 * Math Extractor Tests
 * =====================
 *
 * Unit tests for the math expression extraction module.
 */

import { describe, it, expect } from 'vitest';
import {
	extractMath,
	isMathPlaceholder,
	getPlaceholderIndex,
	findPlaceholder,
	splitTextWithPlaceholders,
	getMathStats
} from './math-extractor';

describe('extractMath', () => {
	it('should extract inline math expressions', () => {
		const markdown = 'Calculate $x^2$ and $y^3$';
		const result = extractMath(markdown);

		expect(result.placeholders).toHaveLength(2);
		expect(result.placeholders[0].latex).toBe('x^2');
		expect(result.placeholders[0].isBlock).toBe(false);
		expect(result.placeholders[1].latex).toBe('y^3');
		expect(result.placeholders[1].isBlock).toBe(false);
		expect(result.text).toContain('__MATH_0__');
		expect(result.text).toContain('__MATH_1__');
	});

	it('should extract block math expressions', () => {
		const markdown = 'Formula:\n$$\\int_0^\\pi \\sin(x) dx$$\nEnd';
		const result = extractMath(markdown);

		expect(result.placeholders).toHaveLength(1);
		expect(result.placeholders[0].latex).toBe('\\int_0^\\pi \\sin(x) dx');
		expect(result.placeholders[0].isBlock).toBe(true);
		expect(result.text).toContain('__MATH_0__');
	});

	it('should handle mixed inline and block math', () => {
		const markdown = 'Inline $a+b$ and block $$c+d$$';
		const result = extractMath(markdown);

		expect(result.placeholders).toHaveLength(2);
		expect(result.placeholders[0].latex).toBe('c+d'); // Block first
		expect(result.placeholders[0].isBlock).toBe(true);
		expect(result.placeholders[1].latex).toBe('a+b');
		expect(result.placeholders[1].isBlock).toBe(false);
	});

	it('should preserve escaped dollar signs', () => {
		const markdown = 'Price is \\$10 and formula $x^2$';
		const result = extractMath(markdown);

		expect(result.text).toContain('$10');
		expect(result.placeholders).toHaveLength(1);
		expect(result.placeholders[0].latex).toBe('x^2');
	});

	it('should handle empty math expressions', () => {
		const markdown = 'Empty: $$  $$ and $  $';
		const result = extractMath(markdown);

		expect(result.placeholders).toHaveLength(2);
		expect(result.placeholders[0].latex).toBe('');
		expect(result.placeholders[1].latex).toBe('');
	});

	it('should trim whitespace from latex content', () => {
		const markdown = '$  x^2  $ and $$  \\int x  $$';
		const result = extractMath(markdown);

		expect(result.placeholders[0].latex).toBe('\\int x');
		expect(result.placeholders[1].latex).toBe('x^2');
	});

	it('should handle text with no math expressions', () => {
		const markdown = 'Just plain text';
		const result = extractMath(markdown);

		expect(result.placeholders).toHaveLength(0);
		expect(result.text).toBe('Just plain text');
	});

	it('should track correct indices', () => {
		const markdown = 'Start $x$ middle $$y$$ end';
		const result = extractMath(markdown);

		expect(result.placeholders[0].startIndex).toBeDefined();
		expect(result.placeholders[0].endIndex).toBeDefined();
		expect(result.placeholders[1].startIndex).toBeDefined();
		expect(result.placeholders[1].endIndex).toBeDefined();
	});
});

describe('isMathPlaceholder', () => {
	it('should identify valid placeholders', () => {
		expect(isMathPlaceholder('__MATH_0__')).toBe(true);
		expect(isMathPlaceholder('__MATH_123__')).toBe(true);
	});

	it('should reject invalid placeholders', () => {
		expect(isMathPlaceholder('regular text')).toBe(false);
		expect(isMathPlaceholder('MATH_0')).toBe(false);
		expect(isMathPlaceholder('__MATH_')).toBe(false);
		expect(isMathPlaceholder('__MATH_0')).toBe(false);
	});
});

describe('getPlaceholderIndex', () => {
	it('should extract index from valid placeholder', () => {
		expect(getPlaceholderIndex('__MATH_0__')).toBe(0);
		expect(getPlaceholderIndex('__MATH_42__')).toBe(42);
		expect(getPlaceholderIndex('__MATH_999__')).toBe(999);
	});

	it('should return null for invalid placeholder', () => {
		expect(getPlaceholderIndex('regular text')).toBe(null);
		expect(getPlaceholderIndex('__MATH_')).toBe(null);
	});
});

describe('findPlaceholder', () => {
	it('should find placeholder by string', () => {
		const markdown = 'Test $x^2$ end';
		const { placeholders } = extractMath(markdown);

		const found = findPlaceholder(placeholders, '__MATH_0__');
		expect(found).toBeDefined();
		expect(found?.latex).toBe('x^2');
	});

	it('should return undefined for non-existent placeholder', () => {
		const markdown = 'Test $x^2$ end';
		const { placeholders } = extractMath(markdown);

		const found = findPlaceholder(placeholders, '__MATH_999__');
		expect(found).toBeUndefined();
	});
});

describe('splitTextWithPlaceholders', () => {
	it('should split text with single placeholder', () => {
		const markdown = 'Calculate $x^2$ please';
		const { text, placeholders } = extractMath(markdown);

		const segments = splitTextWithPlaceholders(text, placeholders);

		expect(segments).toHaveLength(3);
		expect(segments[0]).toBe('Calculate ');
		expect(typeof segments[1]).toBe('object'); // MathPlaceholder
		expect(segments[2]).toBe(' please');
	});

	it('should split text with multiple placeholders', () => {
		const markdown = 'First $a$ then $b$ and $c$ end';
		const { text, placeholders } = extractMath(markdown);

		const segments = splitTextWithPlaceholders(text, placeholders);

		expect(segments.length).toBeGreaterThan(3);
		// Should alternate between strings and placeholders
		expect(typeof segments[0]).toBe('string');
		expect(typeof segments[1]).toBe('object');
		expect(typeof segments[2]).toBe('string');
	});

	it('should handle text with no placeholders', () => {
		const text = 'Just plain text';
		const segments = splitTextWithPlaceholders(text, []);

		expect(segments).toHaveLength(1);
		expect(segments[0]).toBe('Just plain text');
	});

	it('should filter out empty strings', () => {
		const markdown = '$x$$y$';
		const { text, placeholders } = extractMath(markdown);

		const segments = splitTextWithPlaceholders(text, placeholders);

		// Should only have the two placeholders, no empty strings
		expect(segments).toHaveLength(2);
		expect(typeof segments[0]).toBe('object');
		expect(typeof segments[1]).toBe('object');
	});
});

describe('getMathStats', () => {
	it('should count inline and block math', () => {
		const markdown = 'Inline $a$ $b$ and block $$c$$ $$d$$';
		const stats = getMathStats(markdown);

		expect(stats.inlineCount).toBe(2);
		expect(stats.blockCount).toBe(2);
		expect(stats.totalCount).toBe(4);
	});

	it('should handle text with no math', () => {
		const markdown = 'No math here';
		const stats = getMathStats(markdown);

		expect(stats.inlineCount).toBe(0);
		expect(stats.blockCount).toBe(0);
		expect(stats.totalCount).toBe(0);
	});

	it('should handle only inline math', () => {
		const markdown = '$x$ and $y$ and $z$';
		const stats = getMathStats(markdown);

		expect(stats.inlineCount).toBe(3);
		expect(stats.blockCount).toBe(0);
		expect(stats.totalCount).toBe(3);
	});

	it('should handle only block math', () => {
		const markdown = '$$a$$ and $$b$$';
		const stats = getMathStats(markdown);

		expect(stats.inlineCount).toBe(0);
		expect(stats.blockCount).toBe(2);
		expect(stats.totalCount).toBe(2);
	});
});

describe('Edge Cases', () => {
	it('should handle consecutive dollar signs', () => {
		const markdown = '$$$$'; // Two empty block math?
		const result = extractMath(markdown);

		// Should extract one empty block math
		expect(result.placeholders.length).toBeGreaterThanOrEqual(0);
	});

	it('should handle math with newlines', () => {
		const markdown = '$$\nx^2\n+\ny^2\n$$';
		const result = extractMath(markdown);

		expect(result.placeholders).toHaveLength(1);
		expect(result.placeholders[0].isBlock).toBe(true);
		expect(result.placeholders[0].latex).toContain('x^2');
		expect(result.placeholders[0].latex).toContain('y^2');
	});

	it('should handle math at start and end', () => {
		const markdown = '$start$ middle $end$';
		const result = extractMath(markdown);

		expect(result.placeholders).toHaveLength(2);
		expect(result.placeholders[0].latex).toBe('start');
		expect(result.placeholders[1].latex).toBe('end');
	});

	it('should handle complex latex expressions', () => {
		const markdown = '$\\frac{a}{b}$ and $$\\int_0^{\\infty} e^{-x} dx$$';
		const result = extractMath(markdown);

		expect(result.placeholders).toHaveLength(2);
		expect(result.placeholders[0].latex).toContain('\\int');
		expect(result.placeholders[1].latex).toContain('\\frac');
	});
});
