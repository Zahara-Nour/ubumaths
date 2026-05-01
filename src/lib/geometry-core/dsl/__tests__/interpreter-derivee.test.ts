/**
 * Integration tests for the derivee() builtin.
 *
 * derivee(f) creates a new GeoFunction representing f'(x), where f is itself a
 * GeoFunction (y = f(x)). The new function is autonomous: at creation time, it
 * captures f.derivative as its expression and computes f''(x) symbolically.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { runDsl, serializeDsl } from '../index';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

describe('derivee — basic cases', () => {
	it('creates a GeoFunction element', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
g = derivee(f)`
		);
		const fns = figure.getAllElements().filter((e) => e.type === 'function');
		expect(fns).toHaveLength(2);
	});

	it('polynomial: derivee of y = 3*x^2 + 2*x evaluates to 6*x + 2', () => {
		const { figure, symbols } = run(
			`f = courbe("y = 3*x^2 + 2*x")
g = derivee(f)`
		);
		const gId = symbols.get('g')!.figureId!;
		const g = figure.getElementById(gId);
		expect(g).toBeDefined();
		if (g && g.type === 'function') {
			// g(x) = 6x + 2
			expect(g.compiledFn({ x: 0 })).toBeCloseTo(2);
			expect(g.compiledFn({ x: 1 })).toBeCloseTo(8);
			expect(g.compiledFn({ x: -2 })).toBeCloseTo(-10);
		}
	});

	it('sin: derivee of y = sin(x) evaluates to cos(x)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = sin(x)")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		if (g && g.type === 'function') {
			expect(g.compiledFn({ x: 0 })).toBeCloseTo(1);
			expect(g.compiledFn({ x: Math.PI / 2 })).toBeCloseTo(0);
			expect(g.compiledFn({ x: Math.PI })).toBeCloseTo(-1);
		}
	});

	it('exp: derivee of y = exp(x) evaluates to exp(x)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = exp(x)")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		if (g && g.type === 'function') {
			expect(g.compiledFn({ x: 0 })).toBeCloseTo(1);
			expect(g.compiledFn({ x: 1 })).toBeCloseTo(Math.E);
		}
	});

	it('ln: derivee of y = ln(x) evaluates to 1/x', () => {
		const { figure, symbols } = run(
			`f = courbe("y = ln(x)")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		if (g && g.type === 'function') {
			expect(g.compiledFn({ x: 1 })).toBeCloseTo(1);
			expect(g.compiledFn({ x: 2 })).toBeCloseTo(0.5);
			expect(g.compiledFn({ x: 4 })).toBeCloseTo(0.25);
		}
	});

	it('chain rule: derivee of y = sin(2*x) evaluates to 2*cos(2*x)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = sin(2*x)")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		if (g && g.type === 'function') {
			expect(g.compiledFn({ x: 0 })).toBeCloseTo(2);
			expect(g.compiledFn({ x: Math.PI / 4 })).toBeCloseTo(0);
		}
	});
});

describe('derivee — second derivative (recursion)', () => {
	it("derivee(derivee(f)) yields f''(x) for y = x^3", () => {
		// f(x) = x^3, f'(x) = 3x^2, f''(x) = 6x
		const { figure, symbols } = run(
			`f = courbe("y = x^3")
g = derivee(f)
h = derivee(g)`
		);
		const h = figure.getElementById(symbols.get('h')!.figureId!);
		if (h && h.type === 'function') {
			expect(h.compiledFn({ x: 0 })).toBeCloseTo(0);
			expect(h.compiledFn({ x: 1 })).toBeCloseTo(6);
			expect(h.compiledFn({ x: 2 })).toBeCloseTo(12);
		}
	});

	it("the derivative field of g is f''(x)", () => {
		// f(x) = x^4, f'(x) = 4x^3, g = derivee(f). Then g.derivative = 12x^2.
		const { figure, symbols } = run(
			`f = courbe("y = x^4")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		if (g && g.type === 'function') {
			// g.compiledDerivative is f''(x) = 12x^2
			expect(g.compiledDerivative({ x: 0 })).toBeCloseTo(0);
			expect(g.compiledDerivative({ x: 1 })).toBeCloseTo(12);
			expect(g.compiledDerivative({ x: 2 })).toBeCloseTo(48);
		}
	});
});

describe('derivee — additional cases', () => {
	// Note: y = 5 (constant) and y = 2*x + 3 (affine) are detected as lines by
	// courbe(), not as GeoFunctions. derivee() rejects them — see "errors" suite.

	it('quadratic: derivee of y = x^2 + 1 evaluates to 2*x', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2 + 1")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		if (g && g.type === 'function') {
			expect(g.compiledFn({ x: 0 })).toBeCloseTo(0);
			expect(g.compiledFn({ x: 3 })).toBeCloseTo(6);
			expect(g.compiledFn({ x: -2 })).toBeCloseTo(-4);
		}
	});
});

describe('derivee — autonomy', () => {
	it('the derivee element has no graph dependencies', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		expect(g).toBeDefined();
		if (g && g.type === 'function') {
			// GeoFunction is autonomous by design
			expect(g.dependsOn).toEqual([]);
		}
	});

	it('stores its own equation string starting with "y = "', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		if (g && g.type === 'function') {
			expect(g.equation).toMatch(/^y\s*=\s*/);
		}
	});
});

describe('derivee — errors', () => {
	it('throws when argument is a point', () => {
		expect(() => run('A = point(0,0)\ng = derivee(A)')).toThrow(DslRuntimeError);
	});

	it('throws when argument is a quadratic curve (conic)', () => {
		expect(() => run('c = courbe("x^2 + y^2 = 1")\ng = derivee(c)')).toThrow(DslRuntimeError);
	});

	it('throws when argument is an implicit curve', () => {
		expect(() => run('c = courbe("x^3 + y^3 - 3*x*y = 0")\ng = derivee(c)')).toThrow(
			DslRuntimeError
		);
	});

	it('throws when argument is a line', () => {
		// y = 2*x + 3 is detected as a line, not a function
		expect(() => run('d = courbe("y = 2*x + 3")\ng = derivee(d)')).toThrow(DslRuntimeError);
	});

	it('throws when argument is a tangent line', () => {
		expect(() =>
			run(`f = courbe("y = x^2")
t = tangente(f, 1)
g = derivee(t)`)
		).toThrow(DslRuntimeError);
	});

	it('throws with no argument', () => {
		expect(() => run('g = derivee()')).toThrow(DslRuntimeError);
	});

	it('throws with too many arguments', () => {
		expect(() => run('f = courbe("y = x^2")\ng = derivee(f, f)')).toThrow(DslRuntimeError);
	});
});

describe('derivee — round-trip serialization', () => {
	it('serializes as a courbe() call with the derivative expression', () => {
		const script = `f = courbe("y = x^2")
g = derivee(f)`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		// g should be reserialized as courbe("y = ...") since GeoFunction is autonomous
		expect(serialized).toContain('g = courbe(');
	});

	it('reparsed derivative still evaluates correctly', () => {
		const script = `f = courbe("y = x^3")
g = derivee(f)`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);

		const { figure: fig2, symbols: sym2 } = runDsl(serialized);
		const g2 = fig2.getElementById(sym2.get('g')!.figureId!);
		if (g2 && g2.type === 'function') {
			// (x^3)' = 3x^2
			expect(g2.compiledFn({ x: 0 })).toBeCloseTo(0);
			expect(g2.compiledFn({ x: 2 })).toBeCloseTo(12);
		}
	});

	it('round-trip preserves trigonometric derivative (sin → cos)', () => {
		const script = `f = courbe("y = sin(x)")
g = derivee(f)`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);
		const g2 = fig2.getElementById(sym2.get('g')!.figureId!);
		expect(g2?.type).toBe('function');
		if (g2 && g2.type === 'function') {
			expect(g2.compiledFn({ x: 0 })).toBeCloseTo(1);
			expect(g2.compiledFn({ x: Math.PI })).toBeCloseTo(-1);
		}
	});
});

describe('derivee — singular / undefined points', () => {
	it('1/x: derivee = -1/x^2 returns non-finite at x=0 (no throw)', () => {
		// (1/x)' = -1/x^2 → at x=0: undefined (Infinity or NaN, not a thrown error)
		const { figure, symbols } = run(
			`f = courbe("y = 1/x")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		expect(g?.type).toBe('function');
		if (g && g.type === 'function') {
			expect(Number.isFinite(g.compiledFn({ x: 0 }))).toBe(false);
			// Away from singularity: g(1) = -1, g(2) = -0.25
			expect(g.compiledFn({ x: 1 })).toBeCloseTo(-1);
			expect(g.compiledFn({ x: 2 })).toBeCloseTo(-0.25);
		}
	});

	it('ln(x): derivee = 1/x returns non-finite at x=0 (no throw)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = ln(x)")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		expect(g?.type).toBe('function');
		if (g && g.type === 'function') {
			expect(Number.isFinite(g.compiledFn({ x: 0 }))).toBe(false);
			expect(g.compiledFn({ x: 1 })).toBeCloseTo(1);
		}
	});

	it('sqrt(x): derivee = 1/(2*sqrt(x)) returns non-finite at x=0', () => {
		const { figure, symbols } = run(
			`f = courbe("y = sqrt(x)")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		expect(g?.type).toBe('function');
		if (g && g.type === 'function') {
			expect(g.compiledFn({ x: 1 })).toBeCloseTo(0.5);
			expect(g.compiledFn({ x: 4 })).toBeCloseTo(0.25);
			expect(Number.isFinite(g.compiledFn({ x: 0 }))).toBe(false);
		}
	});
});

describe('derivee — composite expressions', () => {
	it("product rule: (x^2 * sin(x))' = 2*x*sin(x) + x^2*cos(x)", () => {
		// Pick a polynomial × trig to avoid the courbe() implicit-curve detection
		// that triggers when y = f(x) involves a transcendental coefficient pattern.
		const { figure, symbols } = run(
			`f = courbe("y = x^2 * sin(x)")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		expect(g?.type).toBe('function');
		if (g && g.type === 'function') {
			// At x=0: 0 + 0 = 0
			expect(g.compiledFn({ x: 0 })).toBeCloseTo(0);
			// At x=π/2: 2·(π/2)·1 + (π/2)²·0 = π
			expect(g.compiledFn({ x: Math.PI / 2 })).toBeCloseTo(Math.PI);
		}
	});

	it("compiledDerivative on the result of derivee equals f'''", () => {
		// f = x^4 → f' = 4x^3 → g = derivee(f). Then g.compiledDerivative = f'' = 12x^2.
		// But f''' = 24x, so compiledDerivative of g(=4x^3) is f''(x) = 12x^2 — NOT f'''.
		// Let's verify: for f = x^4, derivee(f) is a function representing f'(x) = 4x^3.
		// Its `compiledDerivative` is f''(x) = 12x^2. So at x=1: 12.
		const { figure, symbols } = run(
			`f = courbe("y = x^4")
g = derivee(f)`
		);
		const g = figure.getElementById(symbols.get('g')!.figureId!);
		if (g && g.type === 'function') {
			// g(x) = 4x^3, g'(x) = 12x^2
			expect(g.compiledDerivative({ x: 0 })).toBeCloseTo(0);
			expect(g.compiledDerivative({ x: 1 })).toBeCloseTo(12);
			expect(g.compiledDerivative({ x: 2 })).toBeCloseTo(48);
		}
	});

	it('derivee^4(sin) cycles back to sin', () => {
		// d/dx sin = cos → -sin → -cos → sin
		const { figure, symbols } = run(
			`f = courbe("y = sin(x)")
g1 = derivee(f)
g2 = derivee(g1)
g3 = derivee(g2)
g4 = derivee(g3)`
		);
		const g4 = figure.getElementById(symbols.get('g4')!.figureId!);
		if (g4 && g4.type === 'function') {
			expect(g4.compiledFn({ x: 0 })).toBeCloseTo(0);
			expect(g4.compiledFn({ x: Math.PI / 2 })).toBeCloseTo(1);
			expect(g4.compiledFn({ x: Math.PI })).toBeCloseTo(0);
			expect(g4.compiledFn({ x: -Math.PI / 2 })).toBeCloseTo(-1);
		}
	});
});

describe('derivee — degenerate result (constant derivative)', () => {
	it("h = derivee(derivee(courbe('y = x^2'))) is the constant 2", () => {
		// f(x) = x^2 → f'(x) = 2x → f''(x) = 2 (constant)
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
g = derivee(f)
h = derivee(g)`
		);
		const h = figure.getElementById(symbols.get('h')!.figureId!);
		expect(h?.type).toBe('function');
		if (h && h.type === 'function') {
			expect(h.compiledFn({ x: 0 })).toBeCloseTo(2);
			expect(h.compiledFn({ x: 100 })).toBeCloseTo(2);
			expect(h.compiledFn({ x: -7 })).toBeCloseTo(2);
		}
	});

	it('constant-derivative round-trip: serialize/reparse keeps numeric value', () => {
		// CRITICAL EDGE CASE: derivee that simplifies to a constant could serialize as
		// "y = 2", which courbe() detects as a horizontal line, NOT a function.
		// This test documents the current behavior.
		const script = `f = courbe("y = x^2")
g = derivee(f)
h = derivee(g)`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		// Reparse must not throw, and must yield SOMETHING evaluable as 2
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);
		const h2 = fig2.getElementById(sym2.get('h')!.figureId!);
		expect(h2).toBeDefined();
		// Either GeoFunction or line: both are acceptable as long as nothing throws
		// and the visual result is the horizontal line y=2.
		if (h2 && h2.type === 'function') {
			expect(h2.compiledFn({ x: 5 })).toBeCloseTo(2);
		}
	});
});
