/**
 * Géométrie, lot 2, PR 2 : corrections de la revue des MESURES (2026-10-18).
 * Ce qui est asserté est ce que l'élève voit : définition après renommage,
 * réponse de Calcul, refus et sa raison.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

// =============================================================================
// Outils
// =============================================================================

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

/** Le rectangle ABCD (4 × 3), E(1 ; 2), M(3 ; 4). */
function plane(): CalcSession {
	const s = session();
	for (const line of [
		'A = (0 ; 0)',
		'B = (4 ; 0)',
		'C = (4 ; 3)',
		'D = (0 ; 3)',
		'E = (1 ; 2)',
		'M = (3 ; 4)'
	]) {
		const done = runInput(s, line);
		if (done.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(done)}`);
	}
	return s;
}

function answer(result: CalcResult): string {
	if (result.kind !== 'calcul')
		throw new Error(`attendu un calcul, reçu ${JSON.stringify(result)}`);
	return result.output;
}

function refusal(result: CalcResult): string {
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${JSON.stringify(result)}`);
	return result.message;
}

function defined(s: CalcSession, line: string) {
	const result = runInput(s, line);
	if (result.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(result)}`);
	return s.atelier.get(result.name);
}

// =============================================================================
// 1 — renommage
// =============================================================================

describe('revue 1 : renommer un point cité par une longueur `AM`', () => {
	it('S = AM et h(x) = f(x) + AM suivent M → K, sans curseur ni erreur', () => {
		const s = plane();
		runInput(s, 'S = AM');
		runInput(s, 'f(x) = x');
		runInput(s, 'h(x) = f(x) + AM');
		const renamed = s.atelier.rename('M', 'K');
		expect(renamed.ok && renamed.updated).toEqual(['S', 'h']);
		expect(s.atelier.get('S')?.definition).toBe('AK');
		expect(s.atelier.get('h')?.definition).toBe('f(x) + AK');
		const S = s.atelier.get('S');
		expect(S?.status).toBe('ok');
		expect(S !== undefined && 'slider' in S && S.slider).toBeFalsy();
		expect(answer(runInput(s, 'S'))).toBe('5');
	});

	it('la carte (LaTeX) : AN+\\operatorname{aire}\\left(A,N,C\\right), N → P', () => {
		const s = plane();
		runInput(s, 'N = (4 ; 3)');
		s.atelier.create({ kind: 'value', name: 'S', definition: '' });
		s.atelier.update('S', 'AN+\\operatorname{aire}\\left(A,N,C\\right)', 'keyboard');
		expect(s.atelier.rename('N', 'P').ok).toBe(true);
		expect(s.atelier.get('S')?.definition).toBe('AP+\\operatorname{aire}\\left(A,P,C\\right)');
		expect(s.atelier.get('S')?.status).toBe('ok');
	});

	it('un produit de valeurs `ab` n’est pas touché par le renommage d’un point', () => {
		const s = plane();
		runInput(s, 'a = 2');
		runInput(s, 'b = 3');
		runInput(s, 'k = ab + AM');
		s.atelier.rename('A', 'Z');
		expect(s.atelier.get('k')?.definition).toBe('ab + ZM');
	});
});

// =============================================================================
// 2, 3 — une valeur approchée reste approchée, en pleine précision
// =============================================================================

describe('revue 2 : une mesure approchée ne devient pas une fraction exacte', () => {
	it('T = angle(B, A, C) puis T, 2T : ≈ décimal', () => {
		const s = plane();
		runInput(s, 'T = angle(B, A, C)');
		expect(answer(runInput(s, 'T'))).toBe('≈ 36,8699');
		expect(answer(runInput(s, '2T'))).toBe('≈ 73,7398');
	});

	it('g(x) = angle(B, A, C)·x puis g(1) : ≈ décimal', () => {
		const s = plane();
		runInput(s, 'g(x) = angle(B, A, C)*x');
		expect(answer(runInput(s, 'g(1)'))).toBe('≈ 36,8699');
	});

	it('J = angle(B, A, C) + 0 puis J : ≈ décimal', () => {
		const s = plane();
		runInput(s, 'J = angle(B, A, C) + 0');
		expect(answer(runInput(s, 'J'))).toBe('≈ 36,8699');
	});
});

describe('revue 3 : pleine précision dans le calcul, arrondi à l’affichage', () => {
	it('100·angle(B, A, C) vaut ≈ 3686,9898', () => {
		const s = plane();
		expect(answer(runInput(s, '100*angle(B, A, C)'))).toBe('≈ 3686,9898');
	});
});

// =============================================================================
// 4 — citable partout : constructions, coordonnées
// =============================================================================

describe('revue 4 : une mesure dans une construction ou des coordonnées', () => {
	it('cercle(A ; AE) et cercle(A ; rayon = AE)', () => {
		const s = plane();
		expect(defined(s, 'c = cercle(A ; AE)')?.status).toBe('ok');
		expect(defined(s, 'c_1 = cercle(A ; rayon = AE)')?.status).toBe('ok');
		expect(answer(runInput(s, 'c'))).toBe('c : x^2+y^2=5');
	});

	it('G = (aire(B, C, D) ; 0) et P = (AE ; 0)', () => {
		const s = plane();
		expect(defined(s, 'G = (aire(B, C, D) ; 0)')?.status).toBe('ok');
		expect(answer(runInput(s, 'G'))).toBe('G(6 ; 0)');
		expect(defined(s, 'P = (AC ; 0)')?.status).toBe('ok');
		expect(answer(runInput(s, 'P'))).toBe('P(5 ; 0)');
	});

	it('Q = (AC ; 0) suit A : la dépendance est tenue', () => {
		const s = plane();
		runInput(s, 'Q = (AC ; 0)');
		expect(s.atelier.removalOf('A')).toContain('Q');
	});

	it('A = (AM ; 0) est circulaire : refus clair', () => {
		const s = plane();
		expect(refusal(runInput(s, 'A = (AM ; 0)'))).toContain('lui-même');
		expect(refusal(runInput(s, 'K = (KM ; 0)'))).toContain('lui-même');
	});
});

// =============================================================================
// 5, 6, 7
// =============================================================================

describe('revue 5 : une mesure d’un point construit', () => {
	it('distance(A, milieu(B, C))', () => {
		const s = plane();
		// milieu(B, C) = (4 ; 1,5) : distance √(16 + 2,25) = √73/2
		expect(answer(runInput(s, 'distance(A, milieu(B, C))'))).toBe('sqrt(73)/2');
	});
});

describe('revue 6 : un polygone dégénéré n’a pas d’aire', () => {
	it('un sommet répété est refusé', () => {
		const s = plane();
		expect(refusal(runInput(s, 'aire(A, B, C, B)'))).toContain('confondus');
		expect(refusal(runInput(s, 'aire(A, B, C, D, B)'))).toContain('confondus');
	});

	it('des côtés qui se touchent hors de leurs extrémités communes sont refusés', () => {
		const s = plane();
		runInput(s, 'H = (2 ; 0)');
		runInput(s, 'K = (2 ; 3)');
		// A, B, K, H, D : le côté [KH] touche [AB] en H
		expect(refusal(runInput(s, 'aire(A, B, K, H, D)'))).toContain('se touchent');
	});
});

describe('revue 7 : une mesure qui ne se calcule pas le dit', () => {
	it('une coordonnée infinie (1/0) : refus, pas un 0 silencieux', () => {
		const s = plane();
		runInput(s, 'z = 0');
		runInput(s, 'R = (1/z ; 0)');
		const result = runInput(s, 'AR');
		expect(result.kind).toBe('refus');
	});
});
