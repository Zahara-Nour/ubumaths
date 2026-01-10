/**
 * Tests for nth roots of complex numbers
 *
 * Tests: nthroot(z, n, k), rootofunity(n, k), principalroot(z, n)
 *
 * NOTE: In exact mode, these specialized functions stay as function nodes
 * because they compute trigonometric values for complex roots.
 *
 * TODO: Implement complex decimal evaluation to enable numeric tests.
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

// =============================================================================
// Tests: rootofunity(n, k) - exact mode
// =============================================================================

describe('rootofunity(n, k) - nth roots of unity (exact mode)', () => {
	describe('stays as function node', () => {
		it('rootofunity(2, 0) stays as function', () => {
			expectFunction('\\rootofunity(2, 0)', 'rootofunity');
		});

		it('rootofunity(2, 1) stays as function', () => {
			expectFunction('\\rootofunity(2, 1)', 'rootofunity');
		});

		it('rootofunity(3, 1) stays as function', () => {
			expectFunction('\\rootofunity(3, 1)', 'rootofunity');
		});

		it('rootofunity(4, 1) stays as function', () => {
			expectFunction('\\rootofunity(4, 1)', 'rootofunity');
		});
	});

	describe('preserves arguments', () => {
		it('preserves arguments in output', () => {
			expectLatex('\\rootofunity(3, 1)', /rootofunity.*3.*1/);
		});
	});
});

// =============================================================================
// Tests: nthroot(z, n, k) - exact mode
// =============================================================================

describe('nthroot(z, n, k) - general nth roots (exact mode)', () => {
	describe('stays as function node', () => {
		it('nthroot(8, 3, 0) stays as function', () => {
			expectFunction('\\nthroot(8, 3, 0)', 'nthroot');
		});

		it('nthroot(8, 3, 1) stays as function', () => {
			expectFunction('\\nthroot(8, 3, 1)', 'nthroot');
		});

		it('nthroot(-1, 2, 0) stays as function', () => {
			expectFunction('\\nthroot(-1, 2, 0)', 'nthroot');
		});

		it('nthroot with complex argument stays as function', () => {
			expectFunction('\\nthroot(\\imaginaryI, 2, 0)', 'nthroot');
		});
	});

	describe('preserves arguments', () => {
		it('preserves arguments in output', () => {
			expectLatex('\\nthroot(8, 3, 1)', /nthroot.*8.*3.*1/);
		});
	});
});

// =============================================================================
// Tests: principalroot(z, n) - exact mode
// =============================================================================

describe('principalroot(z, n) - convenience function (exact mode)', () => {
	describe('stays as function node', () => {
		it('principalroot(8, 3) stays as function', () => {
			expectFunction('\\principalroot(8, 3)', 'principalroot');
		});

		it('principalroot(-1, 2) stays as function', () => {
			expectFunction('\\principalroot(-1, 2)', 'principalroot');
		});

		it('principalroot with complex argument stays as function', () => {
			expectFunction('\\principalroot(\\imaginaryI, 2)', 'principalroot');
		});
	});
});

// =============================================================================
// Tests: Mathematical identities (using function node preservation)
// =============================================================================

describe('mathematical identities (exact mode)', () => {
	it('operations on rootofunity stay as function', () => {
		// When we have rootofunity in an expression, it stays symbolic
		const ast = parsePratt('\\rootofunity(3, 1) + \\rootofunity(3, 2)');
		const result = evaluate(ast, { mode: 'exact' });
		// The result should be an addition of two function nodes
		expect(result.node.type).toBe('addition');
	});

	it('power of rootofunity stays symbolic', () => {
		const ast = parsePratt('(\\rootofunity(4, 1))^{2}');
		const result = evaluate(ast, { mode: 'exact' });
		// Should be a superscript/power node with function as base
		expect(result.node.type).toBe('superscript');
	});
});
