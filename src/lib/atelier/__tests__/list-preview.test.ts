import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { isList, type ListObject } from '../types';
import { listCountLabel, listEntriesOf, listPreview } from '../list-preview';

function list(atelier: Atelier, name: string): ListObject {
	const found = atelier.get(name);
	if (!found || !isList(found)) throw new Error(name);
	return found;
}

describe('listPreview', () => {
	it('montre les trois premières entrées, puis des points de suspension', () => {
		expect(listPreview(['3', '5', '8', '13'])).toBe('{3 ; 5 ; 8 ; …}');
	});

	it('une liste courte s’affiche en entier', () => {
		expect(listPreview(['1', '2'])).toBe('{1 ; 2}');
		expect(listPreview(['1', '2', '3'])).toBe('{1 ; 2 ; 3}');
	});

	it('une liste vide est {}', () => {
		expect(listPreview([])).toBe('{}');
	});
});

describe('listCountLabel', () => {
	it('compte les valeurs, au singulier comme au pluriel', () => {
		expect(listCountLabel(['1'])).toBe('1 valeur');
		expect(listCountLabel(['1', '2'])).toBe('2 valeurs');
	});

	it('une liste de mots ajoute ses modalités', () => {
		expect(listCountLabel(['a', 'b', 'a'], ['a', 'b', 'a'])).toBe('3 valeurs, 2 modalités');
		expect(listCountLabel(['a'], ['a'])).toBe('1 valeur, 1 modalité');
	});
});

describe('listEntriesOf', () => {
	it('lit les entrées telles qu’écrites', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1/6 ; 2 ; ; 3' });
		expect(listEntriesOf(list(atelier, 'L'))).toEqual(['1/6', '2', '3']);
	});

	it('une case calculée se lit par sa valeur, jamais par sa formule', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '2;=A1*3' });
		const entries = listEntriesOf(list(atelier, 'L'), (c, r) => atelier.cellValue(c, r));
		expect(entries.join(' ')).not.toContain('=');
		expect(entries).toEqual(['2', '6']);
	});
});
