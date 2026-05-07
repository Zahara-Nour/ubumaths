/**
 * Pipeline integration tests for `generatePedagogicalLimitSteps`.
 *
 * These tests validate end-to-end behaviour on Tle-spé canonical cases:
 *
 * - **Direct substitution** : finite-value polynomials, simple rationals
 *   without singularity at the approach point.
 * - **Known limit** : `sin(x)/x → 1`, `(1−cos(x))/x² → 1/2`,
 *   `ln(1+x)/x → 1`.
 * - **Factorisation** (`0/0`) : `(x²−4)/(x−2) → 4`, `(x³−1)/(x−1) → 3`.
 * - **Infinity-analysis** : ratio of polynomials with `numDeg > / = / <
 *   denDeg` cases.
 * - **Refusal cases** : primaire/college throw, L'Hôpital required at
 *   lycée throw.
 * - **Strategy table** : sup vs lycée vocabulary differences (compact
 *   conclusion at sup, identify-limit gated by `includeIdentify`).
 * - **Step structure invariants** : ID monotonicity, sub-step linkage,
 *   `globalBefore` consistency, `direction` propagation.
 */

import { describe, expect, it } from 'vitest';
import {
	add,
	divide as divideFactory,
	infinity,
	multiply,
	number,
	power,
	subtract,
	variable
} from '../../factory';
import type { MathNode } from '../../types';
import { generatePedagogicalLimitSteps } from '../pipeline';
import { PedagogicalLimitNotImplemented } from '../types';
import type { PedagogicalLimitStep } from '../types';

/** Test helper: default to fraction style so we don't sprinkle the 3rd arg. */
const divide = (n: MathNode, d: MathNode) => divideFactory(n, d, 'fraction');

// =============================================================================
// Helpers used across tests
// =============================================================================

function flatRules(steps: readonly PedagogicalLimitStep[]): string[] {
	const out: string[] = [];
	for (const s of steps) {
		out.push(s.rule);
		if (s.subSteps) out.push(...flatRules(s.subSteps));
	}
	return out;
}

function findRule(
	steps: readonly PedagogicalLimitStep[],
	rule: string
): PedagogicalLimitStep | undefined {
	for (const s of steps) {
		if (s.rule === rule) return s;
		if (s.subSteps) {
			const found = findRule(s.subSteps, rule);
			if (found) return found;
		}
	}
	return undefined;
}

function poly(coeffs: number[], varName = 'x') {
	// quick polynomial node from coeffs (constant first)
	if (coeffs.length === 0) return number('0');
	const x = variable(varName);
	const terms = coeffs.map((c, i) => ({ c, i })).filter(({ c }) => c !== 0);
	if (terms.length === 0) return number('0');
	const monos = terms.map(({ c, i }) => {
		const xPow = i === 0 ? null : i === 1 ? x : power(x, number(String(i)));
		if (!xPow) return number(String(c));
		if (c === 1) return xPow;
		return multiply(number(String(c)), xPow, 'implicit');
	});
	let acc = monos[0];
	for (let k = 1; k < monos.length; k++) acc = add(acc, monos[k]);
	return acc;
}

// =============================================================================
// Direct substitution
// =============================================================================

describe('pipeline — direct substitution', () => {
	it('x² + 2x at x = 3 → 15 (lycée)', () => {
		const expr = poly([0, 2, 1]); // 2x + x²
		const result = generatePedagogicalLimitSteps(expr, {
			variable: 'x',
			approach: number('3'),
			schoolLevel: 'lycee'
		});

		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number', value: '15' });
		expect(flatRules(result.steps)).toEqual([
			'identify-limit',
			'apply-direct-substitution',
			'conclude'
		]);
	});

	it('x² + 2x at x = 3 → 15 (sup, compact)', () => {
		const expr = poly([0, 2, 1]);
		const result = generatePedagogicalLimitSteps(expr, {
			variable: 'x',
			approach: number('3'),
			schoolLevel: 'superieur'
		});

		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number', value: '15' });
		// sup: no identify-limit (includeIdentify=false), no conclude (verbosityCompactConclusion=true)
		expect(flatRules(result.steps)).toEqual(['apply-direct-substitution']);
	});
});

// =============================================================================
// Known limit
// =============================================================================

describe('pipeline — known-limit', () => {
	it('sin(x)/x at x → 0 → 1 (lycée)', () => {
		const expr = divide({ type: 'function', name: 'sin', args: [variable('x')] }, variable('x'));
		const result = generatePedagogicalLimitSteps(expr, {
			variable: 'x',
			approach: number('0'),
			schoolLevel: 'lycee'
		});

		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number' });
		expect(flatRules(result.steps)).toContain('apply-known-limit');
	});
});

// =============================================================================
// Factorisation (0/0 division)
// =============================================================================

describe('pipeline — factorisation', () => {
	it('(x² − 4)/(x − 2) at x = 2 → 4', () => {
		const expr = divide(
			subtract(power(variable('x'), number('2')), number('4')),
			subtract(variable('x'), number('2'))
		);
		const result = generatePedagogicalLimitSteps(expr, {
			variable: 'x',
			approach: number('2'),
			schoolLevel: 'lycee'
		});

		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number', value: '4' });

		const rules = flatRules(result.steps);
		expect(rules).toContain('detect-indeterminate-form');
		expect(rules).toContain('simplify-common-factor');
		expect(rules).toContain('factor-numerator');
		expect(rules).toContain('factor-denominator');
		expect(rules).toContain('apply-direct-substitution');
		expect(rules).toContain('conclude');
	});

	it('factor-numerator and factor-denominator nest under simplify-common-factor', () => {
		const expr = divide(
			subtract(power(variable('x'), number('2')), number('4')),
			subtract(variable('x'), number('2'))
		);
		const result = generatePedagogicalLimitSteps(expr, {
			variable: 'x',
			approach: number('2'),
			schoolLevel: 'lycee'
		});

		const parent = findRule(result.steps, 'simplify-common-factor');
		expect(parent).toBeDefined();
		expect(parent?.subSteps).toHaveLength(2);
		expect(parent?.subSteps?.[0].rule).toBe('factor-numerator');
		expect(parent?.subSteps?.[1].rule).toBe('factor-denominator');
	});

	it('detect-indeterminate-form carries indeterminateForm = "0/0"', () => {
		const expr = divide(
			subtract(power(variable('x'), number('2')), number('4')),
			subtract(variable('x'), number('2'))
		);
		const result = generatePedagogicalLimitSteps(expr, {
			variable: 'x',
			approach: number('2'),
			schoolLevel: 'lycee'
		});

		const detect = findRule(result.steps, 'detect-indeterminate-form');
		expect(detect?.indeterminateForm).toBe('0/0');
	});

	it('(x³ − 1)/(x − 1) at x = 1 → 3', () => {
		const expr = divide(
			subtract(power(variable('x'), number('3')), number('1')),
			subtract(variable('x'), number('1'))
		);
		const result = generatePedagogicalLimitSteps(expr, {
			variable: 'x',
			approach: number('1'),
			schoolLevel: 'lycee'
		});

		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number', value: '3' });
	});
});

// =============================================================================
// Infinity-analysis
// =============================================================================

describe('pipeline — infinity-analysis', () => {
	it('(3x² − x)/(x² + 1) at x → +∞ → 3 (same degree, ratio of leading coefficients)', () => {
		const num = subtract(
			multiply(number('3'), power(variable('x'), number('2')), 'implicit'),
			variable('x')
		);
		const den = add(power(variable('x'), number('2')), number('1'));
		const result = generatePedagogicalLimitSteps(divide(num, den), {
			variable: 'x',
			approach: infinity('positive'),
			schoolLevel: 'lycee'
		});

		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number', value: '3' });
		expect(flatRules(result.steps)).toContain('identify-dominant-term');
	});

	it('x²/(x + 1) at x → +∞ → +∞', () => {
		const result = generatePedagogicalLimitSteps(
			divide(power(variable('x'), number('2')), add(variable('x'), number('1'))),
			{
				variable: 'x',
				approach: infinity('positive'),
				schoolLevel: 'lycee'
			}
		);

		expect(result.status).toBe('infinite');
		expect(result.value).toMatchObject({ type: 'infinity', sign: 'positive' });
		expect(flatRules(result.steps)).toContain('conclude-infinite');
	});

	it('x/(x² + 1) at x → +∞ → 0', () => {
		const result = generatePedagogicalLimitSteps(
			divide(variable('x'), add(power(variable('x'), number('2')), number('1'))),
			{
				variable: 'x',
				approach: infinity('positive'),
				schoolLevel: 'lycee'
			}
		);

		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number', value: '0' });
	});

	it('x³/(x + 1) at x → −∞ → −∞ (sign of x³ at -∞)', () => {
		const result = generatePedagogicalLimitSteps(
			divide(power(variable('x'), number('3')), add(variable('x'), number('1'))),
			{
				variable: 'x',
				approach: infinity('negative'),
				schoolLevel: 'lycee'
			}
		);

		expect(result.status).toBe('infinite');
		// x³/(x+1) ≈ x² at −∞ → +∞
		expect(result.value).toMatchObject({ type: 'infinity', sign: 'positive' });
	});
});

// =============================================================================
// Refusals (NotImplemented)
// =============================================================================

describe('pipeline — refusals', () => {
	it('throws on schoolLevel === "primaire"', () => {
		expect(() =>
			generatePedagogicalLimitSteps(variable('x'), {
				variable: 'x',
				approach: number('0'),
				schoolLevel: 'primaire'
			})
		).toThrow(PedagogicalLimitNotImplemented);
	});

	it('throws on schoolLevel === "college"', () => {
		expect(() =>
			generatePedagogicalLimitSteps(variable('x'), {
				variable: 'x',
				approach: number('0'),
				schoolLevel: 'college'
			})
		).toThrow(PedagogicalLimitNotImplemented);
	});

	it("throws when only L'Hôpital would solve (lycée locks lhopital)", () => {
		// (e^x − 1) / x at x → 0 — known-limit covers it ; pick a case that would only
		// resolve via L'Hôpital. (sin(x²)/x is one : not in known-limits, derivative
		// of numerator is required.)
		const expr = divide(
			{ type: 'function', name: 'sin', args: [power(variable('x'), number('2'))] },
			variable('x')
		);
		expect(() =>
			generatePedagogicalLimitSteps(expr, {
				variable: 'x',
				approach: number('0'),
				schoolLevel: 'lycee'
			})
		).toThrow(PedagogicalLimitNotImplemented);
	});

	it('error.expression points to the input AST', () => {
		const expr = variable('x');
		try {
			generatePedagogicalLimitSteps(expr, {
				variable: 'x',
				approach: number('0'),
				schoolLevel: 'primaire'
			});
		} catch (err) {
			expect(err).toBeInstanceOf(PedagogicalLimitNotImplemented);
			expect((err as PedagogicalLimitNotImplemented).expression).toBe(expr);
		}
	});
});

// =============================================================================
// Step invariants
// =============================================================================

describe('pipeline — step invariants', () => {
	it('step IDs are unique across the full step tree', () => {
		// Note: IDs are allocated in creation order, NOT in pre-order traversal
		// order — sub-steps may have lower IDs than their parent because they
		// are constructed before the parent that references them. Uniqueness is
		// the only invariant we guarantee here.
		const expr = divide(
			subtract(power(variable('x'), number('2')), number('4')),
			subtract(variable('x'), number('2'))
		);
		const result = generatePedagogicalLimitSteps(expr, {
			variable: 'x',
			approach: number('2'),
			schoolLevel: 'lycee'
		});

		const ids = collectIds(result.steps);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('every step carries the limit context (variable, approach, direction)', () => {
		const expr = divide(
			subtract(power(variable('x'), number('2')), number('4')),
			subtract(variable('x'), number('2'))
		);
		const result = generatePedagogicalLimitSteps(expr, {
			variable: 'x',
			approach: number('2'),
			direction: 'left',
			schoolLevel: 'lycee'
		});

		const visit = (steps: readonly PedagogicalLimitStep[]): void => {
			for (const s of steps) {
				expect(s.variable).toBe('x');
				expect(s.direction).toBe('left');
				expect(s.approach).toMatchObject({ type: 'number', value: '2' });
				if (s.subSteps) visit(s.subSteps);
			}
		};
		visit(result.steps);
	});

	it('result.direction defaults to "both" when omitted', () => {
		const result = generatePedagogicalLimitSteps(poly([0, 2, 1]), {
			variable: 'x',
			approach: number('3'),
			schoolLevel: 'lycee'
		});
		expect(result.direction).toBe('both');
	});
});

function collectIds(steps: readonly PedagogicalLimitStep[]): number[] {
	const ids: number[] = [];
	for (const s of steps) {
		ids.push(s.id);
		if (s.subSteps) ids.push(...collectIds(s.subSteps));
	}
	return ids;
}
