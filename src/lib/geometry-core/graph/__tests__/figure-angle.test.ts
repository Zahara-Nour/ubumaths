/**
 * Tests for `figure.createAngle()` factory (Phase 0 — TDD).
 *
 * These tests describe the EXPECTED behavior of the new `GeoAngle` first-class
 * object that will replace `GeoAngleMark` in V1. Most tests are marked `.todo`
 * because they depend on Phase 1 (types rename) and Phase 2 (factory rename
 * `createAngleMark` → `createAngle` + extended signature).
 *
 * Tests that exercise the EXISTING `createAngleMark` factory remain as regular
 * `it()` cases for now — they will be migrated to `createAngle` in Phase 6.
 *
 * Reference: docs/wip/geometry/angle-v1-progress.md
 */
import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { numeric } from '../../types/geo-value';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

describe('figure.createAngle() — V1 factory (Phase 0 spec)', () => {
	// ──────────────────────────────────────────────────────────────────────
	// Basic creation
	// ──────────────────────────────────────────────────────────────────────

	it.todo('creates a GeoAngle with type="angle" and visible=true by default (FAILING UNTIL P1+P2)');

	it.todo(
		'defaults marque="arc", kind="saillant", orientation="auto", showLabel="aucun", unite="rad"'
	);

	it.todo('sets dependsOn = [p1Id, vertexId, p2Id] in strict order (FAILING UNTIL P2)');

	it.todo('stores vertexId, p1Id, p2Id as direct fields (not just in dependsOn)');

	it.todo('arcRadiusPx defaults to 25 (overridable)');

	// ──────────────────────────────────────────────────────────────────────
	// Type guard isAngle
	// ──────────────────────────────────────────────────────────────────────

	it.todo('isAngle(el) returns true for GeoAngle elements (FAILING UNTIL P1)');

	it.todo('isAngle(el) returns false for non-angle elements');

	it.todo('isAngleMark/GeoAngleMark are removed from the type union (FAILING UNTIL P1)');

	// ──────────────────────────────────────────────────────────────────────
	// Marque variants
	// ──────────────────────────────────────────────────────────────────────

	it.todo('createAngle with marque="arc" stores marque="arc"');

	it.todo('createAngle with marque="arcs2" stores marque="arcs2"');

	it.todo('createAngle with marque="arcs3" stores marque="arcs3"');

	it.todo('createAngle with marque="carre" stores marque="carre" (replaces rightAngle:true)');

	it.todo('createAngle with marque="aucune" hides arc/square but keeps the angle object');

	// ──────────────────────────────────────────────────────────────────────
	// Kind: saillant vs rentrant
	// ──────────────────────────────────────────────────────────────────────

	it.todo('createAngle with kind="saillant" is the default');

	it.todo('createAngle with kind="rentrant" inverts the sweep flag (interior > π)');

	// ──────────────────────────────────────────────────────────────────────
	// Orientation
	// ──────────────────────────────────────────────────────────────────────

	it.todo('createAngle with orientation="auto" uses cross-product sign');

	it.todo('createAngle with orientation="direct" forces CCW orientation');

	it.todo('createAngle with orientation="indirect" forces CW orientation');

	// ──────────────────────────────────────────────────────────────────────
	// Show label + unite
	// ──────────────────────────────────────────────────────────────────────

	it.todo('createAngle with showLabel="mesure" + unite="deg" renders "60°"');

	it.todo('createAngle with showLabel="mesure" + unite="rad" renders "π/3"');

	it.todo('createAngle with showLabel="nom" renders the angle label');

	it.todo('createAngle with showLabel="mesure+nom" renders "α = 60°"');

	// ──────────────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────────────

	it.todo('throws if vertexId === p1Id (vertex collapsed with side)');

	it.todo('throws if a parent id does not exist (existing behavior preserved)');

	it.todo('throws if a parent is not a point element (existing behavior preserved)');

	// ──────────────────────────────────────────────────────────────────────
	// Drag reactivity
	// ──────────────────────────────────────────────────────────────────────

	it.todo('dragging p1 updates the arc baricenter position (recomputed via dependsOn)');

	it.todo('dragging vertex updates the arc baricenter position');

	it.todo('dragging p2 updates the arc baricenter position');

	it.todo('dragging any of the 3 points updates the measureScalarId-derived scalar');

	// ──────────────────────────────────────────────────────────────────────
	// Cascade
	// ──────────────────────────────────────────────────────────────────────

	it.todo('removing the vertex cascade-deletes the GeoAngle');

	it.todo('removing p1 cascade-deletes the GeoAngle');

	it.todo('removing p2 cascade-deletes the GeoAngle');

	it.todo('undo restores the GeoAngle after cascade deletion');

	// ──────────────────────────────────────────────────────────────────────
	// Cas dégénérés
	// ──────────────────────────────────────────────────────────────────────

	it.todo('angle with vertex == p1 has null measure and is hidden silently');

	it.todo('angle with p1 == p2 has measure 0 and renders empty arc');

	it.todo('angle of 0° renders correctly (small arc, no error)');

	it.todo('angle of 180° renders demi-circle');

	it.todo('angle of 360° normalizes to 0° (no infinite arc)');

	it.todo('3 aligned points (vertex between p1 and p2) → angle plat handled silently');

	// ──────────────────────────────────────────────────────────────────────
	// Existing behavior tests (createAngleMark — to be migrated in P6)
	// ──────────────────────────────────────────────────────────────────────

	describe('legacy createAngleMark (to be renamed in P2/P6)', () => {
		it('creates with 3 point parents (existing behavior)', () => {
			const f = new Figure();
			const a = f.createFreePoint(pt(1, 0));
			const v = f.createFreePoint(pt(0, 0));
			const b = f.createFreePoint(pt(0, 1));
			const id = f.createAngleMark(a, v, b);
			const el = f.getElementById(id)!;
			expect(el.dependsOn).toEqual([a, v, b]);
		});

		it('stores vertex position as the mark position', () => {
			const f = new Figure();
			const a = f.createFreePoint(pt(1, 0));
			const v = f.createFreePoint(pt(2, 3));
			const b = f.createFreePoint(pt(0, 1));
			const id = f.createAngleMark(a, v, b);
			const pos = f.getPosition(id)!;
			const vpos = f.getPosition(v)!;
			expect(pos.x).toEqual(vpos.x);
			expect(pos.y).toEqual(vpos.y);
		});

		it('updates position when vertex is moved (drag baseline)', () => {
			const f = new Figure();
			const a = f.createFreePoint(pt(1, 0));
			const v = f.createFreePoint(pt(0, 0));
			const b = f.createFreePoint(pt(0, 1));
			const id = f.createAngleMark(a, v, b);

			f.beginTransaction();
			f.movePoint(v, numeric(5), numeric(5));
			f.recompute();
			f.commit();

			const pos = f.getPosition(id)!;
			const vpos = f.getPosition(v)!;
			expect(pos.x).toEqual(vpos.x);
			expect(pos.y).toEqual(vpos.y);
		});

		it('is cascade-deleted when vertex is removed', () => {
			const f = new Figure();
			const a = f.createFreePoint(pt(1, 0));
			const v = f.createFreePoint(pt(0, 0));
			const b = f.createFreePoint(pt(0, 1));
			const id = f.createAngleMark(a, v, b);

			f.beginTransaction();
			f.remove(v);
			f.commit();

			expect(f.getElementById(id)).toBeUndefined();
		});

		it('throws if a parent is not a point element', () => {
			const f = new Figure();
			const a = f.createFreePoint(pt(1, 0));
			const v = f.createFreePoint(pt(0, 0));
			const seg = f.createSegment(a, v);
			expect(() => f.createAngleMark(a, seg, v)).toThrow();
		});
	});
});

describe('figure.createAngle — measureScalarId cache (Phase 0 spec)', () => {
	it.todo('createAngle does NOT pre-create the measure scalar (lazy)');

	it.todo('calling mesure(α) creates the scalar and stores its id in α.measureScalarId');

	it.todo('2 successive calls to mesure(α) return the SAME scalar id (cache hit)');

	it.todo('the cached measure scalar updates reactively when p1/vertex/p2 move');
});

describe('GeoAngle removal of GeoScalar scalarKind="angle" (Phase 0 spec)', () => {
	it.todo(
		'GeoScalar with scalarKind="angle" no longer exists (replaced by measureScalarId on GeoAngle)'
	);

	it.todo('GeoScalar with scalarKind="polar_angle" is preserved (used by angle_polaire)');
});
