/**
 * Tests for denormalization of imaginary terms
 *
 * Tests that AlgebraicTerms with hasImaginaryUnit are correctly
 * converted back to MathNodes with ComplexNode.
 */
import { describe, it, expect } from 'vitest';
import { denormalizeCoefficient, denormalize } from '../denormalize';
import { toLatex } from '../../latex-generator';
import type { AlgebraicCoefficient, AlgebraicTerm, NormalForm, NormalTerm } from '../types';

// Helper to create an imaginary term
function imaginaryTerm(n: bigint, d: bigint = 1n): AlgebraicTerm {
	return { rational: { n, d }, radicals: [], hasImaginaryUnit: true };
}

// Helper to create a real term
function realTerm(n: bigint, d: bigint = 1n): AlgebraicTerm {
	return { rational: { n, d }, radicals: [] };
}

// Helper to create a coefficient
function coef(terms: AlgebraicTerm[]): AlgebraicCoefficient {
	return { terms };
}

// Helper to create a normal term with just a coefficient
function normalTerm(coefficient: AlgebraicCoefficient): NormalTerm {
	return { coefficient, monomial: [] };
}

// Helper to create a normal form (polynomial / 1)
function normalForm(numerator: NormalTerm[]): NormalForm {
	return {
		numerator,
		denominator: [normalTerm(coef([realTerm(1n)]))],
		hash: 'test'
	};
}

describe('Denormalization of imaginary terms', () => {
	describe('denormalizeCoefficient', () => {
		it('denormalizes pure imaginary unit i', () => {
			const c = coef([imaginaryTerm(1n)]);
			const node = denormalizeCoefficient(c);
			// Should produce i (complex(0, 1))
			expect(node.type).toBe('complex');
			if (node.type === 'complex') {
				expect(node.real.type).toBe('number');
				expect(node.imaginary.type).toBe('number');
				if (node.real.type === 'number' && node.imaginary.type === 'number') {
					expect(node.real.value).toBe('0');
					expect(node.imaginary.value).toBe('1');
				}
			}
		});

		it('denormalizes -i', () => {
			const c = coef([imaginaryTerm(-1n)]);
			const node = denormalizeCoefficient(c);
			// Should produce -i (opposite of complex(0, 1))
			expect(node.type).toBe('opposite');
			if (node.type === 'opposite') {
				expect(node.operand.type).toBe('complex');
			}
		});

		it('denormalizes 2i', () => {
			const c = coef([imaginaryTerm(2n)]);
			const node = denormalizeCoefficient(c);
			// Should produce 2 * i (multiplication)
			expect(node.type).toBe('multiplication');
		});

		it('denormalizes 3 + 2i (complex number)', () => {
			const c = coef([realTerm(3n), imaginaryTerm(2n)]);
			const node = denormalizeCoefficient(c);
			// Should produce addition of real and imaginary parts
			expect(node.type).toBe('addition');
		});

		it('denormalizes 3 - 2i (complex number with negative imaginary)', () => {
			const c = coef([realTerm(3n), imaginaryTerm(-2n)]);
			const node = denormalizeCoefficient(c);
			// Should produce subtraction
			expect(node.type).toBe('subtraction');
		});

		it('produces correct LaTeX for i', () => {
			const c = coef([imaginaryTerm(1n)]);
			const node = denormalizeCoefficient(c);
			const latex = toLatex(node);
			expect(latex).toBe('\\imaginaryI');
		});

		it('produces correct LaTeX for 2i', () => {
			const c = coef([imaginaryTerm(2n)]);
			const node = denormalizeCoefficient(c);
			const latex = toLatex(node);
			expect(latex).toBe('2 \\imaginaryI');
		});

		it('produces correct LaTeX for 3 + 2i', () => {
			const c = coef([realTerm(3n), imaginaryTerm(2n)]);
			const node = denormalizeCoefficient(c);
			const latex = toLatex(node);
			// Should be 3 + 2i
			expect(latex).toContain('3');
			expect(latex).toContain('\\imaginaryI');
		});
	});

	describe('denormalize NormalForm', () => {
		it('denormalizes pure imaginary normal form', () => {
			const form = normalForm([normalTerm(coef([imaginaryTerm(1n)]))]);
			const node = denormalize(form);
			expect(node.type).toBe('complex');
		});

		it('denormalizes complex number normal form', () => {
			const form = normalForm([normalTerm(coef([realTerm(3n), imaginaryTerm(2n)]))]);
			const node = denormalize(form);
			expect(node.type).toBe('addition');
		});
	});
});
