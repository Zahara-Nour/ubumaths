/**
 * Choisir la liste des ordonnées — dette soldée le 2026-09-16.
 *
 * « La suivante du panneau » suffisait à deux listes ; à trois, elle est
 * souvent fausse. Plutôt qu'un écran de choix ou un glisser-déposer (qui a
 * coûté trois bugs en production), on utilise le catalogue d'actions du §3 :
 * **une action par partenaire possible**. Le mécanisme existe déjà et sert
 * exactement à ça.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { actionsFor } from '../actions';

function atelierWith(lists: Record<string, string>) {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return atelier;
}

const idsOf = (atelier: Atelier, name: string) =>
	actionsFor(atelier.get(name)!, atelier).map((a) => a.id);

describe('avec deux listes, rien ne change', () => {
	it('propose un seul nuage et un seul ajustement', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '2 ; 4' });

		const ids = idsOf(atelier, 'L');

		expect(ids.filter((id) => id.startsWith('scatter')).length).toBe(1);
		expect(ids.filter((id) => id.startsWith('fit')).length).toBe(1);
	});

	it('nomme la partenaire dans le libellé', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '2 ; 4' });

		const actions = actionsFor(atelier.get('L')!, atelier);

		expect(actions.find((a) => a.id.startsWith('scatter'))?.label).toContain('M');
	});
});

describe('avec trois listes, l’élève choisit', () => {
	it('propose un nuage par partenaire', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '2 ; 4', N: '3 ; 6' });

		const ids = idsOf(atelier, 'L');

		expect(ids).toContain('scatter:M');
		expect(ids).toContain('scatter:N');
	});

	it('ne se propose jamais elle-même comme ordonnées', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '2 ; 4', N: '3 ; 6' });

		expect(idsOf(atelier, 'L')).not.toContain('scatter:L');
	});

	it('fait pareil pour l’ajustement', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '2 ; 4', N: '3 ; 6' });

		const ids = idsOf(atelier, 'L');

		expect(ids).toContain('fit:M');
		expect(ids).toContain('fit:N');
	});

	it('distingue les libellés', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '2 ; 4', N: '3 ; 6' });

		const labels = actionsFor(atelier.get('L')!, atelier)
			.filter((a) => a.id.startsWith('scatter'))
			.map((a) => a.label);

		expect(new Set(labels).size).toBe(2);
	});
});

describe('quand le nuage n’a pas de sens', () => {
	it('dit qu’il faut deux listes quand il n’y en a qu’une', () => {
		const atelier = atelierWith({ L: '1 ; 2' });

		const actions = actionsFor(atelier.get('L')!, atelier);
		const scatter = actions.find((a) => a.id.startsWith('scatter'));

		// ⚠️ Visible et désactivée avec sa raison, jamais cachée (§3)
		expect(scatter).toBeDefined();
		expect(scatter?.disabledReason).toMatch(/deux listes/i);
	});

	it('reste proposé sur une liste vide, avec sa raison', () => {
		const atelier = atelierWith({ L: '', M: '2 ; 4' });

		const scatter = actionsFor(atelier.get('L')!, atelier).find((a) => a.id.startsWith('scatter'));

		expect(scatter?.disabledReason).toBeTruthy();
	});
});

describe('les autres types ne sont pas touchés', () => {
	it('une fonction garde ses actions', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });

		const ids = actionsFor(atelier.get('f')!, atelier).map((a) => a.id);

		expect(ids).toContain('derive');
		expect(ids).toContain('plot');
		expect(ids.some((id) => id.startsWith('scatter'))).toBe(false);
	});

	// L'atelier reste facultatif : les tests du lot 2 appellent `actionsFor(o)`
	it('se passe de l’atelier, comme avant', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '2 ; 4' });

		expect(() => actionsFor(atelier.get('L')!)).not.toThrow();
	});
});
