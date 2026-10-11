/**
 * Jugement d'une réponse « intervalles » (ensemble de solutions d'une inéquation).
 * Comportements 17 à 29 et 31 validés par David le 2026-10-01
 * (docs/archive/wip/reponse-intervalles-progress.md).
 */

import { describe, it, expect } from 'vitest';
import {
	judgeIntervalAnswer,
	readExpectedIntervals,
	expectedIntervalsLatex,
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
		expect(verdict).toEqual({
			status: 'unoptimal_form',
			feedback: INTERVAL_FEEDBACK.singleton('3')
		});
		expect(verdict.feedback).toContain('{3}');
	});

	it('le message du singleton affiche la vraie valeur (décimal à virgule)', () => {
		expect(judgeIntervalAnswer('[0{,}5;0{,}5]', '\\{1/2\\}').feedback).toBe(
			INTERVAL_FEEDBACK.singleton('0,5')
		);
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

describe('expectedIntervalsLatex — réponse attendue affichée (corrigé, flash back)', () => {
	it.each([
		[
			']-\\infty;1-sqrt(2)[\\cup]3/2;+\\infty[',
			']-\\infty;1 - \\sqrt{2}[\\cup]\\dfrac{3}{2};+\\infty['
		],
		['[-1;2]', '[-1;2]'],
		[']0.5;1]', ']0{,}5;1]'],
		['\\emptyset', '\\emptyset'],
		['\\mathbb{R}', '\\mathbb{R}'],
		['\\{3\\}', '\\{3\\}'],
		['\\mathbb{R}\\setminus\\{2\\}', '\\mathbb{R}\\setminus\\{2\\}']
	])('%s → %s', (expected, latex) => {
		expect(expectedIntervalsLatex(expected)).toBe(latex);
	});

	it('se relit comme la réponse attendue (aller-retour)', () => {
		const expected = ']-\\infty;(1-sqrt(5))/2]\\cup[(1+sqrt(5))/2;+\\infty[';
		expect(judgeIntervalAnswer(expectedIntervalsLatex(expected), expected).status).toBe('correct');
	});

	it('illisible : rendue telle quelle', () => {
		expect(expectedIntervalsLatex(']2;x[')).toBe(']2;x[');
	});
});

// ============================================================================
// Relecture du 2026-10-01
// ============================================================================

/** n radicaux imbriqués autour de 2 */
function nestedRoots(n: number): string {
	return '\\sqrt{'.repeat(n) + '2' + '}'.repeat(n);
}

describe('borne hostile : jugée vite, illisible avec un message', () => {
	it.each([12, 50])('%s radicaux imbriqués : moins de 200 ms', (depth) => {
		const start = performance.now();
		const verdict = judgeIntervalAnswer(`]${nestedRoots(depth)};3[`, ']1;3[');
		expect(performance.now() - start).toBeLessThan(200);
		expect(verdict).toEqual({ status: 'incorrect', feedback: INTERVAL_FEEDBACK.tooComplex });
	});

	it('borne trop longue', () => {
		const long = Array.from({ length: 40 }, () => '1').join('+');
		expect(judgeIntervalAnswer(`]${long};50[`, ']1;50[')).toEqual({
			status: 'incorrect',
			feedback: INTERVAL_FEEDBACK.tooComplex
		});
	});

	it('imbrication au-delà de 100 niveaux : jamais d’exception', () => {
		const deep = `]${'('.repeat(150)}2${')'.repeat(150)};3[`;
		expect(() => judgeIntervalAnswer(deep, ']2;3[')).not.toThrow();
		expect(judgeIntervalAnswer(deep, ']2;3[').status).toBe('incorrect');
	});

	it('une borne exacte usuelle reste lue', () => {
		expect(judgeIntervalAnswer(']\\frac{1+\\sqrt{5}}{2};3[', '](1+sqrt(5))/2;3[').status).toBe(
			'correct'
		);
	});
});

describe('points exclus dans une réunion', () => {
	it(']0;5[ \\ {2} n’est pas ]0;5[', () => {
		expect(judgeIntervalAnswer(']0;5[\\setminus\\{2\\}', ']0;5[').status).toBe('incorrect');
		expect(judgeIntervalAnswer(']0;5[\\setminus\\{2\\}', ']0;5[', 'off').status).toBe('incorrect');
	});

	it(']0;5[ \\ {2} = ]0;2[ ∪ ]2;5[', () => {
		expect(judgeIntervalAnswer(']0;5[\\setminus\\{2\\}', ']0;2[\\cup]2;5[').status).toBe('correct');
		expect(
			judgeIntervalAnswer(']0;5[\\setminus\\{2\\}\\cup]6;7[', ']0;2[\\cup]2;5[\\cup]6;7[').status
		).toBe('correct');
	});

	it(']-∞;+∞[ \\ {2} = ℝ \\ {2}', () => {
		expect(
			judgeIntervalAnswer(']-\\infty;+\\infty[\\setminus\\{2\\}', '\\mathbb{R}\\setminus\\{2\\}')
				.status
		).toBe('correct');
	});

	it('point oublié entre deux intervalles contigus : message', () => {
		expect(judgeIntervalAnswer(']0;2[\\cup]2;5[', ']0;5[')).toEqual({
			status: 'incorrect',
			feedback: 'Tu as oublié le point 2.'
		});
	});
});

describe('virgule décimale entre accolades', () => {
	it('{0,5} est un seul point', () => {
		expect(judgeIntervalAnswer('\\lbrace0,5\\rbrace', '\\{1/2\\}').status).toBe('correct');
		expect(
			judgeIntervalAnswer('\\R\\setminus\\lbrace0,5\\rbrace', '\\mathbb{R}\\setminus\\{1/2\\}')
				.status
		).toBe('correct');
	});

	it('virgule comme séparateur de points : message des ensembles', () => {
		expect(judgeIntervalAnswer('\\{1,-2\\}', '\\{-2;1\\}')).toEqual({
			status: 'incorrect',
			feedback: INTERVAL_FEEDBACK.setSeparator
		});
	});
});

// Décision de David, 2026-10-05 : la virgule reste refusée (c'est le séparateur décimal),
// avec un message propre aux ensembles finis.
describe('ensemble fini : virgule au lieu du point-virgule', () => {
	const expected = '\\{\\frac{\\pi}{3};\\frac{5\\pi}{3}\\}';

	it('le message des ensembles est celui demandé', () => {
		expect(INTERVAL_FEEDBACK.setSeparator).toBe(
			'Sépare les solutions par un point-virgule : {a ; b}.'
		);
	});

	it.each([
		['\\{\\frac{\\pi}{3},\\frac{5\\pi}{3}\\}'],
		['\\left\\lbrace\\frac{\\pi}{3},\\frac{5\\pi}{3}\\right\\rbrace'],
		['\\{\\frac{\\pi}{3} , \\frac{5\\pi}{3}\\}']
	])('%s : faux, avec le message', (answer) => {
		expect(judgeIntervalAnswer(answer, expected)).toEqual({
			status: 'incorrect',
			feedback: INTERVAL_FEEDBACK.setSeparator
		});
	});

	it('quatre solutions longues séparées par des virgules : le message, pas « illisible »', () => {
		const four =
			'\\{-\\dfrac{11\\pi}{12};-\\frac{\\pi}{12};\\frac{\\pi}{12};\\dfrac{11\\pi}{12}\\}';
		expect(judgeIntervalAnswer(four.replace(/;/g, ','), four)).toEqual({
			status: 'incorrect',
			feedback: INTERVAL_FEEDBACK.setSeparator
		});
	});

	it('entiers séparés par plusieurs virgules ({1,3,6}) : le message', () => {
		expect(judgeIntervalAnswer('\\{1,3,6\\}', '\\{1;3;6\\}')).toEqual({
			status: 'incorrect',
			feedback: INTERVAL_FEEDBACK.setSeparator
		});
	});

	it('décimaux à virgule avec un point-virgule : inchangés', () => {
		expect(judgeIntervalAnswer('\\{1{,}5;2\\}', '\\{3/2;2\\}').status).toBe('correct');
		expect(judgeIntervalAnswer('\\{1,5;2\\}', '\\{3/2;2\\}').status).toBe('correct');
		expect(judgeIntervalAnswer('\\lbrace0,5\\rbrace', '\\{1/2\\}').status).toBe('correct');
	});

	it('intervalle ]2,3[ : le message des bornes, inchangé', () => {
		expect(judgeIntervalAnswer(']2,3[', ']2;3[').feedback).toBe(INTERVAL_FEEDBACK.separator);
	});
});

// Décision de David, 2026-10-05 : une fraction simplifiable dans un ensemble fini
// est traitée comme une borne non simplifiée (contrainte `intervalForm`).
describe('ensemble fini : fraction simplifiable', () => {
	const expected = '\\{-\\frac{5\\pi}{6};\\frac{\\pi}{3}\\}';
	const unreduced = '\\{-\\frac{10\\pi}{12};\\frac{\\pi}{3}\\}';

	it('-\\frac{10\\pi}{12} vaut ½ (warn), avec le message', () => {
		expect(judgeIntervalAnswer(unreduced, expected)).toEqual({
			status: 'unoptimal_form',
			feedback: INTERVAL_FEEDBACK.unsimplifiedSet
		});
		expect(INTERVAL_FEEDBACK.unsimplifiedSet).toBe('La fraction peut être simplifiée.');
	});

	it('suit le réglage intervalForm : strict → mauvaise forme, off → juste', () => {
		expect(judgeIntervalAnswer(unreduced, expected, 'strict').status).toBe('bad_form');
		expect(judgeIntervalAnswer(unreduced, expected, 'off').status).toBe('correct');
	});

	it('fraction numérique ({2;\\frac{6}{4}}) aussi', () => {
		expect(judgeIntervalAnswer('\\lbrace 2;\\frac{6}{4}\\rbrace', '\\{3/2;2\\}').status).toBe(
			'unoptimal_form'
		);
	});

	it('fractions irréductibles, décimaux, MathLive : justes', () => {
		expect(judgeIntervalAnswer(expected, expected).status).toBe('correct');
		expect(
			judgeIntervalAnswer(
				'\\left\\lbrace\\frac{\\pi}{3};-\\frac{5\\pi}{6}\\right\\rbrace',
				expected
			).status
		).toBe('correct');
		expect(judgeIntervalAnswer('\\{1{,}5;2\\}', '\\{3/2;2\\}').status).toBe('correct');
	});

	it('singleton dans une réunion : {\\frac{4}{2}} ∪ ]3;4[ vaut ½', () => {
		expect(judgeIntervalAnswer('\\{\\frac{4}{2}\\}\\cup]3;4[', '\\{2\\}\\cup]3;4[').status).toBe(
			'unoptimal_form'
		);
	});
});

describe('corrigé : pas de parenthèses en trop', () => {
	it('(1-sqrt(5))/2 → \\dfrac{1 - \\sqrt{5}}{2}', () => {
		expect(expectedIntervalsLatex(']-\\infty;(1-sqrt(5))/2]')).toBe(
			']-\\infty;\\dfrac{1 - \\sqrt{5}}{2}]'
		);
	});
});

describe('bornes ouvrables (option openableBounds, validée par David le 2026-10-04)', () => {
	const judge = (answer: string, expected: string, openableBounds = true) =>
		judgeIntervalAnswer(answer, expected, 'warn', { openableBounds }).status;

	it('ouvrir une borne finie que l’attendu ferme : juste', () => {
		expect(judge(']2;+\\infty[', '[2;+\\infty[')).toBe('correct');
		expect(judge(']-1;3[', '[-1;3]')).toBe('correct');
		expect(judge('[-1;3[', '[-1;3]')).toBe('correct');
		expect(judge(']-\\infty;\\frac{1}{2}[', ']-\\infty;\\frac{1}{2}]')).toBe('correct');
	});

	it('l’écriture de l’attendu reste juste', () => {
		expect(judge('[2;+\\infty[', '[2;+\\infty[')).toBe('correct');
	});

	it('fermer une borne que l’attendu ouvre : faux, avec le message du crochet', () => {
		const verdict = judgeIntervalAnswer('[0;+\\infty[', ']0;+\\infty[', 'warn', {
			openableBounds: true
		});
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBeDefined();
		expect(judge('[-1;3]', ']-1;3]')).toBe('incorrect');
	});

	it('valeur de borne fausse : faux, même ouverte', () => {
		expect(judge(']3;+\\infty[', '[2;+\\infty[')).toBe('incorrect');
		expect(judge('[1;3]', '[-1;3]')).toBe('incorrect');
	});

	it('réunion : bornes appariées une à une', () => {
		const expected = ']-\\infty;-1]\\cup[1;+\\infty[';
		expect(judge(']-\\infty;-1[\\cup]1;+\\infty[', expected)).toBe('correct');
		expect(judge(']1;+\\infty[\\cup]-\\infty;-1]', expected)).toBe('correct');
		expect(judge(']-\\infty;-1[', expected)).toBe('incorrect');
		expect(judge(']-\\infty;+\\infty[', expected)).toBe('incorrect');
	});

	it('ouvrir un point intérieur de l’attendu : faux ([a;b]∪[b;c] = [a;c])', () => {
		// L'attendu écrit en deux morceaux contigus EST l'intervalle [0;2] : 1 n'en est pas une borne
		expect(judge(']0;1[\\cup]1;2[', '[0;1]\\cup[1;2]')).toBe('incorrect');
		expect(judge(']0;1[\\cup]1;2[', '[0;2]')).toBe('incorrect');
		expect(judge(']0;2[', '[0;1]\\cup[1;2]')).toBe('correct');
	});

	it('ℝ et l’ensemble vide : rien à ouvrir', () => {
		expect(judge('\\mathbb{R}', '\\mathbb{R}')).toBe('correct');
		expect(judge(']0;+\\infty[', '\\mathbb{R}')).toBe('incorrect');
	});

	it('écriture à reprendre : toujours ½ (morceaux contigus non réunis)', () => {
		expect(judge(']0;1]\\cup[1;2[', '[0;2]')).toBe('unoptimal_form');
	});

	it('sans l’option : une borne ouverte à tort reste fausse', () => {
		expect(judge(']2;+\\infty[', '[2;+\\infty[', false)).toBe('incorrect');
		expect(judgeIntervalAnswer(']2;+\\infty[', '[2;+\\infty[').status).toBe('incorrect');
	});
});

describe('constante e dans une borne (sonde du 2026-10-04)', () => {
	// Une borne est un nombre : `e` y est toujours la constante d'Euler, quelle que
	// soit l'écriture (LaTeX de MathLive ou syntaxe maison du modèle)
	it.each([
		['\\left[\\frac{1}{e};+\\infty\\right[', '[e^{-1};+\\infty['],
		['[e^{-1};+\\infty[', '[\\frac{1}{e};+\\infty['],
		['[\\frac{1}{e};+\\infty[', '[\\frac{1}{e};+\\infty['],
		[']0;e[', ']0;e['],
		[']0;\\exp(-1)[', ']0;\\frac{1}{e}['],
		[']0;\\frac{1}{e}[', ']0;\\exp(-1)['],
		['[\\frac{1}{e^2};+\\infty[', '[e^{-2};+\\infty['],
		['[e^{-2};+\\infty[', '[\\frac{1}{e^{2}};+\\infty['],
		[']-\\infty;\\frac{1}{e^3}[', ']-\\infty;e^{-3}['],
		[']0;2e[', ']0;2\\mathrm{e}['],
		[']0;\\frac{e}{2}[', ']0;e/2['],
		[']0;\\sqrt{e}[', ']0;e^{\\frac12}['],
		[']0;e^{\\frac{1}{2}}[', ']0;\\sqrt{e}['],
		[']\\frac{1}{e};e[', ']e^{-1};e['],
		['[e^{-1};e^2]', '[\\frac{1}{e};e^{2}]'],
		[']-\\infty;\\frac{1}{e}[\\cup]e;+\\infty[', ']-\\infty;e^{-1}[\\cup]e;+\\infty['],
		['[\\exp(2);+\\infty[', '[e^{ 2 };+\\infty['],
		[']0;\\exp(3)[', ']0;e^3['],
		[']0;e^{3}[', ']0;\\exp(3)['],
		['[\\frac{1}{\\exp(2)};+\\infty[', '[e^{-2};+\\infty[']
	])('%s pour %s : juste', (answer, expected) => {
		expect(judgeIntervalAnswer(answer, expected).status).toBe('correct');
	});

	it.each([
		['[\\frac{1}{e};+\\infty[', '[e^{-2};+\\infty['],
		['[\\frac{1}{e^2};+\\infty[', '[e^{-1};+\\infty['],
		[']0;\\frac{e}{2}[', ']0;2e['],
		[']0;e[', ']0;\\frac{1}{e}['],
		[']\\frac{1}{e};+\\infty[', '[e^{-1};+\\infty[']
	])('%s pour %s : faux', (answer, expected) => {
		expect(judgeIntervalAnswer(answer, expected).status).toBe('incorrect');
	});

	it('π et ln 2 dans une borne', () => {
		expect(judgeIntervalAnswer(']0;\\frac{\\pi}{2}[', ']0;\\frac12\\pi[').status).toBe('correct');
		expect(judgeIntervalAnswer(']0;\\ln 2[', ']0;\\ln(2)[').status).toBe('correct');
		expect(judgeIntervalAnswer(']0;\\ln 4[', ']0;2\\ln 2[').status).toBe('correct');
		expect(judgeIntervalAnswer(']0;\\ln 3[', ']0;\\ln 2[').status).toBe('incorrect');
		expect(judgeIntervalAnswer('[\\ln 2;+\\infty[', '[-\\ln\\frac{1}{2};+\\infty[').status).toBe(
			'correct'
		);
	});

	it('corrigé affiché : e reste e', () => {
		expect(expectedIntervalsLatex('[e^{-1};+\\infty[')).toBe('[e^{-1};+\\infty[');
		expect(expectedIntervalsLatex(']0;\\frac{1}{e}[')).toMatch(/\\[d]?frac\{1\}\{e\}/);
	});
});
