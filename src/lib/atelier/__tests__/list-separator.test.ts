/**
 * Q1, tranchée le 2026-09-16 : une liste séparée par des VIRGULES est refusée,
 * avec la correction montrée.
 *
 * `12, 15, 9` est ce qu'un élève écrit spontanément — c'est ce qu'il voit
 * partout. Aujourd'hui l'atelier le lit comme UNE seule valeur illisible, sans
 * rien expliquer.
 *
 * Accepter la virgule était exclu : `3,14` est l'écriture décimale française, la
 * plus fréquente, et la distinguer de `3, 14` par une espace est la règle jugée
 * intenable au §4 E2.
 */

import { describe, it, expect } from 'vitest';
import { parseDefinition } from '../parse';

const listOf = (definition: string) => parseDefinition('list', definition);

describe('le séparateur d’une liste', () => {
	it('accepte le point-virgule', () => {
		const parsed = listOf('12 ; 15 ; 9');

		expect(parsed.values).toEqual([12, 15, 9]);
		expect(parsed.error).toBeUndefined();
	});

	// §4 E2 : les deux écritures décimales sont acceptées
	it('accepte la virgule et le point comme séparateurs DÉCIMAUX', () => {
		expect(listOf('3,14 ; 3.14').values).toEqual([3.14, 3.14]);
	});

	it('refuse la virgule comme séparateur de valeurs', () => {
		const parsed = listOf('12, 15, 9');

		expect(parsed.error).toBeTruthy();
	});

	// Refuser sans montrer serait dur : le message porte la correction
	it('montre la correction plutôt que d’énoncer une règle', () => {
		const parsed = listOf('12, 15, 9');

		expect(parsed.error).toContain('12 ; 15 ; 9');
	});

	it('refuse aussi sans espaces', () => {
		expect(listOf('12,15,9').error).toBeTruthy();
	});

	// ⚠️ Le cas qui distingue : UNE virgule entre deux entiers, c'est un décimal
	it('ne refuse pas un simple décimal', () => {
		const parsed = listOf('3,14');

		expect(parsed.error).toBeUndefined();
		expect(parsed.values).toEqual([3.14]);
	});

	it('ne refuse pas une liste de décimaux bien séparés', () => {
		const parsed = listOf('1,5 ; 2,5 ; 3,5');

		expect(parsed.error).toBeUndefined();
		expect(parsed.values).toEqual([1.5, 2.5, 3.5]);
	});

	// §4 E1 : une valeur non numérique est ignorée ET signalée
	it('ignore et compte une valeur qui n’est pas un nombre', () => {
		const parsed = listOf('12 ; abc ; 9');

		expect(parsed.values).toEqual([12, 9]);
		expect(parsed.skipped).toBe(1);
		expect(parsed.error).toBeUndefined();
	});

	it('n’accuse pas la virgule quand la liste est déjà bien séparée', () => {
		expect(listOf('12 ; abc ; 9').error).toBeUndefined();
	});
});
