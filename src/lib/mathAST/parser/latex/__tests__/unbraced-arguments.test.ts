/**
 * Unbraced Command Arguments
 *
 * TeX accepts a single-character argument without braces (`\frac12`, `\sqrt2`),
 * and that is exactly what MathLive serialises as soon as an argument fits in
 * one character — so this is the form the app receives whenever a student
 * types a fraction. Both parsers must read it the way TeX does: `\frac12` is
 * one half, never twelve over something.
 *
 * @module mathAST/parser/latex/__tests__/unbraced-arguments.test
 */

import { describe, it, expect } from 'vitest';
import { parsePratt, parsePrattSafe } from '../parser-pratt';
import { parseRD, parseRDSafe } from '../parser-rd';
import type { MathNode } from '../../../types';
import type { ParseResult } from '../../types';

// =============================================================================
// Helper Functions
// =============================================================================

function expectType<T extends MathNode['type']>(
	node: MathNode,
	type: T
): asserts node is Extract<MathNode, { type: T }> {
	expect(node.type).toBe(type);
}

/** The two parsers must agree: every case runs through both. */
const PARSERS: readonly {
	name: string;
	parse: (input: string) => MathNode;
	parseSafe: (input: string) => ParseResult;
}[] = [
	{
		name: 'pratt',
		parse: (input) => parsePratt(input),
		parseSafe: (input) => parsePrattSafe(input)
	},
	{ name: 'rd', parse: (input) => parseRD(input), parseSafe: (input) => parseRDSafe(input) }
];

// =============================================================================
// Tests
// =============================================================================

describe.each(PARSERS)('$name parser — unbraced arguments', ({ parse, parseSafe }) => {
	describe('\\frac', () => {
		it('reads \\frac12 as one half, not twelve over something', () => {
			const node = parse('\\frac12');
			expectType(node, 'division');
			expect(node.displayStyle).toBe('fraction');
			expectType(node.numerator, 'number');
			expectType(node.denominator, 'number');
			expect(node.numerator.value).toBe('1');
			expect(node.denominator.value).toBe('2');
		});

		it('mixes an unbraced numerator with a braced denominator', () => {
			const node = parse('\\frac1{2n}');
			expectType(node, 'division');
			expectType(node.numerator, 'number');
			expect(node.numerator.value).toBe('1');
			expectType(node.denominator, 'multiplication');
		});

		it('mixes a braced numerator with an unbraced denominator', () => {
			const node = parse('\\frac{2n}1');
			expectType(node, 'division');
			expectType(node.numerator, 'multiplication');
			expectType(node.denominator, 'number');
			expect(node.denominator.value).toBe('1');
		});

		it('accepts a command as the argument', () => {
			const node = parse('\\frac\\pi2');
			expectType(node, 'division');
			expectType(node.numerator, 'constant');
			expect(node.numerator.constant).toBe('pi');
			expectType(node.denominator, 'number');
			expect(node.denominator.value).toBe('2');
		});

		it('accepts a letter as the argument', () => {
			const node = parse('\\frac1x');
			expectType(node, 'division');
			expectType(node.denominator, 'variable');
			expect(node.denominator.name).toBe('x');
		});

		it('ignores the whitespace TeX allows before an argument', () => {
			const node = parse('\\frac 1 2');
			expectType(node, 'division');
			expectType(node.numerator, 'number');
			expectType(node.denominator, 'number');
			expect(node.numerator.value).toBe('1');
			expect(node.denominator.value).toBe('2');
		});

		it('still reads a braced multi-digit numerator whole', () => {
			const node = parse('\\frac{12}{5}');
			expectType(node, 'division');
			expectType(node.numerator, 'number');
			expect(node.numerator.value).toBe('12');
		});

		it('still rejects \\frac with no argument at all', () => {
			expect(() => parse('\\frac')).toThrow();
		});
	});

	describe('\\sqrt', () => {
		it('reads \\sqrt2', () => {
			const node = parse('\\sqrt2');
			expectType(node, 'function');
			expect(node.name).toBe('sqrt');
			expectType(node.args[0], 'number');
			expect(node.args[0].value).toBe('2');
		});

		it('reads \\sqrt x', () => {
			const node = parse('\\sqrt x');
			expectType(node, 'function');
			expect(node.name).toBe('sqrt');
			expectType(node.args[0], 'variable');
			expect(node.args[0].name).toBe('x');
		});

		it('reads \\sqrt[3]8, index and radicand both unbraced', () => {
			const node = parse('\\sqrt[3]8');
			expectType(node, 'function');
			expect(node.name).toBe('sqrt');
			expectType(node.args[0], 'number');
			expect(node.args[0].value).toBe('8');
			expect(node.base).toBeDefined();
		});

		it('still rejects \\sqrt with no argument at all', () => {
			expect(() => parse('\\sqrt')).toThrow();
		});
	});

	describe('numbers the tokenizer rewrites', () => {
		// `1{,}5` and `1\,000` reach the parser with a canonicalised value that
		// is shorter than the source they came from: splitting them would report
		// errors at offsets pointing into the wrong characters, so they are read
		// whole instead.
		it('reads a French decimal comma whole', () => {
			const node = parse('\\frac1{,}5{2}');
			expectType(node, 'division');
			expectType(node.numerator, 'number');
			expect(node.numerator.value).toBe('1.5');
		});

		it('reads a decimal point whole', () => {
			const node = parse('\\frac1.5{2}');
			expectType(node, 'division');
			expectType(node.numerator, 'number');
			expect(node.numerator.value).toBe('1.5');
		});

		it('never builds a number out of a non-digit', () => {
			// `.` or `e` as a numerator would be a numeric node holding NaN, which
			// downstream consumers (checkReducedFractions) turn into a crash.
			for (const input of ['\\frac1.5{2}', '\\frac1e5{2}']) {
				const { ast } = parseSafe(input);
				const numerator = ast && ast.type === 'division' ? ast.numerator : null;
				if (numerator?.type === 'number') {
					expect(Number.isNaN(Number(numerator.value))).toBe(false);
				}
			}
		});

		it('points the error at the offending character after a split', () => {
			// `\frac1+` : the numerator took the 1, so the complaint must land on
			// the `+` at index 6, not somewhere inside the consumed digits.
			const { errors } = parseSafe('\\frac1+');
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0].position).toBe(6);
		});
	});

	describe('a letter argument stops at the letter', () => {
		// f, g, h, u… are generic function names by default, and a generic name
		// swallows the parentheses that follow it. An unbraced argument must not:
		// `\sqrt f(x)` is `\sqrt{f}(x)`, and both parsers have to agree on it.
		it('leaves the parentheses outside the argument', () => {
			const node = parse('\\sqrt f(x)');
			expectType(node, 'multiplication');
			expectType(node.left, 'function');
			expect(node.left.name).toBe('sqrt');
			expectType(node.left.args[0], 'variable');
			expect(node.left.args[0].name).toBe('f');
		});

		it('reads \\frac f2 the same way as \\frac{f}{2}', () => {
			expect(parse('\\frac f2')).toEqual(parse('\\frac{f}{2}'));
		});
	});

	describe('what MathLive actually emits', () => {
		// The sequence that surfaced the bug in the grapheur: a student typed
		// 3·(−1/2)^n and MathLive serialised the half as `\frac12`.
		it('parses 3\\cdot\\left(-\\frac12\\right)^n', () => {
			const node = parse('3\\cdot\\left(-\\frac12\\right)^n');
			expectType(node, 'multiplication');
		});

		// The parser refuses two juxtaposed numbers everywhere (`2 3` and
		// `\frac{1}{2}2` alike): the unbraced form must inherit that verdict
		// rather than invent a multiplication of its own.
		it('treats \\frac122 exactly like \\frac{1}{2}2', () => {
			expect(() => parse('\\frac122')).toThrow();
			expect(() => parse('\\frac{1}{2}2')).toThrow();
		});

		it('parses a fraction nested in a fraction', () => {
			const node = parse('\\frac\\frac123');
			expectType(node, 'division');
			expectType(node.numerator, 'division');
			expectType(node.denominator, 'number');
			expect(node.denominator.value).toBe('3');
		});
	});
});
