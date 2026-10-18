/**
 * Géométrie, lot 2, PR 3 : `point_sur` et `intersection` PROJETÉS dans la vue
 * Géométrie (`syncFigure`). L'atelier calcule (L1) ; la figure suit un curseur
 * SANS se reconstruire (`moved`), comme les curseurs cachés de la PR 2 du lot 1 ;
 * la numérotation des solutions (`k`) est celle de `geometry-core`, stable quand
 * un curseur glisse : un point ne saute pas d'une branche à l'autre.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { AtelierFigure, syncFigure } from '../figure-sync';
import type { Figure } from '$lib/geometry-core/graph/figure';
import type { GeoElement } from '$lib/geometry-core/types/elements';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';

// =============================================================================
// Outils
// =============================================================================

type Entry = [kind: 'value' | 'point' | 'curve' | 'function', name: string, definition: string];

function atelierOf(entries: Entry[]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} refusé : ${done.message}`);
	}
	return atelier;
}

const PLANE: Entry[] = [
	['point', 'A', '(0 ; 1)'],
	['point', 'B', '(1 ; 3)'],
	['point', 'O', '(0 ; 0)'],
	['point', 'C', '(2 ; 0)'],
	['curve', 'u', '(OC)'],
	['curve', 'c', 'cercle(O ; 1)']
];

function shown(figure: Figure, name: string): GeoElement | undefined {
	return figure.getAllElements().find((el) => el.visible && el.label === name);
}

/** Les coordonnées DESSINÉES du point `name`, ou `null` s'il n'est pas dessiné. */
function drawn(target: AtelierFigure, name: string): [number, number] | null {
	const el = shown(target.figure, name);
	if (el === undefined) return null;
	const p = target.figure.getPosition(el.id);
	if (!p) return null;
	return [geoToNumber(p.x), geoToNumber(p.y)];
}

function close(actual: [number, number] | null, expected: [number, number]): void {
	expect(actual).not.toBeNull();
	expect(actual![0]).toBeCloseTo(expected[0], 6);
	expect(actual![1]).toBeCloseTo(expected[1], 6);
}

// =============================================================================
// intersection
// =============================================================================

describe('intersection dans la vue Géométrie', () => {
	it('un point d’intersection est dessiné à ses coordonnées', () => {
		const atelier = atelierOf([...PLANE, ['point', 'E', 'intersection(u, c, 1)']]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		close(drawn(target, 'E'), [-1, 0]);
	});

	it('un curseur glisse : E suit sans reconstruire la figure', () => {
		const atelier = atelierOf([
			...PLANE,
			['value', 'a', '0,5'],
			['point', 'P', '(0 ; a)'],
			['curve', 'h', 'parallele(P, u)'],
			['point', 'E', 'intersection(h, c, 1)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		close(drawn(target, 'E'), [-Math.sqrt(3) / 2, 0.5]);
		atelier.slideTo('a', 0.6);
		expect(syncFigure(atelier, target)).toBe('moved');
		close(drawn(target, 'E'), [-0.8, 0.6]);
	});

	it('numérotation stable : k = 1 reste sur la même branche quand le curseur glisse', () => {
		const atelier = atelierOf([
			...PLANE,
			['value', 'a', '-0,9'],
			['point', 'P', '(0 ; a)'],
			['curve', 'h', 'parallele(P, u)'],
			['point', 'E', 'intersection(h, c, 1)'],
			['point', 'F', 'intersection(h, c, 2)']
		]);
		const target = new AtelierFigure();
		for (let i = 0; i <= 18; i++) {
			const a = -0.9 + i * 0.1;
			atelier.slideTo('a', a);
			syncFigure(atelier, target);
			const u = drawn(target, 'E');
			const f = drawn(target, 'F');
			// E toujours à gauche, F toujours à droite : aucun saut de branche
			expect(u![0]).toBeLessThan(0);
			expect(f![0]).toBeGreaterThan(0);
			expect(u![1]).toBeCloseTo(a, 6);
		}
	});

	it('deux cercles, un rayon qui glisse : k = 1 reste au-dessus de (centre 1 → centre 2)', () => {
		const atelier = atelierOf([
			...PLANE,
			['point', 'Q', '(1 ; 0)'],
			['value', 'r', '1'],
			['curve', 'k', 'cercle(Q ; r)'],
			['point', 'E', 'intersection(c, k, 1)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		for (const r of [0.5, 0.8, 1, 1.4, 1.9]) {
			atelier.slideTo('r', r);
			expect(syncFigure(atelier, target)).toBe('moved');
			expect(drawn(target, 'E')![1]).toBeGreaterThan(0);
		}
	});

	it('plus de point commun : E n’est plus dessiné ; il revient quand ils se recoupent', () => {
		const atelier = atelierOf([
			...PLANE,
			['value', 'a', '0,5'],
			['point', 'P', '(0 ; a)'],
			['curve', 'h', 'parallele(P, u)'],
			['point', 'E', 'intersection(h, c, 1)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		atelier.slideTo('a', 2);
		syncFigure(atelier, target);
		expect(drawn(target, 'E')).toBeNull();
		atelier.slideTo('a', 0);
		syncFigure(atelier, target);
		close(drawn(target, 'E'), [-1, 0]);
	});

	it('droite et fonction à curseur : (√a ; 0) suit a sans reconstruire', () => {
		const atelier = atelierOf([
			...PLANE,
			['value', 'a', '2'],
			['function', 'f', 'x^2 - a'],
			['point', 'E', 'intersection(u, f, 2)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		close(drawn(target, 'E'), [Math.SQRT2, 0]);
		atelier.slideTo('a', 4);
		expect(syncFigure(atelier, target)).toBe('moved');
		close(drawn(target, 'E'), [2, 0]);
	});

	it('une construction qui cite un point d’intersection à curseur le suit', () => {
		const atelier = atelierOf([
			...PLANE,
			['value', 'a', '0'],
			['point', 'P', '(0 ; a)'],
			['curve', 'h', 'parallele(P, u)'],
			['point', 'E', 'intersection(h, c, 2)'],
			['point', 'I', 'milieu(E, O)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		close(drawn(target, 'I'), [0.5, 0]);
		atelier.slideTo('a', 0.6);
		expect(syncFigure(atelier, target)).toBe('moved');
		close(drawn(target, 'I'), [0.4, 0.3]);
	});
});

// =============================================================================
// point_sur
// =============================================================================

describe('point_sur dans la vue Géométrie', () => {
	it('M sur [AB] : dessiné ; glisser sa position le déplace sans reconstruire', () => {
		const atelier = atelierOf([
			...PLANE,
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; 0,3)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		close(drawn(target, 'M'), [0.3, 1.6]);
		atelier.slidePosition('M', 0.6);
		expect(syncFigure(atelier, target)).toBe('moved');
		close(drawn(target, 'M'), [0.6, 2.2]);
	});

	it('M sur un cercle (degrés) : la position glisse, M tourne', () => {
		const atelier = atelierOf([...PLANE, ['point', 'M', 'point_sur(c ; 0)']]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		close(drawn(target, 'M'), [1, 0]);
		atelier.slidePosition('M', 90);
		expect(syncFigure(atelier, target)).toBe('moved');
		close(drawn(target, 'M'), [0, 1]);
	});

	it('M sur la courbe de f : (x0 ; f(x0)), la position glisse', () => {
		const atelier = atelierOf([
			...PLANE,
			['function', 'f', 'x^2'],
			['point', 'M', 'point_sur(f ; 1)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		close(drawn(target, 'M'), [1, 1]);
		atelier.slidePosition('M', 2);
		expect(syncFigure(atelier, target)).toBe('moved');
		close(drawn(target, 'M'), [2, 4]);
	});

	it('la position est une valeur à curseur : M suit le curseur de la valeur', () => {
		const atelier = atelierOf([
			...PLANE,
			['value', 't', '0,3'],
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; t)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		atelier.slideTo('t', 0.5);
		expect(syncFigure(atelier, target)).toBe('moved');
		close(drawn(target, 'M'), [0.5, 2]);
	});

	it('intersection d’une droite qui passe par un point glissant', () => {
		const atelier = atelierOf([
			...PLANE,
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; 0)'],
			['curve', 'h', 'parallele(M, u)'],
			['point', 'E', 'intersection(h, c)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		// M = A(0 ; 1) : la parallèle y = 1 est tangente au cercle en (0 ; 1)
		close(drawn(target, 'E'), [0, 1]);
	});
});
