/**
 * Tests for DSL builtins around the new `GeoAngle` first-class object
 * (Phase 0 — TDD).
 *
 * These tests describe the EXPECTED behavior of:
 *   - `angle(A, V, B)` returning a `GeoAngle` (visible, marque='arc')
 *   - `angle(O, P)` 2 args → DslRuntimeError (hint: angle_polaire)
 *   - `angle_polaire(O, P)` new builtin
 *   - `mesure(α)` accessor + overloads `mesure(A,V,B)` / `mesure(u,v)`
 *   - `mesure(u)` / `mesure(s)` → DslRuntimeError
 *   - `sommet(α)`, `cote(α, i)` accessors
 *   - `bissectrice(α)` overload
 *   - `rotation(P, α, centre=O)` overload
 *   - removed builtins: `marque_angle`, `angle_droit`, `angle_vecteurs`
 *
 * Most tests are `.todo` because they depend on Phase 3-4 implementation.
 *
 * Reference: docs/wip/geometry/angle-v1-progress.md
 */
import { describe, it } from 'vitest';

describe('angle(A, V, B) — first-class object (Phase 0 spec)', () => {
	it.todo('angle(A, V, B) returns a GeoAngle element visible by default (FAILING UNTIL P3)');

	it.todo('returned BuiltinResult has symbolType="angle" and a figureId pointing to a GeoAngle');

	it.todo('angle(A, V, B, marque="carre") creates a right-angle marker (replaces angle_droit)');

	it.todo(
		'angle(A, V, B, marque="arcs2") creates a double-arc marker (replaces marque_angle arcs=2)'
	);

	it.todo('angle(A, V, B, kind="rentrant") flags the angle as exterior (>π)');

	it.todo('angle(A, V, B, showLabel="mesure", unite="deg") renders "60°" label');

	it.todo('angle(A, V, B) is fully reactive: drag A, V, or B → measure/bissectrice cascade update');
});

describe('angle(O, P) 2-args — removed (Phase 0 spec)', () => {
	it.todo('angle(O, P) with 2 args throws DslRuntimeError with structured hint (FAILING UNTIL P3)');

	it.todo('the error hint points to angle_polaire(O, P) as the replacement');

	it.todo('the error forms list includes both angle(A,V,B) and angle_polaire(O,P)');
});

describe('angle_polaire(O, P) — new builtin (Phase 0 spec)', () => {
	it.todo(
		'angle_polaire(O, P) returns a GeoScalar with scalarKind="polar_angle" (FAILING UNTIL P3)'
	);

	it.todo('angle_polaire(O, P) value equals atan2(P.y - O.y, P.x - O.x) in radians');

	it.todo('angle_polaire(O, P) is registered in BUILTIN_NAMES');

	it.todo('angle_polaire(O, P) is reactive: drag P → scalar updates');
});

describe('mesure(α) — accessor (Phase 0 spec)', () => {
	it.todo('mesure(α) returns a GeoScalar in radians by default (FAILING UNTIL P4)');

	it.todo('mesure(α, unite="deg") returns the measure in degrees');

	it.todo('mesure(α, unite="rad") returns the measure in radians explicitly');

	it.todo('2 successive calls to mesure(α) return the same scalar (cache via measureScalarId)');

	it.todo('mesure(α) is reactive: drag A/V/B → scalar updates');
});

describe('mesure(A, V, B) — 3-points overload (Phase 0 spec)', () => {
	it.todo(
		'mesure(A, V, B) returns a GeoScalar equivalent to mesure(angle(A, V, B)) (FAILING UNTIL P4)'
	);

	it.todo('the internal GeoAngle created by mesure(A, V, B) is visible=false');

	it.todo('mesure(A, V, B) accepts unite="deg" / "rad"');
});

describe('mesure(u, v) — 2-vectors overload (Phase 0 spec)', () => {
	it.todo('mesure(u, v) returns a GeoScalar in [0, π] (FAILING UNTIL P4)');

	it.todo('mesure(u, v) replaces the removed angle_vecteurs(u, v)');

	it.todo('mesure(u, v) accepts unite="deg" / "rad"');
});

describe('mesure() — rejection of non-angle types (Phase 0 spec)', () => {
	it.todo(
		'mesure(u) with 1 vector throws DslRuntimeError with hint="utilise norme(u)" (FAILING UNTIL P4)'
	);

	it.todo('mesure(s) with a segment throws DslRuntimeError with hint="utilise longueur(s)"');

	it.todo('mesure(c) with a circle throws DslRuntimeError (unsupported)');
});

describe('sommet(α) and cote(α, i) — accessors (Phase 0 spec)', () => {
	it.todo('sommet(α) returns the vertex point id (FAILING UNTIL P4)');

	it.todo('cote(α, 1) returns the p1 point id');

	it.todo('cote(α, 2) returns the p2 point id');

	it.todo('cote(α, 3) throws DslRuntimeError (index out of range)');

	it.todo('cote(α, 0) throws DslRuntimeError (1-based index)');

	it.todo('sommet(α) and cote(α, i) are pure accessors: no new element created');
});

describe('bissectrice(α) — overload (Phase 0 spec)', () => {
	it.todo('bissectrice(α) returns a line equivalent to bissectrice(A, V, B) (FAILING UNTIL P4)');

	it.todo('bissectrice(α) on a flat angle (180°) throws DslRuntimeError');

	it.todo('existing bissectrice(A, V, B) 3-points form is preserved');

	it.todo('bissectrice(α) is reactive: drag a side point → bissectrice updates');
});

describe('rotation(P, α, centre=O) — overload (Phase 0 spec)', () => {
	it.todo('rotation(P, α, centre=O) accepts a GeoAngle as the angle parameter (FAILING UNTIL P4)');

	it.todo('rotation(P, α, centre=O) computes the image using mesure(α)');

	it.todo('rotation(P, α, centre=O) is reactive: drag a side of α → image moves');

	it.todo('existing rotation(P, scalaire, centre=O) form is preserved');
});

describe('Removed builtins (Phase 0 spec)', () => {
	it.todo('marque_angle(...) throws DslRuntimeError "builtin inconnu" (FAILING UNTIL P3)');

	it.todo('angle_droit(...) throws DslRuntimeError "builtin inconnu"');

	it.todo('angle_vecteurs(...) throws DslRuntimeError "builtin inconnu"');

	it.todo('BUILTIN_NAMES does not contain "marque_angle", "angle_droit", "angle_vecteurs"');

	it.todo('BUILTIN_NAMES contains "angle_polaire"');

	it.todo(
		'BUILTIN_NAMES still contains "angle", "mesure", "sommet", "cote", "bissectrice", "rotation"'
	);
});

describe('Cas dégénérés DSL (Phase 0 spec)', () => {
	it.todo('angle(A, A, B) (vertex == p1) returns GeoAngle but mesure(α) is null');

	it.todo('angle(A, V, B) where A == B (p1 == p2) has mesure(α) = 0');

	it.todo('angle plat 180° + bissectrice(α) throws DslRuntimeError');

	it.todo('angle 360° normalizes to 0° in mesure');
});
