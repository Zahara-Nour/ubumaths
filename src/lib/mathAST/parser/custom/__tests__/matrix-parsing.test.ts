/**
 * TDD Tests for Custom Syntax Matrix Parsing
 *
 * Phase 3: Parser Custom - Test-Driven Development
 *
 * Custom syntax uses Python-like matrix literals: [[1,2],[3,4]]
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPrattSafe } from '../index';
import { isMatrix } from '../../../guards';
import type { MatrixNode, VariableNode } from '../../../types';

// Helper to parse custom syntax and check success
function parseCustom(input: string) {
	const result = parseCustomPrattSafe(input);
	return {
		success: result.ast !== null && result.errors.length === 0,
		ast: result.ast,
		errors: result.errors
	};
}

describe('Custom Syntax Matrix Parsing', () => {
	// =============================================================================
	// Basic Matrix Literals
	// =============================================================================

	describe('basic matrix literals', () => {
		it('parses 2x2 matrix', () => {
			const result = parseCustom('[[1,2],[3,4]]');
			expect(result.success).toBe(true);
			expect(result.ast).not.toBeNull();
			expect(isMatrix(result.ast!)).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.matrixType).toBe('pmatrix'); // Default for custom syntax
			expect(matrix.rows).toHaveLength(2);
			expect(matrix.rows[0]).toHaveLength(2);
			expect(matrix.rows[1]).toHaveLength(2);
		});

		it('parses 1x1 matrix', () => {
			const result = parseCustom('[[5]]');
			expect(result.success).toBe(true);
			expect(isMatrix(result.ast!)).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(1);
			expect(matrix.rows[0]).toHaveLength(1);
		});

		it('parses 3x2 matrix (3 rows, 2 columns)', () => {
			const result = parseCustom('[[1,2],[3,4],[5,6]]');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(3);
			expect(matrix.rows[0]).toHaveLength(2);
			expect(matrix.rows[1]).toHaveLength(2);
			expect(matrix.rows[2]).toHaveLength(2);
		});

		it('parses row vector (1x3)', () => {
			const result = parseCustom('[[1,2,3]]');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(1);
			expect(matrix.rows[0]).toHaveLength(3);
		});

		it('parses column vector (3x1)', () => {
			const result = parseCustom('[[1],[2],[3]]');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(3);
			expect(matrix.rows[0]).toHaveLength(1);
			expect(matrix.rows[1]).toHaveLength(1);
			expect(matrix.rows[2]).toHaveLength(1);
		});
	});

	// =============================================================================
	// Complex Elements
	// =============================================================================

	describe('complex matrix elements', () => {
		it('parses matrix with variable elements', () => {
			const result = parseCustom('[[a,b],[c,d]]');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows[0][0].type).toBe('variable');
			expect(matrix.rows[0][1].type).toBe('variable');
		});

		it('parses matrix with expressions', () => {
			const result = parseCustom('[[x+1,2*y],[3,z-1]]');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows[0][0].type).toBe('addition');
			expect(matrix.rows[1][1].type).toBe('subtraction');
		});

		it('parses matrix with fractions', () => {
			const result = parseCustom('[[1/2,0],[0,1]]');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows[0][0].type).toBe('division');
		});

		it('parses matrix with negative numbers', () => {
			const result = parseCustom('[[-1,2],[-3,-4]]');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows[0][0].type).toBe('opposite');
			expect(matrix.rows[1][0].type).toBe('opposite');
			expect(matrix.rows[1][1].type).toBe('opposite');
		});
	});

	// =============================================================================
	// Whitespace Handling
	// =============================================================================

	describe('whitespace handling', () => {
		it('handles spaces inside matrix', () => {
			const result = parseCustom('[[ 1 , 2 ], [ 3 , 4 ]]');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(2);
			expect(matrix.rows[0]).toHaveLength(2);
		});

		it('handles no whitespace', () => {
			const result = parseCustom('[[1,2],[3,4]]');
			expect(result.success).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows).toHaveLength(2);
		});
	});

	// =============================================================================
	// Disambiguation from Units
	// =============================================================================

	describe('disambiguation from units', () => {
		it('5[m] is parsed as unit, not matrix', () => {
			const result = parseCustom('5[m]');
			expect(result.success).toBe(true);
			expect(result.ast?.type).toBe('unit');
		});

		it('x[kg] is parsed as unit, not matrix', () => {
			const result = parseCustom('x[kg]');
			expect(result.success).toBe(true);
			expect(result.ast?.type).toBe('unit');
		});

		it('[[m]] is parsed as 1x1 matrix containing m', () => {
			const result = parseCustom('[[m]]');
			expect(result.success).toBe(true);
			expect(isMatrix(result.ast!)).toBe(true);

			const matrix = result.ast as MatrixNode;
			expect(matrix.rows[0][0].type).toBe('variable');
			expect((matrix.rows[0][0] as VariableNode).name).toBe('m');
		});
	});

	// =============================================================================
	// Error Cases
	// =============================================================================

	describe('error handling', () => {
		it('fails on unclosed matrix', () => {
			const result = parseCustom('[[1,2');
			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('fails on unclosed row', () => {
			const result = parseCustom('[[1,2],[3,4');
			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('fails on empty matrix', () => {
			const result = parseCustom('[[]]');
			expect(result.success).toBe(false);
		});
	});

	// =============================================================================
	// Matrix in Expressions
	// =============================================================================

	describe('matrix in expressions', () => {
		it('parses matrix after number (implicit multiplication)', () => {
			const result = parseCustom('2[[1,0],[0,1]]');
			expect(result.success).toBe(true);
			expect(result.ast?.type).toBe('multiplication');
		});

		it('parses matrix addition', () => {
			const result = parseCustom('[[1]]+[[2]]');
			expect(result.success).toBe(true);
			expect(result.ast?.type).toBe('addition');
		});

		it('parses matrix in equation', () => {
			const result = parseCustom('A=[[1,2]]');
			expect(result.success).toBe(true);
			expect(result.ast?.type).toBe('relation');
		});
	});
});
