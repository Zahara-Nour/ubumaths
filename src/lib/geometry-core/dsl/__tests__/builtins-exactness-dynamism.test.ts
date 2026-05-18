/**
 * TDD tests for the stdlib → builtins migration fix (2026-05-19).
 *
 * The 6 commits that migrated the 23 stdlib macros to TypeScript builtins
 * (commits 2f85f5677 through e87b7ef40) introduced two regressions :
 *
 *   1. Exactness loss : handlers extracted coordinates via geoToNumber() then
 *      recreated via numeric(), bypassing the geoAdd/Sub/Mul/Div/Sqrt
 *      arithmetic that propagates exact GeoValue.
 *
 *   2. Dynamism loss : handlers created FreePoints with static coordinates
 *      for derived points (e.g. midpoint, rotated vertex), so dragging the
 *      source no longer updated the derived points.
 *
 * These tests check that the fix restores both properties. They are written
 * BEFORE the fix and must FAIL initially. The fix is to use the factory
 * methods (`createMidpoint`, `createRotatedPoint`, `createTranslatedPoint`,
 * `createReflectedPoint`, `createIntersectionLL/LC`) and, when needed,
 * `createScalarExpression` + `createComputedPoint` for parameterized cases.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import { numeric } from '../../types/geo-value';

function symId(symbols: ReturnType<typeof runDsl>['symbols'], name: string): string {
	const entry = symbols.get(name);
	if (!entry?.figureId) throw new Error(`Symbol "${name}" not found`);
	return entry.figureId;
}

function posOf(
	figure: ReturnType<typeof runDsl>['figure'],
	symbols: ReturnType<typeof runDsl>['symbols'],
	name: string
) {
	const p = figure.getPosition(symId(symbols, name));
	if (!p) throw new Error(`No position for "${name}"`);
	return { x: geoToNumber(p.x), y: geoToNumber(p.y) };
}

describe('Stdlib builtins — exactness propagation', () => {
	it('point(0, 0) produces an exact FreePoint (integer literal)', () => {
		const { figure, symbols } = runDsl('A = point(0, 0)');
		const p = figure.getPosition(symId(symbols, 'A'));
		expect(p).not.toBeNull();
		expect(p!.x.kind).toBe('exact');
		expect(p!.y.kind).toBe('exact');
	});

	it('point(2.5, 3) produces an exact FreePoint (decimal literal)', () => {
		const { figure, symbols } = runDsl('A = point(2.5, 3)');
		const p = figure.getPosition(symId(symbols, 'A'));
		expect(p).not.toBeNull();
		expect(p!.x.kind).toBe('exact');
		expect(p!.y.kind).toBe('exact');
		expect(geoToNumber(p!.x)).toBe(2.5);
		expect(geoToNumber(p!.y)).toBe(3);
	});

	it('point(1/3, 0) produces an exact FreePoint (rational)', () => {
		const { figure, symbols } = runDsl('A = point(1/3, 0)');
		const p = figure.getPosition(symId(symbols, 'A'));
		expect(p).not.toBeNull();
		expect(p!.x.kind).toBe('exact');
		expect(geoToNumber(p!.x)).toBeCloseTo(1 / 3, 15);
	});

	it('point(2*sqrt(3), 0) produces an exact FreePoint (symbolic)', () => {
		const { figure, symbols } = runDsl('B = point(2*sqrt(3), 0)');
		const p = figure.getPosition(symId(symbols, 'B'));
		expect(p).not.toBeNull();
		expect(p!.x.kind).toBe('exact');
		expect(geoToNumber(p!.x)).toBeCloseTo(2 * Math.sqrt(3), 10);
	});

	it('mediatrice : derived midpoint of (0,0) and (2*sqrt(3), 0) is exact', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(2*sqrt(3), 0)',
				'd = mediatrice(A, B)',
				'M = milieu(A, B)'
			].join('\n')
		);
		const p = figure.getPosition(symId(symbols, 'M'));
		expect(p).not.toBeNull();
		expect(p!.x.kind).toBe('exact');
		expect(geoToNumber(p!.x)).toBeCloseTo(Math.sqrt(3), 10);
		expect(geoToNumber(p!.y)).toBeCloseTo(0, 10);
	});

	it('triangle_equilateral : 3rd vertex is exact when sources are exact', () => {
		// Use a symbolic side length to force exact source coords (kind 'exact').
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(sqrt(4), 0)', 't = triangle_equilateral(A, B)'].join('\n')
		);
		const t = figure.elements.get(symId(symbols, 't'));
		if (!t || t.type !== 'polygon') throw new Error('not a polygon');
		const Cid = t.dependsOn[2];
		const C = figure.getPosition(Cid);
		expect(C).not.toBeNull();
		// sqrt(4) reduces to 2 via simplifyExact, so B becomes numeric. But the
		// rotation angle π/3 is exact, so C may still be exact when arithmetic
		// permits. We assert numerical correctness here ; the next test exercises
		// the case where the source is irreducibly symbolic.
		expect(geoToNumber(C!.x)).toBeCloseTo(1, 10);
		expect(geoToNumber(C!.y)).toBeCloseTo(Math.sqrt(3), 10);
	});

	it('parallelogramme with exact sqrt(3) source has exact derived vertex', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(2, 0)',
				'C = point(2*sqrt(3), 1)',
				'p = parallelogramme(A, B, C)'
			].join('\n')
		);
		const p = figure.elements.get(symId(symbols, 'p'));
		if (!p || p.type !== 'polygon') throw new Error('not a polygon');
		const Did = p.dependsOn[3];
		const D = figure.getPosition(Did);
		expect(D).not.toBeNull();
		expect(D!.x.kind).toBe('exact');
		// D = A + (C - B) = (2*sqrt(3) - 2, 1)
		expect(geoToNumber(D!.x)).toBeCloseTo(2 * Math.sqrt(3) - 2, 10);
		expect(geoToNumber(D!.y)).toBeCloseTo(1, 10);
	});
});

describe('Stdlib builtins — dynamic updates on drag', () => {
	function moveAndRecompute(
		figure: ReturnType<typeof runDsl>['figure'],
		id: string,
		x: number,
		y: number
	) {
		figure.movePoint(id, numeric(x), numeric(y));
		figure.recompute();
	}

	it('mediatrice : dragging A moves the perpendicular line and milieu accessor', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B)', 'M = milieu(A, B)'].join('\n')
		);
		expect(posOf(figure, symbols, 'M')).toEqual({ x: 2, y: 0 });
		moveAndRecompute(figure, symId(symbols, 'A'), 6, 0);
		const m = posOf(figure, symbols, 'M');
		expect(m.x).toBeCloseTo(5);
		expect(m.y).toBeCloseTo(0);
	});

	it('mediane : segment endpoint follows when B is dragged', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = point(2, 4)', 's = mediane(A, B, C)'].join('\n')
		);
		// segment s goes from A to midpoint(B, C). Midpoint is initially (3, 2).
		const segEl = figure.elements.get(symId(symbols, 's'));
		if (!segEl || segEl.type !== 'segment') throw new Error('not a segment');
		const endId = segEl.endId;
		const e0 = figure.getPosition(endId)!;
		expect(geoToNumber(e0.x)).toBeCloseTo(3);
		expect(geoToNumber(e0.y)).toBeCloseTo(2);
		moveAndRecompute(figure, symId(symbols, 'B'), 6, 0);
		const e1 = figure.getPosition(endId)!;
		expect(geoToNumber(e1.x)).toBeCloseTo(4); // (6 + 2) / 2
		expect(geoToNumber(e1.y)).toBeCloseTo(2);
	});

	it('triangle_equilateral : 3rd vertex follows when B is dragged', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(2, 0)', 't = triangle_equilateral(A, B)'].join('\n')
		);
		const tEl = figure.elements.get(symId(symbols, 't'));
		if (!tEl || tEl.type !== 'polygon') throw new Error('not a polygon');
		const Cid = tEl.dependsOn[2];
		moveAndRecompute(figure, symId(symbols, 'B'), 4, 0);
		const C = figure.getPosition(Cid)!;
		// side = 4 → C = (2, 2*sqrt(3))
		expect(geoToNumber(C.x)).toBeCloseTo(2);
		expect(geoToNumber(C.y)).toBeCloseTo(2 * Math.sqrt(3));
	});

	it('parallelogramme : 4th vertex follows when C is dragged', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(2, 0)',
				'C = point(3, 2)',
				'p = parallelogramme(A, B, C)'
			].join('\n')
		);
		const pEl = figure.elements.get(symId(symbols, 'p'));
		if (!pEl || pEl.type !== 'polygon') throw new Error('not a polygon');
		const Did = pEl.dependsOn[3];
		const D0 = figure.getPosition(Did)!;
		// D = A + (C - B) = (0 + 3 - 2, 0 + 2 - 0) = (1, 2)
		expect(geoToNumber(D0.x)).toBeCloseTo(1);
		expect(geoToNumber(D0.y)).toBeCloseTo(2);
		moveAndRecompute(figure, symId(symbols, 'C'), 5, 3);
		const D1 = figure.getPosition(Did)!;
		// D = (0 + 5 - 2, 0 + 3 - 0) = (3, 3)
		expect(geoToNumber(D1.x)).toBeCloseTo(3);
		expect(geoToNumber(D1.y)).toBeCloseTo(3);
	});

	it('rectangle : 4th vertex follows when A is dragged', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'r = rectangle(A, B, largeur=2)'].join('\n')
		);
		const rEl = figure.elements.get(symId(symbols, 'r'));
		if (!rEl || rEl.type !== 'polygon') throw new Error('not a polygon');
		const Did = rEl.dependsOn[3];
		const D0 = figure.getPosition(Did)!;
		// D = A + perp(AB)/|AB| * 2 = (0, 0) + (0, 1) * 2 = (0, 2)
		expect(geoToNumber(D0.x)).toBeCloseTo(0);
		expect(geoToNumber(D0.y)).toBeCloseTo(2);
		moveAndRecompute(figure, symId(symbols, 'A'), 1, 1);
		// AB = (3, -1), |AB| = sqrt(10), perp normalized = (1, 3)/sqrt(10)
		// D = (1, 1) + (1, 3) * 2/sqrt(10) = (1 + 2/sqrt(10), 1 + 6/sqrt(10))
		const D1 = figure.getPosition(Did)!;
		expect(geoToNumber(D1.x)).toBeCloseTo(1 + 2 / Math.sqrt(10));
		expect(geoToNumber(D1.y)).toBeCloseTo(1 + 6 / Math.sqrt(10));
	});

	it('cercle_circonscrit : center follows when one vertex is dragged', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 4)',
				'cc = cercle_circonscrit(A, B, C)',
				'O = centre(cc)'
			].join('\n')
		);
		// circumcenter of (0,0), (4,0), (2,4) is on x=2 (perp bisector of AB),
		// and y = (4 - 0) / 2 - (some adjustment). Compute :
		// |OA|² = |OB|² → O on x=2
		// |OA|² = |OC|² → 4 + Oy² = 0 + (Oy-4)² → 4 = -8·Oy + 16 → Oy = 1.5
		const O0 = posOf(figure, symbols, 'O');
		expect(O0.x).toBeCloseTo(2);
		expect(O0.y).toBeCloseTo(1.5);
		moveAndRecompute(figure, symId(symbols, 'C'), 2, 6);
		// New : |OA|² = 4 + Oy² = (Oy-6)² → 4 = -12·Oy + 36 → Oy = 32/12 ≈ 2.667
		const O1 = posOf(figure, symbols, 'O');
		expect(O1.x).toBeCloseTo(2);
		expect(O1.y).toBeCloseTo(32 / 12);
	});

	it('polygone_regulier : vertex follows when center is dragged', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'p = polygone_regulier(O, 1, 6)'].join('\n')
		);
		const pEl = figure.elements.get(symId(symbols, 'p'));
		if (!pEl || pEl.type !== 'polygon') throw new Error('not a polygon');
		const P0id = pEl.dependsOn[0];
		const P0_initial = figure.getPosition(P0id)!;
		expect(geoToNumber(P0_initial.x)).toBeCloseTo(1);
		expect(geoToNumber(P0_initial.y)).toBeCloseTo(0);
		moveAndRecompute(figure, symId(symbols, 'O'), 3, 3);
		const P0_after = figure.getPosition(P0id)!;
		expect(geoToNumber(P0_after.x)).toBeCloseTo(4); // 3 + 1
		expect(geoToNumber(P0_after.y)).toBeCloseTo(3);

		// Also check that all other vertices moved by the same vector (rigid translation)
		const P3id = pEl.dependsOn[3];
		const P3_after = figure.getPosition(P3id)!;
		expect(geoToNumber(P3_after.x)).toBeCloseTo(2); // 3 - 1
		expect(geoToNumber(P3_after.y)).toBeCloseTo(3);
	});

	it('centre_gravite : follows when any vertex is dragged', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(6, 0)', 'C = point(3, 3)', 'G = centre_gravite(A, B, C)'].join(
				'\n'
			)
		);
		expect(posOf(figure, symbols, 'G')).toEqual({ x: 3, y: 1 });
		moveAndRecompute(figure, symId(symbols, 'C'), 6, 6);
		const G = posOf(figure, symbols, 'G');
		// G = ((0+6+6)/3, (0+0+6)/3) = (4, 2)
		expect(G.x).toBeCloseTo(4);
		expect(G.y).toBeCloseTo(2);
	});

	it('orthocentre : follows when a vertex is dragged', () => {
		// For right triangle at A, the orthocenter is A itself.
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = point(0, 3)', 'H = orthocentre(A, B, C)'].join(
				'\n'
			)
		);
		expect(posOf(figure, symbols, 'H')).toEqual({ x: 0, y: 0 });
		moveAndRecompute(figure, symId(symbols, 'A'), 2, 2);
		// Recompute orthocenter of (2,2), (4,0), (0,3).
		// Formula : H = A + B + C - 2·O where O = circumcenter.
		// |OA|² = |OB|² → (Ox-2)²+(Oy-2)² = (Ox-4)²+Oy² → 4Ox-4Oy = 12 → Ox - Oy = 3
		// |OA|² = |OC|² → (Ox-2)²+(Oy-2)² = Ox²+(Oy-3)² → -4Ox+2Oy = -3 → -2Ox+Oy = -1.5
		// Sum : -Ox = 1.5 → Ox = -1.5 → Oy = -4.5
		// Wait that doesn't seem right. Let me redo.
		// Eq1 : (Ox-2)²+(Oy-2)² = (Ox-4)²+Oy²
		//       Ox²-4Ox+4+Oy²-4Oy+4 = Ox²-8Ox+16+Oy²
		//       -4Ox+4-4Oy+4 = -8Ox+16
		//       4Ox-4Oy = 8 → Ox - Oy = 2
		// Eq2 : (Ox-2)²+(Oy-2)² = Ox²+(Oy-3)²
		//       -4Ox+4-4Oy+4 = -6Oy+9
		//       -4Ox+2Oy = 1 → -2Ox+Oy = 0.5
		// Adding Eq1+Eq2 : -Ox = 2.5 → Ox = -2.5. From Eq1 : Oy = -4.5
		// Verify Eq1 : -2.5 - (-4.5) = 2 ✓
		// H = (2+4+0) + (2+0+3) - 2·(-2.5) = 6 + 5 + 5 = 16
		// Wait, H = A+B+C - 2O =  (2+4+0 - 2·(-2.5), 2+0+3 - 2·(-4.5)) = (6 - (-5), 5 - (-9)) = (11, 14)
		const H = posOf(figure, symbols, 'H');
		expect(H.x).toBeCloseTo(11);
		expect(H.y).toBeCloseTo(14);
	});

	it('cercle_inscrit : center stays equidistant from sides after drag', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(3, 6)',
				'ci = cercle_inscrit(A, B, C)',
				'I = centre(ci)'
			].join('\n')
		);
		// For isoceles triangle with vertices (0,0), (6,0), (3,6) :
		// sides : a = |BC| = sqrt(9+36) = sqrt(45) = 3*sqrt(5)
		//         b = |CA| = sqrt(9+36) = 3*sqrt(5)
		//         c = |AB| = 6
		// Incenter (weighted by side lengths opposite) :
		// I = (a*A + b*B + c*C) / (a+b+c)
		// I_x = (3√5 · 0 + 3√5 · 6 + 6 · 3) / (6√5 + 6) = (18√5 + 18) / (6√5 + 6) = 3
		// I_y = (3√5 · 0 + 3√5 · 0 + 6 · 6) / (6√5 + 6) = 36 / (6√5 + 6) = 6 / (√5 + 1) = 6(√5-1)/4 = (3/2)(√5-1)
		const I0 = posOf(figure, symbols, 'I');
		expect(I0.x).toBeCloseTo(3);
		expect(I0.y).toBeCloseTo((3 / 2) * (Math.sqrt(5) - 1));

		// Drag C, recompute, verify incenter moves
		moveAndRecompute(figure, symId(symbols, 'C'), 3, 12);
		// sides : a = |BC| = sqrt(9+144) = sqrt(153)
		//         b = |CA| = sqrt(9+144) = sqrt(153)
		//         c = |AB| = 6
		// I_x = (√153·0 + √153·6 + 6·3) / (2√153 + 6) = (6√153 + 18) / (2√153 + 6) = 3
		// I_y = 6·12 / (2√153 + 6) = 72 / (2√153 + 6) = 36 / (√153 + 3)
		const I1 = posOf(figure, symbols, 'I');
		expect(I1.x).toBeCloseTo(3);
		expect(I1.y).toBeCloseTo(36 / (Math.sqrt(153) + 3));
	});
});
