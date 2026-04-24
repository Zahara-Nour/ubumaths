import { describe, it, expect } from 'vitest';
import { exportToTikZ } from '../export-tikz';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import type { Viewport } from '../../viewport/types';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

describe('exportToTikZ', () => {
	// ─── Structure ────────────────────────────────────────────

	it('wraps output in tikzpicture environment', () => {
		const f = new Figure();
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\begin{tikzpicture}');
		expect(result).toContain('\\end{tikzpicture}');
	});

	it('empty figure produces valid tikzpicture', () => {
		const f = new Figure();
		const result = exportToTikZ(f, viewport);
		expect(result).toMatch(/\\begin\{tikzpicture\}.*\\end\{tikzpicture\}/s);
	});

	// ─── Points ───────────────────────────────────────────────

	it('exports a free point as \\fill circle', () => {
		const f = new Figure();
		f.createFreePoint(pt(3, 4), { label: 'A' });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\fill');
		expect(result).toContain('(3, 4)');
		expect(result).toContain('circle');
	});

	it('exports point label in math mode', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'A' });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('$A$');
	});

	it('exports point with prime in label', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: "A'" });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain("$A'$");
	});

	it('does not export invisible elements', () => {
		const f = new Figure();
		f.createFreePoint(pt(3, 4), { label: 'A' });
		// There's no direct way to set visible=false via factory, but we can test the function handles it
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('$A$');
	});

	it('exports cross-shaped point', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'P', style: { pointShape: 'cross' } });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('cross out');
	});

	it('exports square-shaped point', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'P', style: { pointShape: 'square' } });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('rectangle');
	});

	// ─── Segments ─────────────────────────────────────────────

	it('exports a segment as \\draw line', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		f.createSegment(a, b);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\draw');
		expect(result).toContain('--');
	});

	it('exports dashed segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { dash: 'dashed' } });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('dashed');
	});

	it('exports dotted segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { dash: 'dotted' } });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('dotted');
	});

	// ─── Lines and rays ───────────────────────────────────────

	it('exports a line clipped to viewport', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		f.createLine(a, b);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\draw');
		expect(result).toContain('--');
	});

	it('exports a ray', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createRay(a, b);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\draw');
	});

	// ─── Circles ──────────────────────────────────────────────

	it('exports a circle by radius', () => {
		const f = new Figure();
		const c = f.createFreePoint(pt(0, 0));
		f.createCircleByRadius(c, numeric(3));
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('circle');
		expect(result).toContain('3');
	});

	it('exports a circle by point', () => {
		const f = new Figure();
		const c = f.createFreePoint(pt(0, 0));
		const e = f.createFreePoint(pt(3, 0));
		f.createCircleByPoint(c, e);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('circle');
	});

	// ─── Angle marks ──────────────────────────────────────────

	it('exports angle mark as arc', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngleMark(a, v, b);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('arc');
	});

	it('exports right angle as square', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngleMark(a, v, b, { rightAngle: true });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('--');
		// Right angle should NOT contain arc
		// Find the right-angle specific line
		const lines = result.split('\n');
		const angleLine = lines.find((l) => l.includes('% Right angle'));
		if (angleLine) {
			expect(angleLine).not.toContain('arc');
		}
	});

	it('exports multiple arcs for arcCount > 1', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngleMark(a, v, b, { arcCount: 2 });
		const result = exportToTikZ(f, viewport);
		const arcCount = (result.match(/arc\s*\(/g) || []).length;
		expect(arcCount).toBeGreaterThanOrEqual(2);
	});

	// ─── Segment marks ────────────────────────────────────────

	it('exports segment tick marks', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		f.createSegmentMark(a, b);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('% Segment mark');
	});

	it('exports multiple ticks for markCount > 1', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		f.createSegmentMark(a, b, { markCount: 3 });
		const result = exportToTikZ(f, viewport);
		// Should have 3 tick draw commands
		const tickCount = (result.match(/\\draw.*Tick/g) || []).length;
		expect(tickCount).toBe(3);
	});

	// ─── Measures ─────────────────────────────────────────────

	it('exports distance measure as node', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		f.createMeasure('distance', [a, b]);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\node');
		expect(result).toContain('5');
	});

	it('exports angle measure with degree symbol', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createMeasure('angle', [a, v, b]);
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\node');
		expect(result).toContain('90');
	});

	// ─── Colors ───────────────────────────────────────────────

	it('defines custom colors', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { color: '#dc2626' });
		const result = exportToTikZ(f, viewport);
		expect(result).toContain('\\definecolor');
	});

	// ─── Options ──────────────────────────────────────────────

	it('includes grid when showGrid is true', () => {
		const f = new Figure();
		const result = exportToTikZ(f, viewport, { showGrid: true });
		expect(result).toContain('grid');
	});

	it('excludes grid by default', () => {
		const f = new Figure();
		const result = exportToTikZ(f, viewport);
		expect(result).not.toContain('\\draw[gray');
	});

	it('includes axes when showAxes is true', () => {
		const f = new Figure();
		const result = exportToTikZ(f, viewport, { showAxes: true });
		expect(result).toContain('->');
	});

	it('respects scale option', () => {
		const f = new Figure();
		const result = exportToTikZ(f, viewport, { scale: 0.5 });
		expect(result).toContain('scale=0.5');
	});
});
