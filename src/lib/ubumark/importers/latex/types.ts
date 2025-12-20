/**
 * Types for LaTeX to Markdown transpiler
 * Converts LaTeX documents to Ubumark format for further processing
 */

// ===========================
// Options and Result Types
// ===========================

/**
 * Options for LaTeX to Markdown transpilation
 */
export interface LatexToMarkdownOptions {
	/** Preserve LaTeX comments (%) as HTML comments. Default: false */
	preserveComments?: boolean;

	/** Math delimiters to use in output. Default: 'tilde' (custom markdown syntax) */
	mathDelimiters?: 'tilde' | 'dollar' | 'brackets';

	/** Maximum nesting depth for environments and groups. Default: 10 */
	maxNestingDepth?: number;

	/** Convert unsupported commands to plain text instead of warning. Default: false */
	fallbackToText?: boolean;

	/** Preserve original whitespace and formatting. Default: false */
	preserveWhitespace?: boolean;

	/** Line offset to add to all warning line numbers. Default: 0 */
	lineOffset?: number;

	/**
	 * Additional function names to recognize for derivative notation (e.g., C', P').
	 * These are merged with the default names (f, g, h, u, v, w, F, G, H).
	 * @example ['C', 'P', 'N'] to recognize C'(x), P'(x), N'(x)
	 */
	additionalFunctionNames?: string[];
}

/**
 * Options type with all required fields except additionalFunctionNames
 */
export type ResolvedLatexToMarkdownOptions = Required<
	Omit<LatexToMarkdownOptions, 'additionalFunctionNames'>
> &
	Pick<LatexToMarkdownOptions, 'additionalFunctionNames'>;

/**
 * Result of LaTeX to Markdown transpilation
 */
export interface TranspileResult {
	/** The generated markdown text */
	markdown: string;

	/** Warnings encountered during transpilation */
	warnings: TranspileWarning[];

	/** Statistics about the transpilation process */
	stats?: TranspileStats;
}

/**
 * Statistics about transpilation
 */
export interface TranspileStats {
	/** Total number of tokens processed */
	tokenCount: number;

	/** Number of commands converted */
	commandsConverted: number;

	/** Number of environments converted */
	environmentsConverted: number;

	/** Number of math expressions processed */
	mathExpressions: number;
}

/**
 * Types of warnings that can occur during transpilation
 */
export type WarningType =
	| 'unsupported-command'
	| 'unsupported-environment'
	| 'unsupported-math-feature'
	| 'parse-error'
	| 'nested-too-deep'
	| 'malformed-table'
	| 'unclosed-group'
	| 'mismatched-environment'
	| 'invalid-math';

/**
 * Warning generated during transpilation
 */
export interface TranspileWarning {
	/** Type of warning */
	type: WarningType;

	/** Human-readable warning message */
	message: string;

	/** Line number in original LaTeX (1-indexed) */
	line?: number;

	/** Column number in original LaTeX (1-indexed) */
	column?: number;

	/** The command or environment that caused the warning */
	command?: string;

	/** Severity level of the warning */
	severity?: 'info' | 'warning' | 'error';
}

// ===========================
// Token Types
// ===========================

/**
 * Token types for LaTeX tokenization
 */
export type LatexTokenType =
	| 'text' // Plain text
	| 'command' // \command
	| 'environment' // \begin{env}...\end{env}
	| 'math-inline' // $...$
	| 'math-display' // \[...\] or $$...$$
	| 'comment' // % comment
	| 'newline' // Line break
	| 'group' // {...}
	| 'whitespace' // Significant whitespace
	| 'special' // Special characters like &, #, etc.
	| 'verbatim'; // Verbatim text (no escaping)

/**
 * Base token interface
 */
export interface BaseToken {
	/** Token type */
	type: LatexTokenType;

	/** Raw text from original LaTeX */
	raw: string;

	/** Start position in original text */
	start: number;

	/** End position in original text */
	end: number;

	/** Line number (1-indexed) */
	line: number;

	/** Column number (1-indexed) */
	column: number;
}

/**
 * Plain text token
 */
export interface TextToken extends BaseToken {
	type: 'text';

	/** Text content */
	content: string;

	/** Whether text needs escaping in markdown */
	needsEscaping?: boolean;
}

/**
 * LaTeX command token (e.g., \textbf{...})
 */
export interface CommandToken extends BaseToken {
	type: 'command';

	/** Command name without backslash */
	name: string;

	/** Optional arguments in [] */
	options?: string[];

	/** Required arguments in {} */
	args: string[];

	/** Parsed tokens for each argument */
	parsedArgs?: LatexToken[][];

	/** Whether this is a known/supported command */
	isSupported?: boolean;
}

/**
 * LaTeX environment token
 */
export interface EnvironmentToken extends BaseToken {
	type: 'environment';

	/** Environment name */
	name: string;

	/** Environment options (e.g., [language=python] for lstlisting) */
	options?: string;

	/** Raw content between \begin and \end */
	content: string;

	/** Nested tokens inside the environment */
	children?: LatexToken[];

	/** Whether this is a known/supported environment */
	isSupported?: boolean;

	/** For nested environments, the depth level */
	depth?: number;
}

/**
 * Inline math token ($...$)
 */
export interface MathInlineToken extends BaseToken {
	type: 'math-inline';

	/** LaTeX math content */
	latex: string;

	/** Whether to use \(...\) instead of $...$ */
	useParentheses?: boolean;
}

/**
 * Display math token (\[...\] or $$...$$)
 */
export interface MathDisplayToken extends BaseToken {
	type: 'math-display';

	/** LaTeX math content */
	latex: string;

	/** Whether this was originally \[...\] (true) or $$...$$ (false) */
	useBrackets?: boolean;

	/** Optional equation label */
	label?: string;

	/** Optional equation number */
	number?: string;
}

/**
 * Comment token (% ...)
 */
export interface CommentToken extends BaseToken {
	type: 'comment';

	/** Comment content without % */
	content: string;

	/** Whether this is a special comment (e.g., %TODO:) */
	isSpecial?: boolean;
}

/**
 * Newline token
 */
export interface NewlineToken extends BaseToken {
	type: 'newline';

	/** Number of consecutive newlines */
	count: number;

	/** Whether this creates a paragraph break */
	isParagraphBreak?: boolean;
}

/**
 * Group token ({...})
 */
export interface GroupToken extends BaseToken {
	type: 'group';

	/** Raw content inside the group */
	content: string;

	/** Parsed tokens inside the group */
	children?: LatexToken[];

	/** Whether this group is an argument to a command */
	isArgument?: boolean;
}

/**
 * Whitespace token (significant spaces)
 */
export interface WhitespaceToken extends BaseToken {
	type: 'whitespace';

	/** Whitespace content */
	content: string;

	/** Whether this whitespace is significant */
	isSignificant?: boolean;
}

/**
 * Special character token
 */
export interface SpecialToken extends BaseToken {
	type: 'special';

	/** The special character */
	char: string;

	/** Meaning in LaTeX context */
	meaning?: 'alignment' | 'parameter' | 'subscript' | 'superscript' | 'escape';
}

/**
 * Verbatim text token
 */
export interface VerbatimToken extends BaseToken {
	type: 'verbatim';

	/** Verbatim content */
	content: string;

	/** Language for syntax highlighting (if applicable) */
	language?: string;
}

/**
 * Union of all token types
 */
export type LatexToken =
	| TextToken
	| CommandToken
	| EnvironmentToken
	| MathInlineToken
	| MathDisplayToken
	| CommentToken
	| NewlineToken
	| GroupToken
	| WhitespaceToken
	| SpecialToken
	| VerbatimToken;

// ===========================
// Converter Types
// ===========================

/**
 * Context passed to converters during transpilation
 */
export interface ConversionContext {
	/** Current indentation level (for nested lists) */
	indentLevel: number;

	/** Stack of active list types */
	listStack: ListType[];

	/** Whether currently inside a list item */
	inListItem: boolean;

	/** Whether currently inside a table */
	inTable: boolean;

	/** Whether currently inside a math environment */
	inMath: boolean;

	/** Whether currently inside a verbatim environment */
	inVerbatim: boolean;

	/** Current environment stack */
	environmentStack: string[];

	/** Options passed to transpiler */
	options: ResolvedLatexToMarkdownOptions;

	/** Warnings collector */
	warnings: TranspileWarning[];

	/** Add a warning to the collection */
	addWarning: (
		warning: Omit<TranspileWarning, 'line' | 'column'>,
		line?: number,
		column?: number
	) => void;

	/** Process child tokens */
	processChildren?: (tokens: LatexToken[]) => string;

	/** Convert a single token */
	convertToken?: (token: LatexToken) => string;
}

/**
 * Converter function signature
 */
export type ConverterFn<T extends LatexToken = LatexToken> = (
	token: T,
	context: ConversionContext
) => string;

/**
 * Registry of command converters
 */
export type CommandConverterRegistry = Record<string, ConverterFn<CommandToken>>;

/**
 * Registry of environment converters
 */
export type EnvironmentConverterRegistry = Record<string, ConverterFn<EnvironmentToken>>;

/**
 * Registry of special character converters
 */
export type SpecialCharacterRegistry = Record<
	string,
	string | ((context: ConversionContext) => string)
>;

// ===========================
// List Types
// ===========================

/**
 * Types of lists in LaTeX
 */
export type ListType = 'itemize' | 'enumerate' | 'description';

/**
 * List item information
 */
export interface ListItem {
	/** Item content */
	content: string;

	/** Custom label (for description lists) */
	label?: string;

	/** Item number (for enumerate) */
	number?: number;

	/** Nested list (if any) */
	nestedList?: ParsedList;

	/** Line offset within the environment content (0-based) */
	lineOffset?: number;
}

/**
 * Parsed list structure
 */
export interface ParsedList {
	/** Type of list */
	type: ListType;

	/** List items */
	items: ListItem[];

	/** Nesting level (0 for top-level) */
	level: number;

	/** Custom marker style (e.g., bullet type) */
	markerStyle?: string;
}

// ===========================
// Table Types
// ===========================

/**
 * Table alignment options
 */
export type TableAlignment = 'left' | 'center' | 'right';

/**
 * Table column specification
 */
export interface TableColumn {
	/** Column alignment */
	alignment: TableAlignment;

	/** Whether column has left border */
	leftBorder?: boolean;

	/** Whether column has right border */
	rightBorder?: boolean;

	/** Column width (if specified) */
	width?: string;
}

/**
 * Table cell
 */
export interface TableCell {
	/** Cell content */
	content: string;

	/** Number of columns this cell spans */
	colspan?: number;

	/** Number of rows this cell spans */
	rowspan?: number;

	/** Cell alignment override */
	alignment?: TableAlignment;

	/** Whether cell is a header cell */
	isHeader?: boolean;
}

/**
 * Table row
 */
export interface TableRow {
	/** Cells in the row */
	cells: TableCell[];

	/** Whether row has top border */
	topBorder?: boolean;

	/** Whether row has bottom border */
	bottomBorder?: boolean;

	/** Whether this is a header row */
	isHeader?: boolean;
}

/**
 * Parsed table structure
 */
export interface ParsedTable {
	/** Column specifications */
	columns: TableColumn[];

	/** Table rows */
	rows: TableRow[];

	/** Table caption (if any) */
	caption?: string;

	/** Table label for references */
	label?: string;

	/** Whether table uses booktabs package styling */
	useBooktabs?: boolean;
}

// ===========================
// Section Types
// ===========================

/**
 * Section levels in LaTeX
 */
export type SectionLevel =
	| 'part'
	| 'chapter'
	| 'section'
	| 'subsection'
	| 'subsubsection'
	| 'paragraph'
	| 'subparagraph';

/**
 * Parsed section information
 */
export interface ParsedSection {
	/** Section level */
	level: SectionLevel;

	/** Section title */
	title: string;

	/** Optional short title for TOC */
	shortTitle?: string;

	/** Section label for references */
	label?: string;

	/** Whether section is numbered */
	numbered: boolean;

	/** Markdown heading level (1-6) */
	markdownLevel: number;
}

// ===========================
// Bibliography Types
// ===========================

/**
 * Citation style
 */
export type CitationStyle = 'author-year' | 'numeric' | 'footnote';

/**
 * Parsed citation
 */
export interface ParsedCitation {
	/** Citation keys */
	keys: string[];

	/** Optional prefix text */
	prefix?: string;

	/** Optional suffix text */
	suffix?: string;

	/** Citation style */
	style: CitationStyle;

	/** Whether to include author names */
	includeAuthor?: boolean;
}

// ===========================
// Export helper type
// ===========================

/**
 * Main transpiler function type
 */
export type TranspilerFunction = (
	latex: string,
	options?: LatexToMarkdownOptions
) => TranspileResult;
