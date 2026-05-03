/**
 * Tests for `unite_angle` preservation across serialize → re-interpret round-trip.
 *
 * Without this, a script that switched into radians mode would round-trip as
 * a script in default-degrees mode, silently changing the meaning of every
 * trig call.
 *
 * V2 #1 of the dsl-mathast-routing follow-ups.
 */

import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl, parseDsl, interpretDsl } from '../index';

describe('serializeDsl — angle mode preservation', () => {
	it('default deg mode emits no unite_angle prefix (backward compat)', () => {
		const { figure, symbols, angleMode } = runDsl('A = point(0, 0)');
		expect(angleMode).toBe('deg');
		const out = serializeDsl(figure, symbols, { angleMode });
		expect(out).not.toMatch(/unite_angle/);
	});

	it('rad mode emits unite_angle("radians") on the first line', () => {
		const { figure, symbols, angleMode } = runDsl('unite_angle("radians")\nA = point(0, 0)');
		expect(angleMode).toBe('rad');
		const out = serializeDsl(figure, symbols, { angleMode });
		const firstLine = out.split('\n')[0];
		expect(firstLine).toBe('unite_angle("radians")');
	});

	it('omitting options behaves like deg (no prefix) — backward compat', () => {
		const { figure, symbols } = runDsl('unite_angle("radians")\nA = point(0, 0)');
		const out = serializeDsl(figure, symbols);
		expect(out).not.toMatch(/unite_angle/);
	});

	it('round-trip in rad mode preserves trig semantics in courbe equations', () => {
		const script = `unite_angle("radians")
f = courbe("y = sin(x)")`;
		const r1 = runDsl(script);
		const serialized = serializeDsl(r1.figure, r1.symbols, { angleMode: r1.angleMode });

		// The re-interpreted script must compute sin(π) ≈ 0 (radians), not
		// sin(π·π/180) ≈ 0.998 (degrees).
		const r2 = runDsl(serialized);
		const fId = r2.symbols.get('f')!.figureId!;
		const f = r2.figure.getElementById(fId);
		expect(f?.type).toBe('function');
		if (f && f.type === 'function') {
			expect(f.compiledFn({ x: Math.PI })).toBeCloseTo(0, 10);
			expect(f.compiledFn({ x: Math.PI / 2 })).toBeCloseTo(1, 10);
		}
	});

	it('round-trip preserves the angleMode itself', () => {
		const r1 = runDsl('unite_angle("radians")\nA = point(0, 0)');
		const serialized = serializeDsl(r1.figure, r1.symbols, { angleMode: r1.angleMode });
		const r2 = runDsl(serialized);
		expect(r2.angleMode).toBe('rad');
	});

	it('mid-script switch is collapsed to the final mode', () => {
		// Switch to radians then back to degres → final mode is deg.
		// Serialization should omit unite_angle (default).
		const { figure, symbols, angleMode } = runDsl(
			'unite_angle("radians")\nunite_angle("degres")\nA = point(0, 0)'
		);
		expect(angleMode).toBe('deg');
		const out = serializeDsl(figure, symbols, { angleMode });
		expect(out).not.toMatch(/unite_angle/);
	});

	it('interpretDsl exposes angleMode on the result', () => {
		const program = parseDsl('unite_angle("radians")');
		const result = interpretDsl(program);
		expect(result.angleMode).toBe('rad');
	});
});
