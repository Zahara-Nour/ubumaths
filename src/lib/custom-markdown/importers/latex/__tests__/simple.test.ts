import { describe, it, expect } from 'vitest';
import {
	convertMathInline,
	convertMathDisplay,
	convertHeading,
	convertTextFormatting,
	convertHorizontalRule,
	convertSpecialCharacter,
	convertDashes,
	convertLineBreak,
	convertNumprint,
	isHeadingCommand,
	isFormattingCommand,
	isHorizontalRuleCommand,
	isEscapeCommand,
	simpleCommandConverters,
	getSimpleCommandConverter,
	hasSimpleConverter
} from '../converters/simple';
import type {
	CommandToken,
	MathInlineToken,
	MathDisplayToken,
	SpecialToken,
	ConversionContext,
	LatexToMarkdownOptions
} from '../types';

// Helper to create a minimal ConversionContext for testing
function createMockContext(): ConversionContext {
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
		addWarning: () => {}
	};
}

// Helper to create a CommandToken
function createCommandToken(name: string, args: string[] = [], options?: string[]): CommandToken {
	return {
		type: 'command',
		raw: `\\${name}${args.map((a) => `{${a}}`).join('')}`,
		start: 0,
		end: 0,
		line: 1,
		column: 1,
		name,
		args,
		options
	};
}

// Helper to create a MathInlineToken
function createMathInlineToken(latex: string, useParentheses = false): MathInlineToken {
	return {
		type: 'math-inline',
		raw: useParentheses ? `\\(${latex}\\)` : `$${latex}$`,
		start: 0,
		end: 0,
		line: 1,
		column: 1,
		latex,
		useParentheses
	};
}

// Helper to create a MathDisplayToken
function createMathDisplayToken(latex: string, useBrackets = false): MathDisplayToken {
	return {
		type: 'math-display',
		raw: useBrackets ? `\\[${latex}\\]` : `$$${latex}$$`,
		start: 0,
		end: 0,
		line: 1,
		column: 1,
		latex,
		useBrackets
	};
}

// Helper to create a SpecialToken
function createSpecialToken(char: string): SpecialToken {
	return {
		type: 'special',
		raw: char,
		start: 0,
		end: 0,
		line: 1,
		column: 1,
		char
	};
}

describe('simple converters', () => {
	const ctx = createMockContext();

	describe('convertMathInline', () => {
		it('should convert inline math with dollar signs', () => {
			const token = createMathInlineToken('x + y = z');
			expect(convertMathInline(token)).toBe('$x + y = z$');
		});

		it('should convert inline math with parentheses to dollar signs', () => {
			const token = createMathInlineToken('a^2 + b^2 = c^2', true);
			expect(convertMathInline(token)).toBe('$a^2 + b^2 = c^2$');
		});

		it('should preserve complex math expressions', () => {
			const token = createMathInlineToken('\\frac{a}{b} \\cdot \\sqrt{c}');
			expect(convertMathInline(token)).toBe('$\\frac{a}{b} \\cdot \\sqrt{c}$');
		});

		it('should handle empty math', () => {
			const token = createMathInlineToken('');
			expect(convertMathInline(token)).toBe('$$');
		});

		it('should preserve nested braces in math', () => {
			const token = createMathInlineToken('\\sum_{i=1}^{n} x_i');
			expect(convertMathInline(token)).toBe('$\\sum_{i=1}^{n} x_i$');
		});
	});

	describe('convertMathDisplay', () => {
		it('should convert display math with double dollar signs', () => {
			const token = createMathDisplayToken('E = mc^2');
			expect(convertMathDisplay(token)).toBe('$$E = mc^2$$');
		});

		it('should convert display math with brackets to double dollar signs', () => {
			const token = createMathDisplayToken('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', true);
			expect(convertMathDisplay(token)).toBe('$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$');
		});

		it('should preserve multiline math', () => {
			const token = createMathDisplayToken('\\begin{aligned}\nx &= 1 \\\\\ny &= 2\n\\end{aligned}');
			expect(convertMathDisplay(token)).toBe(
				'$$\\begin{aligned}\nx &= 1 \\\\\ny &= 2\n\\end{aligned}$$'
			);
		});

		it('should handle empty display math', () => {
			const token = createMathDisplayToken('');
			expect(convertMathDisplay(token)).toBe('$$$$');
		});
	});

	describe('convertHeading', () => {
		it('should convert \\section to h1', () => {
			const token = createCommandToken('section', ['Introduction']);
			expect(convertHeading(token, ctx)).toBe('# Introduction');
		});

		it('should convert \\section* to h1', () => {
			const token = createCommandToken('section*', ['Unnumbered Section']);
			expect(convertHeading(token, ctx)).toBe('# Unnumbered Section');
		});

		it('should convert \\subsection to h2', () => {
			const token = createCommandToken('subsection', ['Background']);
			expect(convertHeading(token, ctx)).toBe('## Background');
		});

		it('should convert \\subsubsection to h3', () => {
			const token = createCommandToken('subsubsection', ['Details']);
			expect(convertHeading(token, ctx)).toBe('### Details');
		});

		it('should convert \\paragraph to h4', () => {
			const token = createCommandToken('paragraph', ['Note']);
			expect(convertHeading(token, ctx)).toBe('#### Note');
		});

		it('should convert \\subparagraph to h5', () => {
			const token = createCommandToken('subparagraph', ['Remark']);
			expect(convertHeading(token, ctx)).toBe('##### Remark');
		});

		it('should convert \\chapter to h1', () => {
			const token = createCommandToken('chapter', ['First Chapter']);
			expect(convertHeading(token, ctx)).toBe('# First Chapter');
		});

		it('should handle empty heading', () => {
			const token = createCommandToken('section', ['']);
			expect(convertHeading(token, ctx)).toBe('# ');
		});

		it('should handle heading with no arguments', () => {
			const token = createCommandToken('section', []);
			expect(convertHeading(token, ctx)).toBe('# ');
		});
	});

	describe('convertTextFormatting', () => {
		it('should convert \\textbf to bold', () => {
			const token = createCommandToken('textbf', ['bold text']);
			expect(convertTextFormatting(token, ctx)).toBe('**bold text**');
		});

		it('should convert \\bf to bold', () => {
			const token = createCommandToken('bf', ['bold']);
			expect(convertTextFormatting(token, ctx)).toBe('**bold**');
		});

		it('should convert \\textit to italic', () => {
			const token = createCommandToken('textit', ['italic text']);
			expect(convertTextFormatting(token, ctx)).toBe('*italic text*');
		});

		it('should convert \\it to italic', () => {
			const token = createCommandToken('it', ['italic']);
			expect(convertTextFormatting(token, ctx)).toBe('*italic*');
		});

		it('should convert \\emph to italic', () => {
			const token = createCommandToken('emph', ['emphasis']);
			expect(convertTextFormatting(token, ctx)).toBe('*emphasis*');
		});

		it('should convert \\texttt to code', () => {
			const token = createCommandToken('texttt', ['code']);
			expect(convertTextFormatting(token, ctx)).toBe('`code`');
		});

		it('should convert \\tt to code', () => {
			const token = createCommandToken('tt', ['monospace']);
			expect(convertTextFormatting(token, ctx)).toBe('`monospace`');
		});

		it('should convert \\underline to HTML u tag', () => {
			const token = createCommandToken('underline', ['underlined']);
			expect(convertTextFormatting(token, ctx)).toBe('<u>underlined</u>');
		});

		it('should convert \\textsc to HTML span with small-caps', () => {
			const token = createCommandToken('textsc', ['Small Caps']);
			expect(convertTextFormatting(token, ctx)).toBe(
				'<span style="font-variant:small-caps">Small Caps</span>'
			);
		});

		it('should handle empty content', () => {
			const token = createCommandToken('textbf', ['']);
			expect(convertTextFormatting(token, ctx)).toBe('****');
		});

		it('should return content for unknown formatting command', () => {
			const token = createCommandToken('unknown', ['content']);
			expect(convertTextFormatting(token, ctx)).toBe('content');
		});
	});

	describe('convertHorizontalRule', () => {
		it('should return markdown horizontal rule', () => {
			expect(convertHorizontalRule()).toBe('---');
		});
	});

	describe('convertLineBreak', () => {
		it('should return two spaces followed by newline', () => {
			expect(convertLineBreak()).toBe('  \n');
		});
	});

	describe('convertSpecialCharacter', () => {
		describe('command tokens (escaped characters)', () => {
			it('should convert \\& to &', () => {
				const token = createCommandToken('&');
				expect(convertSpecialCharacter(token, ctx)).toBe('&');
			});

			it('should convert \\% to %', () => {
				const token = createCommandToken('%');
				expect(convertSpecialCharacter(token, ctx)).toBe('%');
			});

			it('should convert \\$ to $', () => {
				const token = createCommandToken('$');
				expect(convertSpecialCharacter(token, ctx)).toBe('$');
			});

			it('should convert \\_ to _', () => {
				const token = createCommandToken('_');
				expect(convertSpecialCharacter(token, ctx)).toBe('_');
			});

			it('should convert \\# to #', () => {
				const token = createCommandToken('#');
				expect(convertSpecialCharacter(token, ctx)).toBe('#');
			});

			it('should convert \\{ to {', () => {
				const token = createCommandToken('{');
				expect(convertSpecialCharacter(token, ctx)).toBe('{');
			});

			it('should convert \\} to }', () => {
				const token = createCommandToken('}');
				expect(convertSpecialCharacter(token, ctx)).toBe('}');
			});

			it('should convert \\textbackslash to \\', () => {
				const token = createCommandToken('textbackslash');
				expect(convertSpecialCharacter(token, ctx)).toBe('\\');
			});

			it('should convert \\backslash to \\', () => {
				const token = createCommandToken('backslash');
				expect(convertSpecialCharacter(token, ctx)).toBe('\\');
			});

			it('should convert \\ldots to ...', () => {
				const token = createCommandToken('ldots');
				expect(convertSpecialCharacter(token, ctx)).toBe('...');
			});

			it('should convert \\dots to ...', () => {
				const token = createCommandToken('dots');
				expect(convertSpecialCharacter(token, ctx)).toBe('...');
			});

			it('should convert \\LaTeX to LaTeX', () => {
				const token = createCommandToken('LaTeX');
				expect(convertSpecialCharacter(token, ctx)).toBe('LaTeX');
			});

			it('should convert \\TeX to TeX', () => {
				const token = createCommandToken('TeX');
				expect(convertSpecialCharacter(token, ctx)).toBe('TeX');
			});

			it('should convert \\par to double newline', () => {
				const token = createCommandToken('par');
				expect(convertSpecialCharacter(token, ctx)).toBe('\n\n');
			});

			it('should convert \\newline to line break with two spaces', () => {
				const token = createCommandToken('newline');
				expect(convertSpecialCharacter(token, ctx)).toBe('  \n');
			});

			it('should convert \\linebreak to line break with two spaces', () => {
				const token = createCommandToken('linebreak');
				expect(convertSpecialCharacter(token, ctx)).toBe('  \n');
			});

			it('should convert \\quad to two spaces', () => {
				const token = createCommandToken('quad');
				expect(convertSpecialCharacter(token, ctx)).toBe('  ');
			});

			it('should convert \\qquad to four spaces', () => {
				const token = createCommandToken('qquad');
				expect(convertSpecialCharacter(token, ctx)).toBe('    ');
			});

			it('should convert spacing commands to single space', () => {
				expect(convertSpecialCharacter(createCommandToken('enspace'), ctx)).toBe(' ');
				expect(convertSpecialCharacter(createCommandToken('thinspace'), ctx)).toBe(' ');
				expect(convertSpecialCharacter(createCommandToken(','), ctx)).toBe(' ');
				expect(convertSpecialCharacter(createCommandToken(';'), ctx)).toBe(' ');
				expect(convertSpecialCharacter(createCommandToken(':'), ctx)).toBe(' ');
			});

			it('should convert \\! (negative thin space) to empty string', () => {
				const token = createCommandToken('!');
				expect(convertSpecialCharacter(token, ctx)).toBe('');
			});

			it('should return empty string for unknown escape command', () => {
				const token = createCommandToken('unknowncommand');
				expect(convertSpecialCharacter(token, ctx)).toBe('');
			});
		});

		describe('special tokens (raw characters)', () => {
			it('should convert ~ to regular space', () => {
				const token = createSpecialToken('~');
				expect(convertSpecialCharacter(token, ctx)).toBe(' ');
			});

			it('should convert & to &', () => {
				const token = createSpecialToken('&');
				expect(convertSpecialCharacter(token, ctx)).toBe('&');
			});

			it('should pass through other special characters', () => {
				const token = createSpecialToken('#');
				expect(convertSpecialCharacter(token, ctx)).toBe('#');
			});
		});
	});

	describe('convertDashes', () => {
		it('should convert --- to em-dash', () => {
			expect(convertDashes('word---word')).toBe('word\u2014word');
		});

		it('should convert -- to en-dash', () => {
			expect(convertDashes('word--word')).toBe('word\u2013word');
		});

		it('should convert multiple dashes correctly', () => {
			expect(convertDashes('a---b--c---d')).toBe('a\u2014b\u2013c\u2014d');
		});

		it('should handle text without dashes', () => {
			expect(convertDashes('no dashes here')).toBe('no dashes here');
		});

		it('should handle single dashes', () => {
			expect(convertDashes('a-b-c')).toBe('a-b-c');
		});

		it('should handle four dashes correctly', () => {
			// Four dashes: --- is replaced first, leaving one -
			expect(convertDashes('----')).toBe('\u2014-');
		});

		it('should handle five dashes correctly', () => {
			// Five dashes: --- is replaced first, leaving --
			expect(convertDashes('-----')).toBe('\u2014\u2013');
		});
	});

	describe('convertNumprint', () => {
		it('should format integer with thin spaces', () => {
			const token = createCommandToken('np', ['12345']);
			expect(convertNumprint(token, ctx)).toBe('12\u202F345');
		});

		it('should format large number with multiple separators', () => {
			const token = createCommandToken('np', ['1234567']);
			expect(convertNumprint(token, ctx)).toBe('1\u202F234\u202F567');
		});

		it('should format decimal part with comma (left to right)', () => {
			const token = createCommandToken('np', ['12345,6789']);
			expect(convertNumprint(token, ctx)).toBe('12\u202F345,678\u202F9');
		});

		it('should format decimal part with period (left to right)', () => {
			const token = createCommandToken('np', ['12345.6789']);
			expect(convertNumprint(token, ctx)).toBe('12\u202F345.678\u202F9');
		});

		it('should format large number with long decimal part', () => {
			const token = createCommandToken('np', ['1234567,89012345']);
			expect(convertNumprint(token, ctx)).toBe('1\u202F234\u202F567,890\u202F123\u202F45');
		});

		it('should handle small numbers without formatting', () => {
			const token = createCommandToken('np', ['123']);
			expect(convertNumprint(token, ctx)).toBe('123');
		});

		it('should handle short decimal without formatting', () => {
			const token = createCommandToken('np', ['123,45']);
			expect(convertNumprint(token, ctx)).toBe('123,45');
		});

		it('should handle empty argument', () => {
			const token = createCommandToken('np', ['']);
			expect(convertNumprint(token, ctx)).toBe('');
		});

		it('should handle number with no arguments', () => {
			const token = createCommandToken('np', []);
			expect(convertNumprint(token, ctx)).toBe('');
		});
	});

	describe('isHeadingCommand', () => {
		it('should return true for heading commands', () => {
			expect(isHeadingCommand('chapter')).toBe(true);
			expect(isHeadingCommand('section')).toBe(true);
			expect(isHeadingCommand('subsection')).toBe(true);
			expect(isHeadingCommand('subsubsection')).toBe(true);
			expect(isHeadingCommand('paragraph')).toBe(true);
			expect(isHeadingCommand('subparagraph')).toBe(true);
		});

		it('should return true for star variants', () => {
			expect(isHeadingCommand('section*')).toBe(true);
			expect(isHeadingCommand('chapter*')).toBe(true);
		});

		it('should return false for non-heading commands', () => {
			expect(isHeadingCommand('textbf')).toBe(false);
			expect(isHeadingCommand('emph')).toBe(false);
			expect(isHeadingCommand('begin')).toBe(false);
		});
	});

	describe('isFormattingCommand', () => {
		it('should return true for formatting commands', () => {
			expect(isFormattingCommand('textbf')).toBe(true);
			expect(isFormattingCommand('bf')).toBe(true);
			expect(isFormattingCommand('textit')).toBe(true);
			expect(isFormattingCommand('it')).toBe(true);
			expect(isFormattingCommand('emph')).toBe(true);
			expect(isFormattingCommand('texttt')).toBe(true);
			expect(isFormattingCommand('tt')).toBe(true);
			expect(isFormattingCommand('underline')).toBe(true);
			expect(isFormattingCommand('textsc')).toBe(true);
		});

		it('should return false for non-formatting commands', () => {
			expect(isFormattingCommand('section')).toBe(false);
			expect(isFormattingCommand('begin')).toBe(false);
			expect(isFormattingCommand('hrule')).toBe(false);
		});
	});

	describe('isHorizontalRuleCommand', () => {
		it('should return true for horizontal rule commands', () => {
			expect(isHorizontalRuleCommand('hrule')).toBe(true);
			expect(isHorizontalRuleCommand('hline')).toBe(true);
			expect(isHorizontalRuleCommand('rule')).toBe(true);
		});

		it('should return false for non-horizontal-rule commands', () => {
			expect(isHorizontalRuleCommand('section')).toBe(false);
			expect(isHorizontalRuleCommand('textbf')).toBe(false);
		});
	});

	describe('isEscapeCommand', () => {
		it('should return true for escape commands', () => {
			expect(isEscapeCommand('&')).toBe(true);
			expect(isEscapeCommand('%')).toBe(true);
			expect(isEscapeCommand('$')).toBe(true);
			expect(isEscapeCommand('_')).toBe(true);
			expect(isEscapeCommand('#')).toBe(true);
			expect(isEscapeCommand('{')).toBe(true);
			expect(isEscapeCommand('}')).toBe(true);
			expect(isEscapeCommand('ldots')).toBe(true);
			expect(isEscapeCommand('par')).toBe(true);
		});

		it('should return false for non-escape commands', () => {
			expect(isEscapeCommand('section')).toBe(false);
			expect(isEscapeCommand('textbf')).toBe(false);
		});
	});

	describe('simpleCommandConverters registry', () => {
		it('should have converters for all heading commands', () => {
			expect(simpleCommandConverters['section']).toBeDefined();
			expect(simpleCommandConverters['section*']).toBeDefined();
			expect(simpleCommandConverters['subsection']).toBeDefined();
			expect(simpleCommandConverters['subsubsection']).toBeDefined();
			expect(simpleCommandConverters['paragraph']).toBeDefined();
			expect(simpleCommandConverters['subparagraph']).toBeDefined();
			expect(simpleCommandConverters['chapter']).toBeDefined();
		});

		it('should have converters for all formatting commands', () => {
			expect(simpleCommandConverters['textbf']).toBeDefined();
			expect(simpleCommandConverters['textit']).toBeDefined();
			expect(simpleCommandConverters['emph']).toBeDefined();
			expect(simpleCommandConverters['texttt']).toBeDefined();
			expect(simpleCommandConverters['underline']).toBeDefined();
			expect(simpleCommandConverters['textsc']).toBeDefined();
		});

		it('should have converters for horizontal rules', () => {
			expect(simpleCommandConverters['hrule']).toBeDefined();
			expect(simpleCommandConverters['hline']).toBeDefined();
			expect(simpleCommandConverters['rule']).toBeDefined();
		});

		it('should have converter for line break', () => {
			expect(simpleCommandConverters['\\']).toBeDefined();
		});

		it('should have converters for escape commands', () => {
			expect(simpleCommandConverters['&']).toBeDefined();
			expect(simpleCommandConverters['%']).toBeDefined();
			expect(simpleCommandConverters['$']).toBeDefined();
			expect(simpleCommandConverters['ldots']).toBeDefined();
		});

		it('should have converter for numprint (np)', () => {
			expect(simpleCommandConverters['np']).toBeDefined();
		});

		it('should correctly convert using registry', () => {
			const sectionToken = createCommandToken('section', ['Title']);
			const converter = simpleCommandConverters['section'];
			expect(converter(sectionToken, ctx)).toBe('# Title');
		});
	});

	describe('getSimpleCommandConverter', () => {
		it('should return converter for known commands', () => {
			expect(getSimpleCommandConverter('section')).toBeDefined();
			expect(getSimpleCommandConverter('textbf')).toBeDefined();
		});

		it('should return undefined for unknown commands', () => {
			expect(getSimpleCommandConverter('unknowncommand')).toBeUndefined();
		});
	});

	describe('hasSimpleConverter', () => {
		it('should return true for known commands', () => {
			expect(hasSimpleConverter('section')).toBe(true);
			expect(hasSimpleConverter('textbf')).toBe(true);
			expect(hasSimpleConverter('hrule')).toBe(true);
		});

		it('should return false for unknown commands', () => {
			expect(hasSimpleConverter('unknowncommand')).toBe(false);
			expect(hasSimpleConverter('begin')).toBe(false);
		});
	});

	describe('integration tests', () => {
		it('should handle nested formatting through registry', () => {
			// Test that the registry can be used to convert commands
			const boldToken = createCommandToken('textbf', ['important']);
			const italicToken = createCommandToken('textit', ['emphasis']);

			expect(simpleCommandConverters['textbf'](boldToken, ctx)).toBe('**important**');
			expect(simpleCommandConverters['textit'](italicToken, ctx)).toBe('*emphasis*');
		});

		it('should handle horizontal rule through registry', () => {
			const hruleToken = createCommandToken('hrule');
			expect(simpleCommandConverters['hrule'](hruleToken, ctx)).toBe('---');
		});

		it('should handle line break through registry', () => {
			const lineBreakToken = createCommandToken('\\');
			expect(simpleCommandConverters['\\'](lineBreakToken, ctx)).toBe('  \n');
		});
	});
});
