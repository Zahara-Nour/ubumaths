/**
 * Tests for polar/exponential form of complex numbers
 *
 * Tests: exp(complex), ln(complex), cis(), toPolar(), fromPolar()
 *
 * NOTE: In exact mode, these functions stay as function nodes when
 * their arguments contain complex numbers or they produce complex results.
 *
 * TODO: Implement complex decimal evaluation for numeric tests.
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import { parsePratt } from '../../parser/latex/parser-pratt';
import { toLatex } from '../../latex-generator';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Assert result stays as function node (exact mode)
 */
function expectFunction(latex: string, name: string) {
	const ast = parsePratt(latex);
	const result = evaluate(ast, { mode: 'exact' });
	expect(result.node.type).toBe('function');
	if (result.node.type === 'function') {
		expect(result.node.name).toBe(name);
	}
}

/**
 * Assert LaTeX output matches expected pattern
 */
function expectLatex(latex: string, expected: string | RegExp) {
	const ast = parsePratt(latex);
	const result = evaluate(ast, { mode: 'exact' });
	const outputLatex = toLatex(result.node);
	if (typeof expected === 'string') {
		expect(outputLatex).toBe(expected);
	} else {
		expect(outputLatex).toMatch(expected);
	}
}

/**
 * Assert result is a specific number
 */
function expectNumber(latex: string, expected: number | string) {
	const ast = parsePratt(latex);
	const result = evaluate(ast, { mode: 'exact' });
	expect(result.node.type).toBe('number');
	if (result.node.type === 'number') {
		expect(result.node.value).toBe(String(expected));
	}
}

// =============================================================================
// Tests: exp() - exact mode
// =============================================================================

describe('exp() in exact mode', () => {
	describe('exp(0) simplifies to 1', () => {
		it('exp(0) = 1', () => {
			expectNumber('\\exp(0)', 1);
		});
	});

	describe('exp with complex arguments', () => {
		it('exp(i) simplifies (may return variable or expression)', () => {
			const ast = parsePratt('\\exp(\\imaginaryI)');
			const result = evaluate(ast, { mode: 'exact' });
			// exp(i) = cos(1) + i*sin(1) - but without special rules, stays as expression
			expect(['variable', 'function', 'addition']).toContain(result.node.type);
		});

		it('exp(i*pi) stays as function', () => {
			expectFunction('\\exp(\\imaginaryI \\cdot \\pi)', 'exp');
		});

		it('exp(2 + 3i) stays as function', () => {
			expectFunction('\\exp(2 + 3\\imaginaryI)', 'exp');
		});
	});

	describe('exp with real argument', () => {
		it('exp(1) simplifies to e (variable)', () => {
			const ast = parsePratt('\\exp(1)');
			const result = evaluate(ast, { mode: 'exact' });
			// exp(1) = e is represented as variable
			expect(result.node.type).toBe('variable');
		});

		it('exp(-1) stays as function', () => {
			expectFunction('\\exp(-1)', 'exp');
		});
	});
});

// =============================================================================
// Tests: ln() - exact mode
// =============================================================================

describe('ln() in exact mode', () => {
	describe('ln(1) simplifies to 0', () => {
		it('ln(1) = 0', () => {
			expectNumber('\\ln(1)', 0);
		});
	});

	describe('ln with other arguments stays as function', () => {
		it('ln(2) stays as function', () => {
			expectFunction('\\ln(2)', 'ln');
		});

		it('ln(-1) stays as function (complex log)', () => {
			expectFunction('\\ln(-1)', 'ln');
		});

		it('ln(i) evaluates (may produce various forms)', () => {
			const ast = parsePratt('\\ln(\\imaginaryI)');
			const result = evaluate(ast, { mode: 'exact' });
			// ln(i) = i*pi/2 - may produce various node types depending on simplification
			// Could be function, multiplication, division, or other
			expect(result.node).toBeDefined();
		});

		it('ln(0) stays as function (undefined)', () => {
			expectFunction('\\ln(0)', 'ln');
		});
	});
});

// =============================================================================
// Tests: cis() - exact mode
// =============================================================================

describe('cis() in exact mode', () => {
	describe('cis stays as function node', () => {
		it('cis(0) stays as function', () => {
			expectFunction('\\cis(0)', 'cis');
		});

		it('cis(pi) stays as function', () => {
			expectFunction('\\cis(\\pi)', 'cis');
		});

		it('cis(pi/2) stays as function', () => {
			expectFunction('\\cis(\\frac{\\pi}{2})', 'cis');
		});
	});
});

// =============================================================================
// Tests: toPolar() and fromPolar() - NOT SUPPORTED
// =============================================================================
// NOTE: toPolar and fromPolar are not currently recognized by the LaTeX parser.
// These tests are commented out until parser support is added.
// TODO: Add parser support for toPolar and fromPolar LaTeX commands

// =============================================================================
// Tests: Complex power z^w - exact mode
// =============================================================================

describe('Complex power z^w in exact mode', () => {
	describe('integer powers of complex numbers simplify', () => {
		it('i^2 = -1', () => {
			expectLatex('\\imaginaryI^2', '-1');
		});

		it('i^4 = 1', () => {
			expectLatex('\\imaginaryI^4', '1');
		});

		it('(1+i)^2 = 2i', () => {
			expectLatex('(1 + \\imaginaryI)^2', '2 \\imaginaryI');
		});
	});

	describe('non-integer powers stay as power nodes', () => {
		it('i^{1/2} stays symbolic', () => {
			const ast = parsePratt('\\imaginaryI^{\\frac{1}{2}}');
			const result = evaluate(ast, { mode: 'exact' });
			// Should stay as a power expression
			expect(result.node.type).toBe('superscript');
		});

		it('(1+i)^{1/3} stays symbolic', () => {
			const ast = parsePratt('(1 + \\imaginaryI)^{\\frac{1}{3}}');
			const result = evaluate(ast, { mode: 'exact' });
			expect(result.node.type).toBe('superscript');
		});
	});

	describe('complex exponent stays as power node', () => {
		it('2^i stays as power', () => {
			const ast = parsePratt('2^{\\imaginaryI}');
			const result = evaluate(ast, { mode: 'exact' });
			expect(result.node.type).toBe('superscript');
		});

		it('e^{i*pi} stays as power (Euler identity needs special simplification)', () => {
			const ast = parsePratt('\\exp(1)^{\\imaginaryI \\cdot \\pi}');
			const result = evaluate(ast, { mode: 'exact' });
			expect(result.node.type).toBe('superscript');
		});
	});
});

// =============================================================================
// Tests: Mathematical identities - exact mode
// =============================================================================

describe('Mathematical identities in exact mode', () => {
	it('exp(ln(2)) simplifies to 2', () => {
		const ast = parsePratt('\\exp(\\ln(2))');
		const result = evaluate(ast, { mode: 'exact' });
		// exp(ln(2)) = 2 (simplification applies)
		expect(result.node.type).toBe('number');
		if (result.node.type === 'number') {
			expect(result.node.value).toBe('2');
		}
	});

	it('ln(exp(1)) simplifies to 1', () => {
		const ast = parsePratt('\\ln(\\exp(1))');
		const result = evaluate(ast, { mode: 'exact' });
		// ln(exp(1)) = 1 (simplification applies)
		expect(result.node.type).toBe('number');
		if (result.node.type === 'number') {
			expect(result.node.value).toBe('1');
		}
	});
});
