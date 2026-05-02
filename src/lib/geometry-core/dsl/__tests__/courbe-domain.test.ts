/**
 * Integration tests for `courbe()` with domain restriction:
 *  - `courbe("y = x^2 sur [-2 ; 2]")`
 *  - `courbe("y = x^2 avec a < x <= b")`
 *  - reactive bounds (sliders), serialization round-trip, error cases.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { DslRuntimeError } from '../errors';
import type { GeoFunction } from '../../types/elements';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function getFunction(figure: ReturnType<typeof run>['figure']): GeoFunction {
	const fns = figure.getAllElements().filter((e) => e.type === 'function');
	expect(fns).toHaveLength(1);
	return fns[0] as GeoFunction;
}

describe('courbe() — domain restriction with "sur" interval', () => {
	it('attaches a closed-closed domain to a function curve', () => {
		const { figure } = run('f = courbe("y = x^2 sur [-2 ; 2]")');
		const fn = getFunction(figure);
		expect(fn.domain).toBeDefined();
		expect(fn.domain!.lower).toEqual({ kind: 'numeric', value: -2 });
		expect(fn.domain!.upper).toEqual({ kind: 'numeric', value: 2 });
		expect(fn.domain!.lowerType).toBe('closed');
		expect(fn.domain!.upperType).toBe('closed');
	});

	it('attaches an open-open domain', () => {
		const { figure } = run('f = courbe("y = x^2 sur ]-2 ; 2[")');
		const fn = getFunction(figure);
		expect(fn.domain!.lowerType).toBe('open');
		expect(fn.domain!.upperType).toBe('open');
	});

	it('attaches a half-open domain ]a ; b]', () => {
		const { figure } = run('f = courbe("y = x^2 sur ]0 ; 5]")');
		const fn = getFunction(figure);
		expect(fn.domain!.lowerType).toBe('open');
		expect(fn.domain!.upperType).toBe('closed');
	});

	it('attaches a domain with negative-infinite lower bound', () => {
		const { figure } = run('f = courbe("y = x^2 sur ]-infini ; 0]")');
		const fn = getFunction(figure);
		expect(fn.domain!.lower).toEqual({ infinity: '-' });
		expect(fn.domain!.upper).toEqual({ kind: 'numeric', value: 0 });
	});

	it('attaches a domain with positive-infinite upper bound', () => {
		const { figure } = run('f = courbe("y = x^2 sur [0 ; +infini[")');
		const fn = getFunction(figure);
		expect(fn.domain!.lower).toEqual({ kind: 'numeric', value: 0 });
		expect(fn.domain!.upper).toEqual({ infinity: '+' });
	});
});

describe('courbe() — domain restriction with "avec" inequality', () => {
	it('parses a compound inequality a < x <= b', () => {
		const { figure } = run('f = courbe("y = x^2 avec -2 < x <= 2")');
		const fn = getFunction(figure);
		expect(fn.domain).toBeDefined();
		expect(fn.domain!.lower).toEqual({ kind: 'numeric', value: -2 });
		expect(fn.domain!.upper).toEqual({ kind: 'numeric', value: 2 });
		expect(fn.domain!.lowerType).toBe('open');
		expect(fn.domain!.upperType).toBe('closed');
	});

	it('parses a single-sided x > a', () => {
		const { figure } = run('f = courbe("y = x^2 avec x > 0")');
		const fn = getFunction(figure);
		expect(fn.domain!.lower).toEqual({ kind: 'numeric', value: 0 });
		expect(fn.domain!.upper).toEqual({ infinity: '+' });
		expect(fn.domain!.lowerType).toBe('open');
	});

	it('parses a single-sided x <= b', () => {
		const { figure } = run('f = courbe("y = x^2 avec x <= 5")');
		const fn = getFunction(figure);
		expect(fn.domain!.lower).toEqual({ infinity: '-' });
		expect(fn.domain!.upper).toEqual({ kind: 'numeric', value: 5 });
		expect(fn.domain!.upperType).toBe('closed');
	});
});

describe('courbe() — reactive bounds (sliders)', () => {
	it('resolves slider names to scalarRef and tracks dependencies', () => {
		const { figure } = run(`
a = slider(min=0, max=10, valeur=2)
b = slider(min=0, max=10, valeur=5)
f = courbe("y = x^2 sur ]a ; b]")
		`);
		const fn = getFunction(figure);
		expect(fn.domain).toBeDefined();
		// Both bounds should be ScalarRef
		expect((fn.domain!.lower as { scalarRef: string }).scalarRef).toMatch(/^/);
		expect((fn.domain!.upper as { scalarRef: string }).scalarRef).toMatch(/^/);
		// dependsOn should contain both slider ids
		expect(fn.dependsOn.length).toBe(2);
	});

	it('reactive bound recomputes when slider value changes', () => {
		const { figure } = run(`
a = slider(min=-10, max=10, valeur=-2)
f = courbe("y = x^2 sur [a ; 2]")
		`);
		const fn = getFunction(figure);
		const lowerRef = (fn.domain!.lower as { scalarRef: string }).scalarRef;

		// Initial: a = -2
		expect(figure.resolveParam(fn.domain!.lower)).toBe(-2);

		// Change slider value
		figure.moveSlider(lowerRef, 1);
		expect(figure.resolveParam(fn.domain!.lower)).toBe(1);
	});

	it('combines slider with literal in compound inequality', () => {
		const { figure } = run(`
a = slider(min=0, max=10, valeur=3)
f = courbe("y = sin(x) avec -a < x <= 5")
		`);
		const fn = getFunction(figure);
		// lower bound is the symbolic -a (exact node), upper is numeric 5
		expect(fn.domain!.upper).toEqual({ kind: 'numeric', value: 5 });
		// `dependsOn` collects the slider id `a` even though `-a` becomes a
		// symbolic MathNode rather than a direct ScalarRef — this guarantees
		// the figure re-renders when the slider moves.
		expect(fn.dependsOn.length).toBe(1);
	});
});

describe('courbe() — affine functions with domain become bounded curves', () => {
	it('treats `y = 2*x + 1 sur [-2 ; 2]` as a function (not a line) — yielding a bounded segment-like curve', () => {
		const { figure } = run('f = courbe("y = 2*x + 1 sur [-2 ; 2]")');
		const fns = figure.getAllElements().filter((e) => e.type === 'function');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(fns).toHaveLength(1);
		expect(lines).toHaveLength(0);
	});
});

describe('courbe() — non-function curves reject domain', () => {
	it('rejects domain restriction on a conic', () => {
		expect(() => run('c = courbe("x^2 + y^2 = 4 sur [-2 ; 2]")')).toThrow(DslRuntimeError);
	});
});

describe('courbe() — error cases on domain syntax', () => {
	it('throws on inverted bounds [5 ; 0]', () => {
		expect(() => run('f = courbe("y = x^2 sur [5 ; 0]")')).toThrow(/Domaine invalide/);
	});

	it('throws on malformed interval (missing bracket)', () => {
		expect(() => run('f = courbe("y = x^2 sur 0 ; 5")')).toThrow();
	});

	it('throws on equality "x = 5"', () => {
		expect(() => run('f = courbe("y = x^2 avec x = 5")')).toThrow(/Condition non reconnue/);
	});

	it('throws on non-x variable in condition', () => {
		expect(() => run('f = courbe("y = x^2 avec y > 0")')).toThrow(/Condition non reconnue/);
	});
});

describe('courbe() — serialization round-trip', () => {
	it('preserves domain in serialized output (sur form)', async () => {
		const { figure } = run('f = courbe("y = x^2 sur [-2 ; 2]")');
		const { serialize } = await import('../serializer');
		const dsl = serialize(figure);
		expect(dsl).toContain('courbe("y = x^2 sur [-2 ; 2]")');
	});

	it('preserves domain in serialized output (avec form)', async () => {
		const { figure } = run('f = courbe("y = x^2 avec -2 < x <= 2")');
		const { serialize } = await import('../serializer');
		const dsl = serialize(figure);
		expect(dsl).toContain('courbe("y = x^2 avec -2 < x <= 2")');
	});

	it('preserves slider references in serialized output', async () => {
		const { figure } = run(`
a = slider(min=0, max=10, valeur=2)
b = slider(min=0, max=10, valeur=5)
f = courbe("y = x^2 sur ]a ; b]")
		`);
		const { serialize } = await import('../serializer');
		const dsl = serialize(figure);
		expect(dsl).toContain('courbe("y = x^2 sur ]a ; b]")');
	});

	it('round-trip: parse → serialize → parse produces equivalent figure', async () => {
		const original = 'f = courbe("y = x^2 sur [-2 ; 2]")';
		const { figure: f1 } = run(original);
		const { serialize } = await import('../serializer');
		const dsl = serialize(f1);

		// Re-parse the serialized DSL
		const { figure: f2 } = run(dsl);
		const fns = f2.getAllElements().filter((e) => e.type === 'function') as GeoFunction[];
		expect(fns).toHaveLength(1);
		expect(fns[0].domain).toBeDefined();
		expect(fns[0].domain!.lower).toEqual({ kind: 'numeric', value: -2 });
		expect(fns[0].domain!.upper).toEqual({ kind: 'numeric', value: 2 });
	});
});

describe('courbe() — backwards compatibility (no domain)', () => {
	it('still works for plain function without domain', () => {
		const { figure } = run('f = courbe("y = x^2")');
		const fn = getFunction(figure);
		expect(fn.domain).toBeUndefined();
		expect(fn.dependsOn).toEqual([]);
	});

	it('still works for line', () => {
		const { figure } = run('d = courbe("y = 2*x + 1")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);
	});
});
