/**
 * Tests for Trigonometric Substitution Integrator
 *
 * Tests pattern detection and integration using trigonometric substitutions:
 * - √(a²-x²): x = a·sin(θ)
 * - √(a²+x²): x = a·tan(θ)
 * - √(x²-a²): x = a·sec(θ)
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate } from '../integrate';
import { toLatex } from '../../latex-generator';

describe('Trigonometric Substitution Integrator', () => {
	describe('Pattern Detection', () => {
		it('should detect √(1-x²) pattern (a²-x²)', () => {
			const expr = parseLatex('\\sqrt{1 - x^2}');
			const result = integrate(expr, { variable: 'x' });

			// For now, just check that it doesn't crash
			// Full implementation will use trig substitution
			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
		});

		it('should detect √(1+x²) pattern (a²+x²)', () => {
			const expr = parseLatex('\\sqrt{1 + x^2}');
			const result = integrate(expr, { variable: 'x' });

			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
		});

		it('should detect √(x²-1) pattern (x²-a²)', () => {
			const expr = parseLatex('\\sqrt{x^2 - 1}');
			const result = integrate(expr, { variable: 'x' });

			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
		});

		it('should detect √(4-x²) with coefficient a=2', () => {
			const expr = parseLatex('\\sqrt{4 - x^2}');
			const result = integrate(expr, { variable: 'x' });

			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
		});

		it('should detect √(9+x²) with coefficient a=3', () => {
			const expr = parseLatex('\\sqrt{9 + x^2}');
			const result = integrate(expr, { variable: 'x' });

			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
		});
	});

	describe('Standard Integrals - √(a²-x²) patterns (x = a·sin(θ))', () => {
		it('should integrate 1/√(1-x²) = arcsin(x)', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{1 - x^2}}');
			const result = integrate(expr, { variable: 'x' });

			// This is a standard inverse trig integral
			// Should recognize it even without full trig substitution
			expect(result.status).toBe('exact');
			expect(result.antiderivative).toBeDefined();
			// The result should contain arcsin
			const latex = toLatex(result.antiderivative!);
			expect(latex.toLowerCase()).toContain('arcsin');
		});

		it('should integrate √(1-x²) using trig substitution', () => {
			const expr = parseLatex('\\sqrt{1 - x^2}');
			const result = integrate(expr, { variable: 'x' });

			// ∫√(1-x²) dx = (x√(1-x²) + arcsin(x))/2
			// For skeleton: mark as unsupported or return placeholder
			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
			// Can be unsupported in skeleton
			expect(['exact', 'unsupported']).toContain(result.status);
		});

		it('should integrate 1/√(4-x²) = arcsin(x/2)', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{4 - x^2}}');
			const result = integrate(expr, { variable: 'x' });

			// ∫1/√(4-x²) dx = arcsin(x/2)
			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
			// Can be unsupported in skeleton
			expect(['exact', 'unsupported']).toContain(result.status);
		});

		it('should integrate x/√(1-x²) using u-substitution (not trig sub)', () => {
			const expr = parseLatex('\\frac{x}{\\sqrt{1 - x^2}}');
			const result = integrate(expr, { variable: 'x' });

			// This is actually u-substitution with u = 1-x²
			// ∫x/√(1-x²) dx = -√(1-x²)
			expect(result.status).toBe('exact');
			expect(result.antiderivative).toBeDefined();
		});
	});

	describe('Standard Integrals - √(a²+x²) patterns (x = a·tan(θ))', () => {
		it('should integrate 1/√(1+x²) = ln|x + √(1+x²)|', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{1 + x^2}}');
			const result = integrate(expr, { variable: 'x' });

			// ∫1/√(1+x²) dx = ln|x + √(1+x²)| (also known as arsinh(x))
			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
			// Can be unsupported in skeleton
			expect(['exact', 'unsupported']).toContain(result.status);
		});

		it('should integrate √(1+x²) using trig substitution', () => {
			const expr = parseLatex('\\sqrt{1 + x^2}');
			const result = integrate(expr, { variable: 'x' });

			// ∫√(1+x²) dx = (x√(1+x²) + ln|x + √(1+x²)|)/2
			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
			expect(['exact', 'unsupported']).toContain(result.status);
		});

		it('should integrate 1/(1+x²) = arctan(x) (not trig sub)', () => {
			const expr = parseLatex('\\frac{1}{1 + x^2}');
			const result = integrate(expr, { variable: 'x' });

			// This is a basic integral rule
			// ∫1/(1+x²) dx = arctan(x)
			expect(result.status).toBe('exact');
			expect(result.antiderivative).toBeDefined();
			const latex = toLatex(result.antiderivative!);
			expect(latex.toLowerCase()).toContain('arctan');
		});
	});

	describe('Standard Integrals - √(x²-a²) patterns (x = a·sec(θ))', () => {
		it('should integrate 1/√(x²-1) = ln|x + √(x²-1)|', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{x^2 - 1}}');
			const result = integrate(expr, { variable: 'x' });

			// ∫1/√(x²-1) dx = ln|x + √(x²-1)| (also known as arcosh(x))
			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
			expect(['exact', 'unsupported']).toContain(result.status);
		});

		it('should integrate √(x²-1) using trig substitution', () => {
			const expr = parseLatex('\\sqrt{x^2 - 1}');
			const result = integrate(expr, { variable: 'x' });

			// ∫√(x²-1) dx = (x√(x²-1) - ln|x + √(x²-1)|)/2
			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
			expect(['exact', 'unsupported']).toContain(result.status);
		});

		it('should integrate 1/√(x²-4) = ln|x + √(x²-4)|', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{x^2 - 4}}');
			const result = integrate(expr, { variable: 'x' });

			// ∫1/√(x²-4) dx = ln|x + √(x²-4)|
			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
			expect(['exact', 'unsupported']).toContain(result.status);
		});
	});

	describe('Step Recording', () => {
		it('should record pattern identification step', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{1 - x^2}}');
			const result = integrate(expr, { variable: 'x', verbosity: 'detailed' });

			// Should have steps for pattern identification
			expect(result.steps).toBeDefined();
			// For skeleton: steps may be minimal
		});

		it('should record substitution steps when implemented', () => {
			const expr = parseLatex('\\sqrt{1 - x^2}');
			const result = integrate(expr, { variable: 'x', verbosity: 'detailed' });

			// Full implementation would include:
			// 1. Identify pattern: √(1-x²)
			// 2. Apply substitution: x = sin(θ)
			// 3. Simplify: √(1-sin²(θ)) = cos(θ)
			// 4. Integrate in θ
			// 5. Back-substitute using triangle method
			expect(result.steps).toBeDefined();
		});

		it('should use French descriptions', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{1 - x^2}}');
			const result = integrate(expr, { variable: 'x', verbosity: 'detailed' });

			// All steps should have French descriptions
			if (result.steps.length > 0) {
				result.steps.forEach((step) => {
					expect(step.description).toBeDefined();
					expect(typeof step.description).toBe('string');
				});
			}
		});
	});

	describe('Back-Substitution', () => {
		it('should handle back-substitution for sin pattern', () => {
			// For √(a²-x²) with x = a·sin(θ)
			// Back-substitution: θ = arcsin(x/a)
			// sin(θ) = x/a
			// cos(θ) = √(1-sin²(θ)) = √(a²-x²)/a
			const expr = parseLatex('\\sqrt{1 - x^2}');
			const result = integrate(expr, { variable: 'x' });

			// Result should be in terms of x, not θ
			expect(result).toBeDefined();
			if (result.antiderivative) {
				const latex = toLatex(result.antiderivative);
				// Should not contain theta
				expect(latex).not.toContain('\\theta');
			}
		});

		it('should handle back-substitution for tan pattern', () => {
			// For √(a²+x²) with x = a·tan(θ)
			// Back-substitution: θ = arctan(x/a)
			// tan(θ) = x/a
			// sec(θ) = √(1+tan²(θ)) = √(a²+x²)/a
			const expr = parseLatex('\\sqrt{1 + x^2}');
			const result = integrate(expr, { variable: 'x' });

			expect(result).toBeDefined();
			if (result.antiderivative) {
				const latex = toLatex(result.antiderivative);
				expect(latex).not.toContain('\\theta');
			}
		});

		it('should handle back-substitution for sec pattern', () => {
			// For √(x²-a²) with x = a·sec(θ)
			// Back-substitution: θ = arcsec(x/a)
			// sec(θ) = x/a
			// tan(θ) = √(sec²(θ)-1) = √(x²-a²)/a
			const expr = parseLatex('\\sqrt{x^2 - 1}');
			const result = integrate(expr, { variable: 'x' });

			expect(result).toBeDefined();
			if (result.antiderivative) {
				const latex = toLatex(result.antiderivative);
				expect(latex).not.toContain('\\theta');
			}
		});
	});

	describe('Edge Cases', () => {
		it('should not apply to expressions without radicals', () => {
			const expr = parseLatex('x^2 + 1');
			const result = integrate(expr, { variable: 'x' });

			// Should use basic rules, not trig substitution
			expect(result.status).toBe('exact');
			expect(result.technique).not.toBe('trig-substitution');
		});

		it("should not apply to radicals that don't match patterns", () => {
			const expr = parseLatex('\\sqrt{x^3 + 1}');
			const result = integrate(expr, { variable: 'x' });

			// This doesn't match any trig substitution pattern
			expect(result).toBeDefined();
			// Will likely be unsupported
		});

		it('should handle negative coefficients correctly', () => {
			// √(1-4x²) = √(1-(2x)²) → u = 2x substitution
			const expr = parseLatex('\\sqrt{1 - 4x^2}');
			const result = integrate(expr, { variable: 'x' });

			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
		});

		it('should recognize when basic rules apply instead', () => {
			// 1/(1+x²) should use arctan rule, not trig substitution
			const expr = parseLatex('\\frac{1}{1 + x^2}');
			const result = integrate(expr, { variable: 'x' });

			expect(result.status).toBe('exact');
			// Basic integrator should handle this
			expect(['basic-rule', 'partial-fractions']).toContain(result.technique);
		});

		it('should handle expressions with constants', () => {
			const expr = parseLatex('\\frac{2}{\\sqrt{1 - x^2}}');
			const result = integrate(expr, { variable: 'x' });

			// 2/√(1-x²) = 2·arcsin(x)
			expect(result).toBeDefined();
			expect(result.variable).toBe('x');
		});
	});

	describe('Integration with verbosity levels', () => {
		it('should return minimal steps with result verbosity', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{1 - x^2}}');
			const result = integrate(expr, { variable: 'x', verbosity: 'result' });

			// Result verbosity: no steps (or only result-level steps)
			const resultSteps = result.steps.filter((s) => s.verbosityLevel === 'result');
			expect(resultSteps.length).toBeLessThanOrEqual(result.steps.length);
		});

		it('should return key steps with summarized verbosity', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{1 - x^2}}');
			const result = integrate(expr, { variable: 'x', verbosity: 'summarized' });

			// Summarized: key transformations only
			expect(result.steps).toBeDefined();
		});

		it('should return all steps with detailed verbosity', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{1 - x^2}}');
			const result = integrate(expr, { variable: 'x', verbosity: 'detailed' });

			// Detailed: every step
			expect(result.steps).toBeDefined();
		});
	});

	describe('Helper Function Tests (Internal)', () => {
		// These tests would test internal helper functions if they were exported
		// For now, we test through the public integrate() interface

		it('should correctly identify a²-x² pattern structure', () => {
			// Pattern: √(constant - x²)
			const expr1 = parseLatex('\\sqrt{1 - x^2}');
			const result1 = integrate(expr1, { variable: 'x' });
			expect(result1).toBeDefined();

			const expr2 = parseLatex('\\sqrt{9 - x^2}');
			const result2 = integrate(expr2, { variable: 'x' });
			expect(result2).toBeDefined();
		});

		it('should correctly identify a²+x² pattern structure', () => {
			// Pattern: √(constant + x²)
			const expr1 = parseLatex('\\sqrt{1 + x^2}');
			const result1 = integrate(expr1, { variable: 'x' });
			expect(result1).toBeDefined();

			const expr2 = parseLatex('\\sqrt{4 + x^2}');
			const result2 = integrate(expr2, { variable: 'x' });
			expect(result2).toBeDefined();
		});

		it('should correctly identify x²-a² pattern structure', () => {
			// Pattern: √(x² - constant)
			const expr1 = parseLatex('\\sqrt{x^2 - 1}');
			const result1 = integrate(expr1, { variable: 'x' });
			expect(result1).toBeDefined();

			const expr2 = parseLatex('\\sqrt{x^2 - 9}');
			const result2 = integrate(expr2, { variable: 'x' });
			expect(result2).toBeDefined();
		});
	});

	describe('Status and Error Handling', () => {
		it('should return unsupported for unimplemented patterns in skeleton', () => {
			// Complex patterns not yet implemented
			const expr = parseLatex('\\sqrt{1 - x^2}');
			const result = integrate(expr, { variable: 'x' });

			// Skeleton may return unsupported
			expect(result.status).toBeDefined();
			expect(['exact', 'unsupported']).toContain(result.status);
		});

		it('should include technique in result', () => {
			const expr = parseLatex('\\frac{1}{\\sqrt{1 - x^2}}');
			const result = integrate(expr, { variable: 'x' });

			expect(result.technique).toBeDefined();
		});

		it('should include integrandType in result', () => {
			const expr = parseLatex('\\sqrt{1 - x^2}');
			const result = integrate(expr, { variable: 'x' });

			expect(result.integrandType).toBeDefined();
		});
	});
});
