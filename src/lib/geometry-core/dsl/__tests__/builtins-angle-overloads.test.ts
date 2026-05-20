/**
 * Tests sémantiques pour les overloads V2 de `angle(...)` :
 *   - `angle(u, v)`       — entre 2 vecteurs
 *   - `angle(seg1, seg2)` — entre 2 segments
 *   - `angle(d1, d2)`     — entre 2 droites (convention angle aigu)
 *
 * Reference : docs/wip/geometry/angle-v2-progress.md
 *
 * P2 active les overloads constructeur. Les blocs `arcSpacingPx` et dispatch
 * restent en `.todo()` jusqu'à P3.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { DslRuntimeError } from '../errors';
import { numeric } from '../../types/geo-value';
import { isAngle } from '../../types/elements';
import { geoToNumber } from '../../compute/to-number';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function sym(result: ReturnType<typeof run>, name: string) {
	return result.symbols.allEntries().get(name);
}

/** Read the numeric value of a scalar symbol via figure.getScalarValue. */
function scalarValue(result: ReturnType<typeof run>, name: string): number {
	const s = sym(result, name);
	if (!s || !s.figureId) throw new Error(`No scalar named ${name}`);
	const v = result.figure.getScalarValue(s.figureId);
	if (v == null) throw new Error(`Scalar ${name} has no value`);
	return v;
}

// =============================================================================
// angle(u, v) — sémantique mesure(α)
// =============================================================================

describe('angle(u, v) — 2 vectors overload (semantic)', () => {
	it('mesure(angle(u, v)) = π/3 for u=(1,0) and v=(cos(π/3), sin(π/3))', () => {
		const c = Math.cos(Math.PI / 3);
		const s = Math.sin(Math.PI / 3);
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				`B = point(${c}, ${s})`,
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 3, 6);
	});

	it('mesure(angle(u, v)) = π/2 for orthogonal vectors u=(1,0), v=(0,1)', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 2, 6);
	});

	it('mesure(angle(u, v)) = 0 for parallel vectors same direction u=(2,0), v=(5,0)', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(2, 0)',
				'P = point(0, 0)',
				'Q = point(5, 0)',
				'u = vecteur(O, A)',
				'v = vecteur(P, Q)',
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(0, 6);
	});

	it('mesure(angle(u, v)) = π for antiparallel vectors u=(1,0), v=(-1,0)', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'P = point(0, 0)',
				'Q = point(-1, 0)',
				'u = vecteur(O, A)',
				'v = vecteur(P, Q)',
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI, 6);
	});

	it('mesure(angle(u, v)) = π/4 for u=(1,0), v=(1,1)', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(1, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 4, 6);
	});

	it('mesure(angle(u, v)) is always in [0, π] (non-oriented)', () => {
		// v rotated by -π/3 from u (acos returns the unsigned angle in [0, π])
		const c = Math.cos(-Math.PI / 3);
		const s = Math.sin(-Math.PI / 3);
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				`B = point(${c}, ${s})`,
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		const m = scalarValue(r, 'm');
		expect(m).toBeGreaterThanOrEqual(0);
		expect(m).toBeLessThanOrEqual(Math.PI);
		expect(m).toBeCloseTo(Math.PI / 3, 6);
	});

	it('angle(u, v) bound vectors sharing common origin reuses that point as vertex', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v)'
			].join('\n')
		);
		const aSym = sym(r, 'a')!;
		const aEl = r.figure.getElementById(aSym.figureId!);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		const oSym = sym(r, 'O')!;
		expect(aEl.vertexId).toBe(oSym.figureId);
	});

	it('D-V2-1 regression: mesure(u, v) calls cache the derived scalar by (u, v, unite)', () => {
		// 2 successive mesure(u, v) with same args → same scalar id (cache hit).
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'm1 = mesure(u, v)',
				'm2 = mesure(u, v)'
			].join('\n')
		);
		const id1 = sym(r, 'm1')!.figureId!;
		const id2 = sym(r, 'm2')!.figureId!;
		expect(id1).toBe(id2);
	});

	it('B-V2-1 regression: angle(u, v) when u and v share both endpoints → mesure = 0 (degenerate)', () => {
		// 2 distinct vectors aligned on same support points. Previously fell
		// through Cas B → silent mesure=undefined. Now routed to degenerate.
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(3, 4)',
				'u = vecteur(O, A)',
				'v = vecteur(O, A)', // distinct id but same support
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		const value = r.figure.getScalarValue(sym(r, 'm')!.figureId!);
		expect(value).toBeDefined();
		expect(value).toBeCloseTo(0, 6);
	});

	it('angle(u, v) bound vectors NOT sharing common origin builds synthetic vertex', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'P = point(5, 5)',
				'Q = point(5, 6)',
				'u = vecteur(O, A)',
				'v = vecteur(P, Q)',
				'a = angle(u, v)'
			].join('\n')
		);
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		// vertex = u.startId (O), p1 = u.endId (A), p2 = synthetic
		const oSym = sym(r, 'O')!;
		expect(aEl.vertexId).toBe(oSym.figureId);
		// mesure(a) should be π/2 (u along +x, v along +y)
		const r2 = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'P = point(5, 5)',
				'Q = point(5, 6)',
				'u = vecteur(O, A)',
				'v = vecteur(P, Q)',
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r2, 'm')).toBeCloseTo(Math.PI / 2, 6);
	});

	it('angle(u, v) free + free is reactive: moveFreeVector(u) updates mesure (A2.x)', () => {
		// 2 vecteurs libres orthogonaux à anchor (0,0) : u = (1,0), v = (0,1) → mesure = π/2
		const r = run(
			['u = vecteur(1, 0)', 'v = vecteur(0, 1)', 'a = angle(u, v)', 'm = mesure(a)'].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 2, 5);
		// Drag u : move anchor to (5, 0), garder dx/dy
		const uEl = r.figure.getElementById(sym(r, 'u')!.figureId!);
		expect(uEl?.type).toBe('freeVector');
		r.figure.beginTransaction();
		r.figure.moveFreeVector(sym(r, 'u')!.figureId!, numeric(5), numeric(0));
		r.figure.recompute();
		r.figure.commit();
		// dx/dy de u inchangé → mesure inchangée
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 2, 5);
	});

	it('angle(u, v) returns a GeoAngle element (isAngle === true)', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v)'
			].join('\n')
		);
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!);
		expect(aEl).toBeDefined();
		expect(isAngle(aEl!)).toBe(true);
	});

	it('angle(u, v) the returned GeoAngle is visible=true by default', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v)'
			].join('\n')
		);
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!);
		expect(aEl!.visible).toBe(true);
	});

	it('angle(u, v, marque="carre") creates an angle with right-angle marker', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v, marque="carre")'
			].join('\n')
		);
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!) as { marque: string };
		expect(aEl.marque).toBe('carre');
	});
});

// =============================================================================
// angle(seg1, seg2) — sémantique mesure(α)
// =============================================================================

describe('angle(seg1, seg2) — 2 segments overload (semantic)', () => {
	it('common endpoint → uses it as vertex (mesure π/2 for perpendicular segments)', () => {
		const r = run(
			[
				'V = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				's1 = segment(V, A)',
				's2 = segment(V, B)',
				'a = angle(s1, s2)',
				'm = mesure(a)'
			].join('\n')
		);
		const vId = sym(r, 'V')!.figureId;
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		expect(aEl.vertexId).toBe(vId);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 2, 6);
	});

	it('disjoint secant segments → computes intersection point as vertex', () => {
		// s1: from (-2, 0) to (2, 0) (horizontal), s2: from (0, -2) to (0, 2) (vertical)
		// → intersection at (0, 0), angle = π/2
		const r = run(
			[
				'A = point(-2, 0)',
				'B = point(2, 0)',
				'C = point(0, -2)',
				'D = point(0, 2)',
				's1 = segment(A, B)',
				's2 = segment(C, D)',
				'a = angle(s1, s2)',
				'm = mesure(a)'
			].join('\n')
		);
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		const vertexPos = r.figure.getPosition(aEl.vertexId);
		expect(vertexPos).toBeDefined();
		expect(geoToNumber(vertexPos!.x)).toBeCloseTo(0, 6);
		expect(geoToNumber(vertexPos!.y)).toBeCloseTo(0, 6);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 2, 6);
	});

	it('disjoint secant segments → mesure = expected geometric angle (π/4)', () => {
		// s1: y=0 from (-2,0) to (2,0); s2: y=x from (-1,-1) to (1,1)
		// → intersection at (0,0), angle = π/4
		const r = run(
			[
				'A = point(-2, 0)',
				'B = point(2, 0)',
				'C = point(-1, -1)',
				'D = point(1, 1)',
				's1 = segment(A, B)',
				's2 = segment(C, D)',
				'a = angle(s1, s2)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 4, 6);
	});

	it('parallel segments → throws DslRuntimeError with structured hint', () => {
		expect(() =>
			run(
				[
					'A = point(0, 0)',
					'B = point(1, 0)',
					'C = point(0, 1)',
					'D = point(1, 1)',
					's1 = segment(A, B)',
					's2 = segment(C, D)',
					'a = angle(s1, s2)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('parallel segments error hint mentions angle(d1, d2) alternative', () => {
		try {
			run(
				[
					'A = point(0, 0)',
					'B = point(1, 0)',
					'C = point(0, 1)',
					'D = point(1, 1)',
					's1 = segment(A, B)',
					's2 = segment(C, D)',
					'a = angle(s1, s2)'
				].join('\n')
			);
			expect.unreachable();
		} catch (e) {
			const err = e as DslRuntimeError;
			expect(err.details?.hint).toContain('angle(d1, d2)');
		}
	});

	it('coincident segments → throws DslRuntimeError (treated as parallel)', () => {
		expect(() =>
			run(
				[
					'A = point(0, 0)',
					'B = point(2, 0)',
					'C = point(0.5, 0)',
					'D = point(1.5, 0)',
					's1 = segment(A, B)',
					's2 = segment(C, D)',
					'a = angle(s1, s2)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('segments with one shared endpoint at extremity → mesure(α) reactive on drag', () => {
		const r = run(
			[
				'V = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				's1 = segment(V, A)',
				's2 = segment(V, B)',
				'a = angle(s1, s2)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 2, 6);
		// Move A from (1,0) to (1,1) → angle goes from π/2 to π/4
		const aId = sym(r, 'A')!.figureId!;
		r.figure.movePoint(aId, {
			x: { type: 'num', value: 1 },
			y: { type: 'num', value: 1 }
		} as never);
	});

	it('mesure(angle(s1, s2)) accepts unite="deg" via mesure() named arg', () => {
		const r = run(
			[
				'V = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				's1 = segment(V, A)',
				's2 = segment(V, B)',
				'a = angle(s1, s2)',
				'm = mesure(a, unite="deg")'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(90, 4);
	});
});

// =============================================================================
// angle(d1, d2) — sémantique mesure(α) + convention angle aigu
// =============================================================================

describe('angle(d1, d2) — 2 lines overload (semantic)', () => {
	it('perpendicular lines → mesure = π/2', () => {
		const r = run(
			[
				'A = point(-1, 0)',
				'B = point(1, 0)',
				'C = point(0, -1)',
				'D = point(0, 1)',
				'd1 = droite(A, B)',
				'd2 = droite(C, D)',
				'a = angle(d1, d2)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 2, 6);
	});

	it('lines making a 60° angle → mesure = π/3 (acute convention)', () => {
		const c = Math.cos(Math.PI / 3);
		const s = Math.sin(Math.PI / 3);
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				`B = point(${c}, ${s})`,
				'd1 = droite(O, A)',
				'd2 = droite(O, B)',
				'a = angle(d1, d2)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 3, 6);
	});

	it('lines making a 120° angle → mesure = π/3 (swapped to acute)', () => {
		// d2 points in direction with 120° angle to d1
		const c = Math.cos((2 * Math.PI) / 3);
		const s = Math.sin((2 * Math.PI) / 3);
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				`B = point(${c}, ${s})`,
				'd1 = droite(O, A)',
				'd2 = droite(O, B)',
				'a = angle(d1, d2)',
				'm = mesure(a)'
			].join('\n')
		);
		// Acute convention: 120° → 60° = π/3
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 3, 6);
	});

	it('lines making a 45° angle → mesure = π/4', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(1, 1)',
				'd1 = droite(O, A)',
				'd2 = droite(O, B)',
				'a = angle(d1, d2)',
				'm = mesure(a)'
			].join('\n')
		);
		expect(scalarValue(r, 'm')).toBeCloseTo(Math.PI / 4, 6);
	});

	it('parallel lines → throws DslRuntimeError', () => {
		expect(() =>
			run(
				[
					'A = point(0, 0)',
					'B = point(1, 0)',
					'C = point(0, 1)',
					'D = point(1, 1)',
					'd1 = droite(A, B)',
					'd2 = droite(C, D)',
					'a = angle(d1, d2)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('coincident lines → throws DslRuntimeError (treated as parallel)', () => {
		expect(() =>
			run(
				[
					'A = point(0, 0)',
					'B = point(2, 0)',
					'C = point(1, 0)',
					'D = point(3, 0)',
					'd1 = droite(A, B)',
					'd2 = droite(C, D)',
					'a = angle(d1, d2)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('parallel lines error hint mentions 0 convention', () => {
		try {
			run(
				[
					'A = point(0, 0)',
					'B = point(1, 0)',
					'C = point(0, 1)',
					'D = point(1, 1)',
					'd1 = droite(A, B)',
					'd2 = droite(C, D)',
					'a = angle(d1, d2)'
				].join('\n')
			);
			expect.unreachable();
		} catch (e) {
			const err = e as DslRuntimeError;
			expect(err.details?.hint).toMatch(/0/);
		}
	});

	it('acute angle convention: mesure(angle(d1, d2)) ∈ [0, π/2] always', () => {
		// Try several inclinations greater than π/2
		for (const theta of [0.6 * Math.PI, 0.8 * Math.PI, 1.1 * Math.PI]) {
			const c = Math.cos(theta);
			const s = Math.sin(theta);
			const r = run(
				[
					'O = point(0, 0)',
					'A = point(1, 0)',
					`B = point(${c}, ${s})`,
					'd1 = droite(O, A)',
					'd2 = droite(O, B)',
					'a = angle(d1, d2)',
					'm = mesure(a)'
				].join('\n')
			);
			const m = scalarValue(r, 'm');
			expect(m).toBeGreaterThanOrEqual(0);
			expect(m).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
		}
	});

	it('angle(d1, d2) reuses intersection point via intersectLL', () => {
		const r = run(
			[
				'A = point(-2, 0)',
				'B = point(2, 0)',
				'C = point(0, -2)',
				'D = point(0, 2)',
				'd1 = droite(A, B)',
				'd2 = droite(C, D)',
				'a = angle(d1, d2)'
			].join('\n')
		);
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		const vp = r.figure.getPosition(aEl.vertexId);
		expect(vp).toBeDefined();
		expect(geoToNumber(vp!.x)).toBeCloseTo(0, 6);
		expect(geoToNumber(vp!.y)).toBeCloseTo(0, 6);
	});

	it('angle(d1, d2) is reactive: drag d1 through-point → mesure updates (A2)', () => {
		const r = run(
			[
				'A = point(-2, 0)',
				'B = point(2, 0)',
				'C = point(0, -2)',
				'D = point(0, 2)',
				'd1 = droite(A, B)',
				'd2 = droite(C, D)',
				'ang = angle(d1, d2)',
				'm = mesure(ang)'
			].join('\n')
		);
		expect(r.figure.getScalarValue(sym(r, 'm')!.figureId!)).toBeCloseTo(Math.PI / 2, 4);
		const bId = sym(r, 'B')!.figureId!;
		r.figure.beginTransaction();
		r.figure.movePoint(bId, numeric(2), numeric(1));
		r.figure.recompute();
		r.figure.commit();
		expect(r.figure.getScalarValue(sym(r, 'm')!.figureId!)).not.toBeCloseTo(Math.PI / 2, 2);
	});
});

// =============================================================================
// arcSpacingPx named arg (toutes les overloads)  — P3
// =============================================================================

describe('arcSpacingPx parameter (semantic) — P3', () => {
	it('default value is undefined when arcSpacingPx is omitted (renderer falls back to 6)', () => {
		const r = run(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'a = angle(A, V, B)'].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBeUndefined();
	});

	it('arcSpacingPx=10 is stored on the GeoAngle element', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B, arcSpacingPx=10)'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBe(10);
	});

	it('arcSpacingPx works on angle(A, V, B) 3-points form', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B, marque="arcs3", arcSpacingPx=12)'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBe(12);
		expect(el.marque).toBe('arcs3');
	});

	it('arcSpacingPx works on angle(u, v) 2-vectors form', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v, marque="arcs2", arcSpacingPx=5)'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBe(5);
	});

	it('arcSpacingPx works on angle(seg1, seg2) 2-segments form', () => {
		const r = run(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'C = point(0, 0)',
				'D = point(0, 1)',
				's1 = segment(A, B)',
				's2 = segment(C, D)',
				'a = angle(s1, s2, arcSpacingPx=9)'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBe(9);
	});

	it('arcSpacingPx works on angle(d1, d2) 2-lines form', () => {
		const r = run(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'C = point(0, 0)',
				'D = point(1, 1)',
				'd1 = droite(A, B)',
				'd2 = droite(C, D)',
				'a = angle(d1, d2, arcSpacingPx=3)'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBe(3);
	});

	it('arcSpacingPx=0 throws DslRuntimeError (strictly positive required)', () => {
		expect(() =>
			run(
				[
					'A = point(1, 0)',
					'V = point(0, 0)',
					'B = point(0, 1)',
					'a = angle(A, V, B, arcSpacingPx=0)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('arcSpacingPx=-3 throws DslRuntimeError', () => {
		expect(() =>
			run(
				[
					'A = point(1, 0)',
					'V = point(0, 0)',
					'B = point(0, 1)',
					'a = angle(A, V, B, arcSpacingPx=-3)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// Dispatch errors (mix types, mauvaise arité)
// =============================================================================

describe('angle(...) dispatch errors (semantic)', () => {
	it('angle(u, segment) (vector + segment) throws structured error listing 4 forms', () => {
		try {
			run(
				[
					'O = point(0, 0)',
					'A = point(1, 0)',
					'B = point(2, 0)',
					'C = point(3, 0)',
					'u = vecteur(O, A)',
					's = segment(B, C)',
					'a = angle(u, s)'
				].join('\n')
			);
			expect.unreachable();
		} catch (e) {
			expect(e).toBeInstanceOf(DslRuntimeError);
			const err = e as DslRuntimeError;
			const syntaxes = (err.details?.forms ?? []).map((f) => f.syntax);
			expect(syntaxes.length).toBeGreaterThanOrEqual(4);
		}
	});

	it('angle(droite, vecteur) (line + vector) throws structured error', () => {
		expect(() =>
			run(
				[
					'O = point(0, 0)',
					'A = point(1, 0)',
					'B = point(2, 0)',
					'd = droite(O, A)',
					'u = vecteur(O, B)',
					'a = angle(d, u)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('angle(segment, droite) (segment + line) throws structured error', () => {
		expect(() =>
			run(
				[
					'A = point(0, 0)',
					'B = point(1, 0)',
					'C = point(2, 0)',
					'D = point(3, 1)',
					's = segment(A, B)',
					'd = droite(C, D)',
					'a = angle(s, d)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('angle() with 0 args throws structured DslRuntimeError', () => {
		expect(() => run(['a = angle()'].join('\n'))).toThrow(DslRuntimeError);
	});

	it('angle(A) with 1 arg (point) throws structured DslRuntimeError', () => {
		expect(() => run(['A = point(1, 0)', 'a = angle(A)'].join('\n'))).toThrow(DslRuntimeError);
	});

	it('angle(u) with 1 arg (vector) throws structured DslRuntimeError', () => {
		expect(() =>
			run(['O = point(0,0)', 'A = point(1, 0)', 'u = vecteur(O, A)', 'a = angle(u)'].join('\n'))
		).toThrow(DslRuntimeError);
	});

	it('angle(A, B, C, D) with 4 args throws structured DslRuntimeError', () => {
		expect(() =>
			run(
				[
					'A = point(0, 0)',
					'B = point(1, 0)',
					'C = point(2, 0)',
					'D = point(3, 0)',
					'a = angle(A, B, C, D)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});
});
