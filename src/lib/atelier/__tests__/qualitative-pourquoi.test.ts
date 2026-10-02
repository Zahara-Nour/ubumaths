/**
 * Q92 (2026-10-02) — une liste qui mélange nombres et mots dit POURQUOI elle
 * est qualitative ; une entrée qui se lit comme un nombre n'est jamais un mot.
 *
 * Avant : un `2x` tapé par erreur dans une liste de notes la rendait
 * qualitative en silence, et `1e3` (1000 en v1) devenait une modalité.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { isList, type ListObject } from '../types';

const listOf = (definition: string) => {
	const atelier = new Atelier();
	atelier.create({ kind: 'list', name: 'L', definition });
	const object = atelier.get('L');
	if (object === undefined || !isList(object)) throw new Error('pas de liste');
	return object as ListObject;
};

describe('une entrée qui se lit comme un nombre n’est jamais un mot', () => {
	it('1e3 ; 2 : numérique, 1000 et 2 (comme en v1)', () => {
		const list = listOf('1e3 ; 2');

		expect(list.categories).toBeUndefined();
		expect(list.values).toEqual([1000, 2]);
	});
});

describe('le mélange nombres et mots dit pourquoi', () => {
	it('12 ; 2x ; 15 : qualitative « à cause de 2x »', () => {
		const list = listOf('12 ; 2x ; 15');

		expect(list.categories).toEqual(['12', '2x', '15']);
		expect(list.qualitativeBecause).toBe('2x');
	});

	it('la PREMIÈRE entrée en cause est nommée', () => {
		expect(listOf('1 ; fille ; 2 ; pi').qualitativeBecause).toBe('fille');
	});

	it('que des mots : rien à expliquer', () => {
		expect(listOf('fille ; garçon').qualitativeBecause).toBeUndefined();
	});
});

describe('revue — cas limites figés', () => {
	it('Infinity et 1e400 restent des mots (pas des nombres finis)', () => {
		expect(listOf('1 ; Infinity').qualitativeBecause).toBe('Infinity');
		expect(listOf('1 ; 1e400').qualitativeBecause).toBe('1e400');
	});

	it('0x10 se lit 16, comme en v1 (Q92 : une écriture lue comme nombre n’est pas un mot)', () => {
		expect(listOf('12 ; 0x10').values).toEqual([12, 16]);
	});

	it('mélangée ET refusée (21 modalités) : la cause reste nommée', () => {
		const definition = ['3', ...Array.from({ length: 21 }, (_, i) => `m${i}`)].join(' ; ');
		const list = listOf(definition);

		expect(list.status).toBe('error');
		expect(list.qualitativeBecause).toBe('m0');
	});
});
