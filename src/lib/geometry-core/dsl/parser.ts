/**
 * Recursive descent parser for the geometry DSL.
 *
 * Transforms a token stream into an AST (DslProgram).
 * Handles operator precedence, named arguments, indexed names,
 * macro/for/if blocks with indentation.
 *
 * Each DslExpr produced carries `start`/`end` absolute source offsets
 * (inherited from the underlying tokens). They are populated through the
 * `withPos` helper applied at the end of every parseX method so that any
 * expression — even a deeply-nested binary — knows its source span. This
 * is required by `getRawSource()` to extract the original substring for
 * routing math-pure expressions to mathAST's `parseCustom()`.
 */

import type { Token, TokenType } from './tokens';
import { tokenize } from './tokenizer';
import { DslParseError } from './errors';
import type {
	DslProgram,
	DslStatement,
	DslExpr,
	DslParam,
	DslFunctionCallExpr,
	DslDirective
} from './types';

/**
 * Hard cap on DSL source length. The server-side Zod validation already caps
 * `dsl_script` at 50 000 (constructions) or 100 000 (demo scripts); this
 * client-side guard is defence in depth against pathological inputs that
 * could exhaust memory or stack-overflow the recursive-descent parser before
 * reaching the server.
 */
const MAX_DSL_SOURCE_LENGTH = 100_000;

export function parse(source: string): DslProgram {
	if (source.length > MAX_DSL_SOURCE_LENGTH) {
		throw new DslParseError(
			`Script DSL trop long (${source.length} caractères, max ${MAX_DSL_SOURCE_LENGTH})`,
			1,
			1
		);
	}
	const tokens = tokenize(source);
	const parser = new Parser(tokens);
	const program = parser.parseProgram();
	return { ...program, source };
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

	/**
	 * Wrap a freshly-built DslExpr with the source span [startPos, lastConsumedTokenEnd].
	 * Called at the end of each parseX method that returns a DslExpr.
	 */
	private withPos<T extends DslExpr>(startPos: number, expr: T): T {
		const lastTok = this.tokens[this.pos - 1];
		const endPos = lastTok ? lastTok.end : startPos;
		return { ...expr, start: startPos, end: endPos };
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

		// @ directive
		if (t.type === 'AT_DIRECTIVE') return this.parseDirective();

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
				const decorators = this.parseTrailingDecorators();
				this.expectNewline();
				return decorators.length > 0
					? { kind: 'assignment', name, value, line, decorators }
					: { kind: 'assignment', name, value, line };
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

	/**
	 * Consume trailing `@identifier` tokens (decorators) after an expression.
	 *
	 * Returns the list of decorator names (without the `@` prefix), in source
	 * order. Empty array if no decorators present. Decorators do not accept
	 * arguments in V1 — a `(` after an `@identifier` raises an error to keep
	 * the syntax simple and ambiguity-free.
	 *
	 * Stops at the first non-AT_DIRECTIVE token (typically NEWLINE/EOF/DEDENT).
	 * The caller must subsequently call `expectNewline()`.
	 *
	 * Used only for assignment-suffix decorators. Statement-level directives
	 * (whole-line `@pause(...)`, `@instrument(...)`) keep their dedicated
	 * parser path via `parseDirective()`.
	 */
	private parseTrailingDecorators(): string[] {
		const decorators: string[] = [];
		while (this.peek().type === 'AT_DIRECTIVE') {
			const t = this.advance();
			if (this.peek().type === 'LPAREN') {
				throw new DslParseError(
					`Decorateur \`@${t.value}\` avec arguments non supporte en suffixe. Decorateurs autorises : @contrainte, @methode, @visibilite (sans arguments).`,
					t.line,
					t.col
				);
			}
			decorators.push(t.value);
		}
		return decorators;
	}

	// ─── Expressions (precedence climbing) ────────────────────

	private parseExpr(): DslExpr {
		return this.parseOr();
	}

	private parseOr(): DslExpr {
		const startPos = this.peek().start;
		let left = this.parseAnd();
		while (this.isKeyword('ou')) {
			const line = this.peek().line;
			this.advance();
			const right = this.parseAnd();
			left = this.withPos(startPos, { kind: 'binary', op: 'ou', left, right, line });
		}
		return left;
	}

	private parseAnd(): DslExpr {
		const startPos = this.peek().start;
		let left = this.parseNot();
		while (this.isKeyword('et')) {
			const line = this.peek().line;
			this.advance();
			const right = this.parseNot();
			left = this.withPos(startPos, { kind: 'binary', op: 'et', left, right, line });
		}
		return left;
	}

	private parseNot(): DslExpr {
		if (this.isKeyword('non')) {
			const startPos = this.peek().start;
			const line = this.peek().line;
			this.advance();
			const operand = this.parseNot();
			return this.withPos(startPos, { kind: 'unary', op: 'non', operand, line });
		}
		return this.parseComparison();
	}

	private parseComparison(): DslExpr {
		const startPos = this.peek().start;
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
			left = this.withPos(startPos, { kind: 'binary', op, left, right, line });
		}
		return left;
	}

	private parseAddSub(): DslExpr {
		const startPos = this.peek().start;
		let left = this.parseMulDiv();
		while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
			const line = this.peek().line;
			const op = this.advance().value as '+' | '-';
			const right = this.parseMulDiv();
			left = this.withPos(startPos, { kind: 'binary', op, left, right, line });
		}
		return left;
	}

	private parseMulDiv(): DslExpr {
		const startPos = this.peek().start;
		let left = this.parseUnary();
		while (
			this.peek().type === 'STAR' ||
			this.peek().type === 'SLASH' ||
			this.peek().type === 'PERCENT'
		) {
			const line = this.peek().line;
			const op = this.advance().value as '*' | '/' | '%';
			const right = this.parseUnary();
			left = this.withPos(startPos, { kind: 'binary', op, left, right, line });
		}
		return left;
	}

	private parseUnary(): DslExpr {
		if (this.peek().type === 'MINUS') {
			const startPos = this.peek().start;
			const line = this.peek().line;
			this.advance();
			const operand = this.parseUnary();
			return this.withPos(startPos, { kind: 'unary', op: '-', operand, line });
		}
		if (this.peek().type === 'PLUS') {
			this.advance();
			return this.parseUnary();
		}
		return this.parsePower();
	}

	private parsePower(): DslExpr {
		const startPos = this.peek().start;
		let left = this.parsePostfix();
		if (this.peek().type === 'CARET') {
			const line = this.peek().line;
			this.advance();
			const right = this.parseUnary(); // right-associative
			left = this.withPos(startPos, { kind: 'binary', op: '^', left, right, line });
		}
		return left;
	}

	private parsePostfix(): DslExpr {
		const startPos = this.peek().start;
		let expr = this.parsePrimary();

		while (true) {
			if (this.peek().type === 'LBRACKET') {
				// Indexing: expr[index]
				this.advance();
				const index = this.parseExpr();
				this.expect('RBRACKET', 'index');
				expr = this.withPos(startPos, {
					kind: 'indexedAccess',
					name: (expr as { name: string }).name ?? '',
					index,
					line: expr.line
				});
			} else if (this.peek().type === 'DOT') {
				// Property access: A.x
				this.advance();
				const prop = this.expect('IDENTIFIER', 'propriete').value;
				expr = this.withPos(startPos, {
					kind: 'propertyAccess',
					object: (expr as { name: string }).name ?? '',
					property: prop,
					line: expr.line
				});
			} else if (this.peek().type === 'LPAREN' && expr.kind === 'identifier') {
				// Function call: f(args)
				const call = this.parseFunctionCall(expr.name, expr.line);
				expr = this.withPos(startPos, call);
			} else {
				break;
			}
		}

		return expr;
	}

	private parsePrimary(): DslExpr {
		const t = this.peek();
		const startPos = t.start;

		// Number literal
		if (t.type === 'NUMBER') {
			this.advance();
			return this.withPos(startPos, { kind: 'number', value: parseFloat(t.value), line: t.line });
		}

		// String literal
		if (t.type === 'STRING') {
			this.advance();
			return this.withPos(startPos, { kind: 'string', value: t.value, line: t.line });
		}

		// Boolean literals
		if (t.type === 'KEYWORD' && t.value === 'vrai') {
			this.advance();
			return this.withPos(startPos, { kind: 'bool', value: true, line: t.line });
		}
		if (t.type === 'KEYWORD' && t.value === 'faux') {
			this.advance();
			return this.withPos(startPos, { kind: 'bool', value: false, line: t.line });
		}

		// Keyword used as function name (point, segment, etc.)
		if (t.type === 'KEYWORD' && this.tokens[this.pos + 1]?.type === 'LPAREN') {
			const name = this.advance().value;
			const call = this.parseFunctionCall(name, t.line);
			return this.withPos(startPos, call);
		}

		// Identifier
		if (t.type === 'IDENTIFIER') {
			this.advance();
			return this.withPos(startPos, { kind: 'identifier', name: t.value, line: t.line });
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
				return this.withPos(startPos, { kind: 'tuple', elements, line: t.line });
			}
			this.expect('RPAREN', 'expression parenthesee');
			// Parenthesized expression: positions span the outer parens.
			return this.withPos(startPos, first);
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
			return this.withPos(startPos, { kind: 'list', elements, line: t.line });
		}

		throw new DslParseError(`Expression inattendue : ${t.type} '${t.value}'`, t.line, t.col);
	}

	private parseDirective(): DslDirective {
		const t = this.advance(); // AT_DIRECTIVE token
		const name = t.value;
		const line = t.line;
		const args: DslExpr[] = [];
		const namedArgs = new Map<string, DslExpr>();

		// Optional arguments in parentheses
		if (this.peek().type === 'LPAREN') {
			this.advance(); // (
			if (this.peek().type !== 'RPAREN') {
				this.parseFunctionArg(args, namedArgs);
				while (this.peek().type === 'COMMA') {
					this.advance();
					this.parseFunctionArg(args, namedArgs);
				}
			}
			this.expect('RPAREN', 'directive');
		}

		this.expectNewline();
		return { kind: 'directive', name, args, namedArgs, line };
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
		// Check for named argument: name=value (accept both IDENTIFIER and KEYWORD as param names)
		if (
			(this.peek().type === 'IDENTIFIER' || this.peek().type === 'KEYWORD') &&
			this.tokens[this.pos + 1]?.type === 'EQUALS'
		) {
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
