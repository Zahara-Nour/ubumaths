import { describe, it, expect } from 'vitest';
import { exportToSVG } from '../export-svg';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import type { Viewport } from '../../viewport/types';
import { createMesureText } from './test-helpers';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

describe('exportToSVG', () => {
	// ─── Structure ────────────────────────────────────────────

	it('produces valid SVG with xml namespace', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<svg');
		expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
		expect(result).toContain('</svg>');
	});

	it('sets viewBox from viewport and dimensions', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport, { width: 800, height: 600 });
		expect(result).toContain('viewBox="0 0 800 600"');
	});

	it('sets width and height attributes', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport, { width: 400, height: 300 });
		expect(result).toContain('width="400"');
		expect(result).toContain('height="300"');
	});

	it('empty figure has white background', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport);
		expect(result).toContain('fill="white"');
	});

	// ─── Points ───────────────────────────────────────────────

	it('exports a point as circle', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'A' });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<circle');
	});

	it('exports point label as text', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'A' });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<text');
		expect(result).toContain('A');
	});

	it('exports cross-shaped point as two lines', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { style: { pointShape: 'cross' } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<line');
	});

	it('exports square-shaped point as rect', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { style: { pointShape: 'square' } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<rect');
	});

	// ─── Segments ─────────────────────────────────────────────

	it('exports segment as line', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		f.createSegment(a, b);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<line');
	});

	it('exports dashed segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { dash: 'dashed' } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('stroke-dasharray="12 8"');
	});

	it('exports dotted segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { dash: 'dotted' } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('stroke-dasharray="2 6"');
	});

	// ─── Lines and rays ───────────────────────────────────────

	it('exports a line clipped to viewport', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		f.createLine(a, b);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<line');
	});

	it('exports a ray', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createRay(a, b);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<line');
	});

	// ─── Circles ──────────────────────────────────────────────

	it('exports circle by radius', () => {
		const f = new Figure();
		const c = f.createFreePoint(pt(0, 0));
		f.createCircleByRadius(c, numeric(3));
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<circle');
		expect(result).toContain('fill="none"');
	});

	it('exports circle by point', () => {
		const f = new Figure();
		const c = f.createFreePoint(pt(0, 0));
		const e = f.createFreePoint(pt(3, 0));
		f.createCircleByPoint(c, e);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<circle');
	});

	// ─── Angle marks ──────────────────────────────────────────

	it('exports angle mark as path', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngle(a, v, b);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<path');
		expect(result).toContain(' A ');
	});

	it('exports right angle as path with L', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngle(a, v, b, { marque: 'carre' });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<path');
		expect(result).toContain(' L ');
	});

	it('exports multiple arcs for marque=arcs3', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngle(a, v, b, { marque: 'arcs3' });
		const result = exportToSVG(f, viewport);
		const pathCount = (result.match(/<path/g) || []).length;
		expect(pathCount).toBe(3);
	});

	// ─── Segment marks ────────────────────────────────────────

	it('exports segment marks as lines', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		f.createSegmentMark(a, b, { markCount: 2 });
		const result = exportToSVG(f, viewport);
		// Should have tick lines (plus segment line and other elements)
		expect(result).toContain('<line');
	});

	// ─── Measures ─────────────────────────────────────────────

	it('exports distance measure as text', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		createMesureText(f, 'distance', [a, b]);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<text');
		expect(result).toContain('5');
	});

	it('exports angle measure with degree symbol', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		createMesureText(f, 'angle', [a, v, b]);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('90');
		expect(result).toContain('°');
	});

	// ─── Options ──────────────────────────────────────────────

	it('includes grid when showGrid is true', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport, { showGrid: true });
		expect(result).toContain('class="grid"');
	});

	it('excludes grid by default', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport);
		expect(result).not.toContain('class="grid"');
	});

	it('includes axes when showAxes is true', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport, { showAxes: true });
		expect(result).toContain('class="axis"');
	});

	it('showLabels=false suppresses labels', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'A' });
		const result = exportToSVG(f, viewport, { showLabels: false });
		expect(result).not.toContain('>A<');
	});

	it('showMeasures=false suppresses measures', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		createMesureText(f, 'distance', [a, b]);
		const result = exportToSVG(f, viewport, { showMeasures: false });
		expect(result).not.toContain('>5<');
	});

	// ─── Edge cases ───────────────────────────────────────────

	it('empty figure is valid SVG', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport);
		expect(result.startsWith('<svg')).toBe(true);
		expect(result.endsWith('</svg>')).toBe(true);
	});

	it('handles negative coordinates', () => {
		const f = new Figure();
		f.createFreePoint(pt(-5, -3));
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<circle');
	});

	it('does not include interactive attributes', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0));
		const result = exportToSVG(f, viewport);
		expect(result).not.toContain('onpointer');
		expect(result).not.toContain('ondblclick');
		expect(result).not.toContain('cursor');
		expect(result).not.toContain('draggable');
	});

	it('includes label halo', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'A' });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('paint-order="stroke"');
		expect(result).toContain('stroke="white"');
	});

	it('exports complex figure', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-4, -3), { label: 'A' });
		const b = f.createFreePoint(pt(4, -3), { label: 'B' });
		const c = f.createFreePoint(pt(0, 4), { label: 'C' });
		f.createSegment(a, b);
		f.createSegment(b, c);
		f.createSegment(c, a);
		f.createLine(a, b);
		f.createCircleByRadius(a, numeric(2));
		f.createAngle(b, a, c);
		f.createAngle(c, b, a, { marque: 'carre' });
		f.createSegmentMark(a, b, { markCount: 2 });
		createMesureText(f, 'distance', [a, b]);
		f.createMidpoint(a, b, { label: 'M' });

		const result = exportToSVG(f, viewport, { showGrid: true, showAxes: true });
		expect(result).toContain('<svg');
		expect(result).toContain('</svg>');
		expect(result).toContain('<circle'); // points + circle
		expect(result).toContain('<line'); // segments
		expect(result).toContain('<path'); // angle marks
		expect(result).toContain('<text'); // labels + measures
	});

	it('respects custom dimensions', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport, { width: 1200, height: 900 });
		expect(result).toContain('width="1200"');
		expect(result).toContain('height="900"');
		expect(result).toContain('viewBox="0 0 1200 900"');
	});
});
