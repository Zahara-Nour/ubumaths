/**
 * Fallback Converters for LaTeX to Markdown
 * Handles unsupported commands and environments by wrapping them in HTML comments
 * for future reference while preserving the original LaTeX exactly.
 */

import type {
	CommandToken,
	EnvironmentToken,
	ConversionContext,
	TranspileWarning,
	WarningType
} from '../types';

// ===========================
// Supported Commands Registry
// ===========================

/**
 * Set of all supported commands from existing converters.
 * This list is used to determine if a command should use the fallback.
 */
const SUPPORTED_COMMANDS = new Set([
	// Headings (from simple.ts)
	'chapter',
	'chapter*',
	'section',
	'section*',
	'subsection',
	'subsection*',
	'subsubsection',
	'subsubsection*',
	'paragraph',
	'paragraph*',
	'subparagraph',
	'subparagraph*',

	// Text formatting (from simple.ts)
	'textbf',
	'bf',
	'textit',
	'it',
	'emph',
	'texttt',
	'tt',
	'underline',
	'textsc',

	// Horizontal rules (from simple.ts)
	'hrule',
	'hline',
	'rule',

	// Line break
	'\\',

	// Escaped characters (from simple.ts)
	'&',
	'%',
	'$',
	'_',
	'#',
	'{',
	'}',
	'textbackslash',
	'backslash',
	'ldots',
	'dots',
	'LaTeX',
	'TeX',
	'par',
	'newline',
	'linebreak',
	'quad',
	'qquad',
	'enspace',
	'thinspace',
	',',
	';',
	':',
	'!',

	// Images (from blocks.ts)
	'includegraphics',

	// List item (from lists.ts)
	'item',

	// Additional common commands
	'caption',
	'label',
	'centering',
	'newpage',
	'clearpage',
	'pagebreak',
	'noindent',
	'footnote',
	'cite',
	'ref',
	'eqref',
	'url',
	'href',
	'verb',
	'input',
	'include'
]);

/**
 * Set of all supported environments from existing converters.
 * This list is used to determine if an environment should use the fallback.
 */
const SUPPORTED_ENVIRONMENTS = new Set([
	// Lists (from lists.ts)
	'itemize',
	'enumerate',
	'description',

	// Block environments (from blocks.ts)
	'quote',
	'quotation',
	'verbatim',
	'lstlisting',
	'minted',
	'figure',
	'center',

	// Tables (from tables.ts)
	'tabular',
	'table',
	'array',
	'longtable',
	'tabularx',
	'tabulary',

	// Math environments (pass-through)
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
	'Vmatrix',

	// Document structure
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
]);

// ===========================
// Support Check Functions
// ===========================

/**
 * Check if a command is in the supported commands registry.
 *
 * @param name - The command name to check (without backslash)
 * @returns true if the command is supported, false otherwise
 *
 * @example
 * isSupportedCommand('textbf') // true
 * isSupportedCommand('customcmd') // false
 */
export function isSupportedCommand(name: string): boolean {
	return SUPPORTED_COMMANDS.has(name);
}

/**
 * Check if an environment is in the supported environments registry.
 *
 * @param name - The environment name to check
 * @returns true if the environment is supported, false otherwise
 *
 * @example
 * isSupportedEnvironment('itemize') // true
 * isSupportedEnvironment('customenv') // false
 */
export function isSupportedEnvironment(name: string): boolean {
	return SUPPORTED_ENVIRONMENTS.has(name);
}

/**
 * Get the list of all supported command names.
 * Useful for documentation and debugging.
 */
export function getSupportedCommands(): string[] {
	return Array.from(SUPPORTED_COMMANDS).sort();
}

/**
 * Get the list of all supported environment names.
 * Useful for documentation and debugging.
 */
export function getSupportedEnvironments(): string[] {
	return Array.from(SUPPORTED_ENVIRONMENTS).sort();
}

// ===========================
// Warning Creation
// ===========================

/**
 * Create a properly typed warning object for unsupported LaTeX constructs.
 *
 * @param type - The type of unsupported construct ('command' or 'environment')
 * @param name - The name of the unsupported command or environment
 * @param line - Optional line number in the original LaTeX
 * @param column - Optional column number in the original LaTeX
 * @returns A TranspileWarning object with all required fields
 *
 * @example
 * createFallbackWarning('command', 'customcmd', 10, 5)
 * // { type: 'unsupported-command', message: 'Unsupported LaTeX command: \\customcmd', ... }
 */
export function createFallbackWarning(
	type: 'command' | 'environment',
	name: string,
	line?: number,
	column?: number
): TranspileWarning {
	const warningType: WarningType =
		type === 'command' ? 'unsupported-command' : 'unsupported-environment';

	const message =
		type === 'command'
			? `Unsupported LaTeX command: \\${name}`
			: `Unsupported LaTeX environment: ${name}`;

	const warning: TranspileWarning = {
		type: warningType,
		message,
		command: name,
		severity: 'warning'
	};

	// Only add line/column if provided
	if (line !== undefined) {
		warning.line = line;
	}
	if (column !== undefined) {
		warning.column = column;
	}

	return warning;
}

// ===========================
// Formatting Helpers
// ===========================

/**
 * Reconstruct a LaTeX command string from a CommandToken.
 * Handles options and arguments to produce the original LaTeX representation.
 *
 * @param token - The CommandToken to reconstruct
 * @returns The reconstructed LaTeX command string
 *
 * @example
 * reconstructCommand({ name: 'textbf', args: ['bold text'], options: undefined })
 * // '\\textbf{bold text}'
 *
 * reconstructCommand({ name: 'includegraphics', args: ['img.png'], options: ['width=0.5\\textwidth'] })
 * // '\\includegraphics[width=0.5\\textwidth]{img.png}'
 */
export function reconstructCommand(token: CommandToken): string {
	const parts: string[] = [`\\${token.name}`];

	// Add optional arguments if present
	if (token.options && token.options.length > 0) {
		parts.push(`[${token.options.join(',')}]`);
	}

	// Add required arguments
	for (const arg of token.args) {
		parts.push(`{${arg}}`);
	}

	return parts.join('');
}

/**
 * Reconstruct a LaTeX environment string from an EnvironmentToken.
 * Produces the complete \begin{env}...\end{env} representation.
 *
 * @param token - The EnvironmentToken to reconstruct
 * @returns The reconstructed LaTeX environment string
 *
 * @example
 * reconstructEnvironment({ name: 'customenv', content: 'content here', options: undefined })
 * // '\\begin{customenv}content here\\end{customenv}'
 */
export function reconstructEnvironment(token: EnvironmentToken): string {
	const beginPart = token.options
		? `\\begin{${token.name}}[${token.options}]`
		: `\\begin{${token.name}}`;

	const endPart = `\\end{${token.name}}`;

	return `${beginPart}${token.content}${endPart}`;
}

/**
 * Escape special characters in content for HTML comments.
 * Prevents breaking the HTML comment syntax with -- sequences.
 *
 * @param content - The content to escape
 * @returns The escaped content safe for HTML comments
 */
export function escapeForHtmlComment(content: string): string {
	// Replace -- with a Unicode em-dash to prevent breaking HTML comments
	// Also escape any existing comment markers
	return content.replace(/--/g, '\u2014').replace(/<!--|-->/g, (match) => {
		return match === '<!--' ? '\u2039!--' : '--\u203A';
	});
}

// ===========================
// Main Converter Functions
// ===========================

/**
 * Convert an unsupported command to a preserved HTML comment.
 * Wraps the original LaTeX in an HTML comment for future reference.
 *
 * If `context.options.fallbackToText` is true, returns only the first
 * argument content (if any) without the HTML comment wrapper.
 *
 * @param token - The unsupported CommandToken to convert
 * @param context - The conversion context with options and warnings
 * @returns The HTML comment containing the original LaTeX, or plain text content
 *
 * @example
 * // Normal mode:
 * convertUnsupportedCommand(token, ctx)
 * // '<!-- LaTeX: \\customcmd{arg} -->'
 *
 * // With fallbackToText=true:
 * convertUnsupportedCommand(token, ctx)
 * // 'arg'
 */
export function convertUnsupportedCommand(token: CommandToken, context: ConversionContext): string {
	// Create and add warning
	const warning = createFallbackWarning('command', token.name, token.line, token.column);
	context.addWarning(warning, token.line, token.column);

	// If fallbackToText is enabled, return the content without wrapping
	if (context.options.fallbackToText) {
		// Return the first argument's content if available, or empty string
		return token.args[0] ?? '';
	}

	// Reconstruct and wrap in HTML comment
	const latex = reconstructCommand(token);
	const escaped = escapeForHtmlComment(latex);

	return `<!-- LaTeX: ${escaped} -->`;
}

/**
 * Convert an unsupported environment to a preserved HTML comment.
 * Wraps the original LaTeX in an HTML comment for future reference.
 *
 * If `context.options.fallbackToText` is true, returns only the environment
 * content without the HTML comment wrapper.
 *
 * @param token - The unsupported EnvironmentToken to convert
 * @param context - The conversion context with options and warnings
 * @returns The HTML comment containing the original LaTeX, or plain content
 *
 * @example
 * // Normal mode:
 * convertUnsupportedEnvironment(token, ctx)
 * // '<!-- LaTeX: \\begin{customenv}content\\end{customenv} -->'
 *
 * // With fallbackToText=true:
 * convertUnsupportedEnvironment(token, ctx)
 * // 'content'
 */
export function convertUnsupportedEnvironment(
	token: EnvironmentToken,
	context: ConversionContext
): string {
	// Create and add warning
	const warning = createFallbackWarning('environment', token.name, token.line, token.column);
	context.addWarning(warning, token.line, token.column);

	// If fallbackToText is enabled, return the content without wrapping
	if (context.options.fallbackToText) {
		return token.content.trim();
	}

	// Reconstruct and wrap in HTML comment
	const latex = reconstructEnvironment(token);
	const escaped = escapeForHtmlComment(latex);

	return `<!-- LaTeX: ${escaped} -->`;
}

// ===========================
// Fallback Converter Factory
// ===========================

/**
 * Create a fallback converter function for commands.
 * This is useful for registering fallback handlers in converter registries.
 *
 * @returns A converter function that handles unsupported commands
 */
export function createCommandFallbackConverter(): (
	token: CommandToken,
	context: ConversionContext
) => string {
	return convertUnsupportedCommand;
}

/**
 * Create a fallback converter function for environments.
 * This is useful for registering fallback handlers in converter registries.
 *
 * @returns A converter function that handles unsupported environments
 */
export function createEnvironmentFallbackConverter(): (
	token: EnvironmentToken,
	context: ConversionContext
) => string {
	return convertUnsupportedEnvironment;
}

// ===========================
// Registry Extension Helpers
// ===========================

/**
 * Add a command to the supported commands registry.
 * Use this when adding new command converters to ensure isSupportedCommand
 * returns true for the new command.
 *
 * @param name - The command name to add (without backslash)
 */
export function addSupportedCommand(name: string): void {
	SUPPORTED_COMMANDS.add(name);
}

/**
 * Add an environment to the supported environments registry.
 * Use this when adding new environment converters to ensure isSupportedEnvironment
 * returns true for the new environment.
 *
 * @param name - The environment name to add
 */
export function addSupportedEnvironment(name: string): void {
	SUPPORTED_ENVIRONMENTS.add(name);
}

/**
 * Remove a command from the supported commands registry.
 * Use with caution - this will cause the command to use fallback handling.
 *
 * @param name - The command name to remove
 * @returns true if the command was removed, false if it wasn't in the set
 */
export function removeSupportedCommand(name: string): boolean {
	return SUPPORTED_COMMANDS.delete(name);
}

/**
 * Remove an environment from the supported environments registry.
 * Use with caution - this will cause the environment to use fallback handling.
 *
 * @param name - The environment name to remove
 * @returns true if the environment was removed, false if it wasn't in the set
 */
export function removeSupportedEnvironment(name: string): boolean {
	return SUPPORTED_ENVIRONMENTS.delete(name);
}
