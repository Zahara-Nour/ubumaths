/**
 * Tests for Known Limits Database
 *
 * Tests cover:
 * - Known limits table entries
 * - Pattern matching for known limits
 * - Structural equality comparison
 * - Variable substitution
 */

import { describe, it, expect } from 'vitest';
import {
	KNOWN_LIMITS,
	matchKnownLimit,
	getKnownLimitValue,
	structurallyEqual,
	substituteVariable
} from '../known-limits';
import {
	number,
	variable,
	divide,
	func,
	add,
	subtract,
	multiply,
	power,
	positiveInfinity,
	negativeInfinity
} from '../../factory';
import { isNumber, isFunction } from '../../guards';

describe('Known Limits Database', () => {
	describe('KNOWN_LIMITS table', () => {
		it('contains standard trigonometric limits', () => {
			const sinXOverX = KNOWN_LIMITS.find((l) => l.id === 'sin-x-over-x');
			expect(sinXOverX).toBeDefined();
			expect(sinXOverX?.name).toContain('sin(x)/x');
		});

		it('contains exponential limits', () => {
			const expMinusOne = KNOWN_LIMITS.find((l) => l.id === 'exp-minus-one-over-x');
			expect(expMinusOne).toBeDefined();
		});

		it('contains limits at infinity', () => {
			const oneOverX = KNOWN_LIMITS.find((l) => l.id === 'one-over-x-at-infinity');
			expect(oneOverX).toBeDefined();
		});

		it('contains one-sided limits', () => {
			const rightLimit = KNOWN_LIMITS.find((l) => l.id === 'one-over-x-at-zero-right');
			const leftLimit = KNOWN_LIMITS.find((l) => l.id === 'one-over-x-at-zero-left');
			expect(rightLimit).toBeDefined();
			expect(leftLimit).toBeDefined();
			expect(rightLimit?.direction).toBe('right');
			expect(leftLimit?.direction).toBe('left');
		});
	});

	describe('structurallyEqual', () => {
		it('compares numbers correctly', () => {
			expect(structurallyEqual(number('5'), number('5'))).toBe(true);
			expect(structurallyEqual(number('5'), number('3'))).toBe(false);
		});

		it('compares variables correctly', () => {
			expect(structurallyEqual(variable('x'), variable('x'))).toBe(true);
			expect(structurallyEqual(variable('x'), variable('y'))).toBe(false);
		});

		it('compares additions correctly', () => {
			const a = add(variable('x'), number('1'));
			const b = add(variable('x'), number('1'));
			const c = add(variable('x'), number('2'));
			expect(structurallyEqual(a, b)).toBe(true);
			expect(structurallyEqual(a, c)).toBe(false);
		});

		it('compares divisions correctly', () => {
			const a = divide(variable('x'), number('2'), 'fraction');
			const b = divide(variable('x'), number('2'), 'fraction');
			const c = divide(variable('y'), number('2'), 'fraction');
			expect(structurallyEqual(a, b)).toBe(true);
			expect(structurallyEqual(a, c)).toBe(false);
		});

		it('compares functions correctly', () => {
			const a = func('sin', [variable('x')]);
			const b = func('sin', [variable('x')]);
			const c = func('cos', [variable('x')]);
			expect(structurallyEqual(a, b)).toBe(true);
			expect(structurallyEqual(a, c)).toBe(false);
		});

		it('compares infinity correctly', () => {
			expect(structurallyEqual(positiveInfinity(), positiveInfinity())).toBe(true);
			expect(structurallyEqual(negativeInfinity(), negativeInfinity())).toBe(true);
			expect(structurallyEqual(positiveInfinity(), negativeInfinity())).toBe(false);
		});
	});

	describe('substituteVariable', () => {
		it('substitutes variable in simple expression', () => {
			const expr = variable('x');
			const result = substituteVariable(expr, 'x', number('5'));
			expect(isNumber(result)).toBe(true);
			if (isNumber(result)) {
				expect(result.value).toBe('5');
			}
		});

		it('substitutes variable in addition', () => {
			const expr = add(variable('x'), number('1'));
			const result = substituteVariable(expr, 'x', number('3'));
			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(isNumber(result.left)).toBe(true);
			}
		});

		it('substitutes variable in function argument', () => {
			const expr = func('sin', [variable('x')]);
			const result = substituteVariable(expr, 'x', number('0'));
			expect(result.type).toBe('function');
			if (result.type === 'function') {
				expect(isNumber(result.args[0])).toBe(true);
			}
		});

		it('does not substitute different variable', () => {
			const expr = variable('y');
			const result = substituteVariable(expr, 'x', number('5'));
			expect(result.type).toBe('variable');
			if (result.type === 'variable') {
				expect(result.name).toBe('y');
			}
		});
	});

	describe('matchKnownLimit', () => {
		it('matches sin(x)/x as x → 0', () => {
			const expr = divide(func('sin', [variable('x')]), variable('x'), 'fraction');
			const match = matchKnownLimit(expr, number('0'), 'x');
			expect(match).not.toBeNull();
			expect(match?.id).toBe('sin-x-over-x');
		});

		it('matches tan(x)/x as x → 0', () => {
			const expr = divide(func('tan', [variable('x')]), variable('x'), 'fraction');
			const match = matchKnownLimit(expr, number('0'), 'x');
			expect(match).not.toBeNull();
			expect(match?.id).toBe('tan-x-over-x');
		});

		it('matches (e^x - 1)/x as x → 0', () => {
			const expr = divide(
				subtract(func('exp', [variable('x')]), number('1')),
				variable('x'),
				'fraction'
			);
			const match = matchKnownLimit(expr, number('0'), 'x');
			expect(match).not.toBeNull();
			expect(match?.id).toBe('exp-minus-one-over-x');
		});

		it('matches 1/x as x → +∞', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const match = matchKnownLimit(expr, positiveInfinity(), 'x');
			expect(match).not.toBeNull();
			expect(match?.id).toBe('one-over-x-at-infinity');
		});

		it('matches 1/x as x → 0⁺', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const match = matchKnownLimit(expr, number('0'), 'x', 'right');
			expect(match).not.toBeNull();
			expect(match?.id).toBe('one-over-x-at-zero-right');
		});

		it('matches 1/x as x → 0⁻', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const match = matchKnownLimit(expr, number('0'), 'x', 'left');
			expect(match).not.toBeNull();
			expect(match?.id).toBe('one-over-x-at-zero-left');
		});

		it('returns null for unknown expression', () => {
			const expr = add(variable('x'), number('1'));
			const match = matchKnownLimit(expr, number('0'), 'x');
			expect(match).toBeNull();
		});

		it('matches with different variable name', () => {
			const expr = divide(func('sin', [variable('t')]), variable('t'), 'fraction');
			const match = matchKnownLimit(expr, number('0'), 't');
			expect(match).not.toBeNull();
			expect(match?.id).toBe('sin-x-over-x');
		});
	});

	describe('getKnownLimitValue', () => {
		it('returns correct value for sin(x)/x limit', () => {
			const entry = KNOWN_LIMITS.find((l) => l.id === 'sin-x-over-x')!;
			const value = getKnownLimitValue(entry, 'x');
			expect(isNumber(value)).toBe(true);
			if (isNumber(value)) {
				expect(value.value).toBe('1');
			}
		});

		it('returns correct value for (1-cos(x))/x limit', () => {
			const entry = KNOWN_LIMITS.find((l) => l.id === 'one-minus-cos-over-x')!;
			const value = getKnownLimitValue(entry, 'x');
			expect(isNumber(value)).toBe(true);
			if (isNumber(value)) {
				expect(value.value).toBe('0');
			}
		});

		it('returns Euler number for (1+x)^(1/x) limit', () => {
			const entry = KNOWN_LIMITS.find((l) => l.id === 'one-plus-x-to-one-over-x')!;
			const value = getKnownLimitValue(entry, 'x');
			// Value is exp(1) representing e
			expect(isFunction(value)).toBe(true);
			if (isFunction(value)) {
				expect(value.name).toBe('exp');
			}
		});

		it('returns infinity for 1/x as x → 0⁺', () => {
			const entry = KNOWN_LIMITS.find((l) => l.id === 'one-over-x-at-zero-right')!;
			const value = getKnownLimitValue(entry, 'x');
			expect(value.type).toBe('infinity');
			if (value.type === 'infinity') {
				expect(value.sign).toBe('positive');
			}
		});
	});

	// =========================================================================
	// Croissances Comparées (Programme Français)
	// =========================================================================
	describe('Croissances comparées', () => {
		describe('x·ln(x) en 0⁺', () => {
			it('matches x·ln(x) as x → 0⁺ (implicit multiplication)', () => {
				const expr = multiply(variable('x'), func('ln', [variable('x')]), 'implicit');
				const match = matchKnownLimit(expr, number('0'), 'x', 'right');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-ln-x-at-zero');
			});

			it('matches x×ln(x) as x → 0⁺ (explicit multiplication)', () => {
				const expr = multiply(variable('x'), func('ln', [variable('x')]), 'explicit');
				const match = matchKnownLimit(expr, number('0'), 'x', 'right');
				expect(match).not.toBeNull();
				// Both implicit and explicit patterns return 0, so either match is valid
				expect(match?.id).toMatch(/^x-ln-x-at-zero/);
			});

			it('returns 0 for x·ln(x) limit', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'x-ln-x-at-zero')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(isNumber(value)).toBe(true);
				if (isNumber(value)) {
					expect(value.value).toBe('0');
				}
			});
		});

		describe('x²·ln(x) en 0⁺', () => {
			it('matches x²·ln(x) as x → 0⁺', () => {
				const expr = multiply(
					power(variable('x'), number('2')),
					func('ln', [variable('x')]),
					'implicit'
				);
				const match = matchKnownLimit(expr, number('0'), 'x', 'right');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-squared-ln-x-at-zero');
			});

			it('returns 0 for x²·ln(x) limit', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'x-squared-ln-x-at-zero')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(isNumber(value)).toBe(true);
				if (isNumber(value)) {
					expect(value.value).toBe('0');
				}
			});
		});

		describe('√x·ln(x) en 0⁺', () => {
			it('matches √x·ln(x) as x → 0⁺', () => {
				const expr = multiply(
					func('sqrt', [variable('x')]),
					func('ln', [variable('x')]),
					'implicit'
				);
				const match = matchKnownLimit(expr, number('0'), 'x', 'right');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('sqrt-x-ln-x-at-zero');
			});

			it('returns 0 for √x·ln(x) limit', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'sqrt-x-ln-x-at-zero')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(isNumber(value)).toBe(true);
				if (isNumber(value)) {
					expect(value.value).toBe('0');
				}
			});
		});

		describe('x^n/e^x en +∞', () => {
			it('matches x/e^x as x → +∞', () => {
				const expr = divide(variable('x'), func('exp', [variable('x')]), 'fraction');
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-over-exp-x');
			});

			it('matches x²/e^x as x → +∞', () => {
				const expr = divide(
					power(variable('x'), number('2')),
					func('exp', [variable('x')]),
					'fraction'
				);
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-squared-over-exp-x');
			});

			it('matches x³/e^x as x → +∞', () => {
				const expr = divide(
					power(variable('x'), number('3')),
					func('exp', [variable('x')]),
					'fraction'
				);
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-cubed-over-exp-x');
			});

			it('returns 0 for x²/e^x limit', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'x-squared-over-exp-x')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(isNumber(value)).toBe(true);
				if (isNumber(value)) {
					expect(value.value).toBe('0');
				}
			});
		});

		describe('ln(x)/x^n en +∞', () => {
			it('matches ln(x)/x as x → +∞', () => {
				const expr = divide(func('ln', [variable('x')]), variable('x'), 'fraction');
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('ln-x-over-x');
			});

			it('matches ln(x)/x² as x → +∞', () => {
				const expr = divide(
					func('ln', [variable('x')]),
					power(variable('x'), number('2')),
					'fraction'
				);
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('ln-x-over-x-squared');
			});

			it('matches ln(x)/√x as x → +∞', () => {
				const expr = divide(func('ln', [variable('x')]), func('sqrt', [variable('x')]), 'fraction');
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('ln-x-over-sqrt-x');
			});

			it('returns 0 for ln(x)/x² limit', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'ln-x-over-x-squared')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(isNumber(value)).toBe(true);
				if (isNumber(value)) {
					expect(value.value).toBe('0');
				}
			});
		});

		describe('(ln(x))^n/x en +∞', () => {
			it('matches (ln(x))²/x as x → +∞', () => {
				const expr = divide(
					power(func('ln', [variable('x')]), number('2')),
					variable('x'),
					'fraction'
				);
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('ln-x-squared-over-x');
			});

			it('returns 0 for (ln(x))²/x limit', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'ln-x-squared-over-x')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(isNumber(value)).toBe(true);
				if (isNumber(value)) {
					expect(value.value).toBe('0');
				}
			});
		});

		describe('e^x/x^n en +∞', () => {
			it('matches e^x/x as x → +∞', () => {
				const expr = divide(func('exp', [variable('x')]), variable('x'), 'fraction');
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('exp-x-over-x');
			});

			it('matches e^x/x² as x → +∞', () => {
				const expr = divide(
					func('exp', [variable('x')]),
					power(variable('x'), number('2')),
					'fraction'
				);
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('exp-x-over-x-squared');
			});

			it('matches e^x/x³ as x → +∞', () => {
				const expr = divide(
					func('exp', [variable('x')]),
					power(variable('x'), number('3')),
					'fraction'
				);
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('exp-x-over-x-cubed');
			});

			it('returns +∞ for e^x/x limit', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'exp-x-over-x')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(value.type).toBe('infinity');
				if (value.type === 'infinity') {
					expect(value.sign).toBe('positive');
				}
			});
		});

		describe('x·e^x en -∞', () => {
			it('matches x·e^x as x → -∞ (implicit)', () => {
				const expr = multiply(variable('x'), func('exp', [variable('x')]), 'implicit');
				const match = matchKnownLimit(expr, negativeInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-exp-x-at-neg-infinity');
			});

			it('matches x×e^x as x → -∞ (explicit)', () => {
				const expr = multiply(variable('x'), func('exp', [variable('x')]), 'explicit');
				const match = matchKnownLimit(expr, negativeInfinity(), 'x');
				expect(match).not.toBeNull();
				// Both implicit and explicit patterns return 0, so either match is valid
				expect(match?.id).toMatch(/^x-exp-x-at-neg-infinity/);
			});

			it('returns 0 for x·e^x limit at -∞', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'x-exp-x-at-neg-infinity')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(isNumber(value)).toBe(true);
				if (isNumber(value)) {
					expect(value.value).toBe('0');
				}
			});
		});

		describe('x²·e^x en -∞', () => {
			it('matches x²·e^x as x → -∞', () => {
				const expr = multiply(
					power(variable('x'), number('2')),
					func('exp', [variable('x')]),
					'implicit'
				);
				const match = matchKnownLimit(expr, negativeInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-squared-exp-x-at-neg-infinity');
			});

			it('returns 0 for x²·e^x limit at -∞', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'x-squared-exp-x-at-neg-infinity')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(isNumber(value)).toBe(true);
				if (isNumber(value)) {
					expect(value.value).toBe('0');
				}
			});
		});

		describe('x·e^(-x) en +∞', () => {
			it('matches x·e^(-x) as x → +∞', () => {
				const expr = multiply(
					variable('x'),
					func('exp', [{ type: 'opposite', operand: variable('x') }]),
					'implicit'
				);
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-exp-neg-x-at-infinity');
			});

			it('returns 0 for x·e^(-x) limit at +∞', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'x-exp-neg-x-at-infinity')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(isNumber(value)).toBe(true);
				if (isNumber(value)) {
					expect(value.value).toBe('0');
				}
			});
		});

		describe('x²·e^(-x) en +∞', () => {
			it('matches x²·e^(-x) as x → +∞', () => {
				const expr = multiply(
					power(variable('x'), number('2')),
					func('exp', [{ type: 'opposite', operand: variable('x') }]),
					'implicit'
				);
				const match = matchKnownLimit(expr, positiveInfinity(), 'x');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-squared-exp-neg-x-at-infinity');
			});

			it('returns 0 for x²·e^(-x) limit at +∞', () => {
				const entry = KNOWN_LIMITS.find((l) => l.id === 'x-squared-exp-neg-x-at-infinity')!;
				const value = getKnownLimitValue(entry, 'x');
				expect(isNumber(value)).toBe(true);
				if (isNumber(value)) {
					expect(value.value).toBe('0');
				}
			});
		});

		describe('with different variable names', () => {
			it('matches t·ln(t) as t → 0⁺', () => {
				const expr = multiply(variable('t'), func('ln', [variable('t')]), 'implicit');
				const match = matchKnownLimit(expr, number('0'), 't', 'right');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-ln-x-at-zero');
			});

			it('matches u²/e^u as u → +∞', () => {
				const expr = divide(
					power(variable('u'), number('2')),
					func('exp', [variable('u')]),
					'fraction'
				);
				const match = matchKnownLimit(expr, positiveInfinity(), 'u');
				expect(match).not.toBeNull();
				expect(match?.id).toBe('x-squared-over-exp-x');
			});
		});
	});
});
