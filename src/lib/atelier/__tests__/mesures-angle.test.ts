/**
 * Géométrie, lot 2, PR 2 : `angle(A, B, C)` rend une GRANDEUR dans l'unité du
 * réglage « Angles » (décision de David du 2026-10-18) — `36,87°` en degrés
 * (le défaut), `0,6435 rad` en radians. La trigonométrie la lit seule
 * (`cos(angle(…))`) ; un nombre seul reste en radians (`cos(60)` ne change pas).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';
import { ANGLE_UNIT_KEY, readAngleUnit, writeAngleUnit } from '../angle-unit';

// =============================================================================
// Outils
// =============================================================================

/** Le rectangle ABCD (4 × 3), F(1 ; 1). */
function plane(): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
	for (const line of ['A = (0 ; 0)', 'B = (4 ; 0)', 'C = (4 ; 3)', 'D = (0 ; 3)', 'F = (1 ; 1)']) {
		runInput(s, line);
	}
	return s;
}

function answer(result: CalcResult): string {
	if (result.kind !== 'calcul')
		throw new Error(`attendu un calcul, reçu ${JSON.stringify(result)}`);
	return result.output;
}

function latex(result: CalcResult): string {
	if (result.kind !== 'calcul')
		throw new Error(`attendu un calcul, reçu ${JSON.stringify(result)}`);
	return result.latex ?? '';
}

function refusal(result: CalcResult): string {
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${JSON.stringify(result)}`);
	return result.message;
}

function memoryStorage(): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		key: (i: number) => [...map.keys()][i] ?? null,
		getItem: (k: string) => map.get(k) ?? null,
		removeItem: (k: string) => void map.delete(k),
		clear: () => map.clear(),
		setItem: (k: string, v: string) => void map.set(k, v)
	} as Storage;
}

// =============================================================================
// En degrés (le défaut)
// =============================================================================

describe('angle : une grandeur en degrés, par défaut', () => {
	it('les angles remarquables sont exacts, en °', () => {
		const s = plane();
		expect(s.atelier.angleUnit).toBe('deg');
		expect(answer(runInput(s, 'angle(B, A, D)'))).toBe('90°');
		expect(answer(runInput(s, 'angle(B, A, F)'))).toBe('45°');
		expect(latex(runInput(s, 'angle(B, A, F)'))).toContain('{}^{\\circ}');
	});

	it('un angle non remarquable : ≈, en pleine précision', () => {
		const s = plane();
		expect(answer(runInput(s, 'angle(B, A, C)'))).toBe('≈ 36,8699°');
		expect(answer(runInput(s, '100*angle(B, A, C)'))).toBe('≈ 3686,9898°');
	});

	it('la trigonométrie la lit seule : cos(angle(D, A, C)) ≈ 0,6, cos(angle(B, A, F)) = √2/2', () => {
		const s = plane();
		expect(answer(runInput(s, 'cos(angle(D, A, C))'))).toBe('≈ 0,6');
		expect(answer(runInput(s, 'cos(angle(B, A, F))'))).toBe('sqrt(2)/2');
	});

	it('se calcule comme une grandeur : 2·angle, somme, comparaison', () => {
		const s = plane();
		expect(answer(runInput(s, '2*angle(B, A, D)'))).toBe('180°');
		expect(answer(runInput(s, 'angle(B, A, F) + angle(B, A, F)'))).toBe('90°');
		expect(answer(runInput(s, 'angle(B, A, F) < 90[°]'))).toBe('vrai');
	});

	it('angle + 1 est refusé par la règle des grandeurs', () => {
		const s = plane();
		expect(refusal(runInput(s, 'angle(B, A, D) + 1'))).toContain('angle');
	});

	it('une mesure d’angle nommée : une grandeur sans curseur, qui se dit ≈', () => {
		const s = plane();
		runInput(s, 'T = angle(B, A, C)');
		const T = s.atelier.get('T');
		expect(T !== undefined && 'slider' in T && T.slider).toBeFalsy();
		expect(answer(runInput(s, 'T'))).toBe('≈ 36,8699°');
		expect(answer(runInput(s, '2T'))).toBe('≈ 73,7398°');
	});

	it('choix prudent : une fonction ne prend pas de mesure d’angle (une grandeur)', () => {
		const s = plane();
		runInput(s, 'f(x) = angle(B, A, D)*x');
		expect(s.atelier.get('f')?.status).toBe('error');
		expect(s.atelier.get('f')?.message).toContain('grandeur');
		runInput(s, 'T = angle(B, A, C)');
		runInput(s, 'g(x) = T*x');
		expect(s.atelier.get('g')?.status).toBe('error');
	});
});

// =============================================================================
// En radians
// =============================================================================

describe('angle : en radians, si le réglage le dit', () => {
	it('exact aux angles remarquables : π/2 rad', () => {
		const s = plane();
		s.atelier.setAngleUnit('rad');
		const result = runInput(s, 'angle(B, A, D)');
		expect(answer(result)).toContain('rad');
		expect(latex(result)).toContain('\\dfrac{\\pi}{2}');
	});

	it('≈ 0,6435 rad, et cos(angle(D, A, C)) ≈ 0,6 aussi', () => {
		const s = plane();
		s.atelier.setAngleUnit('rad');
		expect(answer(runInput(s, 'angle(B, A, C)'))).toBe('≈ 0,6435 rad');
		expect(answer(runInput(s, 'cos(angle(D, A, C))'))).toBe('≈ 0,6');
		expect(answer(runInput(s, 'cos(angle(B, A, F))'))).toBe('sqrt(2)/2');
	});

	it('changer le réglage recalcule une mesure nommée', () => {
		const s = plane();
		runInput(s, 'T = angle(B, A, C)');
		expect(answer(runInput(s, 'T'))).toBe('≈ 36,8699°');
		s.atelier.setAngleUnit('rad');
		expect(answer(runInput(s, 'T'))).toBe('≈ 0,6435 rad');
	});

	it('un nombre seul reste en radians : cos(60) ne change pas avec le réglage', () => {
		const s = plane();
		const before = answer(runInput(s, 'cos(60)'));
		s.atelier.setAngleUnit('rad');
		expect(answer(runInput(s, 'cos(60)'))).toBe(before);
		s.atelier.setAngleUnit('deg');
		expect(answer(runInput(s, 'cos(60)'))).toBe(before);
		expect(before).not.toBe('1/2');
	});
});

// =============================================================================
// Rangement : une préférence de ce navigateur, pas l'état de l'atelier
// =============================================================================

describe('le réglage « Angles » est rangé dans ce navigateur, à part', () => {
	it('degrés par défaut ; le choix se relit', () => {
		const storage = memoryStorage();
		expect(readAngleUnit(storage)).toBe('deg');
		writeAngleUnit(storage, 'rad');
		expect(storage.getItem(ANGLE_UNIT_KEY)).toBe('rad');
		expect(readAngleUnit(storage)).toBe('rad');
		storage.setItem(ANGLE_UNIT_KEY, 'grades');
		expect(readAngleUnit(storage)).toBe('deg');
	});

	it('il n’entre pas dans l’état rangé de l’atelier', () => {
		const s = plane();
		s.atelier.setAngleUnit('rad');
		expect(JSON.stringify(s.atelier.serialize())).not.toContain('rad');
	});
});
