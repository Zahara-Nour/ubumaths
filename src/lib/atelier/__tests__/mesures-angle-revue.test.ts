/**
 * Géométrie, lot 2, PR 2 : revue de l'angle en grandeur (2026-10-18). Asserte la
 * valeur de la console ET ce que la carte en dit — une seule source de vérité.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, valueAnswerOf, type CalcResult, type CalcSession } from '../calcul';
import { expressionOf } from '../engine';

// =============================================================================
// Outils
// =============================================================================

/** Le rectangle ABCD (4 × 3), F(1 ; 1). */
function plane(unit: 'deg' | 'rad' = 'deg'): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
	s.atelier.setAngleUnit(unit);
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

// =============================================================================
// 1, 5 — une mesure EXACTE nommée en radians
// =============================================================================

describe('revue 1 et 5 : un angle exact nommé, en radians', () => {
	it('R = angle(B, A, D) : π/2 rad, en texte lisible', () => {
		const s = plane('rad');
		runInput(s, 'R = angle(B, A, D)');
		const R = runInput(s, 'R');
		expect(answer(R)).toBe('π/2 rad');
		expect(latex(R)).toContain('\\dfrac{\\pi}{2}');
	});

	it('cos(R), 2R, R + Q se calculent', () => {
		const s = plane('rad');
		runInput(s, 'R = angle(B, A, D)');
		runInput(s, 'Q = angle(B, A, C)');
		expect(answer(runInput(s, 'cos(R)'))).toBe('0');
		expect(answer(runInput(s, '2R'))).toBe('π rad');
		expect(answer(runInput(s, 'R + Q'))).toBe('≈ 2,2143 rad');
	});

	it('un lien relu en radians : la mesure se lit', () => {
		const s = plane('rad');
		runInput(s, 'R = angle(B, A, D)');
		const back = new Atelier();
		back.setAngleUnit('rad');
		back.restore(s.atelier.serialize());
		expect(expressionOf(back, 'R').ok).toBe(true);
	});
});

// =============================================================================
// 2, 7 — la carte dit ce que dit Calcul
// =============================================================================

describe('revue 2 : la carte d’une valeur dit exactement ce que Calcul répond', () => {
	const definitions = [
		'cos(angle(B, A, C))',
		'sin(angle(B, A, D))',
		'cos(angle(B, A, D)/3)',
		'2*angle(B, A, C)',
		'2*angle(B, A, D)',
		'angle(B, A, C) + angle(B, A, D)',
		'angle(B, A, D)',
		'aire(A, B, C)'
	];
	for (const unit of ['deg', 'rad'] as const) {
		for (const definition of definitions) {
			it(`[${unit}] U = ${definition}`, () => {
				const s = plane(unit);
				runInput(s, `U = ${definition}`);
				const calc = runInput(s, 'U');
				const card = valueAnswerOf(s.atelier, 'U');
				expect(card?.text).toBe(answer(calc));
				expect(card?.latex).toBe(latex(calc));
			});
		}
	}

	it('les valeurs : cos ≈ 0,8 (pas le cosinus de 36,87 rad), 90 °, 180 °', () => {
		const s = plane();
		runInput(s, 'U = cos(angle(B, A, C))');
		runInput(s, 'V = angle(B, A, D)');
		runInput(s, 'W = 2*angle(B, A, D)');
		expect(valueAnswerOf(s.atelier, 'U')?.text).toBe('≈ 0,8');
		expect(valueAnswerOf(s.atelier, 'V')?.text).toBe('90 °');
		expect(valueAnswerOf(s.atelier, 'W')?.text).toBe('180 °');
	});
});

describe('revue 7 : une valeur que Calcul refuse est en erreur, avec le même message', () => {
	it('W = T + 1', () => {
		const s = plane();
		runInput(s, 'T = angle(B, A, C)');
		runInput(s, 'W = T + 1');
		expect(s.atelier.get('W')?.status).toBe('error');
		expect(s.atelier.get('W')?.message).toContain('On ne peut pas ajouter un angle');
	});
});

// =============================================================================
// 3 — une fonction prend le cosinus d'un angle, pas l'angle brut
// =============================================================================

describe('revue 3 : seule une grandeur d’angle BRUTE est refusée dans une fonction', () => {
	it('cos(angle(…))·x, cos(T)·x, k = cos(T) puis k·x : acceptés', () => {
		const s = plane();
		runInput(s, 'T = angle(B, A, C)');
		runInput(s, 'f(x) = cos(angle(B, A, D))*x');
		runInput(s, 'g(x) = cos(T)*x');
		runInput(s, 'k = cos(T)');
		runInput(s, 'h(x) = k*x');
		for (const name of ['f', 'g', 'h']) expect(s.atelier.get(name)?.status).toBe('ok');
		expect(answer(runInput(s, 'g(1)'))).toBe('≈ 0,8');
	});

	it('T·x reste refusé', () => {
		const s = plane();
		runInput(s, 'T = angle(B, A, C)');
		runInput(s, 'p(x) = T*x');
		expect(s.atelier.get('p')?.status).toBe('error');
	});
});

// =============================================================================
// 4, 6, 8
// =============================================================================

describe('revue 4 : la grille dit qu’un angle est une grandeur', () => {
	it('=T (approché) et =R (exact) : le même message clair', () => {
		const s = plane();
		runInput(s, 'T = angle(B, A, C)');
		runInput(s, 'R = angle(B, A, D)');
		s.atelier.editCells([
			{ column: 0, row: 1, text: '=T' },
			{ column: 1, row: 1, text: '=R' }
		]);
		const [t, r] = [s.atelier.cellValue(0, 1), s.atelier.cellValue(1, 1)];
		expect(t.kind === 'error' && t.message).toBe(
			'T est une grandeur (un angle) : une cellule calcule sans unités.'
		);
		expect(r.kind === 'error' && r.message).toBe(
			'R est une grandeur (un angle) : une cellule calcule sans unités.'
		);
	});
});

describe('revue 6 : l’aide de distance reprend le premier argument tel qu’écrit', () => {
	it('distance(milieu(A, B), [CD])', () => {
		const s = plane();
		expect(refusal(runInput(s, 'distance(milieu(A, B), [CD])'))).toContain(
			'distance(milieu(A, B), (CD))'
		);
	});
});

describe('revue 8 : comparaisons et puissances d’un angle', () => {
	it('une comparaison : vrai ou faux, en français, sans ≈', () => {
		const s = plane();
		expect(answer(runInput(s, 'angle(B, A, C) > 30[°]'))).toBe('vrai');
		const equal = runInput(s, 'angle(B, A, D) = 90[°]');
		expect(answer(equal)).toBe('vrai');
		expect(latex(equal)).toBe('\\text{vrai}');
	});

	it('choix prudent : une puissance d’un angle est refusée', () => {
		const s = plane();
		expect(refusal(runInput(s, 'angle(B, A, D)^2'))).toContain('puissance');
	});
});
