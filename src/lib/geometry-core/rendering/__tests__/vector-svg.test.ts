import { describe, it, expect } from 'vitest';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import { vectorToSVG } from '../svg-primitives';
import { createTransformer } from '../../viewport/viewport';
import type { Viewport } from '../../viewport/types';
import { exportToSVG } from '../export-svg';

const viewport: Viewport = {
	xMin: -4,
	xMax: 4,
	yMin: -3,
	yMax: 3
};

const svgWidth = 400;
const svgHeight = 300;
const transformer = createTransformer(viewport, svgWidth, svgHeight);

describe('vectorToSVG', () => {
	it('returns null for non-vector elements', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		expect(vectorToSVG(a, fig, transformer)).toBeNull();
	});

	it('returns SVG data for a bound vector', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(2), y: numeric(0) });
		const v = fig.createVectorByPoints(a, b);

		const svg = vectorToSVG(v, fig, transformer);
		expect(svg).not.toBeNull();
		// Should have start, end, shaft endpoint, and arrow points
		expect(svg!.x1).toBeDefined();
		expect(svg!.y1).toBeDefined();
		expect(svg!.shaftX2).toBeDefined();
		expect(svg!.shaftY2).toBeDefined();
		expect(svg!.arrowPoints).toBeDefined();
		expect(svg!.arrowPoints).toContain(',');
	});

	it('returns SVG data for a free vector', () => {
		const fig = new Figure();
		const v = fig.createFreeVector(numeric(3), numeric(0));

		const svg = vectorToSVG(v, fig, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.arrowPoints).toBeDefined();
	});

	it('returns null for zero-length vector', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
		const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
		const v = fig.createVectorByPoints(a, b);

		const svg = vectorToSVG(v, fig, transformer);
		expect(svg).toBeNull();
	});

	it('shaft stops before the arrowhead tip', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(4), y: numeric(0) });
		const v = fig.createVectorByPoints(a, b);

		const svg = vectorToSVG(v, fig, transformer)!;
		// shaftX2 should be less than x2 (closer to start than the tip)
		// x2 is the tip, shaftX2 is the base of the arrowhead
		// For horizontal vector pointing right in SVG coords (y inverted):
		// x2 > x1 (right), so shaftX2 < x2
		expect(Math.abs(svg.shaftX2)).toBeLessThan(Math.abs(svg.x2));
	});
});

describe('exportToSVG with vectors', () => {
	it('includes vector line and arrowhead polygon', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(2), y: numeric(0) });
		fig.createVectorByPoints(a, b);

		const svg = exportToSVG(fig, viewport);
		expect(svg).toContain('<line');
		expect(svg).toContain('<polygon');
	});

	it('includes free vector in SVG output', () => {
		const fig = new Figure();
		fig.createFreeVector(numeric(3), numeric(4));

		const svg = exportToSVG(fig, viewport);
		expect(svg).toContain('<polygon');
	});
});
