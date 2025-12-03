/**
 * Tests for transcendental function simplification rules
 */

import { describe, it, expect } from 'vitest';
import { simplifyTranscendental } from '../transcendental.js';
import type { MathNode } from '../../../types';

// =============================================================================
// Helper Functions
// =============================================================================

function num(value: number): MathNode {
	return { type: 'number', value: String(value) };
}

function variable(name: string): MathNode {
	return { type: 'variable', name };
}

function pi(): MathNode {
	return { type: 'greek', letter: 'pi' };
}

function division(numerator: MathNode, denominator: MathNode): MathNode {
	return {
		type: 'division',
		numerator,
		denominator,
		displayStyle: 'fraction'
	};
}

function multiplication(left: MathNode, right: MathNode): MathNode {
	return {
		type: 'multiplication',
		left,
		right,
		displayStyle: 'implicit'
	};
}

function func(name: string, args: MathNode[]): MathNode {
	return {
		type: 'function',
		name,
		args
	};
}

function sqrt(arg: MathNode): MathNode {
	return func('sqrt', [arg]);
}

function opposite(operand: MathNode): MathNode {
	return {
		type: 'opposite',
		operand
	};
}

function superscript(base: MathNode, sup: MathNode): MathNode {
	return {
		type: 'superscript',
		base,
		superscript: sup
	};
}

// =============================================================================
// Sine Tests
// =============================================================================

describe('simplifyTranscendental - sine', () => {
	it('sin(0) = 0', () => {
		const expr = func('sin', [num(0)]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(0));
	});

	it('sin(π/6) = 1/2', () => {
		const expr = func('sin', [division(pi(), num(6))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(division(num(1), num(2)));
	});

	it('sin(π/4) = √2/2', () => {
		const expr = func('sin', [division(pi(), num(4))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(division(sqrt(num(2)), num(2)));
	});

	it('sin(π/3) = √3/2', () => {
		const expr = func('sin', [division(pi(), num(3))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(division(sqrt(num(3)), num(2)));
	});

	it('sin(π/2) = 1', () => {
		const expr = func('sin', [division(pi(), num(2))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(1));
	});

	it('sin(π) = 0', () => {
		const expr = func('sin', [pi()]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(0));
	});

	it('sin(3π/2) = -1', () => {
		const expr = func('sin', [division(multiplication(num(3), pi()), num(2))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(opposite(num(1)));
	});

	it('sin(2π) = 0', () => {
		const expr = func('sin', [multiplication(num(2), pi())]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(0));
	});

	it('sin(x) unchanged for unknown angle', () => {
		const expr = func('sin', [variable('x')]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(expr);
	});
});

// =============================================================================
// Cosine Tests
// =============================================================================

describe('simplifyTranscendental - cosine', () => {
	it('cos(0) = 1', () => {
		const expr = func('cos', [num(0)]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(1));
	});

	it('cos(π/6) = √3/2', () => {
		const expr = func('cos', [division(pi(), num(6))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(division(sqrt(num(3)), num(2)));
	});

	it('cos(π/4) = √2/2', () => {
		const expr = func('cos', [division(pi(), num(4))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(division(sqrt(num(2)), num(2)));
	});

	it('cos(π/3) = 1/2', () => {
		const expr = func('cos', [division(pi(), num(3))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(division(num(1), num(2)));
	});

	it('cos(π/2) = 0', () => {
		const expr = func('cos', [division(pi(), num(2))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(0));
	});

	it('cos(π) = -1', () => {
		const expr = func('cos', [pi()]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(opposite(num(1)));
	});

	it('cos(3π/2) = 0', () => {
		const expr = func('cos', [division(multiplication(num(3), pi()), num(2))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(0));
	});

	it('cos(2π) = 1', () => {
		const expr = func('cos', [multiplication(num(2), pi())]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(1));
	});
});

// =============================================================================
// Tangent Tests
// =============================================================================

describe('simplifyTranscendental - tangent', () => {
	it('tan(0) = 0', () => {
		const expr = func('tan', [num(0)]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(0));
	});

	it('tan(π/4) = 1', () => {
		const expr = func('tan', [division(pi(), num(4))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(1));
	});

	it('tan(π) = 0', () => {
		const expr = func('tan', [pi()]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(0));
	});
});

// =============================================================================
// Logarithm Tests
// =============================================================================

describe('simplifyTranscendental - logarithms', () => {
	it('ln(1) = 0', () => {
		const expr = func('ln', [num(1)]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(0));
	});

	it('ln(e) = 1', () => {
		const expr = func('ln', [variable('e')]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(1));
	});

	it('log(1) = 0', () => {
		const expr = func('log', [num(1)]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(0));
	});

	it('log(10) = 1 (base 10)', () => {
		const expr = func('log', [num(10)]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(1));
	});

	it('log(10) with explicit base 10 = 1', () => {
		const expr: MathNode = {
			type: 'function',
			name: 'log',
			args: [num(10)],
			base: num(10)
		};
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(1));
	});

	it('log_2(2) = 1', () => {
		const expr: MathNode = {
			type: 'function',
			name: 'log',
			args: [num(2)],
			base: num(2)
		};
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(1));
	});

	it('ln(x) unchanged for unknown argument', () => {
		const expr = func('ln', [variable('x')]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(expr);
	});
});

// =============================================================================
// Exponential Tests
// =============================================================================

describe('simplifyTranscendental - exponential', () => {
	it('exp(0) = 1', () => {
		const expr = func('exp', [num(0)]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(1));
	});

	it('exp(1) = e', () => {
		const expr = func('exp', [num(1)]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(variable('e'));
	});

	it('e^0 = 1', () => {
		const expr = superscript(variable('e'), num(0));
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(1));
	});

	it('e^1 = e', () => {
		const expr = superscript(variable('e'), num(1));
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(variable('e'));
	});

	it('exp(x) unchanged for unknown argument', () => {
		const expr = func('exp', [variable('x')]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(expr);
	});

	it('e^x unchanged for unknown exponent', () => {
		const expr = superscript(variable('e'), variable('x'));
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(expr);
	});
});

// =============================================================================
// Nested Expression Tests
// =============================================================================

describe('simplifyTranscendental - nested expressions', () => {
	it('simplifies nested sin(π/2) + cos(0)', () => {
		const expr: MathNode = {
			type: 'addition',
			left: func('sin', [division(pi(), num(2))]),
			right: func('cos', [num(0)])
		};
		const result = simplifyTranscendental(expr);
		expect(result).toEqual({
			type: 'addition',
			left: num(1),
			right: num(1)
		});
	});

	it('simplifies exp(ln(e))', () => {
		const expr = func('exp', [func('ln', [variable('e')])]);
		// First pass: ln(e) → 1, then exp(1) → e
		// Note: This requires multiple passes, so we call simplify recursively
		const firstPass = simplifyTranscendental(expr);
		const secondPass = simplifyTranscendental(firstPass);
		expect(secondPass).toEqual(variable('e'));
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('simplifyTranscendental - edge cases', () => {
	it('leaves sin with multiple arguments unchanged', () => {
		const expr: MathNode = {
			type: 'function',
			name: 'sin',
			args: [num(0), num(1)]
		};
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(expr);
	});

	it('leaves unknown functions unchanged', () => {
		const expr = func('myFunc', [num(0)]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(expr);
	});

	it('handles π in different forms (π*n)', () => {
		const expr = func('sin', [multiplication(pi(), num(2))]);
		const result = simplifyTranscendental(expr);
		expect(result).toEqual(num(0));
	});
});
