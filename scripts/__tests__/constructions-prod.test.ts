/**
 * Réécriture des constructions publiques (`scripts/constructions-prod/contenu.ts`)
 *
 * Chaque script réécrit se charge sans erreur et finit sur la figure annoncée par
 * ses consignes ; la liste des changements couvre les 9 constructions de la prod.
 */

import { describe, expect, it } from 'vitest';
import { ConstructionExecutor } from '$lib/constructions-v2/core/executor';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import {
	CHANGES,
	PARALLELOGRAMME,
	PARTAGE_TROIS,
	SYMETRIE_AXIALE
} from '../constructions-prod/contenu';

// =============================================================================
// Décor
// =============================================================================

type Pt = { x: number; y: number };

/** Joue le script jusqu'au bout ; rend la position finale de chaque point nommé */
function play(script: string): Map<string, Pt> {
	const exec = new ConstructionExecutor();
	exec.load(script);
	expect(exec.loadError?.message ?? null).toBeNull();
	while (exec.step()) {
		// joue chaque pas jusqu’au bout
	}
	const points = new Map<string, Pt>();
	for (const el of exec.figure.getAllElements()) {
		const p = exec.figure.getPosition(el.id);
		if (p && el.label) points.set(el.label, { x: geoToNumber(p.x), y: geoToNumber(p.y) });
	}
	return points;
}

function at(points: Map<string, Pt>, name: string): Pt {
	const p = points.get(name);
	if (!p) throw new Error(`point ${name} absent de la figure`);
	return p;
}

const dist = (p: Pt, q: Pt) => Math.hypot(q.x - p.x, q.y - p.y);

// =============================================================================
// Tests
// =============================================================================

describe('constructions réécrites', () => {
	it('parallélogramme : O milieu de [AC] et de [BD]', () => {
		const pts = play(PARALLELOGRAMME);
		const [A, B, C, D, O] = ['A', 'B', 'C', 'D', 'O'].map((n) => at(pts, n));
		expect(O.x).toBeCloseTo((A.x + C.x) / 2, 9);
		expect(O.y).toBeCloseTo((A.y + C.y) / 2, 9);
		expect(D.x).toBeCloseTo(2 * O.x - B.x, 9);
		expect(D.y).toBeCloseTo(2 * O.y - B.y, 9);
	});

	it('partage : M et N sur [AB], AM = MN = NB', () => {
		const pts = play(PARTAGE_TROIS);
		const [A, B, M, N] = ['A', 'B', 'M', 'N'].map((n) => at(pts, n));
		const third = dist(A, B) / 3;
		expect(dist(A, M)).toBeCloseTo(third, 9);
		expect(dist(M, N)).toBeCloseTo(third, 9);
		expect(dist(N, B)).toBeCloseTo(third, 9);
	});

	it('symétrie axiale : M′ symétrique de M par rapport à (d)', () => {
		const pts = play(SYMETRIE_AXIALE);
		const [M, Ms, N, P] = ['M', 'Ms', 'N', 'P'].map((n) => at(pts, n));
		// N et P sont sur (d) : chacun est à égale distance de M et de M′, et M′ ≠ M
		expect(dist(M, Ms)).toBeGreaterThan(1);
		expect(dist(N, Ms)).toBeCloseTo(dist(N, M), 9);
		expect(dist(P, Ms)).toBeCloseTo(dist(P, M), 9);
	});

	it('les 9 constructions de la prod, une fois chacune', () => {
		expect(new Set(CHANGES.map((c) => c.id)).size).toBe(9);
		expect(CHANGES.filter((c) => !c.isPublic).map((c) => c.title)).toEqual([
			'Exercice de repérage de points'
		]);
	});
});
