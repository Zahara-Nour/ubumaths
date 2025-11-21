/**
 * Block Converters for LaTeX to Markdown
 * Handles block-level environments: quotes, code blocks, images, figures, and center.
 */

import type { EnvironmentToken, CommandToken, ConversionContext, ConverterFn } from '../types';

// ===========================
// Constants
// ===========================

/** Block environment names */
const BLOCK_ENVIRONMENTS = [
	'quote',
	'quotation',
	'verbatim',
	'lstlisting',
	'minted',
	'figure',
	'center'
];

/** Language mapping for lstlisting/minted to common lowercase names */
const LANGUAGE_MAP: Record<string, string> = {
	Python: 'python',
	python: 'python',
	JavaScript: 'javascript',
	javascript: 'javascript',
	js: 'javascript',
	Java: 'java',
	java: 'java',
	C: 'c',
	c: 'c',
	'C++': 'cpp',
	cpp: 'cpp',
	TypeScript: 'typescript',
	typescript: 'typescript',
	ts: 'typescript',
	Ruby: 'ruby',
	ruby: 'ruby',
	Go: 'go',
	go: 'go',
	Rust: 'rust',
	rust: 'rust',
	SQL: 'sql',
	sql: 'sql',
	HTML: 'html',
	html: 'html',
	CSS: 'css',
	css: 'css',
	JSON: 'json',
	json: 'json',
	XML: 'xml',
	xml: 'xml',
	Bash: 'bash',
	bash: 'bash',
	Shell: 'bash',
	shell: 'bash',
	PHP: 'php',
	php: 'php',
	Perl: 'perl',
	perl: 'perl',
	Scala: 'scala',
	scala: 'scala',
	Kotlin: 'kotlin',
	kotlin: 'kotlin',
	Swift: 'swift',
	swift: 'swift',
	Haskell: 'haskell',
	haskell: 'haskell',
	Lua: 'lua',
	lua: 'lua',
	R: 'r',
	r: 'r',
	MATLAB: 'matlab',
	matlab: 'matlab',
	Octave: 'octave',
	octave: 'octave',
	LaTeX: 'latex',
	latex: 'latex',
	TeX: 'tex',
	tex: 'tex'
};

// ===========================
// Utility Functions
// ===========================

/**
 * Check if an environment name is a block environment.
 */
export function isBlockEnvironment(name: string): boolean {
	return BLOCK_ENVIRONMENTS.includes(name);
}

/**
 * Extract language from lstlisting options.
 * Parses [language=Python] or [language=python] format.
 * Returns undefined if no language is specified.
 *
 * @example
 * extractLstlistingLanguage('[language=Python]') // 'python'
 * extractLstlistingLanguage('[language=JavaScript, numbers=left]') // 'javascript'
 * extractLstlistingLanguage('[numbers=left]') // undefined
 * extractLstlistingLanguage() // undefined
 */
export function extractLstlistingLanguage(options?: string): string | undefined {
	if (!options) {
		return undefined;
	}

	// Match language=... pattern (case-insensitive key, various value formats)
	const match = options.match(/language\s*=\s*([^\s,\]]+)/i);
	if (!match) {
		return undefined;
	}

	const rawLang = match[1].trim();
	return LANGUAGE_MAP[rawLang] ?? rawLang.toLowerCase();
}

/**
 * Extract caption from figure environment content.
 * Looks for \caption{...} command.
 *
 * @example
 * extractCaption('\\includegraphics{img.png}\\caption{My caption}') // 'My caption'
 * extractCaption('\\includegraphics{img.png}') // undefined
 */
export function extractCaption(content: string): string | undefined {
	// Match \caption{...} handling nested braces
	const captionStart = content.indexOf('\\caption{');
	if (captionStart === -1) {
		return undefined;
	}

	const startBrace = captionStart + 8; // Position of '{'
	let depth = 1;
	let endBrace = startBrace + 1;

	while (depth > 0 && endBrace < content.length) {
		if (content[endBrace] === '{') {
			depth++;
		} else if (content[endBrace] === '}') {
			depth--;
		}
		endBrace++;
	}

	if (depth === 0) {
		return content.slice(startBrace + 1, endBrace - 1).trim();
	}

	return undefined;
}

/**
 * Extract image path from \includegraphics command in content.
 * Looks for \includegraphics[...]{path} or \includegraphics{path}.
 */
export function extractImagePath(content: string): string | undefined {
	// Match \includegraphics with optional options
	const match = content.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/);
	return match ? match[1].trim() : undefined;
}

/**
 * Normalize language string to lowercase standard format.
 */
export function normalizeLanguage(language: string): string {
	return LANGUAGE_MAP[language] ?? language.toLowerCase();
}

// ===========================
// Quote Converters
// ===========================

/**
 * Convert quote environment to Markdown blockquote.
 * Each line is prefixed with > .
 *
 * @example
 * \begin{quote}
 *   This is a quote.
 *   Multiple lines.
 * \end{quote}
 * ->
 * > This is a quote.
 * > Multiple lines.
 */
export function convertQuote(token: EnvironmentToken, _ctx: ConversionContext): string {
	const content = token.content.trim();

	if (!content) {
		return '';
	}

	// Split into lines, trim each, filter empty, and prefix with >
	const lines = content
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	return lines.map((line) => `> ${line}`).join('\n');
}

/**
 * Convert quotation environment to Markdown blockquote.
 * Same as quote but quotation typically has paragraph indentation in LaTeX.
 */
export function convertQuotation(token: EnvironmentToken, ctx: ConversionContext): string {
	// In Markdown, we treat quotation the same as quote
	return convertQuote(token, ctx);
}

// ===========================
// Code Block Converters
// ===========================

/**
 * Convert verbatim environment to Markdown code block (no language).
 * Preserves whitespace exactly as written.
 *
 * @example
 * \begin{verbatim}
 * function hello() {
 *   return "world";
 * }
 * \end{verbatim}
 * ->
 * ```
 * function hello() {
 *   return "world";
 * }
 * ```
 */
export function convertVerbatim(token: EnvironmentToken, _ctx: ConversionContext): string {
	// For verbatim, we preserve content as-is, only trimming the outer newlines
	let content = token.content;

	// Remove leading newline if present (comes right after \begin{verbatim})
	if (content.startsWith('\n')) {
		content = content.slice(1);
	}

	// Remove trailing newline if present (comes right before \end{verbatim})
	if (content.endsWith('\n')) {
		content = content.slice(0, -1);
	}

	return '```\n' + content + '\n```';
}

/**
 * Convert lstlisting environment to Markdown code block with language.
 * Extracts language from options if present.
 *
 * @example
 * \begin{lstlisting}[language=Python]
 * def hello():
 *     return "world"
 * \end{lstlisting}
 * ->
 * ```python
 * def hello():
 *     return "world"
 * ```
 */
export function convertLstlisting(token: EnvironmentToken, _ctx: ConversionContext): string {
	const language = extractLstlistingLanguage(token.options);

	// Process content - trim leading/trailing newlines
	let content = token.content;
	if (content.startsWith('\n')) {
		content = content.slice(1);
	}
	if (content.endsWith('\n')) {
		content = content.slice(0, -1);
	}

	const langSpec = language ?? '';
	return '```' + langSpec + '\n' + content + '\n```';
}

/**
 * Convert minted environment to Markdown code block with language.
 * Language is specified as the first required argument: \begin{minted}{language}
 *
 * @example
 * \begin{minted}{javascript}
 * const x = 1;
 * \end{minted}
 * ->
 * ```javascript
 * const x = 1;
 * ```
 */
export function convertMinted(token: EnvironmentToken, _ctx: ConversionContext): string {
	// For minted, the language comes from the environment options in a special format
	// The options string typically contains the language as {language} format
	// But in our token structure, it might be in options field
	let language = '';

	if (token.options) {
		// Try to extract language from options
		// Could be {javascript} or just javascript
		const optionsClean = token.options.replace(/[{}]/g, '').trim();
		language = normalizeLanguage(optionsClean);
	}

	// Process content - trim leading/trailing newlines
	let content = token.content;
	if (content.startsWith('\n')) {
		content = content.slice(1);
	}
	if (content.endsWith('\n')) {
		content = content.slice(0, -1);
	}

	return '```' + language + '\n' + content + '\n```';
}

// ===========================
// Image Converters
// ===========================

/**
 * Convert includegraphics command to Markdown image.
 * Options like width, scale are ignored (not representable in basic Markdown).
 *
 * @example
 * \includegraphics{image.png}
 * \includegraphics[width=0.5\textwidth]{figure.jpg}
 * \includegraphics[scale=0.8]{diagram.pdf}
 * ->
 * ![](image.png)
 * ![](figure.jpg)
 * ![](diagram.pdf)
 */
export function convertIncludegraphics(token: CommandToken, _ctx: ConversionContext): string {
	const imagePath = token.args[0] ?? '';
	return `![](${imagePath})`;
}

/**
 * Convert figure environment to Markdown image with caption.
 * Extracts \includegraphics path and \caption text.
 *
 * @example
 * \begin{figure}
 *   \includegraphics{image.png}
 *   \caption{My caption}
 *   \label{fig:example}
 * \end{figure}
 * ->
 * ![My caption](image.png)
 */
export function convertFigure(token: EnvironmentToken, _ctx: ConversionContext): string {
	const content = token.content;

	// Extract image path
	const imagePath = extractImagePath(content);
	if (!imagePath) {
		return '';
	}

	// Extract caption (optional)
	const caption = extractCaption(content) ?? '';

	return `![${caption}](${imagePath})`;
}

// ===========================
// Center Environment
// ===========================

/**
 * Convert center environment to HTML div with text-align center.
 *
 * @example
 * \begin{center}
 *   Centered text
 * \end{center}
 * ->
 * <div style="text-align: center">
 *
 * Centered text
 *
 * </div>
 */
export function convertCenter(token: EnvironmentToken, _ctx: ConversionContext): string {
	const content = token.content.trim();

	if (!content) {
		return '<div style="text-align: center">\n\n</div>';
	}

	return `<div style="text-align: center">\n\n${content}\n\n</div>`;
}

// ===========================
// Converter Registries
// ===========================

/**
 * Registry of block environment converters.
 * Maps environment names to their converter functions.
 */
export const blockEnvironmentConverters: Record<string, ConverterFn<EnvironmentToken>> = {
	quote: convertQuote,
	quotation: convertQuotation,
	verbatim: convertVerbatim,
	lstlisting: convertLstlisting,
	minted: convertMinted,
	figure: convertFigure,
	center: convertCenter
};

/**
 * Registry of block command converters.
 * Maps command names to their converter functions.
 */
export const blockCommandConverters: Record<string, ConverterFn<CommandToken>> = {
	includegraphics: convertIncludegraphics
};

/**
 * Get the converter for a block environment.
 */
export function getBlockEnvironmentConverter(
	name: string
): ConverterFn<EnvironmentToken> | undefined {
	return blockEnvironmentConverters[name];
}

/**
 * Get the converter for a block command.
 */
export function getBlockCommandConverter(name: string): ConverterFn<CommandToken> | undefined {
	return blockCommandConverters[name];
}

/**
 * Check if a command has a block converter.
 */
export function hasBlockCommandConverter(name: string): boolean {
	return name in blockCommandConverters;
}

/**
 * Check if an environment has a block converter.
 */
export function hasBlockEnvironmentConverter(name: string): boolean {
	return name in blockEnvironmentConverters;
}
