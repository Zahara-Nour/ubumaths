/**
 * Atelier — la fonction créée par « Ajustement avec M » s'écrit comme la console
 * l'annonce : `2x+1`, pas `2*x+1` (la carte montrait `2 × x + 1`, verifs #1413).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';

function fittedDefinition(L: string, M: string): string | undefined {
	const atelier = new Atelier();
	atelier.create({ kind: 'list', name: 'L', definition: L });
	atelier.create({ kind: 'list', name: 'M', definition: M });
	const desk = new CalcDesk(atelier);
	desk.runFromPanel('fit:M', 'L');
	expect(desk.entries[0].failed).toBe(false);
	return atelier.get('f')?.definition;
}

describe('Ajustement avec M : définition de la fonction créée', () => {
	it.each([
		['pente entière', '1 ; 2 ; 3', '3 ; 5 ; 7', '2x+1'],
		['pente 1 : x seul', '1 ; 2 ; 3', '2 ; 3 ; 4', 'x+1'],
		['pente −1 : −x', '1 ; 2 ; 3', '5 ; 4 ; 3', '-x+6'],
		['pente négative', '1 ; 2', '-1 ; -3', '-2x+1'],
		['pente décimale, ordonnée nulle', '0 ; 2', '0 ; 3', '1.5x'],
		['pente décimale, ordonnée négative', '0 ; 2', '-1 ; 0', '0.5x-1'],
		['pente nulle : la constante', '1 ; 2', '4 ; 4', '4']
	])('%s', (_, L, M, expected) => {
		expect(fittedDefinition(L, M)).toBe(expected);
	});
});
