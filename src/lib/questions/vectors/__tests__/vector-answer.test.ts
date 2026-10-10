/**
 * Réponse « vecteur » : lecture d'un vecteur dans UNE case et jugement exact ou
 * colinéaire. Comportements : docs/archive/wip/reponse-vecteur-premier-progress.md.
 */

import { describe, it, expect } from 'vitest';
import {
	judgeVectorAnswer,
	readExpectedVector,
	expectedVectorLatex,
	VECTOR_FEEDBACK
} from '../vector-answer';

const U = '(2;-3)';

describe('V1 — mode exact : mêmes coordonnées, plusieurs écritures', () => {
	it.each([
		'(2;-3)',
		'\\left(2;-3\\right)',
		'(2\\,;\\,-3)',
		'( 2 ; -3 )',
		'\\begin{pmatrix}2\\\\-3\\end{pmatrix}',
		'\\begin{pmatrix}2\\\\ -3\\end{pmatrix}',
		'\\vec{u}=(2;-3)',
		'\\vec{u}\\begin{pmatrix}2\\\\-3\\end{pmatrix}',
		'\\overrightarrow{AB}=\\left(2;-3\\right)',
		'(1+1;-\\frac{6}{2})'
	])('%s', (answer) => {
		expect(judgeVectorAnswer(answer, U).status).toBe('correct');
	});

	it('attendue écrite en colonne, réponse en ligne', () => {
		expect(judgeVectorAnswer('(2;-3)', '\\begin{pmatrix}2\\\\-3\\end{pmatrix}').status).toBe(
			'correct'
		);
	});
});

describe('V2 — mode exact : un colinéaire n’est pas le vecteur attendu', () => {
	it.each(['(-2;3)', '(4;-6)', '(-3;2)', '(2;3)'])('%s', (answer) => {
		expect(judgeVectorAnswer(answer, U).status).toBe('incorrect');
	});
});

describe('V3 — mode colinéaire : tout vecteur colinéaire non nul', () => {
	it.each([
		'(2;-3)',
		'(-2;3)',
		'(4;-6)',
		'(1;-\\frac32)',
		'(\\frac{2}{3};-1)',
		'(2\\sqrt{2};-3\\sqrt{2})',
		'\\begin{pmatrix}-20\\\\30\\end{pmatrix}'
	])('%s', (answer) => {
		expect(judgeVectorAnswer(answer, U, 'colineaire').status).toBe('correct');
	});

	it('une coordonnée nulle attendue', () => {
		expect(judgeVectorAnswer('(0;-5)', '(0;1)', 'colineaire').status).toBe('correct');
		expect(judgeVectorAnswer('(1;5)', '(0;1)', 'colineaire').status).toBe('incorrect');
	});
});

describe('V4 — mode colinéaire : vecteur nul et non colinéaire', () => {
	it('le vecteur nul est faux, avec un message', () => {
		expect(judgeVectorAnswer('(0;0)', U, 'colineaire')).toEqual({
			status: 'incorrect',
			feedback: VECTOR_FEEDBACK.zero
		});
	});

	it.each(['(3;2)', '(2;3)', '(1;-1)'])('%s', (answer) => {
		expect(judgeVectorAnswer(answer, U, 'colineaire').status).toBe('incorrect');
	});
});

describe('V5 — coordonnées exactes : fractions, racines, décimaux', () => {
	const expected = '(\\frac12;\\sqrt2)';

	it.each([
		'(\\frac12;\\sqrt2)',
		'(0,5;\\frac{2}{\\sqrt2})',
		'(0.5;\\sqrt{2})',
		'(\\frac{2}{4};\\frac{\\sqrt8}{2})'
	])('%s', (answer) => {
		expect(judgeVectorAnswer(answer, expected).status).toBe('correct');
	});

	it.each(['(0,5;1,414)', '(0,5;1,4142135623730951)', '(\\frac13;\\sqrt2)'])(
		'%s : valeur approchée ou fausse',
		(answer) => {
			expect(judgeVectorAnswer(answer, expected).status).toBe('incorrect');
		}
	);

	it('√8 et 2√2', () => {
		expect(judgeVectorAnswer('(\\sqrt8;1)', '(2\\sqrt2;1)').status).toBe('correct');
	});
});

describe('V6 — dimension 3 et mauvaise dimension', () => {
	it.each([
		['(1;2;3)', 'exact', 'correct'],
		['\\begin{pmatrix}1\\\\2\\\\3\\end{pmatrix}', 'exact', 'correct'],
		['(-2;-4;-6)', 'colineaire', 'correct'],
		['(-2;-4;-5)', 'colineaire', 'incorrect'],
		['(1;2)', 'exact', 'incorrect'],
		['(1;2;3;4)', 'exact', 'incorrect']
	] as const)('%s (%s) → %s', (answer, mode, status) => {
		expect(judgeVectorAnswer(answer, '(1;2;3)', mode).status).toBe(status);
	});

	it('mauvaise dimension : message', () => {
		expect(judgeVectorAnswer('(1;2;3)', U).feedback).toBe(VECTOR_FEEDBACK.dimension(2));
	});
});

describe('V7 — illisible : faux, jamais d’exception', () => {
	it.each([
		')(',
		'(2,3)',
		'(x;1)',
		'2;3',
		'(2;)',
		'(;3)',
		'(2;3',
		'(2;3)(4;5)',
		'\\begin{pmatrix}2 & 3\\end{pmatrix}',
		'\\begin{pmatrix}2\\\\\\end{pmatrix}',
		'(\\frac{1}{0};1)',
		'((1+\\sqrt2)^{999};1)',
		'5',
		'abc'
	])('%s', (answer) => {
		const verdict = judgeVectorAnswer(answer, U);
		expect(verdict.status).toBe('incorrect');
	});

	it('message « écris un vecteur » sur une écriture qui n’en est pas un', () => {
		expect(judgeVectorAnswer('5', U).feedback).toBe(VECTOR_FEEDBACK.notVector);
	});

	it('rien d’écrit : empty', () => {
		expect(judgeVectorAnswer('  ', U).status).toBe('empty');
	});
});

describe('attendue du modèle', () => {
	it.each(['(2;-3)', '\\begin{pmatrix}1\\\\2\\\\3\\end{pmatrix}', '(\\frac12;\\sqrt2)'])(
		'%s lisible',
		(expected) => {
			expect(readExpectedVector(expected, 'exact').ok).toBe(true);
		}
	);

	it.each(['2', '(x;1)', '(1;2;3;4)', '(1)'])('%s illisible', (expected) => {
		expect(readExpectedVector(expected, 'exact').ok).toBe(false);
	});

	it('attendue nulle : admise en mode exact, refusée en mode colinéaire', () => {
		expect(readExpectedVector('(0;0)', 'exact').ok).toBe(true);
		expect(readExpectedVector('(0;0)', 'colineaire').ok).toBe(false);
	});

	it('rendu de l’attendue : colonne', () => {
		expect(expectedVectorLatex('(2;-3)')).toBe('\\begin{pmatrix}2\\\\-3\\end{pmatrix}');
		expect(expectedVectorLatex('\\left(\\frac12;\\sqrt2\\right)')).toBe(
			'\\begin{pmatrix}\\frac12\\\\\\sqrt2\\end{pmatrix}'
		);
		expect(expectedVectorLatex(')(')).toBe(')(');
	});
});
