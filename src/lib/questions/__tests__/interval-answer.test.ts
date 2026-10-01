/**
 * Jugement d'une réponse « intervalles » (ensemble de solutions d'une inéquation).
 * Comportements 17 à 29 et 31 validés par David le 2026-10-01
 * (docs/wip/reponse-intervalles-progress.md).
 */

import { describe, it, expect } from 'vitest';
import {
	judgeIntervalAnswer,
	readExpectedIntervals,
	INTERVAL_FEEDBACK
} from '$lib/questions/intervals/interval-answer';

const SOLUTION = ']-\\infty;-2[\\cup]3;+\\infty[';

describe('17 — réunion juste, ordre indifférent', () => {
	it('la réunion attendue est juste', () => {
		expect(judgeIntervalAnswer(SOLUTION, SOLUTION).status).toBe('correct');
	});

	it('dans l’ordre inverse, elle est juste aussi', () => {
		expect(judgeIntervalAnswer(']3;+\\infty[\\cup]-\\infty;-2[', SOLUTION).status).toBe('correct');
	});
});

describe('18 — ℝ privé d’un point ≡ réunion', () => {
	it('ℝ \\ {2} pour ]-∞ ; 2[ ∪ ]2 ; +∞[', () => {
		expect(
			judgeIntervalAnswer('\\mathbb{R}\\setminus\\{2\\}', ']-\\infty;2[\\cup]2;+\\infty[').status
		).toBe('correct');
	});

	it(']-∞ ; 2[ ∪ ]2 ; +∞[ pour ℝ \\ {2}', () => {
		expect(
			judgeIntervalAnswer(']-\\infty;2[\\cup]2;+\\infty[', '\\mathbb{R}\\setminus\\{2\\}').status
		).toBe('correct');
	});
});

describe('19 — ensemble vide et ℝ', () => {
	it.each(['\\emptyset', '\\varnothing', '\\{\\}'])('%s est juste si S = ∅', (answer) => {
		expect(judgeIntervalAnswer(answer, '\\emptyset').status).toBe('correct');
	});

	it('ℝ est juste si S = ℝ', () => {
		expect(judgeIntervalAnswer('\\mathbb{R}', '\\mathbb{R}').status).toBe('correct');
		expect(judgeIntervalAnswer(']-\\infty;+\\infty[', '\\mathbb{R}').status).toBe('correct');
	});

	it('∅ est faux si S = ℝ', () => {
		expect(judgeIntervalAnswer('\\emptyset', '\\mathbb{R}').status).toBe('incorrect');
	});
});

describe('20 — singleton', () => {
	it('{3} est juste', () => {
		expect(judgeIntervalAnswer('\\{3\\}', '\\{3\\}').status).toBe('correct');
	});

	it('[3 ; 3] vaut ½, avec le message des accolades', () => {
		const verdict = judgeIntervalAnswer('[3;3]', '\\{3\\}');
		expect(verdict).toEqual({ status: 'unoptimal_form', feedback: INTERVAL_FEEDBACK.singleton });
	});
});

describe('21 — intervalles contigus ou chevauchants non réunis', () => {
	it.each([']1;2]\\cup[2;3]', ']1;2[\\cup[2;3]', ']1;2{,}5]\\cup[2;3]'])(
		'%s pour ]1 ; 3] vaut ½ avec message',
		(answer) => {
			expect(judgeIntervalAnswer(answer, ']1;3]')).toEqual({
				status: 'unoptimal_form',
				feedback: INTERVAL_FEEDBACK.contiguous
			});
		}
	);

	it('réglage intervalForm : strict = mauvaise forme, off = juste', () => {
		expect(judgeIntervalAnswer(']1;2]\\cup[2;3]', ']1;3]', 'strict').status).toBe('bad_form');
		expect(judgeIntervalAnswer(']1;2]\\cup[2;3]', ']1;3]', 'off').status).toBe('correct');
	});

	it(']-∞ ; 2[ ∪ ]2 ; +∞[ n’est PAS contigu (2 exclu)', () => {
		expect(
			judgeIntervalAnswer(']-\\infty;2[\\cup]2;+\\infty[', '\\mathbb{R}\\setminus\\{2\\}').status
		).toBe('correct');
	});
});

describe('22 — bornes exactes', () => {
	const expected = ']-\\infty;1-sqrt(2)[';

	it('une écriture exacte équivalente est juste', () => {
		expect(judgeIntervalAnswer(']-\\infty;1-\\sqrt{2}[', expected).status).toBe('correct');
		expect(judgeIntervalAnswer(']-\\infty;-\\sqrt2+1[', expected).status).toBe('correct');
	});

	it('une borne irrationnelle arrondie est fausse', () => {
		const verdict = judgeIntervalAnswer(']-\\infty;-0{,}41[', expected);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe('La valeur de la borne est incorrecte.');
	});

	it('une borne non simplifiée (\\frac42) vaut ½', () => {
		expect(judgeIntervalAnswer(']\\frac42;+\\infty[', ']2;+\\infty[')).toEqual({
			status: 'unoptimal_form',
			feedback: INTERVAL_FEEDBACK.unsimplified
		});
	});

	it('une fraction irréductible attendue est juste', () => {
		expect(judgeIntervalAnswer(']-\\frac{3}{2};+\\infty[', ']-3/2;+\\infty[').status).toBe(
			'correct'
		);
	});
});

describe('23 — crochet', () => {
	it(']2 ; 3] pour ]2 ; 3[ est faux, avec le message du crochet', () => {
		const verdict = judgeIntervalAnswer(']2;3]', ']2;3[');
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe('Tu as inclus une borne qui devrait être exclue.');
	});

	it('un crochet faux dans une réunion est signalé aussi', () => {
		const verdict = judgeIntervalAnswer(']-\\infty;-2]\\cup]3;+\\infty[', SOLUTION);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe('Tu as inclus une borne qui devrait être exclue.');
	});

	it('un intervalle oublié dans la réunion est signalé', () => {
		const verdict = judgeIntervalAnswer(']3;+\\infty[', SOLUTION);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe('Il manque une partie de la réunion dans ta réponse.');
	});
});

describe('24 à 27 — écritures refusées, avec leur message', () => {
	it('24 — [-∞ ; 2] : l’infini est toujours exclu', () => {
		expect(judgeIntervalAnswer('[-\\infty;2]', ']-\\infty;2]')).toEqual({
			status: 'incorrect',
			feedback: INTERVAL_FEEDBACK.closedInfinity
		});
	});

	it('25 — ]3 ; -2[ : bornes dans l’ordre croissant', () => {
		expect(judgeIntervalAnswer(']3;-2[', ']-2;3[')).toEqual({
			status: 'incorrect',
			feedback: INTERVAL_FEEDBACK.boundsOrder
		});
	});

	it('26 — x < -2 : écris un ensemble', () => {
		expect(judgeIntervalAnswer('x<-2', ']-\\infty;-2[')).toEqual({
			status: 'incorrect',
			feedback: INTERVAL_FEEDBACK.notASet
		});
	});

	it('27 — ]0,5 ; 1[ est lu 0,5', () => {
		expect(judgeIntervalAnswer(']0{,}5;1[', ']1/2;1[').status).toBe('correct');
		expect(judgeIntervalAnswer(']0,5;1[', ']1/2;1[').status).toBe('correct');
	});

	it('27 — ]2,3[ : sépare les bornes par un point-virgule', () => {
		expect(judgeIntervalAnswer(']2,3[', ']2;3[')).toEqual({
			status: 'incorrect',
			feedback: INTERVAL_FEEDBACK.separator
		});
	});

	it('réponse illisible : faux, avec un message', () => {
		expect(judgeIntervalAnswer('bonjour', ']2;3[')).toEqual({
			status: 'incorrect',
			feedback: INTERVAL_FEEDBACK.unreadable
		});
	});
});

describe('28 — écritures produites par MathLive au vrai clavier (phase 0)', () => {
	it.each([
		// smartFence désactivé (réglage des cases « intervalles »)
		[']2;3[', ']2;3['],
		['[2;3[', '[2;3['],
		[']-\\infty;2[\\cup]3;+\\infty[', ']-\\infty;2[\\cup]3;+\\infty['],
		[']-\\infty;2[U]3;+\\infty[', ']-\\infty;2[\\cup]3;+\\infty['],
		['\\lbrace3\\rbrace', '\\{3\\}'],
		['\\{3\\}', '\\{3\\}'],
		['\\R\\setminus\\lbrace2\\rbrace', '\\mathbb{R}\\setminus\\{2\\}'],
		['\\R', '\\mathbb{R}'],
		['R', '\\mathbb{R}'],
		['\\lbrace\\rbrace', '\\emptyset'],
		[']\\,2\\,;\\,3\\,[', ']2;3['],
		['\\frac{]3}{2};+\\infty[', ']3/2;+\\infty['],
		[']-\\infty;-\\frac32[', ']-\\infty;-3/2['],
		[']1-\\sqrt2;2[', ']1-sqrt(2);2['],
		[']0;\\pi[', ']0;\\pi['],
		// smartFence actif : écritures sans ambiguïté
		['\\left\\lbrack2;3\\right\\rbrack', '[2;3]'],
		['\\left\\lbrace3\\right\\rbrace', '\\{3\\}'],
		['\\left\\lbrack3;3\\right\\rbrack', '[3;3]']
	])('%s est lu comme %s', (answer, expected) => {
		expect(judgeIntervalAnswer(answer, expected).status).not.toBe('incorrect');
	});
});

describe('29 — « S = » en tête, réponse vide', () => {
	it.each(['S=]2;3[', 'S = ]2;3[', 'S=\\left\\rbrack2;3\\right\\lbrack'])(
		'%s est juste',
		(answer) => {
			expect(judgeIntervalAnswer(answer, ']2;3[').status).toBe('correct');
		}
	);

	it.each(['', '  ', 'S=', 'S = '])('« %s » est vide', (answer) => {
		expect(judgeIntervalAnswer(answer, ']2;3[').status).toBe('empty');
	});
});

describe('31 — réponse attendue du modèle', () => {
	it('lisible : rend l’ensemble', () => {
		expect(readExpectedIntervals(SOLUTION).ok).toBe(true);
		expect(readExpectedIntervals(']-\\infty;(1-sqrt(5))/2]').ok).toBe(true);
	});

	it('illisible : erreur, sans lever', () => {
		const result = readExpectedIntervals(']2;x[');
		expect(result.ok).toBe(false);
	});

	it('côté élève, une réponse attendue illisible rend faux sans lever', () => {
		expect(judgeIntervalAnswer(']2;3[', 'n’importe quoi').status).toBe('incorrect');
	});
});
