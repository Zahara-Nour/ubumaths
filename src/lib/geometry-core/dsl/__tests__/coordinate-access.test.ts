/**
 * Tests for reactive coordinate access (A.x, A.y) in the DSL.
 *
 * Covers: property access returning reactive scalars, computed points,
 * reactivity on move, arithmetic with coordinates, serialization roundtrip.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { serialize } from '../serializer';
import { geoToNumber } from '../../compute/to-number';
import { numeric } from '../../types/geo-value';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function sym(result: ReturnType<typeof run>, name: string) {
	return result.symbols.allEntries().get(name);
}

function getPos(result: ReturnType<typeof run>, name: string) {
	const entry = sym(result, name);
	if (!entry?.figureId) throw new Error(`Symbol "${name}" not found`);
	const pos = result.figure.getPosition(entry.figureId);
	if (!pos) throw new Error(`No position for "${name}"`);
	return { x: geoToNumber(pos.x), y: geoToNumber(pos.y) };
}

// =============================================================================
// A. Property access returns reactive scalar
// =============================================================================

describe('DSL: coordinate access (A.x, A.y)', () => {
	it('A.x returns correct scalar value', () => {
		const r = run(['A = point(3, 5)', 'n = A.x'].join('\n'));
		const s = sym(r, 'n');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(3, 10);
	});

	it('A.y returns correct scalar value', () => {
		const r = run(['A = point(3, 5)', 'n = A.y'].join('\n'));
		const s = sym(r, 'n');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(5, 10);
	});

	it('coordinate scalar updates when point moves', () => {
		const r = run(['A = point(3, 5)', 'n = A.x'].join('\n'));
		const s = sym(r, 'n')!;
		const pointId = sym(r, 'A')!.figureId!;

		r.figure.beginTransaction();
		r.figure.movePoint(pointId, numeric(7), numeric(2));
		r.figure.recompute();
		r.figure.commit();

		expect(r.figure.getScalarValue(s.figureId!)).toBeCloseTo(7, 10);
	});

	it('unknown property throws error', () => {
		expect(() => run(['A = point(1, 2)', 'n = A.z'].join('\n'))).toThrow(DslRuntimeError);
		expect(() => run(['A = point(1, 2)', 'n = A.z'].join('\n'))).toThrow(/Propriete inconnue/);
	});
});

// =============================================================================
// B. Computed points via point(A.x, B.y)
// =============================================================================

describe('DSL: computed point with coordinate access', () => {
	it('point(A.x, B.y) creates a computed point at correct position', () => {
		const r = run(['A = point(3, 5)', 'B = point(7, 2)', 'C = point(A.x, B.y)'].join('\n'));
		const pos = getPos(r, 'C');
		expect(pos.x).toBeCloseTo(3, 10);
		expect(pos.y).toBeCloseTo(2, 10);
	});

	it('computed point is not draggable', () => {
		const r = run(['A = point(3, 5)', 'B = point(7, 2)', 'C = point(A.x, B.y)'].join('\n'));
		const el = r.figure.getElementById(sym(r, 'C')!.figureId!);
		expect(el!.type).toBe('computedPoint');
		if (el!.type === 'computedPoint') {
			expect(el!.draggable).toBe(false);
		}
	});

	it('computed point updates when A moves', () => {
		const r = run(['A = point(3, 5)', 'B = point(7, 2)', 'C = point(A.x, B.y)'].join('\n'));
		const aId = sym(r, 'A')!.figureId!;

		r.figure.beginTransaction();
		r.figure.movePoint(aId, numeric(10), numeric(0));
		r.figure.recompute();
		r.figure.commit();

		const pos = getPos(r, 'C');
		expect(pos.x).toBeCloseTo(10, 10);
		expect(pos.y).toBeCloseTo(2, 10);
	});

	it('computed point updates when B moves', () => {
		const r = run(['A = point(3, 5)', 'B = point(7, 2)', 'C = point(A.x, B.y)'].join('\n'));
		const bId = sym(r, 'B')!.figureId!;

		r.figure.beginTransaction();
		r.figure.movePoint(bId, numeric(0), numeric(-4));
		r.figure.recompute();
		r.figure.commit();

		const pos = getPos(r, 'C');
		expect(pos.x).toBeCloseTo(3, 10);
		expect(pos.y).toBeCloseTo(-4, 10);
	});

	it('point(2, B.y) — mixed static/reactive', () => {
		const r = run(['B = point(7, 2)', 'C = point(2, B.y)'].join('\n'));
		const pos = getPos(r, 'C');
		expect(pos.x).toBeCloseTo(2, 10);
		expect(pos.y).toBeCloseTo(2, 10);

		const bId = sym(r, 'B')!.figureId!;
		r.figure.beginTransaction();
		r.figure.movePoint(bId, numeric(0), numeric(9));
		r.figure.recompute();
		r.figure.commit();

		const pos2 = getPos(r, 'C');
		expect(pos2.x).toBeCloseTo(2, 10);
		expect(pos2.y).toBeCloseTo(9, 10);
	});

	it('point(2, 3) still creates a freePoint (backward compat)', () => {
		const r = run('C = point(2, 3)');
		const el = r.figure.getElementById(sym(r, 'C')!.figureId!);
		expect(el!.type).toBe('freePoint');
	});
});

// =============================================================================
// C. Arithmetic with coordinate access
// =============================================================================

describe('DSL: coordinate arithmetic', () => {
	it('point(A.x + 1, A.y) creates offset point', () => {
		const r = run(['A = point(3, 5)', 'C = point(A.x + 1, A.y)'].join('\n'));
		const pos = getPos(r, 'C');
		expect(pos.x).toBeCloseTo(4, 10);
		expect(pos.y).toBeCloseTo(5, 10);
	});

	it('offset point is reactive', () => {
		const r = run(['A = point(3, 5)', 'C = point(A.x + 1, A.y * 2)'].join('\n'));
		const aId = sym(r, 'A')!.figureId!;

		r.figure.beginTransaction();
		r.figure.movePoint(aId, numeric(10), numeric(3));
		r.figure.recompute();
		r.figure.commit();

		const pos = getPos(r, 'C');
		expect(pos.x).toBeCloseTo(11, 10);
		expect(pos.y).toBeCloseTo(6, 10);
	});
});

// =============================================================================
// D. Serialization roundtrip
// =============================================================================

describe('DSL: coordinate access serialization', () => {
	it('point(A.x, B.y) serializes correctly', () => {
		const r = run(['A = point(3, 5)', 'B = point(7, 2)', 'C = point(A.x, B.y)'].join('\n'));
		const output = serialize(r.figure, r.symbols);
		expect(output).toContain('C = point(A.x, B.y)');
	});

	it('roundtrip: parse → serialize → parse produces same result', () => {
		const script = ['A = point(3, 5)', 'B = point(7, 2)', 'C = point(A.x, B.y)'].join('\n');
		const r1 = run(script);
		const serialized = serialize(r1.figure, r1.symbols);

		const r2 = run(serialized);
		const pos1 = getPos(r1, 'C');
		const pos2 = getPos(r2, 'C');
		expect(pos2.x).toBeCloseTo(pos1.x, 10);
		expect(pos2.y).toBeCloseTo(pos1.y, 10);
	});
});
