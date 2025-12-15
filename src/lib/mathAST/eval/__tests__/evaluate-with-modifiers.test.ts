/**
 * Unit tests for evaluateWithModifiers function
 *
 * Tests the convenience API for evaluating LaTeX expressions
 * with formatting modifiers (decimal, addPositive, bracketNegative).
 */

import { describe, it, expect } from 'vitest';
import { evaluateWithModifiers } from '../evaluate-with-modifiers';

// =============================================================================
// Basic Evaluation Tests
// =============================================================================

describe('evaluateWithModifiers - basic evaluation', () => {
	it('evaluates simple addition: 3+4 -> 7', () => {
		expect(evaluateWithModifiers('3+4', {})).toBe('7');
	});

	it('evaluates simple subtraction: 10-3 -> 7', () => {
		expect(evaluateWithModifiers('10-3', {})).toBe('7');
	});

	it('evaluates simple multiplication: 5*2 -> 10', () => {
		expect(evaluateWithModifiers('5 \\cdot 2', {})).toBe('10');
	});

	it('evaluates power: 2^3 -> 8', () => {
		expect(evaluateWithModifiers('2^3', {})).toBe('8');
	});

	it('evaluates negative number: -5 -> -5', () => {
		expect(evaluateWithModifiers('-5', {})).toBe('-5');
	});

	it('evaluates zero: 0 -> 0', () => {
		expect(evaluateWithModifiers('0', {})).toBe('0');
	});

	it('evaluates complex expression: 3^2 + 4^2 -> 25', () => {
		expect(evaluateWithModifiers('3^2+4^2', {})).toBe('25');
	});
});

// =============================================================================
// Decimal Modifier Tests
// =============================================================================

describe('evaluateWithModifiers - decimal modifier', () => {
	it('converts fraction to decimal: 1/2 -> 0.5', () => {
		const result = evaluateWithModifiers('\\frac{1}{2}', { decimal: true });
		expect(result).toBe('0.5');
	});

	it('converts fraction to decimal: 1/3 -> 0.333...', () => {
		const result = evaluateWithModifiers('\\frac{1}{3}', { decimal: true });
		expect(result.startsWith('0.333')).toBe(true);
	});

	it('converts fraction to decimal: 1/4 -> 0.25', () => {
		const result = evaluateWithModifiers('\\frac{1}{4}', { decimal: true });
		expect(result).toBe('0.25');
	});

	it('converts 2/3 to decimal', () => {
		const result = evaluateWithModifiers('\\frac{2}{3}', { decimal: true });
		expect(result.startsWith('0.666')).toBe(true);
	});

	it('keeps integer as integer even in decimal mode', () => {
		const result = evaluateWithModifiers('6', { decimal: true });
		expect(result).toBe('6');
	});

	it('evaluates expression and converts to decimal', () => {
		const result = evaluateWithModifiers('1+\\frac{1}{2}', { decimal: true });
		expect(result).toBe('1.5');
	});
});

// =============================================================================
// Add Positive Modifier Tests
// =============================================================================

describe('evaluateWithModifiers - addPositive modifier', () => {
	it('adds + sign to positive number: 5 -> +5', () => {
		expect(evaluateWithModifiers('5', { addPositive: true })).toBe('+5');
	});

	it('adds + sign to positive result: 3+4 -> +7', () => {
		expect(evaluateWithModifiers('3+4', { addPositive: true })).toBe('+7');
	});

	it('does not add + sign to negative number: -3 -> -3', () => {
		expect(evaluateWithModifiers('-3', { addPositive: true })).toBe('-3');
	});

	it('does not add + sign to zero: 0 -> 0', () => {
		expect(evaluateWithModifiers('0', { addPositive: true })).toBe('0');
	});

	it('does not add + sign to negative result: 3-5 -> -2', () => {
		expect(evaluateWithModifiers('3-5', { addPositive: true })).toBe('-2');
	});
});

// =============================================================================
// Bracket Negative Modifier Tests
// =============================================================================

describe('evaluateWithModifiers - bracketNegative modifier', () => {
	it('brackets negative number: -3 -> (-3)', () => {
		expect(evaluateWithModifiers('-3', { bracketNegative: true })).toBe('(-3)');
	});

	it('brackets negative result: 3-5 -> (-2)', () => {
		expect(evaluateWithModifiers('3-5', { bracketNegative: true })).toBe('(-2)');
	});

	it('does not bracket positive number: 5 -> 5', () => {
		expect(evaluateWithModifiers('5', { bracketNegative: true })).toBe('5');
	});

	it('does not bracket zero: 0 -> 0', () => {
		expect(evaluateWithModifiers('0', { bracketNegative: true })).toBe('0');
	});

	it('brackets negative fraction result', () => {
		const result = evaluateWithModifiers('-\\frac{1}{2}', { bracketNegative: true });
		expect(result).toBe('(-0.5)');
	});
});

// =============================================================================
// Combined Modifiers Tests
// =============================================================================

describe('evaluateWithModifiers - combined modifiers', () => {
	it('combines decimal and addPositive for positive result', () => {
		const result = evaluateWithModifiers('\\frac{2}{3}', { decimal: true, addPositive: true });
		expect(result.startsWith('+0.666')).toBe(true);
	});

	it('combines decimal and bracketNegative for negative result', () => {
		const result = evaluateWithModifiers('-\\frac{1}{4}', {
			decimal: true,
			bracketNegative: true
		});
		expect(result).toBe('(-0.25)');
	});

	it('combines addPositive and bracketNegative - positive case', () => {
		const result = evaluateWithModifiers('5', { addPositive: true, bracketNegative: true });
		expect(result).toBe('+5');
	});

	it('combines addPositive and bracketNegative - negative case', () => {
		const result = evaluateWithModifiers('-5', { addPositive: true, bracketNegative: true });
		expect(result).toBe('(-5)');
	});

	it('combines all three modifiers - positive decimal', () => {
		const result = evaluateWithModifiers('\\frac{1}{2}', {
			decimal: true,
			addPositive: true,
			bracketNegative: true
		});
		expect(result).toBe('+0.5');
	});

	it('combines all three modifiers - negative decimal', () => {
		const result = evaluateWithModifiers('-\\frac{1}{2}', {
			decimal: true,
			addPositive: true,
			bracketNegative: true
		});
		expect(result).toBe('(-0.5)');
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('evaluateWithModifiers - edge cases', () => {
	it('handles empty modifiers object', () => {
		expect(evaluateWithModifiers('5', {})).toBe('5');
	});

	it('handles undefined modifiers', () => {
		expect(evaluateWithModifiers('5')).toBe('5');
	});

	it('handles very small decimals', () => {
		const result = evaluateWithModifiers('\\frac{1}{1000}', { decimal: true });
		expect(result).toBe('0.001');
	});

	it('handles large numbers', () => {
		expect(evaluateWithModifiers('2^{10}', {})).toBe('1024');
	});

	it('handles sqrt of perfect square', () => {
		expect(evaluateWithModifiers('\\sqrt{16}', {})).toBe('4');
	});

	it('handles sqrt of non-perfect square in decimal mode', () => {
		const result = evaluateWithModifiers('\\sqrt{2}', { decimal: true });
		expect(result.startsWith('1.414')).toBe(true);
	});
});

// =============================================================================
// Error Cases Tests
// =============================================================================

describe('evaluateWithModifiers - error cases', () => {
	it('throws on expression with unsubstituted variable', () => {
		expect(() => evaluateWithModifiers('x+1', {})).toThrow();
	});

	it('throws on division by zero', () => {
		expect(() => evaluateWithModifiers('\\frac{1}{0}', {})).toThrow('Division by zero');
	});

	it('throws on invalid LaTeX', () => {
		expect(() => evaluateWithModifiers('\\frac{1}', {})).toThrow();
	});
});
