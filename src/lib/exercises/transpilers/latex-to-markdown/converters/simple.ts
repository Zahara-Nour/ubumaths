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
	cdots: '⋯',

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
	'!': '', // negative thin space (collapse)

	// Math symbols that might appear in text
	times: '×',
	div: '÷',
	pm: '±',
	mp: '∓',
	leq: '≤',
	geq: '≥',
	neq: '≠',
	approx: '≈',
	equiv: '≡',
	infty: '∞',
	alpha: 'α',
	beta: 'β',
	gamma: 'γ',
	delta: 'δ',
	epsilon: 'ε',
	pi: 'π',
	sigma: 'σ',
	omega: 'ω',
	Omega: 'Ω',
	Delta: 'Δ',
	Sigma: 'Σ',
	Pi: 'Π',
	rightarrow: '→',
	leftarrow: '←',
	Rightarrow: '⇒',
	Leftarrow: '⇐',
	Leftrightarrow: '⇔',
	leftrightarrow: '↔',
	implies: '⇒',
	iff: '⇔',
	in: '∈',
	notin: '∉',
	subset: '⊂',
	supset: '⊃',
	subseteq: '⊆',
	supseteq: '⊇',
	cup: '∪',
	cap: '∩',
	emptyset: '∅',
	forall: '∀',
	exists: '∃',
	neg: '¬',
	land: '∧',
	lor: '∨',
	sum: '∑',
	prod: '∏',
	int: '∫',
	partial: '∂',
	nabla: '∇',
	sqrt: '√',
	degree: '°',
	circ: '∘',
	bullet: '•',
	cdot: '·',
	star: '⋆',
	dagger: '†',
	ddagger: '‡',
	prime: '′',
	setminus: '∖'
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
	'!': convertSpecialCharacter as ConverterFn<CommandToken>,
	cdots: convertSpecialCharacter as ConverterFn<CommandToken>,

	// Math symbols
	times: convertSpecialCharacter as ConverterFn<CommandToken>,
	div: convertSpecialCharacter as ConverterFn<CommandToken>,
	pm: convertSpecialCharacter as ConverterFn<CommandToken>,
	mp: convertSpecialCharacter as ConverterFn<CommandToken>,
	leq: convertSpecialCharacter as ConverterFn<CommandToken>,
	geq: convertSpecialCharacter as ConverterFn<CommandToken>,
	neq: convertSpecialCharacter as ConverterFn<CommandToken>,
	approx: convertSpecialCharacter as ConverterFn<CommandToken>,
	equiv: convertSpecialCharacter as ConverterFn<CommandToken>,
	infty: convertSpecialCharacter as ConverterFn<CommandToken>,
	alpha: convertSpecialCharacter as ConverterFn<CommandToken>,
	beta: convertSpecialCharacter as ConverterFn<CommandToken>,
	gamma: convertSpecialCharacter as ConverterFn<CommandToken>,
	delta: convertSpecialCharacter as ConverterFn<CommandToken>,
	epsilon: convertSpecialCharacter as ConverterFn<CommandToken>,
	pi: convertSpecialCharacter as ConverterFn<CommandToken>,
	sigma: convertSpecialCharacter as ConverterFn<CommandToken>,
	omega: convertSpecialCharacter as ConverterFn<CommandToken>,
	Omega: convertSpecialCharacter as ConverterFn<CommandToken>,
	Delta: convertSpecialCharacter as ConverterFn<CommandToken>,
	Sigma: convertSpecialCharacter as ConverterFn<CommandToken>,
	Pi: convertSpecialCharacter as ConverterFn<CommandToken>,
	rightarrow: convertSpecialCharacter as ConverterFn<CommandToken>,
	leftarrow: convertSpecialCharacter as ConverterFn<CommandToken>,
	Rightarrow: convertSpecialCharacter as ConverterFn<CommandToken>,
	Leftarrow: convertSpecialCharacter as ConverterFn<CommandToken>,
	Leftrightarrow: convertSpecialCharacter as ConverterFn<CommandToken>,
	leftrightarrow: convertSpecialCharacter as ConverterFn<CommandToken>,
	implies: convertSpecialCharacter as ConverterFn<CommandToken>,
	iff: convertSpecialCharacter as ConverterFn<CommandToken>,
	in: convertSpecialCharacter as ConverterFn<CommandToken>,
	notin: convertSpecialCharacter as ConverterFn<CommandToken>,
	subset: convertSpecialCharacter as ConverterFn<CommandToken>,
	supset: convertSpecialCharacter as ConverterFn<CommandToken>,
	subseteq: convertSpecialCharacter as ConverterFn<CommandToken>,
	supseteq: convertSpecialCharacter as ConverterFn<CommandToken>,
	cup: convertSpecialCharacter as ConverterFn<CommandToken>,
	cap: convertSpecialCharacter as ConverterFn<CommandToken>,
	emptyset: convertSpecialCharacter as ConverterFn<CommandToken>,
	forall: convertSpecialCharacter as ConverterFn<CommandToken>,
	exists: convertSpecialCharacter as ConverterFn<CommandToken>,
	neg: convertSpecialCharacter as ConverterFn<CommandToken>,
	land: convertSpecialCharacter as ConverterFn<CommandToken>,
	lor: convertSpecialCharacter as ConverterFn<CommandToken>,
	sum: convertSpecialCharacter as ConverterFn<CommandToken>,
	prod: convertSpecialCharacter as ConverterFn<CommandToken>,
	int: convertSpecialCharacter as ConverterFn<CommandToken>,
	partial: convertSpecialCharacter as ConverterFn<CommandToken>,
	nabla: convertSpecialCharacter as ConverterFn<CommandToken>,
	sqrt: convertSpecialCharacter as ConverterFn<CommandToken>,
	degree: convertSpecialCharacter as ConverterFn<CommandToken>,
	circ: convertSpecialCharacter as ConverterFn<CommandToken>,
	bullet: convertSpecialCharacter as ConverterFn<CommandToken>,
	cdot: convertSpecialCharacter as ConverterFn<CommandToken>,
	star: convertSpecialCharacter as ConverterFn<CommandToken>,
	dagger: convertSpecialCharacter as ConverterFn<CommandToken>,
	ddagger: convertSpecialCharacter as ConverterFn<CommandToken>,
	prime: convertSpecialCharacter as ConverterFn<CommandToken>,
	setminus: convertSpecialCharacter as ConverterFn<CommandToken>
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
