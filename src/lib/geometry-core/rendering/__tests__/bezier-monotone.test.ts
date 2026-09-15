/**
 * Dépassement de la spline sur un graphe de fonction.
 *
 * Catmull-Rom calcule la tangente en un point à partir de ses DEUX voisins.
 * Quand l'un d'eux est très loin en ordonnée — le premier point d'une branche
 * qui file vers un pôle, écrêté hors du cadre — la tangente imposée est
 * démesurée et la courbe plonge sous les données avant de remonter. C'est le
 * crochet visible au fond d'une cuvette entre deux pôles.
 */

import { describe, it, expect } from 'vitest';
import { curveToSVGPath } from '../bezier';
import type { Point, SampledCurve } from '../../viewport/types';

/** Segments cubiques extraits d'un chemin SVG : [départ, cp1, cp2, arrivée]. */
function cubicSegments(path: string): [Point, Point, Point, Point][] {
	const numbers = (chunk: string): number[] =>
		chunk
			.trim()
			.split(/[\s,]+/)
			.filter((s) => s.length > 0)
			.map(Number);

	const segments: [Point, Point, Point, Point][] = [];
	let current: Point | null = null;

	for (const [, command, body] of path.matchAll(/([MCL])([^MCL]*)/g)) {
		const values = numbers(body);
		if (command === 'M') {
			current = { x: values[0], y: values[1] };
		} else if (command === 'L') {
			current = { x: values[0], y: values[1] };
		} else if (command === 'C' && current) {
			const next: Point = { x: values[4], y: values[5] };
			segments.push([
				current,
				{ x: values[0], y: values[1] },
				{ x: values[2], y: values[3] },
				next
			]);
			current = next;
		}
	}
	return segments;
}

/** Plus grand dépassement des points de contrôle hors de l'intervalle du segment. */
function maxOvershoot(path: string): number {
	let worst = 0;
	for (const [start, cp1, cp2, end] of cubicSegments(path)) {
		const low = Math.min(start.y, end.y);
		const high = Math.max(start.y, end.y);
		for (const cp of [cp1, cp2]) {
			worst = Math.max(worst, low - cp.y, cp.y - high);
		}
	}
	return worst;
}

describe('spline sur un graphe de fonction', () => {
	it('ne dépasse pas sous une cuvette bordée par une valeur écrêtée', () => {
		// Échantillons réels de 1/(x(x-1)(x+1)) entre ses pôles -1 et 0,
		// le premier point étant écrêté à 32 (hors cadre).
		const points: Point[] = [
			{ x: -0.993, y: 32 },
			{ x: -0.87, y: 4.72 },
			{ x: -0.746, y: 3.02 },
			{ x: -0.622, y: 2.62 },
			{ x: -0.498, y: 2.67 },
			{ x: -0.375, y: 3.11 },
			{ x: -0.251, y: 4.25 },
			{ x: -0.127, y: 8.0 },
			{ x: -0.003, y: 32 }
		];
		const curve: SampledCurve = { points, discontinuityIndices: [] };

		expect(maxOvershoot(curveToSVGPath(curve))).toBeLessThan(1e-9);
	});

	it("ne dépasse pas non plus autour d'un extremum ordinaire", () => {
		const points: Point[] = Array.from({ length: 21 }, (_, i) => {
			const x = -1 + i * 0.1;
			return { x, y: x * x };
		});

		expect(maxOvershoot(curveToSVGPath({ points, discontinuityIndices: [] }))).toBeLessThan(1e-9);
	});

	it('laisse une courbe paramétrique fermée intacte', () => {
		// Un cercle n'est pas un graphe de fonction : x n'y est pas monotone.
		// Le limiteur ne doit pas s'y appliquer, sinon les sommets s'aplatissent.
		const points: Point[] = Array.from({ length: 33 }, (_, i) => {
			const t = (i / 32) * 2 * Math.PI;
			return { x: Math.cos(t), y: Math.sin(t) };
		});
		const path = curveToSVGPath({ points, discontinuityIndices: [] });

		// Milieu de chaque cubique : le rayon doit rester 1.
		for (const [start, cp1, cp2, end] of cubicSegments(path)) {
			const at = (a: number, b: number, c: number, d: number): number =>
				0.125 * a + 0.375 * b + 0.375 * c + 0.125 * d;
			const x = at(start.x, cp1.x, cp2.x, end.x);
			const y = at(start.y, cp1.y, cp2.y, end.y);
			expect(Math.hypot(x, y)).toBeCloseTo(1, 2);
		}
	});
});
