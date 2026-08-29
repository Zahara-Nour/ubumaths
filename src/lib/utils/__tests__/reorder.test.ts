import { describe, it, expect } from 'vitest';
import { reorderIds } from '../reorder';

const L = ['a', 'b', 'c', 'd', 'e'];

describe('reorderIds', () => {
	it('remonte un élément juste avant sa cible', () => {
		expect(reorderIds(L, 'd', 'b', 'before')).toEqual(['a', 'd', 'b', 'c', 'e']);
	});

	it('remonte un élément juste après sa cible', () => {
		expect(reorderIds(L, 'd', 'b', 'after')).toEqual(['a', 'b', 'd', 'c', 'e']);
	});

	// Descendre est le cas qui se trompe si l'index de la cible n'est pas
	// recalculé après le retrait : la cible recule d'un cran.
	it('descend un élément juste après sa cible', () => {
		expect(reorderIds(L, 'b', 'd', 'after')).toEqual(['a', 'c', 'd', 'b', 'e']);
	});

	it('descend un élément juste avant sa cible', () => {
		expect(reorderIds(L, 'b', 'd', 'before')).toEqual(['a', 'c', 'b', 'd', 'e']);
	});

	it('place en tête et en queue', () => {
		expect(reorderIds(L, 'e', 'a', 'before')).toEqual(['e', 'a', 'b', 'c', 'd']);
		expect(reorderIds(L, 'a', 'e', 'after')).toEqual(['b', 'c', 'd', 'e', 'a']);
	});

	it('déplacer sur un voisin immédiat ne perd rien', () => {
		expect(reorderIds(L, 'b', 'c', 'after')).toEqual(['a', 'c', 'b', 'd', 'e']);
		expect(reorderIds(L, 'c', 'b', 'before')).toEqual(['a', 'c', 'b', 'd', 'e']);
	});

	it('conserve toujours la liste complète, sans doublon', () => {
		for (const from of L)
			for (const to of L)
				for (const place of ['before', 'after'] as const) {
					const out = reorderIds(L, from, to, place);
					if (out === null) continue;
					expect(out).toHaveLength(L.length);
					expect(new Set(out).size).toBe(L.length);
				}
	});

	it('refuse un dépôt sur soi-même ou un id inconnu', () => {
		expect(reorderIds(L, 'b', 'b', 'before')).toBeNull();
		expect(reorderIds(L, 'z', 'b', 'before')).toBeNull();
		expect(reorderIds(L, 'b', 'z', 'after')).toBeNull();
	});

	it('ne modifie pas la liste reçue', () => {
		const original = [...L];
		reorderIds(L, 'a', 'e', 'after');
		expect(L).toEqual(original);
	});
});
