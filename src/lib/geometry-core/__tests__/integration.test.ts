/**
 * Integration tests for geometry-core Phase 1.
 *
 * Tests the full pipeline: Figure -> compute -> SVG rendering -> serialization.
 * Each test exercises multiple modules together, not in isolation.
 */

import { describe, it, expect } from 'vitest';
import { Figure } from '../graph/figure';
import { createTransformer } from '../viewport/viewport';
import {
	pointToSVG,
	segmentToSVG,
	lineToSVG,
	rayToSVG,
	circleToSVG
} from '../rendering/svg-primitives';
import { exact, numeric, isExact, isNumeric } from '../types/geo-value';
import { geoToNumber } from '../compute/to-number';
import { geoEqual, geoIsZero } from '../compute/compare';
import { geoFromNumber, geoFromFraction, geoAdd, geoSub, geoMul } from '../compute/geo-arithmetic';
import {
	serializeGeoValue,
	deserializeGeoValue,
	geoValueSchema,
	figureStateSchema
} from '../types/schemas';
import { number, sqrt, fraction } from '$lib/mathAST';
import { numericNode } from '$lib/mathAST/common/numeric';

// Standard viewport and transformer
const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const transformer = createTransformer(viewport, 800, 600);
const dims = { width: 800, height: 600 };

function pt(x: number, y: number) {
	return { x: exact(numericNode(x)), y: exact(numericNode(y)) };
}

// =============================================================================
// Pipeline: Figure -> getPosition -> SVG rendering
// =============================================================================

describe('figure -> SVG rendering pipeline', () => {
	it('triangle: 3 points + 3 segments render correctly', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(6, 0));
		const cc = c.createFreePoint(pt(3, 4));
		const ab = c.createSegment(a, b);
		const bc = c.createSegment(b, cc);
		const ca = c.createSegment(cc, a);

		// All points render
		expect(pointToSVG(a, c, transformer)).not.toBeNull();
		expect(pointToSVG(b, c, transformer)).not.toBeNull();
		expect(pointToSVG(cc, c, transformer)).not.toBeNull();

		// All segments render
		const svgAB = segmentToSVG(ab, c, transformer);
		const svgBC = segmentToSVG(bc, c, transformer);
		const svgCA = segmentToSVG(ca, c, transformer);
		expect(svgAB).not.toBeNull();
		expect(svgBC).not.toBeNull();
		expect(svgCA).not.toBeNull();

		// Segment AB is horizontal (same y)
		expect(svgAB!.y1).toBe(svgAB!.y2);

		// Segment endpoints match point positions
		const ptA = pointToSVG(a, c, transformer)!;
		const ptB = pointToSVG(b, c, transformer)!;
		expect(svgAB!.x1).toBe(ptA.cx);
		expect(svgAB!.y1).toBe(ptA.cy);
		expect(svgAB!.x2).toBe(ptB.cx);
		expect(svgAB!.y2).toBe(ptB.cy);
	});

	it('circle renders with correct center and radius', () => {
		const c = new Figure();
		const center = c.createFreePoint(pt(0, 0));
		const circ = c.createCircleByRadius(center, geoFromNumber(5));

		const svg = circleToSVG(circ, c, transformer);
		expect(svg).not.toBeNull();
		// Center at origin -> SVG center of viewport
		expect(svg!.cx).toBeCloseTo(400, 1);
		expect(svg!.cy).toBeCloseTo(300, 1);
		// Radius 5 units * 40 px/unit = 200 px
		expect(svg!.r).toBeCloseTo(200, 1);
	});

	it('line extends beyond defining points to viewport edges', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(-1, 0));
		const b = c.createFreePoint(pt(1, 0));
		const ln = c.createLine(a, b);

		const svg = lineToSVG(ln, c, transformer, dims);
		expect(svg).not.toBeNull();
		// Horizontal line y=0 should extend from x=0 to x=800
		expect(svg!.x1).toBeCloseTo(0, 0);
		expect(svg!.x2).toBeCloseTo(800, 0);
	});

	it('ray extends from origin in one direction only', () => {
		const c = new Figure();
		const origin = c.createFreePoint(pt(0, 0));
		const through = c.createFreePoint(pt(5, 5));
		const ray = c.createRay(origin, through);

		const svg = rayToSVG(ray, c, transformer, dims);
		expect(svg).not.toBeNull();
		// Starts at origin
		const ptOrigin = pointToSVG(origin, c, transformer)!;
		expect(svg!.x1).toBeCloseTo(ptOrigin.cx, 1);
		expect(svg!.y1).toBeCloseTo(ptOrigin.cy, 1);
	});
});

// =============================================================================
// Pipeline: movePoint -> recompute -> SVG update
// =============================================================================

describe('drag simulation: movePoint -> recompute -> SVG', () => {
	it('moving a point updates midpoint SVG position', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(10, 0));
		const mid = c.createMidpoint(a, b);

		// Initial: midpoint at (5, 0)
		const before = pointToSVG(mid, c, transformer)!;

		// Drag A to (10, 0)
		c.movePoint(a, numeric(10), numeric(0));
		c.recompute();

		// After: midpoint at (10, 0)
		const after = pointToSVG(mid, c, transformer)!;
		expect(after.cx).not.toBe(before.cx);
		// New midpoint SVG x should be at math (10, 0) -> SVG 800
		expect(after.cx).toBeCloseTo(800, 1);
	});

	it('segment follows its endpoints after drag', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(4, 0));
		const seg = c.createSegment(a, b);

		const segBefore = segmentToSVG(seg, c, transformer)!;

		c.movePoint(a, numeric(2), numeric(3));
		c.recompute();

		const segAfter = segmentToSVG(seg, c, transformer)!;
		// Start point moved
		expect(segAfter.x1).not.toBe(segBefore.x1);
		expect(segAfter.y1).not.toBe(segBefore.y1);
		// End point unchanged
		expect(segAfter.x2).toBe(segBefore.x2);
		expect(segAfter.y2).toBe(segBefore.y2);
	});

	it('circle follows its center after drag', () => {
		const c = new Figure();
		const center = c.createFreePoint(pt(0, 0));
		const circ = c.createCircleByRadius(center, geoFromNumber(3));

		const before = circleToSVG(circ, c, transformer)!;

		c.movePoint(center, numeric(5), numeric(5));
		c.recompute();

		const after = circleToSVG(circ, c, transformer)!;
		expect(after.cx).not.toBe(before.cx);
		expect(after.cy).not.toBe(before.cy);
		// Radius unchanged
		expect(after.r).toBeCloseTo(before.r, 1);
	});

	it('chained midpoints propagate through 3 levels', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(8, 0));
		const mid1 = c.createMidpoint(a, b); // (4, 0)
		const d = c.createFreePoint(pt(0, 8));
		const mid2 = c.createMidpoint(a, d); // (0, 4)
		const mid3 = c.createMidpoint(mid1, mid2); // (2, 2)

		expect(geoToNumber(c.getPosition(mid3)!.x)).toBe(2);
		expect(geoToNumber(c.getPosition(mid3)!.y)).toBe(2);

		// Drag A
		c.movePoint(a, numeric(4), numeric(4));
		c.recompute();

		// mid1 = mid(4,4) and (8,0) = (6, 2)
		// mid2 = mid(4,4) and (0,8) = (2, 6)
		// mid3 = mid(6,2) and (2,6) = (4, 4)
		const pos = c.getPosition(mid3)!;
		expect(geoToNumber(pos.x)).toBe(4);
		expect(geoToNumber(pos.y)).toBe(4);

		// SVG also updated
		const svg = pointToSVG(mid3, c, transformer)!;
		const expected = transformer.mathToSvg(4, 4);
		expect(svg.cx).toBeCloseTo(expected.x, 1);
		expect(svg.cy).toBeCloseTo(expected.y, 1);
	});
});

// =============================================================================
// Exact computation: precision through operations
// =============================================================================

describe('exact computation pipeline', () => {
	it('midpoint of exact points is exact', () => {
		const c = new Figure();
		const a = c.createFreePoint({ x: geoFromFraction(1, 3), y: exact(number(0)) });
		const b = c.createFreePoint({ x: geoFromFraction(2, 3), y: exact(number(0)) });
		const mid = c.createMidpoint(a, b);

		const pos = c.getPosition(mid)!;
		expect(isExact(pos.x)).toBe(true);
		// mid x = (1/3 + 2/3) / 2 = 1/2
		expect(geoEqual(pos.x, geoFromFraction(1, 2))).toBe(true);
	});

	it('midpoint becomes numeric after drag', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(10, 0));
		const mid = c.createMidpoint(a, b);

		// Initially exact
		expect(isExact(c.getPosition(mid)!.x)).toBe(true);

		// Drag -> numeric
		c.movePoint(a, numeric(3.7), numeric(0));
		c.recompute();
		expect(isNumeric(c.getPosition(mid)!.x)).toBe(true);
	});

	it('exact values survive serialization round-trip', () => {
		const original = exact(sqrt(number(2)));
		const serialized = serializeGeoValue(original);
		const parsed = geoValueSchema.safeParse(serialized);
		expect(parsed.success).toBe(true);
		const restored = deserializeGeoValue(parsed.data!);
		expect(geoToNumber(restored)).toBeCloseTo(Math.SQRT2, 10);
	});

	it('distance^2 check is exact (no sqrt needed)', () => {
		// Point A at origin, point B at (3, 4), distance should be 5
		const dx = geoFromNumber(3);
		const dy = geoFromNumber(4);
		const dist2 = geoAdd(geoMul(dx, dx), geoMul(dy, dy));
		expect(isExact(dist2)).toBe(true);
		expect(geoEqual(dist2, geoFromNumber(25))).toBe(true);
	});

	it('parallel detection via cross product is exact', () => {
		// Vectors (2, 4) and (1, 2) are parallel: cross = 2*2 - 4*1 = 0
		const cross = geoSub(
			geoMul(geoFromNumber(2), geoFromNumber(2)),
			geoMul(geoFromNumber(4), geoFromNumber(1))
		);
		expect(geoIsZero(cross)).toBe(true);
	});

	it('perpendicular detection via dot product is exact', () => {
		// Vectors (3, -1) and (1, 3): dot = 3*1 + (-1)*3 = 0
		const dot = geoAdd(
			geoMul(geoFromNumber(3), geoFromNumber(1)),
			geoMul(geoFromNumber(-1), geoFromNumber(3))
		);
		expect(geoIsZero(dot)).toBe(true);
	});
});

// =============================================================================
// Cascade delete
// =============================================================================

describe('cascade delete integration', () => {
	it('removing a point removes segments, midpoints, and their SVG is gone', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(5, 0));
		const seg = c.createSegment(a, b);
		const mid = c.createMidpoint(a, b);

		// Before: everything renders
		expect(pointToSVG(a, c, transformer)).not.toBeNull();
		expect(segmentToSVG(seg, c, transformer)).not.toBeNull();
		expect(pointToSVG(mid, c, transformer)).not.toBeNull();

		// Remove A
		c.remove(a);

		// After: only B remains
		expect(c.size).toBe(1);
		expect(pointToSVG(a, c, transformer)).toBeNull();
		expect(segmentToSVG(seg, c, transformer)).toBeNull();
		expect(pointToSVG(mid, c, transformer)).toBeNull();
		expect(pointToSVG(b, c, transformer)).not.toBeNull();
	});
});

// =============================================================================
// Serialization round-trip
// =============================================================================

describe('serialization', () => {
	it('figureStateSchema validates a realistic construction', () => {
		const state = {
			version: 1,
			viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
			elements: [
				{
					type: 'freePoint' as const,
					id: 'pt_1',
					color: '#1e40af',
					visible: true,
					position: {
						x: { kind: 'exact' as const, latex: '0' },
						y: { kind: 'exact' as const, latex: '0' }
					},
					dependsOn: [] as const
				},
				{
					type: 'freePoint' as const,
					id: 'pt_2',
					color: '#1e40af',
					visible: true,
					position: {
						x: { kind: 'exact' as const, latex: '6' },
						y: { kind: 'exact' as const, latex: '0' }
					},
					dependsOn: [] as const
				},
				{
					type: 'segment' as const,
					id: 'seg_1',
					color: '#1e40af',
					visible: true,
					startId: 'pt_1',
					endId: 'pt_2',
					dependsOn: ['pt_1', 'pt_2'] as const
				},
				{
					type: 'midpoint' as const,
					id: 'mid_1',
					color: '#dc2626',
					visible: true,
					point1Id: 'pt_1',
					point2Id: 'pt_2',
					dependsOn: ['pt_1', 'pt_2'] as const
				}
			]
		};

		const result = figureStateSchema.safeParse(state);
		expect(result.success).toBe(true);
	});

	it('GeoValue exact round-trip preserves meaning', () => {
		const values = [
			exact(number(42)),
			exact(number(0)),
			exact(fraction(number(1), number(3))),
			exact(sqrt(number(2))),
			numeric(3.14),
			numeric(0),
			numeric(-42.5)
		];

		for (const v of values) {
			const serialized = serializeGeoValue(v);
			const parsed = geoValueSchema.safeParse(serialized);
			expect(parsed.success).toBe(true);
			const restored = deserializeGeoValue(parsed.data!);
			expect(geoToNumber(restored)).toBeCloseTo(geoToNumber(v), 8);
		}
	});
});

// =============================================================================
// Full scenario: interactive geometry exercise
// =============================================================================

describe('scenario: equilateral triangle exploration', () => {
	it('builds a triangle, moves a vertex, midpoints follow', () => {
		const c = new Figure();

		// Create equilateral triangle vertices
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(6, 0));
		const cc = c.createFreePoint({
			x: exact(number(3)),
			y: exact(sqrt(number(27))) // 3*sqrt(3)
		});

		// Create edges
		c.createSegment(a, b);
		c.createSegment(b, cc);
		c.createSegment(cc, a);

		// Create midpoints of all edges
		const mAB = c.createMidpoint(a, b);
		c.createMidpoint(b, cc);
		const mCA = c.createMidpoint(cc, a);

		// Verify initial midpoints
		expect(geoToNumber(c.getPosition(mAB)!.x)).toBe(3);
		expect(geoToNumber(c.getPosition(mAB)!.y)).toBe(0);

		// All elements render
		expect(c.size).toBe(9); // 3 points + 3 segments + 3 midpoints

		// Student drags vertex A
		c.movePoint(a, numeric(1), numeric(1));
		c.recompute();

		// mAB updates: mid of (1,1) and (6,0) = (3.5, 0.5)
		expect(geoToNumber(c.getPosition(mAB)!.x)).toBeCloseTo(3.5, 10);
		expect(geoToNumber(c.getPosition(mAB)!.y)).toBeCloseTo(0.5, 10);

		// mCA updates: mid of (3, 3*sqrt(3)) and (1, 1)
		const mCApos = c.getPosition(mCA)!;
		expect(geoToNumber(mCApos.x)).toBeCloseTo(2, 10);

		// All SVG still renders after drag
		for (const el of c.getAllElements()) {
			if (el.type === 'freePoint' || el.type === 'midpoint') {
				expect(pointToSVG(el.id, c, transformer)).not.toBeNull();
			}
			if (el.type === 'segment') {
				expect(segmentToSVG(el.id, c, transformer)).not.toBeNull();
			}
		}

		// Student snaps A back to exact position
		c.movePoint(a, exact(number(0)), exact(number(0)));
		c.recompute();

		// Midpoints are exact again
		const mABfinal = c.getPosition(mAB)!;
		expect(isExact(mABfinal.x)).toBe(true);
		expect(geoToNumber(mABfinal.x)).toBe(3);
	});
});
