/**
 * Test: NUMBER cannot start implicit multiplication in LaTeX parsers (pratt + rd)
 */
import { describe, it, expect } from 'vitest';
import { parseLatexSafe } from '../parser';
import type { LatexParserOptions } from '../parser';

const rejected = [
	['a3', 'variable then number'],
	['x2', 'variable then number'],
	['\\sqrt{2}3', 'sqrt then number'],
	['(x+1)3', 'delimiter then number'],
	['\\cos(x)3', 'function then number'],
	['\\sin(x)3', 'function then number']
] as const;

const accepted = [
	['3a', 'number then variable'],
	['3\\sqrt{2}', 'number then sqrt'],
	['3(x+1)', 'number then delimiter'],
	['3\\cos(x)', 'number then function'],
	['ab', 'variable then variable'],
	['\\sqrt{2}x', 'sqrt then variable'],
	['x\\sqrt{2}', 'variable then sqrt']
] as const;

const parsers = ['pratt', 'rd'] as const;

for (const parser of parsers) {
	describe(`implicit multiplication - NUMBER cannot start (${parser} parser)`, () => {
		const opts: LatexParserOptions = { parser };

		for (const [latex, label] of rejected) {
			it(`should reject "${latex}" (${label})`, () => {
				const result = parseLatexSafe(latex, opts);
				const isImplicitMult =
					result.ast?.type === 'multiplication' && result.ast.displayStyle === 'implicit';
				expect(isImplicitMult).toBe(false);
			});
		}

		for (const [latex, label] of accepted) {
			it(`should accept "${latex}" (${label})`, () => {
				const result = parseLatexSafe(latex, opts);
				expect(result.ast).not.toBeNull();
				expect(result.ast!.type).toBe('multiplication');
				if (result.ast!.type === 'multiplication') {
					expect(result.ast!.displayStyle).toBe('implicit');
				}
			});
		}
	});
}
