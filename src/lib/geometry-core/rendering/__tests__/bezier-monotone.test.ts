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
import { curveToSVGPath, isFunctionGraph, monotoneSlopes, pointsToCatmullRom } from '../bezier';
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

describe('isFunctionGraph', () => {
	const at = (xs: number[]): Point[] => xs.map((x, i) => ({ x, y: i }));

	it('accepte une suite strictement monotone, dans les deux sens', () => {
		expect(isFunctionGraph(at([0, 1, 2, 3]))).toBe(true);
		expect(isFunctionGraph(at([3, 2, 1, 0]))).toBe(true);
	});

	it('refuse une abscisse répétée', () => {
		expect(isFunctionGraph(at([0, 1, 1, 2]))).toBe(false);
	});

	it('refuse une abscisse non finie, y compris sur une suite décroissante', () => {
		// `delta > 0 !== increasing` acceptait NaN quand increasing valait false :
		// les points de contrôle partaient à (0,0), dans le coin du SVG.
		expect(isFunctionGraph(at([0, 1, NaN, 3]))).toBe(false);
		expect(isFunctionGraph(at([3, 2, NaN, 0]))).toBe(false);
	});

	it('refuse un demi-tour', () => {
		expect(isFunctionGraph(at([0, 2, 1, 3]))).toBe(false);
	});
});

describe('tension', () => {
	const points: Point[] = [
		{ x: 0, y: 0 },
		{ x: 1, y: 2 },
		{ x: 2, y: 0 },
		{ x: 3, y: 2 }
	];

	it('rend des segments droits à tension nulle', () => {
		// Contrat documenté : 0 = pas de courbure.
		const path = `M${points[0].x},${points[0].y}` + pointsToCatmullRom(points, 0);
		expect(cubicSegments(path).length).toBe(points.length - 1);

		for (const [start, cp1, cp2, end] of cubicSegments(path)) {
			expect(cp1.x).toBeCloseTo(start.x, 6);
			expect(cp1.y).toBeCloseTo(start.y, 6);
			expect(cp2.x).toBeCloseTo(end.x, 6);
			expect(cp2.y).toBeCloseTo(end.y, 6);
		}
	});

	it('produit trois tracés différents pour trois tensions', () => {
		const paths = [0, 0.5, 1].map((t) => pointsToCatmullRom(points, t));
		expect(new Set(paths).size).toBe(3);
	});
});

describe('monotoneSlopes', () => {
	it('annule les pentes sur un plateau', () => {
		// Un dépassement écrêté produit plusieurs points de MÊME ordonnée.
		const slopes = monotoneSlopes([
			{ x: 0, y: 32 },
			{ x: 1, y: 32 },
			{ x: 2, y: 32 },
			{ x: 3, y: 4 }
		]);
		expect(slopes[0]).toBe(0);
		expect(slopes[1]).toBe(0);
		expect(slopes[2]).toBe(0);
	});

	it('gère trois points sans déborder du tableau', () => {
		expect(
			monotoneSlopes([
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
				{ x: 2, y: 4 }
			])
		).toEqual([1, 2, 3]);
	});

	it('ignore le limiteur quand la sécante déborde', () => {
		// Abscisses séparées par un dénormal : la sécante vaut l'infini et
		// `alpha² + beta²` débordait, ce qui annulait les deux pentes.
		const slopes = monotoneSlopes([
			{ x: 0, y: 0 },
			{ x: 1e-300, y: 1 },
			{ x: 1, y: 2 }
		]);
		expect(slopes.every((s) => Number.isFinite(s))).toBe(true);
	});
});

describe('arc paramétrique à abscisse monotone', () => {
	it('reste rond', () => {
		// Un quart de cercle a x monotone : il reçoit le limiteur. L'écart doit
		// rester très en dessous du pixel.
		const points: Point[] = Array.from({ length: 17 }, (_, i) => {
			const t = (i / 16) * (Math.PI / 2);
			return { x: Math.cos(t), y: Math.sin(t) };
		});

		for (const [start, cp1, cp2, end] of cubicSegments(
			curveToSVGPath({ points, discontinuityIndices: [] })
		)) {
			const at = (a: number, b: number, c: number, d: number): number =>
				0.125 * a + 0.375 * b + 0.375 * c + 0.125 * d;
			const radius = Math.hypot(at(start.x, cp1.x, cp2.x, end.x), at(start.y, cp1.y, cp2.y, end.y));
			expect(Math.abs(radius - 1)).toBeLessThan(0.01);
		}
	});
});
