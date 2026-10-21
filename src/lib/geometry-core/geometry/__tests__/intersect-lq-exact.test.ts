/**
 * `intersectLQExact` : droite × conique en valeurs EXACTES (atelier, lot 2, PR 3).
 *
 * Mêmes solutions, dans le MÊME ORDRE que `intersectLQ` (numérique) : la
 * numérotation `k` d'`intersection(d, q, k)` ne dépend pas de l'exactitude des
 * données. Exact quand la droite et les coefficients le sont (`√2`, fractions).
 */

import { describe, it, expect } from 'vitest';
import { intersectLQ, intersectLQExact } from '../intersections';
import { exact, isExact, type GeoValue } from '../../types/geo-value';
import { geoFromNumber } from '../../compute/geo-arithmetic';
import { geoToNumber } from '../../compute/to-number';
import { toCustom } from '$lib/mathAST/custom-generator';
import type { GeoPoint } from '../../types/primitives';
import { number as mathNumber, opposite } from '$lib/mathAST';

type Conic = readonly [number, number, number, number, number, number];

function point(x: number, y: number): GeoPoint {
	return { x: geoFromNumber(x), y: geoFromNumber(y) };
}

function coefficients(values: readonly number[]): GeoValue[] {
	return values.map((v) => geoFromNumber(v));
}

function written(p: GeoPoint): string {
	const show = (v: GeoValue) => (isExact(v) ? toCustom(v.node) : String(v.value));
	return `(${show(p.x)} ; ${show(p.y)})`;
}

const CASES: { name: string; line: [GeoPoint, GeoPoint]; conic: Conic }[] = [
	{
		name: 'cercle x² + y² = 4, droite y = x',
		line: [point(0, 0), point(1, 1)],
		conic: [1, 0, 1, 0, 0, -4]
	},
	{
		name: 'même cercle écrit −x² − y² + 4 = 0',
		line: [point(0, 0), point(1, 1)],
		conic: [-1, 0, -1, 0, 0, 4]
	},
	{
		name: 'parabole y = x², droite y = 2x + 1',
		line: [point(0, 1), point(1, 3)],
		conic: [1, 0, 0, 0, -1, 0]
	},
	{
		name: 'hyperbole xy = 1, droite y = −x + 3',
		line: [point(0, 3), point(3, 0)],
		conic: [0, 1, 0, 0, 0, -1]
	},
	{
		name: 'ellipse x²/4 + y² = 1, droite x = 1',
		line: [point(1, 0), point(1, 5)],
		conic: [1, 0, 4, 0, 0, -4]
	}
];

describe('intersectLQExact', () => {
	for (const c of CASES) {
		it(`${c.name} : mêmes points, même ordre que intersectLQ`, () => {
			const numeric = intersectLQ(c.line[0], c.line[1], c.conic);
			const exactPoints = intersectLQExact(c.line[0], c.line[1], coefficients(c.conic));
			expect(exactPoints).not.toBeNull();
			expect(exactPoints!.kind).toBe('points');
			if (exactPoints!.kind !== 'points') return;
			expect(exactPoints!.points.length).toBe(numeric!.length);
			exactPoints!.points.forEach((p, i) => {
				expect(geoToNumber(p.x)).toBeCloseTo(geoToNumber(numeric![i].x), 9);
				expect(geoToNumber(p.y)).toBeCloseTo(geoToNumber(numeric![i].y), 9);
				expect(isExact(p.x) && isExact(p.y)).toBe(true);
			});
		});
	}

	it('exact : y = x et x² + y² = 4 donnent (−√2 ; −√2) puis (√2 ; √2)', () => {
		const result = intersectLQExact(point(0, 0), point(1, 1), coefficients([1, 0, 1, 0, 0, -4]));
		expect(result?.kind).toBe('points');
		if (result?.kind !== 'points') return;
		expect(result.points.map(written)).toEqual(['(-sqrt(2) ; -sqrt(2))', '(sqrt(2) ; sqrt(2))']);
	});

	it('une tangente : un seul point', () => {
		const result = intersectLQExact(point(0, 2), point(1, 2), coefficients([1, 0, 1, 0, 0, -4]));
		expect(result?.kind === 'points' && result.points.map(written)).toEqual(['(0 ; 2)']);
	});

	it('aucun point : une liste vide', () => {
		const result = intersectLQExact(point(0, 3), point(1, 3), coefficients([1, 0, 1, 0, 0, -4]));
		expect(result).toEqual({ kind: 'points', points: [] });
	});

	it('une droite contenue dans la conique (x² = 0 et x = 0) : une infinité', () => {
		const result = intersectLQExact(point(0, 0), point(0, 1), coefficients([1, 0, 0, 0, 0, 0]));
		expect(result).toEqual({ kind: 'infinite' });
	});

	it('un coefficient exact irrationnel reste exact', () => {
		// x² + y² = 2 : F = −2 donné en arbre (opposite), pas en nombre
		const result = intersectLQExact(point(0, 0), point(1, 0), [
			geoFromNumber(1),
			geoFromNumber(0),
			geoFromNumber(1),
			geoFromNumber(0),
			geoFromNumber(0),
			exact(opposite(mathNumber('2')))
		]);
		expect(result?.kind === 'points' && result.points.map(written)).toEqual([
			'(-sqrt(2) ; 0)',
			'(sqrt(2) ; 0)'
		]);
	});
});
