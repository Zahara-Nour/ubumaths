/**
 * Recursive descent parser for the geometry DSL.
 *
 * Transforms a token stream into an AST (DslProgram).
 * Handles operator precedence, named arguments, indexed names,
 * macro/for/if blocks with indentation.
 */

import type { Token, TokenType } from './tokens';
import { tokenize } from './tokenizer';
import { DslParseError } from './errors';
import type { DslProgram, DslStatement, DslExpr, DslParam, DslFunctionCallExpr } from './types';

export function parse(source: string): DslProgram {
	const tokens = tokenize(source);
	const parser = new Parser(tokens);
	return parser.parseProgram();
}

class Parser {
	private pos = 0;

	constructor(private tokens: Token[]) {}

	// ─── Helpers ──────────────────────────────────────────────

	private peek(): Token {
		return this.tokens[this.pos];
	}

	private advance(): Token {
		const t = this.tokens[this.pos];
		this.pos++;
		return t;
	}

	private expect(type: TokenType, context?: string): Token {
		const t = this.peek();
		if (t.type !== type) {
			const ctx = context ? ` (${context})` : '';
			throw new DslParseError(`Attendu ${type}, recu ${t.type} '${t.value}'${ctx}`, t.line, t.col);
		}
		return this.advance();
	}

	private match(type: TokenType): boolean {
		if (this.peek().type === type) {
			this.advance();
			return true;
		}
		return false;
	}

	private matchKeyword(value: string): boolean {
		const t = this.peek();
		if (t.type === 'KEYWORD' && t.value === value) {
			this.advance();
			return true;
		}
		return false;
	}

	private isKeyword(value: string): boolean {
		const t = this.peek();
		return t.type === 'KEYWORD' && t.value === value;
	}

	private isIdentifierWithValue(value: string): boolean {
		const t = this.peek();
		return t.type === 'IDENTIFIER' && t.value === value;
	}

	private skipNewlines(): void {
		while (this.peek().type === 'NEWLINE') this.advance();
	}

	// ─── Program ──────────────────────────────────────────────

	parseProgram(): DslProgram {
		this.skipNewlines();
		const statements = this.parseBlock(false);
		this.expect('EOF');
		return { kind: 'program', statements };
	}

	private parseBlock(indented: boolean): DslStatement[] {
		const stmts: DslStatement[] = [];
		if (indented) {
			this.expect('INDENT', 'debut de bloc');
		}
		this.skipNewlines();

		while (
			this.peek().type !== 'EOF' &&
			this.peek().type !== 'DEDENT' &&
			!(indented === false && this.peek().type === 'DEDENT')
		) {
			stmts.push(this.parseStatement());
			this.skipNewlines();
		}

		if (indented) {
			this.expect('DEDENT', 'fin de bloc');
		}
		return stmts;
	}

	// ─── Statement ────────────────────────────────────────────

	private parseStatement(): DslStatement {
		const t = this.peek();

		// macro name(params):
		if (this.isKeyword('macro')) return this.parseMacroDef();

		// pour i de a a b:
		if (this.isKeyword('pour')) return this.parseFor();

		// si condition:
		if (this.isKeyword('si')) return this.parseIf();

		// retourne expr
		if (this.isKeyword('retourne')) return this.parseReturn();

		// sinon: handled by parseIf, should not appear standalone
		if (this.isKeyword('sinon')) {
			throw new DslParseError("'sinon' sans 'si' correspondant", t.line, t.col);
		}

		// Assignment or expression statement
		return this.parseAssignmentOrExpr();
	}

	private parseAssignmentOrExpr(): DslStatement {
		const t = this.peek();
		const line = t.line;

		// Check for destructuring: (A, B) = ...
		if (t.type === 'LPAREN') {
			const saved = this.pos;
			const result = this.tryParseDestructuring();
			if (result) return result;
			this.pos = saved;
		}

		// Check for: IDENTIFIER = ... or IDENTIFIER[expr] = ...
		if (t.type === 'IDENTIFIER') {
			const saved = this.pos;
			const name = this.advance().value;

			// Indexed assignment: P[i] = ...
			if (this.peek().type === 'LBRACKET') {
				this.advance(); // [
				const index = this.parseExpr();
				this.expect('RBRACKET', 'index');
				if (this.peek().type === 'EQUALS') {
					this.advance(); // =
					const value = this.parseExpr();
					this.expectNewline();
					return { kind: 'indexedAssignment', name, index, value, line };
				}
				// Not an assignment — backtrack
				this.pos = saved;
			}
			// Simple assignment: A = ...
			else if (this.peek().type === 'EQUALS') {
				this.advance(); // =
				const value = this.parseExpr();
				this.expectNewline();
				return { kind: 'assignment', name, value, line };
			}
			// Not an assignment — backtrack
			else {
				this.pos = saved;
			}
		}

		// Expression statement (function call without assignment)
		const expr = this.parseExpr();
		this.expectNewline();
		return { kind: 'exprStatement', expr, line };
	}

	private tryParseDestructuring(): DslStatement | null {
		const line = this.peek().line;
		this.advance(); // (
		const names: string[] = [];

		if (this.peek().type !== 'IDENTIFIER') return null;
		names.push(this.advance().value);

		while (this.peek().type === 'COMMA') {
			this.advance();
			if (this.peek().type !== 'IDENTIFIER') return null;
			names.push(this.advance().value);
		}

		if (this.peek().type !== 'RPAREN') return null;
		this.advance(); // )

		if (this.peek().type !== 'EQUALS') return null;
		this.advance(); // =

		const value = this.parseExpr();
		this.expectNewline();
		return { kind: 'destructuring', names, value, line };
	}

	private parseMacroDef(): DslStatement {
		const line = this.peek().line;
		this.advance(); // macro
		const name = this.expect('IDENTIFIER', 'nom de macro').value;
		this.expect('LPAREN', 'parametres de macro');
		const params = this.parseParams();
		this.expect('RPAREN', 'parametres de macro');
		this.expect('COLON', 'debut du corps de macro');
		this.expectNewline();
		const body = this.parseBlock(true);
		return { kind: 'macroDef', name, params, body, line };
	}

	private parseParams(): DslParam[] {
		const params: DslParam[] = [];
		if (this.peek().type === 'RPAREN') return params;

		params.push(this.parseParam());
		while (this.peek().type === 'COMMA') {
			this.advance();
			params.push(this.parseParam());
		}
		return params;
	}

	private parseParam(): DslParam {
		const name = this.expect('IDENTIFIER', 'parametre').value;
		if (this.peek().type === 'EQUALS') {
			this.advance();
			const defaultValue = this.parseExpr();
			return { name, defaultValue };
		}
		return { name };
	}

	private parseFor(): DslStatement {
		const line = this.peek().line;
		this.advance(); // pour
		const variable = this.expect('IDENTIFIER', 'variable de boucle').value;

		if (this.isIdentifierWithValue('de')) {
			// pour i de X a Y:
			this.advance(); // de
			const from = this.parseExpr();
			if (!this.isIdentifierWithValue('a')) {
				throw new DslParseError(
					"Attendu 'a' apres l'expression de debut",
					this.peek().line,
					this.peek().col
				);
			}
			this.advance(); // a
			const to = this.parseExpr();
			this.expect('COLON', 'debut du corps de boucle');
			this.expectNewline();
			const body = this.parseBlock(true);
			return { kind: 'forRange', variable, from, to, body, line };
		} else if (this.isKeyword('dans')) {
			// pour x dans liste:
			this.advance(); // dans
			const iterable = this.parseExpr();
			this.expect('COLON', 'debut du corps de boucle');
			this.expectNewline();
			const body = this.parseBlock(true);
			return { kind: 'forIn', variable, iterable, body, line };
		}

		throw new DslParseError(
			"Attendu 'de' ou 'dans' apres la variable de boucle",
			this.peek().line,
			this.peek().col
		);
	}

	private parseIf(): DslStatement {
		const line = this.peek().line;
		this.advance(); // si
		const condition = this.parseExpr();
		this.expect('COLON', 'debut du bloc si');
		this.expectNewline();
		const body = this.parseBlock(true);

		let elseBody: DslStatement[] | undefined;
		this.skipNewlines();
		if (this.isKeyword('sinon')) {
			this.advance(); // sinon
			this.expect('COLON', 'debut du bloc sinon');
			this.expectNewline();
			elseBody = this.parseBlock(true);
		}

		return { kind: 'if', condition, body, elseBody, line };
	}

	private parseReturn(): DslStatement {
		const line = this.peek().line;
		this.advance(); // retourne
		const value = this.parseExpr();
		this.expectNewline();
		return { kind: 'return', value, line };
	}

	private expectNewline(): void {
		const t = this.peek();
		if (t.type !== 'NEWLINE' && t.type !== 'EOF' && t.type !== 'DEDENT') {
			throw new DslParseError(`Attendu fin de ligne, recu ${t.type} '${t.value}'`, t.line, t.col);
		}
		if (t.type === 'NEWLINE') this.advance();
	}

	// ─── Expressions (precedence climbing) ────────────────────

	private parseExpr(): DslExpr {
		return this.parseOr();
	}

	private parseOr(): DslExpr {
		let left = this.parseAnd();
		while (this.isKeyword('ou')) {
			const line = this.peek().line;
			this.advance();
			const right = this.parseAnd();
			left = { kind: 'binary', op: 'ou', left, right, line };
		}
		return left;
	}

	private parseAnd(): DslExpr {
		let left = this.parseNot();
		while (this.isKeyword('et')) {
			const line = this.peek().line;
			this.advance();
			const right = this.parseNot();
			left = { kind: 'binary', op: 'et', left, right, line };
		}
		return left;
	}

	private parseNot(): DslExpr {
		if (this.isKeyword('non')) {
			const line = this.peek().line;
			this.advance();
			const operand = this.parseNot();
			return { kind: 'unary', op: 'non', operand, line };
		}
		return this.parseComparison();
	}

	private parseComparison(): DslExpr {
		let left = this.parseAddSub();
		const t = this.peek();
		if (
			t.type === 'DOUBLE_EQUALS' ||
			t.type === 'NOT_EQUALS' ||
			t.type === 'LESS' ||
			t.type === 'GREATER' ||
			t.type === 'LESS_EQUALS' ||
			t.type === 'GREATER_EQUALS'
		) {
			const line = t.line;
			const op = this.advance().value as '==' | '!=' | '<' | '>' | '<=' | '>=';
			const right = this.parseAddSub();
			left = { kind: 'binary', op, left, right, line };
		}
		return left;
	}

	private parseAddSub(): DslExpr {
		let left = this.parseMulDiv();
		while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
			const line = this.peek().line;
			const op = this.advance().value as '+' | '-';
			const right = this.parseMulDiv();
			left = { kind: 'binary', op, left, right, line };
		}
		return left;
	}

	private parseMulDiv(): DslExpr {
		let left = this.parseUnary();
		while (
			this.peek().type === 'STAR' ||
			this.peek().type === 'SLASH' ||
			this.peek().type === 'PERCENT'
		) {
			const line = this.peek().line;
			const op = this.advance().value as '*' | '/' | '%';
			const right = this.parseUnary();
			left = { kind: 'binary', op, left, right, line };
		}
		return left;
	}

	private parseUnary(): DslExpr {
		if (this.peek().type === 'MINUS') {
			const line = this.peek().line;
			this.advance();
			const operand = this.parseUnary();
			return { kind: 'unary', op: '-', operand, line };
		}
		return this.parsePower();
	}

	private parsePower(): DslExpr {
		let left = this.parsePostfix();
		if (this.peek().type === 'CARET') {
			const line = this.peek().line;
			this.advance();
			const right = this.parseUnary(); // right-associative
			left = { kind: 'binary', op: '^', left, right, line };
		}
		return left;
	}

	private parsePostfix(): DslExpr {
		let expr = this.parsePrimary();

		while (true) {
			if (this.peek().type === 'LBRACKET') {
				// Indexing: expr[index]
				this.advance();
				const index = this.parseExpr();
				this.expect('RBRACKET', 'index');
				expr = {
					kind: 'indexedAccess',
					name: (expr as { name: string }).name ?? '',
					index,
					line: expr.line
				};
			} else if (this.peek().type === 'DOT') {
				// Property access: A.x
				this.advance();
				const prop = this.expect('IDENTIFIER', 'propriete').value;
				expr = {
					kind: 'propertyAccess',
					object: (expr as { name: string }).name ?? '',
					property: prop,
					line: expr.line
				};
			} else if (this.peek().type === 'LPAREN' && expr.kind === 'identifier') {
				// Function call: f(args)
				expr = this.parseFunctionCall(expr.name, expr.line);
			} else {
				break;
			}
		}

		return expr;
	}

	private parsePrimary(): DslExpr {
		const t = this.peek();

		// Number literal
		if (t.type === 'NUMBER') {
			this.advance();
			return { kind: 'number', value: parseFloat(t.value), line: t.line };
		}

		// String literal
		if (t.type === 'STRING') {
			this.advance();
			return { kind: 'string', value: t.value, line: t.line };
		}

		// Boolean literals
		if (t.type === 'KEYWORD' && t.value === 'vrai') {
			this.advance();
			return { kind: 'bool', value: true, line: t.line };
		}
		if (t.type === 'KEYWORD' && t.value === 'faux') {
			this.advance();
			return { kind: 'bool', value: false, line: t.line };
		}

		// Keyword used as function name (point, segment, etc.)
		if (t.type === 'KEYWORD' && this.tokens[this.pos + 1]?.type === 'LPAREN') {
			const name = this.advance().value;
			return this.parseFunctionCall(name, t.line);
		}

		// Identifier
		if (t.type === 'IDENTIFIER') {
			this.advance();
			return { kind: 'identifier', name: t.value, line: t.line };
		}

		// Parenthesized expression or tuple
		if (t.type === 'LPAREN') {
			this.advance();
			const first = this.parseExpr();
			if (this.peek().type === 'COMMA') {
				// Tuple
				const elements = [first];
				while (this.peek().type === 'COMMA') {
					this.advance();
					elements.push(this.parseExpr());
				}
				this.expect('RPAREN', 'tuple');
				return { kind: 'tuple', elements, line: t.line };
			}
			this.expect('RPAREN', 'expression parenthesee');
			return first;
		}

		// List literal [a, b, c]
		if (t.type === 'LBRACKET') {
			this.advance();
			const elements: DslExpr[] = [];
			if (this.peek().type !== 'RBRACKET') {
				elements.push(this.parseExpr());
				while (this.peek().type === 'COMMA') {
					this.advance();
					elements.push(this.parseExpr());
				}
			}
			this.expect('RBRACKET', 'liste');
			return { kind: 'list', elements, line: t.line };
		}

		throw new DslParseError(`Expression inattendue : ${t.type} '${t.value}'`, t.line, t.col);
	}

	private parseFunctionCall(name: string, line: number): DslFunctionCallExpr {
		this.expect('LPAREN', 'appel de fonction');
		const args: DslExpr[] = [];
		const namedArgs = new Map<string, DslExpr>();

		if (this.peek().type !== 'RPAREN') {
			this.parseFunctionArg(args, namedArgs);
			while (this.peek().type === 'COMMA') {
				this.advance();
				this.parseFunctionArg(args, namedArgs);
			}
		}

		this.expect('RPAREN', 'appel de fonction');
		return { kind: 'call', name, args, namedArgs, line };
	}

	private parseFunctionArg(args: DslExpr[], namedArgs: Map<string, DslExpr>): void {
		// Check for named argument: name=value
		if (this.peek().type === 'IDENTIFIER' && this.tokens[this.pos + 1]?.type === 'EQUALS') {
			const name = this.advance().value;
			this.advance(); // =
			const value = this.parseExpr();
			namedArgs.set(name, value);
		} else {
			if (namedArgs.size > 0) {
				throw new DslParseError(
					'Les arguments positionnels doivent preceder les arguments nommes',
					this.peek().line,
					this.peek().col
				);
			}
			args.push(this.parseExpr());
		}
	}
}
