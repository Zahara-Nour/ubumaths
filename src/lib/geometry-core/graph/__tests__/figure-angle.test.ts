/**
 * Tests for `figure.createAngle()` factory (V1 — GeoAngle first-class object).
 *
 * Reference: docs/wip/geometry/angle-v1-progress.md
 */
import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { isAngle } from '../../types/elements';
import { numeric } from '../../types/geo-value';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

describe('figure.createAngle() — V1 factory', () => {
	// ──────────────────────────────────────────────────────────────────────
	// Basic creation
	// ──────────────────────────────────────────────────────────────────────

	it('creates a GeoAngle with type="angle" and visible=true by default', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);
		const el = f.getElementById(id)!;
		expect(el.type).toBe('angle');
		expect(el.visible).toBe(true);
	});

	it('defaults marque="arc", kind="saillant", orientation="auto", showLabel="aucun", unite="rad"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);
		const el = f.getElementById(id)! as ReturnType<Figure['getElementById']> & {
			marque: string;
			kind: string;
			orientation: string;
			showLabel: string;
			unite: string;
		};
		expect(el.marque).toBe('arc');
		expect(el.kind).toBe('saillant');
		expect(el.orientation).toBe('auto');
		expect(el.showLabel).toBe('aucun');
		expect(el.unite).toBe('rad');
	});

	it('sets dependsOn = [p1Id, vertexId, p2Id] in strict order', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);
		const el = f.getElementById(id)!;
		expect(el.dependsOn).toEqual([a, v, b]);
	});

	it('stores vertexId, p1Id, p2Id as direct fields', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);
		const el = f.getElementById(id)! as { p1Id: string; vertexId: string; p2Id: string };
		expect(el.p1Id).toBe(a);
		expect(el.vertexId).toBe(v);
		expect(el.p2Id).toBe(b);
	});

	it('arcRadiusPx defaults to undefined (rendered as 25)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);
		const el = f.getElementById(id)! as { arcRadiusPx?: number };
		// arcRadiusPx is optional — undefined means "use default 25 at render time"
		expect(el.arcRadiusPx).toBeUndefined();
	});

	it('arcRadiusPx can be overridden', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { arcRadiusPx: 40 });
		const el = f.getElementById(id)! as { arcRadiusPx?: number };
		expect(el.arcRadiusPx).toBe(40);
	});

	// ──────────────────────────────────────────────────────────────────────
	// Type guard isAngle
	// ──────────────────────────────────────────────────────────────────────

	it('isAngle(el) returns true for GeoAngle elements', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);
		const el = f.getElementById(id)!;
		expect(isAngle(el)).toBe(true);
	});

	it('isAngle(el) returns false for non-angle elements', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const el = f.getElementById(a)!;
		expect(isAngle(el)).toBe(false);
	});

	it('GeoAngleMark/isAngleMark no longer exist — isAngle is the type guard', () => {
		// isAngle is the type guard; isAngleMark is removed
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);
		const el = f.getElementById(id)!;
		expect(el.type).toBe('angle'); // not 'angleMark'
	});

	// ──────────────────────────────────────────────────────────────────────
	// Marque variants
	// ──────────────────────────────────────────────────────────────────────

	it('createAngle with marque="arc" stores marque="arc"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { marque: 'arc' });
		const el = f.getElementById(id)! as { marque: string };
		expect(el.marque).toBe('arc');
	});

	it('createAngle with marque="arcs2" stores marque="arcs2"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { marque: 'arcs2' });
		const el = f.getElementById(id)! as { marque: string };
		expect(el.marque).toBe('arcs2');
	});

	it('createAngle with marque="arcs3" stores marque="arcs3"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { marque: 'arcs3' });
		const el = f.getElementById(id)! as { marque: string };
		expect(el.marque).toBe('arcs3');
	});

	it('createAngle with marque="carre" stores marque="carre" (replaces rightAngle:true)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { marque: 'carre' });
		const el = f.getElementById(id)! as { marque: string };
		expect(el.marque).toBe('carre');
	});

	it('createAngle with marque="aucune" keeps the angle object visible but no arc', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { marque: 'aucune' });
		const el = f.getElementById(id)! as { marque: string };
		expect(el.marque).toBe('aucune');
		expect(el.type).toBe('angle');
	});

	// ──────────────────────────────────────────────────────────────────────
	// Kind: saillant vs rentrant
	// ──────────────────────────────────────────────────────────────────────

	it('createAngle with kind="saillant" is the default', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);
		const el = f.getElementById(id)! as { kind: string };
		expect(el.kind).toBe('saillant');
	});

	it('createAngle with kind="rentrant" stores kind="rentrant"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { kind: 'rentrant' });
		const el = f.getElementById(id)! as { kind: string };
		expect(el.kind).toBe('rentrant');
	});

	// ──────────────────────────────────────────────────────────────────────
	// Show label + unite
	// ──────────────────────────────────────────────────────────────────────

	it('createAngle with showLabel="mesure" + unite="deg" stores both fields', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { showLabel: 'mesure', unite: 'deg' });
		const el = f.getElementById(id)! as { showLabel: string; unite: string };
		expect(el.showLabel).toBe('mesure');
		expect(el.unite).toBe('deg');
	});

	it('createAngle with showLabel="nom" stores showLabel="nom"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { showLabel: 'nom', label: 'α' });
		const el = f.getElementById(id)! as { showLabel: string };
		expect(el.showLabel).toBe('nom');
	});

	it('createAngle with showLabel="mesure+nom" stores showLabel="mesure+nom"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { showLabel: 'mesure+nom', label: 'α', unite: 'deg' });
		const el = f.getElementById(id)! as { showLabel: string };
		expect(el.showLabel).toBe('mesure+nom');
	});

	// ──────────────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────────────

	it('throws if a parent is not a point element (segment passed as vertex)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const seg = f.createSegment(a, v);
		expect(() => f.createAngle(a, seg, v)).toThrow();
	});

	it('throws if p1Id does not exist', () => {
		const f = new Figure();
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		expect(() => f.createAngle('nonexistent', v, b)).toThrow();
	});

	it('throws if vertexId does not exist', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const b = f.createFreePoint(pt(0, 1));
		expect(() => f.createAngle(a, 'nonexistent', b)).toThrow();
	});

	// ──────────────────────────────────────────────────────────────────────
	// Drag reactivity
	// ──────────────────────────────────────────────────────────────────────

	it('stores vertex position as the angle position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(2, 3));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);
		const pos = f.getPosition(id)!;
		const vpos = f.getPosition(v)!;
		expect(pos.x).toEqual(vpos.x);
		expect(pos.y).toEqual(vpos.y);
	});

	it('dragging vertex updates the angle position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);

		f.beginTransaction();
		f.movePoint(v, numeric(5), numeric(5));
		f.recompute();
		f.commit();

		const pos = f.getPosition(id)!;
		const vpos = f.getPosition(v)!;
		expect(pos.x).toEqual(vpos.x);
		expect(pos.y).toEqual(vpos.y);
	});

	it('dragging p1 does not move the vertex-based reference position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);

		const vposBefore = f.getPosition(v)!;

		f.beginTransaction();
		f.movePoint(a, numeric(5), numeric(0));
		f.recompute();
		f.commit();

		const pos = f.getPosition(id)!;
		// position is still at the vertex
		expect(pos.x).toEqual(vposBefore.x);
		expect(pos.y).toEqual(vposBefore.y);
	});

	// ──────────────────────────────────────────────────────────────────────
	// Cascade
	// ──────────────────────────────────────────────────────────────────────

	it('is cascade-deleted when vertex is removed', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);

		f.beginTransaction();
		f.remove(v);
		f.commit();

		expect(f.getElementById(id)).toBeUndefined();
	});

	it('is cascade-deleted when p1 is removed', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);

		f.beginTransaction();
		f.remove(a);
		f.commit();

		expect(f.getElementById(id)).toBeUndefined();
	});

	it('is cascade-deleted when p2 is removed', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);

		f.beginTransaction();
		f.remove(b);
		f.commit();

		expect(f.getElementById(id)).toBeUndefined();
	});

	// ──────────────────────────────────────────────────────────────────────
	// Orientation variants
	// ──────────────────────────────────────────────────────────────────────

	it('createAngle with orientation="auto" stores orientation="auto"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { orientation: 'auto' });
		const el = f.getElementById(id)! as { orientation: string };
		expect(el.orientation).toBe('auto');
	});

	it('createAngle with orientation="direct" stores orientation="direct"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { orientation: 'direct' });
		const el = f.getElementById(id)! as { orientation: string };
		expect(el.orientation).toBe('direct');
	});

	it('createAngle with orientation="indirect" stores orientation="indirect"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b, { orientation: 'indirect' });
		const el = f.getElementById(id)! as { orientation: string };
		expect(el.orientation).toBe('indirect');
	});
});

describe('figure.createAngle — measureScalarId cache', () => {
	it('createAngle does NOT pre-create the measure scalar (lazy)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngle(a, v, b);
		const el = f.getElementById(id)! as { measureScalarId?: string };
		expect(el.measureScalarId).toBeUndefined();
	});

	it('setAngleMeasureScalarId stores the scalar id', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const angleId = f.createAngle(a, v, b);
		const scalarId = f.createScalarAngleMeasure(a, v, b);
		f.setAngleMeasureScalarId(angleId, scalarId);
		const el = f.getElementById(angleId)! as { measureScalarId?: string };
		expect(el.measureScalarId).toBe(scalarId);
	});

	it('createScalarAngleMeasure returns correct angle in radians', () => {
		const f = new Figure();
		// 90° angle
		const p1 = f.createFreePoint(pt(1, 0));
		const vx = f.createFreePoint(pt(0, 0));
		const p2 = f.createFreePoint(pt(0, 1));
		const scalarId = f.createScalarAngleMeasure(p1, vx, p2);
		const val = f.getScalarValue(scalarId);
		expect(val).toBeCloseTo(Math.PI / 2, 5);
	});

	it('createScalarAngleMeasure with unite="deg" returns correct degrees', () => {
		const f = new Figure();
		const p1 = f.createFreePoint(pt(1, 0));
		const vx = f.createFreePoint(pt(0, 0));
		const p2 = f.createFreePoint(pt(0, 1));
		const scalarId = f.createScalarAngleMeasure(p1, vx, p2, { unite: 'deg' });
		const val = f.getScalarValue(scalarId);
		expect(val).toBeCloseTo(90, 3);
	});

	it('the measure scalar updates reactively when points move', () => {
		const f = new Figure();
		const p1 = f.createFreePoint(pt(1, 0));
		const vx = f.createFreePoint(pt(0, 0));
		const p2 = f.createFreePoint(pt(0, 1));
		const scalarId = f.createScalarAngleMeasure(p1, vx, p2, { unite: 'deg' });

		// Initial: 90°
		expect(f.getScalarValue(scalarId)).toBeCloseTo(90, 3);

		// Move p2 to (1, 0) — same as p1, angle becomes 0°
		f.beginTransaction();
		f.movePoint(p2, numeric(1), numeric(0));
		f.recompute();
		f.commit();

		expect(f.getScalarValue(scalarId)).toBeCloseTo(0, 3);
	});
});

describe('GeoScalar scalarKind preservation', () => {
	it('GeoScalar with scalarKind="polar_angle" is preserved (used by angle_polaire)', () => {
		const f = new Figure();
		const o = f.createFreePoint(pt(0, 0));
		const p = f.createFreePoint(pt(1, 0));
		const id = f.createScalarPolarAngle(o, p);
		const el = f.getElementById(id)! as { scalarKind: string };
		expect(el.scalarKind).toBe('polar_angle');
	});

	it('createScalarPolarAngle returns 0° for point on positive x-axis', () => {
		const f = new Figure();
		const o = f.createFreePoint(pt(0, 0));
		const p = f.createFreePoint(pt(1, 0));
		const id = f.createScalarPolarAngle(o, p);
		const val = f.getScalarValue(id);
		expect(val).toBeCloseTo(0, 5);
	});
});
