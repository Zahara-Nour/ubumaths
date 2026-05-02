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

describe('exportToSVG — edge cases', () => {
	// ─── Empty / minimal ──────────────────────────────────────

	it('empty figure has no element tags except background rect', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport);
		const circleCount = (result.match(/<circle/g) || []).length;
		const lineCount = (result.match(/<line/g) || []).length;
		const textCount = (result.match(/<text/g) || []).length;
		expect(circleCount).toBe(0);
		expect(lineCount).toBe(0);
		expect(textCount).toBe(0);
	});

	it('single point without label has no text element', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0));
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<circle');
		expect(result).not.toContain('<text');
	});

	// ─── Coordinate precision ─────────────────────────────────

	it('coordinates are rounded to 2 decimal places', () => {
		const f = new Figure();
		f.createFreePoint(pt(1.23456, 2.98765));
		const result = exportToSVG(f, viewport);
		// Should not have more than 2 decimal places in cx/cy
		expect(result).not.toMatch(/cx="[^"]*\.\d{3,}"/);
	});

	it('handles coordinates at viewport boundaries', () => {
		const f = new Figure();
		f.createFreePoint(pt(-10, -8));
		f.createFreePoint(pt(10, 8));
		const result = exportToSVG(f, viewport);
		const circleCount = (result.match(/<circle/g) || []).length;
		expect(circleCount).toBe(2);
	});

	it('handles coordinates outside viewport', () => {
		const f = new Figure();
		f.createFreePoint(pt(100, 100));
		const result = exportToSVG(f, viewport);
		// Point is still rendered (just off-screen)
		expect(result).toContain('<circle');
	});

	// ─── Styles ───────────────────────────────────────────────

	it('applies stroke-dasharray for dashed style', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { dash: 'dashed' } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('stroke-dasharray="12 8"');
	});

	it('no stroke-dasharray for solid style', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b);
		const result = exportToSVG(f, viewport);
		// Find the segment line (not grid lines)
		const segLines = result.split('\n').filter((l) => l.includes('stroke="#1e40af"'));
		expect(segLines.length).toBeGreaterThan(0);
		for (const line of segLines) {
			if (line.includes('<line') && !line.includes('class=')) {
				expect(line).not.toContain('stroke-dasharray');
			}
		}
	});

	it('applies opacity when < 1', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { opacity: 0.3 } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('opacity="0.3"');
	});

	it('no opacity attribute when = 1', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b);
		const result = exportToSVG(f, viewport);
		const segLines = result
			.split('\n')
			.filter((l) => l.includes('stroke="#1e40af"') && l.includes('<line'));
		expect(segLines.length).toBeGreaterThan(0);
		for (const line of segLines) {
			expect(line).not.toContain('opacity=');
		}
	});

	it('custom strokeWidth is applied', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createSegment(a, b, { style: { strokeWidth: 4 } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('stroke-width="4"');
	});

	it('custom color is applied', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { color: '#dc2626' });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('fill="#dc2626"');
	});

	// ─── Point shapes ─────────────────────────────────────────

	it('circle shape has fill="none"', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { style: { pointShape: 'circle' } });
		const result = exportToSVG(f, viewport);
		const pointCircles = result
			.split('\n')
			.filter(
				(l) => l.includes('<circle') && l.includes('fill="none"') && l.includes('stroke="#1e40af"')
			);
		expect(pointCircles.length).toBeGreaterThanOrEqual(1);
	});

	it('cross shape produces 2 lines', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { style: { pointShape: 'cross' } });
		const result = exportToSVG(f, viewport);
		const crossLines = result
			.split('\n')
			.filter((l) => l.includes('<line') && l.includes('#1e40af'));
		expect(crossLines.length).toBe(2);
	});

	it('square shape produces rect', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { style: { pointShape: 'square' } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<rect');
		expect(result).toContain('fill="#1e40af"');
	});

	// ─── Labels ───────────────────────────────────────────────

	it('label has halo (white stroke + paint-order)', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'P' });
		const result = exportToSVG(f, viewport);
		const textLines = result.split('\n').filter((l) => l.includes('<text') && l.includes('P'));
		expect(textLines.length).toBe(1);
		expect(textLines[0]).toContain('stroke="white"');
		expect(textLines[0]).toContain('stroke-width="3"');
		expect(textLines[0]).toContain('paint-order="stroke"');
	});

	it('label respects labelOffset', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'P', labelOffset: { dx: 20, dy: -15 } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<text');
		expect(result).toContain('P');
	});

	it('label uses font-family KaTeX_Main', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'A' });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('font-family="KaTeX_Main, serif"');
	});

	// ─── Lines clipping ───────────────────────────────────────

	it('horizontal line is clipped to viewport width', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		f.createLine(a, b);
		const result = exportToSVG(f, viewport, { width: 800, height: 600 });
		expect(result).toContain('<line');
	});

	it('vertical line is clipped', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createLine(a, b);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<line');
	});

	it('diagonal line is clipped', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-1, -1));
		const b = f.createFreePoint(pt(1, 1));
		f.createLine(a, b);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<line');
	});

	// ─── Circles ──────────────────────────────────────────────

	it('circle by radius has fill="none" by default', () => {
		const f = new Figure();
		const c = f.createFreePoint(pt(0, 0));
		f.createCircleByRadius(c, numeric(3));
		const result = exportToSVG(f, viewport);
		const circleLines = result
			.split('\n')
			.filter((l) => l.includes('<circle') && l.includes('fill="none"'));
		expect(circleLines.length).toBeGreaterThanOrEqual(1);
	});

	it('circle with fill style', () => {
		const f = new Figure();
		const c = f.createFreePoint(pt(0, 0));
		f.createCircleByRadius(c, numeric(3), { style: { fillColor: '#ff0000', fillOpacity: 0.2 } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('fill="#ff0000"');
		expect(result).toContain('fill-opacity="0.2"');
	});

	// ─── Angle marks ──────────────────────────────────────────

	it('angle mark path has fill="none"', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngleMark(a, v, b);
		const result = exportToSVG(f, viewport);
		const pathLines = result.split('\n').filter((l) => l.includes('<path'));
		expect(pathLines.length).toBe(1);
		expect(pathLines[0]).toContain('fill="none"');
	});

	it('right angle produces path with L not A', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngleMark(a, v, b, { rightAngle: true });
		const result = exportToSVG(f, viewport);
		const pathLines = result.split('\n').filter((l) => l.includes('<path'));
		expect(pathLines.length).toBe(1);
		expect(pathLines[0]).toContain(' L ');
		expect(pathLines[0]).not.toContain(' A ');
	});

	it('arcCount=2 produces 2 paths', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		f.createAngleMark(a, v, b, { arcCount: 2 });
		const result = exportToSVG(f, viewport);
		const pathCount = (result.match(/<path/g) || []).length;
		expect(pathCount).toBe(2);
	});

	// ─── Segment marks ────────────────────────────────────────

	it('3 ticks for markCount=3 on horizontal segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		f.createSegmentMark(a, b, { markCount: 3 });
		const result = exportToSVG(f, viewport);
		// 3 tick lines (segment mark only, no segment element)
		const tickLines = result.split('\n').filter((l) => l.includes('<line'));
		expect(tickLines.length).toBe(3);
	});

	it('diagonal segment marks are perpendicular', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		f.createSegmentMark(a, b);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('<line');
	});

	// ─── Measures ─────────────────────────────────────────────

	it('measure has background rect', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		createMesureText(f, 'distance', [a, b]);
		const result = exportToSVG(f, viewport);
		// Background rect with fill-opacity
		expect(result).toContain('fill-opacity="0.85"');
	});

	it('area measure shows value', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(2, 0));
		const c = f.createFreePoint(pt(2, 3));
		createMesureText(f, 'area', [a, b, c]);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('3'); // area = 3
	});

	it('angle measure shows degree symbol', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		createMesureText(f, 'angle', [a, v, b]);
		const result = exportToSVG(f, viewport);
		expect(result).toContain('90°');
	});

	// ─── Grid and axes ────────────────────────────────────────

	it('grid lines are inside g.grid', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport, { showGrid: true });
		expect(result).toContain('<g class="grid">');
		expect(result).toContain('</g>');
	});

	it('axes use correct color', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport, { showAxes: true });
		expect(result).toContain('stroke="#6b7280"');
	});

	it('grid and axes together', () => {
		const f = new Figure();
		const result = exportToSVG(f, viewport, { showGrid: true, showAxes: true });
		expect(result).toContain('class="grid"');
		expect(result).toContain('class="axis"');
	});

	// ─── No interactive attributes ────────────────────────────

	it('no pointer events', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'A' });
		const result = exportToSVG(f, viewport);
		expect(result).not.toContain('pointer-events');
		expect(result).not.toContain('onpointer');
		expect(result).not.toContain('onmouse');
		expect(result).not.toContain('onclick');
	});

	it('no class="draggable" or class="hovered"', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0));
		const result = exportToSVG(f, viewport);
		expect(result).not.toContain('draggable');
		expect(result).not.toContain('hovered');
		expect(result).not.toContain('dragging');
	});

	// ─── FigureDefaults ───────────────────────────────────────

	it('uses FigureDefaults color', () => {
		const f = new Figure({ defaultColor: '#16a34a' });
		f.createFreePoint(pt(0, 0));
		const result = exportToSVG(f, viewport);
		expect(result).toContain('#16a34a');
	});

	it('element style overrides FigureDefaults', () => {
		const f = new Figure({ defaultColor: '#16a34a' });
		f.createFreePoint(pt(0, 0), { style: { color: '#dc2626' } });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('#dc2626');
	});

	// ─── Midpoints and dependent points ───────────────────────

	it('renders midpoint at correct SVG position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		f.createMidpoint(a, b, { label: 'M' });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('>M<');
		// 3 circle elements (A, B, M)
		const circleCount = (result.match(/<circle/g) || []).length;
		expect(circleCount).toBe(3);
	});

	// ─── SVG well-formedness ──────────────────────────────────

	it('all tags are properly closed', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0), { label: 'A' });
		const b = f.createFreePoint(pt(3, 4), { label: 'B' });
		f.createSegment(a, b);
		f.createCircleByRadius(a, numeric(2));
		f.createAngleMark(b, a, f.createFreePoint(pt(0, 4)));
		f.createSegmentMark(a, b);
		createMesureText(f, 'distance', [a, b]);

		const result = exportToSVG(f, viewport, { showGrid: true, showAxes: true });

		// Count opening and closing tags
		const opens = (result.match(/<svg|<g |<g>/g) || []).length;
		const closes = (result.match(/<\/svg>|<\/g>/g) || []).length;
		expect(opens).toBe(closes);

		// Self-closing tags should end with />
		const selfClosing = result.match(/<(line|circle|rect|path|polygon) [^>]*/g) || [];
		expect(selfClosing.length).toBeGreaterThan(0);
		for (const tag of selfClosing) {
			// The full match may not include />, check the line
			const line = result.split('\n').find((l) => l.includes(tag));
			if (line) {
				expect(line.trimEnd()).toMatch(/\/>$/);
			}
		}
	});

	it('XML-escapes special characters in labels', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: 'A&B' });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('A&amp;B');
		expect(result).not.toContain('A&B<');
	});

	it('XML-escapes angle brackets in labels', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0), { label: '<test>' });
		const result = exportToSVG(f, viewport);
		expect(result).toContain('&lt;test&gt;');
	});

	it('starts with <svg and ends with </svg>', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0));
		const result = exportToSVG(f, viewport);
		expect(result.trim().startsWith('<svg')).toBe(true);
		expect(result.trim().endsWith('</svg>')).toBe(true);
	});
});
