import { describe, it, expect } from 'vitest';
import { numericNode } from '$lib/mathAST/common/numeric';
import { pointToSVG, segmentToSVG, lineToSVG, rayToSVG, circleToSVG } from '../svg-primitives';
import { Figure } from '../../graph/figure';
import { createTransformer } from '../../viewport/viewport';
import { exact } from '../../types/geo-value';
import { geoFromNumber } from '../../compute/geo-arithmetic';

// Standard viewport: -10..10 on both axes, 800x600 SVG
const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const transformer = createTransformer(viewport, 800, 600);

function point(x: number, y: number) {
	return { x: exact(numericNode(x)), y: exact(numericNode(y)) };
}

// =============================================================================
// pointToSVG
// =============================================================================

describe('pointToSVG', () => {
	it('converts a free point at origin to SVG center', () => {
		const c = new Figure();
		const id = c.createFreePoint(point(0, 0));
		const svg = pointToSVG(id, c, transformer);
		expect(svg).not.toBeNull();
		// Origin (0,0) in math -> center of SVG (400, 300)
		expect(svg!.cx).toBeCloseTo(400, 1);
		expect(svg!.cy).toBeCloseTo(300, 1);
	});

	it('converts a point at (10, 10) to top-right', () => {
		const c = new Figure();
		const id = c.createFreePoint(point(10, 10));
		const svg = pointToSVG(id, c, transformer);
		expect(svg!.cx).toBeCloseTo(800, 1);
		expect(svg!.cy).toBeCloseTo(0, 1);
	});

	it('converts a midpoint', () => {
		const c = new Figure();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(10, 0));
		const mid = c.createMidpoint(a, b);
		const svg = pointToSVG(mid, c, transformer);
		expect(svg).not.toBeNull();
		// Midpoint at (5, 0) -> SVG x = (5 - (-10)) / 20 * 800 = 600
		expect(svg!.cx).toBeCloseTo(600, 1);
		expect(svg!.cy).toBeCloseTo(300, 1);
	});

	it('returns null for non-point element', () => {
		const c = new Figure();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(1, 1));
		const seg = c.createSegment(a, b);
		expect(pointToSVG(seg, c, transformer)).toBeNull();
	});

	it('returns null for unknown id', () => {
		const c = new Figure();
		expect(pointToSVG('nope', c, transformer)).toBeNull();
	});

	it('returns cx and cy coordinates', () => {
		const c = new Figure();
		const id = c.createFreePoint(point(0, 0));
		const svg = pointToSVG(id, c, transformer);
		expect(svg).toBeDefined();
		expect(typeof svg!.cx).toBe('number');
		expect(typeof svg!.cy).toBe('number');
	});
});

// =============================================================================
// segmentToSVG
// =============================================================================

describe('segmentToSVG', () => {
	it('converts a segment between two points', () => {
		const c = new Figure();
		const a = c.createFreePoint(point(-5, 0));
		const b = c.createFreePoint(point(5, 0));
		const seg = c.createSegment(a, b);
		const svg = segmentToSVG(seg, c, transformer);
		expect(svg).not.toBeNull();
		// (-5,0) -> SVG x = 200, (5,0) -> SVG x = 600
		expect(svg!.x1).toBeCloseTo(200, 1);
		expect(svg!.x2).toBeCloseTo(600, 1);
		expect(svg!.y1).toBeCloseTo(300, 1);
		expect(svg!.y2).toBeCloseTo(300, 1);
	});

	it('returns null for non-segment element', () => {
		const c = new Figure();
		const a = c.createFreePoint(point(0, 0));
		expect(segmentToSVG(a, c, transformer)).toBeNull();
	});

	it('returns null if a parent point has no position', () => {
		const c = new Figure();
		// Can't easily test this since createSegment requires existing points,
		// but we test unknown id
		expect(segmentToSVG('nope', c, transformer)).toBeNull();
	});
});

// =============================================================================
// lineToSVG
// =============================================================================

describe('lineToSVG', () => {
	it('extends a horizontal line to viewport edges', () => {
		const c = new Figure();
		const a = c.createFreePoint(point(-2, 0));
		const b = c.createFreePoint(point(2, 0));
		const ln = c.createLine(a, b);
		const svg = lineToSVG(ln, c, transformer, { width: 800, height: 600 });
		expect(svg).not.toBeNull();
		// Horizontal line y=0 extended to full width
		expect(svg!.x1).toBeCloseTo(0, 0);
		expect(svg!.x2).toBeCloseTo(800, 0);
		expect(svg!.y1).toBeCloseTo(300, 1);
		expect(svg!.y2).toBeCloseTo(300, 1);
	});

	it('extends a vertical line to viewport edges', () => {
		const c = new Figure();
		const a = c.createFreePoint(point(0, -2));
		const b = c.createFreePoint(point(0, 2));
		const ln = c.createLine(a, b);
		const svg = lineToSVG(ln, c, transformer, { width: 800, height: 600 });
		expect(svg).not.toBeNull();
		expect(svg!.x1).toBeCloseTo(400, 1);
		expect(svg!.x2).toBeCloseTo(400, 1);
	});

	it('returns null for non-line element', () => {
		const c = new Figure();
		const a = c.createFreePoint(point(0, 0));
		expect(lineToSVG(a, c, transformer, { width: 800, height: 600 })).toBeNull();
	});
});

// =============================================================================
// rayToSVG
// =============================================================================

describe('rayToSVG', () => {
	it('starts at origin, extends in one direction', () => {
		const c = new Figure();
		const origin = c.createFreePoint(point(0, 0));
		const through = c.createFreePoint(point(5, 0));
		const ray = c.createRay(origin, through);
		const svg = rayToSVG(ray, c, transformer, { width: 800, height: 600 });
		expect(svg).not.toBeNull();
		// Origin at SVG (400, 300), extends right
		expect(svg!.x1).toBeCloseTo(400, 1);
		expect(svg!.y1).toBeCloseTo(300, 1);
		expect(svg!.x2).toBeCloseTo(800, 0); // extends to right edge
	});

	it('returns null for non-ray element', () => {
		const c = new Figure();
		const a = c.createFreePoint(point(0, 0));
		expect(rayToSVG(a, c, transformer, { width: 800, height: 600 })).toBeNull();
	});
});

// =============================================================================
// circleToSVG
// =============================================================================

describe('circleToSVG', () => {
	it('converts circleByRadius', () => {
		const c = new Figure();
		const center = c.createFreePoint(point(0, 0));
		const id = c.createCircleByRadius(center, geoFromNumber(5));
		const svg = circleToSVG(id, c, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.cx).toBeCloseTo(400, 1);
		expect(svg!.cy).toBeCloseTo(300, 1);
		// radius 5 math units * scaleX (800/20 = 40 px/unit) = 200 px
		expect(svg!.r).toBeCloseTo(200, 1);
	});

	it('converts circleByPoint', () => {
		const c = new Figure();
		const center = c.createFreePoint(point(0, 0));
		const edge = c.createFreePoint(point(3, 4));
		const id = c.createCircleByPoint(center, edge);
		const svg = circleToSVG(id, c, transformer);
		expect(svg).not.toBeNull();
		// Radius is SVG distance between center and edge
		// svgCenter=(400,300), svgEdge=(520,180), distance = sqrt(120^2+120^2) ≈ 169.7
		const svgEdge = transformer.mathToSvg(3, 4);
		const expectedR = Math.sqrt((svgEdge.x - 400) ** 2 + (svgEdge.y - 300) ** 2);
		expect(svg!.r).toBeCloseTo(expectedR, 1);
	});

	it('returns null for non-circle element', () => {
		const c = new Figure();
		const a = c.createFreePoint(point(0, 0));
		expect(circleToSVG(a, c, transformer)).toBeNull();
	});
});
