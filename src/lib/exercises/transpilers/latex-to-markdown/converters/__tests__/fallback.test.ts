/**
 * Tests for fallback converters (unsupported commands and environments)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	isSupportedCommand,
	isSupportedEnvironment,
	getSupportedCommands,
	getSupportedEnvironments,
	createFallbackWarning,
	reconstructCommand,
	reconstructEnvironment,
	escapeForHtmlComment,
	convertUnsupportedCommand,
	convertUnsupportedEnvironment,
	createCommandFallbackConverter,
	createEnvironmentFallbackConverter,
	addSupportedCommand,
	addSupportedEnvironment,
	removeSupportedCommand,
	removeSupportedEnvironment
} from '../fallback';
import type {
	CommandToken,
	EnvironmentToken,
	ConversionContext,
	LatexToMarkdownOptions,
	TranspileWarning
} from '../../types';

// ===========================
// Test Helpers
// ===========================

/**
 * Create a mock CommandToken for testing
 */
function createCommandToken(
	name: string,
	args: string[] = [],
	options?: string[],
	line: number = 1,
	column: number = 1
): CommandToken {
	const raw = `\\${name}${options ? `[${options.join(',')}]` : ''}${args.map((a) => `{${a}}`).join('')}`;
	return {
		type: 'command',
		raw,
		start: 0,
		end: raw.length,
		line,
		column,
		name,
		args,
		options
	};
}

/**
 * Create a mock EnvironmentToken for testing
 */
function createEnvToken(
	name: string,
	content: string,
	options?: string,
	line: number = 1,
	column: number = 1
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
		line,
		column
	};
}

/**
 * Create a mock ConversionContext for testing
 */
function createContext(
	overrides: Partial<ConversionContext> = {},
	optionOverrides: Partial<LatexToMarkdownOptions> = {}
): ConversionContext {
	const defaultOptions: Required<LatexToMarkdownOptions> = {
		preserveComments: false,
		mathDelimiters: 'dollar',
		maxNestingDepth: 10,
		fallbackToText: false,
		preserveWhitespace: false,
		...optionOverrides
	};

	const warnings: TranspileWarning[] = [];

	return {
		indentLevel: 0,
		listStack: [],
		inListItem: false,
		inTable: false,
		inMath: false,
		inVerbatim: false,
		environmentStack: [],
		options: defaultOptions,
		warnings,
		addWarning: (warning, line, column) => {
			const fullWarning: TranspileWarning = {
				...warning,
				line,
				column
			};
			warnings.push(fullWarning);
		},
		...overrides
	};
}

// ===========================
// isSupportedCommand Tests
// ===========================

describe('isSupportedCommand', () => {
	describe('text formatting commands', () => {
		it('should return true for textbf', () => {
			expect(isSupportedCommand('textbf')).toBe(true);
		});

		it('should return true for textit', () => {
			expect(isSupportedCommand('textit')).toBe(true);
		});

		it('should return true for emph', () => {
			expect(isSupportedCommand('emph')).toBe(true);
		});

		it('should return true for texttt', () => {
			expect(isSupportedCommand('texttt')).toBe(true);
		});

		it('should return true for underline', () => {
			expect(isSupportedCommand('underline')).toBe(true);
		});

		it('should return true for textsc', () => {
			expect(isSupportedCommand('textsc')).toBe(true);
		});
	});

	describe('heading commands', () => {
		it('should return true for section', () => {
			expect(isSupportedCommand('section')).toBe(true);
		});

		it('should return true for section*', () => {
			expect(isSupportedCommand('section*')).toBe(true);
		});

		it('should return true for subsection', () => {
			expect(isSupportedCommand('subsection')).toBe(true);
		});

		it('should return true for subsubsection', () => {
			expect(isSupportedCommand('subsubsection')).toBe(true);
		});

		it('should return true for paragraph', () => {
			expect(isSupportedCommand('paragraph')).toBe(true);
		});

		it('should return true for chapter', () => {
			expect(isSupportedCommand('chapter')).toBe(true);
		});
	});

	describe('special character commands', () => {
		it('should return true for escaped &', () => {
			expect(isSupportedCommand('&')).toBe(true);
		});

		it('should return true for escaped %', () => {
			expect(isSupportedCommand('%')).toBe(true);
		});

		it('should return true for ldots', () => {
			expect(isSupportedCommand('ldots')).toBe(true);
		});

		it('should return true for quad', () => {
			expect(isSupportedCommand('quad')).toBe(true);
		});
	});

	describe('other supported commands', () => {
		it('should return true for includegraphics', () => {
			expect(isSupportedCommand('includegraphics')).toBe(true);
		});

		it('should return true for hrule', () => {
			expect(isSupportedCommand('hrule')).toBe(true);
		});

		// Note: item, newpage, clearpage, and other commands are now handled
		// by handleSpecialCommand() in transpiler.ts, so they return false here
		// but are still properly converted (not treated as unsupported)
		it('should return false for item (handled by handleSpecialCommand)', () => {
			expect(isSupportedCommand('item')).toBe(false);
		});

		it('should return false for newpage (handled by handleSpecialCommand)', () => {
			expect(isSupportedCommand('newpage')).toBe(false);
		});

		it('should return false for clearpage (handled by handleSpecialCommand)', () => {
			expect(isSupportedCommand('clearpage')).toBe(false);
		});
	});

	describe('unsupported commands', () => {
		it('should return false for customcmd', () => {
			expect(isSupportedCommand('customcmd')).toBe(false);
		});

		it('should return false for madeupcommand', () => {
			expect(isSupportedCommand('madeupcommand')).toBe(false);
		});

		it('should return false for nonexistent', () => {
			expect(isSupportedCommand('nonexistent')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isSupportedCommand('')).toBe(false);
		});
	});
});

// ===========================
// isSupportedEnvironment Tests
// ===========================

describe('isSupportedEnvironment', () => {
	describe('list environments', () => {
		it('should return true for itemize', () => {
			expect(isSupportedEnvironment('itemize')).toBe(true);
		});

		it('should return true for enumerate', () => {
			expect(isSupportedEnvironment('enumerate')).toBe(true);
		});

		it('should return true for description', () => {
			expect(isSupportedEnvironment('description')).toBe(true);
		});
	});

	describe('block environments', () => {
		it('should return true for quote', () => {
			expect(isSupportedEnvironment('quote')).toBe(true);
		});

		it('should return true for quotation', () => {
			expect(isSupportedEnvironment('quotation')).toBe(true);
		});

		it('should return true for verbatim', () => {
			expect(isSupportedEnvironment('verbatim')).toBe(true);
		});

		it('should return true for lstlisting', () => {
			expect(isSupportedEnvironment('lstlisting')).toBe(true);
		});

		it('should return true for minted', () => {
			expect(isSupportedEnvironment('minted')).toBe(true);
		});

		it('should return true for figure', () => {
			expect(isSupportedEnvironment('figure')).toBe(true);
		});

		it('should return true for center', () => {
			expect(isSupportedEnvironment('center')).toBe(true);
		});
	});

	describe('table environments', () => {
		it('should return true for tabular', () => {
			expect(isSupportedEnvironment('tabular')).toBe(true);
		});

		it('should return true for table', () => {
			expect(isSupportedEnvironment('table')).toBe(true);
		});

		it('should return true for array', () => {
			expect(isSupportedEnvironment('array')).toBe(true);
		});

		it('should return true for longtable', () => {
			expect(isSupportedEnvironment('longtable')).toBe(true);
		});
	});

	describe('math environments', () => {
		it('should return true for equation', () => {
			expect(isSupportedEnvironment('equation')).toBe(true);
		});

		it('should return true for align', () => {
			expect(isSupportedEnvironment('align')).toBe(true);
		});

		it('should return true for gather', () => {
			expect(isSupportedEnvironment('gather')).toBe(true);
		});

		it('should return true for cases', () => {
			expect(isSupportedEnvironment('cases')).toBe(true);
		});
	});

	describe('unsupported environments', () => {
		it('should return false for customenv', () => {
			expect(isSupportedEnvironment('customenv')).toBe(false);
		});

		it('should return false for madeupenv', () => {
			expect(isSupportedEnvironment('madeupenv')).toBe(false);
		});

		it('should return false for tikzpicture', () => {
			expect(isSupportedEnvironment('tikzpicture')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isSupportedEnvironment('')).toBe(false);
		});
	});
});

// ===========================
// getSupportedCommands/Environments Tests
// ===========================

describe('getSupportedCommands', () => {
	it('should return an array of strings', () => {
		const commands = getSupportedCommands();
		expect(Array.isArray(commands)).toBe(true);
		expect(commands.every((c) => typeof c === 'string')).toBe(true);
	});

	it('should include common commands', () => {
		const commands = getSupportedCommands();
		expect(commands).toContain('textbf');
		expect(commands).toContain('section');
		expect(commands).toContain('includegraphics');
	});

	it('should be sorted alphabetically', () => {
		const commands = getSupportedCommands();
		const sorted = [...commands].sort();
		expect(commands).toEqual(sorted);
	});
});

describe('getSupportedEnvironments', () => {
	it('should return an array of strings', () => {
		const envs = getSupportedEnvironments();
		expect(Array.isArray(envs)).toBe(true);
		expect(envs.every((e) => typeof e === 'string')).toBe(true);
	});

	it('should include common environments', () => {
		const envs = getSupportedEnvironments();
		expect(envs).toContain('itemize');
		expect(envs).toContain('enumerate');
		expect(envs).toContain('tabular');
	});

	it('should be sorted alphabetically', () => {
		const envs = getSupportedEnvironments();
		const sorted = [...envs].sort();
		expect(envs).toEqual(sorted);
	});
});

// ===========================
// createFallbackWarning Tests
// ===========================

describe('createFallbackWarning', () => {
	describe('command warnings', () => {
		it('should create warning for unsupported command', () => {
			const warning = createFallbackWarning('command', 'customcmd');
			expect(warning.type).toBe('unsupported-command');
			expect(warning.message).toBe('Unsupported LaTeX command: \\customcmd');
			expect(warning.command).toBe('customcmd');
			expect(warning.severity).toBe('warning');
		});

		it('should include line and column when provided', () => {
			const warning = createFallbackWarning('command', 'customcmd', 10, 5);
			expect(warning.line).toBe(10);
			expect(warning.column).toBe(5);
		});

		it('should not include line/column when not provided', () => {
			const warning = createFallbackWarning('command', 'customcmd');
			expect(warning.line).toBeUndefined();
			expect(warning.column).toBeUndefined();
		});

		it('should handle special characters in command name', () => {
			const warning = createFallbackWarning('command', 'cmd@internal');
			expect(warning.message).toBe('Unsupported LaTeX command: \\cmd@internal');
		});
	});

	describe('environment warnings', () => {
		it('should create warning for unsupported environment', () => {
			const warning = createFallbackWarning('environment', 'customenv');
			expect(warning.type).toBe('unsupported-environment');
			expect(warning.message).toBe('Unsupported LaTeX environment: customenv');
			expect(warning.command).toBe('customenv');
			expect(warning.severity).toBe('warning');
		});

		it('should include line and column when provided', () => {
			const warning = createFallbackWarning('environment', 'customenv', 20, 15);
			expect(warning.line).toBe(20);
			expect(warning.column).toBe(15);
		});
	});
});

// ===========================
// reconstructCommand Tests
// ===========================

describe('reconstructCommand', () => {
	it('should reconstruct simple command without args', () => {
		const token = createCommandToken('par');
		expect(reconstructCommand(token)).toBe('\\par');
	});

	it('should reconstruct command with one argument', () => {
		const token = createCommandToken('textbf', ['bold text']);
		expect(reconstructCommand(token)).toBe('\\textbf{bold text}');
	});

	it('should reconstruct command with multiple arguments', () => {
		const token = createCommandToken('frac', ['1', '2']);
		expect(reconstructCommand(token)).toBe('\\frac{1}{2}');
	});

	it('should reconstruct command with options', () => {
		const token = createCommandToken('includegraphics', ['image.png'], ['width=0.5\\textwidth']);
		expect(reconstructCommand(token)).toBe('\\includegraphics[width=0.5\\textwidth]{image.png}');
	});

	it('should reconstruct command with multiple options', () => {
		const token = createCommandToken('includegraphics', ['img.jpg'], ['width=10cm', 'height=5cm']);
		expect(reconstructCommand(token)).toBe('\\includegraphics[width=10cm,height=5cm]{img.jpg}');
	});

	it('should handle empty args array', () => {
		const token = createCommandToken('newpage', []);
		expect(reconstructCommand(token)).toBe('\\newpage');
	});

	it('should handle args with special characters', () => {
		const token = createCommandToken('textbf', ['text with {braces} and \\backslash']);
		expect(reconstructCommand(token)).toBe('\\textbf{text with {braces} and \\backslash}');
	});
});

// ===========================
// reconstructEnvironment Tests
// ===========================

describe('reconstructEnvironment', () => {
	it('should reconstruct simple environment', () => {
		const token = createEnvToken('customenv', 'content');
		expect(reconstructEnvironment(token)).toBe('\\begin{customenv}content\\end{customenv}');
	});

	it('should reconstruct environment with options', () => {
		const token = createEnvToken('lstlisting', 'code', 'language=Python');
		expect(reconstructEnvironment(token)).toBe(
			'\\begin{lstlisting}[language=Python]code\\end{lstlisting}'
		);
	});

	it('should handle multiline content', () => {
		const token = createEnvToken('verbatim', '\nline1\nline2\n');
		expect(reconstructEnvironment(token)).toBe('\\begin{verbatim}\nline1\nline2\n\\end{verbatim}');
	});

	it('should handle empty content', () => {
		const token = createEnvToken('empty', '');
		expect(reconstructEnvironment(token)).toBe('\\begin{empty}\\end{empty}');
	});

	it('should handle content with special characters', () => {
		const token = createEnvToken('custom', '\\textbf{bold} and $math$');
		expect(reconstructEnvironment(token)).toBe(
			'\\begin{custom}\\textbf{bold} and $math$\\end{custom}'
		);
	});
});

// ===========================
// escapeForHtmlComment Tests
// ===========================

describe('escapeForHtmlComment', () => {
	it('should escape double dashes', () => {
		const result = escapeForHtmlComment('text--with--dashes');
		expect(result).toBe('text\u2014with\u2014dashes');
		expect(result).not.toContain('--');
	});

	it('should escape opening comment markers', () => {
		const result = escapeForHtmlComment('text <!-- inside');
		expect(result).not.toContain('<!--');
	});

	it('should escape closing comment markers', () => {
		const result = escapeForHtmlComment('text --> inside');
		expect(result).not.toContain('-->');
	});

	it('should handle multiple escapes', () => {
		const result = escapeForHtmlComment('a--b--c <!-- d --> e');
		expect(result).not.toContain('--');
		expect(result).not.toContain('<!--');
		expect(result).not.toContain('-->');
	});

	it('should return unchanged string without special sequences', () => {
		const result = escapeForHtmlComment('normal text here');
		expect(result).toBe('normal text here');
	});

	it('should handle empty string', () => {
		expect(escapeForHtmlComment('')).toBe('');
	});
});

// ===========================
// convertUnsupportedCommand Tests
// ===========================

describe('convertUnsupportedCommand', () => {
	let ctx: ConversionContext;

	beforeEach(() => {
		ctx = createContext();
	});

	describe('basic conversion', () => {
		it('should wrap simple command in HTML comment', () => {
			const token = createCommandToken('customcmd');
			const result = convertUnsupportedCommand(token, ctx);
			expect(result).toBe('<!-- LaTeX: \\customcmd -->');
		});

		it('should wrap command with argument in HTML comment', () => {
			const token = createCommandToken('customcmd', ['argument']);
			const result = convertUnsupportedCommand(token, ctx);
			expect(result).toBe('<!-- LaTeX: \\customcmd{argument} -->');
		});

		it('should wrap command with multiple arguments', () => {
			const token = createCommandToken('customcmd', ['arg1', 'arg2']);
			const result = convertUnsupportedCommand(token, ctx);
			expect(result).toBe('<!-- LaTeX: \\customcmd{arg1}{arg2} -->');
		});

		it('should wrap command with options and arguments', () => {
			const token = createCommandToken('customcmd', ['arg'], ['opt1', 'opt2']);
			const result = convertUnsupportedCommand(token, ctx);
			expect(result).toBe('<!-- LaTeX: \\customcmd[opt1,opt2]{arg} -->');
		});
	});

	describe('warning generation', () => {
		it('should add warning to context', () => {
			const token = createCommandToken('customcmd', [], undefined, 10, 5);
			convertUnsupportedCommand(token, ctx);

			expect(ctx.warnings).toHaveLength(1);
			expect(ctx.warnings[0].type).toBe('unsupported-command');
			expect(ctx.warnings[0].command).toBe('customcmd');
			expect(ctx.warnings[0].line).toBe(10);
			expect(ctx.warnings[0].column).toBe(5);
		});

		it('should include line and column in warning', () => {
			const token = createCommandToken('cmd', [], undefined, 42, 17);
			convertUnsupportedCommand(token, ctx);

			expect(ctx.warnings[0].line).toBe(42);
			expect(ctx.warnings[0].column).toBe(17);
		});
	});

	describe('fallbackToText option', () => {
		it('should return first argument when fallbackToText is true', () => {
			const ctx = createContext({}, { fallbackToText: true });
			const token = createCommandToken('customcmd', ['content']);
			const result = convertUnsupportedCommand(token, ctx);
			expect(result).toBe('content');
		});

		it('should return empty string when fallbackToText is true and no args', () => {
			const ctx = createContext({}, { fallbackToText: true });
			const token = createCommandToken('customcmd');
			const result = convertUnsupportedCommand(token, ctx);
			expect(result).toBe('');
		});

		it('should still add warning when fallbackToText is true', () => {
			const ctx = createContext({}, { fallbackToText: true });
			const token = createCommandToken('customcmd', ['content']);
			convertUnsupportedCommand(token, ctx);
			expect(ctx.warnings).toHaveLength(1);
		});
	});

	describe('edge cases', () => {
		it('should handle empty argument', () => {
			const token = createCommandToken('cmd', ['']);
			const result = convertUnsupportedCommand(token, ctx);
			expect(result).toBe('<!-- LaTeX: \\cmd{} -->');
		});

		it('should escape dashes in content', () => {
			const token = createCommandToken('cmd', ['a--b']);
			const result = convertUnsupportedCommand(token, ctx);
			expect(result).not.toContain('a--b');
			expect(result).toContain('a\u2014b');
		});

		it('should handle command with special characters', () => {
			const token = createCommandToken('cmd@internal', ['arg']);
			const result = convertUnsupportedCommand(token, ctx);
			expect(result).toBe('<!-- LaTeX: \\cmd@internal{arg} -->');
		});
	});
});

// ===========================
// convertUnsupportedEnvironment Tests
// ===========================

describe('convertUnsupportedEnvironment', () => {
	let ctx: ConversionContext;

	beforeEach(() => {
		ctx = createContext();
	});

	describe('basic conversion', () => {
		it('should wrap simple environment in HTML comment', () => {
			const token = createEnvToken('customenv', 'content');
			const result = convertUnsupportedEnvironment(token, ctx);
			expect(result).toBe('<!-- LaTeX: \\begin{customenv}content\\end{customenv} -->');
		});

		it('should wrap environment with options', () => {
			const token = createEnvToken('customenv', 'content', 'opt=value');
			const result = convertUnsupportedEnvironment(token, ctx);
			expect(result).toBe('<!-- LaTeX: \\begin{customenv}[opt=value]content\\end{customenv} -->');
		});

		it('should handle multiline content', () => {
			const token = createEnvToken('customenv', '\nline1\nline2\n');
			const result = convertUnsupportedEnvironment(token, ctx);
			expect(result).toContain('\\begin{customenv}');
			expect(result).toContain('line1');
			expect(result).toContain('line2');
			expect(result).toContain('\\end{customenv}');
		});
	});

	describe('warning generation', () => {
		it('should add warning to context', () => {
			const token = createEnvToken('customenv', 'content', undefined, 15, 3);
			convertUnsupportedEnvironment(token, ctx);

			expect(ctx.warnings).toHaveLength(1);
			expect(ctx.warnings[0].type).toBe('unsupported-environment');
			expect(ctx.warnings[0].command).toBe('customenv');
			expect(ctx.warnings[0].line).toBe(15);
			expect(ctx.warnings[0].column).toBe(3);
		});
	});

	describe('fallbackToText option', () => {
		it('should return trimmed content when fallbackToText is true', () => {
			const ctx = createContext({}, { fallbackToText: true });
			const token = createEnvToken('customenv', '  content  ');
			const result = convertUnsupportedEnvironment(token, ctx);
			expect(result).toBe('content');
		});

		it('should return multiline content when fallbackToText is true', () => {
			const ctx = createContext({}, { fallbackToText: true });
			const token = createEnvToken('customenv', '\nline1\nline2\n');
			const result = convertUnsupportedEnvironment(token, ctx);
			expect(result).toBe('line1\nline2');
		});

		it('should still add warning when fallbackToText is true', () => {
			const ctx = createContext({}, { fallbackToText: true });
			const token = createEnvToken('customenv', 'content');
			convertUnsupportedEnvironment(token, ctx);
			expect(ctx.warnings).toHaveLength(1);
		});
	});

	describe('edge cases', () => {
		it('should handle empty content', () => {
			const token = createEnvToken('emptyenv', '');
			const result = convertUnsupportedEnvironment(token, ctx);
			expect(result).toBe('<!-- LaTeX: \\begin{emptyenv}\\end{emptyenv} -->');
		});

		it('should escape dashes in content', () => {
			const token = createEnvToken('env', 'text--with--dashes');
			const result = convertUnsupportedEnvironment(token, ctx);
			expect(result).not.toContain('text--with');
		});

		it('should handle nested environments in content', () => {
			const token = createEnvToken('outer', '\\begin{inner}nested\\end{inner}');
			const result = convertUnsupportedEnvironment(token, ctx);
			expect(result).toContain('\\begin{outer}');
			expect(result).toContain('\\begin{inner}');
			expect(result).toContain('\\end{inner}');
			expect(result).toContain('\\end{outer}');
		});
	});
});

// ===========================
// Factory Function Tests
// ===========================

describe('createCommandFallbackConverter', () => {
	it('should return a function', () => {
		const converter = createCommandFallbackConverter();
		expect(typeof converter).toBe('function');
	});

	it('should create converter that works correctly', () => {
		const converter = createCommandFallbackConverter();
		const ctx = createContext();
		const token = createCommandToken('custom', ['arg']);
		const result = converter(token, ctx);
		expect(result).toBe('<!-- LaTeX: \\custom{arg} -->');
	});
});

describe('createEnvironmentFallbackConverter', () => {
	it('should return a function', () => {
		const converter = createEnvironmentFallbackConverter();
		expect(typeof converter).toBe('function');
	});

	it('should create converter that works correctly', () => {
		const converter = createEnvironmentFallbackConverter();
		const ctx = createContext();
		const token = createEnvToken('custom', 'content');
		const result = converter(token, ctx);
		expect(result).toBe('<!-- LaTeX: \\begin{custom}content\\end{custom} -->');
	});
});

// ===========================
// Registry Extension Tests
// ===========================

describe('registry extension functions', () => {
	describe('addSupportedCommand', () => {
		it('should add new command to registry', () => {
			const testCmd = 'uniquetestcmd' + Date.now();
			expect(isSupportedCommand(testCmd)).toBe(false);
			addSupportedCommand(testCmd);
			expect(isSupportedCommand(testCmd)).toBe(true);
			// Clean up
			removeSupportedCommand(testCmd);
		});
	});

	describe('addSupportedEnvironment', () => {
		it('should add new environment to registry', () => {
			const testEnv = 'uniquetestenv' + Date.now();
			expect(isSupportedEnvironment(testEnv)).toBe(false);
			addSupportedEnvironment(testEnv);
			expect(isSupportedEnvironment(testEnv)).toBe(true);
			// Clean up
			removeSupportedEnvironment(testEnv);
		});
	});

	describe('removeSupportedCommand', () => {
		it('should remove command from registry', () => {
			const testCmd = 'removetestcmd' + Date.now();
			addSupportedCommand(testCmd);
			expect(isSupportedCommand(testCmd)).toBe(true);
			const removed = removeSupportedCommand(testCmd);
			expect(removed).toBe(true);
			expect(isSupportedCommand(testCmd)).toBe(false);
		});

		it('should return false for non-existent command', () => {
			const removed = removeSupportedCommand('nonexistentcmd' + Date.now());
			expect(removed).toBe(false);
		});
	});

	describe('removeSupportedEnvironment', () => {
		it('should remove environment from registry', () => {
			const testEnv = 'removetestenv' + Date.now();
			addSupportedEnvironment(testEnv);
			expect(isSupportedEnvironment(testEnv)).toBe(true);
			const removed = removeSupportedEnvironment(testEnv);
			expect(removed).toBe(true);
			expect(isSupportedEnvironment(testEnv)).toBe(false);
		});

		it('should return false for non-existent environment', () => {
			const removed = removeSupportedEnvironment('nonexistentenv' + Date.now());
			expect(removed).toBe(false);
		});
	});
});

// ===========================
// Integration Tests
// ===========================

describe('integration tests', () => {
	it('should work together for typical unsupported command', () => {
		const ctx = createContext();
		const token = createCommandToken('tikz', ['draw (0,0) -- (1,1);'], undefined, 5, 10);

		// Check it's not supported
		expect(isSupportedCommand('tikz')).toBe(false);

		// Convert it
		const result = convertUnsupportedCommand(token, ctx);

		// Verify output format
		expect(result).toBe('<!-- LaTeX: \\tikz{draw (0,0) \u2014 (1,1);} -->');

		// Verify warning was created
		expect(ctx.warnings).toHaveLength(1);
		expect(ctx.warnings[0].type).toBe('unsupported-command');
		expect(ctx.warnings[0].line).toBe(5);
	});

	it('should work together for typical unsupported environment', () => {
		const ctx = createContext();
		const token = createEnvToken('tikzpicture', '\n\\draw (0,0) -- (1,1);\n', 'scale=2', 10, 1);

		// Check it's not supported
		expect(isSupportedEnvironment('tikzpicture')).toBe(false);

		// Convert it
		const result = convertUnsupportedEnvironment(token, ctx);

		// Verify output format
		expect(result).toContain('<!-- LaTeX:');
		expect(result).toContain('\\begin{tikzpicture}');
		expect(result).toContain('\\end{tikzpicture}');

		// Verify warning was created
		expect(ctx.warnings).toHaveLength(1);
		expect(ctx.warnings[0].type).toBe('unsupported-environment');
		expect(ctx.warnings[0].line).toBe(10);
	});

	it('should handle mixed supported and unsupported items', () => {
		// Simulate checking multiple commands
		const commands = ['textbf', 'customcmd', 'section', 'anothercustom'];
		const supported = commands.filter((c) => isSupportedCommand(c));
		const unsupported = commands.filter((c) => !isSupportedCommand(c));

		expect(supported).toEqual(['textbf', 'section']);
		expect(unsupported).toEqual(['customcmd', 'anothercustom']);
	});

	it('should preserve complex LaTeX for future processing', () => {
		const ctx = createContext();
		const complexContent = `
\\node[draw, circle] (a) at (0,0) {A};
\\node[draw, circle] (b) at (2,0) {B};
\\draw[->] (a) -- (b);
`;
		const token = createEnvToken('tikzpicture', complexContent);
		const result = convertUnsupportedEnvironment(token, ctx);

		// The original content should be preserved (with -- escaped)
		expect(result).toContain('\\node[draw, circle]');
		expect(result).toContain('\\draw[');
	});
});
