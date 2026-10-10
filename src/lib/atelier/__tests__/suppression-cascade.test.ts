/**
 * Supprimer un objet emporte ceux qui en dépendent, après confirmation, et se
 * rattrape par « Annuler » — lot B de `docs/archive/wip/atelier-suppression-export-phase0.md`
 * (décision de David, 2026-10-05). Remplace la règle L3 : `f′` et `g` ne
 * restent plus « en attente » quand on supprime `f`.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { cascadeMessage, removedMessage } from '../removal';

// =============================================================================
// Décor
// =============================================================================

/** `f`, sa dérivée, `g` qui la cite, `h` qui cite `g`, et `k` indépendante. */
function family(): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition: '3x^2-1' }, 'text');
	atelier.setPlotted('f', true);
	atelier.setDisplay('f', { color: 'curve-3', lineWidth: 4 });
	atelier.createDerivative('f');
	atelier.create({ kind: 'function', name: 'g', definition: 'f(x)*(-1)' }, 'text');
	atelier.create({ kind: 'function', name: 'h', definition: 'g(x)+1' }, 'text');
	atelier.create({ kind: 'function', name: 'k', definition: 'x+2' }, 'text');
	return atelier;
}

// =============================================================================
// Ce qui part
// =============================================================================

describe('supprimer avec ses dépendants', () => {
	it('nomme les dépendants, directs et en chaîne, dans l’ordre des cartes', () => {
		expect(family().removalOf('f')).toEqual(["f'", 'g', 'h']);
	});

	it('un objet sans dépendant n’en a pas', () => {
		expect(family().removalOf('k')).toEqual([]);
	});

	it('emporte l’objet et tous ses dépendants (N3, L1)', () => {
		const atelier = family();

		const result = atelier.removeWithDependents('f');

		expect(result.ok && result.removed).toEqual(['f', "f'", 'g', 'h']);
		expect(atelier.names).toEqual(['k']);
	});

	it('ne laisse rien « en attente » derrière lui', () => {
		const atelier = family();

		atelier.removeWithDependents('f');

		expect(atelier.objects.some((o) => o.status === 'pending')).toBe(false);
	});

	it('supprimer f′ seule laisse f (L2)', () => {
		const atelier = family();

		atelier.removeWithDependents("f'");

		expect(atelier.names).toEqual(['f', 'g', 'h', 'k']);
	});

	it('un cycle ne compte pas l’objet deux fois', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'g(x)+1' }, 'text');
		atelier.create({ kind: 'function', name: 'g', definition: 'f(x)+1' }, 'text');

		expect(atelier.removalOf('f')).toEqual(['g']);
		const result = atelier.removeWithDependents('f');
		expect(result.ok && result.removed).toEqual(['f', 'g']);
	});

	it('refuse un nom qui n’existe pas', () => {
		expect(family().removeWithDependents('z').ok).toBe(false);
	});
});

// =============================================================================
// Annuler
// =============================================================================

describe('annuler une suppression', () => {
	it('remet tout à l’identique : définitions, réglages, tracé (N4)', () => {
		const atelier = family();
		const before = atelier.serialize();
		const result = atelier.removeWithDependents('f');
		if (!result.ok) throw new Error('suppression refusée');

		expect(atelier.undoRemoval(result)).toBe(true);

		expect(atelier.serialize()).toEqual(before);
		expect(atelier.get('g')?.status).toBe('ok');
	});

	it('remet le curseur réglé d’une valeur', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		atelier.setSlider('a', { min: 0, max: 5, step: 0.5 });
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');
		const before = atelier.serialize();
		const result = atelier.removeWithDependents('a');
		if (!result.ok) throw new Error('suppression refusée');

		atelier.undoRemoval(result);

		expect(atelier.serialize()).toEqual(before);
	});

	it('remet le diagramme d’une liste', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' }, 'text');
		atelier.toggleChart('L', null);
		const result = atelier.removeWithDependents('L');
		if (!result.ok) throw new Error('suppression refusée');

		atelier.undoRemoval(result);

		expect(atelier.chartOf('L')).toEqual({ partner: null });
	});

	it('refuse si l’atelier a changé depuis (L4)', () => {
		const atelier = family();
		const result = atelier.removeWithDependents('f');
		if (!result.ok) throw new Error('suppression refusée');
		atelier.create({ kind: 'function', name: 'f', definition: 'x' }, 'text');

		expect(atelier.undoRemoval(result)).toBe(false);
		expect(atelier.names).toEqual(['k', 'f']);
	});

	it('ne s’annule qu’une fois', () => {
		const atelier = family();
		const result = atelier.removeWithDependents('f');
		if (!result.ok) throw new Error('suppression refusée');
		atelier.undoRemoval(result);

		expect(atelier.undoRemoval(result)).toBe(false);
	});

	it('une suppression plus récente rend la précédente inannulable', () => {
		const atelier = family();
		const first = atelier.removeWithDependents('k');
		atelier.removeWithDependents('f');
		if (!first.ok) throw new Error('suppression refusée');

		expect(atelier.undoRemoval(first)).toBe(false);
	});
});

// =============================================================================
// Les mots
// =============================================================================

describe('les messages', () => {
	it('confirmation à un dépendant', () => {
		expect(cascadeMessage('f', ['g'])).toBe('Supprimer f supprime aussi g.');
	});

	it('confirmation à trois dépendants, primes typographiques', () => {
		expect(cascadeMessage('f', ["f'", 'g', 'h'])).toBe('Supprimer f supprime aussi f′, g et h.');
	});

	it('au-delà de trois, nomme les trois premiers (L3)', () => {
		expect(cascadeMessage('f', ["f'", 'g', 'h', 'p', 'q'])).toBe(
			'Supprimer f supprime aussi f′, g, h et 2 autres.'
		);
	});

	it('un seul objet supprimé', () => {
		expect(removedMessage(["f'"])).toBe('« f′ » supprimé');
	});

	it('plusieurs objets supprimés', () => {
		expect(removedMessage(['f', "f'", 'g'])).toBe('3 objets supprimés');
	});
});
