import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { measureToSVG } from '../../rendering/svg-primitives';
import { createTransformer } from '../../viewport/viewport';
import { numeric } from '../../types/geo-value';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const transformer = createTransformer(viewport, 800, 600);

describe('createMeasure', () => {
	// ─── Distance ─────────────────────────────────────────────

	it('creates a distance measure between two points', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const id = f.createMeasure('distance', [a, b]);
		const el = f.getElementById(id)!;
		expect(el.type).toBe('measure');
		expect(el.dependsOn).toEqual([a, b]);
	});

	it('computes distance value correctly', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const id = f.createMeasure('distance', [a, b]);
		expect(f.getMeasureValue(id)).toBeCloseTo(5, 10);
	});

	it('distance defaults to approx format', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const id = f.createMeasure('distance', [a, b]);
		const el = f.getElementById(id) as { format: string };
		expect(el.format).toBe('approx');
	});

	it('distance updates when points move', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const id = f.createMeasure('distance', [a, b]);

		f.beginTransaction();
		f.movePoint(b, numeric(6), numeric(8));
		f.recompute();
		f.commit();

		expect(f.getMeasureValue(id)).toBeCloseTo(10, 10);
	});

	it('throws if distance has != 2 targets', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(() => f.createMeasure('distance', [a])).toThrow();
	});

	// ─── Angle ────────────────────────────────────────────────

	it('computes angle value correctly (90°)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createMeasure('angle', [a, v, b]);
		expect(f.getMeasureValue(id)).toBeCloseTo(90, 5);
	});

	it('computes angle value correctly (60°)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0.5, Math.sqrt(3) / 2));
		const id = f.createMeasure('angle', [a, v, b]);
		expect(f.getMeasureValue(id)).toBeCloseTo(60, 3);
	});

	it('computes angle value correctly (180°)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(-1, 0));
		const id = f.createMeasure('angle', [a, v, b]);
		expect(f.getMeasureValue(id)).toBeCloseTo(180, 5);
	});

	it('angle defaults to degrees format', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createMeasure('angle', [a, v, b]);
		const el = f.getElementById(id) as { format: string };
		expect(el.format).toBe('degrees');
	});

	it('throws if angle has != 3 targets', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		expect(() => f.createMeasure('angle', [a, b])).toThrow();
	});

	// ─── Area ─────────────────────────────────────────────────

	it('computes area of a unit square', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const c = f.createFreePoint(pt(1, 1));
		const d = f.createFreePoint(pt(0, 1));
		const id = f.createMeasure('area', [a, b, c, d]);
		expect(f.getMeasureValue(id)).toBeCloseTo(1, 10);
	});

	it('computes area of a triangle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const c = f.createFreePoint(pt(0, 3));
		const id = f.createMeasure('area', [a, b, c]);
		expect(f.getMeasureValue(id)).toBeCloseTo(6, 10);
	});

	it('throws if area has < 3 targets', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		expect(() => f.createMeasure('area', [a, b])).toThrow();
	});

	// ─── Validation ───────────────────────────────────────────

	it('throws if a target is not a point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createMeasure('distance', [a, seg])).toThrow();
	});

	it('throws if a target does not exist', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(() => f.createMeasure('distance', [a, 'nope'])).toThrow();
	});

	// ─── Cascade & undo ───────────────────────────────────────

	it('is cascade-deleted when a target is removed', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const id = f.createMeasure('distance', [a, b]);

		f.beginTransaction();
		f.remove(a);
		f.commit();

		expect(f.getElementById(id)).toBeUndefined();
		expect(f.getMeasureValue(id)).toBeUndefined();
	});

	it('undo restores the measure', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const id = f.createMeasure('distance', [a, b]);

		f.beginTransaction();
		f.remove(a);
		f.commit();
		f.undo();
		f.recompute();

		expect(f.getElementById(id)).toBeDefined();
	});

	// ─── Options ──────────────────────────────────────────────

	it('accepts format option', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const id = f.createMeasure('distance', [a, b], { format: 'exact' });
		const el = f.getElementById(id) as { format: string };
		expect(el.format).toBe('exact');
	});

	it('accepts color and style options', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const id = f.createMeasure('distance', [a, b], { color: '#dc2626', style: { opacity: 0.7 } });
		const el = f.getElementById(id)!;
		expect(el.color).toBe('#dc2626');
		expect(el.style).toEqual({ opacity: 0.7 });
	});
});

describe('measureToSVG', () => {
	it('returns text and position for distance', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const id = f.createMeasure('distance', [a, b]);

		const svg = measureToSVG(id, f, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.text).toBe('5');
	});

	it('returns text with degree symbol for angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createMeasure('angle', [a, v, b]);

		const svg = measureToSVG(id, f, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.text).toBe('90°');
	});

	it('returns null for non-measure element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(measureToSVG(a, f, transformer)).toBeNull();
	});

	it('distance text is positioned at midpoint offset', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0)); // horizontal segment
		const id = f.createMeasure('distance', [a, b]);

		const svg = measureToSVG(id, f, transformer)!;
		const svgA = transformer.mathToSvg(0, 0);
		const svgB = transformer.mathToSvg(4, 0);
		const midX = (svgA.x + svgB.x) / 2;
		// x should be near midpoint
		expect(svg.x).toBeCloseTo(midX, 0);
	});

	it('area text shows numeric value', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(2, 0));
		const c = f.createFreePoint(pt(2, 2));
		const d = f.createFreePoint(pt(0, 2));
		const id = f.createMeasure('area', [a, b, c, d]);

		const svg = measureToSVG(id, f, transformer)!;
		expect(svg.text).toBe('4');
	});
});
