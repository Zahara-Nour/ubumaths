/**
 * Tests for block converters (quote, verbatim, lstlisting, minted, figure, center)
 */

import { describe, it, expect } from 'vitest';
import {
	convertQuote,
	convertQuotation,
	convertVerbatim,
	convertLstlisting,
	convertMinted,
	convertIncludegraphics,
	convertFigure,
	convertCenter,
	extractLstlistingLanguage,
	extractCaption,
	extractImagePath,
	normalizeLanguage,
	isBlockEnvironment,
	blockEnvironmentConverters,
	blockCommandConverters,
	getBlockEnvironmentConverter,
	getBlockCommandConverter,
	hasBlockEnvironmentConverter,
	hasBlockCommandConverter
} from '../converters/blocks';
import type {
	EnvironmentToken,
	CommandToken,
	ConversionContext,
	LatexToMarkdownOptions
} from '../types';

// ===========================
// Test Helpers
// ===========================

/**
 * Create a mock EnvironmentToken for testing
 */
function createEnvToken(
	name: string,
	content: string,
	options?: string,
	depth: number = 0
): EnvironmentToken {
	const raw = options
		? `\\begin{${name}}[${options}]${content}\\end{${name}}`
		: `\\begin{${name}}${content}\\end{${name}}`;
	return {
		type: 'environment',
		name,
		content,
		options,
		raw,
		start: 0,
		end: raw.length,
		line: 1,
		column: 1,
		depth
	};
}

/**
 * Create a mock CommandToken for testing
 */
function createCommandToken(name: string, args: string[] = [], options?: string[]): CommandToken {
	return {
		type: 'command',
		raw: `\\${name}${options ? `[${options.join(',')}]` : ''}${args.map((a) => `{${a}}`).join('')}`,
		start: 0,
		end: 0,
		line: 1,
		column: 1,
		name,
		args,
		options
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
		preserveWhitespace: false
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

describe('isBlockEnvironment', () => {
	it('should return true for quote', () => {
		expect(isBlockEnvironment('quote')).toBe(true);
	});

	it('should return true for quotation', () => {
		expect(isBlockEnvironment('quotation')).toBe(true);
	});

	it('should return true for verbatim', () => {
		expect(isBlockEnvironment('verbatim')).toBe(true);
	});

	it('should return true for lstlisting', () => {
		expect(isBlockEnvironment('lstlisting')).toBe(true);
	});

	it('should return true for minted', () => {
		expect(isBlockEnvironment('minted')).toBe(true);
	});

	it('should return true for figure', () => {
		expect(isBlockEnvironment('figure')).toBe(true);
	});

	it('should return true for center', () => {
		expect(isBlockEnvironment('center')).toBe(true);
	});

	it('should return false for non-block environments', () => {
		expect(isBlockEnvironment('itemize')).toBe(false);
		expect(isBlockEnvironment('enumerate')).toBe(false);
		expect(isBlockEnvironment('table')).toBe(false);
	});
});

describe('extractLstlistingLanguage', () => {
	it('should extract Python language', () => {
		expect(extractLstlistingLanguage('[language=Python]')).toBe('python');
	});

	it('should extract lowercase python', () => {
		expect(extractLstlistingLanguage('[language=python]')).toBe('python');
	});

	it('should extract JavaScript', () => {
		expect(extractLstlistingLanguage('[language=JavaScript]')).toBe('javascript');
	});

	it('should extract language with other options', () => {
		expect(extractLstlistingLanguage('[language=Python, numbers=left]')).toBe('python');
	});

	it('should handle language in middle of options', () => {
		expect(extractLstlistingLanguage('[numbers=left, language=Java, frame=single]')).toBe('java');
	});

	it('should handle spaces around equals', () => {
		expect(extractLstlistingLanguage('[language = Python]')).toBe('python');
	});

	it('should return undefined for no language', () => {
		expect(extractLstlistingLanguage('[numbers=left]')).toBeUndefined();
	});

	it('should return undefined for undefined options', () => {
		expect(extractLstlistingLanguage(undefined)).toBeUndefined();
	});

	it('should return undefined for empty options', () => {
		expect(extractLstlistingLanguage('')).toBeUndefined();
	});

	it('should handle unknown language as lowercase', () => {
		expect(extractLstlistingLanguage('[language=CustomLang]')).toBe('customlang');
	});
});

describe('extractCaption', () => {
	it('should extract simple caption', () => {
		expect(extractCaption('\\caption{My caption}')).toBe('My caption');
	});

	it('should extract caption with other content', () => {
		expect(extractCaption('\\includegraphics{img.png}\\caption{My caption}\\label{fig:1}')).toBe(
			'My caption'
		);
	});

	it('should handle nested braces in caption', () => {
		expect(extractCaption('\\caption{Caption with {nested} braces}')).toBe(
			'Caption with {nested} braces'
		);
	});

	it('should handle deeply nested braces', () => {
		expect(extractCaption('\\caption{A {B {C} D} E}')).toBe('A {B {C} D} E');
	});

	it('should return undefined when no caption', () => {
		expect(extractCaption('\\includegraphics{img.png}')).toBeUndefined();
	});

	it('should return undefined for empty string', () => {
		expect(extractCaption('')).toBeUndefined();
	});

	it('should trim caption content', () => {
		expect(extractCaption('\\caption{  Trimmed caption  }')).toBe('Trimmed caption');
	});
});

describe('extractImagePath', () => {
	it('should extract simple image path', () => {
		expect(extractImagePath('\\includegraphics{image.png}')).toBe('image.png');
	});

	it('should extract path with options', () => {
		expect(extractImagePath('\\includegraphics[width=0.5\\textwidth]{figure.jpg}')).toBe(
			'figure.jpg'
		);
	});

	it('should extract path with multiple options', () => {
		expect(extractImagePath('\\includegraphics[width=10cm, height=5cm]{diagram.pdf}')).toBe(
			'diagram.pdf'
		);
	});

	it('should handle path with directory', () => {
		expect(extractImagePath('\\includegraphics{images/photo.png}')).toBe('images/photo.png');
	});

	it('should return undefined when no includegraphics', () => {
		expect(extractImagePath('\\caption{No image here}')).toBeUndefined();
	});

	it('should return undefined for empty string', () => {
		expect(extractImagePath('')).toBeUndefined();
	});

	it('should trim path', () => {
		expect(extractImagePath('\\includegraphics{  path.png  }')).toBe('path.png');
	});
});

describe('normalizeLanguage', () => {
	it('should normalize Python to python', () => {
		expect(normalizeLanguage('Python')).toBe('python');
	});

	it('should normalize JavaScript to javascript', () => {
		expect(normalizeLanguage('JavaScript')).toBe('javascript');
	});

	it('should normalize js to javascript', () => {
		expect(normalizeLanguage('js')).toBe('javascript');
	});

	it('should normalize C++ to cpp', () => {
		expect(normalizeLanguage('C++')).toBe('cpp');
	});

	it('should lowercase unknown languages', () => {
		expect(normalizeLanguage('UnknownLang')).toBe('unknownlang');
	});

	it('should preserve already lowercase', () => {
		expect(normalizeLanguage('python')).toBe('python');
	});
});

// ===========================
// Quote Tests
// ===========================

describe('convertQuote', () => {
	const ctx = createContext();

	describe('simple quotes', () => {
		it('should convert single line quote', () => {
			const token = createEnvToken('quote', 'This is a quote.');
			const result = convertQuote(token, ctx);
			expect(result).toBe('> This is a quote.');
		});

		it('should convert multi-line quote', () => {
			const token = createEnvToken('quote', 'First line.\nSecond line.');
			const result = convertQuote(token, ctx);
			expect(result).toBe('> First line.\n> Second line.');
		});

		it('should handle quote with leading/trailing whitespace', () => {
			const token = createEnvToken('quote', '  \n  Quoted text  \n  ');
			const result = convertQuote(token, ctx);
			expect(result).toBe('> Quoted text');
		});

		it('should handle empty quote', () => {
			const token = createEnvToken('quote', '');
			const result = convertQuote(token, ctx);
			expect(result).toBe('');
		});

		it('should handle quote with only whitespace', () => {
			const token = createEnvToken('quote', '   \n   \n   ');
			const result = convertQuote(token, ctx);
			expect(result).toBe('');
		});
	});

	describe('complex quotes', () => {
		it('should preserve inline formatting', () => {
			const token = createEnvToken('quote', '\\textbf{Bold} and *italic*');
			const result = convertQuote(token, ctx);
			expect(result).toBe('> \\textbf{Bold} and *italic*');
		});

		it('should handle multiple paragraphs', () => {
			const token = createEnvToken('quote', 'First paragraph.\n\nSecond paragraph.');
			const result = convertQuote(token, ctx);
			// Empty lines are filtered out, each non-empty line gets >
			expect(result).toBe('> First paragraph.\n> Second paragraph.');
		});

		it('should handle quote with special characters', () => {
			const token = createEnvToken('quote', 'Quote with & and % characters');
			const result = convertQuote(token, ctx);
			expect(result).toBe('> Quote with & and % characters');
		});
	});
});

describe('convertQuotation', () => {
	const ctx = createContext();

	it('should behave same as quote', () => {
		const token = createEnvToken('quotation', 'This is a quotation.');
		const result = convertQuotation(token, ctx);
		expect(result).toBe('> This is a quotation.');
	});
});

// ===========================
// Verbatim Tests
// ===========================

describe('convertVerbatim', () => {
	const ctx = createContext();

	describe('simple code blocks', () => {
		it('should convert simple verbatim', () => {
			const token = createEnvToken('verbatim', '\ncode here\n');
			const result = convertVerbatim(token, ctx);
			expect(result).toBe('```\ncode here\n```');
		});

		it('should preserve indentation', () => {
			const token = createEnvToken('verbatim', '\nfunction hello() {\n  return "world";\n}\n');
			const result = convertVerbatim(token, ctx);
			expect(result).toBe('```\nfunction hello() {\n  return "world";\n}\n```');
		});

		it('should preserve special characters', () => {
			const token = createEnvToken('verbatim', '\n<html> & "quotes" $var\n');
			const result = convertVerbatim(token, ctx);
			expect(result).toBe('```\n<html> & "quotes" $var\n```');
		});
	});

	describe('whitespace handling', () => {
		it('should handle no leading newline', () => {
			const token = createEnvToken('verbatim', 'code');
			const result = convertVerbatim(token, ctx);
			expect(result).toBe('```\ncode\n```');
		});

		it('should handle empty content', () => {
			const token = createEnvToken('verbatim', '');
			const result = convertVerbatim(token, ctx);
			expect(result).toBe('```\n\n```');
		});

		it('should preserve multiple blank lines', () => {
			const token = createEnvToken('verbatim', '\nline1\n\n\nline2\n');
			const result = convertVerbatim(token, ctx);
			expect(result).toBe('```\nline1\n\n\nline2\n```');
		});

		it('should preserve tabs', () => {
			const token = createEnvToken('verbatim', '\n\tindented with tab\n');
			const result = convertVerbatim(token, ctx);
			expect(result).toBe('```\n\tindented with tab\n```');
		});
	});
});

// ===========================
// Lstlisting Tests
// ===========================

describe('convertLstlisting', () => {
	const ctx = createContext();

	describe('with language', () => {
		it('should convert lstlisting with Python', () => {
			const token = createEnvToken(
				'lstlisting',
				'\ndef hello():\n    return "world"\n',
				'language=Python'
			);
			const result = convertLstlisting(token, ctx);
			expect(result).toBe('```python\ndef hello():\n    return "world"\n```');
		});

		it('should convert lstlisting with JavaScript', () => {
			const token = createEnvToken('lstlisting', '\nconst x = 1;\n', 'language=JavaScript');
			const result = convertLstlisting(token, ctx);
			expect(result).toBe('```javascript\nconst x = 1;\n```');
		});

		it('should convert lstlisting with Java', () => {
			const token = createEnvToken('lstlisting', '\npublic class Hello {}\n', 'language=Java');
			const result = convertLstlisting(token, ctx);
			expect(result).toBe('```java\npublic class Hello {}\n```');
		});

		it('should handle language with other options', () => {
			const token = createEnvToken(
				'lstlisting',
				'\ncode\n',
				'language=Python, numbers=left, frame=single'
			);
			const result = convertLstlisting(token, ctx);
			expect(result).toBe('```python\ncode\n```');
		});
	});

	describe('without language', () => {
		it('should convert lstlisting without language', () => {
			const token = createEnvToken('lstlisting', '\nsome code\n');
			const result = convertLstlisting(token, ctx);
			expect(result).toBe('```\nsome code\n```');
		});

		it('should convert lstlisting with non-language options', () => {
			const token = createEnvToken('lstlisting', '\ncode\n', 'numbers=left');
			const result = convertLstlisting(token, ctx);
			expect(result).toBe('```\ncode\n```');
		});
	});

	describe('content preservation', () => {
		it('should preserve indentation', () => {
			const token = createEnvToken(
				'lstlisting',
				'\nif True:\n    print("hello")\n',
				'language=Python'
			);
			const result = convertLstlisting(token, ctx);
			expect(result).toBe('```python\nif True:\n    print("hello")\n```');
		});

		it('should preserve special LaTeX characters', () => {
			const token = createEnvToken('lstlisting', '\n\\textbf is not bold here\n');
			const result = convertLstlisting(token, ctx);
			expect(result).toBe('```\n\\textbf is not bold here\n```');
		});
	});
});

// ===========================
// Minted Tests
// ===========================

describe('convertMinted', () => {
	const ctx = createContext();

	describe('with language', () => {
		it('should convert minted with javascript', () => {
			const token = createEnvToken('minted', '\nconst x = 1;\n', 'javascript');
			const result = convertMinted(token, ctx);
			expect(result).toBe('```javascript\nconst x = 1;\n```');
		});

		it('should convert minted with python', () => {
			const token = createEnvToken('minted', '\nx = 1\n', 'python');
			const result = convertMinted(token, ctx);
			expect(result).toBe('```python\nx = 1\n```');
		});

		it('should convert minted with braces in options', () => {
			const token = createEnvToken('minted', '\ncode\n', '{typescript}');
			const result = convertMinted(token, ctx);
			expect(result).toBe('```typescript\ncode\n```');
		});

		it('should normalize language case', () => {
			const token = createEnvToken('minted', '\ncode\n', 'Python');
			const result = convertMinted(token, ctx);
			expect(result).toBe('```python\ncode\n```');
		});
	});

	describe('without language', () => {
		it('should convert minted without options', () => {
			const token = createEnvToken('minted', '\ncode\n');
			const result = convertMinted(token, ctx);
			expect(result).toBe('```\ncode\n```');
		});
	});

	describe('content preservation', () => {
		it('should preserve complex code', () => {
			const code = '\nfunction test() {\n  return { a: 1, b: 2 };\n}\n';
			const token = createEnvToken('minted', code, 'javascript');
			const result = convertMinted(token, ctx);
			expect(result).toBe('```javascript\nfunction test() {\n  return { a: 1, b: 2 };\n}\n```');
		});
	});
});

// ===========================
// Image Tests
// ===========================

describe('convertIncludegraphics', () => {
	const ctx = createContext();

	describe('simple images', () => {
		it('should convert simple image', () => {
			const token = createCommandToken('includegraphics', ['image.png']);
			const result = convertIncludegraphics(token, ctx);
			expect(result).toBe('![](image.png)');
		});

		it('should convert image with path', () => {
			const token = createCommandToken('includegraphics', ['images/photo.jpg']);
			const result = convertIncludegraphics(token, ctx);
			expect(result).toBe('![](images/photo.jpg)');
		});

		it('should handle PDF files', () => {
			const token = createCommandToken('includegraphics', ['diagram.pdf']);
			const result = convertIncludegraphics(token, ctx);
			expect(result).toBe('![](diagram.pdf)');
		});
	});

	describe('with options', () => {
		it('should ignore width option', () => {
			const token = createCommandToken('includegraphics', ['figure.jpg'], ['width=0.5\\textwidth']);
			const result = convertIncludegraphics(token, ctx);
			expect(result).toBe('![](figure.jpg)');
		});

		it('should ignore scale option', () => {
			const token = createCommandToken('includegraphics', ['diagram.pdf'], ['scale=0.8']);
			const result = convertIncludegraphics(token, ctx);
			expect(result).toBe('![](diagram.pdf)');
		});

		it('should ignore multiple options', () => {
			const token = createCommandToken(
				'includegraphics',
				['image.png'],
				['width=10cm', 'height=5cm']
			);
			const result = convertIncludegraphics(token, ctx);
			expect(result).toBe('![](image.png)');
		});
	});

	describe('edge cases', () => {
		it('should handle empty path', () => {
			const token = createCommandToken('includegraphics', ['']);
			const result = convertIncludegraphics(token, ctx);
			expect(result).toBe('![]()');
		});

		it('should handle missing args', () => {
			const token = createCommandToken('includegraphics', []);
			const result = convertIncludegraphics(token, ctx);
			expect(result).toBe('![]()');
		});
	});
});

// ===========================
// Figure Tests
// ===========================

describe('convertFigure', () => {
	const ctx = createContext();

	describe('with caption', () => {
		it('should convert figure with caption', () => {
			const content = '\\includegraphics{image.png}\n\\caption{My caption}';
			const token = createEnvToken('figure', content);
			const result = convertFigure(token, ctx);
			expect(result).toBe('![My caption](image.png)');
		});

		it('should handle caption before includegraphics', () => {
			const content = '\\caption{Caption first}\n\\includegraphics{image.png}';
			const token = createEnvToken('figure', content);
			const result = convertFigure(token, ctx);
			expect(result).toBe('![Caption first](image.png)');
		});

		it('should handle figure with label', () => {
			const content = '\\includegraphics{image.png}\n\\caption{My caption}\n\\label{fig:example}';
			const token = createEnvToken('figure', content);
			const result = convertFigure(token, ctx);
			expect(result).toBe('![My caption](image.png)');
		});
	});

	describe('without caption', () => {
		it('should convert figure without caption', () => {
			const content = '\\includegraphics{image.png}';
			const token = createEnvToken('figure', content);
			const result = convertFigure(token, ctx);
			expect(result).toBe('![](image.png)');
		});
	});

	describe('with options', () => {
		it('should ignore includegraphics options', () => {
			const content = '\\includegraphics[width=0.8\\textwidth]{figure.jpg}\n\\caption{Figure}';
			const token = createEnvToken('figure', content);
			const result = convertFigure(token, ctx);
			expect(result).toBe('![Figure](figure.jpg)');
		});
	});

	describe('edge cases', () => {
		it('should return empty string for figure without image', () => {
			const content = '\\caption{No image}';
			const token = createEnvToken('figure', content);
			const result = convertFigure(token, ctx);
			expect(result).toBe('');
		});

		it('should handle empty figure', () => {
			const token = createEnvToken('figure', '');
			const result = convertFigure(token, ctx);
			expect(result).toBe('');
		});

		it('should handle caption with nested braces', () => {
			const content = '\\includegraphics{img.png}\n\\caption{Caption with {nested} braces}';
			const token = createEnvToken('figure', content);
			const result = convertFigure(token, ctx);
			expect(result).toBe('![Caption with {nested} braces](img.png)');
		});
	});
});

// ===========================
// Center Tests
// ===========================

describe('convertCenter', () => {
	const ctx = createContext();

	describe('simple center', () => {
		it('should return content without wrapper (center is ignored)', () => {
			const token = createEnvToken('center', 'Centered text');
			const result = convertCenter(token, ctx);
			expect(result).toBe('Centered text');
		});

		it('should handle multi-line centered text', () => {
			const token = createEnvToken('center', 'Line 1\nLine 2');
			const result = convertCenter(token, ctx);
			expect(result).toBe('Line 1\nLine 2');
		});
	});

	describe('whitespace handling', () => {
		it('should trim content', () => {
			const token = createEnvToken('center', '  \n  Content  \n  ');
			const result = convertCenter(token, ctx);
			expect(result).toBe('Content');
		});

		it('should handle empty center', () => {
			const token = createEnvToken('center', '');
			const result = convertCenter(token, ctx);
			expect(result).toBe('');
		});

		it('should handle whitespace-only content', () => {
			const token = createEnvToken('center', '   \n   ');
			const result = convertCenter(token, ctx);
			expect(result).toBe('');
		});
	});

	describe('with other content', () => {
		it('should preserve formatting commands', () => {
			const token = createEnvToken('center', '\\textbf{Bold centered}');
			const result = convertCenter(token, ctx);
			expect(result).toBe('\\textbf{Bold centered}');
		});

		it('should preserve math', () => {
			const token = createEnvToken('center', '$E = mc^2$');
			const result = convertCenter(token, ctx);
			expect(result).toBe('$E = mc^2$');
		});
	});
});

// ===========================
// Registry Tests
// ===========================

describe('blockEnvironmentConverters', () => {
	it('should have converter for quote', () => {
		expect(blockEnvironmentConverters['quote']).toBe(convertQuote);
	});

	it('should have converter for quotation', () => {
		expect(blockEnvironmentConverters['quotation']).toBe(convertQuotation);
	});

	it('should have converter for verbatim', () => {
		expect(blockEnvironmentConverters['verbatim']).toBe(convertVerbatim);
	});

	it('should have converter for lstlisting', () => {
		expect(blockEnvironmentConverters['lstlisting']).toBe(convertLstlisting);
	});

	it('should have converter for minted', () => {
		expect(blockEnvironmentConverters['minted']).toBe(convertMinted);
	});

	it('should have converter for figure', () => {
		expect(blockEnvironmentConverters['figure']).toBe(convertFigure);
	});

	it('should have converter for center', () => {
		expect(blockEnvironmentConverters['center']).toBe(convertCenter);
	});
});

describe('blockCommandConverters', () => {
	it('should have converter for includegraphics', () => {
		expect(blockCommandConverters['includegraphics']).toBe(convertIncludegraphics);
	});
});

describe('getBlockEnvironmentConverter', () => {
	it('should return converter for known environments', () => {
		expect(getBlockEnvironmentConverter('quote')).toBe(convertQuote);
		expect(getBlockEnvironmentConverter('verbatim')).toBe(convertVerbatim);
	});

	it('should return undefined for unknown environments', () => {
		expect(getBlockEnvironmentConverter('unknown')).toBeUndefined();
		expect(getBlockEnvironmentConverter('itemize')).toBeUndefined();
	});
});

describe('getBlockCommandConverter', () => {
	it('should return converter for includegraphics', () => {
		expect(getBlockCommandConverter('includegraphics')).toBe(convertIncludegraphics);
	});

	it('should return undefined for unknown commands', () => {
		expect(getBlockCommandConverter('unknown')).toBeUndefined();
		expect(getBlockCommandConverter('textbf')).toBeUndefined();
	});
});

describe('hasBlockEnvironmentConverter', () => {
	it('should return true for known environments', () => {
		expect(hasBlockEnvironmentConverter('quote')).toBe(true);
		expect(hasBlockEnvironmentConverter('verbatim')).toBe(true);
		expect(hasBlockEnvironmentConverter('lstlisting')).toBe(true);
		expect(hasBlockEnvironmentConverter('minted')).toBe(true);
		expect(hasBlockEnvironmentConverter('figure')).toBe(true);
		expect(hasBlockEnvironmentConverter('center')).toBe(true);
	});

	it('should return false for unknown environments', () => {
		expect(hasBlockEnvironmentConverter('unknown')).toBe(false);
		expect(hasBlockEnvironmentConverter('itemize')).toBe(false);
	});
});

describe('hasBlockCommandConverter', () => {
	it('should return true for includegraphics', () => {
		expect(hasBlockCommandConverter('includegraphics')).toBe(true);
	});

	it('should return false for unknown commands', () => {
		expect(hasBlockCommandConverter('unknown')).toBe(false);
		expect(hasBlockCommandConverter('textbf')).toBe(false);
	});
});

// ===========================
// Edge Cases
// ===========================

describe('edge cases', () => {
	const ctx = createContext();

	describe('nested quotes', () => {
		it('should handle quote inside quote (raw content)', () => {
			// In real usage, nested quotes would be processed recursively
			// Here we test that the raw content is preserved
			const token = createEnvToken(
				'quote',
				'Outer quote\n\\begin{quote}\nInner quote\n\\end{quote}'
			);
			const result = convertQuote(token, ctx);
			expect(result).toContain('> Outer quote');
			expect(result).toContain('> \\begin{quote}');
		});
	});

	describe('code with backticks', () => {
		it('should preserve backticks in verbatim', () => {
			const token = createEnvToken('verbatim', '\nconst s = `template ${literal}`;\n');
			const result = convertVerbatim(token, ctx);
			expect(result).toContain('`template ${literal}`');
		});

		it('should preserve triple backticks in verbatim', () => {
			const token = createEnvToken('verbatim', '\n```nested```\n');
			const result = convertVerbatim(token, ctx);
			// Content should be preserved as-is
			expect(result).toBe('```\n```nested```\n```');
		});
	});

	describe('unicode content', () => {
		it('should handle unicode in quotes', () => {
			const token = createEnvToken('quote', 'Citation en francais avec accents');
			const result = convertQuote(token, ctx);
			expect(result).toBe('> Citation en francais avec accents');
		});

		it('should handle unicode in code blocks', () => {
			const token = createEnvToken(
				'lstlisting',
				'\n# Commentaire en francais\n',
				'language=Python'
			);
			const result = convertLstlisting(token, ctx);
			expect(result).toContain('# Commentaire en francais');
		});
	});

	describe('very long content', () => {
		it('should handle long quote', () => {
			const longText = 'This is a long line. '.repeat(50);
			const token = createEnvToken('quote', longText);
			const result = convertQuote(token, ctx);
			expect(result.startsWith('> This is a long line.')).toBe(true);
		});

		it('should handle many lines of code', () => {
			const manyLines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n');
			const token = createEnvToken('verbatim', '\n' + manyLines + '\n');
			const result = convertVerbatim(token, ctx);
			expect(result).toContain('line 1');
			expect(result).toContain('line 100');
		});
	});
});

// ===========================
// Integration Tests
// ===========================

describe('integration tests', () => {
	const ctx = createContext();

	it('should correctly convert using environment registry', () => {
		const quoteToken = createEnvToken('quote', 'Test quote');
		const converter = blockEnvironmentConverters['quote'];
		expect(converter(quoteToken, ctx)).toBe('> Test quote');
	});

	it('should correctly convert using command registry', () => {
		const imgToken = createCommandToken('includegraphics', ['test.png']);
		const converter = blockCommandConverters['includegraphics'];
		expect(converter(imgToken, ctx)).toBe('![](test.png)');
	});

	it('should handle figure with all elements', () => {
		const content = `
\\centering
\\includegraphics[width=\\linewidth]{results/graph.png}
\\caption{Experimental results showing performance improvement}
\\label{fig:results}
`;
		const token = createEnvToken('figure', content);
		const result = convertFigure(token, ctx);
		expect(result).toBe(
			'![Experimental results showing performance improvement](results/graph.png)'
		);
	});
});
