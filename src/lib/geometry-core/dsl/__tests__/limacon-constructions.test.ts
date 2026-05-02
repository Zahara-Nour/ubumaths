/**
 * Verify limacon constructions with GeoScalar.
 *
 * Construction: circle c(K,2) with O=(2,0) on c. For each A on c,
 * P = homothetie(A, centre=O, rapport=1+d/|OA|) gives |OP| = |OA| + d.
 *
 * Since O is on c, the direction O→A only sweeps a semicircle (left half
 * from O). In polar from O with angle φ = π/2 + θ/2:
 *   ρ = 4sin(θ/2) + d = d - 4cos(φ)
 * So P.x ∈ [2 - (d+4), 2] and the curve is the "outer" branch of the
 * limaçon ρ = d - 4cos(φ).
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}
const vp = { xMin: -15, xMax: 15, yMin: -10, yMax: 10 };

describe('limacon via homothetie dynamique', () => {
	it('limacon d=3, a=2: spans x ∈ [-5, 2]', () => {
		const script = [
			'K = point(0, 0)',
			'c = cercle(K, rayon=2)',
			'O = point(2, 0)',
			'A = point_sur(c, 90)',
			'n = distance(O, A)',
			'r = 1 + 3/n',
			'P = homothetie(A, centre=O, rapport=r)',
			'L = lieu(P, A)'
		].join('\n');
		const { figure, symbols } = run(script);
		const curve = figure.computeLocusCurveForElement(symbols.get('L')!.figureId!, vp);
		expect(curve).not.toBeNull();
		const xs = curve!.points.map((p) => p.x);
		const xMin = Math.min(...xs);
		const xMax = Math.max(...xs);
		// At θ=π: |OA|=4, r=1.75, P=(-5,0) → xMin ≈ -5
		expect(xMin).toBeCloseTo(-5, 0);
		// xMax approaches 2 (=O.x) near the singularity θ=0
		expect(xMax).toBeCloseTo(2, 0);
		// Curve has enough points (singularity at θ=0 may or may not be flagged)
		expect(curve!.points.length).toBeGreaterThan(50);
	});

	it('cardioide d=4, a=2: xMin ≈ -6, max |OP| = 8', () => {
		const script = [
			'K = point(0, 0)',
			'c = cercle(K, rayon=2)',
			'O = point(2, 0)',
			'A = point_sur(c, 90)',
			'n = distance(O, A)',
			'r = 1 + 4/n',
			'P = homothetie(A, centre=O, rapport=r)',
			'L = lieu(P, A)'
		].join('\n');
		const { figure, symbols } = run(script);
		const curve = figure.computeLocusCurveForElement(symbols.get('L')!.figureId!, vp);
		expect(curve).not.toBeNull();
		const xs = curve!.points.map((p) => p.x);
		const xMin = Math.min(...xs);
		// At θ=π: |OA|=4, r=2, P=(-6,0)
		expect(xMin).toBeCloseTo(-6, 0);
		// Max distance from O should be near 8 (|OA|+4 at θ=π)
		const distsFromO = curve!.points.map((p) => Math.sqrt((p.x - 2) ** 2 + p.y ** 2));
		expect(Math.max(...distsFromO)).toBeCloseTo(8, 0);
	});
});
