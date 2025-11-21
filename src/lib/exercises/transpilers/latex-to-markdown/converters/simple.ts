/**
 * Simple Converters for LaTeX to Markdown
 * Handles trivial and easy conversions: math, headings, text formatting,
 * horizontal rules, and special characters.
 */

import type {
	CommandToken,
	MathInlineToken,
	MathDisplayToken,
	SpecialToken,
	ConversionContext,
	ConverterFn
} from '../types';

// ===========================
// Math Converters (Trivial - Pass-through)
// ===========================

/**
 * Convert inline math token to Markdown.
 * $...$ and \(...\) both become $...$
 */
export function convertMathInline(token: MathInlineToken): string {
	return `$${token.latex}$`;
}

/**
 * Convert display math token to Markdown.
 * $$...$$ and \[...\] both become $$...$$
 */
export function convertMathDisplay(token: MathDisplayToken): string {
	return `$$${token.latex}$$`;
}

// ===========================
// Heading Converters (Easy)
// ===========================

/**
 * Mapping of LaTeX heading commands to Markdown heading levels.
 * Note: chapter maps to h1, but is typically not used in articles.
 */
const HEADING_LEVELS: Record<string, number> = {
	chapter: 1,
	section: 1,
	subsection: 2,
	subsubsection: 3,
	paragraph: 4,
	subparagraph: 5
};

/**
 * Convert heading command to Markdown.
 * \section{...} -> # ...
 * \subsection{...} -> ## ...
 * etc.
 */
export function convertHeading(token: CommandToken, _ctx: ConversionContext): string {
	// Remove star suffix for lookup (e.g., section* -> section)
	const cmdName = token.name.replace('*', '');
	const level = HEADING_LEVELS[cmdName] ?? 1;
	const content = token.args[0] ?? '';

	return `${'#'.repeat(level)} ${content}`;
}

/**
 * Check if a command is a heading command.
 */
export function isHeadingCommand(name: string): boolean {
	const baseName = name.replace('*', '');
	return baseName in HEADING_LEVELS;
}

// ===========================
// Text Formatting Converters (Easy)
// ===========================

/**
 * Convert text formatting command to Markdown.
 * \textbf{...} -> **...**
 * \textit{...} -> *...*
 * etc.
 */
export function convertTextFormatting(token: CommandToken, _ctx: ConversionContext): string {
	const content = token.args[0] ?? '';

	switch (token.name) {
		case 'textbf':
		case 'bf':
			return `**${content}**`;
		case 'textit':
		case 'it':
		case 'emph':
			return `*${content}*`;
		case 'texttt':
		case 'tt':
			return `\`${content}\``;
		case 'underline':
			return `<u>${content}</u>`;
		case 'textsc':
			return `<span style="font-variant:small-caps">${content}</span>`;
		default:
			return content;
	}
}

/**
 * Check if a command is a text formatting command.
 */
export function isFormattingCommand(name: string): boolean {
	return ['textbf', 'bf', 'textit', 'it', 'emph', 'texttt', 'tt', 'underline', 'textsc'].includes(
		name
	);
}

// ===========================
// Horizontal Rule Converters (Easy)
// ===========================

/**
 * Convert horizontal rule command to Markdown.
 * \hrule, \hline, \rule{...}{...} -> ---
 */
export function convertHorizontalRule(): string {
	return '---';
}

/**
 * Check if a command is a horizontal rule command.
 */
export function isHorizontalRuleCommand(name: string): boolean {
	return ['hrule', 'hline', 'rule'].includes(name);
}

// ===========================
// Special Character Converters
// ===========================

/**
 * Mapping of LaTeX escape commands to their output characters.
 */
const ESCAPE_COMMANDS: Record<string, string> = {
	// Basic escaped characters
	'&': '&',
	'%': '%',
	$: '$',
	_: '_',
	'#': '#',
	'{': '{',
	'}': '}',

	// Backslash variants
	textbackslash: '\\',
	backslash: '\\',

	// Dots
	ldots: '...',
	dots: '...',

	// Brand names (simplified)
	LaTeX: 'LaTeX',
	TeX: 'TeX',

	// Paragraph and line breaks
	par: '\n\n',
	newline: '  \n',
	linebreak: '  \n',

	// Spacing commands
	quad: '  ',
	qquad: '    ',
	enspace: ' ',
	thinspace: ' ',
	',': ' ', // thin space in math
	';': ' ', // medium space in math
	':': ' ', // medium space in math
	'!': '' // negative thin space (collapse)
};

/**
 * Convert special character/escape sequence command to Markdown.
 */
export function convertSpecialCharacter(
	token: CommandToken | SpecialToken,
	_ctx: ConversionContext
): string {
	// Handle command tokens (escaped characters like \$, \%, etc.)
	if (token.type === 'command') {
		return ESCAPE_COMMANDS[token.name] ?? '';
	}

	// Handle special tokens (raw special characters like ~, &, etc.)
	if (token.type === 'special') {
		switch (token.char) {
			case '~':
				return ' '; // non-breaking space -> regular space
			case '&':
				return '&'; // alignment (outside tables)
			default:
				return token.char;
		}
	}

	return '';
}

/**
 * Check if a command is an escape sequence command.
 */
export function isEscapeCommand(name: string): boolean {
	return name in ESCAPE_COMMANDS;
}

/**
 * Convert line break command (\\) to Markdown.
 * \\ -> two trailing spaces + newline
 */
export function convertLineBreak(): string {
	return '  \n';
}

// ===========================
// Dash Conversion
// ===========================

/**
 * Convert text with LaTeX dashes to proper Unicode dashes.
 * --- -> em-dash (U+2014)
 * -- -> en-dash (U+2013)
 *
 * Note: Must process em-dash first to avoid partial replacement.
 */
export function convertDashes(text: string): string {
	return text.replace(/---/g, '\u2014').replace(/--/g, '\u2013');
}

// ===========================
// Command Converter Registry
// ===========================

/**
 * Create a wrapped converter function that ignores the context parameter.
 */
function wrapConverter(fn: () => string): ConverterFn<CommandToken> {
	return () => fn();
}

/**
 * Registry of simple command converters.
 * Maps command names to their converter functions.
 */
export const simpleCommandConverters: Record<string, ConverterFn<CommandToken>> = {
	// Headings
	chapter: convertHeading,
	'chapter*': convertHeading,
	section: convertHeading,
	'section*': convertHeading,
	subsection: convertHeading,
	'subsection*': convertHeading,
	subsubsection: convertHeading,
	'subsubsection*': convertHeading,
	paragraph: convertHeading,
	'paragraph*': convertHeading,
	subparagraph: convertHeading,
	'subparagraph*': convertHeading,

	// Text formatting
	textbf: convertTextFormatting,
	bf: convertTextFormatting,
	textit: convertTextFormatting,
	it: convertTextFormatting,
	emph: convertTextFormatting,
	texttt: convertTextFormatting,
	tt: convertTextFormatting,
	underline: convertTextFormatting,
	textsc: convertTextFormatting,

	// Horizontal rules
	hrule: wrapConverter(convertHorizontalRule),
	hline: wrapConverter(convertHorizontalRule),
	rule: wrapConverter(convertHorizontalRule),

	// Line break
	'\\': wrapConverter(convertLineBreak),

	// Escaped characters
	'&': convertSpecialCharacter as ConverterFn<CommandToken>,
	'%': convertSpecialCharacter as ConverterFn<CommandToken>,
	$: convertSpecialCharacter as ConverterFn<CommandToken>,
	_: convertSpecialCharacter as ConverterFn<CommandToken>,
	'#': convertSpecialCharacter as ConverterFn<CommandToken>,
	'{': convertSpecialCharacter as ConverterFn<CommandToken>,
	'}': convertSpecialCharacter as ConverterFn<CommandToken>,
	textbackslash: convertSpecialCharacter as ConverterFn<CommandToken>,
	backslash: convertSpecialCharacter as ConverterFn<CommandToken>,
	ldots: convertSpecialCharacter as ConverterFn<CommandToken>,
	dots: convertSpecialCharacter as ConverterFn<CommandToken>,
	LaTeX: convertSpecialCharacter as ConverterFn<CommandToken>,
	TeX: convertSpecialCharacter as ConverterFn<CommandToken>,
	par: convertSpecialCharacter as ConverterFn<CommandToken>,
	newline: convertSpecialCharacter as ConverterFn<CommandToken>,
	linebreak: convertSpecialCharacter as ConverterFn<CommandToken>,
	quad: convertSpecialCharacter as ConverterFn<CommandToken>,
	qquad: convertSpecialCharacter as ConverterFn<CommandToken>,
	enspace: convertSpecialCharacter as ConverterFn<CommandToken>,
	thinspace: convertSpecialCharacter as ConverterFn<CommandToken>,
	',': convertSpecialCharacter as ConverterFn<CommandToken>,
	';': convertSpecialCharacter as ConverterFn<CommandToken>,
	':': convertSpecialCharacter as ConverterFn<CommandToken>,
	'!': convertSpecialCharacter as ConverterFn<CommandToken>
};

/**
 * Get the converter for a command, if one exists.
 */
export function getSimpleCommandConverter(name: string): ConverterFn<CommandToken> | undefined {
	return simpleCommandConverters[name];
}

/**
 * Check if a command has a simple converter.
 */
export function hasSimpleConverter(name: string): boolean {
	return name in simpleCommandConverters;
}
