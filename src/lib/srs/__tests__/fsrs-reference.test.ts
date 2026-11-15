/**
 * FSRS-6 contre l'implémentation de référence (`ts-fsrs`, devDependency, tests seulement)
 *
 * Chaque scénario : une suite de (note, écart en jours) appliquée à une fiche neuve.
 * Après chaque révision, stabilité, difficulté et intervalle doivent être ceux de
 * `FSRS6Algorithm` (formules publiées, mêmes paramètres par défaut, court terme actif).
 */

import { FSRS6Algorithm, FSRS6_MODEL_BOUNDS } from 'ts-fsrs/models/fsrs-6';
import { describe, expect, it } from 'vitest';

import { DEFAULT_DESIRED_RETENTION, DEFAULT_FSRS_PARAMS } from '../config';
import { FSRS } from '../fsrs';
import type { CardStats, Grade } from '../types';

type Card = Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>;
type Step = { grade: Grade; days: number };

// Types
interface MemoryState {
	stability: number;
	difficulty: number;
}

// Constantes
const DAY_MS = 24 * 60 * 60 * 1000;
/** Midi à Paris : un écart de N jours y reste N jours civils */
const START = new Date('2026-03-02T11:00:00Z');

const oracle = new FSRS6Algorithm([...DEFAULT_FSRS_PARAMS], true, FSRS6_MODEL_BOUNDS);

const SCENARIOS: Record<string, Step[]> = {
	'Bien à chaque échéance': [
		{ grade: 3, days: 0 },
		{ grade: 3, days: 2 },
		{ grade: 3, days: 11 },
		{ grade: 3, days: 46 },
		{ grade: 3, days: 163 }
	],
	'Pas réussi, puis Bien': [
		{ grade: 1, days: 0 },
		{ grade: 3, days: 1 },
		{ grade: 3, days: 2 },
		{ grade: 3, days: 6 },
		{ grade: 3, days: 17 }
	],
	'Oubli au milieu': [
		{ grade: 3, days: 0 },
		{ grade: 3, days: 2 },
		{ grade: 1, days: 11 },
		{ grade: 3, days: 2 },
		{ grade: 3, days: 5 }
	],
	'Révisions en retard et en avance': [
		{ grade: 3, days: 0 },
		{ grade: 3, days: 9 },
		{ grade: 1, days: 40 },
		{ grade: 3, days: 1 },
		{ grade: 3, days: 30 }
	],
	'Notes Difficile et Facile (vieux onglets)': [
		{ grade: 2, days: 0 },
		{ grade: 4, days: 3 },
		{ grade: 2, days: 10 },
		{ grade: 4, days: 20 },
		{ grade: 1, days: 60 }
	],
	// Le plafond S / e^(w[17]·w[18]) joue : oubli d'une fiche à faible stabilité
	'Deux échecs à un an d’écart (plafond après un oubli)': [
		{ grade: 1, days: 0 },
		{ grade: 1, days: 365 }
	],
	'Plusieurs révisions le même jour (court terme)': [
		{ grade: 3, days: 0 },
		{ grade: 3, days: 0 },
		{ grade: 1, days: 0 },
		{ grade: 3, days: 0 },
		{ grade: 3, days: 3 }
	]
};

// Functions
function expectClose(actual: number, expected: number, label: string): void {
	expect(Math.abs(actual - expected), label).toBeLessThanOrEqual(1e-7 * Math.max(1, expected));
}

function oracleRun(steps: Step[]): Array<MemoryState & { interval: number }> {
	let state: MemoryState | null = null;
	return steps.map(({ grade, days }) => {
		state = oracle.next_state(state, days, grade);
		return {
			...state,
			interval: Math.min(36500, oracle.next_interval(state.stability, DEFAULT_DESIRED_RETENTION))
		};
	});
}

function ourRun(steps: Step[]): Array<MemoryState & { interval: number }> {
	const fsrs = new FSRS();
	let card: Card = fsrs.initCard('eleve-fictif', 'template', 'modele-fictif');
	let now = START;
	return steps.map(({ grade, days }) => {
		now = new Date(now.getTime() + days * DAY_MS);
		card = fsrs.reviewCard(card, grade, undefined, now);
		const interval = Math.round(
			(new Date(card.nextReview ?? '').getTime() - now.getTime()) / DAY_MS
		);
		return { stability: card.stability, difficulty: card.difficulty, interval };
	});
}

// Tests
describe('FSRS-6 : mêmes résultats que la référence ts-fsrs', () => {
	for (const [name, steps] of Object.entries(SCENARIOS)) {
		it(name, () => {
			const expected = oracleRun(steps);
			const actual = ourRun(steps);
			actual.forEach((got, i) => {
				const want = expected[i];
				// ts-fsrs arrondit au 1e-8 à chaque étape : écart relatif, pas absolu
				expectClose(got.stability, want.stability, `stabilité, révision ${i + 1}`);
				expectClose(got.difficulty, want.difficulty, `difficulté, révision ${i + 1}`);
				expect(got.interval, `intervalle, révision ${i + 1}`).toBe(want.interval);
			});
		});
	}
});

describe('FSRS-6 : valeurs attendues lisibles', () => {
	it('fiche neuve réussie : stabilité w[2], 2 jours', () => {
		const [first] = ourRun([{ grade: 3, days: 0 }]);
		expect(first.stability).toBeCloseTo(DEFAULT_FSRS_PARAMS[2], 6);
		expect(first.interval).toBe(2);
	});

	it('un échec ne bloque pas la difficulté à 10', () => {
		const [failed] = ourRun([{ grade: 1, days: 0 }]);
		expect(failed.difficulty).toBeLessThan(10);
	});

	it('rétention 0,9 : intervalle égal à la stabilité arrondie', () => {
		const fsrs = new FSRS();
		expect(fsrs.calculateInterval(10)).toBe(10);
		expect(fsrs.calculateInterval(46.4)).toBe(46);
	});
});

describe('Écart compté en jours civils à Paris', () => {
	it('23 h 30 puis 0 h 30 le lendemain : un jour, pas le court terme', () => {
		const fsrs = new FSRS();
		const first = fsrs.reviewCard(
			fsrs.initCard('eleve-fictif', 'template', 'modele-fictif'),
			3,
			undefined,
			new Date('2026-03-02T22:30:00Z') // 23 h 30 à Paris
		);
		const second = fsrs.reviewCard(first, 3, undefined, new Date('2026-03-02T23:30:00Z'));
		const expected = oracle.next_state(
			{ stability: first.stability, difficulty: first.difficulty },
			1,
			3
		);
		expect(second.stability).toBeCloseTo(expected.stability, 6);
	});

	it('8 h puis 18 h le même jour : court terme', () => {
		const fsrs = new FSRS();
		const first = fsrs.reviewCard(
			fsrs.initCard('eleve-fictif', 'template', 'modele-fictif'),
			3,
			undefined,
			new Date('2026-03-02T07:00:00Z')
		);
		const second = fsrs.reviewCard(first, 3, undefined, new Date('2026-03-02T17:00:00Z'));
		const expected = oracle.next_state(
			{ stability: first.stability, difficulty: first.difficulty },
			0,
			3
		);
		expect(second.stability).toBeCloseTo(expected.stability, 6);
	});
});

describe('Fiche aux valeurs hors bornes', () => {
	it('difficulté hors [1, 10] ramenée dans les bornes, sans exception', () => {
		const fsrs = new FSRS();
		const first = fsrs.reviewCard(
			fsrs.initCard('eleve-fictif', 'template', 'modele-fictif'),
			3,
			undefined,
			START
		);
		const broken: Card = { ...first, difficulty: 14 };
		const next = fsrs.reviewCard(broken, 3, undefined, new Date(START.getTime() + 2 * DAY_MS));
		expect(next.difficulty).toBeLessThanOrEqual(10);
		expect(next.difficulty).toBeGreaterThanOrEqual(1);
		expect(Number.isFinite(next.stability)).toBe(true);
	});
});
