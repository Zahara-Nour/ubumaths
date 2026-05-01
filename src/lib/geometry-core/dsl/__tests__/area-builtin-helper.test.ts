/**
 * Phase 1 — Tests for `interpretAreaBuiltin` (refactor V4).
 *
 * Spec: docs/wip/geometry/refactor-area-builtins-study.md §5 Phase 1.
 *
 * Covers the 13 behaviors validated with the user:
 *   A. Three modes (integrale, aire, aire_entre) — nominal flow.
 *   B. Bound resolution (number, slider, invalid).
 *   C. Discontinuity cache propagation.
 *   D. Internal guard (g + signed=true).
 *   E. Singularity warns (count + builtin name).
 *   F. Factory error re-throw with prefix.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runDsl } from '..';
import { DslRuntimeError } from '../errors';
import { interpretAreaBuiltin, type InterpretAreaBuiltinOpts } from '../area-builtin-helper';
import type { GeoFunction, GeoIntegralArea } from '../../types/elements';

/**
 * Build a Figure pre-populated with the given DSL setup script (functions,
 * sliders…), then return a helper that calls `interpretAreaBuiltin` with the
 * provided opts. Keeps tests close to the existing `interpreter-*.test.ts`
 * style (DSL setup, then assertions on Figure state).
 */
function setupFigure(setupScript: string) {
	const { figure, symbols } = runDsl(setupScript);
	const getFn = (name: string): { id: string; expression: import('$lib/mathAST').MathNode } => {
		const sym = symbols.get(name);
		if (!sym?.figureId) throw new Error(`setupFigure: missing symbol "${name}"`);
		const el = figure.getElementById(sym.figureId);
		if (!el || el.type !== 'function') {
			throw new Error(`setupFigure: symbol "${name}" is not a function`);
		}
		return { id: sym.figureId, expression: (el as GeoFunction).expression };
	};
	const idOf = (name: string): string => {
		const sym = symbols.get(name);
		if (!sym?.figureId) throw new Error(`setupFigure: missing symbol "${name}"`);
		return sym.figureId;
	};
	return { figure, symbols, getFn, idOf };
}

// =============================================================================
// A. Three modes — nominal flow
// =============================================================================

describe('interpretAreaBuiltin — A. three modes', () => {
	it('A1: integrale mode (signed=true, no g, no defaultColor) → scalar = 8/3, area without explicit color override', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = x^2")`);
		const result = interpretAreaBuiltin({
			name: 'integrale',
			f: getFn('f'),
			lowerArg: { type: 'nombre', value: 0 },
			upperArg: { type: 'nombre', value: 2 },
			signed: true,
			line: 1,
			figure
		});
		expect(result.symbolType).toBe('scalar');
		expect(result.figureId).toBeDefined();
		expect(result.styleTargetId).toBeDefined();
		expect(result.styleTargetId).not.toBe(result.figureId);
		expect(figure.getScalarValue(result.figureId)).toBeCloseTo(8 / 3, 6);
		const area = figure.getElementById(result.styleTargetId) as GeoIntegralArea;
		expect(area.type).toBe('integralArea');
		expect(area.signed).toBe(true);
		expect(area.secondFunctionId).toBeUndefined();
	});

	it('A2: aire mode (signed=false, no g, defaultColor=#22c55e) → green area, scalar = 8/3', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = x^2")`);
		const result = interpretAreaBuiltin({
			name: 'aire',
			f: getFn('f'),
			lowerArg: { type: 'nombre', value: 0 },
			upperArg: { type: 'nombre', value: 2 },
			signed: false,
			defaultColor: '#22c55e',
			line: 1,
			figure
		});
		expect(figure.getScalarValue(result.figureId)).toBeCloseTo(8 / 3, 6);
		const area = figure.getElementById(result.styleTargetId) as GeoIntegralArea;
		expect(area.signed).toBe(false);
		expect(area.color).toBe('#22c55e');
		expect(area.secondFunctionId).toBeUndefined();
	});

	it('A3: aire_entre mode (signed=false, g present, defaultColor=#fb923c) → orange area between f and g', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = x^2")
g = courbe("y = x^3")`);
		const fRef = getFn('f');
		const gRef = getFn('g');
		const result = interpretAreaBuiltin({
			name: 'aire_entre',
			f: fRef,
			g: gRef,
			lowerArg: { type: 'nombre', value: 0 },
			upperArg: { type: 'nombre', value: 1 },
			signed: false,
			defaultColor: '#fb923c',
			line: 1,
			figure
		});
		// Aire entre x² et x³ sur [0,1] = 1/12 (cas Terminale).
		expect(figure.getScalarValue(result.figureId)).toBeCloseTo(1 / 12, 6);
		const area = figure.getElementById(result.styleTargetId) as GeoIntegralArea;
		expect(area.signed).toBe(false);
		expect(area.color).toBe('#fb923c');
		expect(area.secondFunctionId).toBe(gRef.id);
		expect(area.functionId).toBe(fRef.id);
	});
});

// =============================================================================
// B. Bound resolution
// =============================================================================

describe('interpretAreaBuiltin — B. bound resolution', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		// Suppress expected singularity warns for tests in this section that
		// happen to involve clean integrands — keeps test output silent.
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('B4: numeric bounds are forwarded as numeric ScalarParam', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = x^2")`);
		const result = interpretAreaBuiltin({
			name: 'integrale',
			f: getFn('f'),
			lowerArg: { type: 'nombre', value: 0 },
			upperArg: { type: 'nombre', value: 3 },
			signed: true,
			line: 1,
			figure
		});
		// ∫₀³ x² dx = 9.
		expect(figure.getScalarValue(result.figureId)).toBeCloseTo(9, 6);
	});

	it('B5: slider bound stays reactive (slider move updates the area scalar)', () => {
		const { figure, getFn, idOf } = setupFigure(`f = courbe("y = x^2")
b = slider(min=0, max=3, valeur=2)`);
		const bId = idOf('b');
		const result = interpretAreaBuiltin({
			name: 'integrale',
			f: getFn('f'),
			lowerArg: { type: 'nombre', value: 0 },
			upperArg: { type: 'element', figureId: bId, elementType: 'slider' },
			signed: true,
			line: 1,
			figure
		});
		// b=2 ⇒ ∫₀² x² = 8/3.
		expect(figure.getScalarValue(result.figureId)).toBeCloseTo(8 / 3, 6);
		figure.beginTransaction();
		figure.moveSlider(bId, 3);
		figure.recompute();
		figure.commit();
		// b=3 ⇒ ∫₀³ x² = 9.
		expect(figure.getScalarValue(result.figureId)).toBeCloseTo(9, 6);
	});

	it.each(['integrale', 'aire', 'aire_entre'] as const)(
		'B6: %s — bound that is an element but not scalar/slider throws DslRuntimeError with correct prefix',
		(name) => {
			const { figure, getFn, idOf } = setupFigure(`f = courbe("y = x^2")
g = courbe("y = x^3")
P = point(1, 2)`);
			const isAireEntre = name === 'aire_entre';
			expect(() =>
				interpretAreaBuiltin({
					name,
					f: getFn('f'),
					g: isAireEntre ? getFn('g') : undefined,
					lowerArg: { type: 'element', figureId: idOf('P'), elementType: 'point' },
					upperArg: { type: 'nombre', value: 1 },
					signed: name === 'integrale',
					line: 7,
					figure
				})
			).toThrow(
				new DslRuntimeError(
					`${name}(): la borne inferieure doit etre un nombre ou un curseur/scalaire`,
					7
				)
			);
		}
	);

	it('B7: ResolvedValue of an unsupported type (string) throws with correct prefix', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = x^2")`);
		expect(() =>
			interpretAreaBuiltin({
				name: 'aire',
				f: getFn('f'),
				lowerArg: { type: 'string', value: 'zero' },
				upperArg: { type: 'nombre', value: 1 },
				signed: false,
				line: 3,
				figure
			})
		).toThrow(
			new DslRuntimeError(
				'aire(): la borne inferieure doit etre un nombre ou un curseur/scalaire',
				3
			)
		);
	});
});

// =============================================================================
// C. Discontinuity cache propagation
// =============================================================================

describe('interpretAreaBuiltin — C. discontinuity cache', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('C8: divergent pole inside [a,b] → factory consults the cache and yields NaN (signed mode)', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = 1/x")`);
		const result = interpretAreaBuiltin({
			name: 'integrale',
			f: getFn('f'),
			lowerArg: { type: 'nombre', value: -1 },
			upperArg: { type: 'nombre', value: 1 },
			signed: true,
			line: 1,
			figure
		});
		expect(Number.isNaN(figure.getScalarValue(result.figureId))).toBe(true);
	});

	it('C9: clean integrand → finite scalar', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = x^2")`);
		const result = interpretAreaBuiltin({
			name: 'integrale',
			f: getFn('f'),
			lowerArg: { type: 'nombre', value: 0 },
			upperArg: { type: 'nombre', value: 1 },
			signed: true,
			line: 1,
			figure
		});
		const v = figure.getScalarValue(result.figureId);
		expect(Number.isFinite(v)).toBe(true);
		expect(v).toBeCloseTo(1 / 3, 6);
	});
});

// =============================================================================
// D. Internal guard
// =============================================================================

describe('interpretAreaBuiltin — D. internal guard', () => {
	it('D10: g + signed=true throws a plain Error (caller bug, not DslRuntimeError)', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = x^2")
g = courbe("y = x^3")`);
		const opts: InterpretAreaBuiltinOpts = {
			name: 'aire_entre',
			f: getFn('f'),
			g: getFn('g'),
			lowerArg: { type: 'nombre', value: 0 },
			upperArg: { type: 'nombre', value: 1 },
			signed: true, // illegal combination
			line: 1,
			figure
		};
		expect(() => interpretAreaBuiltin(opts)).toThrow(
			'interpretAreaBuiltin: g + signed=true non supporté'
		);
		// Confirm it's NOT a DslRuntimeError (caller bug, not user-facing).
		try {
			interpretAreaBuiltin(opts);
		} catch (e) {
			expect(e).toBeInstanceOf(Error);
			expect(e).not.toBeInstanceOf(DslRuntimeError);
		}
	});
});

// =============================================================================
// E. Singularity warns
// =============================================================================

describe('interpretAreaBuiltin — E. singularity warns', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('E11a: integrale on 1/x over [-1,1] → exactly 1 warn, message contains "integrale"', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = 1/x")`);
		interpretAreaBuiltin({
			name: 'integrale',
			f: getFn('f'),
			lowerArg: { type: 'nombre', value: -1 },
			upperArg: { type: 'nombre', value: 1 },
			signed: true,
			line: 1,
			figure
		});
		expect(warnSpy).toHaveBeenCalledTimes(1);
		const msg = String(warnSpy.mock.calls[0][0]);
		expect(msg).toContain('integrale');
	});

	it('E11b: aire on 1/x over [-1,1] → exactly 1 warn, message contains "aire"', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = 1/x")`);
		interpretAreaBuiltin({
			name: 'aire',
			f: getFn('f'),
			lowerArg: { type: 'nombre', value: -1 },
			upperArg: { type: 'nombre', value: 1 },
			signed: false,
			defaultColor: '#22c55e',
			line: 1,
			figure
		});
		expect(warnSpy).toHaveBeenCalledTimes(1);
		const msg = String(warnSpy.mock.calls[0][0]);
		expect(msg).toContain('aire');
	});

	it('E12: aire_entre with both f=1/x and g=1/(x-0.5) → exactly 2 warns, both contain "aire_entre"', () => {
		const { figure, getFn } = setupFigure(`f = courbe("y = 1/x")
g = courbe("y = 1/(x - 0.5)")`);
		interpretAreaBuiltin({
			name: 'aire_entre',
			f: getFn('f'),
			g: getFn('g'),
			lowerArg: { type: 'nombre', value: -1 },
			upperArg: { type: 'nombre', value: 1 },
			signed: false,
			defaultColor: '#fb923c',
			line: 1,
			figure
		});
		expect(warnSpy).toHaveBeenCalledTimes(2);
		const msg0 = String(warnSpy.mock.calls[0][0]);
		const msg1 = String(warnSpy.mock.calls[1][0]);
		expect(msg0).toContain('aire_entre');
		expect(msg1).toContain('aire_entre');
	});
});

// =============================================================================
// F. Factory error re-throw
// =============================================================================

describe('interpretAreaBuiltin — F. factory error re-throw', () => {
	it('F13: factory throw is re-thrown as DslRuntimeError with builtin prefix', () => {
		// Helper-level validation (resolveBoundParam) catches invalid bounds
		// before they reach the factory, so to exercise the factory-throw branch
		// we spy on createIntegralArea and force a throw from there.
		const { figure, getFn } = setupFigure(`f = courbe("y = x^2")`);
		const spy = vi.spyOn(figure, 'createIntegralArea').mockImplementation(() => {
			throw new Error('boom');
		});
		expect(() =>
			interpretAreaBuiltin({
				name: 'integrale',
				f: getFn('f'),
				lowerArg: { type: 'nombre', value: 0 },
				upperArg: { type: 'nombre', value: 1 },
				signed: true,
				line: 42,
				figure
			})
		).toThrow(new DslRuntimeError('integrale(): boom', 42));
		spy.mockRestore();
	});
});
