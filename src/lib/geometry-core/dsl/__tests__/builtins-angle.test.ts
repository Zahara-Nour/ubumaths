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

	it('2 successive calls to mesure(ang) return the same scalar (cache via measureScalarId)', () => {
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
