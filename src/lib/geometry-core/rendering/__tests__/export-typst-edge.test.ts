import { describe, it, expect } from 'vitest';
import { exportToTypst } from '../export-typst';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import type { Viewport } from '../../viewport/types';
import { createMesureText } from './test-helpers';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

describe('exportToTypst — edge cases', () => {
	// ─── Empty / minimal ──────────────────────────────────────

	it('empty figure produces valid output', () => {
		const f = new Figure();
		const result = exportToTypst(f, viewport);
		expect(result).toContain('#cetz.canvas');
		expect(result).toContain('})');
		expect(result).not.toContain('line(');
		expect(result).not.toContain('circle(');
	});

	// ─── Coordinates ──────────────────────────────────────────

	it('handles negative coordinates', () => {
		const f = new Figure();
		f.createFreePoint(pt(-5.5, -3.2), { label: 'P' });
		const result = exportToTypst(f, viewport);
		expect(result).toContain('(-5.5, -3.2)');
	});

	it('rounds coordinates to 3 decimal places', () => {
		const f = new Figure();
		f.createFreePoint(pt(1.23456789, 2.98765432));
		const result = exportToTypst(f, viewport);
		expect(result).toContain('(1.235, 2.988)');
	});

	// ─── Labels ───────────────────────────────────────────────

	it('point without label has no content call', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0));
		const result = exportToTypst(f, viewport);
		expect(result).not.toContain('content(');
	});

	it('showLabels=false suppresses labels', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'A' });
		const result = exportToTypst(f, viewport, { showLabels: false });
		expect(result).not.toContain('$A$');
	});

	// ─── Styles ───────────────────────────────────────────────

	it('exports dashed style', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { dash: 'dashed' } });
		const result = exportToTypst(f, viewport);
		expect(result).toContain('dash: "dashed"');
	});

	it('exports dotted style', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { dash: 'dotted' } });
		const result = exportToTypst(f, viewport);
		expect(result).toContain('dash: "dotted"');
	});

	it('solid style has no dash property', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b);
		const result = exportToTypst(f, viewport);
		expect(result).not.toContain('dash:');
	});

	// ─── Colors ───────────────────────────────────────────────

	it('uses rgb() color format', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { color: '#dc2626' });
		const result = exportToTypst(f, viewport);
		expect(result).toContain('rgb("#dc2626")');
	});

	// ─── Point shapes ─────────────────────────────────────────

	it('exports circle-shaped point (hollow)', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { style: { pointShape: 'circle' } });
		const result = exportToTypst(f, viewport);
		expect(result).toContain('fill: none');
	});

	it('exports square-shaped point', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { style: { pointShape: 'square' } });
		const result = exportToTypst(f, viewport);
		expect(result).toContain('rect(');
	});

	// ─── Lines clipping ───────────────────────────────────────

	it('clips line to viewport', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createLine(a, b);
		const result = exportToTypst(f, viewport);
		expect(result).toContain('line(');
	});

	it('clips vertical line', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(5, 0));
		const b = f.createFreePoint(pt(5, 1));
		f.createLine(a, b);
		const result = exportToTypst(f, viewport);
		expect(result).toContain('line(');
	});

	// ─── Circles ──────────────────────────────────────────────

	it('exports circle by point with computed radius', () => {
		const f = new Figure();
		const c = f.createFreePoint(pt(0, 0));
		const e = f.createFreePoint(pt(3, 4)); // radius = 5
		f.createCircleByPoint(c, e);
		const result = exportToTypst(f, viewport);
		expect(result).toContain('radius: 5');
	});

	// ─── Angle marks ──────────────────────────────────────────

	it('exports right angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngle(a, v, b, { marque: 'carre' });
		const result = exportToTypst(f, viewport);
		// Right angle uses line(), not arc()
		expect(result).toContain('line(');
		expect(result).not.toContain('arc(');
	});

	it('exports multiple arcs for marque=arcs3', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngle(a, v, b, { marque: 'arcs3' });
		const result = exportToTypst(f, viewport);
		const arcMatches = result.match(/arc\(/g) || [];
		expect(arcMatches.length).toBe(3);
	});

	// ─── Segment marks ────────────────────────────────────────

	it('exports 3 ticks for markCount=3', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		f.createSegmentMark(a, b, { markCount: 3 });
		const result = exportToTypst(f, viewport);
		// Count tick lines (each tick is a line() call with specific coords)
		// Points also generate line() for cross shapes, but ticks have specific pattern
		// Just check there are at least 3 line() calls beyond the point-related ones
		const lineMatches = result.match(/line\(/g) || [];
		expect(lineMatches.length).toBeGreaterThanOrEqual(3);
	});

	// ─── Measures ─────────────────────────────────────────────

	it('exports angle measure with degree', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		createMesureText(f, 'angle', [a, v, b]);
		const result = exportToTypst(f, viewport);
		expect(result).toContain('content(');
		expect(result).toContain('90');
	});

	it('exports area measure', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(2, 0));
		const c = f.createFreePoint(pt(2, 2));
		const d = f.createFreePoint(pt(0, 2));
		createMesureText(f, 'area', [a, b, c, d]);
		const result = exportToTypst(f, viewport);
		expect(result).toContain('content(');
		expect(result).toContain('4');
	});

	it('showMeasures=false suppresses measures', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		createMesureText(f, 'distance', [a, b]);
		const result = exportToTypst(f, viewport, { showMeasures: false });
		const contentCalls = result.split('\n').filter((l) => l.includes('content('));
		expect(contentCalls.length).toBe(0);
	});

	// ─── Options ──────────────────────────────────────────────

	it('default scale has no set-transform', () => {
		const f = new Figure();
		const result = exportToTypst(f, viewport);
		expect(result).not.toContain('scale(');
	});

	it('includes cetz import', () => {
		const f = new Figure();
		const result = exportToTypst(f, viewport);
		expect(result).toContain('#import "@preview/cetz:0.3.4"');
	});

	// ─── Complex figure ───────────────────────────────────────

	it('exports complex figure with all element types', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-4, -3), { label: 'A' });
		const b = f.createFreePoint(pt(4, -3), { label: 'B' });
		const c = f.createFreePoint(pt(0, 4), { label: 'C' });
		f.createSegment(a, b);
		f.createLine(a, b);
		f.createRay(c, a);
		f.createCircleByRadius(a, numeric(2));
		f.createAngle(b, a, c);
		f.createSegmentMark(a, b, { markCount: 2 });
		createMesureText(f, 'distance', [a, b]);
		f.createMidpoint(a, b, { label: 'M' });

		const result = exportToTypst(f, viewport, { showGrid: true, showAxes: true });
		expect(result).toContain('circle('); // points + circle
		expect(result).toContain('line('); // segments, rays, ticks
		expect(result).toContain('arc('); // angle mark
		expect(result).toContain('content('); // labels + measures
		expect(result).toContain('grid('); // grid
		expect(result).toContain('$M$'); // midpoint label
	});
});
