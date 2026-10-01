/**
 * Atelier — « Loi avec probabilités M » (chantier outils statistiques, lot 6,
 * Q44) : E, V et σ d'une variable aléatoire, valeurs dans L, probabilités dans M.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { actionsFor } from '../actions';

function atelierWith(lists: Record<string, string>) {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return atelier;
}

describe('Loi avec probabilités M', () => {
	it('une action par partenaire', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '0,5 ; 0,5' });

		expect(actionsFor(atelier.get('L')!, atelier).map((a) => a.label)).toContain(
			'Loi avec probabilités M'
		);
	});

	// ⚠️ Une liste de l'atelier n'accepte que des nombres écrits en clair : `1/6`
	// y est IGNORÉ (constaté au lot 6). D'où des probabilités décimales exactes.
	it('probabilités décimales : E et V exacts, en fractions', () => {
		const desk = new CalcDesk(atelierWith({ L: '-2 ; 0 ; 5', M: '0,5 ; 0,3 ; 0,2' }));

		desk.runFromPanel('law:M', 'L');

		expect(desk.entries[0].failed).toBe(false);
		expect(desk.entries[0].label).toBe('Loi de L avec probabilités M');
		expect(desk.entries[0].text.split('\n')).toEqual(['E(L) = 0', 'V(L) = 7', 'σ(L) ≈ 2,65']);
	});

	it('probabilités dont la somme ne fait pas 1 : la somme trouvée', () => {
		const desk = new CalcDesk(atelierWith({ L: '1 ; 2', M: '0,5 ; 0,3' }));

		desk.runFromPanel('law:M', 'L');

		expect(desk.entries[0].failed).toBe(true);
		expect(desk.entries[0].text).toContain('4/5');
	});

	it('partenaire de longueur différente : désactivée avant le clic, avec la raison', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '1' });
		const action = actionsFor(atelier.get('L')!, atelier).find((a) => a.id === 'law:M');

		expect(action?.disabledReason).toMatch(/2.*1/);
	});
});
