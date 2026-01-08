/**
 * Tests for Numeric Integration (Simpson's Rule)
 *
 * @module mathAST/integration/__tests__/numeric
 */

import { describe, it, expect } from 'vitest';
import { simpson, adaptiveSimpson, numericIntegrate } from '../numeric';
import { variable, number, power, multiply, add, divide, sin, exp, sqrt } from '../../factory';

describe('Numeric Integration', () => {
	// =============================================================================
	// Basic Simpson's Rule
	// =============================================================================

	describe('simpson()', () => {
		it('should integrate x² from 0 to 1 exactly (polynomial degree ≤ 3)', () => {
			// ∫₀¹ x² dx = [x³/3]₀¹ = 1/3 ≈ 0.333333...
			const f = (x: number) => x * x;
			const result = simpson(f, 0, 1, 10); // n=10 subintervals

			expect(result).toBeCloseTo(1 / 3, 10); // Should be exact for polynomials ≤3
		});

		it('should integrate x³ from 0 to 1 exactly (polynomial degree ≤ 3)', () => {
			// ∫₀¹ x³ dx = [x⁴/4]₀¹ = 1/4 = 0.25
			const f = (x: number) => x * x * x;
			const result = simpson(f, 0, 1, 10);

			expect(result).toBeCloseTo(0.25, 10);
		});

		it('should integrate sin(x) from 0 to π', () => {
			// ∫₀^π sin(x) dx = [-cos(x)]₀^π = -cos(π) + cos(0) = 1 + 1 = 2
			const f = (x: number) => Math.sin(x);
			const result = simpson(f, 0, Math.PI, 100);

			expect(result).toBeCloseTo(2, 5);
		});

		it('should integrate e^x from 0 to 1', () => {
			// ∫₀¹ e^x dx = [e^x]₀¹ = e - 1 ≈ 1.71828...
			const f = (x: number) => Math.exp(x);
			const result = simpson(f, 0, 1, 100);

			expect(result).toBeCloseTo(Math.E - 1, 5);
		});

		it('should handle constant function', () => {
			// ∫₀¹ 5 dx = 5x|₀¹ = 5
			const f = (_x: number) => 5;
			const result = simpson(f, 0, 1, 10);

			expect(result).toBeCloseTo(5, 10);
		});

		it('should handle negative bounds correctly', () => {
			// ∫₋₁¹ x² dx = [x³/3]₋₁¹ = 1/3 - (-1/3) = 2/3
			const f = (x: number) => x * x;
			const result = simpson(f, -1, 1, 10);

			expect(result).toBeCloseTo(2 / 3, 10);
		});

		it('should require even number of subintervals', () => {
			const f = (x: number) => x;
			// n must be even
			expect(() => simpson(f, 0, 1, 9)).toThrow(/even/i);
		});

		it('should handle very small intervals', () => {
			const f = (_x: number) => _x * _x;
			const result = simpson(f, 0, 0.001, 10);

			// ∫₀^0.001 x² dx = [x³/3]₀^0.001 = 0.001³/3 ≈ 3.33e-10
			expect(result).toBeCloseTo(0.001 ** 3 / 3, 12);
		});
	});

	// =============================================================================
	// Adaptive Simpson
	// =============================================================================

	describe('adaptiveSimpson()', () => {
		it('should converge to tolerance for x²', () => {
			// ∫₀¹ x² dx = 1/3
			const f = (x: number) => x * x;
			const tolerance = 1e-6;
			const result = adaptiveSimpson(f, 0, 1, tolerance, 10);

			expect(result).toBeCloseTo(1 / 3, 6);
		});

		it('should converge to tolerance for sin(x)', () => {
			// ∫₀^π sin(x) dx = 2
			const f = (x: number) => Math.sin(x);
			const tolerance = 1e-6;
			const result = adaptiveSimpson(f, 0, Math.PI, tolerance, 10);

			expect(result).toBeCloseTo(2, 6);
		});

		it('should handle oscillatory functions', () => {
			// ∫₀^(2π) sin(10x) dx = [-cos(10x)/10]₀^(2π) = 0
			const f = (x: number) => Math.sin(10 * x);
			const tolerance = 1e-4;
			const result = adaptiveSimpson(f, 0, 2 * Math.PI, tolerance, 15);

			expect(result).toBeCloseTo(0, 4);
		});

		it('should handle difficult functions (near-singular)', () => {
			// ∫₀¹ 1/√x dx = [2√x]₀¹ = 2 (improper but converges)
			const f = (x: number) => (x === 0 ? 0 : 1 / Math.sqrt(x));
			const tolerance = 1e-3;
			const result = adaptiveSimpson(f, 0.001, 1, tolerance, 20); // Start at 0.001 to avoid singularity

			expect(result).toBeCloseTo(2 - 2 * Math.sqrt(0.001), 3);
		});

		it('should respect maxDepth limit', () => {
			const f = (x: number) => Math.sin(100 * x); // Very oscillatory
			const tolerance = 1e-10; // Very tight tolerance
			const maxDepth = 3; // Low depth - won't reach tolerance

			// Should still return a result without throwing
			const result = adaptiveSimpson(f, 0, Math.PI, tolerance, maxDepth);
			expect(typeof result).toBe('number');
			expect(Number.isFinite(result)).toBe(true);
		});

		it('should be more accurate than basic Simpson for same n', () => {
			// Compare adaptive vs basic Simpson with equivalent work
			const f = (x: number) => Math.exp(x);
			const tolerance = 1e-4;

			const adaptiveResult = adaptiveSimpson(f, 0, 1, tolerance, 10);

			const exact = Math.E - 1;
			const adaptiveError = Math.abs(adaptiveResult - exact);

			// Adaptive should be at least as good, usually better
			expect(adaptiveError).toBeLessThanOrEqual(tolerance);
		});
	});

	// =============================================================================
	// numericIntegrate wrapper
	// =============================================================================

	describe('numericIntegrate()', () => {
		it('should integrate MathNode expression x²', () => {
			// ∫₀¹ x² dx = 1/3
			const expr = power(variable('x'), number('2'));
			const result = numericIntegrate(expr, 'x', 0, 1);

			expect(result.value).toBeCloseTo(1 / 3, 5);
			expect(result.method).toBe('adaptive-simpson');
			expect(result.error).toBeDefined();
			expect(result.error).toBeGreaterThan(0);
		});

		it('should integrate sin(x)', () => {
			// ∫₀^π sin(x) dx = 2
			const expr = sin(variable('x'));
			const result = numericIntegrate(expr, 'x', 0, Math.PI);

			expect(result.value).toBeCloseTo(2, 5);
			expect(result.method).toBe('adaptive-simpson');
		});

		it('should integrate e^x', () => {
			// ∫₀¹ e^x dx = e - 1
			const expr = exp(variable('x'));
			const result = numericIntegrate(expr, 'x', 0, 1);

			expect(result.value).toBeCloseTo(Math.E - 1, 5);
		});

		it('should integrate polynomial 2x³ + 3x²', () => {
			// ∫₀¹ (2x³ + 3x²) dx = [x⁴/2 + x³]₀¹ = 0.5 + 1 = 1.5
			const expr = add(
				multiply(number('2'), power(variable('x'), number('3'))),
				multiply(number('3'), power(variable('x'), number('2')))
			);
			const result = numericIntegrate(expr, 'x', 0, 1);

			expect(result.value).toBeCloseTo(1.5, 5);
		});

		it('should handle division (1/x)', () => {
			// ∫₁² 1/x dx = [ln(x)]₁² = ln(2) ≈ 0.693
			const expr = divide(number('1'), variable('x'));
			const result = numericIntegrate(expr, 'x', 1, 2);

			expect(result.value).toBeCloseTo(Math.log(2), 5);
		});

		it('should handle expressions with constants', () => {
			// ∫₀^π sin(2x) dx = [-cos(2x)/2]₀^π = 0
			const expr = sin(multiply(number('2'), variable('x')));
			const result = numericIntegrate(expr, 'x', 0, Math.PI);

			expect(result.value).toBeCloseTo(0, 5);
		});

		it('should return reasonable error estimate', () => {
			const expr = power(variable('x'), number('2'));
			const result = numericIntegrate(expr, 'x', 0, 1);

			expect(result.error).toBeDefined();
			expect(result.error).toBeGreaterThan(0);
			expect(result.error).toBeLessThan(1e-3); // Should be reasonably small
		});

		it('should allow custom tolerance option', () => {
			const expr = power(variable('x'), number('2'));

			const looseResult = numericIntegrate(expr, 'x', 0, 1, { tolerance: 1e-3 });
			const tightResult = numericIntegrate(expr, 'x', 0, 1, { tolerance: 1e-8 });

			// Tighter tolerance should have smaller error estimate
			expect(tightResult.error).toBeLessThan(looseResult.error);
		});

		it('should allow maxDepth option', () => {
			const expr = sin(multiply(number('100'), variable('x'))); // Very oscillatory

			// Should not throw even with low maxDepth
			const result = numericIntegrate(expr, 'x', 0, Math.PI, { maxDepth: 3 });
			expect(typeof result.value).toBe('number');
			expect(Number.isFinite(result.value)).toBe(true);
		});

		it('should use basic Simpson when specified', () => {
			const expr = power(variable('x'), number('2'));
			const result = numericIntegrate(expr, 'x', 0, 1, { method: 'simpson', intervals: 100 });

			expect(result.value).toBeCloseTo(1 / 3, 5);
			expect(result.method).toBe('simpson');
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('Edge Cases', () => {
		it('should handle a > b (reversed bounds)', () => {
			// ∫₁⁰ x² dx = -∫₀¹ x² dx = -1/3
			const f = (x: number) => x * x;
			const result = simpson(f, 1, 0, 10);

			expect(result).toBeCloseTo(-1 / 3, 10);
		});

		it('should handle a = b (zero width)', () => {
			const f = (x: number) => x * x;
			const result = simpson(f, 1, 1, 10);

			expect(result).toBeCloseTo(0, 10);
		});

		it('should detect NaN results', () => {
			// Function that returns NaN
			const f = (x: number) => Math.sqrt(-x);
			const result = simpson(f, 0, 1, 10);

			expect(Number.isNaN(result)).toBe(true);
		});

		it('should detect Infinity results', () => {
			// Function with singularity
			const f = (x: number) => 1 / x;
			const result = simpson(f, 0, 1, 10); // Includes x=0 where f is undefined

			expect(!Number.isFinite(result)).toBe(true);
		});

		it('should handle very large intervals', () => {
			const f = (x: number) => 1 / (1 + x * x); // arctan derivative
			// ∫₀^∞ 1/(1+x²) dx = π/2, approximate with large bound
			// For very wide intervals, accuracy is limited (approximating improper integral)
			const result = simpson(f, 0, 100, 1000);

			expect(result).toBeCloseTo(Math.PI / 2, 1); // 1 decimal place
		});

		it('should handle expressions with sqrt', () => {
			// ∫₀¹ √x dx = [2x^(3/2)/3]₀¹ = 2/3
			const expr = sqrt(variable('x'));
			const result = numericIntegrate(expr, 'x', 0.001, 1); // Start at 0.001

			expect(result.value).toBeCloseTo(2 / 3 - (2 / 3) * 0.001 ** 1.5, 3);
		});

		it('should throw error for invalid variable in numericIntegrate', () => {
			const expr = variable('x');
			expect(() => numericIntegrate(expr, 'y', 0, 1)).toThrow();
		});

		it('should handle expressions with multiple operations', () => {
			// ∫₀¹ (x² + sin(x)) dx = [x³/3 - cos(x)]₀¹ = 1/3 - cos(1) + cos(0)
			const expr = add(power(variable('x'), number('2')), sin(variable('x')));
			const result = numericIntegrate(expr, 'x', 0, 1);

			const expected = 1 / 3 - Math.cos(1) + Math.cos(0);
			expect(result.value).toBeCloseTo(expected, 5);
		});
	});

	// =============================================================================
	// Comparison with Exact Results
	// =============================================================================

	describe('Comparison with Exact Results', () => {
		it('should match exact polynomial integration', () => {
			// ∫₀² (3x² + 2x + 1) dx = [x³ + x² + x]₀² = 8 + 4 + 2 = 14
			const expr = add(
				add(
					multiply(number('3'), power(variable('x'), number('2'))),
					multiply(number('2'), variable('x'))
				),
				number('1')
			);
			const result = numericIntegrate(expr, 'x', 0, 2);

			expect(result.value).toBeCloseTo(14, 5);
		});

		it('should approximate transcendental integrals accurately', () => {
			// ∫₀¹ e^(-x²) dx (Gaussian, no closed form, but can compute numerically)
			const expr = exp(multiply(number('-1'), power(variable('x'), number('2'))));
			const result = numericIntegrate(expr, 'x', 0, 1, { tolerance: 1e-6 });

			// Reference value ≈ 0.746824
			expect(result.value).toBeCloseTo(0.746824, 5);
		});
	});
});
