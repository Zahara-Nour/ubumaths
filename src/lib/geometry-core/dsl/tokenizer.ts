/**
 * Tokenizer for the geometry DSL.
 *
 * Produces tokens from a script string, including Python-like
 * INDENT/DEDENT tokens based on indentation levels.
 *
 * Each token carries absolute start/end offsets in the original source so
 * downstream consumers (interpreter, source-utils) can extract the raw
 * source slice for any expression — used to route math-pure expressions to
 * mathAST's parseCustom().
 */

import type { Token, TokenType } from './tokens';
import { isKeyword } from './keywords';

export class DslTokenizerError extends Error {
	constructor(
		message: string,
		readonly line: number,
		readonly col: number
	) {
		super(`Ligne ${line}, colonne ${col} : ${message}`);
	}
}

/**
 * Whitelist of allowed backslash identifiers in the DSL.
 *
 * `\pi` is special — it tokenizes to value `\pi` (with backslash) and is treated
 * as the math constant π via `RESERVED_NAMES` in the interpreter.
 *
 * All other lowercase Greek letters (`\theta`, `\alpha`, `\phi`, …) are
 * tokenized as IDENTIFIER with value stripped of the backslash (`theta`,
 * `alpha`, …). This makes `\phi = 1.618` and `phi = 1.618` interchangeable —
 * both assign to the same symbol-table key.
 */
import { SUPPORTED_GREEK_LETTERS } from '$lib/mathAST/parser/constants';
const BACKSLASH_WHITELIST = SUPPORTED_GREEK_LETTERS;

export function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	const lines = source.split('\n');
	const indentStack: number[] = [0];
	let lineNum = 0;
	// Cumulative offset of the current line's first character in `source`.
	let lineOffset = 0;

	for (const rawLine of lines) {
		lineNum++;

		// Skip empty lines and comment-only lines (after stripping comment + trailing space)
		const trimmed = rawLine.replace(/#.*$/, '').trimEnd();
		if (trimmed.length === 0) {
			lineOffset += rawLine.length + 1; // +1 for the '\n' separator
			continue;
		}

		// Compute indentation (number of leading spaces)
		const indent = countLeadingSpaces(rawLine);
		const contentStart = indent;

		// Emit INDENT/DEDENT tokens (zero-width, anchored at the indent column).
		const currentIndent = indentStack[indentStack.length - 1];
		if (indent > currentIndent) {
			indentStack.push(indent);
			tokens.push({
				type: 'INDENT',
				value: '',
				line: lineNum,
				col: 1,
				start: lineOffset + indent,
				end: lineOffset + indent
			});
		} else if (indent < currentIndent) {
			while (indentStack.length > 1 && indentStack[indentStack.length - 1] > indent) {
				indentStack.pop();
				tokens.push({
					type: 'DEDENT',
					value: '',
					line: lineNum,
					col: 1,
					start: lineOffset + indent,
					end: lineOffset + indent
				});
			}
			if (indentStack[indentStack.length - 1] !== indent) {
				throw new DslTokenizerError('Indentation inconsistante', lineNum, 1);
			}
		}

		// Tokenize the line content
		tokenizeLine(trimmed, contentStart, lineNum, lineOffset, tokens);

		// End of line: NEWLINE positioned at the trimmed-content end.
		const newlinePos = lineOffset + trimmed.length;
		tokens.push({
			type: 'NEWLINE',
			value: '\n',
			line: lineNum,
			col: trimmed.length + 1,
			start: newlinePos,
			end: newlinePos
		});

		lineOffset += rawLine.length + 1; // advance past the '\n' separator
	}

	// Close remaining indentation levels (zero-width, end-of-source position)
	while (indentStack.length > 1) {
		indentStack.pop();
		tokens.push({
			type: 'DEDENT',
			value: '',
			line: lineNum,
			col: 1,
			start: source.length,
			end: source.length
		});
	}

	tokens.push({
		type: 'EOF',
		value: '',
		line: lineNum + 1,
		col: 1,
		start: source.length,
		end: source.length
	});
	return tokens;
}

function countLeadingSpaces(line: string): number {
	let count = 0;
	for (const ch of line) {
		if (ch === ' ') count++;
		else if (ch === '\t') count += 4;
		else break;
	}
	return count;
}

function tokenizeLine(
	line: string,
	startCol: number,
	lineNum: number,
	lineOffset: number,
	tokens: Token[]
): void {
	let pos = startCol; // skip indentation already handled

	// Skip leading whitespace in the trimmed line
	while (pos < line.length && line[pos] === ' ') pos++;

	while (pos < line.length) {
		const ch = line[pos];
		const col = pos + 1;
		const absStart = lineOffset + pos;

		// Skip whitespace
		if (ch === ' ' || ch === '\t') {
			pos++;
			continue;
		}

		// Comment (should already be stripped, but just in case)
		if (ch === '#') break;

		// @ directive
		if (ch === '@') {
			pos++; // skip @
			if (pos >= line.length || !isIdentStart(line[pos])) {
				throw new DslTokenizerError("Identifiant attendu apres '@'", lineNum, col);
			}
			const start = pos;
			while (pos < line.length && isIdentPart(line[pos])) pos++;
			tokens.push({
				type: 'AT_DIRECTIVE',
				value: line.slice(start, pos),
				line: lineNum,
				col,
				start: absStart,
				end: lineOffset + pos
			});
			continue;
		}

		// Backslash identifier (e.g. \pi). V1 only allows whitelisted names.
		if (ch === '\\') {
			pos++; // skip backslash
			if (pos >= line.length || !isIdentStart(line[pos])) {
				throw new DslTokenizerError(
					'Sequence "\\" inconnue : un nom de constante doit suivre',
					lineNum,
					col
				);
			}
			const nameStart = pos;
			while (pos < line.length && isIdentPart(line[pos])) pos++;
			const name = line.slice(nameStart, pos);
			if (!BACKSLASH_WHITELIST.has(name)) {
				throw new DslTokenizerError(
					`Sequence "\\${name}" inconnue (lettres grecques minuscules supportees : \\alpha, \\beta, …, \\omega)`,
					lineNum,
					col
				);
			}
			// `\pi` keeps its backslash (treated as math constant by the interpreter).
			// All other Greek letters are normalized to ASCII so `\theta = 1` and
			// `theta = 1` are interchangeable (same symbol-table key).
			const tokenValue = name === 'pi' ? '\\' + name : name;
			tokens.push({
				type: 'IDENTIFIER',
				value: tokenValue,
				line: lineNum,
				col,
				start: absStart,
				end: lineOffset + pos
			});
			continue;
		}

		// String literal
		if (ch === '"') {
			const start = pos;
			pos++; // skip opening quote
			while (pos < line.length && line[pos] !== '"') pos++;
			if (pos >= line.length) {
				throw new DslTokenizerError('Chaine non fermee', lineNum, col);
			}
			pos++; // skip closing quote
			tokens.push({
				type: 'STRING',
				value: line.slice(start + 1, pos - 1),
				line: lineNum,
				col,
				start: absStart,
				end: lineOffset + pos
			});
			continue;
		}

		// Number
		if (isDigit(ch)) {
			const start = pos;
			while (pos < line.length && isDigit(line[pos])) pos++;
			if (pos < line.length && line[pos] === '.') {
				pos++;
				while (pos < line.length && isDigit(line[pos])) pos++;
			}
			tokens.push({
				type: 'NUMBER',
				value: line.slice(start, pos),
				line: lineNum,
				col,
				start: absStart,
				end: lineOffset + pos
			});
			continue;
		}

		// Identifier or keyword
		if (isIdentStart(ch)) {
			const start = pos;
			while (pos < line.length && isIdentPart(line[pos])) pos++;
			const word = line.slice(start, pos);
			const type: TokenType = isKeyword(word) ? 'KEYWORD' : 'IDENTIFIER';
			tokens.push({
				type,
				value: word,
				line: lineNum,
				col,
				start: absStart,
				end: lineOffset + pos
			});
			continue;
		}

		// Two-character operators
		if (pos + 1 < line.length) {
			const two = line.slice(pos, pos + 2);
			const twoType = TWO_CHAR_OPS[two];
			if (twoType) {
				tokens.push({
					type: twoType,
					value: two,
					line: lineNum,
					col,
					start: absStart,
					end: lineOffset + pos + 2
				});
				pos += 2;
				continue;
			}
		}

		// Single-character operators/punctuation
		const oneType = ONE_CHAR_OPS[ch];
		if (oneType) {
			tokens.push({
				type: oneType,
				value: ch,
				line: lineNum,
				col,
				start: absStart,
				end: lineOffset + pos + 1
			});
			pos++;
			continue;
		}

		throw new DslTokenizerError(`Caractere inattendu : '${ch}'`, lineNum, col);
	}
}

function isDigit(ch: string): boolean {
	return ch >= '0' && ch <= '9';
}

function isIdentStart(ch: string): boolean {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentPart(ch: string): boolean {
	return isIdentStart(ch) || isDigit(ch);
}

const TWO_CHAR_OPS: Record<string, TokenType> = {
	'==': 'DOUBLE_EQUALS',
	'!=': 'NOT_EQUALS',
	'<=': 'LESS_EQUALS',
	'>=': 'GREATER_EQUALS'
};

const ONE_CHAR_OPS: Record<string, TokenType> = {
	'+': 'PLUS',
	'-': 'MINUS',
	'*': 'STAR',
	'/': 'SLASH',
	'%': 'PERCENT',
	'^': 'CARET',
	'=': 'EQUALS',
	'<': 'LESS',
	'>': 'GREATER',
	'(': 'LPAREN',
	')': 'RPAREN',
	'[': 'LBRACKET',
	']': 'RBRACKET',
	':': 'COLON',
	',': 'COMMA',
	'.': 'DOT'
};
