/**
 * Géométrie, lot 2, PR 1 : les constructions PROJETÉES dans la vue Géométrie
 * par `syncFigure` (L1 : l'atelier calcule, la figure montre ; pont à sens
 * unique). Les types de la figure existent déjà (segment, droite, demi-droite,
 * cercle par rayon) : aucun nouveau type, donc aucune nouvelle surface de rendu.
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

type Entry = [kind: 'value' | 'point' | 'curve', name: string, definition: string];

function atelierOf(entries: Entry[]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} refusé : ${done.message}`);
	}
	return atelier;
}

const POINTS: Entry[] = [
	['point', 'A', '(0 ; 1)'],
	['point', 'B', '(1 ; 3)'],
	['point', 'O', '(0 ; 0)']
];

/** L'élément visible qui porte l'étiquette `name`. */
function shown(figure: Figure, name: string): GeoElement | undefined {
	return figure.getAllElements().find((el) => el.visible && el.label === name);
}

function at(figure: Figure, id: string): [number, number] {
	const p = figure.getPosition(id);
	if (!p) throw new Error(`pas de position pour ${id}`);
	return [geoToNumber(p.x), geoToNumber(p.y)];
}

// =============================================================================
// Tests
// =============================================================================

describe('L1 : syncFigure projette les constructions', () => {
	it('un point construit est dessiné à ses coordonnées, avec son étiquette', () => {
		const atelier = atelierOf([...POINTS, ['point', 'I', 'milieu(A, B)']]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		const i = shown(target.figure, 'I');
		expect(i).toBeDefined();
		expect(at(target.figure, i!.id)).toEqual([0.5, 2]);
	});

	it('une droite, un segment, une demi-droite : leur type de figure', () => {
		const atelier = atelierOf([
			...POINTS,
			['curve', 'd', '(AB)'],
			['curve', 's', '[AB]'],
			['curve', 'r', '[AB)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		expect(shown(target.figure, 'd')?.type).toBe('line');
		expect(shown(target.figure, 's')?.type).toBe('segment');
		expect(shown(target.figure, 'r')?.type).toBe('ray');
		const s = shown(target.figure, 's');
		if (s?.type !== 'segment') throw new Error('pas un segment');
		expect([at(target.figure, s.startId), at(target.figure, s.endId)]).toEqual([
			[0, 1],
			[1, 3]
		]);
	});

	it('un cercle construit : centre et rayon', () => {
		const atelier = atelierOf([...POINTS, ['curve', 'c', 'cercle(O ; 3)']]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		const c = shown(target.figure, 'c');
		if (c?.type !== 'circleByRadius') throw new Error(`cercle attendu, reçu ${c?.type}`);
		expect(at(target.figure, c.centerId)).toEqual([0, 0]);
		expect(target.figure.resolveParam(c.radius)).toBe(3);
	});

	it('le rayon qui suit un curseur : glisser ne reconstruit pas la figure', () => {
		const atelier = atelierOf([...POINTS, ['value', 'r', '2'], ['curve', 'c', 'cercle(O ; r)']]);
		const target = new AtelierFigure();
		expect(syncFigure(atelier, target)).toBe('rebuilt');
		atelier.slideTo('r', 4);
		expect(syncFigure(atelier, target)).toBe('moved');
		const c = shown(target.figure, 'c');
		if (c?.type !== 'circleByRadius') throw new Error('pas un cercle');
		expect(target.figure.resolveParam(c.radius)).toBe(4);
	});

	it('un point qui suit un curseur entraîne la droite construite sans reconstruire', () => {
		const atelier = atelierOf([
			['value', 'a', '1'],
			['point', 'M', '(a ; 0)'],
			['point', 'O', '(0 ; 0)'],
			['point', 'I', 'milieu(M, O)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		atelier.slideTo('a', 4);
		expect(syncFigure(atelier, target)).toBe('moved');
		expect(at(target.figure, shown(target.figure, 'I')!.id)).toEqual([2, 0]);
	});

	it('F5 : une construction en erreur ou en attente n’est pas dessinée', () => {
		const atelier = atelierOf([...POINTS, ['point', 'I', 'milieu(A, Z)']]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		expect(shown(target.figure, 'I')).toBeUndefined();
	});

	it('idempotente : deux passages sans changement ne font rien', () => {
		const atelier = atelierOf([...POINTS, ['curve', 'd', '(AB)']]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		expect(syncFigure(atelier, target)).toBe('unchanged');
	});
});
