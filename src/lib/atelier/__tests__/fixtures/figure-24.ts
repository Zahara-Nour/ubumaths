/**
 * La figure de 24 objets du banc de performance (chantier « recalcul de
 * l'atelier », 2026-10-19) : points, milieux, cercle, intersections,
 * perpendiculaire, mesures `aire`, `AM`, `angle`, `perimetre`.
 *
 * Le curseur `a` pilote un `point_sur` (M) dont dépendent une perpendiculaire,
 * deux intersections et des mesures ; `b` ne pilote qu'un point isolé.
 */

import { Atelier } from '../../atelier.svelte';

export type FigureEntry = [
	kind: 'value' | 'point' | 'curve' | 'function',
	name: string,
	definition: string
];

export const FIGURE_24: readonly FigureEntry[] = [
	['value', 'a', '0,3'],
	['point', 'A', '(0 ; 0)'],
	['point', 'B', '(4 ; 0)'],
	['point', 'C', '(1 ; 3)'],
	['curve', 's', '[AB]'],
	['curve', 't', '[BC]'],
	['point', 'M', 'point_sur(s ; a)'],
	['point', 'I', 'milieu(A, C)'],
	['point', 'J', 'milieu(B, C)'],
	['curve', 'c', 'cercle(A ; 2)'],
	['curve', 'd', '(AC)'],
	['curve', 'p', 'perpendiculaire(M ; d)'],
	['point', 'E', 'intersection(p, d, 1)'],
	['point', 'F', 'intersection(s, c, 1)'],
	['point', 'K', 'milieu(M, C)'],
	['curve', 'h', '(MC)'],
	['value', 'S', 'aire(A ; M ; C)'],
	['value', 'L', 'AM'],
	['value', 'T', 'angle(B, A, C)'],
	['value', 'U', 'angle(A, M, C)'],
	['value', 'Q', 'perimetre(A ; M ; C)'],
	['value', 'b', '2'],
	['point', 'N', '(b ; 1)'],
	['point', 'G', 'intersection(h, c, 1)']
];

/** Un atelier neuf qui porte la figure ; une définition refusée lève. */
export function figure24(): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of FIGURE_24) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} refusé : ${done.message}`);
	}
	return atelier;
}
