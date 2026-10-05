/**
 * Réponse « matrice » : lecture d'une matrice dans UNE case, dimensions, puis
 * coefficients comparés PAR VALEUR (exactement). Constat du 2026-10-05 : dans une
 * case ordinaire, la matrice était comparée au TEXTE (espaces de MathLive, `1+1`,
 * `\frac{4}{2}` jugés faux).
 */

import { describe, it, expect } from 'vitest';
import {
	judgeMatrixAnswer,
	readExpectedMatrix,
	expectedMatrixLatex,
	matrixEntryTexts,
	MATRIX_FEEDBACK
} from '../matrix-answer';

const M = '\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}';

describe('M1 — même matrice, plusieurs écritures', () => {
	it.each([
		M,
		// Écriture de MathLive : espaces autour de `&`, `\\ ` entre les lignes
		'\\begin{pmatrix}1 & 2\\\\ 3 & 4\\end{pmatrix}',
		'\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
		'\\left(\\begin{matrix}1&2\\\\3&4\\end{matrix}\\right)',
		'A=\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}',
		'AB=\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}',
		'M^{2}=\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}',
		'A^{-1}=\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}',
		// Coefficients comparés par valeur
		'\\begin{pmatrix}1&1+1\\\\\\frac{6}{2}&4\\end{pmatrix}',
		'\\begin{pmatrix}1.0&2\\\\3&4\\end{pmatrix}',
		// Ligne vide finale (`\\` de trop)
		'\\begin{pmatrix}1&2\\\\3&4\\\\\\end{pmatrix}'
	])('%s', (answer) => {
		expect(judgeMatrixAnswer(answer, M).status).toBe('correct');
	});

	it('fractions, racines, décimaux à virgule : comparés exactement', () => {
		const expected = '\\begin{pmatrix}\\frac{1}{2}&\\sqrt{2}\\\\0.3&-1\\end{pmatrix}';
		expect(
			judgeMatrixAnswer(
				'\\begin{pmatrix}0{,}5&\\frac{2}{\\sqrt2}\\\\\\frac{3}{10}&-1\\end{pmatrix}',
				expected
			).status
		).toBe('correct');
		expect(
			judgeMatrixAnswer('\\begin{pmatrix}0.5&1.414\\\\0.3&-1\\end{pmatrix}', expected).status
		).toBe('incorrect');
	});
});

describe('M2 — coefficient faux, produit dans le mauvais ordre', () => {
	it('un coefficient faux : faux, sans message', () => {
		const verdict = judgeMatrixAnswer('\\begin{pmatrix}1&2\\\\3&5\\end{pmatrix}', M);
		expect(verdict).toEqual({ status: 'incorrect' });
	});

	it('transposée : fausse', () => {
		expect(judgeMatrixAnswer('\\begin{pmatrix}1&3\\\\2&4\\end{pmatrix}', M).status).toBe(
			'incorrect'
		);
	});
});

describe('M3 — dimensions', () => {
	it('mauvaise dimension : faux, message avec la taille attendue', () => {
		const verdict = judgeMatrixAnswer('\\begin{pmatrix}1&2&0\\\\3&4&0\\end{pmatrix}', M);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(MATRIX_FEEDBACK.dimension(2, 2));
		expect(verdict.feedback).toBe('La matrice attendue a 2 lignes et 2 colonnes.');
	});

	it('colonne attendue, ligne écrite : faux, message', () => {
		const verdict = judgeMatrixAnswer(
			'\\begin{pmatrix}1&2\\end{pmatrix}',
			'\\begin{pmatrix}1\\\\2\\end{pmatrix}'
		);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe('La matrice attendue a 2 lignes et 1 colonne.');
	});

	it('ligne attendue (distribution) : lue et jugée', () => {
		const pi = '\\begin{pmatrix}0.4&0.6\\end{pmatrix}';
		expect(judgeMatrixAnswer('\\begin{pmatrix}0.4 & 0.6\\end{pmatrix}', pi).status).toBe('correct');
		expect(judgeMatrixAnswer('\\begin{pmatrix}0.6&0.4\\end{pmatrix}', pi).status).toBe('incorrect');
	});

	it('lignes de longueurs différentes : faux, message', () => {
		const verdict = judgeMatrixAnswer('\\begin{pmatrix}1&2\\\\3\\end{pmatrix}', M);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(MATRIX_FEEDBACK.ragged);
	});

	it('3 × 3 : lue', () => {
		const I3 = '\\begin{pmatrix}1&0&0\\\\0&1&0\\\\0&0&1\\end{pmatrix}';
		expect(
			judgeMatrixAnswer('\\begin{pmatrix}1 & 0 & 0\\\\ 0 & 1 & 0\\\\ 0 & 0 & 1\\end{pmatrix}', I3)
				.status
		).toBe('correct');
	});
});

describe('M4 — écritures refusées, jamais d’exception', () => {
	it('pas une matrice : faux, message', () => {
		for (const answer of ['5', '(1;2)', '\\begin{pmatrix}', 'x']) {
			const verdict = judgeMatrixAnswer(answer, M);
			expect(verdict.status).toBe('incorrect');
			expect(verdict.feedback).toBe(MATRIX_FEEDBACK.notMatrix);
		}
	});

	it('facteur devant la matrice, valeur juste : perfectible, « Distribue le facteur » (décision du 2026-10-06)', () => {
		for (const answer of [
			'\\frac{1}{2}\\begin{pmatrix}2&4\\\\6&8\\end{pmatrix}',
			'A^{-1}=\\frac{1}{2}\\begin{pmatrix}2&4\\\\6&8\\end{pmatrix}',
			'2\\begin{pmatrix}0.5&1\\\\1.5&2\\end{pmatrix}',
			'\\frac{1}{2}\\times\\begin{pmatrix}2&4\\\\6&8\\end{pmatrix}',
			'\\frac{1}{2}\\cdot\\begin{pmatrix}2&4\\\\6&8\\end{pmatrix}',
			'\\frac{1}{2}\\left(\\begin{matrix}2&4\\\\6&8\\end{matrix}\\right)',
			'-\\begin{pmatrix}-1&-2\\\\-3&-4\\end{pmatrix}',
			// Écriture de MathLive (espaces)
			'\\frac{1}{2} \\begin{pmatrix}2 & 4\\\\ 6 & 8\\end{pmatrix}'
		]) {
			const verdict = judgeMatrixAnswer(answer, M);
			expect(verdict.status, answer).toBe('unoptimal_form');
			expect(verdict.feedback).toBe(MATRIX_FEEDBACK.factored);
			expect(MATRIX_FEEDBACK.factored).toBe('Distribue le facteur dans la matrice.');
		}
	});

	it('facteur devant la matrice, valeur fausse : faux, sans message de forme', () => {
		for (const answer of [
			// facteur oublié dans le calcul (1/3 au lieu de 1/2)
			'\\frac{1}{3}\\begin{pmatrix}2&4\\\\6&8\\end{pmatrix}',
			// transposée
			'\\frac{1}{2}\\begin{pmatrix}2&6\\\\4&8\\end{pmatrix}'
		]) {
			const verdict = judgeMatrixAnswer(answer, M);
			expect(verdict.status, answer).toBe('incorrect');
			expect(verdict.feedback).toBeUndefined();
		}
	});

	it('facteur devant une matrice de mauvaise taille : faux, message de dimension', () => {
		const verdict = judgeMatrixAnswer('\\frac{1}{2}\\begin{pmatrix}2&4\\end{pmatrix}', M);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(MATRIX_FEEDBACK.dimension(2, 2));
	});

	it('facteur illisible ou littéral devant la matrice : faux, sans exception', () => {
		for (const answer of [
			'x\\begin{pmatrix}2&4\\\\6&8\\end{pmatrix}',
			'\\frac{1}{0}\\begin{pmatrix}2&4\\\\6&8\\end{pmatrix}',
			'\\begin{pmatrix}1\\end{pmatrix}\\begin{pmatrix}2&4\\\\6&8\\end{pmatrix}'
		]) {
			expect(judgeMatrixAnswer(answer, M).status, answer).toBe('incorrect');
		}
	});

	it('attendue écrite avec un facteur : illisible pour les specs', () => {
		expect(readExpectedMatrix('\\frac{1}{2}\\begin{pmatrix}2&4\\\\6&8\\end{pmatrix}').ok).toBe(
			false
		);
	});

	it('coefficient vide (case du gabarit non remplie) : faux, message', () => {
		const verdict = judgeMatrixAnswer('\\begin{pmatrix}1&2\\\\3&\\placeholder{}\\end{pmatrix}', M);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(MATRIX_FEEDBACK.incomplete);
	});

	it.each([
		'\\begin{pmatrix}1&2\\\\3&x\\end{pmatrix}',
		'\\begin{pmatrix}1&2\\\\3&\\frac{1}{0}\\end{pmatrix}',
		'\\begin{pmatrix}1&2\\\\3&(1+\\sqrt2)^{999}\\end{pmatrix}',
		`\\begin{pmatrix}${'{'.repeat(300)}1${'}'.repeat(300)}&2\\\\3&4\\end{pmatrix}`
	])('%s : faux', (answer) => {
		expect(judgeMatrixAnswer(answer, M).status).toBe('incorrect');
	});

	it('rien d’écrit : empty', () => {
		expect(judgeMatrixAnswer('  ', M).status).toBe('empty');
	});

	it('attendue illisible : faux', () => {
		expect(judgeMatrixAnswer(M, '1&2').status).toBe('incorrect');
	});
});

describe('M5 — attendue écrite par l’auteur (specs)', () => {
	it('lisible : ok', () => {
		expect(readExpectedMatrix(M)).toEqual({ ok: true });
	});

	it.each([
		['1;2', /matrice/],
		['\\begin{pmatrix}1&2\\\\3\\end{pmatrix}', /lignes/],
		['\\begin{pmatrix}1&x\\\\3&4\\end{pmatrix}', /illisible/],
		['\\begin{pmatrix}1&\\frac{1}{0}\\\\3&4\\end{pmatrix}', /non défini/]
	])('%s : refusée', (expected, message) => {
		const read = readExpectedMatrix(expected);
		expect(read.ok).toBe(false);
		if (!read.ok) expect(read.error).toMatch(message);
	});
});

describe('M6 — lecture et affichage', () => {
	it('coefficients lus ligne par ligne', () => {
		expect(matrixEntryTexts('\\begin{pmatrix}1 & -2\\\\ \\frac{1}{2} & 4\\end{pmatrix}')).toEqual([
			['1', '-2'],
			['\\frac{1}{2}', '4']
		]);
	});

	it('attendue affichée en pmatrix', () => {
		expect(expectedMatrixLatex('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}')).toBe(M);
		expect(expectedMatrixLatex('illisible')).toBe('illisible');
	});
});
