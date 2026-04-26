import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { numeric } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { isVector, isVectorByPoints, isFreeVector } from '../../types/elements';

describe('Figure vector support', () => {
	// ─── VectorByPoints ─────────────────────────────────────────────

	describe('createVectorByPoints', () => {
		it('creates a bound vector between two points', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(1), y: numeric(2) });
			const b = fig.createFreePoint({ x: numeric(4), y: numeric(6) });
			const v = fig.createVectorByPoints(a, b);

			const el = fig.getElementById(v);
			expect(el).toBeDefined();
			expect(el!.type).toBe('vectorByPoints');
			expect(isVectorByPoints(el!)).toBe(true);
			expect(isVector(el!)).toBe(true);
		});

		it('depends on its two endpoint points', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(3), y: numeric(4) });
			const v = fig.createVectorByPoints(a, b);

			const el = fig.getElementById(v);
			expect(el!.dependsOn).toEqual([a, b]);
		});

		it('is removed when a parent point is removed', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
			const v = fig.createVectorByPoints(a, b);

			fig.remove(a);
			expect(fig.getElementById(v)).toBeUndefined();
		});

		it('has a label when provided', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
			const v = fig.createVectorByPoints(a, b, { label: 'u' });

			expect(fig.getElementById(v)!.label).toBe('u');
		});
	});

	// ─── FreeVector ─────────────────────────────────────────────────

	describe('createFreeVector', () => {
		it('creates a free vector with components', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(3), numeric(4));

			const el = fig.getElementById(v);
			expect(el).toBeDefined();
			expect(el!.type).toBe('freeVector');
			expect(isFreeVector(el!)).toBe(true);
			expect(isVector(el!)).toBe(true);
		});

		it('stores components as GeoValues', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(3), numeric(-2));

			const el = fig.getElementById(v)!;
			expect(el.type).toBe('freeVector');
			if (el.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBe(3);
				expect(geoToNumber(el.dy)).toBe(-2);
			}
		});

		it('defaults anchor to origin (0, 0)', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(5), numeric(5));

			const pos = fig.getPosition(v);
			expect(pos).not.toBeNull();
			expect(geoToNumber(pos!.x)).toBe(0);
			expect(geoToNumber(pos!.y)).toBe(0);
		});

		it('uses provided anchor position', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(1), numeric(1), {
				x: numeric(2),
				y: numeric(3)
			});

			const pos = fig.getPosition(v);
			expect(geoToNumber(pos!.x)).toBe(2);
			expect(geoToNumber(pos!.y)).toBe(3);
		});

		it('has no dependencies', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(1), numeric(1));
			const el = fig.getElementById(v)!;
			expect(el.dependsOn).toEqual([]);
		});
	});

	// ─── moveFreeVector ─────────────────────────────────────────────

	describe('moveFreeVector', () => {
		it('moves anchor while preserving components', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(3), numeric(4));

			fig.moveFreeVector(v, numeric(10), numeric(20));

			const el = fig.getElementById(v)!;
			expect(el.type).toBe('freeVector');
			if (el.type === 'freeVector') {
				// Components unchanged
				expect(geoToNumber(el.dx)).toBe(3);
				expect(geoToNumber(el.dy)).toBe(4);
				// Anchor moved
				expect(geoToNumber(el.anchorX)).toBe(10);
				expect(geoToNumber(el.anchorY)).toBe(20);
			}

			const pos = fig.getPosition(v);
			expect(geoToNumber(pos!.x)).toBe(10);
			expect(geoToNumber(pos!.y)).toBe(20);
		});

		it('throws for non-freeVector elements', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			expect(() => fig.moveFreeVector(a, numeric(1), numeric(1))).toThrow();
		});
	});

	// ─── Undo/redo ──────────────────────────────────────────────────

	describe('undo/redo with vectors', () => {
		it('undoes creation of a bound vector', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });

			fig.beginTransaction();
			const v = fig.createVectorByPoints(a, b);
			fig.commit();

			expect(fig.getElementById(v)).toBeDefined();
			fig.undo();
			expect(fig.getElementById(v)).toBeUndefined();
			fig.redo();
			expect(fig.getElementById(v)).toBeDefined();
		});

		it('undoes creation of a free vector', () => {
			const fig = new Figure();
			fig.beginTransaction();
			const v = fig.createFreeVector(numeric(5), numeric(5));
			fig.commit();

			expect(fig.getElementById(v)).toBeDefined();
			fig.undo();
			expect(fig.getElementById(v)).toBeUndefined();
			fig.redo();
			expect(fig.getElementById(v)).toBeDefined();
		});

		it('undoes moveFreeVector', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(1), numeric(2));

			fig.beginTransaction();
			fig.moveFreeVector(v, numeric(10), numeric(20));
			fig.commit();

			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(10);
			fig.undo();
			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(0);
		});
	});
});
