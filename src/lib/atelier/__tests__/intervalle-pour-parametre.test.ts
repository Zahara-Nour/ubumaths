/**
 * Atelier — une condition À PARAMÈTRE : `f(x) = x pour x > k`.
 *
 * Suite du chantier `fonctions-domaines` (accord de David le 2026-11-28) : la
 * condition cite des valeurs de l'atelier comme les bornes de `sur [k;5]`
 * (chantier `fonctions-morceaux`), avec les mêmes règles : valeur remplacée à
 * chaque recalcul, champ qui garde l'écriture, carte en erreur quand le curseur
 * rend l'ensemble impossible. La lettre de la fonction ne compte pas comme une
 * valeur, et une réponse d'élève (sans valeurs) refuse toujours une lettre.
 */

import { describe, it, expect } from 'vitest';
import { CalcDesk } from '../desk.svelte';
import { Atelier } from '../atelier.svelte';
import { fieldLatexOf } from '../mathfield';
import {
	intervalNamesOf,
	plotRestrictionOf,
	splitInterval,
	UNREADABLE_CONDITION
} from '../interval';
import type { Entry } from '../desk.svelte';
import { parseStudentDomain } from '#lib/mathAST/domain/validation/parse-student-domain.ts';

// =============================================================================
// Aides
// =============================================================================

function desk(...definitions: string[]): CalcDesk {
	const d = new CalcDesk(new Atelier());
	for (const definition of definitions) {
		d.submit(definition);
		if (d.entries.at(-1)?.failed) throw new Error(`définition refusée : ${definition}`);
	}
	return d;
}

function last(d: CalcDesk): Entry {
	const entry = d.entries.at(-1);
	if (entry === undefined) throw new Error('aucune ligne');
	return entry;
}

/** Le curseur de `name` posé sur `value` (le geste de l'élève). */
function slide(d: CalcDesk, name: string, value: number): void {
	const moved = d.atelier.slideTo(name, value);
	if (!moved.ok) throw new Error(moved.message);
}

const piece = (from: number, to: number, fromClosed = true, toClosed = true) => ({
	from,
	to,
	fromClosed,
	toClosed
});

// =============================================================================
// Cas normal
// =============================================================================

describe('la condition cite une valeur', () => {
	it('x > k avec k = 2 : f(3) accepté, f(1) refusé ; k à 0 : f(1) accepté', () => {
		const d = desk('k = 2', 'f(x) = x pour x > k');
		expect(d.atelier.get('f')?.status).toBe('ok');
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([piece(2, Infinity, false, false)]);
		d.submit('f(3)');
		expect(last(d).failed).toBe(false);
		d.submit('f(1)');
		expect(last(d).failed).toBe(true);
		slide(d, 'k', 0);
		d.submit('f(1)');
		expect(last(d).failed).toBe(false);
	});

	it('k < x < 5 avec k = 1 : ]1 ; 5[', () => {
		const d = desk('k = 1', 'f(x) = x pour k < x < 5');
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([piece(1, 5, false, false)]);
	});

	it('x ≥ k avec k = 1 : [1 ; +∞[, et la borne suit le curseur', () => {
		const d = desk('k = 1', 'f(x) = x pour x ≥ k');
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([piece(1, Infinity, true, false)]);
		slide(d, 'k', 3);
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([piece(3, Infinity, true, false)]);
	});

	it('bornes calculées : -a ≤ x ≤ a avec a = 2', () => {
		const d = desk('a = 2', 'f(x) = x^2 pour -a ≤ x ≤ a');
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([piece(-2, 2)]);
	});

	it('x ≠ k et « ou » : les deux lisent la valeur', () => {
		const d = desk('k = 1', 'f(x) = 1/(x-1) pour x ≠ k', 'g(x) = x pour x < k ou x > 3');
		expect(d.atelier.get('f')?.status).toBe('ok');
		expect(plotRestrictionOf(d.atelier.get('g'))).toEqual([
			piece(-Infinity, 1, false, false),
			piece(3, Infinity, false, false)
		]);
	});

	it('la carte réaffiche ce qui a été tapé, k compris, et le champ se relit', () => {
		const d = desk('k = 2', 'f(x) = x pour x > k');
		const latex = fieldLatexOf(d.atelier.get('f')!, d.atelier.functionNames);
		expect(latex).toBe('x\\text{ pour }x>k');
		expect(splitInterval(latex, 'latex')).toEqual({ body: 'x', written: 'x>k' });
	});

	it('renommer k en m : la condition suit', () => {
		const d = desk('k = 2', 'f(x) = x pour x > k');
		expect(d.atelier.rename('k', 'm').ok).toBe(true);
		const f = d.atelier.get('f');
		expect(f?.status).toBe('ok');
		expect(f?.kind === 'function' && f.interval).toBe('x > m');
	});
});

// =============================================================================
// Cas limites
// =============================================================================

describe('valeurs absentes ou impossibles', () => {
	it('k pas encore défini : f l’attend, avec l’offre de curseur', () => {
		const d = desk('f(x) = x pour x > k');
		const f = d.atelier.get('f');
		expect(f?.status).toBe('pending');
		expect(f?.missing?.map((m) => m.name)).toEqual(['k']);
		d.submit('k = 2');
		expect(d.atelier.get('f')?.status).toBe('ok');
	});

	it('k à 6 dans k < x < 5 : vide, carte en erreur ; k à 2 : elle revient', () => {
		const d = desk('k = 2', 'f(x) = x pour k < x < 5');
		slide(d, 'k', 6);
		const f = d.atelier.get('f');
		expect(f?.status).toBe('error');
		expect(f?.message).toBe("L'intervalle est vide (k = 6).");
		slide(d, 'k', 2);
		expect(d.atelier.get('f')?.status).toBe('ok');
	});

	it('√x pour x > k, k à −1 : hors du domaine, la valeur nommée', () => {
		const d = desk('k = 1', 'f(x) = \\sqrt{x} pour x > k');
		slide(d, 'k', -1);
		const f = d.atelier.get('f');
		expect(f?.status).toBe('error');
		expect(f?.message).toContain('(k = −1)');
	});
});

// =============================================================================
// Refus
// =============================================================================

describe('ce qui reste refusé', () => {
	it('la lettre de la fonction n’est pas une valeur : t > t dans f(t)', () => {
		expect(intervalNamesOf('t > t', 't')).toEqual([]);
		const d = new CalcDesk(new Atelier());
		d.submit('f(t) = t pour t > t');
		expect(last(d)).toMatchObject({ text: UNREADABLE_CONDITION, failed: true });
	});

	it('une condition sur une autre lettre reste refusée : f(x) = x pour t > 2', () => {
		const d = desk('t = 1');
		d.submit('f(x) = x pour t > 2');
		expect(last(d).failed).toBe(true);
	});

	it('une réponse d’élève (sans valeurs) refuse toujours une lettre dans une condition', () => {
		expect(parseStudentDomain('x > k').success).toBe(false);
		expect(parseStudentDomain('k < x < 5').success).toBe(false);
	});
});
