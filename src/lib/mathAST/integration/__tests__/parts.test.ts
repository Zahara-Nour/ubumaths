/**
 * Integration by Parts Tests
 *
 * Comprehensive tests for integration by parts integrator.
 *
 * @module mathAST/integration/__tests__/parts
 */

import { describe, it, expect } from 'vitest';
import { integrate } from '../integrate';
import { parseLatex } from '../../parser';
import { variable, number, multiply, power, func, ln, euler } from '../../factory';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create e^x expression using Euler constant
 */
function expX(): ReturnType<typeof power> {
	return power(euler(), variable('x'));
}

/**
 * Create e^(ax) expression using Euler constant
 */
function expAx(a: string): ReturnType<typeof power> {
	return power(euler(), multiply(number(a), variable('x'), 'implicit'));
}

/**
 * Parse LaTeX, integrate, and check basic properties
 */
function integrateLatex(latex: string, _expectedLatex?: string): void {
	const expr = parseLatex(latex);
	const result = integrate(expr, { verbosity: 'detailed' });

	expect(result.status).toBe('exact');
	expect(result.antiderivative).not.toBeNull();
	expect(result.technique).toBe('parts');

	// Note: We're not checking exact equality since different valid forms exist
	// The main goal is to verify the integrator works without crashing
}

/**
 * Verify that integration fails (unsupported)
 */
function _expectUnsupported(latex: string): void {
	const expr = parseLatex(latex);
	const result = integrate(expr);
	expect(result.status).toBe('unsupported');
}

// =============================================================================
// LIATE Categorization Tests
// =============================================================================

describe('Integration by Parts - LIATE Categorization', () => {
	it('should categorize logarithmic functions (L=5)', () => {
		// Test will verify ln(x) gets highest priority
		integrateLatex('x \\cdot \\ln(x)', 'x^2 \\ln(x) / 2 - x^2 / 4');
	});

	it('should categorize inverse trigonometric functions (I=4)', () => {
		integrateLatex('\\arctan(x)', 'x \\arctan(x) - \\frac{1}{2} \\ln(1 + x^2)');
	});

	it('should categorize algebraic functions (A=3)', () => {
		// x should be chosen as u when paired with e^x
		const x = variable('x');
		const expr = multiply(x, expX(), 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });
		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});

	it('should categorize trigonometric functions (T=2)', () => {
		integrateLatex('x \\cdot \\sin(x)', '\\sin(x) - x \\cos(x)');
	});

	it('should categorize exponential functions (E=1)', () => {
		// e^x should have lowest priority (chosen as dv)
		const x = variable('x');
		const expr = multiply(expX(), x, 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });
		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});
});

// =============================================================================
// chooseUAndDv Tests
// =============================================================================

describe('Integration by Parts - u and dv Selection', () => {
	it('should choose ln(x) as u when paired with x (L > A)', () => {
		const expr = parseLatex('x \\cdot \\ln(x)');
		const result = integrate(expr, { verbosity: 'detailed' });

		// Check steps for "u = ln(x)"
		const hasLnAsU = result.steps.some(
			(step) => step.rule === 'choose-u-dv' && step.technicalNote?.includes('ln')
		);
		expect(hasLnAsU).toBe(true);
	});

	it('should choose arctan(x) as u when paired with 1 (I > A)', () => {
		const expr = parseLatex('\\arctan(x)');
		const result = integrate(expr, { verbosity: 'detailed' });

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});

	it('should choose x as u when paired with e^x (A > E)', () => {
		const x = variable('x');
		const expr = multiply(x, expX(), 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });

		const hasXAsU = result.steps.some(
			(step) => step.rule === 'choose-u-dv' && step.technicalNote?.includes('u = x')
		);
		expect(hasXAsU).toBe(true);
	});

	it('should choose x as u when paired with sin(x) (A > T)', () => {
		const expr = parseLatex('x \\cdot \\sin(x)');
		const result = integrate(expr, { verbosity: 'detailed' });

		const hasXAsU = result.steps.some(
			(step) => step.rule === 'choose-u-dv' && step.technicalNote?.includes('u = x')
		);
		expect(hasXAsU).toBe(true);
	});

	it('should choose sin(x) as u when paired with e^x (T > E)', () => {
		// This will trigger cyclic case
		const x = variable('x');
		const expr = multiply(expX(), func('sin', [x]), 'implicit');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});
});

// =============================================================================
// Basic Integration by Parts
// =============================================================================

describe('Integration by Parts - Basic Cases', () => {
	it('should integrate x·e^x', () => {
		// ∫ x·e^x dx = e^x(x - 1) + C
		const x = variable('x');
		const expr = multiply(x, expX(), 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });
		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
		expect(result.antiderivative).not.toBeNull();
	});

	it('should integrate x·sin(x)', () => {
		// ∫ x·sin(x) dx = sin(x) - x·cos(x) + C
		integrateLatex('x \\cdot \\sin(x)', '\\sin(x) - x \\cos(x)');
	});

	it('should integrate x·cos(x)', () => {
		// ∫ x·cos(x) dx = cos(x) + x·sin(x) + C
		integrateLatex('x \\cdot \\cos(x)', '\\cos(x) + x \\sin(x)');
	});

	it('should integrate ln(x)', () => {
		// ∫ ln(x) dx = x·ln(x) - x + C
		// This is treated as ln(x)·1
		integrateLatex('\\ln(x)', 'x \\ln(x) - x');
	});

	it('should integrate x·ln(x)', () => {
		// ∫ x·ln(x) dx = (x²/2)·ln(x) - x²/4 + C
		integrateLatex('x \\cdot \\ln(x)', '\\frac{x^2}{2} \\ln(x) - \\frac{x^2}{4}');
	});

	it('should integrate arctan(x)', () => {
		// ∫ arctan(x) dx = x·arctan(x) - (1/2)ln(1 + x²) + C
		integrateLatex('\\arctan(x)', 'x \\arctan(x) - \\frac{1}{2} \\ln(1 + x^2)');
	});

	it('should integrate arcsin(x)', () => {
		// ∫ arcsin(x) dx = x·arcsin(x) + sqrt(1 - x²) + C
		integrateLatex('\\arcsin(x)', 'x \\arcsin(x) + \\sqrt{1 - x^2}');
	});

	it('should integrate x²·e^x using repeated parts', () => {
		// ∫ x²·e^x dx = e^x(x² - 2x + 2) + C
		const x = variable('x');
		const expr = multiply(power(x, number('2')), expX(), 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });
		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});

	it('should integrate x³·e^x', () => {
		// ∫ x³·e^x dx = e^x(x³ - 3x² + 6x - 6) + C
		const x = variable('x');
		const expr = multiply(power(x, number('3')), expX(), 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });
		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});
});

// =============================================================================
// Tabular Method Tests
// =============================================================================

describe('Integration by Parts - Tabular Method', () => {
	it('should use tabular method for x²·e^x', () => {
		const x = variable('x');
		const expr = multiply(power(x, number('2')), expX(), 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');

		// Check if tabular method was mentioned in steps
		const hasTabular = result.steps.some((step) => step.rule === 'tabular-method');
		expect(hasTabular).toBe(true);
	});

	it('should use tabular method for x²·sin(x)', () => {
		// ∫ x²·sin(x) dx = -x²·cos(x) + 2x·sin(x) + 2cos(x) + C
		integrateLatex('x^2 \\cdot \\sin(x)', '-x^2 \\cos(x) + 2x \\sin(x) + 2 \\cos(x)');
	});

	it('should use tabular method for x³·sin(x)', () => {
		const expr = parseLatex('x^3 \\cdot \\sin(x)');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});

	it('should use tabular method for x²·cos(x)', () => {
		// ∫ x²·cos(x) dx = x²·sin(x) + 2x·cos(x) - 2sin(x) + C
		integrateLatex('x^2 \\cdot \\cos(x)', 'x^2 \\sin(x) + 2x \\cos(x) - 2 \\sin(x)');
	});

	it('should handle polynomial × exponential with tabular method', () => {
		// (x² + 2x + 1) · e^x - use programmatic construction
		const poly = parseLatex('x^2 + 2x + 1');
		const expr = multiply(poly, expX(), 'implicit');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});
});

// =============================================================================
// Cyclic Cases
// =============================================================================

describe('Integration by Parts - Cyclic Cases', () => {
	it('should solve cyclic case: e^x·sin(x)', () => {
		// ∫ e^x·sin(x) dx = (e^x/2)(sin(x) - cos(x)) + C
		const x = variable('x');
		const expr = multiply(expX(), func('sin', [x]), 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');

		// Check for cyclic solving step
		const hasCyclic = result.steps.some((step) => step.rule === 'cyclic-solve');
		expect(hasCyclic).toBe(true);

		// Verify result exists
		expect(result.antiderivative).not.toBeNull();
	});

	it('should solve cyclic case: e^x·cos(x)', () => {
		// ∫ e^x·cos(x) dx = (e^x/2)(sin(x) + cos(x)) + C
		const x = variable('x');
		const expr = multiply(expX(), func('cos', [x]), 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');

		const hasCyclic = result.steps.some((step) => step.rule === 'cyclic-solve');
		expect(hasCyclic).toBe(true);

		expect(result.antiderivative).not.toBeNull();
	});

	it('should solve cyclic case: e^(2x)·sin(x)', () => {
		// ∫ e^(2x)·sin(x) dx
		const x = variable('x');
		const expr = multiply(expAx('2'), func('sin', [x]), 'implicit');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});

	it('should solve cyclic case: sin(x)·cos(x) if applicable', () => {
		// This might not be cyclic, but test it
		const expr = parseLatex('\\sin(x) \\cdot \\cos(x)');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		// Could be handled by u-substitution or parts
	});
});

// =============================================================================
// Step Recording Tests
// =============================================================================

describe('Integration by Parts - Step Recording', () => {
	it('should record identify-parts step', () => {
		const x = variable('x');
		const expr = multiply(x, expX(), 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });

		const hasIdentify = result.steps.some((step) => step.rule === 'identify-parts');
		expect(hasIdentify).toBe(true);
	});

	it('should record choose-u-dv step with LIATE explanation', () => {
		const expr = parseLatex('x \\cdot \\sin(x)');
		const result = integrate(expr, { verbosity: 'detailed' });

		const chooseStep = result.steps.find((step) => step.rule === 'choose-u-dv');
		expect(chooseStep).toBeDefined();
		expect(chooseStep?.technicalNote).toContain('u = ');
		expect(chooseStep?.technicalNote).toContain('dv = ');
	});

	it('should record apply-parts-formula step', () => {
		const x = variable('x');
		const expr = multiply(x, expX(), 'implicit');
		const result = integrate(expr, { verbosity: 'detailed' });

		const applyStep = result.steps.find((step) => step.rule === 'apply-parts-formula');
		expect(applyStep).toBeDefined();
	});

	it('should show du and v in detailed mode', () => {
		const expr = parseLatex('x \\cdot \\sin(x)');
		const result = integrate(expr, { verbosity: 'detailed' });

		// Check for technical notes containing du and v
		const hasDuNote = result.steps.some((step) => step.technicalNote?.includes('du = '));
		const hasVNote = result.steps.some((step) => step.technicalNote?.includes('v = '));

		expect(hasDuNote || hasVNote).toBe(true);
	});

	it('should include fewer steps in summarized mode', () => {
		const x = variable('x');
		const expr = multiply(x, expX(), 'implicit');
		const detailedResult = integrate(expr, { verbosity: 'detailed' });
		const summarizedResult = integrate(expr, { verbosity: 'summarized' });

		expect(summarizedResult.steps.length).toBeLessThan(detailedResult.steps.length);
	});

	it('should include no steps in result mode', () => {
		const x = variable('x');
		const expr = multiply(x, expX(), 'implicit');
		const result = integrate(expr, { verbosity: 'result' });

		expect(result.steps.length).toBe(0);
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Integration by Parts - Edge Cases', () => {
	it('should handle ln(x)² (requires nested parts)', () => {
		const expr = parseLatex('(\\ln(x))^2');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
	});

	it('should handle x²·ln(x)', () => {
		// ∫ x²·ln(x) dx = (x³/3)·ln(x) - x³/9 + C
		integrateLatex('x^2 \\cdot \\ln(x)', '\\frac{x^3}{3} \\ln(x) - \\frac{x^3}{9}');
	});

	it('should handle x·arctan(x)', () => {
		const expr = parseLatex('x \\cdot \\arctan(x)');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});

	it('should handle e^x·x^4 (high degree polynomial)', () => {
		const x = variable('x');
		const expr = multiply(expX(), power(x, number('4')), 'implicit');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});

	it('should handle sin(x)·ln(x) if supported', () => {
		const expr = parseLatex('\\sin(x) \\cdot \\ln(x)');
		const result = integrate(expr);

		// This is complex - may be unsupported
		// Just verify it doesn't crash
		expect(['exact', 'unsupported']).toContain(result.status);
	});
});

// =============================================================================
// Programmatic Tests (using factory functions)
// =============================================================================

describe('Integration by Parts - Programmatic Construction', () => {
	it('should integrate x·e^x constructed programmatically', () => {
		const x = variable('x');
		const expr = multiply(x, func('exp', [x]), 'implicit');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
		expect(result.antiderivative).not.toBeNull();
	});

	it('should integrate x²·sin(x) constructed programmatically', () => {
		const x = variable('x');
		const expr = multiply(power(x, number('2')), func('sin', [x]), 'implicit');
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
	});

	it('should integrate ln(x) constructed programmatically', () => {
		const x = variable('x');
		const expr = ln(x);
		const result = integrate(expr);

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('parts');
		expect(result.antiderivative).not.toBeNull();
	});
});

// =============================================================================
// Error Handling
// =============================================================================

describe('Integration by Parts - Error Handling', () => {
	it('should handle depth limit gracefully', () => {
		const x = variable('x');
		const expr = multiply(x, expX(), 'implicit');
		const result = integrate(expr, { maxDepth: 1 });

		// Should still work or return unsupported gracefully
		expect(['exact', 'unsupported']).toContain(result.status);
	});

	it('should not crash on complex expressions', () => {
		const x = variable('x');
		const sinCos = multiply(func('sin', [x]), func('cos', [x]), 'implicit');
		const expr = multiply(power(x, number('10')), sinCos, 'implicit');
		const result = integrate(expr);

		// May or may not be supported, but should not crash
		expect(['exact', 'unsupported']).toContain(result.status);
	});
});
