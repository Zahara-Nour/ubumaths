import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { numeric } from '../../types/geo-value';

describe('Figure — Arc', () => {
	// ─── createArcByAngles ──────────────────────────────────────────

	describe('createArcByAngles', () => {
		it('creates an arc element with correct properties', () => {
			const fig = new Figure();
			const c = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const id = fig.createArcByAngles(c, numeric(3), numeric(0), numeric(Math.PI / 2));
			const el = fig.getElementById(id);
			expect(el).toBeDefined();
			expect(el!.type).toBe('arcByAngles');
			if (el!.type === 'arcByAngles') {
				expect(el!.centerId).toBe(c);
				expect(el!.radius).toEqual(numeric(3));
				expect(el!.startAngle).toEqual(numeric(0));
				expect(el!.endAngle).toEqual(numeric(Math.PI / 2));
			}
		});

		it('depends on center point', () => {
			const fig = new Figure();
			const c = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const id = fig.createArcByAngles(c, numeric(3), numeric(0), numeric(Math.PI));
			const el = fig.getElementById(id);
			expect(el!.dependsOn).toEqual([c]);
		});

		it('cascade-deletes when center is removed', () => {
			const fig = new Figure();
			const c = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const arcId = fig.createArcByAngles(c, numeric(3), numeric(0), numeric(Math.PI));
			fig.remove(c);
			expect(fig.getElementById(arcId)).toBeUndefined();
		});

		it('supports undo/redo', () => {
			const fig = new Figure();
			const c = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			fig.beginTransaction();
			const arcId = fig.createArcByAngles(c, numeric(2), numeric(0), numeric(Math.PI));
			fig.commit();
			expect(fig.getElementById(arcId)).toBeDefined();
			fig.undo();
			expect(fig.getElementById(arcId)).toBeUndefined();
			fig.redo();
			expect(fig.getElementById(arcId)).toBeDefined();
		});
	});

	// ─── createArcByPoints ──────────────────────────────────────────

	describe('createArcByPoints', () => {
		it('creates an arc element with correct properties', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(3), y: numeric(0) });
			const o = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(0), y: numeric(3) });
			const id = fig.createArcByPoints(a, o, b);
			const el = fig.getElementById(id);
			expect(el).toBeDefined();
			expect(el!.type).toBe('arcByPoints');
			if (el!.type === 'arcByPoints') {
				expect(el!.startId).toBe(a);
				expect(el!.centerId).toBe(o);
				expect(el!.endId).toBe(b);
			}
		});

		it('depends on all three points', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(3), y: numeric(0) });
			const o = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(0), y: numeric(3) });
			const id = fig.createArcByPoints(a, o, b);
			const el = fig.getElementById(id);
			expect(el!.dependsOn).toEqual([a, o, b]);
		});

		it('cascade-deletes when any point is removed', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(3), y: numeric(0) });
			const o = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(0), y: numeric(3) });
			const arcId = fig.createArcByPoints(a, o, b);
			fig.remove(o);
			expect(fig.getElementById(arcId)).toBeUndefined();
		});

		it('supports undo/redo', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(3), y: numeric(0) });
			const o = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(0), y: numeric(3) });
			fig.beginTransaction();
			const arcId = fig.createArcByPoints(a, o, b);
			fig.commit();
			expect(fig.getElementById(arcId)).toBeDefined();
			fig.undo();
			expect(fig.getElementById(arcId)).toBeUndefined();
			fig.redo();
			expect(fig.getElementById(arcId)).toBeDefined();
		});
	});
});
