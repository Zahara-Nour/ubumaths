/**
 * Lecture d'une réponse d'élève en notation intervalle : bornes exactes et
 * écritures produites par MathLive (chantier « réponse intervalles »).
 *
 * Défaut d'origine : `parseEndpointValue` faisait `parseFloat` avant toute
 * autre lecture → `3/2` lu 3, `1-√2` lu 1.
 */

import { describe, it, expect } from 'vitest';
import { parseStudentDomain, parseStudentDomainPieces, domainsAreEqual } from '../validation';
import { compareNumericNodes } from '$lib/mathAST/eval/compare-numeric';
import { bound } from '../factory';
import type { Domain } from '../types';
import type { MathNode } from '../../types';

// Functions
function domainOf(input: string): Domain {
	const result = parseStudentDomain(input);
	if (!result.success) throw new Error(`illisible : ${input} (${result.error})`);
	return result.domain;
}

function lowerBound(input: string): MathNode {
	const domain = domainOf(input);
	if (domain.kind !== 'interval_set') throw new Error(`pas un intervalle : ${input}`);
	return domain.intervals[0].lower.value;
}

function expectSameValue(actual: MathNode, expected: string): void {
	expect(compareNumericNodes(actual, bound(expected))).toBe(0);
}

describe('parseStudentDomain — bornes exactes', () => {
	it('lit une fraction 3/2 comme 3/2 (et non 3)', () => {
		expectSameValue(lowerBound(']3/2 ; +∞['), '3/2');
	});

	it('lit 1-√2 comme 1-√2 (et non 1)', () => {
		expectSameValue(lowerBound(']1-√2 ; 2['), '1-sqrt(2)');
	});

	it('lit les bornes LaTeX : fraction, racine, π', () => {
		expectSameValue(lowerBound(']\\frac{3}{2};+\\infty['), '3/2');
		expectSameValue(lowerBound(']\\frac32;+\\infty['), '3/2');
		expectSameValue(lowerBound(']1-\\sqrt{2};2['), '1-sqrt(2)');
		expectSameValue(lowerBound(']1-\\sqrt2;2['), '1-sqrt(2)');
		expectSameValue(lowerBound(']-\\frac{\\pi}{2};\\frac{\\pi}{2}['), '-\\pi/2');
	});

	it('lit une borne en syntaxe maison (réponse attendue d’un modèle)', () => {
		expectSameValue(lowerBound('](1-sqrt(5))/2;3['), '(1-sqrt(5))/2');
		expectSameValue(lowerBound(']-sqrt(3);3['), '-sqrt(3)');
	});

	it('compare les bornes exactement : 1-√2 ≠ -0,414', () => {
		expect(domainsAreEqual(domainOf(']1-\\sqrt{2};2['), domainOf(']-0,414;2['))).toBe(false);
		expect(domainsAreEqual(domainOf(']1-\\sqrt{2};2['), domainOf(']1-√2 ; 2['))).toBe(true);
	});

	it('refuse une borne qui contient une variable', () => {
		expect(parseStudentDomain(']2x;3[').success).toBe(false);
	});
});

describe('parseStudentDomain — écritures de MathLive', () => {
	it('lit le décimal à virgule de MathLive {,}', () => {
		expectSameValue(lowerBound(']0{,}5;1['), '0.5');
	});

	it('lit \\left\\lbrack … \\right\\rbrack et les espaces \\,', () => {
		expect(domainsAreEqual(domainOf('\\left\\lbrack2;3\\right\\rbrack'), domainOf('[2;3]'))).toBe(
			true
		);
		expect(domainsAreEqual(domainOf(']\\,2\\,;\\,3\\,['), domainOf(']2;3['))).toBe(true);
	});

	it('lit \\lbrack / \\rbrack seuls', () => {
		expect(domainsAreEqual(domainOf('\\lbrack2;3\\rbrack'), domainOf('[2;3]'))).toBe(true);
	});

	it('lit le crochet capturé par une fraction : \\frac{]3}{2}', () => {
		expect(domainsAreEqual(domainOf('\\frac{]3}{2};+\\infty['), domainOf(']3/2;+∞['))).toBe(true);
	});

	it('lit \\mathbb{R}, \\R et ℝ \\setminus {…}', () => {
		const expected = domainOf(']-∞ ; 2[ ∪ ]2 ; +∞[');
		for (const input of [
			'\\mathbb{R}\\setminus\\{2\\}',
			'\\R\\setminus\\lbrace2\\rbrace',
			'\\R\\setminus\\left\\lbrace2\\right\\rbrace',
			'\\mathbb{R}\\backslash\\{2\\}'
		]) {
			expect(domainsAreEqual(domainOf(input), expected), input).toBe(true);
		}
	});

	it('lit l’ensemble vide sous toutes ses formes', () => {
		for (const input of ['\\emptyset', '\\varnothing', '\\{\\}', '\\lbrace\\rbrace']) {
			expect(domainOf(input).kind, input).toBe('empty');
		}
	});

	it('lit un singleton et une paire : {3}, {1;2}', () => {
		expect(domainsAreEqual(domainOf('\\{3\\}'), domainOf('[3;3]'))).toBe(true);
		expect(domainsAreEqual(domainOf('\\lbrace1;2\\rbrace'), domainOf('[1;1] ∪ [2;2]'))).toBe(true);
	});

	it('lit la réunion \\cup et ne confond pas \\left avec \\le', () => {
		expect(
			domainsAreEqual(
				domainOf('\\left\\rbrack-\\infty;-2\\right\\lbrack\\cup]3;+\\infty['),
				domainOf(']-∞ ; -2[ ∪ ]3 ; +∞[')
			)
		).toBe(true);
	});
});

describe('domainsAreEqual — points exclus', () => {
	it('ℝ \\ {2} = ]-∞ ; 2[ ∪ ]2 ; +∞[, dans les deux sens', () => {
		const a = domainOf('ℝ \\ {2}');
		const b = domainOf(']-∞ ; 2[ ∪ ]2 ; +∞[');
		expect(domainsAreEqual(a, b)).toBe(true);
		expect(domainsAreEqual(b, a)).toBe(true);
	});

	it('ℝ \\ {2} ≠ ℝ', () => {
		expect(domainsAreEqual(domainOf('ℝ \\ {2}'), domainOf('ℝ'))).toBe(false);
	});
});

describe('parseStudentDomainPieces — morceaux tels qu’écrits', () => {
	it('rend chaque morceau d’une réunion, avant fusion', () => {
		const result = parseStudentDomainPieces(']1;2] ∪ [2;3[');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.pieces).toHaveLength(2);
		expect(result.pieces.map((piece) => piece.bounds)).toEqual([
			['1', '2'],
			['2', '3']
		]);
	});

	it('garde l’intervalle tel qu’écrit, même à bornes inversées', () => {
		const result = parseStudentDomainPieces(']3;-2[');
		expect(result.success).toBe(true);
		if (!result.success) return;
		const interval = result.pieces[0].interval;
		expect(interval && compareNumericNodes(interval.lower.value, bound('3'))).toBe(0);
	});
});
