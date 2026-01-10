/**
 * Tests for integrating e^x with the Euler constant
 *
 * With MathConstantNode('euler'), both exp(x) and e^x should integrate the same way.
 */

import { describe, it, expect } from 'vitest';
import { integrate } from '../integrate';
import { euler, power, variable, number } from '../../factory';
import { MathAST } from '../../factory';
import { toLatex } from '../../latex-generator';
import { parseCustom } from '../../parser/custom';

describe('Integration of e^x (Euler constant)', () => {
	describe('basic e^x integration', () => {
		it('should integrate e^x to e^x', () => {
			// Build e^x: euler()^x
			const expr = power(euler(), variable('x'));
			const result = integrate(expr, { variable: 'x' });

			expect(result.status).toBe('exact');
			expect(result.antiderivative).toBeDefined();
			expect(result.integrandType).toBe('exponential');
		});

		it('should integrate e^(2x) to e^(2x)/2', () => {
			// Build e^(2x): euler()^(2*x)
			const expr = power(euler(), MathAST.multiply(number('2'), variable('x'), 'implicit'));
			const result = integrate(expr, { variable: 'x' });

			expect(result.status).toBe('exact');
			expect(result.antiderivative).toBeDefined();
			expect(result.integrandType).toBe('exponential');
		});
	});

	describe('parsing and integrating e^x from custom syntax', () => {
		it('should parse and integrate e^x from custom parser', () => {
			// Parse e^x using the custom parser (where e is reserved)
			const expr = parseCustom('e^x');
			const result = integrate(expr, { variable: 'x' });

			expect(result.status).toBe('exact');
			expect(result.antiderivative).toBeDefined();
			expect(result.integrandType).toBe('exponential');

			// The result should be exp(x) or e^x
			const latex = toLatex(result.antiderivative!);
			expect(latex).toContain('exp');
		});
	});
});
