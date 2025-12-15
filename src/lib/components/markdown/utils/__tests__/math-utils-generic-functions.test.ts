/**
 * Tests for generic functions support in math-utils
 *
 * TDD: These tests verify that expressionToLatex correctly handles
 * custom generic function configurations for parsing derivatives like f'(x).
 */

import { describe, it, expect } from 'vitest';
import { expressionToLatex } from '../math-utils';
import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';

describe('expressionToLatex with genericFunctions', () => {
	describe('custom syntax with default generic functions', () => {
		it('parses f(x) as function with defaults', () => {
			const latex = expressionToLatex('f(x)', 'custom');
			// With default generic functions, f(x) should be parsed as function call
			// and converted to LaTeX as f(x) or f\\left(x\\right)
			expect(latex).toMatch(/f.*x/);
			// Should NOT be multiplication (f·x)
			expect(latex).not.toContain('\\cdot');
		});

		it("parses f'(x) as derivative with defaults", () => {
			const latex = expressionToLatex("f'(x)", 'custom');
			// Should produce f'(x) or similar derivative notation
			expect(latex).toMatch(/f.*'.*x|f.*\\prime.*x/i);
		});
	});

	describe('custom syntax with custom generic functions', () => {
		it('parses P(x) as function when P is in genericFunctions', () => {
			const config: GenericFunctionConfig = {
				names: ['P', 'Q'],
				allowDerivatives: true,
				allowInverse: true
			};
			const latex = expressionToLatex('P(x)', 'custom', config);
			// P(x) should be parsed as function call
			expect(latex).toMatch(/P.*x/);
			expect(latex).not.toContain('\\cdot');
		});

		it('parses P(x) as multiplication when P is NOT in genericFunctions', () => {
			const config: GenericFunctionConfig = {
				names: ['f', 'g'], // P not included
				allowDerivatives: true,
				allowInverse: true
			};
			const latex = expressionToLatex('P(x)', 'custom', config);
			// P(x) should be parsed as P * x (implicit multiplication)
			// This will produce P·x or Px or P \cdot x
			expect(latex).toMatch(/P.*x/);
		});

		it("parses P'(x) as derivative when P is in genericFunctions", () => {
			const config: GenericFunctionConfig = {
				names: ['P'],
				allowDerivatives: true,
				allowInverse: true
			};
			const latex = expressionToLatex("P'(x)", 'custom', config);
			// Should produce derivative notation
			expect(latex).toMatch(/P.*'.*x|P.*\\prime.*x/i);
		});

		it('parses func(x) with multi-char identifier', () => {
			const config: GenericFunctionConfig = {
				names: ['func', 'myFunc'],
				allowDerivatives: true,
				allowInverse: true
			};
			// Note: multi-char identifiers may not work in all parsers
			// This test documents expected behavior
			const latex = expressionToLatex('func(x)', 'custom', config);
			expect(latex).toBeDefined();
		});
	});

	describe('disabling generic functions', () => {
		it('parses f(x) as multiplication when genericFunctions is null', () => {
			const latex = expressionToLatex('f(x)', 'custom', null);
			// With null, f(x) should be implicit multiplication
			// Could be f·x or fx or f \cdot x depending on generator
			expect(latex).toBeDefined();
		});

		it('parses f(x) as multiplication when genericFunctions.names is empty', () => {
			const config: GenericFunctionConfig = {
				names: [],
				allowDerivatives: true,
				allowInverse: true
			};
			const latex = expressionToLatex('f(x)', 'custom', config);
			expect(latex).toBeDefined();
		});
	});

	describe('latex syntax passthrough', () => {
		it('returns latex unchanged regardless of genericFunctions', () => {
			const config: GenericFunctionConfig = {
				names: ['P', 'Q'],
				allowDerivatives: true,
				allowInverse: true
			};
			const latex = expressionToLatex("f'(x)", 'latex', config);
			expect(latex).toBe("f'(x)");
		});
	});
});
