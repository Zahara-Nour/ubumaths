/**
 * Droite graduée à représenter (` ```line ` + `representer:`) : parseur, réponse,
 * juge, phrases de la correction (phase 0 : `docs/wip/demi-droite-progress.md`
 * § « Geste de l'élève », points 10 à 17 ; décisions Q3, Q4)
 *
 * L'élève pose la borne (ou les deux bornes), choisit le côté des solutions
 * (demi-droite) et bascule chaque borne comprise / exclue. Sa réponse s'écrit par
 * `representerAnswer`, la même fonction que la réponse attendue : `[2 ; +∞[`.
 */

import { describe, it, expect } from 'vitest';
import { findLinesToPlace, parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import {
	expectedInterval,
	isIncompleteRepresentation,
	isRepresentedIntervalCorrect,
	representerAnswer,
	representerMistakes,
	stateOfAnswer,
	type RepresenterState
} from '$lib/ubumark/utils/number-line-representer';

const LINE = ['start: -5', 'end: 5', 'step: 1'];
const parse = (...lines: string[]) => parseNumberLineContent(lines);
const messages = (...lines: string[]) =>
	parse(...lines)
		.errors.map((e) => e.message)
		.join(' ');
const config = (...lines: string[]) => {
	const { node, errors } = parse(...lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node.config;
};
const C = config(...LINE);

/** Rang de la graduation de valeur v sur LINE (-5 → 0) */
const rank = (v: number) => v + 5;

describe('parseur : representer:', () => {
	it('demi-droite lue, jamais dessinée', () => {
		const { node, errors } = parse(...LINE, 'representer: [2, +inf[');
		expect(errors).toEqual([]);
		expect(node?.representer?.bounded).toBe(false);
		expect(node?.representer?.interval).toMatchObject({
			startOpen: false,
			endOpen: true,
			endInfinite: true
		});
		expect(node?.segments).toEqual([]);
	});

	it('intervalle borné lu', () => {
		const { node, errors } = parse(...LINE, 'representer: [-1, 3[');
		expect(errors).toEqual([]);
		expect(node?.representer?.bounded).toBe(true);
	});

	it('case: lue avec representer:', () => {
		const { node, errors } = parse('case: 3', ...LINE, 'representer: ]-inf, 2]');
		expect(errors).toEqual([]);
		expect(node?.caseIndex).toBe(3);
	});

	it('borne entre deux graduations → refusée (point 14)', () => {
		expect(messages(...LINE, 'representer: [2.5, +inf[')).toMatch(
			/representer.*pas sur une graduation/
		);
	});

	it('borne en fraction sur une droite graduée en tiers : acceptée', () => {
		const { errors } = parse('start: -1', 'end: 2', 'step: 1/3', 'representer: [2/3, +inf[');
		expect(errors).toEqual([]);
	});

	it('borne hors de la droite → refusée', () => {
		expect(messages(...LINE, 'representer: [8, +inf[')).toMatch(/representer.*hors de la droite/);
	});

	it('crochet fermé sur l’infini → l’erreur des segments', () => {
		expect(messages(...LINE, 'representer: [2, +inf]')).toMatch(/l'infini est toujours exclu/);
	});

	it('toute la droite → refusée, rien à représenter', () => {
		expect(messages(...LINE, 'representer: ]-inf, +inf[')).toMatch(/representer.*toute la droite/);
	});

	it('deux intervalles → refusés', () => {
		expect(messages(...LINE, 'representer: [-1, 0], [2, 3]')).toMatch(
			/representer.*un seul intervalle/
		);
	});

	it('avec placer: → refusé', () => {
		expect(messages(...LINE, 'placer: 2', 'representer: [2, +inf[')).toMatch(/representer.*placer/);
	});

	it('avec segments: → refusé (ils diraient la réponse)', () => {
		expect(messages(...LINE, 'segments: [2, 3]', 'representer: [2, +inf[')).toMatch(
			/representer.*segments/
		);
	});

	it('échelle log → refusée', () => {
		expect(
			messages('start: 1', 'end: 1000', 'step: 10', 'scale: log', 'representer: [10, +inf[')
		).toMatch(/representer.*log/);
	});

	it('masquée (énoncé envoyé) : `?` = demi-droite, `? ; ?` = intervalle borné', () => {
		expect(parse(...LINE, 'representer: ?').node?.representer).toEqual({
			bounded: false,
			interval: null
		});
		expect(parse(...LINE, 'representer: ? ; ?').node?.representer).toEqual({
			bounded: true,
			interval: null
		});
	});

	it('findLinesToPlace trouve aussi les droites à représenter', () => {
		const statement = ['```line', ...LINE, 'representer: [2, +inf[', '```'].join('\n');
		expect(findLinesToPlace(statement)).toHaveLength(1);
	});
});

describe('réponse : une écriture pour l’attendu et pour l’élève', () => {
	const expected = (written: string, decor = LINE) => {
		const { node, errors } = parse(...decor, `representer: ${written}`);
		if (!node?.representer?.interval) throw new Error(errors.map((e) => e.message).join(' ; '));
		return representerAnswer(node.config, expectedInterval(node.config, node.representer.interval));
	};

	it.each([
		['[2, +inf[', '[2 ; +∞['],
		[']2, +inf[', ']2 ; +∞['],
		[']-inf, 3]', ']-∞ ; 3]'],
		[']-inf, -1[', ']-∞ ; -1['],
		['[-1, 3[', '[-1 ; 3['],
		[']0, 4]', ']0 ; 4]']
	])('%s → %s', (written, answer) => {
		expect(expected(written)).toBe(answer);
	});

	it('borne en fraction, écrite comme la graduation', () => {
		expect(expected('[2/3, +inf[', ['start: -1', 'end: 2', 'step: 1/3'])).toBe('[2/3 ; +∞[');
	});

	it('borne décimale, virgule française', () => {
		expect(expected(']-inf, 0.5]', ['start: 0', 'end: 2', 'step: 0.1'])).toBe(']-∞ ; 0,5]');
	});

	it('état de l’élève, complet : la même écriture', () => {
		const state: RepresenterState = {
			bornes: [{ rank: rank(2), included: true }],
			side: 'droite'
		};
		expect(representerAnswer(C, state)).toBe('[2 ; +∞[');
		expect(
			representerAnswer(C, { bornes: [{ rank: rank(3), included: true }], side: 'gauche' })
		).toBe(']-∞ ; 3]');
	});

	it('intervalle borné : bornes rangées, quel que soit l’ordre de pose', () => {
		const state: RepresenterState = {
			bornes: [
				{ rank: rank(3), included: false },
				{ rank: rank(-1), included: true }
			],
			side: null
		};
		expect(representerAnswer(C, state)).toBe('[-1 ; 3[');
	});

	it('incomplet : lisible, jamais juste', () => {
		expect(representerAnswer(C, { bornes: [{ rank: rank(2), included: false }], side: null })).toBe(
			'2 exclue, côté ?'
		);
		expect(
			representerAnswer(C, { bornes: [{ rank: rank(-1), included: true }], side: null }, true)
		).toBe('-1 comprise, autre borne ?');
		expect(representerAnswer(C, { bornes: [], side: null })).toBe('');
	});

	it.each([
		['[2 ; +∞[', false],
		[']-∞ ; 3]', false],
		['[-1 ; 3[', true],
		['2 exclue, côté ?', false],
		['-1 comprise, autre borne ?', true],
		['', false],
		['', true]
	] as const)('relue : %s', (answer, bounded) => {
		expect(representerAnswer(C, stateOfAnswer(C, answer, bounded), bounded)).toBe(answer);
	});

	it('réponse illisible : état vide', () => {
		expect(stateOfAnswer(C, 'n’importe quoi', false)).toEqual({ bornes: [], side: null });
		expect(stateOfAnswer(C, '[12 ; +∞[', false)).toEqual({ bornes: [], side: null });
	});
});

describe('juge (point 12) : borne(s), côté et crochets tous justes', () => {
	it.each([
		['[2 ; +∞[', '[2 ; +∞[', true],
		[']2 ; +∞[', '[2 ; +∞[', false],
		[']-∞ ; 2]', '[2 ; +∞[', false],
		['[3 ; +∞[', '[2 ; +∞[', false],
		['2 comprise, côté ?', '[2 ; +∞[', false],
		['[-1 ; 3[', '[-1 ; 3[', true],
		['[-1 ; 3]', '[-1 ; 3[', false],
		['[2/3 ; +∞[', '[2/3 ; +∞[', true],
		['[4/6 ; +∞[', '[2/3 ; +∞[', true],
		['[0,5 ; +∞[', '[1/2 ; +∞[', true],
		['', '[2 ; +∞[', false],
		// Crochet fermé sur l'infini : jamais écrit par le geste, jamais juste
		['[-∞ ; 2]', ']-∞ ; 2]', false],
		['[2 ; +∞]', '[2 ; +∞[', false]
	])('%s pour %s → %s', (answer, expected, correct) => {
		expect(isRepresentedIntervalCorrect(answer, expected)).toBe(correct);
	});
});

describe('phrases de la correction (points 13, 15 à 17)', () => {
	it('borne juste, côté juste, crochet faux (15)', () => {
		expect(representerMistakes(']2 ; +∞[', '[2 ; +∞[')).toEqual([
			'Le nombre 2 est-il solution ? Le crochet dit le contraire.'
		]);
	});

	it('mauvais côté (16)', () => {
		expect(representerMistakes(']-∞ ; 2]', '[2 ; +∞[')).toEqual([
			'Les solutions sont de l’autre côté de 2.'
		]);
	});

	it('mauvaise borne (17), rien d’autre', () => {
		expect(representerMistakes(']-∞ ; 4[', '[2 ; +∞[')).toEqual([
			'La limite des solutions n’est pas là.'
		]);
	});

	it('côté pas choisi (13)', () => {
		expect(representerMistakes('2 comprise, côté ?', '[2 ; +∞[')).toEqual([
			'Choisis de quel côté sont les solutions.'
		]);
	});

	it('intervalle borné : une seule borne posée', () => {
		expect(representerMistakes('-1 comprise, autre borne ?', '[-1 ; 3[')).toEqual([
			'Pose les deux bornes.'
		]);
	});

	it('intervalle borné : un crochet faux par borne', () => {
		expect(representerMistakes(']-1 ; 3]', '[-1 ; 3[')).toEqual([
			'Le nombre -1 est-il solution ? Le crochet dit le contraire.',
			'Le nombre 3 est-il solution ? Le crochet dit le contraire.'
		]);
	});

	it('intervalle borné : une borne fausse', () => {
		expect(representerMistakes('[-1 ; 4[', '[-1 ; 3[')).toEqual([
			'La limite des solutions n’est pas là.'
		]);
	});

	it('juste ou vide : aucune phrase', () => {
		expect(representerMistakes('[2 ; +∞[', '[2 ; +∞[')).toEqual([]);
		expect(representerMistakes('', '[2 ; +∞[')).toEqual([]);
	});
});

describe('réponse en chantier : ni Entrée ni « Valider »', () => {
	it('borne sans côté, ou sans seconde borne : incomplète', () => {
		expect(isIncompleteRepresentation('2 comprise, côté ?')).toBe(true);
		expect(isIncompleteRepresentation('-1 exclue, autre borne ?')).toBe(true);
	});

	it('vide ou intervalle complet, même faux : pas « incomplète »', () => {
		expect(isIncompleteRepresentation('')).toBe(false);
		expect(isIncompleteRepresentation('[2 ; +∞[')).toBe(false);
		expect(isIncompleteRepresentation(']-∞ ; 2]')).toBe(false);
		expect(isIncompleteRepresentation('[-1 ; 3[')).toBe(false);
	});
});
