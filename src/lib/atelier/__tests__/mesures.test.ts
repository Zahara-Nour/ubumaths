/**
 * Géométrie, lot 2, PR 2 : les MESURES (L4 de
 * `docs/wip/atelier-geometrie-lot2-phase0.md`, validée le 2026-10-18).
 *
 * `AM` (deux points de l'atelier), `distance`, `aire`, `perimetre`, `angle` :
 * des valeurs EXACTES d'abord, utilisables partout où une valeur l'est. Une
 * mesure nommée est une valeur SANS curseur ; tapée seule, c'est un calcul.
 * Ce qui est asserté est ce que l'élève voit : la réponse, son LaTeX, l'objet.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';
import { figureFullMessage } from '../geometry';
import { MAX_FIGURE_OBJECTS } from '../types';

// =============================================================================
// Outils
// =============================================================================

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

/** Le rectangle ABCD (4 × 3), E(1 ; 2), F(1 ; 1). */
function plane(): CalcSession {
	const s = session();
	for (const line of [
		'A = (0 ; 0)',
		'B = (4 ; 0)',
		'C = (4 ; 3)',
		'D = (0 ; 3)',
		'E = (1 ; 2)',
		'F = (1 ; 1)'
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

function latex(result: CalcResult): string {
	if (result.kind !== 'calcul')
		throw new Error(`attendu un calcul, reçu ${JSON.stringify(result)}`);
	return result.latex ?? '';
}

function refusal(result: CalcResult): string {
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${JSON.stringify(result)}`);
	return result.message;
}

/** Un caractère de contrôle (`\r`, `\t`…) : un antislash perdu dans le LaTeX. */
const hasControl = (text: string) => [...text].some((char) => char.charCodeAt(0) < 32);

// =============================================================================
// L4 — tapées seules : des calculs exacts
// =============================================================================

describe('L4 : une mesure tapée seule est un calcul, exacte d’abord', () => {
	it('`AC` est la longueur AC quand A et C sont des points', () => {
		const s = plane();
		expect(answer(runInput(s, 'AC'))).toBe('5');
	});

	it('`AE` vaut √5, en écriture mathématique', () => {
		const s = plane();
		const result = runInput(s, 'AE');
		expect(answer(result)).toBe('sqrt(5)');
		expect(latex(result)).toContain('\\sqrt{5}');
		expect(hasControl(latex(result))).toBe(false);
	});

	it('`2AE` et `AE^2` : une longueur se calcule comme un nombre', () => {
		const s = plane();
		expect(answer(runInput(s, '2AE'))).toBe('2sqrt(5)');
		expect(answer(runInput(s, 'AE^2'))).toBe('5');
	});

	it('`ab` avec deux valeurs reste le produit a·b', () => {
		const s = session();
		runInput(s, 'a = 2');
		runInput(s, 'b = 3');
		expect(answer(runInput(s, 'ab'))).toBe('6');
	});

	it('`distance(A, C)`, `distance(E ; (AB))` (la forme du DSL)', () => {
		const s = plane();
		expect(answer(runInput(s, 'distance(A, C)'))).toBe('5');
		expect(answer(runInput(s, 'distance(E ; (AB))'))).toBe('2');
		runInput(s, 'd = (AB)');
		expect(answer(runInput(s, 'distance(E, d)'))).toBe('2');
	});

	it('`aire(A, B, C, D)` et `aire(A, B, C)`', () => {
		const s = plane();
		expect(answer(runInput(s, 'aire(A, B, C, D)'))).toBe('12');
		expect(answer(runInput(s, 'aire(A, B, C)'))).toBe('6');
		expect(answer(runInput(s, 'aire(A, B, E)'))).toBe('4');
	});

	it('un polygone croisé, moins de trois points : refus avec la raison', () => {
		const s = plane();
		expect(refusal(runInput(s, 'aire(A, C, B, D)'))).toContain('croisé');
		expect(refusal(runInput(s, 'aire(A, B)'))).toContain('trois points');
	});

	it('`perimetre(A, B, C)` et `périmètre(A, B, C, D)`', () => {
		const s = plane();
		expect(answer(runInput(s, 'perimetre(A, B, C)'))).toBe('12');
		expect(answer(runInput(s, 'périmètre(A, B, C, D)'))).toBe('14');
	});

	it('`angle(B, A, D)` vaut 90, `angle(B, A, F)` 45 (degrés, exacts)', () => {
		const s = plane();
		expect(answer(runInput(s, 'angle(B, A, D)'))).toBe('90°');
		expect(answer(runInput(s, 'angle(B, A, F)'))).toBe('45°');
	});

	it('un angle non remarquable : une valeur approchée, dite ≈', () => {
		const s = plane();
		const result = runInput(s, 'angle(B, A, C)');
		expect(answer(result)).toBe('≈ 36,8699°');
		expect(latex(result)).toMatch(/^\\approx 36\{,\}8699/);
	});

	it('un angle sans sommet distinct est refusé', () => {
		const s = plane();
		expect(refusal(runInput(s, 'angle(A, A, B)'))).toContain('confondus');
	});

	it('une mesure qui cite un point absent : refus qui le nomme', () => {
		const s = plane();
		expect(refusal(runInput(s, 'aire(A, B, Z)'))).toContain('« Z »');
	});
});

// =============================================================================
// L4 — une mesure nommée est une valeur, sans curseur, qui suit ses points
// =============================================================================

describe('L4 : une mesure nommée est une valeur sans curseur', () => {
	it('`S = aire(A, B, C)` : une valeur, définition telle qu’écrite, pas de curseur', () => {
		const s = plane();
		const result = runInput(s, 'S = aire(A, B, C)');
		expect(result.kind).toBe('definition');
		const S = s.atelier.get('S');
		expect([S?.kind, S?.definition, S?.status]).toEqual(['value', 'aire(A, B, C)', 'ok']);
		expect(S !== undefined && 'slider' in S && S.slider).toBeFalsy();
		expect(answer(runInput(s, 'S'))).toBe('6');
		expect(answer(runInput(s, 'S + 1'))).toBe('7');
	});

	it('`L = AE` : une longueur nommée, sans curseur', () => {
		const s = plane();
		runInput(s, 'L = AE');
		const L = s.atelier.get('L');
		expect(L !== undefined && 'slider' in L && L.slider).toBeFalsy();
		expect(answer(runInput(s, 'L^2'))).toBe('5');
	});

	it('elle suit un curseur cité par ses points', () => {
		const s = plane();
		runInput(s, 'a = 4');
		runInput(s, 'P = (a ; 0)');
		runInput(s, 'T = aire(A, P, C)');
		expect(answer(runInput(s, 'T'))).toBe('6');
		s.atelier.slideTo('a', 2);
		expect(answer(runInput(s, 'T'))).toBe('3');
	});

	it('D9 : un point qui manque la met en attente, puis elle se répare', () => {
		const s = plane();
		runInput(s, 'S = aire(A, B, Z)');
		expect(s.atelier.get('S')?.status).toBe('pending');
		runInput(s, 'Z = (4 ; 3)');
		expect(s.atelier.get('S')?.status).toBe('ok');
		expect(answer(runInput(s, 'S'))).toBe('6');
	});

	it('`S = AM` avant A et M : un produit qui attend, puis une longueur sans curseur', () => {
		const s = session();
		runInput(s, 'S = AM');
		expect(s.atelier.get('S')?.status).toBe('pending');
		runInput(s, 'A = (0 ; 0)');
		runInput(s, 'M = (3 ; 4)');
		const S = s.atelier.get('S');
		expect(S?.status).toBe('ok');
		expect(S !== undefined && 'slider' in S && S.slider).toBeFalsy();
		expect(answer(runInput(s, 'S'))).toBe('5');
	});

	it('la suppression en cascade emporte la mesure', () => {
		const s = plane();
		runInput(s, 'S = aire(A, B, C)');
		expect(s.atelier.removalOf('A')).toContain('S');
	});

	it('un polygone devenu croisé met la mesure en erreur, avec la raison', () => {
		const s = plane();
		runInput(s, 'S = aire(A, B, C, D)');
		// A(0 ; 0), B(4 ; 0), C(0 ; 3), D(4 ; 3) : [BC] et [DA] se coupent
		runInput(s, 'C = (0 ; 3)');
		runInput(s, 'D = (4 ; 3)');
		expect(s.atelier.get('S')?.status).toBe('error');
		expect(s.atelier.get('S')?.message).toContain('croisé');
	});

	it('la carte d’une valeur (LaTeX de MathLive) : \\operatorname{aire}\\left(A,B,C\\right)', () => {
		const s = plane();
		s.atelier.create({ kind: 'value', name: 'S', definition: '' });
		s.atelier.update('S', '\\operatorname{aire}\\left(A,B,C\\right)', 'keyboard');
		expect(s.atelier.get('S')?.status).toBe('ok');
		expect(answer(runInput(s, 'S'))).toBe('6');
	});

	it('se relit sans perte (sauvegarde) : toujours sans curseur', () => {
		const s = plane();
		runInput(s, 'S = aire(A, B, C)');
		const back = new Atelier();
		back.restore(s.atelier.serialize());
		const S = back.get('S');
		expect([S?.definition, S?.status]).toEqual(['aire(A, B, C)', 'ok']);
		expect(S !== undefined && 'slider' in S && S.slider).toBeFalsy();
	});
});

// =============================================================================
// L4 — utilisable partout où une valeur l'est
// =============================================================================

describe('L4 : une mesure se cite comme une valeur', () => {
	it('dans une fonction : `f(x) = AE x`', () => {
		const s = plane();
		const result = runInput(s, 'f(x) = AE*x');
		expect(result.kind).toBe('definition');
		expect(s.atelier.get('f')?.status).toBe('ok');
		expect(answer(runInput(s, 'f(2)'))).toBe('2sqrt(5)');
	});

	it('dans une valeur qui cite une mesure nommée : `k = 2S`', () => {
		const s = plane();
		runInput(s, 'S = aire(A, B, C)');
		runInput(s, 'k = 2S');
		expect(answer(runInput(s, 'k'))).toBe('12');
	});

	it('un point seul dans un calcul reste refusé (P9)', () => {
		const s = plane();
		expect(refusal(runInput(s, 'A + 1'))).toBe('On ne calcule pas encore avec des points.');
	});
});

// =============================================================================
// Revue de la PR 1 : une valeur `(AB)` devenue droite compte dans le plafond
// =============================================================================

describe('M2 : une valeur (AB) devenue droite après coup compte dans le plafond', () => {
	it('au-delà de 50 objets de figure, elle reste une valeur, en erreur avec le plafond', () => {
		const s = session();
		runInput(s, 'a = 1');
		runInput(s, 'b = 2');
		runInput(s, 'k = (ab)');
		for (let i = 1; i <= MAX_FIGURE_OBJECTS - 2; i++) {
			s.atelier.create({ kind: 'point', name: `P_${i}`, definition: `(${i} ; 0)` }, 'text');
		}
		s.atelier.remove('a');
		s.atelier.remove('b');
		runInput(s, 'a = (0 ; 0)');
		runInput(s, 'b = (1 ; 1)');
		const k = s.atelier.get('k');
		expect(k?.kind).toBe('value');
		expect(k?.status).toBe('error');
		expect(k?.message).toBe(figureFullMessage(MAX_FIGURE_OBJECTS));
	});
});
