import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { exact, numeric, isExact } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { numericNode } from '$lib/mathAST/common/numeric';
import type { GeoPoint } from '../../types/primitives';

function pt(x: number, y: number): GeoPoint {
	return { x: exact(numericNode(x)), y: exact(numericNode(y)) };
}

// =============================================================================
// Transaction basics
// =============================================================================

describe('transactions', () => {
	it('commit without beginTransaction throws', () => {
		const f = new Figure();
		expect(() => f.commit()).toThrow();
	});

	it('beginTransaction when already in transaction throws', () => {
		const f = new Figure();
		f.beginTransaction();
		expect(() => f.beginTransaction()).toThrow();
		f.discard();
	});

	it('discard cancels the transaction', () => {
		const f = new Figure();
		f.beginTransaction();
		f.createFreePoint(pt(1, 1));
		f.discard();
		// Point was created but transaction discarded — the point still exists
		// (discard just cancels the recording, not the operations)
		expect(f.size).toBe(1);
		// But nothing was pushed to undo stack
		expect(f.canUndo).toBe(false);
	});
});

// =============================================================================
// Undo/Redo: movePoint (drag simulation)
// =============================================================================

describe('undo/redo movePoint', () => {
	it('undo restores point position after drag', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));

		f.beginTransaction();
		f.movePoint(a, numeric(10), numeric(20));
		f.recompute();
		f.commit();

		expect(geoToNumber(f.getPosition(a)!.x)).toBeCloseTo(10, 8);

		f.undo();
		expect(geoToNumber(f.getPosition(a)!.x)).toBe(3);
		expect(geoToNumber(f.getPosition(a)!.y)).toBe(4);
	});

	it('redo re-applies the drag', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));

		f.beginTransaction();
		f.movePoint(a, numeric(10), numeric(20));
		f.commit();

		f.undo();
		expect(geoToNumber(f.getPosition(a)!.x)).toBe(3);

		f.redo();
		expect(geoToNumber(f.getPosition(a)!.x)).toBeCloseTo(10, 8);
	});

	it('drag with multiple movePoints = one undo step', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));

		f.beginTransaction();
		// Simulate drag: many intermediate positions
		f.movePoint(a, numeric(1), numeric(1));
		f.movePoint(a, numeric(2), numeric(2));
		f.movePoint(a, numeric(5), numeric(5));
		f.recompute();
		f.commit();

		expect(geoToNumber(f.getPosition(a)!.x)).toBeCloseTo(5, 8);

		// One undo goes back to start
		f.undo();
		expect(geoToNumber(f.getPosition(a)!.x)).toBe(0);
		expect(geoToNumber(f.getPosition(a)!.y)).toBe(0);
	});

	it('undo restores dependent midpoint', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(10, 0));
		const mid = f.createMidpoint(a, b);

		expect(geoToNumber(f.getPosition(mid)!.x)).toBe(5);

		f.beginTransaction();
		f.movePoint(a, numeric(8), numeric(0));
		f.recompute();
		f.commit();

		expect(geoToNumber(f.getPosition(mid)!.x)).toBeCloseTo(9, 8);

		f.undo();
		expect(geoToNumber(f.getPosition(mid)!.x)).toBe(5);
	});

	it('undo restores exact values (not numeric)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));

		f.beginTransaction();
		f.movePoint(a, numeric(10), numeric(20));
		f.commit();

		f.undo();
		expect(isExact(f.getPosition(a)!.x)).toBe(true);
	});
});

// =============================================================================
// Undo/Redo: create elements
// =============================================================================

describe('undo/redo create', () => {
	it('undo removes a created point', () => {
		const f = new Figure();

		f.beginTransaction();
		const a = f.createFreePoint(pt(1, 1));
		f.commit();

		expect(f.size).toBe(1);

		f.undo();
		expect(f.size).toBe(0);
		expect(f.getElementById(a)).toBeUndefined();
	});

	it('redo re-creates the point', () => {
		const f = new Figure();

		f.beginTransaction();
		f.createFreePoint(pt(1, 1));
		f.commit();

		f.undo();
		expect(f.size).toBe(0);

		f.redo();
		expect(f.size).toBe(1);
		const elements = f.getElementsByType('freePoint');
		expect(elements.length).toBe(1);
		expect(geoToNumber(f.getPosition(elements[0].id)!.x)).toBe(1);
	});

	it('undo removes a segment and keeps its points', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 5));

		f.beginTransaction();
		const seg = f.createSegment(a, b);
		f.commit();

		expect(f.size).toBe(3);

		f.undo();
		expect(f.size).toBe(2); // points remain
		expect(f.getElementById(seg)).toBeUndefined();
		expect(f.getElementById(a)).toBeDefined();
	});

	it('undo removes a midpoint', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(10, 0));

		f.beginTransaction();
		const mid = f.createMidpoint(a, b);
		f.commit();

		expect(f.size).toBe(3);

		f.undo();
		expect(f.size).toBe(2);
		expect(f.getPosition(mid)).toBeNull();
	});

	it('undo of multiple creates in one transaction', () => {
		const f = new Figure();

		f.beginTransaction();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		f.createSegment(a, b);
		f.commit();

		expect(f.size).toBe(3);

		f.undo();
		expect(f.size).toBe(0);
	});
});

// =============================================================================
// Undo/Redo: remove elements
// =============================================================================

describe('undo/redo remove', () => {
	it('undo restores a removed point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));

		f.beginTransaction();
		f.remove(a);
		f.commit();

		expect(f.size).toBe(0);

		f.undo();
		expect(f.size).toBe(1);
		expect(geoToNumber(f.getPosition(a)!.x)).toBe(3);
	});

	it('undo restores cascade-deleted elements', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(10, 0));
		const seg = f.createSegment(a, b);
		const mid = f.createMidpoint(a, b);

		f.beginTransaction();
		f.remove(a); // cascades: removes a, seg, mid
		f.commit();

		expect(f.size).toBe(1); // only b

		f.undo();
		expect(f.size).toBe(4);
		expect(f.getElementById(a)).toBeDefined();
		expect(f.getElementById(seg)).toBeDefined();
		expect(f.getElementById(mid)).toBeDefined();
		expect(geoToNumber(f.getPosition(mid)!.x)).toBe(5);
	});

	it('redo re-removes after undo', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));

		f.beginTransaction();
		f.remove(a);
		f.commit();

		f.undo();
		expect(f.size).toBe(1);

		f.redo();
		expect(f.size).toBe(0);
	});
});

// =============================================================================
// Undo/Redo: stack behavior
// =============================================================================

describe('undo/redo stack', () => {
	it('canUndo is false initially', () => {
		const f = new Figure();
		expect(f.canUndo).toBe(false);
	});

	it('canRedo is false initially', () => {
		const f = new Figure();
		expect(f.canRedo).toBe(false);
	});

	it('canUndo is true after commit', () => {
		const f = new Figure();
		f.beginTransaction();
		f.createFreePoint(pt(0, 0));
		f.commit();
		expect(f.canUndo).toBe(true);
	});

	it('canRedo is true after undo', () => {
		const f = new Figure();
		f.beginTransaction();
		f.createFreePoint(pt(0, 0));
		f.commit();
		f.undo();
		expect(f.canRedo).toBe(true);
	});

	it('new commit clears redo stack', () => {
		const f = new Figure();

		f.beginTransaction();
		f.createFreePoint(pt(0, 0));
		f.commit();

		f.undo();
		expect(f.canRedo).toBe(true);

		f.beginTransaction();
		f.createFreePoint(pt(5, 5));
		f.commit();

		expect(f.canRedo).toBe(false);
	});

	it('undo when stack is empty does nothing', () => {
		const f = new Figure();
		f.undo(); // should not throw
		expect(f.size).toBe(0);
	});

	it('redo when stack is empty does nothing', () => {
		const f = new Figure();
		f.redo(); // should not throw
		expect(f.size).toBe(0);
	});

	it('multiple undo/redo cycles', () => {
		const f = new Figure();

		f.beginTransaction();
		f.createFreePoint(pt(0, 0));
		f.commit();

		f.beginTransaction();
		f.createFreePoint(pt(5, 5));
		f.commit();

		expect(f.size).toBe(2);

		f.undo(); // removes second point
		expect(f.size).toBe(1);

		f.undo(); // removes first point
		expect(f.size).toBe(0);

		f.redo(); // re-creates first point
		expect(f.size).toBe(1);

		f.redo(); // re-creates second point
		expect(f.size).toBe(2);
	});
});
