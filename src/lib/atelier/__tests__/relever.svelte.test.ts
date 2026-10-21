/**
 * `.relever` dans un vrai navigateur (géométrie lot 2, PR 4, revue) : sous
 * `$state`, les objets sont des proxies. `Atelier.sweep` remet le TABLEAU
 * d'avant (`[...items]`) : on vérifie ici que l'atelier est rendu tel quel,
 * et que ce qui le lit (carte, figure) voit l'objet d'avant.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { isList } from '../types';

const AREA_PROBLEM = [
	'A = (0 ; 0)',
	'B = (4 ; 0)',
	'M = point_sur([AB] ; 0,5)',
	'N = (AM ; MB)',
	'P = (0 ; MB)',
	'S = aire(A, M, N, P)'
];

function savedObjects(atelier: Atelier): string {
	return JSON.stringify(atelier.serialize().objects.filter((o) => o.kind !== 'list'));
}

describe('un relevé rend l’atelier tel qu’il était (navigateur)', () => {
	it('le problème de l’aire : M, S et tout le reste inchangés, deux listes en plus', () => {
		const desk = new CalcDesk(new Atelier());
		for (const line of AREA_PROBLEM) desk.submit(line);
		const before = savedObjects(desk.atelier);

		desk.submit('.relever AM ; S quand M va de 0 à 1 pas 0,05');

		expect(desk.entries.at(-1)?.failed).toBe(false);
		expect(savedObjects(desk.atelier)).toBe(before);
		expect(desk.atelier.positionOf('M')).toBe(0.5);
		expect(desk.atelier.get('S')?.status).toBe('ok');
		expect(desk.atelier.objects.filter(isList).map((l) => l.name)).toEqual(['L', 'L_1']);
	});

	it('une valeur relevée hors de ses bornes garde son curseur, et le glisser marche encore', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('t = 3');
		desk.submit('f(x) = x^2');
		const before = savedObjects(desk.atelier);

		desk.submit('.relever t ; f(t) quand t va de 0 à 40 pas 10');

		expect(savedObjects(desk.atelier)).toBe(before);
		expect(desk.atelier.slideTo('t', 2).ok).toBe(true);
		expect(desk.atelier.get('t')?.definition).toBe('2');
	});
});
