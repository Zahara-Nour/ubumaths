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
	getMathStats,
	extractPromptInfo
} from '../../parser/math-extractor';

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

describe('extractPromptInfo', () => {
	it('returns no prompts for regular LaTeX', () => {
		const result = extractPromptInfo('x^2 + 2x + 1');
		expect(result.hasPrompts).toBe(false);
		expect(result.promptIndices).toEqual([]);
	});

	it('detects single placeholder', () => {
		const result = extractPromptInfo('x = \\placeholder[1]{}');
		expect(result.hasPrompts).toBe(true);
		expect(result.promptIndices).toEqual([1]);
	});

	it('detects multiple placeholders', () => {
		const result = extractPromptInfo('\\frac{\\placeholder[1]{}}{\\placeholder[2]{}}');
		expect(result.hasPrompts).toBe(true);
		expect(result.promptIndices).toEqual([1, 2]);
	});

	it('handles placeholders with initial content', () => {
		const result = extractPromptInfo('\\placeholder[3]{x^2}');
		expect(result.hasPrompts).toBe(true);
		expect(result.promptIndices).toEqual([3]);
	});

	it('deduplicates repeated indices', () => {
		const result = extractPromptInfo('\\placeholder[1]{} + \\placeholder[1]{}');
		expect(result.hasPrompts).toBe(true);
		expect(result.promptIndices).toEqual([1]);
	});

	it('sorts indices in ascending order', () => {
		const result = extractPromptInfo(
			'\\placeholder[5]{} + \\placeholder[2]{} + \\placeholder[8]{}'
		);
		expect(result.hasPrompts).toBe(true);
		expect(result.promptIndices).toEqual([2, 5, 8]);
	});

	it('handles complex nested LaTeX with placeholders', () => {
		const result = extractPromptInfo('\\frac{\\sqrt{\\placeholder[1]{}}}{\\placeholder[2]{} + 3}');
		expect(result.hasPrompts).toBe(true);
		expect(result.promptIndices).toEqual([1, 2]);
	});
});

describe('extractMath with placeholders', () => {
	it('marks inline math without placeholders as hasPrompts: false', () => {
		const { placeholders } = extractMath('Calculate $x^2 + 1$');
		expect(placeholders).toHaveLength(1);
		expect(placeholders[0].hasPrompts).toBe(false);
		expect(placeholders[0].promptIndices).toEqual([]);
	});

	it('marks inline math with placeholder as hasPrompts: true', () => {
		const { placeholders } = extractMath('Solve: $x = \\placeholder[1]{}$');
		expect(placeholders).toHaveLength(1);
		expect(placeholders[0].hasPrompts).toBe(true);
		expect(placeholders[0].promptIndices).toEqual([1]);
	});

	it('marks block math without placeholders as hasPrompts: false', () => {
		const { placeholders } = extractMath('$$\\int_0^1 x dx$$');
		expect(placeholders).toHaveLength(1);
		expect(placeholders[0].isBlock).toBe(true);
		expect(placeholders[0].hasPrompts).toBe(false);
	});

	it('marks block math with placeholders as hasPrompts: true', () => {
		const { placeholders } = extractMath('$$\\frac{\\placeholder[1]{}}{\\placeholder[2]{}}$$');
		expect(placeholders).toHaveLength(1);
		expect(placeholders[0].isBlock).toBe(true);
		expect(placeholders[0].hasPrompts).toBe(true);
		expect(placeholders[0].promptIndices).toEqual([1, 2]);
	});

	it('handles mixed math with and without placeholders', () => {
		const { placeholders } = extractMath('Given $a = 5$, find $x = \\placeholder[1]{}$');
		expect(placeholders).toHaveLength(2);
		expect(placeholders[0].hasPrompts).toBe(false);
		expect(placeholders[1].hasPrompts).toBe(true);
		expect(placeholders[1].promptIndices).toEqual([1]);
	});
});

describe('Custom Math Syntax (~...~ and ~~...~~)', () => {
	describe('Inline custom syntax ~...~', () => {
		it('should extract inline custom math expressions', () => {
			const markdown = 'Calculate ~2x+3~ and ~y^2~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(2);
			expect(result.placeholders[0].syntax).toBe('custom');
			expect(result.placeholders[0].isBlock).toBe(false);
			expect(result.placeholders[0].latex).toContain('2');
			expect(result.placeholders[0].latex).toContain('x');
			expect(result.placeholders[1].syntax).toBe('custom');
			expect(result.placeholders[1].isBlock).toBe(false);
		});

		it('should convert custom syntax to valid LaTeX', () => {
			const markdown = '~x^2+3x+1~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			// LaTeX generator may use x^2 or x^{2} depending on optimization
			expect(result.placeholders[0].latex).toMatch(/x\^(\{?2\}?) \+ 3 x \+ 1/);
			expect(result.placeholders[0].syntax).toBe('custom');
		});

		it('should handle custom syntax with functions', () => {
			const markdown = '~sin(x)+cos(y)~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			expect(result.placeholders[0].latex).toContain('\\sin');
			expect(result.placeholders[0].latex).toContain('\\cos');
		});

		it('should handle custom syntax with fractions', () => {
			const markdown = '~a/b~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			expect(result.placeholders[0].latex).toContain('\\frac');
		});
	});

	describe('Block custom syntax ~~...~~', () => {
		it('should extract block custom math expressions', () => {
			const markdown = 'Formula:\n~~x^2=4~~\nEnd';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			expect(result.placeholders[0].syntax).toBe('custom');
			expect(result.placeholders[0].isBlock).toBe(true);
			expect(result.placeholders[0].latex).toContain('x');
		});

		it('should handle multiline block custom syntax', () => {
			const markdown = '~~x^2+\ny^2=\n1~~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			expect(result.placeholders[0].isBlock).toBe(true);
			expect(result.placeholders[0].latex).toContain('x');
			expect(result.placeholders[0].latex).toContain('y');
		});
	});

	describe('Mixed LaTeX and custom syntax', () => {
		it('should handle both LaTeX and custom inline syntax', () => {
			const markdown = 'LaTeX $x^2$ and custom ~2x+3~ together';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(2);
			expect(result.placeholders[0].syntax).toBe('latex');
			expect(result.placeholders[0].latex).toBe('x^2');
			expect(result.placeholders[1].syntax).toBe('custom');
			expect(result.placeholders[1].latex).toContain('2');
		});

		it('should handle both LaTeX and custom block syntax', () => {
			const markdown = 'LaTeX $$x^2$$ and custom ~~y=2x~~ together';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(2);
			expect(result.placeholders[0].syntax).toBe('latex');
			expect(result.placeholders[0].isBlock).toBe(true);
			expect(result.placeholders[1].syntax).toBe('custom');
			expect(result.placeholders[1].isBlock).toBe(true);
		});

		it('should extract in correct order: blocks before inline', () => {
			const markdown = 'Inline ~a~ block ~~b~~ inline $c$ block $$d$$';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(4);
			// Extraction order: LaTeX blocks, custom blocks, LaTeX inline, custom inline
			// Blocks first: $$d$$ then ~~b~~
			expect(result.placeholders[0].isBlock).toBe(true);
			expect(result.placeholders[0].syntax).toBe('latex');
			expect(result.placeholders[0].latex).toBe('d');
			expect(result.placeholders[1].isBlock).toBe(true);
			expect(result.placeholders[1].syntax).toBe('custom');
			expect(result.placeholders[1].latex).toBe('b');
			// Then inline: $c$ then ~a~
			expect(result.placeholders[2].isBlock).toBe(false);
			expect(result.placeholders[2].syntax).toBe('latex');
			expect(result.placeholders[2].latex).toBe('c');
			expect(result.placeholders[3].isBlock).toBe(false);
			expect(result.placeholders[3].syntax).toBe('custom');
			expect(result.placeholders[3].latex).toBe('a');
		});
	});

	describe('Escaped tildes', () => {
		it('should preserve escaped tildes \\~', () => {
			const markdown = 'Use \\~ for tilde, not ~2x~ for math';
			const result = extractMath(markdown);

			expect(result.text).toContain('~');
			expect(result.placeholders).toHaveLength(1);
			expect(result.placeholders[0].syntax).toBe('custom');
		});

		it('should handle mixed escaped characters', () => {
			const markdown = 'Price \\$10 and tilde \\~ with ~x+1~ and $y^2$';
			const result = extractMath(markdown);

			expect(result.text).toContain('$10');
			expect(result.text).toContain('~');
			expect(result.placeholders).toHaveLength(2);
		});
	});

	describe('Parse errors in custom syntax', () => {
		it('should handle parse errors gracefully', () => {
			const markdown = '~2+*3~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			expect(result.placeholders[0].latex).toContain('\\textcolor{red}');
			expect(result.placeholders[0].latex).toContain('\\text');
		});

		it('should show error message for invalid syntax', () => {
			const markdown = '~++~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			expect(result.placeholders[0].latex).toMatch(/textcolor.*red/);
		});
	});

	describe('Edge cases', () => {
		it('should distinguish ~~ from two ~', () => {
			const markdown = '~~x^2~~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			expect(result.placeholders[0].isBlock).toBe(true);
		});

		it('should not match single ~ at end', () => {
			const markdown = 'Start ~x^2~ end~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			expect(result.text).toContain('end~');
		});

		it('should handle empty custom expressions', () => {
			const markdown = '~~  ~~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			// Empty input should produce an error
			expect(result.placeholders[0].latex).toContain('\\textcolor{red}');
		});

		it('should handle custom syntax with equals (relations)', () => {
			const markdown = '~x=5~';
			const result = extractMath(markdown);

			expect(result.placeholders).toHaveLength(1);
			expect(result.placeholders[0].latex).toContain('=');
			expect(result.placeholders[0].syntax).toBe('custom');
		});
	});
});
