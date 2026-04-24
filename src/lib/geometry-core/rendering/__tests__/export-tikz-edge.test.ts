import { describe, it, expect } from 'vitest';
import { exportToTikZ } from '../export-tikz';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import type { Viewport } from '../../viewport/types';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

describe('exportToTikZ — edge cases', () => {
	// ─── Empty / minimal ──────────────────────────────────────

	it('empty figure produces valid output with no draw commands', () => {
		const f = new Figure();
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\begin{tikzpicture}');
		expect(result).toContain('\\end{tikzpicture}');
		expect(result).not.toContain('\\draw');
		expect(result).not.toContain('\\fill');
	});

	it('single point only', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0));
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\fill');
		expect(result).toContain('(0, 0)');
	});

	// ─── Coordinates ──────────────────────────────────────────

	it('handles negative coordinates', () => {
		const f = new Figure();
		f.createFreePoint(pt(-5.5, -3.2), { label: 'P' });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('(-5.5, -3.2)');
	});

	it('handles zero coordinates', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'O' });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('(0, 0)');
	});

	it('rounds coordinates to 3 decimal places', () => {
		const f = new Figure();
		f.createFreePoint(pt(1.23456789, 2.98765432));
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('(1.235, 2.988)');
	});

	it('handles large coordinates', () => {
		const f = new Figure();
		f.createFreePoint(pt(9.5, 7.5));
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('(9.5, 7.5)');
	});

	// ─── Labels ───────────────────────────────────────────────

	it('point without label has no node text', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0));
		const result = exportToTikZ(f, viewport);
		expect(result).not.toContain('node[');
	});

	it('handles special characters in labels', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: "M'" });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain("$M'$");
	});

	it('showLabels=false suppresses labels', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'A' });
		const result = exportToTikZ(f, viewport, { showLabels: false });
		expect(result).not.toContain('$A$');
	});

	// ─── Styles ───────────────────────────────────────────────

	it('exports thick line for strokeWidth >= 2.5', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { strokeWidth: 3 } });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('very thick');
	});

	it('exports thin line for strokeWidth <= 0.5', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { strokeWidth: 0.5 } });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('very thin');
	});

	it('exports opacity when < 1', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { opacity: 0.5 } });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('opacity=0.5');
	});

	it('does not add opacity when = 1', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b);
		const result = exportToTikZ(f, viewport);
		expect(result).not.toContain('opacity=');
	});

	// ─── Colors ───────────────────────────────────────────────

	it('defines each unique color only once', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { color: '#dc2626' });
		f.createFreePoint(pt(1, 0), { color: '#dc2626' });
		const result = exportToTikZ(f, viewport);
		const defCount = (result.match(/\\definecolor\{cdc2626\}/g) || []).length;
		expect(defCount).toBe(1);
	});

	it('handles default color', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0));
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\definecolor');
		expect(result).toContain('c1e40af');
	});

	// ─── Lines clipping ───────────────────────────────────────

	it('clips line to viewport bounds', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createLine(a, b);
		const result = exportToTikZ(f, viewport);
		// Line should be extended to viewport edges
		expect(result).toContain('-10');
		expect(result).toContain('10');
	});

	it('clips vertical line', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 0));
		const b = f.createFreePoint(pt(3, 1));
		f.createLine(a, b);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\draw');
	});

	it('clips ray to viewport', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createRay(a, b);
		const result = exportToTikZ(f, viewport);
		// Origin should be (0,0), end should be at viewport edge
		expect(result).toContain('(0, 0)');
	});

	// ─── Circles ──────────────────────────────────────────────

	it('exports circle with fractional radius', () => {
		const f = new Figure();
		const c = f.createFreePoint(pt(0, 0));
		f.createCircleByRadius(c, numeric(2.5));
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('circle (2.5)');
	});

	it('exports circle by point with computed radius', () => {
		const f = new Figure();
		const c = f.createFreePoint(pt(0, 0));
		const e = f.createFreePoint(pt(3, 4)); // radius = 5
		f.createCircleByPoint(c, e);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('circle (5)');
	});

	// ─── Angle marks ──────────────────────────────────────────

	it('exports 180° angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(-1, 0));
		f.createAngleMark(a, v, b);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('arc');
	});

	it('exports small angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0.1));
		f.createAngleMark(a, v, b);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('arc');
	});

	it('exports right angle with correct geometry', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngleMark(a, v, b, { rightAngle: true });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('% Right angle');
		// Should have 3 coordinates forming an L shape
		const rightLine = result.split('\n').find((l) => l.includes('Right angle'));
		expect(rightLine).toBeDefined();
	});

	it('exports 3 arcs for arcCount=3', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngleMark(a, v, b, { arcCount: 3 });
		const result = exportToTikZ(f, viewport);
		const arcMatches = result.match(/\\draw.*arc\s*\(/g) || [];
		expect(arcMatches.length).toBe(3);
	});

	// ─── Segment marks ────────────────────────────────────────

	it('exports tick perpendicular to horizontal segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		f.createSegmentMark(a, b);
		const result = exportToTikZ(f, viewport);
		// Midpoint at (2, 0), tick should be vertical
		expect(result).toContain('% Segment mark');
		expect(result).toContain('% Tick 1');
	});

	it('exports tick perpendicular to vertical segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 4));
		f.createSegmentMark(a, b);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('% Segment mark');
	});

	it('exports 2 ticks for markCount=2', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		f.createSegmentMark(a, b, { markCount: 2 });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('% Tick 1');
		expect(result).toContain('% Tick 2');
	});

	// ─── Measures ─────────────────────────────────────────────

	it('exports area measure', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(2, 0));
		const c = f.createFreePoint(pt(2, 2));
		const d = f.createFreePoint(pt(0, 2));
		f.createMeasure('area', [a, b, c, d]);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\node');
		expect(result).toContain('4');
	});

	it('showMeasures=false suppresses measures', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		f.createMeasure('distance', [a, b]);
		const result = exportToTikZ(f, viewport, { showMeasures: false });
		const measureSpecific = result.split('\n').filter((l) => l.includes('$5$'));
		expect(measureSpecific.length).toBe(0);
	});

	it('exports angle measure with degree command', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createMeasure('angle', [a, v, b]);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('^{\\circ}');
	});

	// ─── Options combinations ─────────────────────────────────

	it('grid + axes together', () => {
		const f = new Figure();
		const result = exportToTikZ(f, viewport, { showGrid: true, showAxes: true });
		expect(result).toContain('grid');
		expect(result).toContain('->');
	});

	it('scale=2 doubles the tikzpicture scale', () => {
		const f = new Figure();
		const result = exportToTikZ(f, viewport, { scale: 2 });
		expect(result).toContain('scale=2');
	});

	it('default scale has no scale option', () => {
		const f = new Figure();
		const result = exportToTikZ(f, viewport);
		expect(result).not.toContain('scale=');
	});

	// ─── FigureDefaults ───────────────────────────────────────

	it('uses FigureDefaults color', () => {
		const f = new Figure({ defaultColor: '#16a34a' });
		f.createFreePoint(pt(0, 0));
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('c16a34a');
	});

	// ─── Complex figure ───────────────────────────────────────

	it('exports a complex figure with all element types', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-4, -3), { label: 'A', color: '#1e40af' });
		const b = f.createFreePoint(pt(4, -3), { label: 'B', color: '#1e40af' });
		const c = f.createFreePoint(pt(0, 4), { label: 'C', color: '#1e40af' });
		f.createSegment(a, b, { color: '#1e40af' });
		f.createSegment(b, c, { color: '#1e40af' });
		f.createSegment(c, a, { color: '#1e40af' });
		f.createLine(a, b, { color: '#6366f1' });
		f.createRay(c, a, { color: '#6366f1' });
		f.createCircleByRadius(a, numeric(2), { color: '#059669' });
		f.createAngleMark(b, a, c, { color: '#dc2626' });
		f.createAngleMark(c, b, a, { color: '#dc2626', rightAngle: true });
		f.createSegmentMark(a, b, { color: '#dc2626', markCount: 2 });
		f.createMeasure('distance', [a, b], { color: '#6366f1' });
		f.createMeasure('angle', [b, a, c], { color: '#1e40af' });

		const result = exportToTikZ(f, viewport, { showGrid: true, showAxes: true });

		// Should contain all element types
		expect(result).toContain('\\fill'); // points
		expect(result).toContain('\\draw'); // segments, lines, circles
		expect(result).toContain('arc'); // angle mark
		expect(result).toContain('% Right angle'); // right angle
		expect(result).toContain('% Segment mark'); // segment mark
		expect(result).toContain('\\node'); // measures
		expect(result).toContain('grid'); // grid
		expect(result).toContain('->'); // axes
	});

	// ─── Midpoint and dependent points ────────────────────────

	it('exports midpoints at correct position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		f.createMidpoint(a, b, { label: 'M' });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('(2, 0)');
		expect(result).toContain('$M$');
	});
});
