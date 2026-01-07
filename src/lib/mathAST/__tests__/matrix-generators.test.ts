/**
 * Matrix Generator Tests
 *
 * Phase 4: Tests for LaTeX and Custom syntax matrix generation
 */

import { describe, it, expect } from 'vitest';
import { matrix, number, variable, add, subtract, divide, opposite } from '../factory';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';
import { parseLatex } from '../index';
import { parseCustomPratt } from '../parser/custom';
import type { MatrixNode } from '../types';

describe('Matrix LaTeX Generation', () => {
	describe('basic matrices', () => {
		it('generates 2x2 pmatrix', () => {
			const m = matrix(
				[
					[number('1'), number('2')],
					[number('3'), number('4')]
				],
				{ matrixType: 'pmatrix' }
			);
			expect(toLatex(m)).toBe('\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}');
		});

		it('generates 1x1 matrix', () => {
			const m = matrix([[number('5')]], { matrixType: 'pmatrix' });
			expect(toLatex(m)).toBe('\\begin{pmatrix}5\\end{pmatrix}');
		});

		it('generates 3x2 matrix', () => {
			const m = matrix(
				[
					[number('1'), number('2')],
					[number('3'), number('4')],
					[number('5'), number('6')]
				],
				{ matrixType: 'pmatrix' }
			);
			expect(toLatex(m)).toBe('\\begin{pmatrix}1 & 2 \\\\ 3 & 4 \\\\ 5 & 6\\end{pmatrix}');
		});

		it('generates row vector', () => {
			const m = matrix([[number('1'), number('2'), number('3')]], { matrixType: 'pmatrix' });
			expect(toLatex(m)).toBe('\\begin{pmatrix}1 & 2 & 3\\end{pmatrix}');
		});

		it('generates column vector', () => {
			const m = matrix([[number('1')], [number('2')], [number('3')]], { matrixType: 'pmatrix' });
			expect(toLatex(m)).toBe('\\begin{pmatrix}1 \\\\ 2 \\\\ 3\\end{pmatrix}');
		});
	});

	describe('matrix types', () => {
		const simpleRow = [[number('1'), number('2')]];

		it('generates bmatrix (square brackets)', () => {
			const m = matrix(simpleRow, { matrixType: 'bmatrix' });
			expect(toLatex(m)).toBe('\\begin{bmatrix}1 & 2\\end{bmatrix}');
		});

		it('generates Bmatrix (curly braces)', () => {
			const m = matrix(simpleRow, { matrixType: 'Bmatrix' });
			expect(toLatex(m)).toBe('\\begin{Bmatrix}1 & 2\\end{Bmatrix}');
		});

		it('generates vmatrix (vertical bars)', () => {
			const m = matrix(simpleRow, { matrixType: 'vmatrix' });
			expect(toLatex(m)).toBe('\\begin{vmatrix}1 & 2\\end{vmatrix}');
		});

		it('generates Vmatrix (double vertical bars)', () => {
			const m = matrix(simpleRow, { matrixType: 'Vmatrix' });
			expect(toLatex(m)).toBe('\\begin{Vmatrix}1 & 2\\end{Vmatrix}');
		});

		it('generates plain matrix (no delimiters)', () => {
			const m = matrix(simpleRow, { matrixType: 'plain' });
			// 'plain' maps to 'matrix' LaTeX environment
			expect(toLatex(m)).toBe('\\begin{matrix}1 & 2\\end{matrix}');
		});

		it('generates smallmatrix', () => {
			const m = matrix(simpleRow, { matrixType: 'smallmatrix' });
			expect(toLatex(m)).toBe('\\begin{smallmatrix}1 & 2\\end{smallmatrix}');
		});
	});

	describe('complex elements', () => {
		it('generates matrix with variables', () => {
			const m = matrix(
				[
					[variable('a'), variable('b')],
					[variable('c'), variable('d')]
				],
				{ matrixType: 'pmatrix' }
			);
			expect(toLatex(m)).toBe('\\begin{pmatrix}a & b \\\\ c & d\\end{pmatrix}');
		});

		it('generates matrix with expressions', () => {
			const m = matrix(
				[
					[add(variable('x'), number('1')), number('0')],
					[number('0'), subtract(variable('y'), number('1'))]
				],
				{ matrixType: 'pmatrix' }
			);
			expect(toLatex(m)).toBe('\\begin{pmatrix}x + 1 & 0 \\\\ 0 & y - 1\\end{pmatrix}');
		});

		it('generates matrix with fractions', () => {
			const m = matrix(
				[
					[divide(number('1'), number('2'), 'fraction'), number('0')],
					[number('0'), number('1')]
				],
				{ matrixType: 'pmatrix' }
			);
			// Generator uses \dfrac for display fractions
			expect(toLatex(m)).toBe('\\begin{pmatrix}\\dfrac{1}{2} & 0 \\\\ 0 & 1\\end{pmatrix}');
		});

		it('generates matrix with negatives', () => {
			const m = matrix(
				[
					[opposite(number('1')), number('2')],
					[opposite(number('3')), opposite(number('4'))]
				],
				{ matrixType: 'pmatrix' }
			);
			expect(toLatex(m)).toBe('\\begin{pmatrix}-1 & 2 \\\\ -3 & -4\\end{pmatrix}');
		});
	});
});

describe('Matrix Custom Generation', () => {
	describe('basic matrices', () => {
		it('generates 2x2 matrix', () => {
			const m = matrix(
				[
					[number('1'), number('2')],
					[number('3'), number('4')]
				],
				{ matrixType: 'pmatrix' }
			);
			expect(toCustom(m)).toBe('[[1,2],[3,4]]');
		});

		it('generates 1x1 matrix', () => {
			const m = matrix([[number('5')]], { matrixType: 'pmatrix' });
			expect(toCustom(m)).toBe('[[5]]');
		});

		it('generates row vector', () => {
			const m = matrix([[number('1'), number('2'), number('3')]], { matrixType: 'pmatrix' });
			expect(toCustom(m)).toBe('[[1,2,3]]');
		});

		it('generates column vector', () => {
			const m = matrix([[number('1')], [number('2')], [number('3')]], { matrixType: 'pmatrix' });
			expect(toCustom(m)).toBe('[[1],[2],[3]]');
		});
	});

	describe('complex elements', () => {
		it('generates matrix with variables', () => {
			const m = matrix(
				[
					[variable('a'), variable('b')],
					[variable('c'), variable('d')]
				],
				{ matrixType: 'pmatrix' }
			);
			expect(toCustom(m)).toBe('[[a,b],[c,d]]');
		});

		it('generates matrix with expressions', () => {
			const m = matrix(
				[
					[add(variable('x'), number('1')), number('0')],
					[number('0'), subtract(variable('y'), number('1'))]
				],
				{ matrixType: 'pmatrix' }
			);
			expect(toCustom(m)).toBe('[[x+1,0],[0,y-1]]');
		});
	});
});

describe('Matrix Round-Trips', () => {
	describe('LaTeX round-trip', () => {
		it('round-trips pmatrix', () => {
			const input = '\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}';
			const ast = parseLatex(input);
			const output = toLatex(ast);
			expect(output).toBe(input);
		});

		it('round-trips bmatrix', () => {
			const input = '\\begin{bmatrix}a & b \\\\ c & d\\end{bmatrix}';
			const ast = parseLatex(input);
			const output = toLatex(ast);
			expect(output).toBe(input);
		});

		it('round-trips vmatrix (determinant)', () => {
			const input = '\\begin{vmatrix}1 & 0 \\\\ 0 & 1\\end{vmatrix}';
			const ast = parseLatex(input);
			const output = toLatex(ast);
			expect(output).toBe(input);
		});
	});

	describe('Custom round-trip', () => {
		it('round-trips 2x2 matrix', () => {
			const input = '[[1,2],[3,4]]';
			const ast = parseCustomPratt(input);
			const output = toCustom(ast);
			expect(output).toBe(input);
		});

		it('round-trips matrix with variables', () => {
			const input = '[[a,b],[c,d]]';
			const ast = parseCustomPratt(input);
			const output = toCustom(ast);
			expect(output).toBe(input);
		});

		it('round-trips row vector', () => {
			const input = '[[1,2,3]]';
			const ast = parseCustomPratt(input);
			const output = toCustom(ast);
			expect(output).toBe(input);
		});

		it('round-trips column vector', () => {
			const input = '[[1],[2],[3]]';
			const ast = parseCustomPratt(input);
			const output = toCustom(ast);
			expect(output).toBe(input);
		});
	});

	describe('cross-format conversion', () => {
		it('converts LaTeX pmatrix to custom', () => {
			const latex = '\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}';
			const ast = parseLatex(latex);
			expect(toCustom(ast)).toBe('[[1,2],[3,4]]');
		});

		it('converts custom to LaTeX pmatrix', () => {
			const custom = '[[1,2],[3,4]]';
			const ast = parseCustomPratt(custom);
			expect(toLatex(ast)).toBe('\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}');
		});

		it('preserves matrix type from LaTeX', () => {
			const latex = '\\begin{bmatrix}1 & 2\\end{bmatrix}';
			const ast = parseLatex(latex) as MatrixNode;
			expect(ast.matrixType).toBe('bmatrix');
			expect(toLatex(ast)).toBe(latex);
		});

		it('custom matrices default to pmatrix type', () => {
			const custom = '[[1,2]]';
			const ast = parseCustomPratt(custom) as MatrixNode;
			expect(ast.matrixType).toBe('pmatrix');
		});
	});
});
