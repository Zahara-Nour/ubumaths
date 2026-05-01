/**
 * Tests for improperIntegrate — V5 improper integrals (Phase 3).
 *
 * Spec: docs/wip/geometry/improper-integrals-study.md §2.2.
 *
 * The 8 pedagogical cases:
 *   1. ∫₀^+∞ e^{-x} dx = 1
 *   2. ∫₋∞^+∞ e^{-x²} dx = √π
 *   3. ∫₋∞^+∞ 1/(1+x²) dx = π
 *   4. ∫₁^+∞ 1/x² dx = 1
 *   5. ∫₁^+∞ 1/x dx → divergent
 *   6. ∫₀^+∞ sin(x) dx → divergent (oscillation)
 *   7. ∫₁^+∞ |1/x²| dx = 1   (aire mode — caller responsibility)
 *   8. ∫₀^+∞ |e^{-x}| dx = 1
 */
import { describe, it, expect } from 'vitest';
import { improperIntegrate } from '../improper';
import { variable, number, exp, power, divide, opposite, add, sin, abs } from '../../factory';
import type { MathNode } from '../../types';

const x = (): MathNode => variable('x');

describe('improperIntegrate — convergent cases', () => {
	it('case 1: ∫₀^+∞ e^{-x} dx = 1', () => {
		// expr = exp(-x)
		const expr = exp(opposite(x()));
		const r = improperIntegrate(expr, 'x', 0, Infinity);
		expect(r.status).toBe('convergent');
		expect(r.value).toBeCloseTo(1, 4);
	});

	it('case 2: ∫₋∞^+∞ e^{-x²} dx = √π', () => {
		// expr = exp(-(x²)) — note: e^{-x²}
		const expr = exp(opposite(power(x(), number('2'))));
		const r = improperIntegrate(expr, 'x', -Infinity, Infinity);
		expect(r.status).toBe('convergent');
		expect(r.value).toBeCloseTo(Math.sqrt(Math.PI), 4);
	});

	it('case 3: ∫₋∞^+∞ 1/(1+x²) dx = π', () => {
		// expr = 1 / (1 + x²)
		const expr = divide(number('1'), add(number('1'), power(x(), number('2'))));
		const r = improperIntegrate(expr, 'x', -Infinity, Infinity);
		expect(r.status).toBe('convergent');
		expect(r.value).toBeCloseTo(Math.PI, 4);
	});

	it('case 4: ∫₁^+∞ 1/x² dx = 1', () => {
		const expr = divide(number('1'), power(x(), number('2')));
		const r = improperIntegrate(expr, 'x', 1, Infinity);
		expect(r.status).toBe('convergent');
		expect(r.value).toBeCloseTo(1, 4);
	});

	it('case 7: ∫₁^+∞ |1/x²| dx = 1', () => {
		const expr = abs(divide(number('1'), power(x(), number('2'))));
		const r = improperIntegrate(expr, 'x', 1, Infinity);
		expect(r.status).toBe('convergent');
		expect(r.value).toBeCloseTo(1, 4);
	});

	it('case 8: ∫₀^+∞ |e^{-x}| dx = 1', () => {
		const expr = abs(exp(opposite(x())));
		const r = improperIntegrate(expr, 'x', 0, Infinity);
		expect(r.status).toBe('convergent');
		expect(r.value).toBeCloseTo(1, 4);
	});
});

describe('improperIntegrate — divergent cases', () => {
	it('case 5: ∫₁^+∞ 1/x dx → divergent', () => {
		const expr = divide(number('1'), x());
		const r = improperIntegrate(expr, 'x', 1, Infinity);
		expect(r.status).toBe('divergent');
		expect(Number.isNaN(r.value)).toBe(true);
	});

	it('case 6: ∫₀^+∞ sin(x) dx → divergent (oscillation)', () => {
		const expr = sin(x());
		const r = improperIntegrate(expr, 'x', 0, Infinity);
		expect(r.status).toBe('divergent');
		expect(Number.isNaN(r.value)).toBe(true);
	});

	it('∫₀^+∞ x² dx → divergent (polynomial growth)', () => {
		const expr = power(x(), number('2'));
		const r = improperIntegrate(expr, 'x', 0, Infinity);
		expect(r.status).toBe('divergent');
		expect(Number.isNaN(r.value)).toBe(true);
	});

	it('∫₀^+∞ exp(x) dx → divergent (exponential growth)', () => {
		const expr = exp(x());
		const r = improperIntegrate(expr, 'x', 0, Infinity);
		expect(r.status).toBe('divergent');
		expect(Number.isNaN(r.value)).toBe(true);
	});
});

describe('improperIntegrate — left-infinite branch', () => {
	it('∫_-∞^0 e^x dx = 1 (mirror of case 1)', () => {
		// e^x → as x → -∞, e^x → 0. ∫_-∞^0 e^x dx = e^0 - e^{-∞} = 1.
		const expr = exp(x());
		const r = improperIntegrate(expr, 'x', -Infinity, 0);
		expect(r.status).toBe('convergent');
		expect(r.value).toBeCloseTo(1, 4);
	});

	it('∫_-∞^-1 1/x² dx = 1 (mirror of case 4)', () => {
		const expr = divide(number('1'), power(x(), number('2')));
		const r = improperIntegrate(expr, 'x', -Infinity, -1);
		expect(r.status).toBe('convergent');
		expect(r.value).toBeCloseTo(1, 4);
	});
});

describe('improperIntegrate — sign and orientation', () => {
	it('∫₀^+∞ -e^{-x} dx = -1 (sign preservation)', () => {
		const expr = opposite(exp(opposite(x())));
		const r = improperIntegrate(expr, 'x', 0, Infinity);
		expect(r.status).toBe('convergent');
		expect(r.value).toBeCloseTo(-1, 4);
	});
});

describe('improperIntegrate — bound validation', () => {
	it('throws when both bounds are finite (use numericIntegrate instead)', () => {
		const expr = exp(opposite(x()));
		expect(() => improperIntegrate(expr, 'x', 0, 5)).toThrow(/finite/i);
	});

	it('returns 0 when a === b = ±∞ (degenerate empty-interval convention)', () => {
		const expr = exp(opposite(x()));
		const r = improperIntegrate(expr, 'x', Infinity, Infinity);
		expect(r.status).toBe('convergent');
		expect(r.value).toBe(0);
	});
});

describe('improperIntegrate — performance', () => {
	it('all 8 pedagogical cases complete under 50 ms each', () => {
		const cases: Array<{ name: string; expr: MathNode; a: number; b: number }> = [
			{ name: '1: e^{-x}', expr: exp(opposite(x())), a: 0, b: Infinity },
			{
				name: '2: e^{-x²}',
				expr: exp(opposite(power(x(), number('2')))),
				a: -Infinity,
				b: Infinity
			},
			{
				name: '3: 1/(1+x²)',
				expr: divide(number('1'), add(number('1'), power(x(), number('2')))),
				a: -Infinity,
				b: Infinity
			},
			{ name: '4: 1/x²', expr: divide(number('1'), power(x(), number('2'))), a: 1, b: Infinity },
			{ name: '5: 1/x', expr: divide(number('1'), x()), a: 1, b: Infinity },
			{ name: '6: sin(x)', expr: sin(x()), a: 0, b: Infinity },
			{
				name: '7: |1/x²|',
				expr: abs(divide(number('1'), power(x(), number('2')))),
				a: 1,
				b: Infinity
			},
			{ name: '8: |e^{-x}|', expr: abs(exp(opposite(x()))), a: 0, b: Infinity }
		];

		for (const c of cases) {
			const t0 = performance.now();
			improperIntegrate(c.expr, 'x', c.a, c.b);
			const dt = performance.now() - t0;
			expect(dt).toBeLessThan(50);
		}
	});
});
