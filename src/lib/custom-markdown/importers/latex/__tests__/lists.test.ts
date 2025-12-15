/**
 * Tests for list converters (itemize, enumerate, description)
 */

import { describe, it, expect } from 'vitest';
import {
	convertItemize,
	convertEnumerate,
	convertDescription,
	parseListItems,
	getIndent,
	isListEnvironment,
	getListConverter
} from '../converters/lists';
import type { EnvironmentToken, ConversionContext, LatexToMarkdownOptions } from '../types';

// ===========================
// Test Helpers
// ===========================

/**
 * Create a mock EnvironmentToken for testing
 */
function createEnvToken(name: string, content: string, depth: number = 0): EnvironmentToken {
	const raw = `\\begin{${name}}${content}\\end{${name}}`;
	return {
		type: 'environment',
		name,
		content,
		raw,
		start: 0,
		end: raw.length,
		line: 1,
		column: 1,
		depth
	};
}

/**
 * Create a mock ConversionContext for testing
 */
function createContext(overrides: Partial<ConversionContext> = {}): ConversionContext {
	const defaultOptions: Required<LatexToMarkdownOptions> = {
		preserveComments: false,
		mathDelimiters: 'dollar',
		maxNestingDepth: 10,
		fallbackToText: false,
		preserveWhitespace: false,
		lineOffset: 0
	};

	return {
		indentLevel: 0,
		listStack: [],
		inListItem: false,
		inTable: false,
		inMath: false,
		inVerbatim: false,
		environmentStack: [],
		options: defaultOptions,
		warnings: [],
		addWarning: () => {},
		...overrides
	};
}

// ===========================
// Utility Function Tests
// ===========================

describe('getIndent', () => {
	it('should return empty string for level 0', () => {
		expect(getIndent(0)).toBe('');
	});

	it('should return 2 spaces for level 1', () => {
		expect(getIndent(1)).toBe('  ');
	});

	it('should return 4 spaces for level 2', () => {
		expect(getIndent(2)).toBe('    ');
	});

	it('should return 6 spaces for level 3', () => {
		expect(getIndent(3)).toBe('      ');
	});
});

describe('isListEnvironment', () => {
	it('should return true for itemize', () => {
		expect(isListEnvironment('itemize')).toBe(true);
	});

	it('should return true for enumerate', () => {
		expect(isListEnvironment('enumerate')).toBe(true);
	});

	it('should return true for description', () => {
		expect(isListEnvironment('description')).toBe(true);
	});

	it('should return false for non-list environments', () => {
		expect(isListEnvironment('center')).toBe(false);
		expect(isListEnvironment('table')).toBe(false);
		expect(isListEnvironment('figure')).toBe(false);
	});
});

describe('getListConverter', () => {
	it('should return convertItemize for itemize', () => {
		expect(getListConverter('itemize')).toBe(convertItemize);
	});

	it('should return convertEnumerate for enumerate', () => {
		expect(getListConverter('enumerate')).toBe(convertEnumerate);
	});

	it('should return convertDescription for description', () => {
		expect(getListConverter('description')).toBe(convertDescription);
	});

	it('should return undefined for non-list environments', () => {
		expect(getListConverter('center')).toBeUndefined();
	});
});

describe('parseListItems', () => {
	it('should parse single item', () => {
		const items = parseListItems('\\item First item');
		expect(items).toHaveLength(1);
		expect(items[0].content).toBe('First item');
	});

	it('should parse multiple items', () => {
		const items = parseListItems('\\item First \\item Second \\item Third');
		expect(items).toHaveLength(3);
		expect(items[0].content).toBe('First');
		expect(items[1].content).toBe('Second');
		expect(items[2].content).toBe('Third');
	});

	it('should parse items with labels (description style)', () => {
		const items = parseListItems('\\item[Term] Definition \\item[Other] Other def');
		expect(items).toHaveLength(2);
		expect(items[0].label).toBe('Term');
		expect(items[0].content).toBe('Definition');
		expect(items[1].label).toBe('Other');
		expect(items[1].content).toBe('Other def');
	});

	it('should handle empty content', () => {
		const items = parseListItems('');
		expect(items).toHaveLength(0);
	});

	it('should handle content without items', () => {
		const items = parseListItems('Just some text');
		expect(items).toHaveLength(0);
	});

	it('should handle multi-line item content', () => {
		const items = parseListItems('\\item First line\n  second line \\item Next');
		expect(items).toHaveLength(2);
		expect(items[0].content).toContain('First line');
		expect(items[0].content).toContain('second line');
	});
});

// ===========================
// Itemize Tests
// ===========================

describe('convertItemize', () => {
	describe('simple lists', () => {
		it('should convert single item', () => {
			const token = createEnvToken('itemize', '\\item First item');
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toBe('- First item');
		});

		it('should convert two items', () => {
			const token = createEnvToken('itemize', '\\item First \\item Second');
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toBe('- First\n- Second');
		});

		it('should convert three items', () => {
			const token = createEnvToken('itemize', '\\item One \\item Two \\item Three');
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toBe('- One\n- Two\n- Three');
		});

		it('should handle items with trailing whitespace', () => {
			const token = createEnvToken('itemize', '\\item First   \\item Second   ');
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toBe('- First\n- Second');
		});
	});

	describe('nested lists', () => {
		it('should handle nested itemize', () => {
			const content = `\\item Outer
    \\begin{itemize}
      \\item Inner
    \\end{itemize}`;
			const token = createEnvToken('itemize', content);
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toContain('- Outer');
			expect(result).toContain('  - Inner');
		});

		it('should handle deeply nested itemize', () => {
			const content = `\\item Level 0
    \\begin{itemize}
      \\item Level 1
      \\begin{itemize}
        \\item Level 2
      \\end{itemize}
    \\end{itemize}`;
			const token = createEnvToken('itemize', content);
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toContain('- Level 0');
			expect(result).toContain('  - Level 1');
			expect(result).toContain('    - Level 2');
		});

		it('should handle multiple nested items', () => {
			const content = `\\item First
    \\begin{itemize}
      \\item Nested A
      \\item Nested B
    \\end{itemize}
  \\item Second`;
			const token = createEnvToken('itemize', content);
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toContain('- First');
			expect(result).toContain('  - Nested A');
			expect(result).toContain('  - Nested B');
			expect(result).toContain('- Second');
		});
	});

	describe('with formatting', () => {
		it('should preserve inline formatting in items', () => {
			const token = createEnvToken('itemize', '\\item \\textbf{Bold} text');
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toBe('- \\textbf{Bold} text');
		});

		it('should preserve math in items', () => {
			const token = createEnvToken('itemize', '\\item $x^2$ formula');
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toBe('- $x^2$ formula');
		});
	});

	describe('indentation at depth', () => {
		it('should indent when depth is 1', () => {
			const token = createEnvToken('itemize', '\\item Nested item', 1);
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toBe('  - Nested item');
		});

		it('should indent when depth is 2', () => {
			const token = createEnvToken('itemize', '\\item Deep item', 2);
			const ctx = createContext();

			const result = convertItemize(token, ctx);

			expect(result).toBe('    - Deep item');
		});
	});
});

// ===========================
// Enumerate Tests
// ===========================

describe('convertEnumerate', () => {
	describe('simple lists', () => {
		it('should convert single item with number', () => {
			const token = createEnvToken('enumerate', '\\item First');
			const ctx = createContext();

			const result = convertEnumerate(token, ctx);

			expect(result).toBe('1. First');
		});

		it('should convert two items with sequential numbers', () => {
			const token = createEnvToken('enumerate', '\\item First \\item Second');
			const ctx = createContext();

			const result = convertEnumerate(token, ctx);

			expect(result).toBe('1. First\n2. Second');
		});

		it('should convert three items', () => {
			const token = createEnvToken('enumerate', '\\item One \\item Two \\item Three');
			const ctx = createContext();

			const result = convertEnumerate(token, ctx);

			expect(result).toBe('1. One\n2. Two\n3. Three');
		});
	});

	describe('nested lists', () => {
		it('should handle nested enumerate', () => {
			const content = `\\item Outer
    \\begin{enumerate}
      \\item Inner
    \\end{enumerate}`;
			const token = createEnvToken('enumerate', content);
			const ctx = createContext();

			const result = convertEnumerate(token, ctx);

			expect(result).toContain('1. Outer');
			expect(result).toContain('  1. Inner');
		});

		it('should reset numbering for nested lists', () => {
			const content = `\\item First
    \\begin{enumerate}
      \\item Nested A
      \\item Nested B
    \\end{enumerate}
  \\item Second`;
			const token = createEnvToken('enumerate', content);
			const ctx = createContext();

			const result = convertEnumerate(token, ctx);

			expect(result).toContain('1. First');
			expect(result).toContain('  1. Nested A');
			expect(result).toContain('  2. Nested B');
			expect(result).toContain('2. Second');
		});
	});

	describe('indentation at depth', () => {
		it('should indent when depth is 1', () => {
			const token = createEnvToken('enumerate', '\\item Nested', 1);
			const ctx = createContext();

			const result = convertEnumerate(token, ctx);

			expect(result).toBe('  1. Nested');
		});
	});
});

// ===========================
// Description Tests
// ===========================

describe('convertDescription', () => {
	describe('simple lists', () => {
		it('should convert single description item', () => {
			const token = createEnvToken('description', '\\item[Term] Definition');
			const ctx = createContext();

			const result = convertDescription(token, ctx);

			expect(result).toBe('**Term**: Definition');
		});

		it('should convert two description items', () => {
			const token = createEnvToken('description', '\\item[First] Def 1 \\item[Second] Def 2');
			const ctx = createContext();

			const result = convertDescription(token, ctx);

			expect(result).toBe('**First**: Def 1\n**Second**: Def 2');
		});

		it('should handle item without label', () => {
			const token = createEnvToken('description', '\\item Just text');
			const ctx = createContext();

			const result = convertDescription(token, ctx);

			expect(result).toBe('Just text');
		});
	});

	describe('nested lists', () => {
		it('should handle nested itemize in description', () => {
			const content = `\\item[Term] Definition
    \\begin{itemize}
      \\item Sub point
    \\end{itemize}`;
			const token = createEnvToken('description', content);
			const ctx = createContext();

			const result = convertDescription(token, ctx);

			expect(result).toContain('**Term**: Definition');
			expect(result).toContain('  - Sub point');
		});
	});

	describe('indentation at depth', () => {
		it('should indent when depth is 1', () => {
			const token = createEnvToken('description', '\\item[Key] Value', 1);
			const ctx = createContext();

			const result = convertDescription(token, ctx);

			expect(result).toBe('  **Key**: Value');
		});
	});
});

// ===========================
// Mixed Nesting Tests
// ===========================

describe('mixed nesting', () => {
	it('should handle itemize inside enumerate', () => {
		const content = `\\item First
    \\begin{itemize}
      \\item Bullet A
      \\item Bullet B
    \\end{itemize}`;
		const token = createEnvToken('enumerate', content);
		const ctx = createContext();

		const result = convertEnumerate(token, ctx);

		expect(result).toContain('1. First');
		expect(result).toContain('  - Bullet A');
		expect(result).toContain('  - Bullet B');
	});

	it('should handle enumerate inside itemize', () => {
		const content = `\\item First
    \\begin{enumerate}
      \\item Step 1
      \\item Step 2
    \\end{enumerate}`;
		const token = createEnvToken('itemize', content);
		const ctx = createContext();

		const result = convertItemize(token, ctx);

		expect(result).toContain('- First');
		expect(result).toContain('  1. Step 1');
		expect(result).toContain('  2. Step 2');
	});

	it('should handle description inside itemize', () => {
		const content = `\\item Details
    \\begin{description}
      \\item[Name] John
      \\item[Age] 30
    \\end{description}`;
		const token = createEnvToken('itemize', content);
		const ctx = createContext();

		const result = convertItemize(token, ctx);

		expect(result).toContain('- Details');
		expect(result).toContain('  **Name**: John');
		expect(result).toContain('  **Age**: 30');
	});
});

// ===========================
// Edge Cases
// ===========================

describe('edge cases', () => {
	it('should handle empty itemize', () => {
		const token = createEnvToken('itemize', '');
		const ctx = createContext();

		const result = convertItemize(token, ctx);

		expect(result).toBe('');
	});

	it('should handle empty enumerate', () => {
		const token = createEnvToken('enumerate', '');
		const ctx = createContext();

		const result = convertEnumerate(token, ctx);

		expect(result).toBe('');
	});

	it('should handle empty description', () => {
		const token = createEnvToken('description', '');
		const ctx = createContext();

		const result = convertDescription(token, ctx);

		expect(result).toBe('');
	});

	it('should handle itemize with only whitespace', () => {
		const token = createEnvToken('itemize', '   \n   ');
		const ctx = createContext();

		const result = convertItemize(token, ctx);

		expect(result).toBe('');
	});

	it('should handle special characters in items', () => {
		const token = createEnvToken('itemize', '\\item Item with & and %');
		const ctx = createContext();

		const result = convertItemize(token, ctx);

		expect(result).toBe('- Item with & and %');
	});

	it('should handle very long items', () => {
		const longText = 'This is a very long item '.repeat(10);
		const token = createEnvToken('itemize', `\\item ${longText}`);
		const ctx = createContext();

		const result = convertItemize(token, ctx);

		expect(result).toContain('- This is a very long item');
	});

	it('should handle consecutive nested lists', () => {
		const content = `\\item First
    \\begin{itemize}
      \\item A
    \\end{itemize}
  \\item Second
    \\begin{itemize}
      \\item B
    \\end{itemize}`;
		const token = createEnvToken('itemize', content);
		const ctx = createContext();

		const result = convertItemize(token, ctx);

		const lines = result.split('\n');
		expect(lines.some((l) => l === '- First')).toBe(true);
		expect(lines.some((l) => l === '  - A')).toBe(true);
		expect(lines.some((l) => l === '- Second')).toBe(true);
		expect(lines.some((l) => l === '  - B')).toBe(true);
	});
});

// ===========================
// Multi-line Content Tests
// ===========================

describe('multi-line content', () => {
	it('should handle multi-line itemize item', () => {
		const token = createEnvToken('itemize', '\\item First line\n    continuation');
		const ctx = createContext();

		const result = convertItemize(token, ctx);

		expect(result).toContain('- First line');
		expect(result).toContain('continuation');
	});

	it('should handle multi-line enumerate item', () => {
		const token = createEnvToken('enumerate', '\\item First line\n    continuation');
		const ctx = createContext();

		const result = convertEnumerate(token, ctx);

		expect(result).toContain('1. First line');
		expect(result).toContain('continuation');
	});

	it('should handle multi-line description definition', () => {
		const token = createEnvToken('description', '\\item[Term] First line\n    continuation');
		const ctx = createContext();

		const result = convertDescription(token, ctx);

		expect(result).toContain('**Term**: First line');
		expect(result).toContain('continuation');
	});
});
