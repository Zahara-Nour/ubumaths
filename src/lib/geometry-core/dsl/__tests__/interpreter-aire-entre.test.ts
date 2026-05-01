/**
 * Phase 2 — DSL builtin `aire_entre(f, g, a, b)`.
 *
 * Routes to `figure.createIntegralArea(fId, lower, upper, { secondFunctionId: gId, ... })`.
 * Spec: `docs/wip/geometry/aire-entre-study.md` §3 (API DSL) + §0 décisions.
 *
 * Red-first TDD. Tests must fail before the case 'aire_entre' is added to builtins.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runDsl } from '..';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	return runDsl(script);
}

// =============================================================================
// A. Parsing and basic call
// =============================================================================

describe('aire_entre() — parsing and basic call', () => {
	it('A1: aire_entre(f, g, 0, 1) parses and returns a scalar symbol', () => {
		const { symbols } = run(
			`f = courbe("y = x^2")
g = courbe("y = x^3")
A = aire_entre(f, g, 0, 1)`
		);
		const A = symbols.get('A');
		expect(A).toBeDefined();
		expect(A!.type).toBe('scalar');
		expect(A!.figureId).toBeDefined();
	});

	it('A2: a GeoIntegralArea (mode V3 with secondFunctionId) is created internally', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
g = courbe("y = x^3")
A = aire_entre(f, g, 0, 1)`
		);
		const fId = symbols.get('f')!.figureId!;
		const gId = symbols.get('g')!.figureId!;
		const areas = figure.getAllElements().filter((e) => e.type === 'integralArea');
		expect(areas).toHaveLength(1);
		const area = areas[0] as unknown as {
			signed: boolean;
			functionId: string;
			secondFunctionId?: string;
		};
		expect(area.signed).toBe(false);
		expect(area.functionId).toBe(fId);
		expect(area.secondFunctionId).toBe(gId);
	});
});

// =============================================================================
// B. Compute correctness — pedagogical cases
// =============================================================================

describe('aire_entre() — compute correctness', () => {
	it('B1: aire_entre(x², x³, 0, 1) = 1/12 (cas Terminale)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
g = courbe("y = x^3")
A = aire_entre(f, g, 0, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1 / 12, 6);
	});

	it('B2: aire_entre(sin, cos, π/4, 5π/4) = 2√2', () => {
		// Le DSL n'expose pas la constante `pi` ; on injecte la valeur numérique
		// via l'interpolation JS du template (cohérent avec aire-undercurve.test.ts).
		const lo = Math.PI / 4;
		const hi = (5 * Math.PI) / 4;
		const { figure, symbols } = run(
			`f = courbe("y = sin(x)")
g = courbe("y = cos(x)")
A = aire_entre(f, g, ${lo}, ${hi})`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(2 * Math.sqrt(2), 5);
	});

	it('B3: aire_entre with sliders is reactive', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
g = courbe("y = x^3")
b = slider(min=0, max=2, valeur=1)
A = aire_entre(f, g, 0, b)`
		);
		const aId = symbols.get('A')!.figureId!;
		const bId = symbols.get('b')!.figureId!;
		// At b=1: aire = 1/12.
		expect(figure.getScalarValue(aId)).toBeCloseTo(1 / 12, 6);
		// Move b to 2 : h = x²-x³, sur [0, 1] h ≥ 0, sur [1, 2] h ≤ 0.
		// aire = ∫_0^1 (x²-x³) dx + |∫_1^2 (x²-x³) dx|
		//      = 1/12 + |[x³/3 - x⁴/4]_1^2|
		//      = 1/12 + |(8/3 - 4) - (1/3 - 1/4)|
		//      = 1/12 + |8/3 - 4 - 1/3 + 1/4|
		//      = 1/12 + |7/3 - 4 + 1/4|
		//      = 1/12 + |7/3 - 15/4|
		//      = 1/12 + |28/12 - 45/12|
		//      = 1/12 + 17/12 = 18/12 = 3/2.
		figure.beginTransaction();
		figure.moveSlider(bId, 2);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(aId)).toBeCloseTo(3 / 2, 5);
	});

	it('B4: aire_entre(f, f, 0, 1) = 0 (autorisé, Q-C validée)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = aire_entre(f, f, 0, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(0, 9);
	});
});

// =============================================================================
// C. Style and default color
// =============================================================================

describe('aire_entre() — inline style and default color', () => {
	it('C1: default color is orange (#fb923c)', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
g = courbe("y = x^3")
A = aire_entre(f, g, 0, 1)`
		);
		const area = figure.getAllElements().find((e) => e.type === 'integralArea');
		expect((area as { color?: string }).color).toBe('#fb923c');
	});

	it('C2: explicit couleur overrides the orange default', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
g = courbe("y = x^3")
A = aire_entre(f, g, 0, 1, couleur="rouge")`
		);
		const area = figure.getAllElements().find((e) => e.type === 'integralArea') as unknown as {
			color?: string;
			style?: { color?: string };
		};
		// applyInlineStyle pose el.style.color, qui prime sur el.color au rendu.
		expect(area.style?.color).toBeDefined();
		expect(area.style?.color).not.toBe('#fb923c');
	});

	it('C3: opacite_fond named arg sets the area fillOpacity', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
g = courbe("y = x^3")
A = aire_entre(f, g, 0, 1, opacite_fond=0.5)`
		);
		const area = figure.getAllElements().find((e) => e.type === 'integralArea');
		expect((area as { style?: { fillOpacity?: number } }).style?.fillOpacity).toBe(0.5);
	});

	it('C4: integrale stays blue, aire green, aire_entre orange — triade pédagogique', () => {
		const { figure } = run(
			`f = courbe("y = sin(x)")
g = courbe("y = cos(x)")
I = integrale(f, 0, 1)
S = aire(f, 0, 1)
E = aire_entre(f, g, 0, 1)`
		);
		const areas = figure.getAllElements().filter((e) => e.type === 'integralArea') as unknown as {
			signed: boolean;
			secondFunctionId?: string;
			color?: string;
		}[];
		expect(areas).toHaveLength(3);
		const aireEntreArea = areas.find((a) => a.secondFunctionId !== undefined);
		const aireArea = areas.find((a) => a.signed === false && a.secondFunctionId === undefined);
		const integraleArea = areas.find((a) => a.signed === true);
		expect(aireEntreArea?.color).toBe('#fb923c');
		expect(aireArea?.color).toBe('#22c55e');
		expect(integraleArea?.color).not.toBe('#fb923c');
		expect(integraleArea?.color).not.toBe('#22c55e');
	});
});

// =============================================================================
// D. Validation errors
// =============================================================================

describe('aire_entre() — validation errors', () => {
	it('D1: 3 args throws "attend 4 arguments"', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
g = courbe("y = x^3")
A = aire_entre(f, g, 0)`
			)
		).toThrow(DslRuntimeError);
	});

	it('D2: 5 args throws "attend 4 arguments"', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
g = courbe("y = x^3")
A = aire_entre(f, g, 0, 1, 2)`
			)
		).toThrow(DslRuntimeError);
	});

	it('D3: arg 1 not a courbe throws clear error mentioning "fonction 1" or similar', () => {
		expect(() =>
			run(
				`P = point(0, 0)
g = courbe("y = x^3")
A = aire_entre(P, g, 0, 1)`
			)
		).toThrow(/courbe|fonction/i);
	});

	it('D4: arg 2 not a courbe throws clear error mentioning g', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
P = point(0, 0)
A = aire_entre(f, P, 0, 1)`
			)
		).toThrow(/courbe|fonction/i);
	});

	it('D5: arg 3 (lower bound) not a number/scalar throws clear error', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
g = courbe("y = x^3")
P = point(0, 0)
A = aire_entre(f, g, P, 1)`
			)
		).toThrow(/borne|nombre|curseur/i);
	});

	it('D6: arg 4 (upper bound) not a number/scalar throws clear error', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
g = courbe("y = x^3")
P = point(0, 0)
A = aire_entre(f, g, 0, P)`
			)
		).toThrow(/borne|nombre|curseur/i);
	});
});

// =============================================================================
// E. Singularity warn — 2 calls (on f and g, not on h)
// =============================================================================

describe('aire_entre() — singularity warn (2 calls on f and g)', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('E1: emits warn when f has a pole in [a, b]', () => {
		run(
			`f = courbe("y = 1/x")
g = courbe("y = sin(x)")
A = aire_entre(f, g, -1, 1)`
		);
		expect(warnSpy).toHaveBeenCalled();
		const messages = warnSpy.mock.calls.map((c) => c[0] as string);
		// Au moins un warn parle de "aire_entre" (pas "aire" ni "integrale")
		expect(messages.some((m) => /aire_entre/.test(m))).toBe(true);
	});

	it('E2: warn prefix is "aire_entre ligne X:" (not "aire" alone, not "integrale")', () => {
		run(
			`f = courbe("y = 1/x")
g = courbe("y = sin(x)")
A = aire_entre(f, g, -1, 1)`
		);
		const messages = warnSpy.mock.calls.map((c) => c[0] as string);
		// Format `<builtin> ligne <N>:` — N pas codé en dur pour ne pas être fragile aux
		// reformatages de la fixture.
		const aireEntreMessages = messages.filter((m) => /aire_entre ligne \d+:/.test(m));
		expect(aireEntreMessages.length).toBeGreaterThan(0);
		// Pas de warn préfixé "integrale ligne X" (Phase 2 utilise un préfixe distinct)
		expect(messages.some((m) => /^integrale ligne/.test(m))).toBe(false);
	});

	it('E5: emits warn when g (not f) has a pole in [a, b]', () => {
		// Symétrique de E1 : on vérifie que le 2e appel à warnIfSingularitySuspected
		// (sur g) fonctionne aussi.
		run(
			`f = courbe("y = sin(x)")
g = courbe("y = 1/x")
A = aire_entre(f, g, -1, 1)`
		);
		expect(warnSpy).toHaveBeenCalled();
		const messages = warnSpy.mock.calls.map((c) => c[0] as string);
		expect(messages.some((m) => /aire_entre/.test(m))).toBe(true);
	});

	it('E3: does NOT warn when f and g are both clean on [a, b]', () => {
		run(
			`f = courbe("y = x^2")
g = courbe("y = x^3")
A = aire_entre(f, g, 0, 1)`
		);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('E4: NaN-on-divergence: f=1/x, g=sin(x) sur [-1,1] → A = NaN', () => {
		const { figure, symbols } = run(
			`f = courbe("y = 1/x")
g = courbe("y = sin(x)")
A = aire_entre(f, g, -1, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		const v = figure.getScalarValue(aId);
		expect(Number.isNaN(v as number)).toBe(true);
	});
});
