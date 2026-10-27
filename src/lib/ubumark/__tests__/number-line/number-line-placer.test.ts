/**
 * Droite graduée à placer (` ```line ` + `placer:`) : parseur, graduations, réponse
 * (phase 0 : `docs/wip/reponses-a-placer-progress.md` § 4, 6)
 *
 * L'élève place UN point ; sa réponse est la graduation choisie, écrite pareil
 * que la réponse attendue (même fonction) : le juge ordinaire les compare.
 */

import { describe, it, expect } from 'vitest';
import {
	findLinesToPlace,
	hasLineToPlace,
	parseNumberLineContent
} from '$lib/ubumark/parser/number-line-parser';
import {
	graduationCount,
	indexOfAnswer,
	indexOfValue,
	placerAnswer,
	placerText
} from '$lib/ubumark/utils/number-line-placer';
import { generateNumberLineTypst } from '$lib/ubumark/generators/number-line-typst';
import { numVal } from '$lib/ubumark/utils/number-line-render';

const parse = (...lines: string[]) => parseNumberLineContent(lines);
const config = (...lines: string[]) => {
	const { node, errors } = parse(...lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node.config;
};

describe('parseur : placer:', () => {
	it('placer: lu comme une valeur de la droite', () => {
		const { node, errors } = parse('start: 0', 'end: 20', 'step: 1', 'placer: 7');
		expect(errors).toEqual([]);
		expect(node?.placer?.map((t) => numVal(t.value))).toEqual([7]);
		expect(node?.points).toEqual([]);
	});

	it('case: lue avec placer:', () => {
		const { node } = parse('case: 2', 'start: 0', 'end: 20', 'step: 1', 'placer: 7');
		expect(node?.caseIndex).toBe(2);
	});

	it('placer: en fraction sur une droite graduée en quarts', () => {
		const { node, errors } = parse('start: 0', 'end: 2', 'step: 1/4', 'placer: 3/4');
		expect(errors).toEqual([]);
		expect(node?.placer?.[0].value.expression).toBe('3/4');
	});

	it('placer: hors de la droite → refusé', () => {
		const { node, errors } = parse('start: 0', 'end: 20', 'step: 1', 'placer: 25');
		expect(node).toBeNull();
		expect(errors.map((e) => e.message).join(' ')).toMatch(/placer.*hors de la droite/);
	});

	it('placer: entre deux graduations → refusé', () => {
		const { node, errors } = parse('start: 0', 'end: 20', 'step: 2', 'placer: 7');
		expect(node).toBeNull();
		expect(errors.map((e) => e.message).join(' ')).toMatch(/placer.*pas sur une graduation/);
	});

	it('placer: sur une échelle log → refusé', () => {
		const { node, errors } = parse('start: 1', 'end: 100', 'step: 1', 'scale: log', 'placer: 10');
		expect(node).toBeNull();
		expect(errors.map((e) => e.message).join(' ')).toMatch(/placer.*log/);
	});

	it('placer: avec points: → refusé (seuls les points de l’élève)', () => {
		const { node, errors } = parse('start: 0', 'end: 20', 'step: 1', 'points: A=3', 'placer: 7');
		expect(node).toBeNull();
		expect(errors.map((e) => e.message).join(' ')).toMatch(/placer.*points/);
	});

	it('placer: illisible → refusé', () => {
		const { node } = parse('start: 0', 'end: 20', 'step: 1', 'placer: sept');
		expect(node).toBeNull();
	});

	it('case: sans placer: → refusé', () => {
		const { node, errors } = parse('case: 0', 'start: 0', 'end: 20', 'step: 1');
		expect(node).toBeNull();
		expect(errors.map((e) => e.message).join(' ')).toMatch(/case.*sans placer/);
	});

	it('droite sans placer: inchangée (aucun placer, aucune case)', () => {
		const { node } = parse('start: 0', 'end: 5', 'step: 1', 'points: A=2');
		expect(node?.placer).toBeUndefined();
		expect(node?.caseIndex).toBeUndefined();
	});
});

describe('repérage des droites à placer dans un énoncé', () => {
	const fence = (...body: string[]) => ['```line', ...body, '```'].join('\n');

	it('une droite à placer, fermée, au premier niveau', () => {
		const md = ['Place 7.', '', fence('start: 0', 'end: 20', 'step: 1', 'placer: 7')].join('\n');
		expect(hasLineToPlace(md)).toBe(true);
		expect(findLinesToPlace(md)).toEqual([
			{
				startIndex: 2,
				body: ['start: 0', 'end: 20', 'step: 1', 'placer: 7'],
				closed: true,
				nested: false
			}
		]);
	});

	it('droite sans placer: ignorée', () => {
		expect(hasLineToPlace(fence('start: 0', 'end: 5', 'step: 1'))).toBe(false);
	});

	it('droite dans une liste : repérée, signalée en retrait', () => {
		const md = [
			'- Place 7 :',
			'',
			'  ```line',
			'  start: 0',
			'  end: 9',
			'  step: 1',
			'  placer: 7',
			'  ```'
		].join('\n');
		const [found] = findLinesToPlace(md);
		expect(found.nested).toBe(true);
	});
});

describe('graduations et réponse', () => {
	it('nombre de graduations : de start à end compris', () => {
		expect(graduationCount(config('start: 0', 'end: 20', 'step: 1'))).toBe(21);
		expect(graduationCount(config('start: 0', 'end: 2', 'step: 1/4'))).toBe(9);
	});

	it('valeur → rang de graduation ; hors graduation → null', () => {
		const c = config('start: 0', 'end: 20', 'step: 2');
		expect(indexOfValue(c, 8)).toBe(4);
		expect(indexOfValue(c, 7)).toBeNull();
		expect(indexOfValue(c, 22)).toBeNull();
	});

	it('réponse d’une graduation : entier, décimal (point), fraction en LaTeX', () => {
		expect(placerAnswer(config('start: 0', 'end: 20', 'step: 1'), 7)).toBe('7');
		expect(placerAnswer(config('start: -5', 'end: 5', 'step: 1'), 2)).toBe('-3');
		expect(placerAnswer(config('start: 0', 'end: 1', 'step: 0.1'), 3)).toBe('0.3');
		expect(placerAnswer(config('start: 0', 'end: 2', 'step: 1/4'), 3)).toBe('0.75');
		expect(placerAnswer(config('start: 0', 'end: 2', 'step: 1/3'), 1)).toBe('\\frac{1}{3}');
		expect(placerAnswer(config('start: 0', 'end: 2', 'step: 1/3'), 4)).toBe('\\frac{4}{3}');
	});

	it('réponse → rang (aller-retour) ; vide ou illisible → null', () => {
		const thirds = config('start: 0', 'end: 2', 'step: 1/3');
		for (let k = 0; k < graduationCount(thirds); k++) {
			expect(indexOfAnswer(thirds, placerAnswer(thirds, k))).toBe(k);
		}
		expect(indexOfAnswer(thirds, '')).toBeNull();
		expect(indexOfAnswer(thirds, 'abc')).toBeNull();
	});

	it('texte pour l’élève : virgule décimale, fraction a/b', () => {
		expect(placerText(config('start: 0', 'end: 1', 'step: 0.1'), 3)).toBe('0,3');
		expect(placerText(config('start: 0', 'end: 2', 'step: 1/3'), 4)).toBe('4/3');
		expect(placerText(config('start: 0', 'end: 20', 'step: 1'), 12)).toBe('12');
	});
});

// Revue de la PR 1 : chaque graduation se relit à son rang, quel que soit le décor
// (pas décimal, départ négatif ou non nul, fractions, très petits pas)
describe('aller-retour réponse ↔ graduation, décors variés', () => {
	const decors = [
		['start: 0', 'end: 1', 'step: 0.1'],
		['start: 0.5', 'end: 1.5', 'step: 0.1'],
		['start: 99.9', 'end: 100.1', 'step: 0.01'],
		['start: -0.5', 'end: 0.5', 'step: 0.1'],
		['start: -3', 'end: 3', 'step: 1'],
		['start: -1', 'end: 1', 'step: 1/3'],
		['start: 0', 'end: 2', 'step: 1/4'],
		['start: 0', 'end: 1', 'step: 1/7'],
		['start: 0', 'end: 1', 'step: 0.3'],
		['start: 0', 'end: 0.000001', 'step: 0.0000001']
	];
	it.each(decors)('%s, %s, %s', (...lines) => {
		const c = config(...lines);
		for (let k = 0; k < graduationCount(c); k++) {
			const answer = placerAnswer(c, k);
			expect(answer).not.toMatch(/e/i);
			expect(indexOfAnswer(c, answer)).toBe(k);
		}
	});

	it('0.75 et 3/4 : la même réponse', () => {
		expect(placerAnswer(config('start: 0', 'end: 2', 'step: 1/4'), 3)).toBe(
			placerAnswer(config('start: 0', 'end: 2', 'step: 0.25'), 3)
		);
	});
});

describe('PDF : la droite sans point', () => {
	it('placer: ne dessine aucun point (l’enfant fait sa croix)', () => {
		const { node } = parse('start: 0', 'end: 20', 'step: 1', 'placer: 7');
		const typst = generateNumberLineTypst(node!);
		expect(typst).not.toMatch(/Error/);
		expect(typst).not.toMatch(/circle/);
	});
});
