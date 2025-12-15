import { describe, it, expect } from 'vitest';
import {
	tokenize,
	findMatchingBrace,
	findMatchingBracket,
	extractEnvironment,
	extractInlineMath,
	extractDisplayMath,
	extractCommand,
	getLineNumber
} from '../tokenizer';
import type {
	TextToken,
	CommandToken,
	EnvironmentToken,
	MathInlineToken,
	MathDisplayToken,
	CommentToken,
	NewlineToken,
	GroupToken,
	SpecialToken
} from '../types';

describe('tokenizer', () => {
	describe('tokenize', () => {
		it('should tokenize plain text', () => {
			const latex = 'Hello world';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(3);
			expect(tokens[0].type).toBe('text');
			expect((tokens[0] as TextToken).content).toBe('Hello');
			expect(tokens[1].type).toBe('whitespace');
			expect(tokens[2].type).toBe('text');
			expect((tokens[2] as TextToken).content).toBe('world');
		});

		it('should tokenize commands with arguments', () => {
			const latex = '\\textbf{bold text}';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('command');
			const cmd = tokens[0] as CommandToken;
			expect(cmd.name).toBe('textbf');
			expect(cmd.args).toEqual(['bold text']);
		});

		it('should tokenize commands with optional arguments', () => {
			const latex = '\\documentclass[12pt]{article}';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('command');
			const cmd = tokens[0] as CommandToken;
			expect(cmd.name).toBe('documentclass');
			expect(cmd.options).toEqual(['12pt']);
			expect(cmd.args).toEqual(['article']);
		});

		it('should tokenize inline math', () => {
			const latex = 'The formula $a^2 + b^2 = c^2$ is famous';
			const tokens = tokenize(latex);

			const mathToken = tokens.find((t) => t.type === 'math-inline') as MathInlineToken;
			expect(mathToken).toBeDefined();
			expect(mathToken.latex).toBe('a^2 + b^2 = c^2');
		});

		it('should tokenize display math with $$', () => {
			const latex = '$$E = mc^2$$';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('math-display');
			const math = tokens[0] as MathDisplayToken;
			expect(math.latex).toBe('E = mc^2');
			expect(math.useBrackets).toBe(false);
		});

		it('should tokenize display math with \\[...\\]', () => {
			const latex = '\\[x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\]';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('math-display');
			const math = tokens[0] as MathDisplayToken;
			expect(math.latex).toBe('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
			expect(math.useBrackets).toBe(true);
		});

		it('should tokenize environments', () => {
			const latex = '\\begin{itemize}\\item First\\item Second\\end{itemize}';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('environment');
			const env = tokens[0] as EnvironmentToken;
			expect(env.name).toBe('itemize');
			expect(env.content).toBe('\\item First\\item Second');
		});

		it('should tokenize nested environments', () => {
			const latex = '\\begin{itemize}\\begin{enumerate}\\item Nested\\end{enumerate}\\end{itemize}';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('environment');
			const env = tokens[0] as EnvironmentToken;
			expect(env.name).toBe('itemize');
			expect(env.content).toContain('\\begin{enumerate}');
		});

		it('should tokenize comments', () => {
			const latex = 'Text % This is a comment\nMore text';
			const tokens = tokenize(latex);

			const comment = tokens.find((t) => t.type === 'comment') as CommentToken;
			expect(comment).toBeDefined();
			expect(comment.content).toBe(' This is a comment');
		});

		it('should handle escaped characters', () => {
			const latex = 'Price: \\$50 and 100\\%';
			const tokens = tokenize(latex);

			const escapedDollar = tokens.find(
				(t) => t.type === 'command' && t.raw === '\\$'
			) as CommandToken;
			const escapedPercent = tokens.find(
				(t) => t.type === 'command' && t.raw === '\\%'
			) as CommandToken;

			expect(escapedDollar).toBeDefined();
			expect(escapedDollar.name).toBe('$');
			expect(escapedPercent).toBeDefined();
			expect(escapedPercent.name).toBe('%');
		});

		it('should tokenize special characters', () => {
			const latex = 'a & b ~ c # d _ e ^ f';
			const tokens = tokenize(latex);

			const specials = tokens.filter((t) => t.type === 'special') as SpecialToken[];
			expect(specials).toHaveLength(5);
			expect(specials.map((s) => s.char)).toEqual(['&', '~', '#', '_', '^']);
		});

		it('should tokenize groups', () => {
			const latex = '{grouped text}';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('group');
			const group = tokens[0] as GroupToken;
			expect(group.content).toBe('grouped text');
		});

		it('should handle newlines', () => {
			const latex = 'Line 1\nLine 2\n\nParagraph 2';
			const tokens = tokenize(latex);

			const newlines = tokens.filter((t) => t.type === 'newline') as NewlineToken[];
			expect(newlines).toHaveLength(2);
			expect(newlines[0].count).toBe(1);
			expect(newlines[0].isParagraphBreak).toBe(false);
			expect(newlines[1].count).toBe(2);
			expect(newlines[1].isParagraphBreak).toBe(true);
		});

		it('should track line numbers correctly', () => {
			const latex = 'Line 1\n\\textbf{Line 2}\nLine 3';
			const tokens = tokenize(latex);

			const cmd = tokens.find((t) => t.type === 'command') as CommandToken;
			expect(cmd.line).toBe(2);
		});

		it('should handle verbatim environments', () => {
			const latex = '\\begin{verbatim}\\special{chars} $ % &\\end{verbatim}';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('environment');
			const env = tokens[0] as EnvironmentToken;
			expect(env.name).toBe('verbatim');
			expect(env.content).toBe('\\special{chars} $ % &');
		});

		it('should handle star variants of commands', () => {
			const latex = '\\section*{Unnumbered Section}';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('command');
			const cmd = tokens[0] as CommandToken;
			expect(cmd.name).toBe('section*');
			expect(cmd.args).toEqual(['Unnumbered Section']);
		});

		it('should handle line breaks (\\\\)', () => {
			const latex = 'Line 1\\\\Line 2';
			const tokens = tokenize(latex);

			const lineBreak = tokens.find((t) => t.type === 'command' && t.name === '\\') as CommandToken;
			expect(lineBreak).toBeDefined();
		});

		it('should handle inline math with parentheses', () => {
			const latex = 'Inline \\(x + y\\) math';
			const tokens = tokenize(latex);

			const math = tokens.find((t) => t.type === 'math-inline') as MathInlineToken;
			expect(math).toBeDefined();
			expect(math.latex).toBe('x + y');
			expect(math.useParentheses).toBe(true);
		});

		it('should handle empty input', () => {
			const tokens = tokenize('');
			expect(tokens).toEqual([]);
		});

		it('should handle commands with multiple arguments', () => {
			const latex = '\\frac{numerator}{denominator}';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('command');
			const cmd = tokens[0] as CommandToken;
			expect(cmd.name).toBe('frac');
			expect(cmd.args).toEqual(['numerator', 'denominator']);
		});

		it('should handle environments with options', () => {
			const latex = '\\begin{lstlisting}[language=python]print("Hello")\\end{lstlisting}';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('environment');
			const env = tokens[0] as EnvironmentToken;
			expect(env.name).toBe('lstlisting');
			expect(env.options).toBe('language=python');
			expect(env.content).toBe('print("Hello")');
		});
	});

	describe('findMatchingBrace', () => {
		it('should find matching brace for simple case', () => {
			const text = '{content}';
			const result = findMatchingBrace(text, 0);
			expect(result).toBe(8);
		});

		it('should handle nested braces', () => {
			const text = '{outer {inner} text}';
			const result = findMatchingBrace(text, 0);
			expect(result).toBe(19);
		});

		it('should handle escaped braces', () => {
			const text = '{text \\{ escaped \\} more}';
			const result = findMatchingBrace(text, 0);
			expect(result).toBe(24);
		});

		it('should return -1 for unmatched brace', () => {
			const text = '{unclosed';
			const result = findMatchingBrace(text, 0);
			expect(result).toBe(-1);
		});

		it('should return -1 if not starting with brace', () => {
			const text = 'not a brace';
			const result = findMatchingBrace(text, 0);
			expect(result).toBe(-1);
		});
	});

	describe('findMatchingBracket', () => {
		it('should find matching bracket for simple case', () => {
			const text = '[content]';
			const result = findMatchingBracket(text, 0);
			expect(result).toBe(8);
		});

		it('should handle nested brackets', () => {
			const text = '[outer [inner] text]';
			const result = findMatchingBracket(text, 0);
			expect(result).toBe(19);
		});

		it('should return -1 for unmatched bracket', () => {
			const text = '[unclosed';
			const result = findMatchingBracket(text, 0);
			expect(result).toBe(-1);
		});
	});

	describe('extractEnvironment', () => {
		it('should extract simple environment', () => {
			const text = '\\begin{center}Content\\end{center}';
			const result = extractEnvironment(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('center');
			expect(result!.token.content).toBe('Content');
			expect(result!.endIndex).toBe(text.length);
		});

		it('should extract environment with options', () => {
			const text = '\\begin{tabular}[t]{lr}Content\\end{tabular}';
			const result = extractEnvironment(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('tabular');
			expect(result!.token.options).toBe('t');
			expect(result!.token.content).toBe('{lr}Content');
		});

		it('should handle nested environments', () => {
			const text = '\\begin{outer}\\begin{inner}nested\\end{inner}\\end{outer}';
			const result = extractEnvironment(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('outer');
			expect(result!.token.content).toContain('\\begin{inner}');
			expect(result!.endIndex).toBe(text.length);
		});

		it('should handle verbatim environment', () => {
			const text = '\\begin{verbatim}\\end{not-end} $ % &\\end{verbatim}';
			const result = extractEnvironment(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('verbatim');
			expect(result!.token.content).toBe('\\end{not-end} $ % &');
		});

		it('should return null for unmatched environment', () => {
			const text = '\\begin{test}Content without end';
			const result = extractEnvironment(text, 0, 1);
			expect(result).toBeNull();
		});
	});

	describe('extractInlineMath', () => {
		it('should extract simple inline math', () => {
			const text = '$x + y = z$';
			const result = extractInlineMath(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.latex).toBe('x + y = z');
			expect(result!.endIndex).toBe(11);
		});

		it('should handle complex math expressions', () => {
			const text = '$\\frac{a}{b} \\cdot \\sqrt{c}$';
			const result = extractInlineMath(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.latex).toBe('\\frac{a}{b} \\cdot \\sqrt{c}');
		});

		it('should not extract display math ($$)', () => {
			const text = '$$display$$';
			const result = extractInlineMath(text, 0, 1);
			expect(result).toBeNull();
		});

		it('should return null for unclosed math', () => {
			const text = '$unclosed math';
			const result = extractInlineMath(text, 0, 1);
			expect(result).toBeNull();
		});
	});

	describe('extractDisplayMath', () => {
		it('should extract display math with $$', () => {
			const text = '$$E = mc^2$$';
			const result = extractDisplayMath(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.latex).toBe('E = mc^2');
			expect(result!.token.useBrackets).toBe(false);
			expect(result!.endIndex).toBe(12);
		});

		it('should extract display math with \\[...\\]', () => {
			const text = '\\[x^2 + y^2 = r^2\\]';
			const result = extractDisplayMath(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.latex).toBe('x^2 + y^2 = r^2');
			expect(result!.token.useBrackets).toBe(true);
			expect(result!.endIndex).toBe(19);
		});

		it('should handle multiline display math', () => {
			const text = '$$\nx = 1\ny = 2\n$$';
			const result = extractDisplayMath(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.latex).toBe('\nx = 1\ny = 2\n');
		});

		it('should return null for unclosed display math', () => {
			const text = '$$unclosed';
			const result = extractDisplayMath(text, 0, 1);
			expect(result).toBeNull();
		});
	});

	describe('extractCommand', () => {
		it('should extract simple command', () => {
			const text = '\\emph{text}';
			const result = extractCommand(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('emph');
			expect(result!.token.args).toEqual(['text']);
			expect(result!.endIndex).toBe(11);
		});

		it('should extract command with optional arguments', () => {
			const text = '\\section[short]{Full Title}';
			const result = extractCommand(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('section');
			expect(result!.token.options).toEqual(['short']);
			expect(result!.token.args).toEqual(['Full Title']);
		});

		it('should extract command with multiple arguments', () => {
			const text = '\\frac{a}{b}';
			const result = extractCommand(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('frac');
			expect(result!.token.args).toEqual(['a', 'b']);
		});

		it('should extract star variant', () => {
			const text = '\\chapter*{Preface}';
			const result = extractCommand(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('chapter*');
			expect(result!.token.args).toEqual(['Preface']);
		});

		it('should extract escaped characters', () => {
			const text = '\\$';
			const result = extractCommand(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('$');
			expect(result!.token.args).toEqual([]);
		});

		it('should extract line break command', () => {
			const text = '\\\\';
			const result = extractCommand(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('\\');
			expect(result!.endIndex).toBe(2);
		});

		it('should extract command without arguments', () => {
			const text = '\\LaTeX is great';
			const result = extractCommand(text, 0, 1);

			expect(result).not.toBeNull();
			expect(result!.token.name).toBe('LaTeX');
			expect(result!.token.args).toEqual([]);
			// LaTeX commands consume the trailing space after the command name
			expect(result!.endIndex).toBe(7);
		});
	});

	describe('getLineNumber', () => {
		it('should return 1 for first line', () => {
			const text = 'First line\nSecond line';
			expect(getLineNumber(text, 0)).toBe(1);
			expect(getLineNumber(text, 5)).toBe(1);
		});

		it('should count lines correctly', () => {
			const text = 'Line 1\nLine 2\nLine 3';
			expect(getLineNumber(text, 7)).toBe(2); // 'L' of Line 2
			expect(getLineNumber(text, 14)).toBe(3); // 'L' of Line 3
		});

		it('should handle empty lines', () => {
			const text = 'Line 1\n\n\nLine 4';
			expect(getLineNumber(text, 9)).toBe(4); // 'L' of Line 4
		});

		it('should handle Windows line endings', () => {
			const text = 'Line 1\r\nLine 2';
			expect(getLineNumber(text, 8)).toBe(2); // 'L' of Line 2
		});
	});

	describe('complex scenarios', () => {
		it('should tokenize a complete LaTeX document structure', () => {
			const latex = `\\documentclass{article}
\\begin{document}
\\section{Introduction}
This is some text with \\emph{emphasis} and a formula $x^2 + y^2 = z^2$.

\\begin{itemize}
\\item First item
\\item Second item
\\end{itemize}
\\end{document}`;

			const tokens = tokenize(latex);

			// Check key tokens are present
			const docClass = tokens.find(
				(t) => t.type === 'command' && (t as CommandToken).name === 'documentclass'
			);
			expect(docClass).toBeDefined();

			const docEnv = tokens.find(
				(t) => t.type === 'environment' && (t as EnvironmentToken).name === 'document'
			);
			expect(docEnv).toBeDefined();

			// The content should contain the section and itemize
			const content = (docEnv as EnvironmentToken).content;
			expect(content).toContain('\\section{Introduction}');
			expect(content).toContain('\\begin{itemize}');
		});

		it('should handle nested braces and commands', () => {
			const latex = '\\textbf{\\textit{nested \\underline{formatting}}}';
			const tokens = tokenize(latex);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('command');
			const cmd = tokens[0] as CommandToken;
			expect(cmd.name).toBe('textbf');
			expect(cmd.args[0]).toBe('\\textit{nested \\underline{formatting}}');
		});

		it('should preserve exact math content', () => {
			const latex = '$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$';
			const tokens = tokenize(latex);

			const math = tokens[0] as MathInlineToken;
			expect(math.latex).toBe('\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}');
		});
	});
});
