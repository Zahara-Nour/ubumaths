import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { numeric, exact } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { isVector, isVectorByPoints, isFreeVector } from '../../types/elements';
import type { NumberNode } from '$lib/mathAST/types';

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

// =============================================================================
// Translation by vector (reactive dependency)
// =============================================================================

describe('createTranslatedPointByVector', () => {
	it('translates a point by a bound vector', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(3), y: numeric(4) });
		const v = fig.createVectorByPoints(a, b);
		const p = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
		const q = fig.createTranslatedPointByVector(p, v);

		fig.recompute();
		const pos = fig.getPosition(q);
		expect(pos).not.toBeNull();
		expect(geoToNumber(pos!.x)).toBeCloseTo(4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(5);
	});

	it('translates a point by a free vector', () => {
		const fig = new Figure();
		const v = fig.createFreeVector(numeric(2), numeric(-1));
		const p = fig.createFreePoint({ x: numeric(5), y: numeric(5) });
		const q = fig.createTranslatedPointByVector(p, v);

		fig.recompute();
		const pos = fig.getPosition(q);
		expect(geoToNumber(pos!.x)).toBeCloseTo(7);
		expect(geoToNumber(pos!.y)).toBeCloseTo(4);
	});

	it('is reactive: moving a bound vector endpoint updates the translated point', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(3), y: numeric(0) });
		const v = fig.createVectorByPoints(a, b);
		const p = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
		const q = fig.createTranslatedPointByVector(p, v);

		fig.recompute();
		expect(geoToNumber(fig.getPosition(q)!.x)).toBeCloseTo(4);

		// Move B from (3,0) to (5,2) — vector changes from (3,0) to (5,2)
		fig.movePoint(b, numeric(5), numeric(2));
		fig.recompute();
		expect(geoToNumber(fig.getPosition(q)!.x)).toBeCloseTo(6);
		expect(geoToNumber(fig.getPosition(q)!.y)).toBeCloseTo(3);
	});

	it('throws for non-point source', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
		const v = fig.createVectorByPoints(a, b);
		const seg = fig.createSegment(a, b);
		expect(() => fig.createTranslatedPointByVector(seg, v)).toThrow();
	});

	it('throws for non-vector vectorId', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
		expect(() => fig.createTranslatedPointByVector(a, b)).toThrow();
	});
});

// =============================================================================
// Edge case tests
// =============================================================================

describe('Figure vector edge cases', () => {
	// ─── createVectorByPoints edge cases ────────────────────────────

	describe('createVectorByPoints with non-existent points', () => {
		it('throws when start point ID does not exist', () => {
			const fig = new Figure();
			const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
			expect(() => fig.createVectorByPoints('nonexistent', b)).toThrow();
		});

		it('throws when end point ID does not exist', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			expect(() => fig.createVectorByPoints(a, 'nonexistent')).toThrow();
		});

		it('throws when both point IDs do not exist', () => {
			const fig = new Figure();
			expect(() => fig.createVectorByPoints('fake1', 'fake2')).toThrow();
		});
	});

	// ─── createFreeVector with negative components ──────────────────

	describe('createFreeVector with negative components', () => {
		it('stores negative dx correctly', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(-5), numeric(3));
			const el = fig.getElementById(v)!;
			expect(el.type).toBe('freeVector');
			if (el.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBe(-5);
				expect(geoToNumber(el.dy)).toBe(3);
			}
		});

		it('stores both negative components correctly', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(-2), numeric(-7));
			const el = fig.getElementById(v)!;
			if (el.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBe(-2);
				expect(geoToNumber(el.dy)).toBe(-7);
			}
		});
	});

	// ─── Zero vector ────────────────────────────────────────────────

	describe('createFreeVector with zero components (zero vector)', () => {
		it('creates a zero vector with both components 0', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(0), numeric(0));
			const el = fig.getElementById(v)!;
			expect(el.type).toBe('freeVector');
			expect(isFreeVector(el)).toBe(true);
			if (el.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBe(0);
				expect(geoToNumber(el.dy)).toBe(0);
			}
		});

		it('zero vector has valid position at anchor', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(0), numeric(0), {
				x: numeric(5),
				y: numeric(5)
			});
			const pos = fig.getPosition(v);
			expect(pos).not.toBeNull();
			expect(geoToNumber(pos!.x)).toBe(5);
			expect(geoToNumber(pos!.y)).toBe(5);
		});
	});

	// ─── createFreeVector with exact GeoValues ──────────────────────

	describe('createFreeVector with exact GeoValues', () => {
		it('stores exact values for components', () => {
			const node3: NumberNode = { type: 'number', value: '3' };
			const node4: NumberNode = { type: 'number', value: '4' };
			const fig = new Figure();
			const v = fig.createFreeVector(exact(node3), exact(node4));
			const el = fig.getElementById(v)!;
			expect(el.type).toBe('freeVector');
			if (el.type === 'freeVector') {
				expect(el.dx.kind).toBe('exact');
				expect(el.dy.kind).toBe('exact');
				expect(geoToNumber(el.dx)).toBe(3);
				expect(geoToNumber(el.dy)).toBe(4);
			}
		});
	});

	// ─── moveFreeVector preserves metadata ──────────────────────────

	describe('moveFreeVector preserves label and color', () => {
		it('preserves label after move', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(1), numeric(2), undefined, { label: 'w' });
			expect(fig.getElementById(v)!.label).toBe('w');

			fig.moveFreeVector(v, numeric(5), numeric(5));
			expect(fig.getElementById(v)!.label).toBe('w');
		});

		it('preserves color after move', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(1), numeric(2), undefined, { color: '#ff0000' });
			expect(fig.getElementById(v)!.color).toBe('#ff0000');

			fig.moveFreeVector(v, numeric(5), numeric(5));
			expect(fig.getElementById(v)!.color).toBe('#ff0000');
		});
	});

	// ─── Multiple vectors sharing the same points ───────────────────

	describe('multiple vectors sharing the same points', () => {
		it('creates two distinct vectors from the same pair of points', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(3), y: numeric(4) });
			const v1 = fig.createVectorByPoints(a, b);
			const v2 = fig.createVectorByPoints(a, b);

			expect(v1).not.toBe(v2);
			expect(fig.getElementById(v1)).toBeDefined();
			expect(fig.getElementById(v2)).toBeDefined();
		});

		it('creates vectors in opposite directions between the same points', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(3), y: numeric(4) });
			const vAB = fig.createVectorByPoints(a, b);
			const vBA = fig.createVectorByPoints(b, a);

			const elAB = fig.getElementById(vAB)!;
			const elBA = fig.getElementById(vBA)!;
			expect(elAB.type).toBe('vectorByPoints');
			expect(elBA.type).toBe('vectorByPoints');
			if (elAB.type === 'vectorByPoints' && elBA.type === 'vectorByPoints') {
				expect(elAB.startId).toBe(a);
				expect(elAB.endId).toBe(b);
				expect(elBA.startId).toBe(b);
				expect(elBA.endId).toBe(a);
			}
		});

		it('removing one vector does not affect another sharing the same points', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
			const v1 = fig.createVectorByPoints(a, b);
			const v2 = fig.createVectorByPoints(a, b);

			fig.remove(v1);
			expect(fig.getElementById(v1)).toBeUndefined();
			expect(fig.getElementById(v2)).toBeDefined();
		});
	});

	// ─── Cascade deletion of bound vector ───────────────────────────

	describe('remove endpoint of bound vector cascades deletion', () => {
		it('removing start point removes the vector', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
			const v = fig.createVectorByPoints(a, b);

			fig.remove(a);
			expect(fig.getElementById(v)).toBeUndefined();
			// End point should still exist
			expect(fig.getElementById(b)).toBeDefined();
		});

		it('removing end point removes the vector', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
			const v = fig.createVectorByPoints(a, b);

			fig.remove(b);
			expect(fig.getElementById(v)).toBeUndefined();
			// Start point should still exist
			expect(fig.getElementById(a)).toBeDefined();
		});

		it('removing shared point removes all dependent vectors', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(1), y: numeric(0) });
			const c = fig.createFreePoint({ x: numeric(0), y: numeric(1) });
			const v1 = fig.createVectorByPoints(a, b);
			const v2 = fig.createVectorByPoints(a, c);

			fig.remove(a);
			expect(fig.getElementById(v1)).toBeUndefined();
			expect(fig.getElementById(v2)).toBeUndefined();
			expect(fig.getElementById(b)).toBeDefined();
			expect(fig.getElementById(c)).toBeDefined();
		});
	});

	// ─── Undo/redo of moveFreeVector multiple times ─────────────────

	describe('undo/redo of moveFreeVector multiple times (stack behavior)', () => {
		it('undoes and redoes multiple sequential moves', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(1), numeric(1));

			// Move 1
			fig.beginTransaction();
			fig.moveFreeVector(v, numeric(10), numeric(10));
			fig.commit();

			// Move 2
			fig.beginTransaction();
			fig.moveFreeVector(v, numeric(20), numeric(20));
			fig.commit();

			// Move 3
			fig.beginTransaction();
			fig.moveFreeVector(v, numeric(30), numeric(30));
			fig.commit();

			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(30);

			// Undo move 3
			fig.undo();
			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(20);

			// Undo move 2
			fig.undo();
			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(10);

			// Undo move 1
			fig.undo();
			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(0);

			// Redo move 1
			fig.redo();
			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(10);

			// Redo move 2
			fig.redo();
			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(20);
		});

		it('redo stack is cleared after a new move following undo', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(1), numeric(1));

			fig.beginTransaction();
			fig.moveFreeVector(v, numeric(10), numeric(10));
			fig.commit();

			fig.beginTransaction();
			fig.moveFreeVector(v, numeric(20), numeric(20));
			fig.commit();

			// Undo move 2
			fig.undo();
			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(10);

			// New move invalidates redo stack
			fig.beginTransaction();
			fig.moveFreeVector(v, numeric(50), numeric(50));
			fig.commit();

			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(50);

			// Redo should not go back to 20 — redo stack was cleared
			fig.redo();
			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(50);
		});
	});

	// ─── Free vector with custom anchor then move ───────────────────

	describe('free vector with custom anchor position then move', () => {
		it('moves from custom anchor to new position', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(2), numeric(3), {
				x: numeric(5),
				y: numeric(7)
			});

			expect(geoToNumber(fig.getPosition(v)!.x)).toBe(5);
			expect(geoToNumber(fig.getPosition(v)!.y)).toBe(7);

			fig.moveFreeVector(v, numeric(-1), numeric(-1));

			const el = fig.getElementById(v)!;
			if (el.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBe(2);
				expect(geoToNumber(el.dy)).toBe(3);
				expect(geoToNumber(el.anchorX)).toBe(-1);
				expect(geoToNumber(el.anchorY)).toBe(-1);
			}
		});
	});

	// ─── Figure size after create and remove ────────────────────────

	describe('figure size after creating and removing vectors', () => {
		it('increments size when vectors are added', () => {
			const fig = new Figure();
			const initialSize = fig.size;

			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
			const sizeAfterPoints = fig.size;
			expect(sizeAfterPoints).toBe(initialSize + 2);

			fig.createVectorByPoints(a, b);
			expect(fig.size).toBe(sizeAfterPoints + 1);

			fig.createFreeVector(numeric(1), numeric(1));
			expect(fig.size).toBe(sizeAfterPoints + 2);
		});

		it('decrements size when a free vector is removed', () => {
			const fig = new Figure();
			const v = fig.createFreeVector(numeric(1), numeric(1));
			const sizeBefore = fig.size;

			fig.remove(v);
			expect(fig.size).toBe(sizeBefore - 1);
		});

		it('size accounts for cascade removal of bound vector with endpoint', () => {
			const fig = new Figure();
			const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
			const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
			fig.createVectorByPoints(a, b);
			const sizeBefore = fig.size; // 3 elements: a, b, vector

			fig.remove(a); // removes a + vector (cascade)
			expect(fig.size).toBe(sizeBefore - 2);
		});
	});
});
