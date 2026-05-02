/**
 * Tests for `isMathPureExpr()` — detects whether a DslExpr is routable to
 * mathAST's `parseCustom()` (Phase 2 of dsl-mathast-routing plan).
 *
 * An expression is "math pure" iff it contains only:
 *   - number / bool literals
 *   - identifiers
 *   - binary / unary arithmetic operators
 *   - function calls whose name is NOT a DSL builtin nor a user macro
 *
 * Anything else (tuples, lists, indexedAccess, propertyAccess, calls to
 * BUILTIN_NAMES like `point`/`slider`/`distance`, calls to user macros)
 * forces the interpreter to keep the existing DSL evaluation path.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { isMathPureExpr } from '../math-pure-expr';
import type { DslAssignment, DslExprStatement } from '../types';

function exprFromAssignment(source: string) {
	const program = parse(source);
	const stmt = program.statements[0] as DslAssignment;
	return stmt.value;
}

function exprFromStatement(source: string) {
	const program = parse(source);
	const stmt = program.statements[0] as DslExprStatement;
	return stmt.expr;
}

describe('isMathPureExpr — primitives', () => {
	it('number literal: math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = 42'))).toBe(true);
	});

	it('bool literal: math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = vrai'))).toBe(true);
	});

	it('identifier: math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = foo'))).toBe(true);
	});

	it('\\pi identifier: math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = \\pi'))).toBe(true);
	});

	it('string literal: NOT math pure (cannot be evaluated as a number)', () => {
		expect(isMathPureExpr(exprFromAssignment('r = "hello"'))).toBe(false);
	});
});

describe('isMathPureExpr — arithmetic', () => {
	it('addition: math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = 2 + 3'))).toBe(true);
	});

	it('division: math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = a / b'))).toBe(true);
	});

	it('power: math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = x^2'))).toBe(true);
	});

	it('unary minus: math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = -x'))).toBe(true);
	});

	it('nested arithmetic with \\pi: math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = 2 * \\pi + sqrt(3)'))).toBe(true);
	});
});

describe('isMathPureExpr — function calls', () => {
	it('sqrt(2) (math function, not builtin): math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = sqrt(2)'))).toBe(true);
	});

	it('exp(-1) (math function, not builtin): math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = exp(-1)'))).toBe(true);
	});

	it('sin(45) (math function, not builtin): math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = sin(45)'))).toBe(true);
	});

	it('point(2, 3) (DSL builtin): NOT math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('P = point(2, 3)'))).toBe(false);
	});

	it('slider(0, 10) (DSL builtin): NOT math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('s = slider(0, 10)'))).toBe(false);
	});

	it('distance(A, B) (DSL builtin): NOT math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('d = distance(A, B)'))).toBe(false);
	});

	it('mixed: distance(A, B) + 1 → NOT math pure (contains builtin call)', () => {
		expect(isMathPureExpr(exprFromAssignment('r = distance(A, B) + 1'))).toBe(false);
	});

	it('mixed: 2 + sqrt(distance(A, B)) → NOT math pure (nested builtin)', () => {
		expect(isMathPureExpr(exprFromAssignment('r = 2 + sqrt(distance(A, B))'))).toBe(false);
	});

	it('user macro call: NOT math pure (treated as opaque DSL call)', () => {
		const macros = new Set(['mediatrice', 'mymacro']);
		expect(isMathPureExpr(exprFromAssignment('r = mymacro(2)'), { macroNames: macros })).toBe(
			false
		);
	});

	it('unknown function (no macro context): math pure (math fallback)', () => {
		expect(isMathPureExpr(exprFromAssignment('r = wibble(2)'))).toBe(true);
	});
});

describe('isMathPureExpr — non-math structures', () => {
	it('tuple: NOT math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('t = (1, 2)'))).toBe(false);
	});

	it('list: NOT math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('l = [1, 2]'))).toBe(false);
	});

	it('indexed access P[0]: NOT math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = P[0]'))).toBe(false);
	});

	it('property access P.x: NOT math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = P.x'))).toBe(false);
	});

	it('binary with embedded property access: NOT math pure', () => {
		expect(isMathPureExpr(exprFromAssignment('r = P.x + 2'))).toBe(false);
	});
});

describe('isMathPureExpr — expression statements', () => {
	it('bare math expression statement: math pure', () => {
		expect(isMathPureExpr(exprFromStatement('2 + sqrt(2)'))).toBe(true);
	});

	it('bare builtin call statement: NOT math pure', () => {
		expect(isMathPureExpr(exprFromStatement('point(2, 3)'))).toBe(false);
	});
});
