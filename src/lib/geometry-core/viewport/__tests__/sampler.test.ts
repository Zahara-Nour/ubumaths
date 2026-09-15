/**
 * Sampler tests — sampling functions over a viewport for curve rendering.
 *
 * Moved out of `grapheur/__tests__/evaluator.test.ts` with the module itself:
 * the sampler never depended on the grapheur, and geometry-core imported it
 * from there.
 */

import { describe, it, expect } from 'vitest';
import {
	sampleFunction,
	sampleFunctionAdaptive,
	sampleWithDerivative,
	sampleAtPoints,
	isAsymptote,
	DEFAULT_NUM_POINTS
} from '../sampler';
import type { Viewport } from '../types';

describe('sampler', () => {
	const defaultViewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

	describe('isAsymptote', () => {
		it('returns true when y1 is null', () => {
			expect(isAsymptote(null, 5, 10)).toBe(true);
		});

		it('returns true when y2 is null', () => {
			expect(isAsymptote(5, null, 10)).toBe(true);
		});

		it('returns true when both are null', () => {
			expect(isAsymptote(null, null, 10)).toBe(true);
		});

		it('returns false for small change', () => {
			expect(isAsymptote(1, 2, 10)).toBe(false);
		});

		it('returns true for large jump', () => {
			expect(isAsymptote(100, -100, 10)).toBe(true);
		});

		it('returns true for sign change with large values', () => {
			expect(isAsymptote(10, -10, 10)).toBe(true);
		});

		it('returns false for sign change with small values', () => {
			expect(isAsymptote(1, -1, 10)).toBe(false);
		});
	});

	describe('sampleFunction', () => {
		it('samples a constant function', () => {
			const f = () => 5;
			const curve = sampleFunction(f, defaultViewport);

			expect(curve.points.length).toBe(DEFAULT_NUM_POINTS);
			expect(curve.discontinuityIndices).toEqual([]);
			expect(curve.points.every((p) => p.y === 5)).toBe(true);
		});

		it('samples a linear function', () => {
			const f = (x: number) => 2 * x + 1;
			const curve = sampleFunction(f, defaultViewport);

			expect(curve.points.length).toBe(DEFAULT_NUM_POINTS);
			expect(curve.discontinuityIndices).toEqual([]);

			// Check first and last points
			expect(curve.points[0].x).toBeCloseTo(-10, 5);
			expect(curve.points[0].y).toBeCloseTo(-19, 5);
		});

		it('samples a parabola', () => {
			const f = (x: number) => x * x;
			const curve = sampleFunction(f, defaultViewport);

			expect(curve.points.length).toBe(DEFAULT_NUM_POINTS);
			expect(curve.discontinuityIndices).toEqual([]);

			// Check that values near center are small (vertex of parabola)
			// With 200 points from -10 to 10, the midpoint is around x=0
			const nearCenter = curve.points.filter((p) => Math.abs(p.x) < 1);
			expect(nearCenter.length).toBeGreaterThan(0);
			// All y values near x=0 should be close to 0
			nearCenter.forEach((p) => {
				expect(p.y).toBeCloseTo(p.x * p.x, 5);
			});
		});

		it('detects discontinuity in 1/x', () => {
			const f = (x: number) => (x === 0 ? null : 1 / x);
			const viewport: Viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };
			const curve = sampleFunction(f, viewport);

			// Should have at least one discontinuity near x=0
			expect(curve.discontinuityIndices.length).toBeGreaterThan(0);
		});

		it('handles domain errors gracefully', () => {
			const f = (x: number) => (x < 0 ? null : Math.sqrt(x));
			const curve = sampleFunction(f, defaultViewport);

			// Points should only be for x >= 0
			expect(curve.points.length).toBeGreaterThan(0);
			expect(curve.points.every((p) => p.x >= 0)).toBe(true);
			// Le hors-domaine ouvre la courbe : rien ne le précède, donc aucune
			// rupture à déclarer (l'index 0 était de toute façon ignoré par
			// `splitAtDiscontinuities`).
			expect(curve.discontinuityIndices).toEqual([]);
		});

		it('respects custom number of points', () => {
			const f = (x: number) => x;
			const curve = sampleFunction(f, defaultViewport, 50);

			expect(curve.points.length).toBe(50);
		});

		it('handles minimum point count', () => {
			const f = (x: number) => x;
			const curve = sampleFunction(f, defaultViewport, 1);

			// Should enforce minimum of 2 points
			expect(curve.points.length).toBe(2);
		});

		it('returns empty for degenerate viewport', () => {
			const f = (x: number) => x;
			const viewport: Viewport = { xMin: 5, xMax: 5, yMin: -10, yMax: 10 };
			const curve = sampleFunction(f, viewport);

			expect(curve.points).toEqual([]);
		});
	});

	describe('sampleFunctionAdaptive', () => {
		it('provides more points near discontinuities', () => {
			const f = (x: number) => (Math.abs(x) < 0.01 ? null : 1 / x);
			const viewport: Viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };

			const regular = sampleFunction(f, viewport, 100);
			const adaptive = sampleFunctionAdaptive(f, viewport, 100);

			// Adaptive should have more points due to refinement
			expect(adaptive.points.length).toBeGreaterThanOrEqual(regular.points.length);
		});

		it('returns same result for continuous functions', () => {
			const f = (x: number) => x * x;
			const regular = sampleFunction(f, defaultViewport, 100);
			const adaptive = sampleFunctionAdaptive(f, defaultViewport, 100);

			// For continuous function, should be the same
			expect(adaptive.points.length).toBe(regular.points.length);
		});
	});

	describe('sampleWithDerivative', () => {
		const viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };

		it('produces a valid SampledCurve', () => {
			const f = (x: number) => x * x;
			const fPrime = (x: number) => 2 * x;
			const curve = sampleWithDerivative(f, fPrime, viewport, 200);
			expect(curve.points.length).toBeGreaterThan(0);
			expect(curve.points.length).toBeLessThanOrEqual(500); // bounded
		});

		it('puts more points where derivative is large', () => {
			// sin(x) has |f'| = |cos(x)| = 1 near x=0 (steep) and 0 near x=pi/2 (flat)
			const wideViewport = { xMin: 0, xMax: Math.PI, yMin: -1, yMax: 1 };
			const f = (x: number) => Math.sin(x);
			const fPrime = (x: number) => Math.cos(x);
			const curve = sampleWithDerivative(f, fPrime, wideViewport, 100);

			// Count points in first quarter [0, pi/4] (steep) vs last quarter [3pi/4, pi] (steep too)
			// vs middle [pi/4, 3pi/4] (flat near peak)
			const steepPoints = curve.points.filter(
				(p) => p.x < Math.PI / 4 || p.x > (3 * Math.PI) / 4
			).length;
			const flatPoints = curve.points.filter(
				(p) => p.x >= Math.PI / 4 && p.x <= (3 * Math.PI) / 4
			).length;

			// Steep zones should have at least as many points as flat zone
			// (they cover same x-range but need more detail)
			expect(steepPoints).toBeGreaterThanOrEqual(flatPoints);
		});

		it('detects discontinuities', () => {
			const f = (x: number) => (x === 0 ? null : 1 / x);
			const fPrime = (x: number) => (x === 0 ? null : -1 / (x * x));
			const curve = sampleWithDerivative(
				f as (x: number) => number | null,
				fPrime as (x: number) => number | null,
				viewport,
				200
			);
			expect(curve.discontinuityIndices.length).toBeGreaterThan(0);
		});

		it('handles null derivative gracefully (falls back to uniform)', () => {
			const f = (x: number) => Math.abs(x); // not differentiable at 0
			const fPrime = (x: number) => (x === 0 ? null : x > 0 ? 1 : -1);
			const curve = sampleWithDerivative(f, fPrime as (x: number) => number | null, viewport, 100);
			expect(curve.points.length).toBeGreaterThan(50);
		});

		it('returns same quality as uniform for constant derivative', () => {
			// f(x) = 2x + 1, f'(x) = 2 (constant) → uniform distribution
			const f = (x: number) => 2 * x + 1;
			const fPrime = () => 2;
			const curve = sampleWithDerivative(f, fPrime, viewport, 100);
			const uniformCurve = sampleFunction(f, viewport, 100);
			// Should have similar number of points
			expect(Math.abs(curve.points.length - uniformCurve.points.length)).toBeLessThan(20);
		});
	});

	describe('sampleAtPoints', () => {
		it('samples at specified x values', () => {
			const f = (x: number) => x * x;
			const xValues = [0, 1, 2, 3, 4];
			const curve = sampleAtPoints(f, xValues, 20);

			expect(curve.points.length).toBe(5);
			expect(curve.points.map((p) => p.y)).toEqual([0, 1, 4, 9, 16]);
		});

		it('handles empty x values', () => {
			const f = (x: number) => x;
			const curve = sampleAtPoints(f, [], 10);

			expect(curve.points).toEqual([]);
			expect(curve.discontinuityIndices).toEqual([]);
		});

		it('detects discontinuities in specified points', () => {
			const f = (x: number) => (x === 0 ? null : 1 / x);
			const xValues = [-1, -0.1, 0, 0.1, 1];
			const curve = sampleAtPoints(f, xValues, 10);

			// Should detect discontinuity around x=0
			expect(curve.discontinuityIndices.length).toBeGreaterThan(0);
		});
	});
	// =========================================================================
	// Pôles verticaux — bug de tracé du grapheur (branches reliées / tronquées)
	// =========================================================================

	describe('pôles verticaux', () => {
		/** 1/(x(x+1)) — deux pôles, en x = -1 et x = 0. */
		const rational = (x: number): number | null => {
			const d = x * (x + 1);
			return d === 0 ? null : 1 / d;
		};
		/** Fenêtre de la capture d'écran qui a révélé le bug. */
		const wide: Viewport = { xMin: -10.3, xMax: 8, yMin: -32, yMax: 31 };
		const height = wide.yMax - wide.yMin;

		/** Découpe les points en branches selon les ruptures déclarées. */
		function branches(curve: {
			points: readonly { x: number; y: number }[];
			discontinuityIndices: readonly number[];
		}): { x: number; y: number }[][] {
			const breaks = new Set(curve.discontinuityIndices);
			const out: { x: number; y: number }[][] = [];
			let current: { x: number; y: number }[] = [];
			curve.points.forEach((p, i) => {
				if (breaks.has(i) && current.length > 0) {
					out.push(current);
					current = [];
				}
				current.push(p);
			});
			if (current.length > 0) out.push(current);
			return out;
		}

		it('coupe le tracé à chacun des deux pôles', () => {
			const curve = sampleFunction(rational, wide, 300);
			expect(curve.discontinuityIndices.length).toBe(2);
		});

		it('ne relie jamais deux branches à travers un pôle', () => {
			const curve = sampleFunction(rational, wide, 300);
			for (const branch of branches(curve)) {
				for (const pole of [-1, 0]) {
					const straddles = branch.some((p, i) => i > 0 && branch[i - 1].x < pole && p.x > pole);
					expect(straddles).toBe(false);
				}
			}
		});

		it('prolonge chaque branche divergente au-delà du cadre', () => {
			const curve = sampleFunction(rational, wide, 300);

			// x < -1 : la fonction monte vers +∞
			const left = curve.points.filter((p) => p.x < -1);
			expect(Math.max(...left.map((p) => p.y))).toBeGreaterThan(wide.yMax);

			// -1 < x < 0 : la fonction descend vers -∞ des deux côtés
			const middle = curve.points.filter((p) => p.x > -1 && p.x < 0);
			expect(Math.min(...middle.filter((p) => p.x < -0.5).map((p) => p.y))).toBeLessThan(wide.yMin);
			expect(Math.min(...middle.filter((p) => p.x > -0.5).map((p) => p.y))).toBeLessThan(wide.yMin);

			// x > 0 : la fonction monte vers +∞
			const right = curve.points.filter((p) => p.x > 0);
			expect(Math.max(...right.map((p) => p.y))).toBeGreaterThan(wide.yMax);
		});

		it('borne les ordonnées à une hauteur de fenêtre autour du cadre', () => {
			const curve = sampleFunction(rational, wide, 300);
			for (const p of curve.points) {
				expect(p.y).toBeLessThanOrEqual(wide.yMax + height);
				expect(p.y).toBeGreaterThanOrEqual(wide.yMin - height);
			}
		});

		it('ne déclare quune seule rupture quand le pôle tombe sur un échantillon', () => {
			const inverse = (x: number): number | null => (x === 0 ? null : 1 / x);
			// 101 points sur [-5, 5] : x = 0 est échantillonné exactement.
			const curve = sampleFunction(inverse, { xMin: -5, xMax: 5, yMin: -10, yMax: 10 }, 101);
			expect(curve.discontinuityIndices.length).toBe(1);
		});

		it('coupe à chaque pôle de tan(x)', () => {
			// [-5, 5] contient ±π/2 et ±3π/2.
			const curve = sampleFunction(
				(x) => Math.tan(x),
				{ xMin: -5, xMax: 5, yMin: -10, yMax: 10 },
				300
			);
			expect(curve.discontinuityIndices.length).toBe(4);
		});

		it("n'invente pas de rupture sur une fonction continue très pentue", () => {
			const steep = sampleFunction(
				(x) => x ** 5,
				{ xMin: -10, xMax: 10, yMin: -50, yMax: 50 },
				200
			);
			expect(steep.discontinuityIndices).toEqual([]);

			const exponential = sampleFunction(
				(x) => Math.exp(x),
				{ xMin: -2, xMax: 10, yMin: -10, yMax: 50 },
				200
			);
			expect(exponential.discontinuityIndices).toEqual([]);
		});

		it('prolonge le tracé jusquau bord du domaine', () => {
			const root = (x: number): number | null => (x < 0 ? null : Math.sqrt(x));
			const curve = sampleFunction(root, { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, 200);

			// Sans raffinement, le premier point tombe à ~0.05 : un décrochage visible.
			expect(curve.points[0].x).toBeGreaterThanOrEqual(0);
			expect(curve.points[0].x).toBeLessThan(1e-3);
		});

		it('fait plonger ln(x) sous le cadre au bord de son domaine', () => {
			const ln = (x: number): number | null => (x <= 0 ? null : Math.log(x));
			const curve = sampleFunction(ln, { xMin: -5, xMax: 5, yMin: -10, yMax: 10 }, 200);
			expect(Math.min(...curve.points.map((p) => p.y))).toBeLessThan(-10);
		});

		it('traite les pôles même après une zone oscillante (budget par priorité)', () => {
			// Le budget de raffinement est consommé du plus suspect au moins
			// suspect, sinon une oscillation en début de fenêtre l'épuise et les
			// pôles suivants retombent dans le bug d'origine.
			const noisyThenPole = (x: number): number | null =>
				x < 5 ? Math.sin(200 * x) * 2 : x === 8 ? null : 1 / (x - 8);
			const box: Viewport = { xMin: 0, xMax: 10, yMin: -2, yMax: 2 };
			const curve = sampleFunction(noisyThenPole, box, 300);

			// Le pôle en x = 8 doit être coupé, et ses deux branches sortir du
			// cadre : le bruit d'avant ne doit pas avoir mangé le budget.
			const breaks = new Set(curve.discontinuityIndices);
			const straddles = curve.points.some(
				(p, i) => i > 0 && !breaks.has(i) && curve.points[i - 1].x < 8 && p.x > 8
			);
			expect(straddles).toBe(false);

			const before = curve.points.filter((p) => p.x > 7.5 && p.x < 8);
			const after = curve.points.filter((p) => p.x > 8 && p.x < 8.5);
			expect(Math.min(...before.map((p) => p.y))).toBeLessThan(box.yMin);
			expect(Math.max(...after.map((p) => p.y))).toBeGreaterThan(box.yMax);
		});

		it("n'inverse jamais le signe d'une ordonnée en l'écrêtant", () => {
			// Fenêtre pannée vers le haut : la borne basse d'écrêtage devenait
			// positive et rendait -x² positif, ce que `splitOnZeros` lit ensuite
			// pour colorier les aires.
			const curve = sampleFunction((x) => -x * x, { xMin: -5, xMax: 5, yMin: 30, yMax: 40 }, 50);
			expect(curve.points.every((p) => p.y <= 0)).toBe(true);
		});

		it("n'écrête pas quand la fenêtre n'a pas de hauteur", () => {
			const flat = sampleFunction((x) => x * x, { xMin: -5, xMax: 5, yMin: 0, yMax: 0 }, 50);
			expect(Math.max(...flat.points.map((p) => p.y))).toBeCloseTo(25, 5);

			const inverted = sampleFunction((x) => x, { xMin: -5, xMax: 5, yMin: 10, yMax: -10 }, 50);
			expect(Math.min(...inverted.points.map((p) => p.y))).toBeCloseTo(-5, 5);
			expect(Math.max(...inverted.points.map((p) => p.y))).toBeCloseTo(5, 5);
		});

		it('atteint le bord du domaine même après une zone de trous denses', () => {
			// Le budget des marches de domaine se consommait lui aussi de gauche
			// à droite : les trous d'avant x = 5 le mangeaient, et le bord franc
			// en x = 8 retrouvait son décrochage.
			const holesThenEdge = (x: number): number | null => {
				if (x < 5) return Math.sin(1000 * x) < 0 ? null : 1;
				return x < 8 ? Math.sqrt(8 - x) : null;
			};
			const box: Viewport = { xMin: 0, xMax: 10, yMin: -2, yMax: 2 };
			const curve = sampleFunction(holesThenEdge, box, 300);

			const last = curve.points.filter((p) => p.x < 8).at(-1);
			expect(last).toBeDefined();
			expect(last!.x).toBeGreaterThan(7.999);
		});

		it("n'insère aucun point quand le raffinement ne conclut à rien", () => {
			// Une oscillation sous-échantillonnée déclenche des marches qui ne
			// trouvent ni pôle ni saut : leurs points sont du remplissage pur,
			// qui alourdissait le chemin SVG d'un facteur 10.
			const curve = sampleFunction(
				(x) => Math.sin(200 * x) * 2,
				{
					xMin: 0,
					xMax: 10,
					yMin: -2,
					yMax: 2
				},
				300
			);

			expect(curve.points.length).toBe(300);
		});

		it('applique le même traitement à sampleWithDerivative (courbe du DSL)', () => {
			const derivative = (x: number): number | null => {
				const d = x * (x + 1);
				return d === 0 ? null : -(2 * x + 1) / (d * d);
			};
			const curve = sampleWithDerivative(rational, derivative, wide, 300);

			expect(curve.discontinuityIndices.length).toBe(2);
			const left = curve.points.filter((p) => p.x < -1);
			expect(Math.max(...left.map((p) => p.y))).toBeGreaterThan(wide.yMax);
			for (const p of curve.points) {
				expect(Math.abs(p.y)).toBeLessThanOrEqual(
					Math.max(Math.abs(wide.yMax), Math.abs(wide.yMin)) + height
				);
			}
		});
	});
});
