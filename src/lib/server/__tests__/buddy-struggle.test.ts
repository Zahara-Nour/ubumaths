/**
 * Question longtemps ratée enfin réussie (chantier `regularite`, PR B3) : règle pure.
 * La 1re réussite de la série suit au moins 3 échecs sans réussite entre eux,
 * le premier de ces échecs au moins 7 jours avant (dates de Paris) (U2, U3, U4).
 */
import { describe, expect, it } from 'vitest';
import { isLongStruggleWon, type StruggleTrace } from '$lib/server/buddy-struggle';

// Constantes
/** Début de la série : le 20 octobre 2026, 10 h à Paris */
const SERIE = new Date('2026-10-20T08:00:00Z');
/** Pendant la série */
const DANS_LA_SERIE = '2026-10-20T08:05:00Z';

// Functions
function echec(created_at: string): StruggleTrace {
	return { created_at, success: false };
}

function reussite(created_at: string): StruggleTrace {
	return { created_at, success: true };
}

// Tests
describe('isLongStruggleWon', () => {
	it('3 échecs, le 1er 7 jours avant, puis réussite dans la série → fêté', () => {
		const traces = [
			echec('2026-10-13T08:00:00Z'),
			echec('2026-10-15T08:00:00Z'),
			echec('2026-10-17T08:00:00Z'),
			reussite(DANS_LA_SERIE)
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(true);
	});

	it('ordre des traces indifférent (lues de la plus récente à la plus ancienne)', () => {
		const traces = [
			reussite(DANS_LA_SERIE),
			echec('2026-10-17T08:00:00Z'),
			echec('2026-10-15T08:00:00Z'),
			echec('2026-10-13T08:00:00Z')
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(true);
	});

	it('1er échec 6 jours avant seulement → non', () => {
		const traces = [
			echec('2026-10-14T08:00:00Z'),
			echec('2026-10-15T08:00:00Z'),
			echec('2026-10-17T08:00:00Z'),
			reussite(DANS_LA_SERIE)
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(false);
	});

	it('dates de Paris : 23 h 30 à Paris le 13 compte pour le 13 (21 h 30 UTC)', () => {
		const traces = [
			echec('2026-10-13T21:30:00Z'),
			echec('2026-10-15T08:00:00Z'),
			echec('2026-10-17T08:00:00Z'),
			reussite(DANS_LA_SERIE)
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(true);
	});

	it('2 échecs seulement → non', () => {
		const traces = [
			echec('2026-10-01T08:00:00Z'),
			echec('2026-10-17T08:00:00Z'),
			reussite(DANS_LA_SERIE)
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(false);
	});

	it('une réussite entre les échecs remet le compte à zéro', () => {
		const traces = [
			echec('2026-10-01T08:00:00Z'),
			echec('2026-10-02T08:00:00Z'),
			reussite('2026-10-05T08:00:00Z'),
			echec('2026-10-16T08:00:00Z'),
			echec('2026-10-17T08:00:00Z'),
			reussite(DANS_LA_SERIE)
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(false);
	});

	it('les échecs de la série elle-même comptent, avant la réussite', () => {
		const traces = [
			echec('2026-10-10T08:00:00Z'),
			echec('2026-10-17T08:00:00Z'),
			echec('2026-10-20T08:02:00Z'),
			reussite(DANS_LA_SERIE)
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(true);
	});

	it('seule la 1re réussite de la série compte (la 2e suit une réussite)', () => {
		const traces = [
			echec('2026-10-10T08:00:00Z'),
			echec('2026-10-11T08:00:00Z'),
			echec('2026-10-12T08:00:00Z'),
			reussite(DANS_LA_SERIE),
			reussite('2026-10-20T08:07:00Z')
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(true);
	});

	it('déjà fêté dans une série plus tôt le même jour → non (U4)', () => {
		const traces = [
			echec('2026-10-10T08:00:00Z'),
			echec('2026-10-11T08:00:00Z'),
			echec('2026-10-12T08:00:00Z'),
			// 1re série du jour, déjà fêtée
			reussite('2026-10-20T07:00:00Z'),
			reussite(DANS_LA_SERIE)
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(false);
	});

	it('aucune réussite dans la série → non', () => {
		const traces = [
			echec('2026-10-10T08:00:00Z'),
			echec('2026-10-11T08:00:00Z'),
			echec('2026-10-12T08:00:00Z'),
			echec(DANS_LA_SERIE)
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(false);
	});

	it('verdict inconnu (null) : ni échec ni réussite', () => {
		const traces: StruggleTrace[] = [
			echec('2026-10-10T08:00:00Z'),
			{ created_at: '2026-10-11T08:00:00Z', success: null },
			echec('2026-10-12T08:00:00Z'),
			echec('2026-10-13T08:00:00Z'),
			reussite(DANS_LA_SERIE)
		];
		expect(isLongStruggleWon(traces, SERIE)).toBe(true);
	});

	it('aucune trace → non', () => {
		expect(isLongStruggleWon([], SERIE)).toBe(false);
	});
});
