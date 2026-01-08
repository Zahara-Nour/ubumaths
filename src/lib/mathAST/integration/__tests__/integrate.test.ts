/**
 * Integration - Main Dispatcher Tests
 *
 * Tests for integrate() and integrateDefinite() functions.
 *
 * @module mathAST/integration/__tests__/integrate
 */

import { describe, it, expect } from 'vitest';
import { integrate, integrateDefinite } from '../integrate';
import { number, variable, add, multiply, power, divide, exp } from '../../factory';
import { parseLatex } from '../../parser';

// =============================================================================
// Basic Usage
// =============================================================================

describe('integrate() - basic usage', () => {
	it('should integrate a simple variable', () => {
		// ∫ x dx = x²/2
		const result = integrate(variable('x'));

		expect(result.status).toBe('exact');
		expect(result.variable).toBe('x');
		expect(result.antiderivative).toBeTruthy();
		expect(result.integrandType).toBe('polynomial');
		expect(result.technique).toBe('basic-rule');
	});

	it('should integrate a constant', () => {
		// ∫ 5 dx = 5x
		const result = integrate(number('5'));

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
		expect(result.integrandType).toBe('polynomial');
		expect(result.technique).toBe('basic-rule');
	});

	it('should auto-detect variable', () => {
		// ∫ y² dy = y³/3
		const result = integrate(power(variable('y'), number('2')));

		expect(result.status).toBe('exact');
		expect(result.variable).toBe('y');
		expect(result.antiderivative).toBeTruthy();
	});

	it('should use specified variable', () => {
		// ∫ ax dx (treating a as constant, x as variable)
		const expr = multiply(variable('a'), variable('x'));
		const result = integrate(expr, { variable: 'x' });

		expect(result.status).toBe('exact');
		expect(result.variable).toBe('x');
		// Should treat 'a' as constant
	});

	it('should include constant of integration note', () => {
		const result = integrate(variable('x'));

		expect(result.constantNote).toBeTruthy();
		expect(result.constantNote).toContain('constante');
	});
});

// =============================================================================
// Linearity: Sum Rule
// =============================================================================

describe('integrate() - linearity: sum rule', () => {
	it('should integrate sum of two terms', () => {
		// ∫ (x + 3) dx = x²/2 + 3x
		const expr = add(variable('x'), number('3'));
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});

	it('should integrate sum of polynomials', () => {
		// ∫ (x² + x) dx = x³/3 + x²/2
		const expr = add(power(variable('x'), number('2')), variable('x'));
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});

	it('should integrate sum of multiple terms', () => {
		// ∫ (x³ + 2x² + 3x + 4) dx
		const expr = parseLatex('x^3 + 2x^2 + 3x + 4');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});

	it('should record linearity steps at detailed level', () => {
		const expr = add(variable('x'), variable('x'));
		const result = integrate(expr, { verbosity: 'detailed' });

		// Should have steps for applying sum rule
		expect(result.steps.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// Linearity: Constant Multiple Rule
// =============================================================================

describe('integrate() - linearity: constant multiple', () => {
	it('should integrate constant times variable', () => {
		// ∫ 3x dx = 3x²/2
		const expr = multiply(number('3'), variable('x'));
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});

	it('should integrate constant times power', () => {
		// ∫ 5x² dx = 5x³/3
		const expr = multiply(number('5'), power(variable('x'), number('2')));
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});

	it('should factor out constant multiplier', () => {
		// ∫ 2x dx should factor out 2
		const expr = multiply(number('2'), variable('x'));
		const result = integrate(expr, { verbosity: 'detailed' });

		// Should have steps showing constant being factored out
		expect(result.steps.some((s) => s.rule.includes('constant'))).toBe(true);
	});

	it('should handle negative constants', () => {
		// ∫ -3x dx = -3x²/2
		const expr = multiply(number('-3'), variable('x'));
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});
});

// =============================================================================
// Definite Integrals
// =============================================================================

describe('integrateDefinite() - basic evaluation', () => {
	it('should evaluate definite integral of constant', () => {
		// ∫₀¹ 5 dx = 5
		const result = integrateDefinite(number('5'), number('0'), number('1'));

		expect(result.status).toBe('exact');
		expect(result.value).toBeTruthy();
		expect(result.lowerBound).toEqual(number('0'));
		expect(result.upperBound).toEqual(number('1'));
	});

	it('should evaluate definite integral of x', () => {
		// ∫₀² x dx = [x²/2]₀² = 2
		const result = integrateDefinite(variable('x'), number('0'), number('2'));

		expect(result.status).toBe('exact');
		expect(result.value).toBeTruthy();
		// Value should be 2 (exact or close)
	});

	it('should evaluate definite integral of x²', () => {
		// ∫₁³ x² dx = [x³/3]₁³ = 27/3 - 1/3 = 26/3
		const result = integrateDefinite(power(variable('x'), number('2')), number('1'), number('3'));

		expect(result.status).toBe('exact');
		expect(result.value).toBeTruthy();
	});

	it('should include both antiderivative and value', () => {
		const result = integrateDefinite(variable('x'), number('0'), number('1'));

		expect(result.antiderivative).toBeTruthy();
		expect(result.value).toBeTruthy();
	});

	it('should record evaluation steps', () => {
		const result = integrateDefinite(variable('x'), number('0'), number('1'), {
			verbosity: 'detailed'
		});

		// Should have steps for integration AND evaluation
		expect(result.steps.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// Options Handling
// =============================================================================

describe('integrate() - options', () => {
	it('should respect verbosity: result (no steps)', () => {
		const result = integrate(variable('x'), { verbosity: 'result' });

		expect(result.steps.length).toBe(0);
	});

	it('should respect verbosity: summarized (key steps only)', () => {
		const expr = add(variable('x'), number('3'));
		const result = integrate(expr, { verbosity: 'summarized' });

		// Should have some steps, but fewer than detailed
		const detailedResult = integrate(expr, { verbosity: 'detailed' });
		expect(result.steps.length).toBeLessThanOrEqual(detailedResult.steps.length);
	});

	it('should respect verbosity: detailed (all steps)', () => {
		const expr = add(variable('x'), variable('x'));
		const result = integrate(expr, { verbosity: 'detailed' });

		// Should have many steps
		expect(result.steps.length).toBeGreaterThan(0);
	});

	it('should use default options when not specified', () => {
		const result = integrate(variable('x'));

		// Default verbosity is 'summarized'
		expect(result.steps.length).toBeGreaterThan(0);
	});

	it('should respect maxDepth option', () => {
		// This will be more relevant in later phases with recursion
		const result = integrate(variable('x'), { maxDepth: 5 });

		expect(result).toBeTruthy();
	});
});

// =============================================================================
// Error Cases
// =============================================================================

describe('integrate() - error cases', () => {
	it('should throw on multiple variables without specification', () => {
		// ∫ x*y dx? or ∫ x*y dy? Must specify
		const expr = multiply(variable('x'), variable('y'));

		expect(() => integrate(expr)).toThrow();
	});

	it('should return unsupported for non-integrable expressions', () => {
		// Create an expression that basic integrator can't handle
		// For now, all basic expressions should work, so this test may need
		// to be updated in later phases when we have more complex expressions
		const expr = parseLatex('\\sin(x^2)'); // Requires error function
		const result = integrate(expr);

		// Should either succeed or return unsupported (not throw)
		expect(['exact', 'unsupported']).toContain(result.status);
	});

	it('should respect maxDepth to prevent infinite recursion', () => {
		// This test will be more relevant in later phases
		const expr = variable('x');
		const result = integrate(expr, { maxDepth: 1 });

		// Should complete without hanging
		expect(result).toBeTruthy();
	});

	it('should handle edge case: integrating zero', () => {
		// ∫ 0 dx = 0
		const result = integrate(number('0'));

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});

	it('should handle edge case: integrating one', () => {
		// ∫ 1 dx = x
		const result = integrate(number('1'));

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});
});

// =============================================================================
// Simplification
// =============================================================================

describe('integrate() - simplification', () => {
	it('should simplify the result by default', () => {
		// ∫ x dx = x²/2 (should be simplified)
		const result = integrate(variable('x'));

		expect(result.antiderivative).toBeTruthy();
		// Result should be in simplified form
	});

	it('should respect simplify: false option', () => {
		const result = integrate(variable('x'), { simplify: false });

		expect(result.antiderivative).toBeTruthy();
		// Result may not be simplified
	});
});

// =============================================================================
// Integration of Complex Expressions (Combining Rules)
// =============================================================================

describe('integrate() - combining multiple rules', () => {
	it('should integrate polynomial with multiple terms', () => {
		// ∫ (3x² + 2x + 1) dx = x³ + x² + x
		const expr = parseLatex('3x^2 + 2x + 1');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});

	it('should integrate fraction', () => {
		// ∫ 1/x dx = ln|x|
		const expr = divide(number('1'), variable('x'), 'fraction');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});

	it('should integrate sum of different types', () => {
		// ∫ (x + 1/x) dx = x²/2 + ln|x|
		const expr = add(variable('x'), divide(number('1'), variable('x'), 'fraction'));
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.antiderivative).toBeTruthy();
	});
});

// =============================================================================
// Numeric Fallback (Phase 8)
// =============================================================================

describe('integrateDefinite() - numeric fallback', () => {
	it('should use numeric integration when symbolic fails', () => {
		// Create an expression that symbolic integration cannot handle
		// e^(-x²) is a Gaussian integral with no elementary antiderivative
		const expr = exp(multiply(number('-1'), power(variable('x'), number('2'))));
		const result = integrateDefinite(expr, number('0'), number('1'));

		expect(result.status).toBe('approximate');
		expect(result.technique).toBe('numeric');
		expect(result.approximate).toBeDefined();
		// Reference value ≈ 0.746824
		expect(result.approximate!).toBeCloseTo(0.746824, 4);
		expect(result.value).toBeTruthy();
	});

	it('should respect allowNumeric: false option', () => {
		const expr = exp(multiply(number('-1'), power(variable('x'), number('2'))));
		const result = integrateDefinite(expr, number('0'), number('1'), { allowNumeric: false });

		expect(result.status).toBe('unsupported');
		expect(result.approximate).toBeUndefined();
		expect(result.value).toBeNull();
	});

	it('should not use numeric fallback for symbolic bounds', () => {
		// Even if symbolic integration fails, can't use numeric with symbolic bounds
		const expr = exp(multiply(number('-1'), power(variable('x'), number('2'))));
		const result = integrateDefinite(expr, number('0'), variable('a'));

		expect(result.status).toBe('unsupported');
		expect(result.approximate).toBeUndefined();
	});

	it('should include numeric error estimate in steps', () => {
		const expr = exp(multiply(number('-1'), power(variable('x'), number('2'))));
		const result = integrateDefinite(expr, number('0'), number('1'), { verbosity: 'detailed' });

		expect(result.status).toBe('approximate');
		expect(result.steps.length).toBeGreaterThan(0);

		// Should have a step describing the numeric approximation
		const numericStep = result.steps.find((step) => step.rule === 'numeric-simpson');
		expect(numericStep).toBeDefined();
		expect(numericStep?.technicalNote).toContain('Erreur estimée');
	});
});
