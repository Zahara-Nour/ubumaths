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

describe('exportToTypst', () => {
	it('wraps output in cetz.canvas', () => {
		const f = new Figure();
		const result = exportToTypst(f, viewport);
		expect(result).toContain('#cetz.canvas');
		expect(result).toContain('import cetz.draw: *');
	});

	it('exports a free point', () => {
		const f = new Figure();
		f.createFreePoint(pt(3, 4), { label: 'A' });
		const result = exportToTypst(f, viewport);
		expect(result).toContain('circle((3, 4)');
		expect(result).toContain('$A$');
	});

	it('exports a segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		f.createSegment(a, b);
		const result = exportToTypst(f, viewport);
		expect(result).toContain('line(');
	});

	it('exports dashed segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { dash: 'dashed' } });
		const result = exportToTypst(f, viewport);
		expect(result).toContain('dashed');
	});

	it('exports a circle', () => {
		const f = new Figure();
		const c = f.createFreePoint(pt(0, 0));
		f.createCircleByRadius(c, numeric(3));
		const result = exportToTypst(f, viewport);
		expect(result).toContain('circle(');
		expect(result).toContain('radius: 3');
	});

	it('exports angle mark as arc', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngleMark(a, v, b);
		const result = exportToTypst(f, viewport);
		expect(result).toContain('arc(');
	});

	it('exports segment marks', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		f.createSegmentMark(a, b);
		const result = exportToTypst(f, viewport);
		expect(result).toContain('line(');
	});

	it('exports distance measure', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		createMesureText(f, 'distance', [a, b]);
		const result = exportToTypst(f, viewport);
		expect(result).toContain('content(');
		expect(result).toContain('5');
	});

	it('includes grid when requested', () => {
		const f = new Figure();
		const result = exportToTypst(f, viewport, { showGrid: true });
		expect(result).toContain('grid(');
	});

	it('includes axes when requested', () => {
		const f = new Figure();
		const result = exportToTypst(f, viewport, { showAxes: true });
		expect(result).toContain('line(');
	});

	it('respects scale option', () => {
		const f = new Figure();
		const result = exportToTypst(f, viewport, { scale: 0.5 });
		expect(result).toContain('scale(x: 0.5');
	});

	it('exports cross-shaped point', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { style: { pointShape: 'cross' } });
		const result = exportToTypst(f, viewport);
		expect(result).toContain('line(');
	});
});
