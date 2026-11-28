/**
 * Atelier — une image calculée (`j = f(3)`) suit l'ensemble de f.
 *
 * Suite du chantier `fonctions-morceaux` (validée par David le 2026-11-28) :
 * Calcul refuse `j = f(3)` quand 3 est hors de l'ensemble de f ; quand
 * l'ensemble change APRÈS (curseur de k, f réécrite), j passe en erreur avec
 * le même message, et redevient juste quand 3 y revient.
 */

import { describe, it, expect } from 'vitest';
import { CalcDesk } from '../desk.svelte';
import { Atelier } from '../atelier.svelte';

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

function slide(d: CalcDesk, name: string, value: number): void {
	const moved = d.atelier.slideTo(name, value);
	if (!moved.ok) throw new Error(moved.message);
}

// =============================================================================
// Tests
// =============================================================================

describe('j = f(3) suit l’ensemble de f', () => {
	it('le curseur de k sort 3 de [k;5] : j en erreur ; k redescend : j revient', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]', 'j = f(3)');
		expect(d.atelier.get('j')?.status).toBe('ok');
		slide(d, 'k', 4);
		const j = d.atelier.get('j');
		expect(j?.status).toBe('error');
		expect(j?.message).toContain("3 n'est pas dans l'ensemble de définition de f");
		expect(j?.message).toContain('[4 ; 5]');
		slide(d, 'k', 2);
		expect(d.atelier.get('j')?.status).toBe('ok');
	});

	it('f réécrite sur [4;5] : j en erreur', () => {
		const d = desk('f(x) = x sur [0;5]', 'j = f(3)');
		expect(d.atelier.update('f', 'x', 'text', undefined, '[4;5]').ok).toBe(true);
		expect(d.atelier.get('j')?.status).toBe('error');
	});

	it('ce qui cite j passe en erreur avec lui', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]', 'j = f(3)', 'm = j + 1');
		slide(d, 'k', 4);
		expect(d.atelier.get('m')?.status).toBe('error');
	});

	it('une fonction qui appelle f sur un nombre : g(x) = x + f(3)', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]', 'g(x) = x + f(3)');
		slide(d, 'k', 4);
		expect(d.atelier.get('g')?.status).toBe('error');
	});

	it('f(x) dans une autre fonction n’est pas une image : g(x) = f(x) + 1 reste juste', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]', 'g(x) = f(x) + 1');
		slide(d, 'k', 4);
		expect(d.atelier.get('g')?.status).toBe('ok');
	});

	it('écrite dans le champ de la carte (LaTeX) : f\\left(3\\right)', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		expect(
			d.atelier.create({ kind: 'value', name: 'j', definition: 'f\\left(3\\right)' }, 'mathfield')
				.ok
		).toBe(true);
		expect(d.atelier.get('j')?.status).toBe('ok');
		slide(d, 'k', 4);
		expect(d.atelier.get('j')?.status).toBe('error');
	});
});
