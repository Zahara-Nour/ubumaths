/**
 * TDD Tests for LaTeX Matrix Parsing
 *
 * Phase 2: Parser LaTeX - Test-Driven Development
 */

import { describe, it, expect } from 'vitest';
import { parsePrattSafe } from '../index';
import { isMatrix } from '../../../guards';
import type { MatrixNode } from '../../../types';

// Helper to parse LaTeX and check success
function parseLatex(input: string, options?: { mode?: 'strict' | 'tolerant' }) {
	const result = parsePrattSafe(input, options);
	return {
		success: result.ast !== null && result.errors.length === 0,
		ast: result.ast,
		errors: result.errors
	};
}

describe('LaTeX Matrix Parsing', () => {
	// =============================================================================
	// Basic Matrix Environments
	// =============================================================================

	describe('pmatrix environment', () => {
		it('parses 2x2 pmatrix', () => {
			const result = parseLatex('\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}');
			expect(result.success).toBe(true);
			expect(result.ast).not.toBeNull();
			expect(isMatrix(result.ast!)).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.matrixType).toBe('pmatrix');
			expect(matrix.rows).toHaveLength(2);
			expect(matrix.rows[0]).toHaveLength(2);
			expect(matrix.rows[1]).toHaveLength(2);
		});

		it('parses 1x1 pmatrix', () => {
			const result = parseLatex('\\begin{pmatrix}5\\end{pmatrix}');
			expect(result.success).toBe(true);
			expect(isMatrix(result.ast!)).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(1);
			expect(matrix.rows[0]).toHaveLength(1);
		});

		it('parses 3x2 pmatrix (3 rows, 2 columns)', () => {
			const result = parseLatex('\\begin{pmatrix}1 & 2 \\\\ 3 & 4 \\\\ 5 & 6\\end{pmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(3);
			expect(matrix.rows[0]).toHaveLength(2);
			expect(matrix.rows[1]).toHaveLength(2);
			expect(matrix.rows[2]).toHaveLength(2);
		});

		it('parses row vector (1x3)', () => {
			const result = parseLatex('\\begin{pmatrix}1 & 2 & 3\\end{pmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(1);
			expect(matrix.rows[0]).toHaveLength(3);
		});

		it('parses column vector (3x1)', () => {
			const result = parseLatex('\\begin{pmatrix}1 \\\\ 2 \\\\ 3\\end{pmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(3);
			expect(matrix.rows[0]).toHaveLength(1);
			expect(matrix.rows[1]).toHaveLength(1);
			expect(matrix.rows[2]).toHaveLength(1);
		});
	});

	// =============================================================================
	// Other Matrix Types
	// =============================================================================

	describe('other matrix environments', () => {
		it('parses bmatrix', () => {
			const result = parseLatex('\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.matrixType).toBe('bmatrix');
		});

		it('parses Bmatrix', () => {
			const result = parseLatex('\\begin{Bmatrix}1 & 2\\end{Bmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.matrixType).toBe('Bmatrix');
		});

		it('parses vmatrix (for determinants)', () => {
			const result = parseLatex('\\begin{vmatrix}a & b \\\\ c & d\\end{vmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.matrixType).toBe('vmatrix');
		});

		it('parses Vmatrix', () => {
			const result = parseLatex('\\begin{Vmatrix}1 & 2\\end{Vmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.matrixType).toBe('Vmatrix');
		});

		it('parses plain matrix (no delimiters)', () => {
			const result = parseLatex('\\begin{matrix}1 & 2 \\\\ 3 & 4\\end{matrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.matrixType).toBe('plain');
		});

		it('parses smallmatrix', () => {
			const result = parseLatex('\\begin{smallmatrix}1 & 2 \\\\ 3 & 4\\end{smallmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.matrixType).toBe('smallmatrix');
		});
	});

	// =============================================================================
	// Complex Elements
	// =============================================================================

	describe('complex matrix elements', () => {
		it('parses matrix with variable elements', () => {
			const result = parseLatex('\\begin{pmatrix}a & b \\\\ c & d\\end{pmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows[0][0].type).toBe('variable');
			expect(matrix.rows[0][1].type).toBe('variable');
		});

		it('parses matrix with expressions', () => {
			const result = parseLatex('\\begin{pmatrix}x+1 & 2y \\\\ 3 & z-1\\end{pmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows[0][0].type).toBe('addition');
			expect(matrix.rows[1][1].type).toBe('subtraction');
		});

		it('parses matrix with fractions', () => {
			const result = parseLatex('\\begin{pmatrix}\\frac{1}{2} & 0 \\\\ 0 & 1\\end{pmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows[0][0].type).toBe('division');
		});

		it('parses matrix with negative numbers', () => {
			const result = parseLatex('\\begin{pmatrix}-1 & 2 \\\\ -3 & -4\\end{pmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows[0][0].type).toBe('opposite');
			expect(matrix.rows[1][0].type).toBe('opposite');
			expect(matrix.rows[1][1].type).toBe('opposite');
		});

		it('parses matrix with Greek letters', () => {
			const result = parseLatex(
				'\\begin{pmatrix}\\alpha & \\beta \\\\ \\gamma & \\theta\\end{pmatrix}'
			);
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows[0][0].type).toBe('greek');
		});
	});

	// =============================================================================
	// Whitespace Handling
	// =============================================================================

	describe('whitespace handling', () => {
		it('handles extra whitespace around elements', () => {
			const result = parseLatex('\\begin{pmatrix}  1  &  2  \\\\  3  &  4  \\end{pmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(2);
			expect(matrix.rows[0]).toHaveLength(2);
		});

		it('handles no whitespace', () => {
			const result = parseLatex('\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(2);
		});

		it('handles newlines in input', () => {
			const result = parseLatex(`\\begin{pmatrix}
				1 & 2 \\\\
				3 & 4
			\\end{pmatrix}`);
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(2);
		});
	});

	// =============================================================================
	// Error Cases
	// =============================================================================

	describe('error handling', () => {
		it('fails on unclosed environment', () => {
			const result = parseLatex('\\begin{pmatrix}1 & 2');
			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('fails on mismatched environment', () => {
			const result = parseLatex('\\begin{pmatrix}1 & 2\\end{bmatrix}');
			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('fails on unknown matrix environment', () => {
			const result = parseLatex('\\begin{unknownmatrix}1\\end{unknownmatrix}');
			expect(result.success).toBe(false);
		});
	});

	// =============================================================================
	// Matrix in Expressions
	// =============================================================================

	describe('matrix in expressions', () => {
		it('parses matrix after number (implicit multiplication)', () => {
			const result = parseLatex('2\\begin{pmatrix}1 & 0 \\\\ 0 & 1\\end{pmatrix}');
			expect(result.success).toBe(true);
			expect(result.ast?.type).toBe('multiplication');
		});

		it('parses matrix addition', () => {
			const result = parseLatex('\\begin{pmatrix}1\\end{pmatrix}+\\begin{pmatrix}2\\end{pmatrix}');
			expect(result.success).toBe(true);
			expect(result.ast?.type).toBe('addition');
		});

		it('parses matrix in equation', () => {
			const result = parseLatex('A=\\begin{pmatrix}1 & 2\\end{pmatrix}');
			expect(result.success).toBe(true);
			expect(result.ast?.type).toBe('relation');
		});
	});
});
