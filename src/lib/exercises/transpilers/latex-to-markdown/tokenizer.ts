/**
 * LaTeX Tokenizer
 * Converts raw LaTeX text into a sequence of tokens for the transpiler
 */

import type {
	LatexToken,
	TextToken,
	CommandToken,
	EnvironmentToken,
	MathInlineToken,
	MathDisplayToken,
	CommentToken,
	NewlineToken,
	GroupToken,
	WhitespaceToken,
	SpecialToken
} from './types';

/**
 * Tokenize LaTeX source text into a sequence of tokens.
 * @param latex - The LaTeX source text
 * @returns Array of tokens
 */
export function tokenize(latex: string): LatexToken[] {
	const tokens: LatexToken[] = [];
	let position = 0;
	let line = 1;
	let column = 1;

	while (position < latex.length) {
		const char = latex[position];
		const startLine = line;
		const startColumn = column;

		// Handle newlines
		if (char === '\n') {
			const startPos = position;
			let count = 1;
			position++;
			column = 1;
			line++;

			// Count consecutive newlines
			while (position < latex.length && latex[position] === '\n') {
				count++;
				position++;
				line++;
			}

			tokens.push({
				type: 'newline',
				raw: latex.substring(startPos, position),
				start: startPos,
				end: position,
				line: startLine,
				column: startColumn,
				count,
				isParagraphBreak: count >= 2
			} as NewlineToken);
			continue;
		}

		// Handle carriage return (Windows line endings)
		if (char === '\r') {
			position++;
			column++;
			continue; // Skip \r, \n will be handled separately
		}

		// Handle comments
		if (char === '%' && !isEscaped(latex, position)) {
			const result = extractComment(latex, position, line, column);
			if (result) {
				tokens.push(result.token);
				position = result.endIndex;
				column += result.token.raw.length;
				continue;
			}
		}

		// Handle display math $$...$$ or \[...\]
		if (
			(char === '$' && position + 1 < latex.length && latex[position + 1] === '$') ||
			(char === '\\' && position + 1 < latex.length && latex[position + 1] === '[')
		) {
			const result = extractDisplayMath(latex, position, line);
			if (result) {
				tokens.push(result.token);
				const newlines = countNewlines(result.token.raw);
				position = result.endIndex;
				line += newlines;
				column =
					newlines > 0
						? getColumnAfterNewlines(latex, result.endIndex)
						: column + result.token.raw.length;
				continue;
			}
		}

		// Handle inline math $...$
		if (char === '$' && !isEscaped(latex, position)) {
			const result = extractInlineMath(latex, position, line);
			if (result) {
				tokens.push(result.token);
				position = result.endIndex;
				column += result.token.raw.length;
				continue;
			}
		}

		// Handle commands and environments
		if (char === '\\' && !isEscaped(latex, position)) {
			// Check for \begin{...} environment
			if (latex.substring(position, position + 6) === '\\begin') {
				const result = extractEnvironment(latex, position, line);
				if (result) {
					tokens.push(result.token);
					const newlines = countNewlines(result.token.raw);
					position = result.endIndex;
					line += newlines;
					column =
						newlines > 0
							? getColumnAfterNewlines(latex, result.endIndex)
							: column + result.token.raw.length;
					continue;
				}
			}

			// Check for inline math \(...\)
			if (latex.substring(position, position + 2) === '\\(') {
				const closeIdx = latex.indexOf('\\)', position + 2);
				if (closeIdx !== -1) {
					const raw = latex.substring(position, closeIdx + 2);
					const mathContent = latex.substring(position + 2, closeIdx);
					tokens.push({
						type: 'math-inline',
						raw,
						start: position,
						end: closeIdx + 2,
						line,
						column,
						latex: mathContent,
						useParentheses: true
					} as MathInlineToken);
					position = closeIdx + 2;
					column += raw.length;
					continue;
				}
			}

			// Check for display math \[...\] (already handled above, but kept for clarity)
			if (latex.substring(position, position + 2) === '\\]') {
				// This is a closing \], treat as text
				tokens.push({
					type: 'text',
					raw: '\\]',
					start: position,
					end: position + 2,
					line,
					column,
					content: '\\]'
				} as TextToken);
				position += 2;
				column += 2;
				continue;
			}

			// Extract regular command
			const result = extractCommand(latex, position, line);
			if (result) {
				tokens.push(result.token);
				const newlines = countNewlines(result.token.raw);
				position = result.endIndex;
				line += newlines;
				column =
					newlines > 0
						? getColumnAfterNewlines(latex, result.endIndex)
						: column + result.token.raw.length;
				continue;
			}
		}

		// Handle special characters
		if (isSpecialChar(char) && !isEscaped(latex, position)) {
			tokens.push({
				type: 'special',
				raw: char,
				start: position,
				end: position + 1,
				line,
				column,
				char,
				meaning: getSpecialCharMeaning(char)
			} as SpecialToken);
			position++;
			column++;
			continue;
		}

		// Handle groups {...}
		if (char === '{' && !isEscaped(latex, position)) {
			const endIdx = findMatchingBrace(latex, position);
			if (endIdx !== -1) {
				const raw = latex.substring(position, endIdx + 1);
				const content = latex.substring(position + 1, endIdx);
				tokens.push({
					type: 'group',
					raw,
					start: position,
					end: endIdx + 1,
					line,
					column,
					content
				} as GroupToken);
				const newlines = countNewlines(raw);
				position = endIdx + 1;
				line += newlines;
				column = newlines > 0 ? getColumnAfterNewlines(latex, endIdx + 1) : column + raw.length;
				continue;
			}
		}

		// Handle whitespace
		if (/\s/.test(char) && char !== '\n') {
			const startPos = position;
			while (position < latex.length && /\s/.test(latex[position]) && latex[position] !== '\n') {
				position++;
				column++;
			}
			const content = latex.substring(startPos, position);
			tokens.push({
				type: 'whitespace',
				raw: content,
				start: startPos,
				end: position,
				line,
				column: startColumn,
				content,
				isSignificant: content.includes('~')
			} as WhitespaceToken);
			continue;
		}

		// Handle plain text
		const textResult = extractText(latex, position, line, column);
		if (textResult) {
			tokens.push(textResult.token);
			position = textResult.endIndex;
			column += textResult.token.raw.length;
		} else {
			// Single character as text
			tokens.push({
				type: 'text',
				raw: char,
				start: position,
				end: position + 1,
				line,
				column,
				content: char
			} as TextToken);
			position++;
			column++;
		}
	}

	return tokens;
}

/**
 * Find the index of the matching closing brace for an opening brace.
 * Handles nested braces correctly.
 * @param text - The text to search
 * @param start - Index of the opening brace
 * @returns Index of the matching closing brace, or -1 if not found
 */
export function findMatchingBrace(text: string, start: number): number {
	if (text[start] !== '{') return -1;

	let depth = 1;
	let position = start + 1;

	while (position < text.length && depth > 0) {
		// Skip escaped characters
		if (text[position] === '\\' && position + 1 < text.length) {
			position += 2;
			continue;
		}

		if (text[position] === '{') {
			depth++;
		} else if (text[position] === '}') {
			depth--;
		}

		if (depth === 0) {
			return position;
		}

		position++;
	}

	return -1; // Unmatched brace
}

/**
 * Find the index of the matching closing bracket for an opening bracket.
 * @param text - The text to search
 * @param start - Index of the opening bracket
 * @returns Index of the matching closing bracket, or -1 if not found
 */
export function findMatchingBracket(text: string, start: number): number {
	if (text[start] !== '[') return -1;

	let depth = 1;
	let position = start + 1;

	while (position < text.length && depth > 0) {
		// Skip escaped characters
		if (text[position] === '\\' && position + 1 < text.length) {
			position += 2;
			continue;
		}

		if (text[position] === '[') {
			depth++;
		} else if (text[position] === ']') {
			depth--;
		}

		if (depth === 0) {
			return position;
		}

		position++;
	}

	return -1; // Unmatched bracket
}

/**
 * Extract an environment (from \begin to \end).
 * @param text - The text to search
 * @param start - Index of the '\begin'
 * @returns The environment token and the end index, or null if not found
 */
export function extractEnvironment(
	text: string,
	start: number,
	line: number
): { token: EnvironmentToken; endIndex: number } | null {
	if (text.substring(start, start + 6) !== '\\begin') {
		return null;
	}

	let position = start + 6;
	const column = getColumnNumber(text, start);

	// Skip whitespace
	while (position < text.length && /\s/.test(text[position]) && text[position] !== '\n') {
		position++;
	}

	// Extract environment name
	if (text[position] !== '{') {
		return null;
	}

	const nameEnd = findMatchingBrace(text, position);
	if (nameEnd === -1) {
		return null;
	}

	const envName = text.substring(position + 1, nameEnd);
	position = nameEnd + 1;

	// Check for optional arguments
	let options: string | undefined;
	if (position < text.length && text[position] === '[') {
		const optEnd = findMatchingBracket(text, position);
		if (optEnd !== -1) {
			options = text.substring(position + 1, optEnd);
			position = optEnd + 1;
		}
	}

	// Find matching \end{envName}
	const endPattern = `\\end{${envName}}`;
	let depth = 1;
	let contentEnd = position;

	// For verbatim environments, don't parse nested environments
	const isVerbatim = ['verbatim', 'lstlisting', 'minted', 'Verbatim'].includes(envName);

	if (isVerbatim) {
		// For verbatim environments, find the literal end pattern
		const endIdx = text.indexOf(endPattern, position);
		if (endIdx === -1) {
			return null;
		}
		contentEnd = endIdx;
	} else {
		// For normal environments, handle nesting
		while (contentEnd < text.length && depth > 0) {
			// Check for nested \begin{envName}
			if (
				text.substring(contentEnd, contentEnd + 6) === '\\begin' &&
				text
					.substring(contentEnd + 6)
					.trim()
					.startsWith(`{${envName}`)
			) {
				depth++;
				contentEnd += 6;
			} else if (text.substring(contentEnd, contentEnd + endPattern.length) === endPattern) {
				depth--;
				if (depth === 0) {
					break;
				}
				contentEnd += endPattern.length;
			} else {
				contentEnd++;
			}
		}

		if (depth > 0) {
			return null; // Unmatched environment
		}
	}

	const content = text.substring(position, contentEnd);
	const endIndex = contentEnd + endPattern.length;
	const raw = text.substring(start, endIndex);

	return {
		token: {
			type: 'environment',
			raw,
			start,
			end: endIndex,
			line,
			column,
			name: envName,
			options,
			content,
			depth: 0
		},
		endIndex
	};
}

/**
 * Extract inline math ($...$).
 * Must handle escaped \$ correctly.
 * @param text - The text to search
 * @param start - Index of the opening $
 * @returns The math token and end index, or null if not valid math
 */
export function extractInlineMath(
	text: string,
	start: number,
	line: number
): { token: MathInlineToken; endIndex: number } | null {
	if (text[start] !== '$' || isEscaped(text, start)) {
		return null;
	}

	// Don't treat $$ as inline math
	if (start + 1 < text.length && text[start + 1] === '$') {
		return null;
	}

	let position = start + 1;
	const column = getColumnNumber(text, start);

	// Find closing $
	while (position < text.length) {
		if (text[position] === '$' && !isEscaped(text, position)) {
			const raw = text.substring(start, position + 1);
			const mathContent = text.substring(start + 1, position);

			return {
				token: {
					type: 'math-inline',
					raw,
					start,
					end: position + 1,
					line,
					column,
					latex: mathContent
				},
				endIndex: position + 1
			};
		}
		position++;
	}

	return null; // Unclosed math
}

/**
 * Extract display math (\[...\] or $$...$$).
 * @param text - The text to search
 * @param start - Index of the opening delimiter
 * @returns The math token and end index, or null if not found
 */
export function extractDisplayMath(
	text: string,
	start: number,
	line: number
): { token: MathDisplayToken; endIndex: number } | null {
	const column = getColumnNumber(text, start);

	// Check for $$...$$
	if (text[start] === '$' && start + 1 < text.length && text[start + 1] === '$') {
		let position = start + 2;

		// Find closing $$
		while (position < text.length - 1) {
			if (text[position] === '$' && text[position + 1] === '$' && !isEscaped(text, position)) {
				const raw = text.substring(start, position + 2);
				const mathContent = text.substring(start + 2, position);

				return {
					token: {
						type: 'math-display',
						raw,
						start,
						end: position + 2,
						line,
						column,
						latex: mathContent,
						useBrackets: false
					},
					endIndex: position + 2
				};
			}
			position++;
		}
		return null;
	}

	// Check for \[...\]
	if (text[start] === '\\' && start + 1 < text.length && text[start + 1] === '[') {
		let position = start + 2;

		// Find closing \]
		while (position < text.length - 1) {
			if (text[position] === '\\' && text[position + 1] === ']') {
				const raw = text.substring(start, position + 2);
				const mathContent = text.substring(start + 2, position);

				return {
					token: {
						type: 'math-display',
						raw,
						start,
						end: position + 2,
						line,
						column,
						latex: mathContent,
						useBrackets: true
					},
					endIndex: position + 2
				};
			}
			position++;
		}
		return null;
	}

	return null;
}

/**
 * Extract a LaTeX command (\commandname[options]{arg1}{arg2}).
 * @param text - The text to search
 * @param start - Index of the backslash
 * @returns The command token and end index, or null if not a valid command
 */
export function extractCommand(
	text: string,
	start: number,
	line: number
): { token: CommandToken; endIndex: number } | null {
	if (text[start] !== '\\') {
		return null;
	}

	let position = start + 1;
	const column = getColumnNumber(text, start);

	// Special case: escaped characters like \$, \%, etc.
	if (position < text.length && isEscapeChar(text[position])) {
		const char = text[position];
		return {
			token: {
				type: 'command',
				raw: '\\' + char,
				start,
				end: position + 1,
				line,
				column,
				name: char,
				args: []
			},
			endIndex: position + 1
		};
	}

	// Extract command name (letters only)
	const nameStart = position;
	while (position < text.length && /[a-zA-Z]/.test(text[position])) {
		position++;
	}

	// Handle star variant (e.g., \section*)
	if (position < text.length && text[position] === '*') {
		position++;
	}

	const commandName = text.substring(nameStart, position);

	// If no command name found (e.g., \\), treat as special
	if (commandName.length === 0) {
		if (position < text.length && text[position] === '\\') {
			// This is \\, a line break
			return {
				token: {
					type: 'command',
					raw: '\\\\',
					start,
					end: start + 2,
					line,
					column,
					name: '\\',
					args: []
				},
				endIndex: start + 2
			};
		}
		return null;
	}

	// For commands without arguments, consume a single trailing space if it exists
	// This matches LaTeX behavior where \LaTeX followed by space produces "LaTeX" without the space
	if (position < text.length && text[position] === ' ') {
		position++;
	}

	// Skip additional whitespace only if we're looking for arguments
	while (position < text.length && /\s/.test(text[position]) && text[position] !== '\n') {
		position++;
	}

	// Extract optional arguments [...]
	const options: string[] = [];
	while (position < text.length && text[position] === '[') {
		const optEnd = findMatchingBracket(text, position);
		if (optEnd === -1) {
			break;
		}
		options.push(text.substring(position + 1, optEnd));
		position = optEnd + 1;

		// Skip whitespace after option
		while (position < text.length && /\s/.test(text[position]) && text[position] !== '\n') {
			position++;
		}
	}

	// Extract required arguments {...}
	const args: string[] = [];
	while (position < text.length && text[position] === '{') {
		const argEnd = findMatchingBrace(text, position);
		if (argEnd === -1) {
			break;
		}
		args.push(text.substring(position + 1, argEnd));
		position = argEnd + 1;

		// Skip whitespace after argument
		while (position < text.length && /\s/.test(text[position]) && text[position] !== '\n') {
			position++;
		}
	}

	const raw = text.substring(start, position);

	return {
		token: {
			type: 'command',
			raw,
			start,
			end: position,
			line,
			column,
			name: commandName,
			options: options.length > 0 ? options : undefined,
			args
		},
		endIndex: position
	};
}

/**
 * Get the current line number at a position in the text.
 * @param text - The full text
 * @param position - The position to check
 * @returns The 1-indexed line number
 */
export function getLineNumber(text: string, position: number): number {
	let line = 1;
	for (let i = 0; i < position && i < text.length; i++) {
		if (text[i] === '\n') {
			line++;
		}
	}
	return line;
}

// Helper functions

/**
 * Check if a character is escaped (preceded by backslash).
 */
function isEscaped(text: string, position: number): boolean {
	if (position === 0) return false;

	// Count consecutive backslashes before this position
	let backslashCount = 0;
	let checkPos = position - 1;

	while (checkPos >= 0 && text[checkPos] === '\\') {
		backslashCount++;
		checkPos--;
	}

	// If odd number of backslashes, the character is escaped
	return backslashCount % 2 === 1;
}

/**
 * Check if a character is a special character in LaTeX.
 */
function isSpecialChar(char: string): boolean {
	return ['&', '~', '#', '_', '^'].includes(char);
}

/**
 * Check if a character can be escaped with backslash.
 */
function isEscapeChar(char: string): boolean {
	return ['$', '%', '&', '#', '_', '{', '}', '~', '^', '\\'].includes(char);
}

/**
 * Get the meaning of a special character in LaTeX context.
 */
function getSpecialCharMeaning(char: string): string | undefined {
	const meanings: Record<string, string> = {
		'&': 'alignment',
		'#': 'parameter',
		_: 'subscript',
		'^': 'superscript',
		'~': 'escape'
	};
	return meanings[char];
}

/**
 * Extract a comment from the text.
 */
function extractComment(
	text: string,
	start: number,
	line: number,
	column: number
): { token: CommentToken; endIndex: number } | null {
	if (text[start] !== '%') return null;

	let position = start + 1;

	// Find end of line
	while (position < text.length && text[position] !== '\n') {
		position++;
	}

	const raw = text.substring(start, position);
	const content = text.substring(start + 1, position);

	return {
		token: {
			type: 'comment',
			raw,
			start,
			end: position,
			line,
			column,
			content,
			isSpecial: content.trim().startsWith('TODO:') || content.trim().startsWith('FIXME:')
		},
		endIndex: position
	};
}

/**
 * Extract plain text until the next special character or command.
 */
function extractText(
	text: string,
	start: number,
	line: number,
	column: number
): { token: TextToken; endIndex: number } | null {
	let position = start;
	let content = '';

	while (position < text.length) {
		const char = text[position];

		// Stop at special characters or commands
		if (
			char === '\\' ||
			char === '$' ||
			char === '%' ||
			char === '{' ||
			char === '}' ||
			char === '&' ||
			char === '#' ||
			char === '_' ||
			char === '^' ||
			char === '~' ||
			char === '\n' ||
			char === '\r' ||
			/\s/.test(char)
		) {
			break;
		}

		content += char;
		position++;
	}

	if (content.length === 0) {
		return null;
	}

	return {
		token: {
			type: 'text',
			raw: content,
			start,
			end: position,
			line,
			column,
			content
		},
		endIndex: position
	};
}

/**
 * Count newlines in a string.
 */
function countNewlines(text: string): number {
	let count = 0;
	for (const char of text) {
		if (char === '\n') {
			count++;
		}
	}
	return count;
}

/**
 * Get column number at a position.
 */
function getColumnNumber(text: string, position: number): number {
	let column = 1;
	for (let i = position - 1; i >= 0; i--) {
		if (text[i] === '\n') {
			break;
		}
		column++;
	}
	return column;
}

/**
 * Get column number after newlines.
 */
function getColumnAfterNewlines(text: string, position: number): number {
	// Count characters from the last newline before position
	let column = 1;
	for (let i = position - 1; i >= 0; i--) {
		if (text[i] === '\n') {
			break;
		}
		column++;
	}
	return column;
}
