/**
 * Tests for DSL builtins around the new `GeoAngle` first-class object (V1).
 *
 * Reference: docs/wip/geometry/angle-v1-progress.md
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { BUILTIN_NAMES } from '../builtins';
import { DslRuntimeError } from '../errors';
import { isAngle } from '../../types/elements';
import { geoToNumber } from '../../compute/to-number';
import { numeric } from '../../types/geo-value';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function sym(result: ReturnType<typeof run>, name: string) {
	return result.symbols.allEntries().get(name);
}

describe('angle(A, V, B) — first-class object', () => {
	it('angle(A, V, B) returns a GeoAngle element visible by default', () => {
		const r = run(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'ang = angle(A, V, B)'].join('\n')
		);
		const s = sym(r, 'ang');
		expect(s).toBeDefined();
		expect(s!.type).toBe('angle');
		const el = r.figure.getElementById(s!.figureId!);
		expect(el).toBeDefined();
		expect(el!.type).toBe('angle');
		expect(el!.visible).toBe(true);
	});

	it('returned BuiltinResult has symbolType="angle" and figureId pointing to GeoAngle', () => {
		const r = run(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'ang = angle(A, V, B)'].join('\n')
		);
		const s = sym(r, 'ang');
		expect(s!.type).toBe('angle');
		expect(s!.figureId).toBeDefined();
		expect(isAngle(r.figure.getElementById(s!.figureId!)!)).toBe(true);
	});

	it('angle(A, V, B, marque="carre") creates a right-angle marker (replaces angle_droit)', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B, marque="carre")'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'ang')!.figureId!) as { marque: string };
		expect(el.marque).toBe('carre');
	});

	it('angle(A, V, B, marque="arcs2") creates a double-arc marker (replaces marque_angle arcs=2)', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B, marque="arcs2")'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'ang')!.figureId!) as { marque: string };
		expect(el.marque).toBe('arcs2');
	});

	it('angle(A, V, B, kind="rentrant") flags the angle as exterior (>π)', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B, kind="rentrant")'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'ang')!.figureId!) as { kind: string };
		expect(el.kind).toBe('rentrant');
	});

	it('angle(A, V, B, showLabel="mesure", unite="deg") stores showLabel and unite', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B, showLabel="mesure", unite="deg")'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'ang')!.figureId!) as {
			showLabel: string;
			unite: string;
		};
		expect(el.showLabel).toBe('mesure');
		expect(el.unite).toBe('deg');
	});
});

describe('angle(O, P) 2-args — removed', () => {
	it('angle(O, P) with 2 args throws DslRuntimeError with structured hint', () => {
		expect(() => run(['O = point(0, 0)', 'P = point(1, 0)', 'a = angle(O, P)'].join('\n'))).toThrow(
			DslRuntimeError
		);
	});

	it('the error hint points to angle_polaire(O, P) as the replacement', () => {
		try {
			run(['O = point(0, 0)', 'P = point(1, 0)', 'a = angle(O, P)'].join('\n'));
			expect.unreachable();
		} catch (e) {
			expect(e).toBeInstanceOf(DslRuntimeError);
			const err = e as DslRuntimeError;
			expect(err.details?.hint).toContain('angle_polaire');
		}
	});

	it('the error forms list includes both angle(A,V,B) and angle_polaire(O,P)', () => {
		try {
			run(['O = point(0, 0)', 'P = point(1, 0)', 'a = angle(O, P)'].join('\n'));
			expect.unreachable();
		} catch (e) {
			const err = e as DslRuntimeError;
			const forms = err.details?.forms ?? [];
			const syntaxes = forms.map((f) => f.syntax);
			expect(syntaxes.some((s) => s.includes('angle(A'))).toBe(true);
			expect(syntaxes.some((s) => s.includes('angle_polaire'))).toBe(true);
		}
	});
});

describe('angle_polaire(O, P) — new builtin', () => {
	it('angle_polaire(O, P) returns a GeoScalar with scalarKind="polar_angle"', () => {
		const r = run(['O = point(0, 0)', 'P = point(1, 0)', 'theta = angle_polaire(O, P)'].join('\n'));
		const s = sym(r, 'theta');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		const el = r.figure.getElementById(s!.figureId!) as { scalarKind: string };
		expect(el.scalarKind).toBe('polar_angle');
	});

	it('angle_polaire(O, P) value equals atan2(P.y - O.y, P.x - O.x) in degrees → 90° for (0,1)', () => {
		const r = run(['O = point(0, 0)', 'A = point(0, 1)', 'theta = angle_polaire(O, A)'].join('\n'));
		// atan2(1, 0) = π/2 rad → 90°
		expect(r.figure.getScalarValue(sym(r, 'theta')!.figureId!)).toBeCloseTo(90, 3);
	});

	it('angle_polaire(O, P) is registered in BUILTIN_NAMES', () => {
		expect(BUILTIN_NAMES.has('angle_polaire')).toBe(true);
	});

	it('angle_polaire(O, P) is reactive: drag P → scalar updates', () => {
		const r = run(['O = point(0, 0)', 'A = point(1, 0)', 'theta = angle_polaire(O, A)'].join('\n'));
		// Initial: 0°
		expect(r.figure.getScalarValue(sym(r, 'theta')!.figureId!)).toBeCloseTo(0, 3);

		const aId = sym(r, 'A')!.figureId!;
		r.figure.beginTransaction();
		r.figure.movePoint(aId, numeric(0), numeric(1)); // → 90°
		r.figure.recompute();
		r.figure.commit();

		expect(r.figure.getScalarValue(sym(r, 'theta')!.figureId!)).toBeCloseTo(90, 3);
	});
});

describe('mesure(ang) — accessor on GeoAngle', () => {
	it('mesure(ang) returns a GeoScalar in radians by default', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'm = mesure(ang)'
			].join('\n')
		);
		const s = sym(r, 'm');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		// 90° = π/2 rad
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(Math.PI / 2, 5);
	});

	it('mesure(ang, unite="deg") returns the measure in degrees', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'm = mesure(ang, unite="deg")'
			].join('\n')
		);
		expect(r.figure.getScalarValue(sym(r, 'm')!.figureId!)).toBeCloseTo(90, 3);
	});

	it('mesure(ang, unite="rad") returns the measure in radians explicitly', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'm = mesure(ang, unite="rad")'
			].join('\n')
		);
		expect(r.figure.getScalarValue(sym(r, 'm')!.figureId!)).toBeCloseTo(Math.PI / 2, 5);
	});

	it('2 successive calls to mesure(ang) return the same scalar (cache via measureScalarIds.rad)', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'm1 = mesure(ang)',
				'm2 = mesure(ang)'
			].join('\n')
		);
		const id1 = sym(r, 'm1')!.figureId!;
		const id2 = sym(r, 'm2')!.figureId!;
		expect(id1).toBe(id2); // same scalar reused
	});

	it('REGRESSION B1: alternating rad/deg calls do not thrash the cache', () => {
		// Bug: in v0.9.0 the single-slot measureScalarId was overwritten on
		// each unit switch, leaking the prior unit scalar. The Map-per-unit
		// fix in v0.9.1 should preserve both slots.
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'mr1 = mesure(ang)', // rad
				'md1 = mesure(ang, unite="deg")', // deg
				'mr2 = mesure(ang)', // rad — should reuse mr1, NOT create new
				'md2 = mesure(ang, unite="deg")' // deg — should reuse md1
			].join('\n')
		);
		const radId1 = sym(r, 'mr1')!.figureId!;
		const radId2 = sym(r, 'mr2')!.figureId!;
		const degId1 = sym(r, 'md1')!.figureId!;
		const degId2 = sym(r, 'md2')!.figureId!;
		expect(radId1).toBe(radId2); // rad slot stable across deg interleave
		expect(degId1).toBe(degId2); // deg slot stable across rad interleave
		expect(radId1).not.toBe(degId1); // distinct scalars per unit
	});
});

describe('mesure(A, V, B) — 3-points overload', () => {
	it('mesure(A, V, B) returns a GeoScalar equivalent to mesure(angle(A, V, B))', () => {
		const r = run(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'm = mesure(A, V, B)'].join('\n')
		);
		const s = sym(r, 'm');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		// 90° in radians
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(Math.PI / 2, 5);
	});

	it('the internal GeoAngle created by mesure(A, V, B) is visible=false', () => {
		const r = run(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'm = mesure(A, V, B)'].join('\n')
		);
		// The hidden GeoAngle exists in the figure
		const angles = r.figure.getAllElements().filter((e) => e.type === 'angle');
		expect(angles.length).toBeGreaterThanOrEqual(1);
		// At least one is invisible (the internal one)
		expect(angles.some((e) => !e.visible)).toBe(true);
	});

	it('mesure(A, V, B, unite="deg") returns degrees', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'm = mesure(A, V, B, unite="deg")'
			].join('\n')
		);
		expect(r.figure.getScalarValue(sym(r, 'm')!.figureId!)).toBeCloseTo(90, 3);
	});
});

describe('mesure(u, v) — 2-vectors overload', () => {
	it('mesure(u, v) returns a GeoScalar in [0, π] — 90° angle in radians', () => {
		const r = run(['u = vecteur(1, 0)', 'v = vecteur(0, 1)', 'm = mesure(u, v)'].join('\n'));
		const s = sym(r, 'm');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		// 90° in radians
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(Math.PI / 2, 5);
	});

	it('mesure(u, v) replaces the removed angle_vecteurs(u, v)', () => {
		// angle_vecteurs was removed; mesure(u,v) is the replacement
		const r = run(['u = vecteur(1, 0)', 'v = vecteur(0, 1)', 'm = mesure(u, v)'].join('\n'));
		expect(r.figure.getScalarValue(sym(r, 'm')!.figureId!)).toBeCloseTo(Math.PI / 2, 5);
	});

	it('mesure(u, v, unite="deg") returns degrees', () => {
		const r = run(
			['u = vecteur(1, 0)', 'v = vecteur(0, 1)', 'm = mesure(u, v, unite="deg")'].join('\n')
		);
		expect(r.figure.getScalarValue(sym(r, 'm')!.figureId!)).toBeCloseTo(90, 3);
	});
});

describe('mesure() — rejection of non-angle types', () => {
	it('mesure(u) with 1 vector throws DslRuntimeError with hint about norme(u)', () => {
		try {
			run(['u = vecteur(1, 0)', 'm = mesure(u)'].join('\n'));
			expect.unreachable();
		} catch (e) {
			expect(e).toBeInstanceOf(DslRuntimeError);
			const err = e as DslRuntimeError;
			expect(err.details?.hint).toMatch(/norme/i);
		}
	});

	it('mesure(s) with a segment throws DslRuntimeError with hint about longueur(s)', () => {
		try {
			run(['A = point(0, 0)', 'B = point(1, 0)', 's = segment(A, B)', 'm = mesure(s)'].join('\n'));
			expect.unreachable();
		} catch (e) {
			expect(e).toBeInstanceOf(DslRuntimeError);
			const err = e as DslRuntimeError;
			expect(err.details?.hint).toMatch(/longueur/i);
		}
	});

	it('mesure(c) with a circle throws DslRuntimeError (unsupported)', () => {
		expect(() =>
			run(['O = point(0, 0)', 'c = cercle(O, rayon=3)', 'm = mesure(c)'].join('\n'))
		).toThrow(DslRuntimeError);
	});
});

describe('sommet(ang) and cote(ang, i) — accessors', () => {
	it('sommet(ang) returns the vertex point id', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'S = sommet(ang)'
			].join('\n')
		);
		const sId = sym(r, 'S')!.figureId!;
		const vId = sym(r, 'V')!.figureId!;
		expect(sId).toBe(vId);
	});

	it('cote(ang, 1) returns the p1 point id', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'C1 = cote(ang, 1)'
			].join('\n')
		);
		expect(sym(r, 'C1')!.figureId).toBe(sym(r, 'A')!.figureId);
	});

	it('cote(ang, 2) returns the p2 point id', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'C2 = cote(ang, 2)'
			].join('\n')
		);
		expect(sym(r, 'C2')!.figureId).toBe(sym(r, 'B')!.figureId);
	});

	it('cote(ang, 3) throws DslRuntimeError (index out of range)', () => {
		expect(() =>
			run(
				[
					'A = point(1, 0)',
					'V = point(0, 0)',
					'B = point(0, 1)',
					'ang = angle(A, V, B)',
					'C = cote(ang, 3)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('cote(ang, 0) throws DslRuntimeError (1-based index)', () => {
		expect(() =>
			run(
				[
					'A = point(1, 0)',
					'V = point(0, 0)',
					'B = point(0, 1)',
					'ang = angle(A, V, B)',
					'C = cote(ang, 0)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('sommet(ang) and cote(ang, i) are pure accessors: no new element created', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'S = sommet(ang)',
				'C1 = cote(ang, 1)',
				'C2 = cote(ang, 2)'
			].join('\n')
		);
		// 3 free points + 1 angle = 4 elements, no new elements created by sommet/cote
		const elements = r.figure.getAllElements();
		const angles = elements.filter((e) => e.type === 'angle');
		const freePoints = elements.filter((e) => e.type === 'freePoint');
		expect(freePoints).toHaveLength(3);
		expect(angles).toHaveLength(1);
	});
});

describe('bissectrice(ang) — overload', () => {
	it('bissectrice(ang) returns a line equivalent to bissectrice(A, V, B)', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'b = bissectrice(ang)'
			].join('\n')
		);
		const s = sym(r, 'b');
		expect(s).toBeDefined();
		expect(s!.type).toBe('droite');
	});

	it('existing bissectrice(A, V, B) 3-points form is preserved', () => {
		const r = run(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'b = bissectrice(A, V, B)'].join(
				'\n'
			)
		);
		expect(sym(r, 'b')!.type).toBe('droite');
	});

	it('bissectrice(ang) result is a line element on the figure', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'b = bissectrice(ang)'
			].join('\n')
		);
		const bId = sym(r, 'b')!.figureId!;
		const el = r.figure.getElementById(bId);
		expect(el).toBeDefined();
		expect(el!.type).toBe('line');
	});
});

describe('rotation(P, ang, centre=O) — overload', () => {
	it('rotation(P, ang, centre=O) accepts a GeoAngle as the angle parameter', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B)',
				'P = point(2, 0)',
				'O = point(0, 0)',
				'R = rotation(P, centre=O, angle=ang)'
			].join('\n')
		);
		expect(sym(r, 'R')).toBeDefined();
		// ang = 90°, P = (2,0), O = (0,0) → R = (0,2)
		const pos = r.figure.getPosition(sym(r, 'R')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(2, 3);
	});

	it('existing rotation(P, scalaire, centre=O) form is preserved', () => {
		const r = run(
			['A = point(1, 0)', 'O = point(0, 0)', 'B = rotation(A, centre=O, angle=90)'].join('\n')
		);
		const pos = r.figure.getPosition(sym(r, 'B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1, 3);
	});
});

describe('Removed builtins', () => {
	it('marque_angle(...) throws because builtin is unknown', () => {
		expect(() =>
			run(
				['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'marque_angle(A, V, B)'].join(
					'\n'
				)
			)
		).toThrow();
	});

	it('angle_droit(...) throws because builtin is unknown', () => {
		expect(() =>
			run(
				['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'angle_droit(A, V, B)'].join('\n')
			)
		).toThrow();
	});

	it('angle_vecteurs(...) throws because builtin is unknown', () => {
		expect(() =>
			run(['u = vecteur(1, 0)', 'v = vecteur(0, 1)', 'a = angle_vecteurs(u, v)'].join('\n'))
		).toThrow();
	});

	it('BUILTIN_NAMES does not contain "marque_angle", "angle_droit", "angle_vecteurs"', () => {
		expect(BUILTIN_NAMES.has('marque_angle')).toBe(false);
		expect(BUILTIN_NAMES.has('angle_droit')).toBe(false);
		expect(BUILTIN_NAMES.has('angle_vecteurs')).toBe(false);
	});

	it('BUILTIN_NAMES contains "angle_polaire"', () => {
		expect(BUILTIN_NAMES.has('angle_polaire')).toBe(true);
	});

	it('BUILTIN_NAMES still contains "angle", "mesure", "sommet", "cote", "bissectrice", "rotation"', () => {
		expect(BUILTIN_NAMES.has('angle')).toBe(true);
		expect(BUILTIN_NAMES.has('mesure')).toBe(true);
		expect(BUILTIN_NAMES.has('sommet')).toBe(true);
		expect(BUILTIN_NAMES.has('cote')).toBe(true);
		expect(BUILTIN_NAMES.has('bissectrice')).toBe(true);
		expect(BUILTIN_NAMES.has('rotation')).toBe(true);
	});
});

describe('Cas dégénérés DSL', () => {
	it('angle(A, V, A) where p1 == p2 throws (duplicate parent IDs not allowed)', () => {
		// The dependency graph enforces unique parents; p1 == p2 causes an error
		expect(() =>
			run(
				[
					'A = point(1, 0)',
					'V = point(0, 0)',
					'ang = angle(A, V, A)',
					'm = mesure(ang, unite="deg")'
				].join('\n')
			)
		).toThrow();
	});

	it('angle plat 180deg + bissectrice(ang) throws DslRuntimeError', () => {
		expect(() =>
			run(
				[
					'A = point(1, 0)',
					'V = point(0, 0)',
					'B = point(-1, 0)',
					'ang = angle(A, V, B)',
					'b = bissectrice(ang)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// V2 — Overloads angle(u, v) / angle(seg1, seg2) / angle(d1, d2)
// =============================================================================

describe('V2 — angle(u, v) — 2 vectors overload', () => {
	it('angle(u, v) with 2 bound vectors sharing a common point returns a GeoAngle', () => {
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
		expect(sym(r, 'a')!.type).toBe('angle');
	});

	it('angle(u, v) bound+bound shared vertex reuses the shared point as vertex', () => {
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
		const oId = sym(r, 'O')!.figureId!;
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		expect(aEl.vertexId).toBe(oId);
	});

	it('angle(u, v) bound+bound disjoint creates synthetic hidden points for p2', () => {
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
		// p2 should not be P nor Q (synthetic point at vertex + v)
		const pId = sym(r, 'P')!.figureId;
		const qId = sym(r, 'Q')!.figureId;
		expect(aEl.p2Id).not.toBe(pId);
		expect(aEl.p2Id).not.toBe(qId);
		const p2El = r.figure.getElementById(aEl.p2Id);
		expect(p2El!.visible).toBe(false);
	});

	it.todo('angle(u, v) bound+free creates synthetic hidden point at vertex + free.dx,dy');
	it.todo('angle(u, v) free+free creates 3 synthetic hidden points (vertex at origin)');

	it('angle(u, v) all synthetic points have visible=false and draggable=false', () => {
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
		// p2 is synthetic
		const p2El = r.figure.getElementById(aEl.p2Id) as { visible: boolean; draggable?: boolean };
		expect(p2El.visible).toBe(false);
		expect(p2El.draggable).toBe(false);
	});

	it.todo('angle(u, v) is reactive: drag of an anchored point updates mesure');
	// V2 limitation: synthetic points capture positions at construction time;
	// reactivity to drag of vector source points is V3.

	it('angle(u, v) accepts named arg marque="carre"', () => {
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

	it('angle(u, v) accepts named arg showLabel="mesure"', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v, showLabel="mesure")'
			].join('\n')
		);
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!) as { showLabel: string };
		expect(aEl.showLabel).toBe('mesure');
	});
});

describe('V2 — angle(seg1, seg2) — 2 segments overload', () => {
	it('angle(s1, s2) with shared endpoint uses that endpoint as vertex', () => {
		const r = run(
			[
				'V = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				's1 = segment(V, A)',
				's2 = segment(V, B)',
				'a = angle(s1, s2)'
			].join('\n')
		);
		const vId = sym(r, 'V')!.figureId;
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		expect(aEl.vertexId).toBe(vId);
	});

	it('angle(s1, s2) secant segments computes intersection as vertex', () => {
		const r = run(
			[
				'A = point(-2, 0)',
				'B = point(2, 0)',
				'C = point(0, -2)',
				'D = point(0, 2)',
				's1 = segment(A, B)',
				's2 = segment(C, D)',
				'a = angle(s1, s2)'
			].join('\n')
		);
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		const vp = r.figure.getPosition(aEl.vertexId);
		expect(geoToNumber(vp!.x)).toBeCloseTo(0, 6);
		expect(geoToNumber(vp!.y)).toBeCloseTo(0, 6);
	});

	it('angle(s1, s2) secant segments uses far endpoints as p1/p2', () => {
		// s1: (-2,0)→(3,0), s2: (0,-2)→(0,1). Intersection at (0,0).
		// Far from (0,0) on s1 → (3,0) (B). Far on s2 → (0,-2) (C).
		const r = run(
			[
				'A = point(-2, 0)',
				'B = point(3, 0)',
				'C = point(0, -2)',
				'D = point(0, 1)',
				's1 = segment(A, B)',
				's2 = segment(C, D)',
				'a = angle(s1, s2)'
			].join('\n')
		);
		const bId = sym(r, 'B')!.figureId;
		const cId = sym(r, 'C')!.figureId;
		const aEl = r.figure.getElementById(sym(r, 'a')!.figureId!);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		expect(aEl.p1Id).toBe(bId);
		expect(aEl.p2Id).toBe(cId);
	});

	it('angle(s1, s2) parallel segments throws DslRuntimeError', () => {
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

	it('angle(s1, s2) parallel error hint mentions angle(d1, d2) for parallel lines', () => {
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

	it('angle(s1, s2) parallel error forms list includes the 4 angle constructors', () => {
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
			const syntaxes = (err.details?.forms ?? []).map((f) => f.syntax);
			expect(syntaxes.some((s) => s.includes('angle(A'))).toBe(true);
			expect(syntaxes.some((s) => s.includes('angle(u'))).toBe(true);
			expect(syntaxes.some((s) => s.includes('angle(seg1'))).toBe(true);
			expect(syntaxes.some((s) => s.includes('angle(d1'))).toBe(true);
		}
	});

	it.todo('angle(s1, s2) is reactive: drag of a segment endpoint updates mesure');
});

describe('V2 — angle(d1, d2) — 2 lines overload', () => {
	it('angle(d1, d2) secant lines computes intersection via intersectLL as vertex', () => {
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
		expect(geoToNumber(vp!.x)).toBeCloseTo(0, 6);
		expect(geoToNumber(vp!.y)).toBeCloseTo(0, 6);
	});

	it('angle(d1, d2) returns the acute angle by convention (mesure in [0, π/2])', () => {
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
		const mScalar = sym(r, 'm')!;
		const m = r.figure.getScalarValue(mScalar.figureId!);
		expect(m).not.toBeNull();
		expect(m!).toBeGreaterThanOrEqual(0);
		expect(m!).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
		expect(m!).toBeCloseTo(Math.PI / 4, 6);
	});

	it('angle(d1, d2) swaps p2 when naive measure exceeds π/2 to enforce acute', () => {
		// d2 along direction 135° (which gives a 135° naive angle with d1=x-axis)
		const c = Math.cos((3 * Math.PI) / 4);
		const s = Math.sin((3 * Math.PI) / 4);
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
		const m = r.figure.getScalarValue(sym(r, 'm')!.figureId!);
		expect(m!).toBeCloseTo(Math.PI / 4, 6);
	});

	it('angle(d1, d2) parallel lines throws DslRuntimeError', () => {
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

	it('angle(d1, d2) coincident lines throws DslRuntimeError', () => {
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

	it('angle(d1, d2) parallel error hint mentions the convention (0 for parallel)', () => {
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

	it.todo('angle(d1, d2) is reactive: drag of a line through-point updates mesure');
});

describe('V2 — arcSpacingPx named arg', () => {
	it('angle(A, V, B) without arcSpacingPx uses default (field absent on element)', () => {
		const r = run(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'ang = angle(A, V, B)'].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'ang')!.figureId!);
		expect(el).toBeDefined();
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBeUndefined();
	});

	it('angle(A, V, B, arcSpacingPx=10) stores 10 on the GeoAngle', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'ang = angle(A, V, B, arcSpacingPx=10)'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'ang')!.figureId!);
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBe(10);
	});

	it('arcSpacingPx is accepted on angle(u, v) overload', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'ang = angle(u, v, arcSpacingPx=8)'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'ang')!.figureId!);
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBe(8);
	});

	it('arcSpacingPx is accepted on angle(seg1, seg2) overload', () => {
		const r = run(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'C = point(0, 0)',
				'D = point(0, 1)',
				's1 = segment(A, B)',
				's2 = segment(C, D)',
				'ang = angle(s1, s2, arcSpacingPx=4)'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'ang')!.figureId!);
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBe(4);
	});

	it('arcSpacingPx is accepted on angle(d1, d2) overload', () => {
		const r = run(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'C = point(0, 0)',
				'D = point(1, 1)',
				'd1 = droite(A, B)',
				'd2 = droite(C, D)',
				'ang = angle(d1, d2, arcSpacingPx=7)'
			].join('\n')
		);
		const el = r.figure.getElementById(sym(r, 'ang')!.figureId!);
		if (!el || !isAngle(el)) throw new Error('expected angle');
		expect(el.arcSpacingPx).toBe(7);
	});

	it('arcSpacingPx=0 throws DslRuntimeError (must be strictly positive)', () => {
		expect(() =>
			run(
				[
					'A = point(1, 0)',
					'V = point(0, 0)',
					'B = point(0, 1)',
					'ang = angle(A, V, B, arcSpacingPx=0)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('arcSpacingPx=-5 throws DslRuntimeError', () => {
		expect(() =>
			run(
				[
					'A = point(1, 0)',
					'V = point(0, 0)',
					'B = point(0, 1)',
					'ang = angle(A, V, B, arcSpacingPx=-5)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});
});

describe('V2 — Dispatch errors', () => {
	it('angle(u, segment) mix vector+segment throws structured error', () => {
		expect(() =>
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
			)
		).toThrow(DslRuntimeError);
	});

	it('angle(droite, vecteur) mix line+vector throws structured error', () => {
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

	it('dispatch error forms list includes all 4 valid syntaxes', () => {
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
			const err = e as DslRuntimeError;
			const syntaxes = (err.details?.forms ?? []).map((f) => f.syntax);
			expect(syntaxes.length).toBeGreaterThanOrEqual(4);
		}
	});

	it('angle() with 0 args throws structured error', () => {
		expect(() => run(['a = angle()'].join('\n'))).toThrow(DslRuntimeError);
	});

	it('angle(A) with 1 arg throws structured error', () => {
		expect(() => run(['A = point(1, 0)', 'a = angle(A)'].join('\n'))).toThrow(DslRuntimeError);
	});

	it('angle(A, B, C, D) with 4 args throws structured error', () => {
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

describe('V2 — Cas dégénérés overloads', () => {
	it('angle(u, u) (same vectors) returns mesure = 0', () => {
		const r = run(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'u = vecteur(O, A)',
				'a = angle(u, u)',
				'm = mesure(a)'
			].join('\n')
		);
		const m = r.figure.getScalarValue(sym(r, 'm')!.figureId!);
		expect(m!).toBeCloseTo(0, 6);
	});

	it('angle(u, -u) (antiparallel vectors) returns mesure = π', () => {
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
		const m = r.figure.getScalarValue(sym(r, 'm')!.figureId!);
		expect(m!).toBeCloseTo(Math.PI, 6);
	});

	it('angle with a zero vector throws DslRuntimeError', () => {
		expect(() =>
			run(
				[
					'O = point(0, 0)',
					'A = point(0, 0)', // u = OA is zero
					'B = point(1, 0)',
					'u = vecteur(O, A)',
					'v = vecteur(O, B)',
					'a = angle(u, v)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// V2 — Dette tech B2 : dédup mesure(A, V, B) par tuple
// =============================================================================

describe('V2 — B2 dédup mesure(A, V, B) by triplet', () => {
	it('2 successive mesure(A, V, B) calls on same triplet return same scalarId', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'm1 = mesure(A, V, B)',
				'm2 = mesure(A, V, B)'
			].join('\n')
		);
		const id1 = sym(r, 'm1')!.figureId!;
		const id2 = sym(r, 'm2')!.figureId!;
		expect(id1).toBe(id2);
	});

	it('mesure(A, V, B) and mesure(V, A, B) return different scalarIds (different triplets)', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'm1 = mesure(A, V, B)',
				'm2 = mesure(V, A, B)'
			].join('\n')
		);
		const id1 = sym(r, 'm1')!.figureId!;
		const id2 = sym(r, 'm2')!.figureId!;
		expect(id1).not.toBe(id2);
	});

	it('cache reuse: 3 successive mesure(A, V, B) calls share the same scalarId', () => {
		const r = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'm1 = mesure(A, V, B)',
				'm2 = mesure(A, V, B)',
				'm3 = mesure(A, V, B)'
			].join('\n')
		);
		const id1 = sym(r, 'm1')!.figureId!;
		const id2 = sym(r, 'm2')!.figureId!;
		const id3 = sym(r, 'm3')!.figureId!;
		expect(id1).toBe(id2);
		expect(id2).toBe(id3);
		// Both scalar resolve to a valid scalar element.
		const el = r.figure.getElementById(id1);
		expect(el).toBeDefined();
		expect(el!.type).toBe('scalar');
	});
});

// =============================================================================
// V2 — Dette tech B5 : serializer préserve α → mesure(α)
// =============================================================================

describe('V2 — B5 serializer preserves α → mesure(α)', () => {
	it.todo(
		'roundtrip: α=angle(A,V,B); m=mesure(α) → serialize → parse → emits mesure(α) (not mesure(A,V,B))'
	);
	it.todo('mesure(A, V, B) direct (no named angle) still serializes to mesure(A, V, B)');
});
