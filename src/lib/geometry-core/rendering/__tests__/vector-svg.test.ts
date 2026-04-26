import { describe, it, expect } from 'vitest';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import { vectorToSVG } from '../svg-primitives';
import { createTransformer } from '../../viewport/viewport';
import type { Viewport } from '../../viewport/types';
import { exportToSVG } from '../export-svg';
import { exportToTikZ } from '../export-tikz';
import { exportToTypst } from '../export-typst';

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

// =============================================================================
// Edge case tests
// =============================================================================

describe('vectorToSVG edge cases', () => {
	// ─── Very short vector (near-zero but above threshold) ──────────

	it('returns SVG data for a very short vector (just above 1e-6 threshold)', () => {
		const fig = new Figure();
		// 0.001 units should produce a non-zero length in SVG after transform
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(0.001), y: numeric(0) });
		const v = fig.createVectorByPoints(a, b);

		const svg = vectorToSVG(v, fig, transformer);
		// Even tiny math vectors become measurable in SVG coords (400px for 8 units = 50px/unit)
		// 0.001 * 50 = 0.05 px which is above the 1e-6 SVG pixel threshold
		expect(svg).not.toBeNull();
		if (svg) {
			expect(svg.arrowPoints).toBeDefined();
		}
	});

	// ─── Very long vector ───────────────────────────────────────────

	it('returns valid SVG for a very long vector', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(-4), y: numeric(-3) });
		const b = fig.createFreePoint({ x: numeric(4), y: numeric(3) });
		const v = fig.createVectorByPoints(a, b);

		const svg = vectorToSVG(v, fig, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.arrowPoints).toBeDefined();
		// Shaft should stop before tip
		const shaftLen = Math.sqrt((svg!.shaftX2 - svg!.x1) ** 2 + (svg!.shaftY2 - svg!.y1) ** 2);
		const fullLen = Math.sqrt((svg!.x2 - svg!.x1) ** 2 + (svg!.y2 - svg!.y1) ** 2);
		expect(shaftLen).toBeLessThan(fullLen);
	});

	// ─── Diagonal vector (45 degrees) — arrowhead symmetry ──────────

	it('produces symmetric arrowhead for a 45-degree diagonal vector', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(2), y: numeric(2) });
		const v = fig.createVectorByPoints(a, b);

		const svg = vectorToSVG(v, fig, transformer)!;
		expect(svg).not.toBeNull();

		// Parse arrowPoints: "wing1x,wing1y tipx,tipy wing2x,wing2y"
		const parts = svg.arrowPoints.split(' ');
		expect(parts).toHaveLength(3);

		const [w1, tip, w2] = parts.map((p) => {
			const [x, y] = p.split(',').map(Number);
			return { x, y };
		});

		// Both wings should be equidistant from the tip
		const dist1 = Math.sqrt((w1.x - tip.x) ** 2 + (w1.y - tip.y) ** 2);
		const dist2 = Math.sqrt((w2.x - tip.x) ** 2 + (w2.y - tip.y) ** 2);
		expect(dist1).toBeCloseTo(dist2, 5);
	});

	// ─── Negative direction vector ──────────────────────────────────

	it('returns valid SVG for a vector pointing in negative direction', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(3), y: numeric(3) });
		const b = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const v = fig.createVectorByPoints(a, b);

		const svg = vectorToSVG(v, fig, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.arrowPoints).toBeDefined();
	});

	it('returns valid SVG for a free vector with negative components', () => {
		const fig = new Figure();
		const v = fig.createFreeVector(numeric(-3), numeric(-2));

		const svg = vectorToSVG(v, fig, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.arrowPoints).toBeDefined();
	});

	// ─── Free vector SVG starts at anchor position ──────────────────

	it('free vector SVG starts at anchor position, not origin', () => {
		const fig = new Figure();
		const v = fig.createFreeVector(numeric(2), numeric(0), {
			x: numeric(1),
			y: numeric(1)
		});

		const svg = vectorToSVG(v, fig, transformer)!;
		expect(svg).not.toBeNull();

		// Create a second free vector at default origin for comparison
		const v0 = fig.createFreeVector(numeric(2), numeric(0));
		const svg0 = vectorToSVG(v0, fig, transformer)!;
		expect(svg0).not.toBeNull();

		// The starting points should differ since anchors differ
		expect(svg.x1).not.toBeCloseTo(svg0.x1, 1);
	});
});

// =============================================================================
// Export format edge cases
// =============================================================================

describe('export TikZ with vectors', () => {
	it('contains -> and stealth for a bound vector', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(2), y: numeric(1) });
		fig.createVectorByPoints(a, b);

		const tikz = exportToTikZ(fig, viewport);
		expect(tikz).toContain('->');
		expect(tikz).toContain('stealth');
	});

	it('contains -> and stealth for a free vector', () => {
		const fig = new Figure();
		fig.createFreeVector(numeric(3), numeric(4));

		const tikz = exportToTikZ(fig, viewport);
		expect(tikz).toContain('->');
		expect(tikz).toContain('stealth');
	});
});

describe('export Typst with vectors', () => {
	it('contains mark and stealth for a bound vector', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(2), y: numeric(1) });
		fig.createVectorByPoints(a, b);

		const typst = exportToTypst(fig, viewport);
		expect(typst).toContain('mark');
		expect(typst).toContain('stealth');
	});

	it('contains mark and stealth for a free vector', () => {
		const fig = new Figure();
		fig.createFreeVector(numeric(3), numeric(4));

		const typst = exportToTypst(fig, viewport);
		expect(typst).toContain('mark');
		expect(typst).toContain('stealth');
	});
});
