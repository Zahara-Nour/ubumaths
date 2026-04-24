/**
 * Tokenizer for the geometry DSL.
 *
 * Produces tokens from a script string, including Python-like
 * INDENT/DEDENT tokens based on indentation levels.
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

export function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	const lines = source.split('\n');
	const indentStack: number[] = [0];
	let lineNum = 0;

	for (const rawLine of lines) {
		lineNum++;

		// Skip empty lines and comment-only lines
		const trimmed = rawLine.replace(/#.*$/, '').trimEnd();
		if (trimmed.length === 0) continue;

		// Compute indentation (number of leading spaces)
		const indent = countLeadingSpaces(rawLine);
		const contentStart = indent;

		// Emit INDENT/DEDENT tokens
		const currentIndent = indentStack[indentStack.length - 1];
		if (indent > currentIndent) {
			indentStack.push(indent);
			tokens.push({ type: 'INDENT', value: '', line: lineNum, col: 1 });
		} else if (indent < currentIndent) {
			while (indentStack.length > 1 && indentStack[indentStack.length - 1] > indent) {
				indentStack.pop();
				tokens.push({ type: 'DEDENT', value: '', line: lineNum, col: 1 });
			}
			if (indentStack[indentStack.length - 1] !== indent) {
				throw new DslTokenizerError('Indentation inconsistante', lineNum, 1);
			}
		}

		// Tokenize the line content
		tokenizeLine(trimmed, contentStart, lineNum, tokens);

		// End of line
		tokens.push({ type: 'NEWLINE', value: '\n', line: lineNum, col: trimmed.length + 1 });
	}

	// Close remaining indentation levels
	while (indentStack.length > 1) {
		indentStack.pop();
		tokens.push({ type: 'DEDENT', value: '', line: lineNum, col: 1 });
	}

	tokens.push({ type: 'EOF', value: '', line: lineNum + 1, col: 1 });
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

function tokenizeLine(line: string, startCol: number, lineNum: number, tokens: Token[]): void {
	let pos = startCol; // skip indentation already handled

	// Skip leading whitespace in the trimmed line
	while (pos < line.length && line[pos] === ' ') pos++;

	while (pos < line.length) {
		const ch = line[pos];
		const col = pos + 1;

		// Skip whitespace
		if (ch === ' ' || ch === '\t') {
			pos++;
			continue;
		}

		// Comment (should already be stripped, but just in case)
		if (ch === '#') break;

		// String literal
		if (ch === '"') {
			const start = pos;
			pos++; // skip opening quote
			while (pos < line.length && line[pos] !== '"') pos++;
			if (pos >= line.length) {
				throw new DslTokenizerError('Chaine non fermee', lineNum, col);
			}
			pos++; // skip closing quote
			tokens.push({ type: 'STRING', value: line.slice(start + 1, pos - 1), line: lineNum, col });
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
			tokens.push({ type: 'NUMBER', value: line.slice(start, pos), line: lineNum, col });
			continue;
		}

		// Identifier or keyword
		if (isIdentStart(ch)) {
			const start = pos;
			while (pos < line.length && isIdentPart(line[pos])) pos++;
			const word = line.slice(start, pos);
			const type: TokenType = isKeyword(word) ? 'KEYWORD' : 'IDENTIFIER';
			tokens.push({ type, value: word, line: lineNum, col });
			continue;
		}

		// Two-character operators
		if (pos + 1 < line.length) {
			const two = line.slice(pos, pos + 2);
			const twoType = TWO_CHAR_OPS[two];
			if (twoType) {
				tokens.push({ type: twoType, value: two, line: lineNum, col });
				pos += 2;
				continue;
			}
		}

		// Single-character operators/punctuation
		const oneType = ONE_CHAR_OPS[ch];
		if (oneType) {
			tokens.push({ type: oneType, value: ch, line: lineNum, col });
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
