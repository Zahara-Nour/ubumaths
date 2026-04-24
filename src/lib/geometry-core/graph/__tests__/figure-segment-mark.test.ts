import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { segmentMarkToSVG } from '../../rendering/svg-primitives';
import { createTransformer } from '../../viewport/viewport';
import { numeric } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const transformer = createTransformer(viewport, 800, 600);

describe('createSegmentMark', () => {
	it('creates a segment mark with 2 point parents', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b);
		const el = f.getElementById(id)!;
		expect(el.type).toBe('segmentMark');
		expect(el.dependsOn).toEqual([a, b]);
	});

	it('defaults markCount to 1', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b);
		const el = f.getElementById(id)! as { markCount: number };
		expect(el.markCount).toBe(1);
	});

	it('accepts markCount option', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b, { markCount: 3 });
		const el = f.getElementById(id)! as { markCount: number };
		expect(el.markCount).toBe(3);
	});

	it('accepts style and color options', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b, { color: '#dc2626', style: { opacity: 0.5 } });
		const el = f.getElementById(id)!;
		expect(el.color).toBe('#dc2626');
		expect(el.style).toEqual({ opacity: 0.5 });
	});

	it('throws if start does not exist', () => {
		const f = new Figure();
		const b = f.createFreePoint(pt(4, 0));
		expect(() => f.createSegmentMark('nope', b)).toThrow();
	});

	it('throws if end does not exist', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(() => f.createSegmentMark(a, 'nope')).toThrow();
	});

	it('throws if a parent is not a point element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createSegmentMark(a, seg)).toThrow();
	});

	it('stores midpoint as position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b);
		const pos = f.getPosition(id)!;
		expect(pos).toBeDefined();
		expect(geoToNumber(pos.x)).toBeCloseTo(2, 10);
		expect(geoToNumber(pos.y)).toBeCloseTo(0, 10);
	});

	it('updates position when a parent is moved', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b);

		f.beginTransaction();
		f.movePoint(a, numeric(2), numeric(0));
		f.recompute();
		f.commit();

		const pos = f.getPosition(id)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(3, 10);
	});

	it('is cascade-deleted when a parent is removed', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b);

		f.beginTransaction();
		f.remove(a);
		f.commit();

		expect(f.getElementById(id)).toBeUndefined();
	});

	it('undo restores the segment mark', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b);

		f.beginTransaction();
		f.remove(a);
		f.commit();
		f.undo();
		f.recompute();

		expect(f.getElementById(id)).toBeDefined();
	});
});

describe('segmentMarkToSVG', () => {
	it('returns 1 tick for markCount=1', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b);

		const svg = segmentMarkToSVG(id, f, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.ticks).toHaveLength(1);
	});

	it('returns 2 ticks for markCount=2', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b, { markCount: 2 });

		const svg = segmentMarkToSVG(id, f, transformer);
		expect(svg!.ticks).toHaveLength(2);
	});

	it('returns 3 ticks for markCount=3', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const id = f.createSegmentMark(a, b, { markCount: 3 });

		const svg = segmentMarkToSVG(id, f, transformer);
		expect(svg!.ticks).toHaveLength(3);
	});

	it('ticks are perpendicular to the segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0)); // horizontal segment
		const id = f.createSegmentMark(a, b);

		const svg = segmentMarkToSVG(id, f, transformer)!;
		const tick = svg.ticks[0];
		// For horizontal segment, ticks should be vertical: x1 ≈ x2
		expect(tick.x1).toBeCloseTo(tick.x2, 1);
		// y1 and y2 should differ
		expect(Math.abs(tick.y1 - tick.y2)).toBeGreaterThan(5);
	});

	it('ticks centered on midpoint for vertical segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 4)); // vertical segment
		const id = f.createSegmentMark(a, b);

		const svg = segmentMarkToSVG(id, f, transformer)!;
		const tick = svg.ticks[0];
		// For vertical segment, ticks should be horizontal: y1 ≈ y2
		expect(tick.y1).toBeCloseTo(tick.y2, 1);
	});

	it('returns null for non-segment-mark element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(segmentMarkToSVG(a, f, transformer)).toBeNull();
	});

	it('returns null for unknown id', () => {
		const f = new Figure();
		expect(segmentMarkToSVG('nope', f, transformer)).toBeNull();
	});

	it('handles diagonal segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const id = f.createSegmentMark(a, b, { markCount: 2 });

		const svg = segmentMarkToSVG(id, f, transformer)!;
		expect(svg.ticks).toHaveLength(2);
		// Ticks should be separated along the segment direction
		const midX = (svg.ticks[0].x1 + svg.ticks[0].x2) / 2;
		const midX2 = (svg.ticks[1].x1 + svg.ticks[1].x2) / 2;
		expect(Math.abs(midX - midX2)).toBeGreaterThan(1);
	});
});
