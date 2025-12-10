/**
 * Main LaTeX to Markdown Transpiler
 *
 * Orchestrates the conversion of LaTeX source to Markdown by:
 * 1. Tokenizing the input using the tokenizer
 * 2. Processing each token using appropriate converters
 * 3. Collecting warnings and statistics
 * 4. Returning the final markdown result
 */

import type {
	LatexToken,
	LatexToMarkdownOptions,
	TranspileResult,
	TranspileStats,
	TranspileWarning,
	ConversionContext,
	CommandToken,
	EnvironmentToken,
	MathInlineToken,
	MathDisplayToken,
	TextToken,
	CommentToken,
	NewlineToken,
	GroupToken,
	WhitespaceToken,
	SpecialToken,
	ListType
} from './types';

import { tokenize } from './tokenizer';

// Import converters from simple.ts
import {
	convertDashes,
	convertSpecialCharacter,
	hasSimpleConverter,
	getSimpleCommandConverter
} from './converters/simple';

// Import converters from lists.ts
import { listEnvironmentConverters, isListEnvironment } from './converters/lists';

// Import converters from blocks.ts
import {
	hasBlockCommandConverter,
	hasBlockEnvironmentConverter,
	getBlockCommandConverter,
	getBlockEnvironmentConverter
} from './converters/blocks';

// Import converters from tables.ts
import { tableEnvironmentConverters, isTableEnvironment } from './converters/tables';

// Import fallback converters
import {
	convertUnsupportedCommand,
	convertUnsupportedEnvironment,
	isSupportedEnvironment
} from './converters/fallback';

// Import math to custom syntax converter
import { convertMathToCustomSyntax } from './converters/math-to-custom';

// ===========================
// Default Options
// ===========================

/**
 * Default options for transpilation.
 * These values are used when not specified by the caller.
 */
const DEFAULT_OPTIONS: Required<LatexToMarkdownOptions> = {
	preserveComments: false,
	mathDelimiters: 'tilde',
	maxNestingDepth: 10,
	fallbackToText: false,
	preserveWhitespace: false
};

// ===========================
// Main Transpiler Function
// ===========================

/**
 * Transpile LaTeX source to Markdown.
 *
 * This is the main entry point for the transpiler. It tokenizes the input,
 * processes each token using the appropriate converter, and returns the
 * final markdown along with any warnings and optional statistics.
 *
 * @param latex - The LaTeX source text to transpile
 * @param options - Optional configuration for the transpilation
 * @returns The transpilation result containing markdown, warnings, and stats
 *
 * @example
 * ```typescript
 * const result = transpileLatexToMarkdown(`
 *   \\section{Introduction}
 *   This is \\textbf{bold} text with math: $x^2$.
 *
 *   \\begin{itemize}
 *   \\item First item
 *   \\item Second item
 *   \\end{itemize}
 * `);
 *
 * console.log(result.markdown);
 * // # Introduction
 * //
 * // This is **bold** text with math: $x^2$.
 * //
 * // - First item
 * // - Second item
 * ```
 */
export function transpileLatexToMarkdown(
	latex: string,
	options?: LatexToMarkdownOptions
): TranspileResult {
	// Merge options with defaults
	const mergedOptions: Required<LatexToMarkdownOptions> = {
		...DEFAULT_OPTIONS,
		...options
	};

	// Initialize statistics
	const stats: TranspileStats = {
		tokenCount: 0,
		commandsConverted: 0,
		environmentsConverted: 0,
		mathExpressions: 0
	};

	// Initialize warnings collection
	const warnings: TranspileWarning[] = [];

	// Handle empty input
	if (!latex || latex.trim() === '') {
		return {
			markdown: '',
			warnings: [],
			stats: {
				tokenCount: 0,
				commandsConverted: 0,
				environmentsConverted: 0,
				mathExpressions: 0
			}
		};
	}

	// Tokenize the input
	const tokens = tokenize(latex);
	stats.tokenCount = tokens.length;

	// Create the conversion context
	const context = createConversionContext(mergedOptions, warnings, stats);

	// Process all tokens
	const markdown = processTokens(tokens, context, stats);

	// Clean up the final markdown
	const cleanedMarkdown = cleanupMarkdown(markdown, mergedOptions);

	return {
		markdown: cleanedMarkdown,
		warnings,
		stats
	};
}

// ===========================
// Context Creation
// ===========================

/**
 * Create a conversion context with all necessary state and helper functions.
 *
 * @param options - The merged transpilation options
 * @param warnings - The warnings collection to populate
 * @param stats - The statistics to update
 * @returns A fully initialized ConversionContext
 */
function createConversionContext(
	options: Required<LatexToMarkdownOptions>,
	warnings: TranspileWarning[],
	stats: TranspileStats
): ConversionContext {
	const context: ConversionContext = {
		indentLevel: 0,
		listStack: [],
		inListItem: false,
		inTable: false,
		inMath: false,
		inVerbatim: false,
		environmentStack: [],
		options,
		warnings,
		addWarning: (warning, line?, column?) => {
			const fullWarning: TranspileWarning = {
				...warning,
				line,
				column
			};
			warnings.push(fullWarning);
		},
		processChildren: undefined,
		convertToken: undefined
	};

	// Add processChildren helper (needs context reference)
	context.processChildren = (tokens: LatexToken[]) => {
		return processTokens(tokens, context, stats);
	};

	// Add convertToken helper (needs context reference)
	context.convertToken = (token: LatexToken) => {
		return convertSingleToken(token, context, stats);
	};

	return context;
}

// ===========================
// Token Processing
// ===========================

/**
 * Process an array of tokens and return the combined markdown.
 *
 * @param tokens - The tokens to process
 * @param context - The conversion context
 * @param stats - Statistics to update
 * @returns The combined markdown string
 */
function processTokens(
	tokens: LatexToken[],
	context: ConversionContext,
	stats: TranspileStats
): string {
	const parts: string[] = [];

	for (const token of tokens) {
		const result = convertSingleToken(token, context, stats);
		if (result !== '') {
			parts.push(result);
		}
	}

	return parts.join('');
}

/**
 * Convert a single token to markdown.
 *
 * @param token - The token to convert
 * @param context - The conversion context
 * @param stats - Statistics to update
 * @returns The markdown string for this token
 */
function convertSingleToken(
	token: LatexToken,
	context: ConversionContext,
	stats: TranspileStats
): string {
	// Check nesting depth
	if (context.environmentStack.length > context.options.maxNestingDepth) {
		context.addWarning(
			{
				type: 'nested-too-deep',
				message: `Maximum nesting depth (${context.options.maxNestingDepth}) exceeded`,
				severity: 'error'
			},
			token.line,
			token.column
		);
		return '';
	}

	switch (token.type) {
		case 'text':
			return convertTextToken(token, context);

		case 'command':
			stats.commandsConverted++;
			return convertCommandToken(token, context);

		case 'environment':
			stats.environmentsConverted++;
			return convertEnvironmentToken(token, context);

		case 'math-inline':
			stats.mathExpressions++;
			return convertMathInlineToken(token, context);

		case 'math-display':
			stats.mathExpressions++;
			return convertMathDisplayToken(token, context);

		case 'comment':
			return convertCommentToken(token, context);

		case 'newline':
			return convertNewlineToken(token, context);

		case 'group':
			return convertGroupToken(token, context, stats);

		case 'whitespace':
			return convertWhitespaceToken(token, context);

		case 'special':
			return convertSpecialToken(token, context);

		case 'verbatim':
			return token.content;

		default:
			return '';
	}
}

// ===========================
// Token Type Converters
// ===========================

/**
 * Convert a text token to markdown.
 * Applies dash conversion for em-dash and en-dash.
 */
function convertTextToken(token: TextToken, _context: ConversionContext): string {
	return convertDashes(token.content);
}

/**
 * Convert a command token to markdown using the appropriate converter.
 */
function convertCommandToken(token: CommandToken, context: ConversionContext): string {
	const { name } = token;

	// Check simple command converters first (most common)
	if (hasSimpleConverter(name)) {
		const converter = getSimpleCommandConverter(name);
		if (converter) {
			return converter(token, context);
		}
	}

	// Check block command converters (e.g., includegraphics)
	if (hasBlockCommandConverter(name)) {
		const converter = getBlockCommandConverter(name);
		if (converter) {
			return converter(token, context);
		}
	}

	// Try special command handling (returns null if not handled)
	const specialResult = handleSpecialCommand(token, context);
	if (specialResult !== null) {
		return specialResult;
	}

	// Fallback for unsupported commands
	return convertUnsupportedCommand(token, context);
}

/**
 * Handle special commands that don't have dedicated converters.
 * Returns null if the command is not handled here (will fall through to unsupported handler).
 * Returns empty string '' for commands that should be silently ignored.
 */
function handleSpecialCommand(token: CommandToken, _context: ConversionContext): string | null {
	const { name, args } = token;

	switch (name) {
		// Commands that should be ignored (no output)
		case 'label':
		case 'centering':
		case 'newpage':
		case 'clearpage':
		case 'pagebreak':
		case 'noindent':
		// falls through - Vertical spacing commands
		case 'smallskip':
		case 'medskip':
		case 'bigskip':
		case 'vspace':
		case 'vfill':
			return '';

		// Commands that extract content from first argument
		case 'footnote':
			// Convert footnote to markdown footnote marker (simplified)
			return args[0] ? ` (${args[0]})` : '';

		case 'cite':
		case 'ref':
		case 'eqref':
			// Return reference as-is in brackets
			return args[0] ? `[${args[0]}]` : '';

		case 'url':
			// Convert URL to markdown link
			return args[0] ? `<${args[0]}>` : '';

		case 'href':
			// Convert href to markdown link: \href{url}{text}
			if (args.length >= 2) {
				return `[${args[1]}](${args[0]})`;
			}
			return args[0] ? `<${args[0]}>` : '';

		case 'verb':
			// Return verbatim content as inline code
			return args[0] ? `\`${args[0]}\`` : '';

		case 'input':
		case 'include':
			// Comment out file inclusion
			return `<!-- Include: ${args[0] ?? 'unknown'} -->`;

		case 'caption':
			// Captions are typically handled by the figure converter
			// If encountered standalone, return as italic text
			return args[0] ? `*${args[0]}*` : '';

		case 'item':
			// Item is typically handled by list converters
			// If encountered standalone, just output the content
			return args[0] ? args[0] : '';

		default:
			// Not handled here - let it fall through to unsupported handler
			return null;
	}
}

/**
 * Convert an environment token to markdown using the appropriate converter.
 */
function convertEnvironmentToken(token: EnvironmentToken, context: ConversionContext): string {
	const { name } = token;

	// Push environment onto stack
	context.environmentStack.push(name);

	let result: string;

	try {
		// Check list environment converters
		if (isListEnvironment(name)) {
			const converter = listEnvironmentConverters[name as ListType];
			if (converter) {
				// Update context for list processing
				const listContext: ConversionContext = {
					...context,
					listStack: [...context.listStack, name as ListType],
					inListItem: true
				};
				result = converter(token, listContext);
				return result;
			}
		}

		// Check table environment converters
		if (isTableEnvironment(name)) {
			const converter = tableEnvironmentConverters[name];
			if (converter) {
				const tableContext: ConversionContext = {
					...context,
					inTable: true
				};
				result = converter(token, tableContext);
				return result;
			}
		}

		// Check block environment converters
		if (hasBlockEnvironmentConverter(name)) {
			const converter = getBlockEnvironmentConverter(name);
			if (converter) {
				result = converter(token, context);
				return result;
			}
		}

		// Handle math environments
		if (isMathEnvironment(name)) {
			result = convertMathEnvironment(token, context);
			return result;
		}

		// Handle document structure environments
		if (isDocumentEnvironment(name)) {
			result = convertDocumentEnvironment(token, context);
			return result;
		}

		// Check if environment is marked as supported (passthrough environments)
		if (isSupportedEnvironment(name)) {
			// Process children if available
			if (token.children && token.children.length > 0 && context.processChildren) {
				result = context.processChildren(token.children);
				return result;
			}
			// Otherwise tokenize and process the content
			if (token.content && context.processChildren) {
				const childTokens = tokenize(token.content);
				result = context.processChildren(childTokens);
				return result;
			}
			// Last resort: return content as-is (trimmed)
			return token.content.trim();
		}

		// Fallback for unsupported environments
		result = convertUnsupportedEnvironment(token, context);
		return result;
	} finally {
		// Pop environment from stack
		context.environmentStack.pop();
	}
}

/**
 * Check if an environment is a math environment.
 */
function isMathEnvironment(name: string): boolean {
	const mathEnvs = [
		'equation',
		'equation*',
		'align',
		'align*',
		'gather',
		'gather*',
		'multline',
		'multline*',
		'split',
		'cases',
		'matrix',
		'pmatrix',
		'bmatrix',
		'vmatrix',
		'Vmatrix'
	];
	return mathEnvs.includes(name);
}

/**
 * Convert a math environment to markdown display math.
 */
function convertMathEnvironment(token: EnvironmentToken, context: ConversionContext): string {
	// Wrap content in display math delimiters
	// Keep the environment structure for complex environments
	const content = token.content.trim();

	// Determine delimiter based on options
	const getDisplayDelimiters = (): { open: string; close: string } => {
		switch (context.options.mathDelimiters) {
			case 'tilde':
				return { open: '~~', close: '~~' };
			case 'brackets':
				return { open: '\\[', close: '\\]' };
			case 'dollar':
			default:
				return { open: '$$', close: '$$' };
		}
	};

	const { open, close } = getDisplayDelimiters();

	// For simple environments, convert to custom syntax
	// For complex ones like align, keep the environment
	if (['equation', 'equation*'].includes(token.name)) {
		const result = convertMathToCustomSyntax(content, context, token.line, token.column);
		return `${open}${result.output}${close}`;
	}

	// For other math environments, preserve the LaTeX structure
	return `${open}\\begin{${token.name}}${content}\\end{${token.name}}${close}`;
}

/**
 * Check if an environment is a document structure environment.
 */
function isDocumentEnvironment(name: string): boolean {
	const docEnvs = [
		'document',
		'abstract',
		'theorem',
		'lemma',
		'proof',
		'definition',
		'corollary',
		'remark',
		'example',
		'exercise'
	];
	return docEnvs.includes(name);
}

/**
 * Convert a document structure environment to markdown.
 */
function convertDocumentEnvironment(token: EnvironmentToken, context: ConversionContext): string {
	const { name, content } = token;

	switch (name) {
		case 'document':
			// Document environment - tokenize and process content
			if (token.children && context.processChildren) {
				return context.processChildren(token.children);
			}
			// Tokenize the content and process it using processChildren
			if (content && context.processChildren) {
				const childTokens = tokenize(content);
				return context.processChildren(childTokens);
			}
			return content.trim();

		case 'abstract': {
			// Process content for abstract
			const processedContent = context.processChildren
				? context.processChildren(tokenize(content))
				: content.trim();
			return `**Abstract**\n\n${processedContent}`;
		}

		case 'theorem':
		case 'lemma':
		case 'definition':
		case 'corollary':
		case 'remark':
		case 'example':
		case 'exercise': {
			// Capitalize first letter
			const title = name.charAt(0).toUpperCase() + name.slice(1);
			// Process content
			const processedContent = context.processChildren
				? context.processChildren(tokenize(content))
				: content.trim();
			return `**${title}:** ${processedContent}`;
		}

		case 'proof': {
			// Process content for proof
			const processedContent = context.processChildren
				? context.processChildren(tokenize(content))
				: content.trim();
			return `*Proof:* ${processedContent} QED`;
		}

		default: {
			// Process content for unknown document environments
			const processedContent = context.processChildren
				? context.processChildren(tokenize(content))
				: content.trim();
			return processedContent;
		}
	}
}

/**
 * Convert an inline math token to markdown.
 * Attempts to convert LaTeX math to custom syntax.
 */
function convertMathInlineToken(token: MathInlineToken, context: ConversionContext): string {
	// Try converting to custom syntax
	const result = convertMathToCustomSyntax(token.latex, context, token.line, token.column);

	// Wrap in appropriate delimiters
	const content = result.output;
	switch (context.options.mathDelimiters) {
		case 'tilde':
			return `~${content}~`;
		case 'brackets':
			return `\\(${content}\\)`;
		case 'dollar':
		default:
			return `$${content}$`;
	}
}

/**
 * Convert a display math token to markdown.
 * Attempts to convert LaTeX math to custom syntax.
 */
function convertMathDisplayToken(token: MathDisplayToken, context: ConversionContext): string {
	// Try converting to custom syntax
	const result = convertMathToCustomSyntax(token.latex, context, token.line, token.column);

	// Wrap in appropriate delimiters
	const content = result.output;
	switch (context.options.mathDelimiters) {
		case 'tilde':
			return `~~${content}~~`;
		case 'brackets':
			return `\\[${content}\\]`;
		case 'dollar':
		default:
			return `$$${content}$$`;
	}
}

/**
 * Convert a comment token to markdown (or empty if not preserving).
 */
function convertCommentToken(token: CommentToken, context: ConversionContext): string {
	if (context.options.preserveComments) {
		return `<!-- ${token.content.trim()} -->`;
	}
	return '';
}

/**
 * Convert a newline token to markdown.
 */
function convertNewlineToken(token: NewlineToken, context: ConversionContext): string {
	if (context.options.preserveWhitespace) {
		return token.raw;
	}

	// Paragraph break (2+ newlines)
	if (token.isParagraphBreak) {
		return '\n\n';
	}

	// Single newline - convert to space in most contexts
	// Exception: in lists, preserve newlines
	if (context.inListItem) {
		return '\n';
	}

	return ' ';
}

/**
 * Convert a group token to markdown by processing its children.
 */
function convertGroupToken(
	token: GroupToken,
	context: ConversionContext,
	stats: TranspileStats
): string {
	// If group has parsed children, process them
	if (token.children && token.children.length > 0) {
		return processTokens(token.children, context, stats);
	}

	// Otherwise, tokenize and process the content
	if (token.content) {
		const childTokens = tokenize(token.content);
		return processTokens(childTokens, context, stats);
	}

	return '';
}

/**
 * Convert a whitespace token to markdown.
 */
function convertWhitespaceToken(token: WhitespaceToken, context: ConversionContext): string {
	if (context.options.preserveWhitespace) {
		return token.content;
	}

	// Non-breaking space (~) becomes regular space
	if (token.isSignificant) {
		return ' ';
	}

	// Normalize whitespace to single space
	return ' ';
}

/**
 * Convert a special character token to markdown.
 */
function convertSpecialToken(token: SpecialToken, context: ConversionContext): string {
	return convertSpecialCharacter(token, context);
}

// ===========================
// Markdown Cleanup
// ===========================

/**
 * Clean up the final markdown output.
 * Removes excessive whitespace and ensures proper formatting.
 *
 * @param markdown - The raw markdown output
 * @param options - The transpilation options
 * @returns The cleaned markdown
 */
function cleanupMarkdown(markdown: string, options: Required<LatexToMarkdownOptions>): string {
	if (options.preserveWhitespace) {
		return markdown;
	}

	let result = markdown;

	// Normalize line endings
	result = result.replace(/\r\n/g, '\n');

	// Remove more than 2 consecutive newlines (preserve paragraph breaks)
	result = result.replace(/\n{3,}/g, '\n\n');

	// Remove trailing whitespace from lines
	result = result
		.split('\n')
		.map((line) => line.trimEnd())
		.join('\n');

	// Trim leading/trailing whitespace from the entire document
	result = result.trim();

	// Ensure single newline at end
	if (result && !result.endsWith('\n')) {
		result += '\n';
	}

	return result;
}

// ===========================
// Exports
// ===========================

export {
	createConversionContext,
	processTokens,
	convertSingleToken,
	cleanupMarkdown,
	DEFAULT_OPTIONS
};
