/**
 * Unit tests for Grapheur evaluator, sampler, and bezier modules
 */

import { describe, it, expect } from 'vitest';

// Evaluator tests
import {
	parseFunction,
	evaluateAt,
	createEvaluator,
	getFreeVariables,
	hasUnboundVariables,
	getUnboundVariables
} from '../evaluator';

// Sampler tests
import {
	sampleFunction,
	sampleFunctionAdaptive,
	sampleAtPoints,
	isAsymptote,
	DEFAULT_NUM_POINTS
} from '../sampler';

// Bezier tests
import {
	curveToSVGPath,
	curveToPolylinePath,
	pointsToCatmullRom,
	catmullRomToBezier,
	createMathToSVGTransformer
} from '../bezier';

import type { Point, SampledCurve, Viewport } from '../types';

// =============================================================================
// Evaluator Tests
// =============================================================================

describe('evaluator', () => {
	describe('parseFunction', () => {
		it('parses simple polynomial', () => {
			const result = parseFunction('x^2');
			expect(result.success).toBe(true);
			expect(result.ast).not.toBeNull();
			expect(result.error).toBeNull();
		});

		it('parses trigonometric function', () => {
			const result = parseFunction('\\sin(x)');
			expect(result.success).toBe(true);
			expect(result.ast).not.toBeNull();
		});

		it('parses complex expression', () => {
			const result = parseFunction('\\frac{x^2 + 1}{x - 1}');
			expect(result.success).toBe(true);
			expect(result.ast).not.toBeNull();
		});

		it('parses expression with sqrt', () => {
			const result = parseFunction('\\sqrt{x}');
			expect(result.success).toBe(true);
			expect(result.ast).not.toBeNull();
		});

		it('parses expression with pi', () => {
			const result = parseFunction('\\sin(\\pi x)');
			expect(result.success).toBe(true);
		});

		it('returns error for empty expression', () => {
			const result = parseFunction('');
			expect(result.success).toBe(false);
			expect(result.error).toBe('Expression is empty');
			expect(result.ast).toBeNull();
		});

		it('returns error for whitespace-only expression', () => {
			const result = parseFunction('   ');
			expect(result.success).toBe(false);
			expect(result.error).toBe('Expression is empty');
		});

		it('handles malformed LaTeX gracefully', () => {
			const result = parseFunction('\\frac{x}');
			// Should return an error or partial parse
			// depending on parser tolerance
			expect(result).toBeDefined();
		});
	});

	describe('evaluateAt', () => {
		it('evaluates polynomial at x=2', () => {
			const result = parseFunction('x^2');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const y = evaluateAt(result.ast, 2);
				expect(y).toBe(4);
			}
		});

		it('evaluates polynomial at x=-3', () => {
			const result = parseFunction('x^2');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const y = evaluateAt(result.ast, -3);
				expect(y).toBe(9);
			}
		});

		it('evaluates linear function', () => {
			const result = parseFunction('2x + 3');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				expect(evaluateAt(result.ast, 0)).toBe(3);
				expect(evaluateAt(result.ast, 1)).toBe(5);
				expect(evaluateAt(result.ast, -1)).toBe(1);
			}
		});

		it('evaluates sin(x) at key points', () => {
			const result = parseFunction('\\sin(x)');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const y0 = evaluateAt(result.ast, 0);
				expect(y0).toBeCloseTo(0, 10);

				const yPiHalf = evaluateAt(result.ast, Math.PI / 2);
				expect(yPiHalf).toBeCloseTo(1, 10);

				const yPi = evaluateAt(result.ast, Math.PI);
				expect(yPi).toBeCloseTo(0, 10);
			}
		});

		it('evaluates cos(x) at key points', () => {
			const result = parseFunction('\\cos(x)');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const y0 = evaluateAt(result.ast, 0);
				expect(y0).toBeCloseTo(1, 10);

				const yPiHalf = evaluateAt(result.ast, Math.PI / 2);
				expect(yPiHalf).toBeCloseTo(0, 10);
			}
		});

		it('evaluates ln(x) for positive x', () => {
			const result = parseFunction('\\ln(x)');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const y1 = evaluateAt(result.ast, 1);
				expect(y1).toBeCloseTo(0, 10);

				const yE = evaluateAt(result.ast, Math.E);
				expect(yE).toBeCloseTo(1, 10);
			}
		});

		it('returns null for ln(x) when x <= 0', () => {
			const result = parseFunction('\\ln(x)');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				expect(evaluateAt(result.ast, 0)).toBeNull();
				expect(evaluateAt(result.ast, -1)).toBeNull();
			}
		});

		it('returns null for sqrt(x) when x < 0', () => {
			const result = parseFunction('\\sqrt{x}');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				expect(evaluateAt(result.ast, -1)).toBeNull();
				expect(evaluateAt(result.ast, 4)).toBe(2);
			}
		});

		it('returns null for division by zero', () => {
			const result = parseFunction('\\frac{1}{x}');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				expect(evaluateAt(result.ast, 0)).toBeNull();
				expect(evaluateAt(result.ast, 2)).toBe(0.5);
			}
		});

		it('returns null for non-finite x values', () => {
			const result = parseFunction('x^2');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				expect(evaluateAt(result.ast, Infinity)).toBeNull();
				expect(evaluateAt(result.ast, -Infinity)).toBeNull();
				expect(evaluateAt(result.ast, NaN)).toBeNull();
			}
		});

		it('evaluates with additional variables (sliders)', () => {
			const result = parseFunction('a x + b');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const y = evaluateAt(result.ast, 2, { a: 3, b: 1 });
				expect(y).toBe(7); // 3*2 + 1 = 7
			}
		});

		it('evaluates with multiple slider variables', () => {
			const result = parseFunction('a x^2 + b x + c');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const y = evaluateAt(result.ast, 2, { a: 1, b: -3, c: 2 });
				expect(y).toBe(0); // 1*4 - 3*2 + 2 = 0
			}
		});
	});

	describe('createEvaluator', () => {
		it('creates a reusable evaluator', () => {
			const result = parseFunction('x^2');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const f = createEvaluator(result.ast);
				expect(f(2)).toBe(4);
				expect(f(3)).toBe(9);
				expect(f(-4)).toBe(16);
			}
		});

		it('creates evaluator with slider variables', () => {
			const result = parseFunction('a \\sin(x)');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const f = createEvaluator(result.ast, { a: 2 });
				expect(f(0)).toBeCloseTo(0, 10);
				expect(f(Math.PI / 2)).toBeCloseTo(2, 10);
			}
		});
	});

	describe('getFreeVariables', () => {
		it('returns empty array for expression with only x', () => {
			const result = parseFunction('x^2 + x + 1');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const vars = getFreeVariables(result.ast);
				expect(vars).toEqual([]);
			}
		});

		it('excludes pi from free variables', () => {
			const result = parseFunction('\\sin(\\pi x)');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const vars = getFreeVariables(result.ast);
				expect(vars).not.toContain('pi');
				expect(vars).not.toContain('x');
			}
		});

		it('returns slider variables', () => {
			const result = parseFunction('a x + b');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const vars = getFreeVariables(result.ast);
				expect(vars).toContain('a');
				expect(vars).toContain('b');
				expect(vars.length).toBe(2);
			}
		});

		it('returns multiple slider variables for quadratic', () => {
			const result = parseFunction('a x^2 + b x + c');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const vars = getFreeVariables(result.ast);
				expect(vars.sort()).toEqual(['a', 'b', 'c']);
			}
		});
	});

	describe('hasUnboundVariables', () => {
		it('returns false when all variables are bound', () => {
			const result = parseFunction('a x + b');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				expect(hasUnboundVariables(result.ast, { a: 1, b: 2 })).toBe(false);
			}
		});

		it('returns true when some variables are unbound', () => {
			const result = parseFunction('a x + b');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				expect(hasUnboundVariables(result.ast, { a: 1 })).toBe(true);
			}
		});

		it('returns false for expression with only x', () => {
			const result = parseFunction('x^2');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				expect(hasUnboundVariables(result.ast, {})).toBe(false);
			}
		});
	});

	describe('getUnboundVariables', () => {
		it('returns unbound variables', () => {
			const result = parseFunction('a x + b + c');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const unbound = getUnboundVariables(result.ast, { a: 1 });
				expect(unbound.sort()).toEqual(['b', 'c']);
			}
		});

		it('returns empty array when all bound', () => {
			const result = parseFunction('a x + b');
			expect(result.ast).not.toBeNull();
			if (result.ast) {
				const unbound = getUnboundVariables(result.ast, { a: 1, b: 2 });
				expect(unbound).toEqual([]);
			}
		});
	});
});

// =============================================================================
// Sampler Tests
// =============================================================================

describe('sampler', () => {
	const defaultViewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

	describe('isAsymptote', () => {
		it('returns true when y1 is null', () => {
			expect(isAsymptote(null, 5, 10)).toBe(true);
		});

		it('returns true when y2 is null', () => {
			expect(isAsymptote(5, null, 10)).toBe(true);
		});

		it('returns true when both are null', () => {
			expect(isAsymptote(null, null, 10)).toBe(true);
		});

		it('returns false for small change', () => {
			expect(isAsymptote(1, 2, 10)).toBe(false);
		});

		it('returns true for large jump', () => {
			expect(isAsymptote(100, -100, 10)).toBe(true);
		});

		it('returns true for sign change with large values', () => {
			expect(isAsymptote(10, -10, 10)).toBe(true);
		});

		it('returns false for sign change with small values', () => {
			expect(isAsymptote(1, -1, 10)).toBe(false);
		});
	});

	describe('sampleFunction', () => {
		it('samples a constant function', () => {
			const f = () => 5;
			const curve = sampleFunction(f, defaultViewport);

			expect(curve.points.length).toBe(DEFAULT_NUM_POINTS);
			expect(curve.discontinuityIndices).toEqual([]);
			expect(curve.points.every((p) => p.y === 5)).toBe(true);
		});

		it('samples a linear function', () => {
			const f = (x: number) => 2 * x + 1;
			const curve = sampleFunction(f, defaultViewport);

			expect(curve.points.length).toBe(DEFAULT_NUM_POINTS);
			expect(curve.discontinuityIndices).toEqual([]);

			// Check first and last points
			expect(curve.points[0].x).toBeCloseTo(-10, 5);
			expect(curve.points[0].y).toBeCloseTo(-19, 5);
		});

		it('samples a parabola', () => {
			const f = (x: number) => x * x;
			const curve = sampleFunction(f, defaultViewport);

			expect(curve.points.length).toBe(DEFAULT_NUM_POINTS);
			expect(curve.discontinuityIndices).toEqual([]);

			// Check that values near center are small (vertex of parabola)
			// With 200 points from -10 to 10, the midpoint is around x=0
			const nearCenter = curve.points.filter((p) => Math.abs(p.x) < 1);
			expect(nearCenter.length).toBeGreaterThan(0);
			// All y values near x=0 should be close to 0
			nearCenter.forEach((p) => {
				expect(p.y).toBeCloseTo(p.x * p.x, 5);
			});
		});

		it('detects discontinuity in 1/x', () => {
			const f = (x: number) => (x === 0 ? null : 1 / x);
			const viewport: Viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };
			const curve = sampleFunction(f, viewport);

			// Should have at least one discontinuity near x=0
			expect(curve.discontinuityIndices.length).toBeGreaterThan(0);
		});

		it('handles domain errors gracefully', () => {
			const f = (x: number) => (x < 0 ? null : Math.sqrt(x));
			const curve = sampleFunction(f, defaultViewport);

			// Points should only be for x >= 0
			const positivePoints = curve.points.filter((p) => p.x >= 0);
			expect(positivePoints.length).toBeGreaterThan(0);
			expect(curve.discontinuityIndices.length).toBeGreaterThan(0);
		});

		it('respects custom number of points', () => {
			const f = (x: number) => x;
			const curve = sampleFunction(f, defaultViewport, 50);

			expect(curve.points.length).toBe(50);
		});

		it('handles minimum point count', () => {
			const f = (x: number) => x;
			const curve = sampleFunction(f, defaultViewport, 1);

			// Should enforce minimum of 2 points
			expect(curve.points.length).toBe(2);
		});

		it('returns empty for degenerate viewport', () => {
			const f = (x: number) => x;
			const viewport: Viewport = { xMin: 5, xMax: 5, yMin: -10, yMax: 10 };
			const curve = sampleFunction(f, viewport);

			expect(curve.points).toEqual([]);
		});
	});

	describe('sampleFunctionAdaptive', () => {
		it('provides more points near discontinuities', () => {
			const f = (x: number) => (Math.abs(x) < 0.01 ? null : 1 / x);
			const viewport: Viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };

			const regular = sampleFunction(f, viewport, 100);
			const adaptive = sampleFunctionAdaptive(f, viewport, 100);

			// Adaptive should have more points due to refinement
			expect(adaptive.points.length).toBeGreaterThanOrEqual(regular.points.length);
		});

		it('returns same result for continuous functions', () => {
			const f = (x: number) => x * x;
			const regular = sampleFunction(f, defaultViewport, 100);
			const adaptive = sampleFunctionAdaptive(f, defaultViewport, 100);

			// For continuous function, should be the same
			expect(adaptive.points.length).toBe(regular.points.length);
		});
	});

	describe('sampleAtPoints', () => {
		it('samples at specified x values', () => {
			const f = (x: number) => x * x;
			const xValues = [0, 1, 2, 3, 4];
			const curve = sampleAtPoints(f, xValues, 20);

			expect(curve.points.length).toBe(5);
			expect(curve.points.map((p) => p.y)).toEqual([0, 1, 4, 9, 16]);
		});

		it('handles empty x values', () => {
			const f = (x: number) => x;
			const curve = sampleAtPoints(f, [], 10);

			expect(curve.points).toEqual([]);
			expect(curve.discontinuityIndices).toEqual([]);
		});

		it('detects discontinuities in specified points', () => {
			const f = (x: number) => (x === 0 ? null : 1 / x);
			const xValues = [-1, -0.1, 0, 0.1, 1];
			const curve = sampleAtPoints(f, xValues, 10);

			// Should detect discontinuity around x=0
			expect(curve.discontinuityIndices.length).toBeGreaterThan(0);
		});
	});
});

// =============================================================================
// Bezier Tests
// =============================================================================

describe('bezier', () => {
	describe('catmullRomToBezier', () => {
		it('calculates control points for straight line', () => {
			const p0 = { x: 0, y: 0 };
			const p1 = { x: 1, y: 1 };
			const p2 = { x: 2, y: 2 };
			const p3 = { x: 3, y: 3 };

			const [cp1, cp2] = catmullRomToBezier(p0, p1, p2, p3, 0.5);

			// For a straight line, control points should be on the line
			expect(cp1.x).toBeCloseTo(1 + ((2 - 0) * 0.5) / 3, 5);
			expect(cp2.x).toBeCloseTo(2 - ((3 - 1) * 0.5) / 3, 5);
		});

		it('respects tension parameter', () => {
			const p0 = { x: 0, y: 0 };
			const p1 = { x: 1, y: 2 };
			const p2 = { x: 2, y: 0 };
			const p3 = { x: 3, y: 2 };

			const [cp1Low] = catmullRomToBezier(p0, p1, p2, p3, 0.0);
			const [cp1High] = catmullRomToBezier(p0, p1, p2, p3, 1.0);

			// With 0 tension, control point should be at p1
			expect(cp1Low.x).toBeCloseTo(p1.x, 5);
			expect(cp1Low.y).toBeCloseTo(p1.y, 5);

			// Higher tension should give different control point
			expect(cp1High.x).not.toBeCloseTo(p1.x, 2);
		});
	});

	describe('pointsToCatmullRom', () => {
		it('returns empty string for less than 2 points', () => {
			expect(pointsToCatmullRom([])).toBe('');
			expect(pointsToCatmullRom([{ x: 0, y: 0 }])).toBe('');
		});

		it('returns line command for exactly 2 points', () => {
			const points: Point[] = [
				{ x: 0, y: 0 },
				{ x: 1, y: 1 }
			];
			const path = pointsToCatmullRom(points);

			expect(path).toBe('L1,1');
		});

		it('returns curve commands for 3+ points', () => {
			const points: Point[] = [
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
				{ x: 2, y: 0 }
			];
			const path = pointsToCatmullRom(points);

			// Should contain C (cubic bezier) commands
			expect(path).toMatch(/^C/);
			expect(path.match(/C/g)?.length).toBe(2);
		});

		it('handles integer coordinates', () => {
			const points: Point[] = [
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
				{ x: 2, y: 0 },
				{ x: 3, y: 1 }
			];
			const path = pointsToCatmullRom(points);

			// Should produce valid path string with C commands
			// Path contains multiple C commands with coordinates
			expect(path).toMatch(/^C/);
			expect(path.match(/C/g)?.length).toBe(3);
		});
	});

	describe('curveToSVGPath', () => {
		it('returns empty string for empty curve', () => {
			const curve: SampledCurve = { points: [], discontinuityIndices: [] };
			expect(curveToSVGPath(curve)).toBe('');
		});

		it('returns M command for single point', () => {
			const curve: SampledCurve = {
				points: [{ x: 5, y: 10 }],
				discontinuityIndices: []
			};
			const path = curveToSVGPath(curve);

			expect(path).toBe('M5,10');
		});

		it('generates smooth path for continuous curve', () => {
			const curve: SampledCurve = {
				points: [
					{ x: 0, y: 0 },
					{ x: 1, y: 1 },
					{ x: 2, y: 4 },
					{ x: 3, y: 9 }
				],
				discontinuityIndices: []
			};
			const path = curveToSVGPath(curve);

			// Should start with M and contain C commands
			expect(path).toMatch(/^M0,0C/);
		});

		it('creates separate segments at discontinuities', () => {
			const curve: SampledCurve = {
				points: [
					{ x: -2, y: -0.5 },
					{ x: -1, y: -1 },
					{ x: 1, y: 1 },
					{ x: 2, y: 0.5 }
				],
				discontinuityIndices: [2]
			};
			const path = curveToSVGPath(curve);

			// Should have two M commands (one for each segment)
			const mCommands = path.match(/M/g);
			expect(mCommands?.length).toBe(2);
		});

		it('applies transformer to points', () => {
			const curve: SampledCurve = {
				points: [
					{ x: 0, y: 0 },
					{ x: 1, y: 1 }
				],
				discontinuityIndices: []
			};
			const transformer = (p: Point) => ({ x: p.x * 100, y: p.y * 100 });
			const path = curveToSVGPath(curve, transformer);

			expect(path).toMatch(/^M0,0L100,100$/);
		});
	});

	describe('curveToPolylinePath', () => {
		it('generates L commands instead of curves', () => {
			const curve: SampledCurve = {
				points: [
					{ x: 0, y: 0 },
					{ x: 1, y: 1 },
					{ x: 2, y: 4 }
				],
				discontinuityIndices: []
			};
			const path = curveToPolylinePath(curve);

			expect(path).toBe('M0,0L1,1L2,4');
		});

		it('handles discontinuities', () => {
			const curve: SampledCurve = {
				points: [
					{ x: 0, y: 0 },
					{ x: 1, y: 1 },
					{ x: 3, y: 3 },
					{ x: 4, y: 4 }
				],
				discontinuityIndices: [2]
			};
			const path = curveToPolylinePath(curve);

			// Should have two segments
			expect(path.match(/M/g)?.length).toBe(2);
		});
	});

	describe('createMathToSVGTransformer', () => {
		it('transforms origin correctly', () => {
			const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
			const transform = createMathToSVGTransformer(viewport, 500, 500);

			const origin = transform({ x: 0, y: 0 });

			// Origin should be at center
			expect(origin.x).toBe(250);
			expect(origin.y).toBe(250);
		});

		it('transforms corners correctly', () => {
			const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
			const transform = createMathToSVGTransformer(viewport, 500, 500);

			// Math top-right (10, 10) -> SVG top-right (500, 0)
			const topRight = transform({ x: 10, y: 10 });
			expect(topRight.x).toBe(500);
			expect(topRight.y).toBe(0);

			// Math bottom-left (-10, -10) -> SVG bottom-left (0, 500)
			const bottomLeft = transform({ x: -10, y: -10 });
			expect(bottomLeft.x).toBe(0);
			expect(bottomLeft.y).toBe(500);
		});

		it('handles non-square viewports', () => {
			const viewport = { xMin: 0, xMax: 10, yMin: 0, yMax: 5 };
			const transform = createMathToSVGTransformer(viewport, 400, 200);

			// (5, 2.5) should be at center
			const center = transform({ x: 5, y: 2.5 });
			expect(center.x).toBe(200);
			expect(center.y).toBe(100);
		});

		it('flips y-axis correctly', () => {
			const viewport = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
			const transform = createMathToSVGTransformer(viewport, 100, 100);

			// Math y=10 (top) -> SVG y=0 (top)
			const top = transform({ x: 5, y: 10 });
			expect(top.y).toBe(0);

			// Math y=0 (bottom) -> SVG y=100 (bottom)
			const bottom = transform({ x: 5, y: 0 });
			expect(bottom.y).toBe(100);
		});
	});
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('integration', () => {
	it('parses, samples, and converts to SVG path', () => {
		// Parse function
		const parseResult = parseFunction('x^2');
		expect(parseResult.success).toBe(true);
		expect(parseResult.ast).not.toBeNull();

		if (!parseResult.ast) return;

		// Create evaluator
		const f = createEvaluator(parseResult.ast);

		// Sample
		const viewport: Viewport = { xMin: -5, xMax: 5, yMin: 0, yMax: 25 };
		const curve = sampleFunction(f, viewport, 50);

		expect(curve.points.length).toBe(50);
		expect(curve.discontinuityIndices).toEqual([]);

		// Convert to SVG path
		const transformer = createMathToSVGTransformer(viewport, 500, 500);
		const path = curveToSVGPath(curve, transformer);

		// Should produce valid SVG path
		expect(path).toMatch(/^M[\d.,\-\s]+C/);
	});

	it('handles function with asymptote end-to-end', () => {
		// Parse 1/x
		const parseResult = parseFunction('\\frac{1}{x}');
		expect(parseResult.success).toBe(true);
		expect(parseResult.ast).not.toBeNull();

		if (!parseResult.ast) return;

		// Create evaluator
		const f = createEvaluator(parseResult.ast);

		// Sample
		const viewport: Viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };
		const curve = sampleFunction(f, viewport, 100);

		// Should detect discontinuity
		expect(curve.discontinuityIndices.length).toBeGreaterThan(0);

		// Convert to SVG path
		const path = curveToSVGPath(curve);

		// Should have multiple segments (multiple M commands)
		expect(path.match(/M/g)?.length).toBeGreaterThan(1);
	});

	it('handles function with slider variables', () => {
		// Parse a*sin(b*x)
		const parseResult = parseFunction('a \\sin(b x)');
		expect(parseResult.success).toBe(true);
		expect(parseResult.ast).not.toBeNull();

		if (!parseResult.ast) return;

		// Check free variables
		const vars = getFreeVariables(parseResult.ast);
		expect(vars.sort()).toEqual(['a', 'b']);

		// Create evaluator with slider values
		const f = createEvaluator(parseResult.ast, { a: 2, b: 1 });

		// Sample
		const viewport: Viewport = {
			xMin: -2 * Math.PI,
			xMax: 2 * Math.PI,
			yMin: -3,
			yMax: 3
		};
		const curve = sampleFunction(f, viewport, 100);

		expect(curve.points.length).toBe(100);

		// Check that amplitude is 2 (value of a)
		const maxY = Math.max(...curve.points.map((p) => p.y));
		expect(maxY).toBeCloseTo(2, 1);
	});
});
