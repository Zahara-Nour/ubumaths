/**
 * Tests for condition-evaluator.ts
 * =================================
 *
 * Tests the boolean condition evaluation used as generation guards.
 * Covers the ~20 unique condition patterns found in the old question bank.
 */

import { describe, it, expect } from 'vitest';
import { evaluateConditions, evaluateConditionStrict } from '../condition-evaluator';
import { resolveVariableConditionals } from '../content-resolver';
import type { ResolvedVariable } from '$lib/ubumark/types/parameterization';

/** Helper to create resolved variables from a name/value map */
function makeVars(map: Record<string, number>): ResolvedVariable[] {
	return Object.entries(map).map(([name, value]) => ({
		name,
		value: String(value)
	}));
}

describe('evaluateConditions', () => {
	// =========================================================================
	// Basic conditions
	// =========================================================================

	it('returns true when no conditions', () => {
		expect(evaluateConditions([], makeVars({ a: 1 }))).toBe(true);
	});

	it('a*b!=0 — both non-zero', () => {
		expect(evaluateConditions(['a*b!=0'], makeVars({ a: 3, b: 5 }))).toBe(true);
	});

	it('a*b!=0 — one is zero', () => {
		expect(evaluateConditions(['a*b!=0'], makeVars({ a: 0, b: 5 }))).toBe(false);
	});

	it('a!=b — different values', () => {
		expect(evaluateConditions(['a!=b'], makeVars({ a: 3, b: 5 }))).toBe(true);
	});

	it('a!=b — same values', () => {
		expect(evaluateConditions(['a!=b'], makeVars({ a: 3, b: 3 }))).toBe(false);
	});

	it('a!=1 — exclude specific value', () => {
		expect(evaluateConditions(['a!=1'], makeVars({ a: 5 }))).toBe(true);
		expect(evaluateConditions(['a!=1'], makeVars({ a: 1 }))).toBe(false);
	});

	// =========================================================================
	// Logical operators
	// =========================================================================

	it('a != 0 && a != 1 — AND logic', () => {
		expect(evaluateConditions(['a != 0 && a != 1'], makeVars({ a: 5 }))).toBe(true);
		expect(evaluateConditions(['a != 0 && a != 1'], makeVars({ a: 0 }))).toBe(false);
		expect(evaluateConditions(['a != 0 && a != 1'], makeVars({ a: 1 }))).toBe(false);
	});

	it('a<=0 || b<=0 — OR logic', () => {
		expect(evaluateConditions(['a<=0 || b<=0'], makeVars({ a: -1, b: 3 }))).toBe(true);
		expect(evaluateConditions(['a<=0 || b<=0'], makeVars({ a: 3, b: -2 }))).toBe(true);
		expect(evaluateConditions(['a<=0 || b<=0'], makeVars({ a: 3, b: 5 }))).toBe(false);
	});

	// =========================================================================
	// Absolute value
	// =========================================================================

	it('abs(a) != abs(b) — different absolute values', () => {
		expect(evaluateConditions(['abs(a) != abs(b)'], makeVars({ a: 3, b: -5 }))).toBe(true);
	});

	it('abs(a) != abs(b) — same absolute values', () => {
		expect(evaluateConditions(['abs(a) != abs(b)'], makeVars({ a: 3, b: -3 }))).toBe(false);
	});

	it('abs(a) != abs(b) && abs(a) != abs(c) — composed abs+AND', () => {
		expect(
			evaluateConditions(['abs(a) != abs(b) && abs(a) != abs(c)'], makeVars({ a: 3, b: 5, c: 7 }))
		).toBe(true);
		expect(
			evaluateConditions(['abs(a) != abs(b) && abs(a) != abs(c)'], makeVars({ a: 3, b: 5, c: -3 }))
		).toBe(false);
	});

	it('abs(a+(b))>1 — abs of expression', () => {
		expect(evaluateConditions(['abs(a+(b))>1'], makeVars({ a: 5, b: -2 }))).toBe(true);
		expect(evaluateConditions(['abs(a+(b))>1'], makeVars({ a: 1, b: 0 }))).toBe(false);
	});

	// =========================================================================
	// Modulo and GCD
	// =========================================================================

	it('mod(a*b,10)!=0 — modulo', () => {
		expect(evaluateConditions(['mod(a*b,10)!=0'], makeVars({ a: 3, b: 7 }))).toBe(true);
		expect(evaluateConditions(['mod(a*b,10)!=0'], makeVars({ a: 2, b: 5 }))).toBe(false);
	});

	it('gcd(a+b,c)=1 — coprime (GCD)', () => {
		expect(evaluateConditions(['gcd(a+b,c)=1'], makeVars({ a: 3, b: 4, c: 5 }))).toBe(true);
		// gcd(6, 4) = 2 != 1
		expect(evaluateConditions(['gcd(a+b,c)=1'], makeVars({ a: 2, b: 4, c: 4 }))).toBe(false);
	});

	// =========================================================================
	// Comparison operators
	// =========================================================================

	it('a < b', () => {
		expect(evaluateConditions(['a < b'], makeVars({ a: 3, b: 5 }))).toBe(true);
		expect(evaluateConditions(['a < b'], makeVars({ a: 5, b: 3 }))).toBe(false);
	});

	it('a >= b', () => {
		expect(evaluateConditions(['a >= b'], makeVars({ a: 5, b: 5 }))).toBe(true);
		expect(evaluateConditions(['a >= b'], makeVars({ a: 3, b: 5 }))).toBe(false);
	});

	// =========================================================================
	// Multiple conditions (implicit AND between array elements)
	// =========================================================================

	it('multiple conditions — all true', () => {
		expect(evaluateConditions(['a != 0', 'b != 0', 'a != b'], makeVars({ a: 3, b: 5 }))).toBe(true);
	});

	it('multiple conditions — one false', () => {
		expect(evaluateConditions(['a != 0', 'b != 0', 'a != b'], makeVars({ a: 3, b: 3 }))).toBe(
			false
		);
	});

	// =========================================================================
	// Edge cases
	// =========================================================================

	// Une condition illisible est une faute de l'auteur, pas un tirage à rejeter :
	// la rendre « fausse » épuisait les 100 essais sans dire pourquoi.
	it('invalid condition expression — throws an explicit error', () => {
		expect(() => evaluateConditions(['invalid!!!syntax'], makeVars({ a: 3 }))).toThrow(
			/could not be parsed/
		);
	});

	it('condition with unresolved variable in != — returns true (structural comparison)', () => {
		// When x is unresolved, numeric eval fails, fallback to areEquivalent:
		// x is structurally != 0, so returns true. This is acceptable for conditions
		// since all variables should be resolved before condition evaluation.
		expect(evaluateConditions(['x != 0'], makeVars({ a: 3 }))).toBe(true);
	});

	// =========================================================================
	// Virgule entre deux chiffres dans un appel de fonction : séparateur d'arguments
	// (avant le correctif, `mod(16,4)` se lisait `mod(16.4)` et la condition mentait)
	// =========================================================================

	describe("virgule dans un appel de fonction = séparateur d'arguments", () => {
		it('mod(16,4)!=0 → faux (16 est divisible par 4)', () => {
			expect(evaluateConditions(['mod(16,4)!=0'], [])).toBe(false);
		});

		it('mod(17,4)!=0 → vrai', () => {
			expect(evaluateConditions(['mod(17,4)!=0'], [])).toBe(true);
		});

		it('mod(b^2-a^2,4)=0 avec a=3, b=5 → vrai (25-9=16)', () => {
			// La substitution produit `…{3}^2,4` : le `2,4` ne doit pas devenir 2,4
			expect(evaluateConditions(['mod(b^2-a^2,4)=0'], makeVars({ a: 3, b: 5 }))).toBe(true);
			expect(evaluateConditions(['mod(b^2-a^2,4)!=0'], makeVars({ a: 3, b: 5 }))).toBe(false);
		});

		it('gcd(12,8)=4 → vrai', () => {
			expect(evaluateConditions(['gcd(12,8)=4'], [])).toBe(true);
		});

		it('ambiguïté max(2,5) : le séparateur l’emporte → 5', () => {
			expect(evaluateConditions(['max(2,5)=5'], [])).toBe(true);
		});

		it('décimal à virgule HORS appel de fonction : sens inchangé (a>2,5)', () => {
			expect(evaluateConditions(['a>2,5'], makeVars({ a: 3 }))).toBe(true);
			expect(evaluateConditions(['a>2,5'], makeVars({ a: 2 }))).toBe(false);
			expect(evaluateConditions(['abs(a)>2,5'], makeVars({ a: -3 }))).toBe(true);
		});

		it('décimal à virgule dans des parenthèses de groupement, même dans un appel', () => {
			// mod((2,5)*4,3) = mod(10,3) = 1
			expect(evaluateConditions(['mod((2,5)*4,3)=1'], [])).toBe(true);
		});
	});

	// =========================================================================
	// Opérateurs d'égalité et de différence écrits à la manière d'un langage
	// =========================================================================

	describe('opérateurs « == », « != », « <> », « ≠ », « === »', () => {
		it('a == 2 avec a = 2 → vrai ; avec a = 3 → faux', () => {
			expect(evaluateConditions(['a == 2'], makeVars({ a: 2 }))).toBe(true);
			expect(evaluateConditions(['a == 2'], makeVars({ a: 3 }))).toBe(false);
		});

		it('gcd(c,d) == 1 vaut gcd(c,d) = 1', () => {
			expect(evaluateConditions(['gcd(c,d) == 1'], makeVars({ c: 4, d: 9 }))).toBe(true);
			expect(evaluateConditions(['gcd(c,d) == 1'], makeVars({ c: 4, d: 6 }))).toBe(false);
		});

		it('a === 2 vaut a = 2', () => {
			expect(evaluateConditions(['a === 2'], makeVars({ a: 2 }))).toBe(true);
			expect(evaluateConditions(['a === 2'], makeVars({ a: 5 }))).toBe(false);
		});

		it('a <> b, a ≠ b et a !== b valent a != b', () => {
			for (const cond of ['a <> b', 'a ≠ b', 'a !== b']) {
				expect(evaluateConditions([cond], makeVars({ a: 2, b: 3 }))).toBe(true);
				expect(evaluateConditions([cond], makeVars({ a: 3, b: 3 }))).toBe(false);
			}
		});

		it('!(a == b) est la négation de a == b', () => {
			expect(evaluateConditions(['!(a == b)'], makeVars({ a: 2, b: 3 }))).toBe(true);
			expect(evaluateConditions(['!(a == b)'], makeVars({ a: 3, b: 3 }))).toBe(false);
		});

		it('!(a = b) entre parenthèses est évaluée (et non « faux » en silence)', () => {
			expect(evaluateConditions(['!(a = b)'], makeVars({ a: 2, b: 3 }))).toBe(true);
			expect(evaluateConditions(['!(a = b)'], makeVars({ a: 3, b: 3 }))).toBe(false);
		});

		it('a == 2 && b == 3 combine les deux égalités', () => {
			expect(evaluateConditions(['a == 2 && b == 3'], makeVars({ a: 2, b: 3 }))).toBe(true);
			expect(evaluateConditions(['a == 2 && b == 3'], makeVars({ a: 2, b: 4 }))).toBe(false);
		});

		it('<=, >= et != restent inchangés', () => {
			expect(evaluateConditions(['a <= 2', 'b >= 3', 'a != b'], makeVars({ a: 2, b: 3 }))).toBe(
				true
			);
			expect(evaluateConditions(['a <= 1'], makeVars({ a: 2 }))).toBe(false);
		});

		it('evaluateConditionStrict lit aussi ==', () => {
			expect(evaluateConditionStrict('a == 2', makeVars({ a: 2 }))).toBe(true);
			expect(evaluateConditionStrict('a == 2', makeVars({ a: 3 }))).toBe(false);
		});

		it('{{if:a==2|X|Y}} choisit la bonne branche', () => {
			expect(resolveVariableConditionals('{{if:a==2|X|Y}}', makeVars({ a: 2 }))).toBe('X');
			expect(resolveVariableConditionals('{{if:a==2|X|Y}}', makeVars({ a: 3 }))).toBe('Y');
		});

		it('opérateur inconnu (a =< 2) → erreur explicite', () => {
			expect(() => evaluateConditions(['a =< 2'], makeVars({ a: 2 }))).toThrow(
				/could not be parsed/
			);
		});
	});
});
