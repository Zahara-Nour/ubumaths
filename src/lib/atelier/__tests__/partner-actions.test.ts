/**
 * Actions d'une liste regroupées par partenaire (Q46, 2026-10-02).
 *
 * Avant : 2 + 5 × (n − 1) boutons sur la carte d'une liste (37 avec 8 listes),
 * signalé par la revue de code ET l'audit a11y du lot 5. Désormais : les
 * actions de la liste, puis celles d'UNE partenaire choisie.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { actionsFor, defaultPartner, partnersOf } from '../actions';

function atelierWith(names: string[]) {
	const atelier = new Atelier();
	for (const name of names) atelier.create({ kind: 'list', name, definition: '1 ; 2' });
	return atelier;
}

const ids = (atelier: Atelier, name: string, partner?: string) =>
	actionsFor(atelier.get(name)!, atelier, partner).map((a) => a.id);

describe('regroupement par partenaire', () => {
	it('8 listes : au plus 9 boutons', () => {
		const atelier = atelierWith(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

		expect(actionsFor(atelier.get('A')!, atelier).length).toBeLessThanOrEqual(9);
	});

	it('les actions d’UNE partenaire seulement', () => {
		const atelier = atelierWith(['L', 'M', 'N']);
		const withN = ids(atelier, 'L', 'N');

		expect(withN).toEqual(
			expect.arrayContaining([
				'stats',
				'chart',
				'stats:N',
				'chart:N',
				'law:N',
				'scatter:N',
				'fit:N'
			])
		);
		expect(withN.some((id) => id.endsWith(':M'))).toBe(false);
	});

	it('les partenaires : les autres listes, dans l’ordre du panneau', () => {
		const atelier = atelierWith(['L', 'M', 'N']);

		expect(partnersOf(atelier.get('M')!, atelier)).toEqual(['L', 'N']);
	});

	it('partenaire par défaut : la liste suivante du panneau, en revenant au début', () => {
		const atelier = atelierWith(['L', 'M', 'N']);

		expect(defaultPartner(atelier.get('L')!, atelier)).toBe('M');
		expect(defaultPartner(atelier.get('N')!, atelier)).toBe('L');
	});

	it('un diagramme affiché avec N : N est la partenaire par défaut, « Retirer le diagramme » visible', () => {
		const atelier = atelierWith(['L', 'M', 'N']);
		atelier.toggleChart('L', 'N');

		expect(defaultPartner(atelier.get('L')!, atelier)).toBe('N');
		const labels = actionsFor(atelier.get('L')!, atelier).map((a) => a.label);
		expect(labels).toContain('Retirer le diagramme');
	});

	it('une partenaire inconnue retombe sur la partenaire par défaut', () => {
		const atelier = atelierWith(['L', 'M']);

		expect(ids(atelier, 'L', 'Z')).toContain('scatter:M');
	});

	it('sans partenaire : nuage et ajustement grisés, avec leur raison (inchangé)', () => {
		const atelier = atelierWith(['L']);
		const actions = actionsFor(atelier.get('L')!, atelier);

		expect(actions.find((a) => a.id === 'scatter')?.disabledReason).toMatch(/deux listes/);
		expect(defaultPartner(atelier.get('L')!, atelier)).toBeNull();
	});
});
