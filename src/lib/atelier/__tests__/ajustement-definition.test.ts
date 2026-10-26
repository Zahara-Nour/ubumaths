/**
 * Atelier — la fonction créée par « Ajustement avec M » s'écrit comme la console
 * l'annonce : `2x+1`, pas `2*x+1` (la carte montrait `2 × x + 1`, verifs #1413).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { CalcDesk } from '../desk.svelte';

function fitted(L: string, M: string) {
	const atelier = new Atelier();
	atelier.create({ kind: 'list', name: 'L', definition: L });
	atelier.create({ kind: 'list', name: 'M', definition: M });
	const desk = new CalcDesk(atelier);
	desk.runFromPanel('fit:M', 'L');
	expect(desk.entries[0].failed).toBe(false);
	return { atelier, definition: atelier.get('f')?.definition };
}

describe('Ajustement avec M : définition de la fonction créée', () => {
	it.each([
		['pente entière', '1 ; 2 ; 3', '3 ; 5 ; 7', '2x+1'],
		['pente 1 : x seul', '1 ; 2 ; 3', '2 ; 3 ; 4', 'x+1'],
		['pente −1 : −x', '1 ; 2 ; 3', '5 ; 4 ; 3', '-x+6'],
		['pente négative', '1 ; 2', '-1 ; -3', '-2x+1'],
		['pente décimale, ordonnée nulle', '0 ; 2', '0 ; 3', '1.5x'],
		['pente décimale, ordonnée négative', '0 ; 2', '-1 ; 0', '0.5x-1'],
		['pente nulle : la constante', '1 ; 2', '4 ; 4', '4'],
		['pente arrondie à 0 (1/3000) : la constante, comme la console', '0 ; 3000', '4 ; 5', '4']
	])('%s', (_, L, M, expected) => {
		expect(fitted(L, M).definition).toBe(expected);
	});

	// L'écriture sans `*` se lit bien comme la fonction annoncée
	it.each([
		['0 ; 2', '0 ; 3', 'f(2)', '3'],
		['1 ; 2 ; 3', '5 ; 4 ; 3', 'f(1)', '5']
	])('%s / %s : %s = %s', (L, M, input, value) => {
		const { atelier } = fitted(L, M);
		const result = runInput({ atelier, engine: new WebReplEngine() }, input);
		expect(result.kind === 'calcul' && result.output).toBe(value);
	});
});
