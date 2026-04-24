import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { angleMarkToSVG } from '../../rendering/svg-primitives';
import { createTransformer } from '../../viewport/viewport';
import { numeric } from '../../types/geo-value';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const transformer = createTransformer(viewport, 800, 600);

describe('createAngleMark', () => {
	it('creates an angle mark with 3 point parents', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b);
		const el = f.getElementById(id)!;
		expect(el.type).toBe('angleMark');
		expect(el.dependsOn).toEqual([a, v, b]);
	});

	it('defaults arcCount to 1 and rightAngle to false', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b);
		const el = f.getElementById(id)! as { arcCount: number; rightAngle: boolean };
		expect(el.arcCount).toBe(1);
		expect(el.rightAngle).toBe(false);
	});

	it('accepts arcCount and rightAngle options', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b, { arcCount: 2, rightAngle: true });
		const el = f.getElementById(id)! as { arcCount: number; rightAngle: boolean };
		expect(el.arcCount).toBe(2);
		expect(el.rightAngle).toBe(true);
	});

	it('accepts style and color options', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b, { color: '#dc2626', style: { opacity: 0.5 } });
		const el = f.getElementById(id)!;
		expect(el.color).toBe('#dc2626');
		expect(el.style).toEqual({ opacity: 0.5 });
	});

	it('throws if p1 does not exist', () => {
		const f = new Figure();
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		expect(() => f.createAngleMark('nope', v, b)).toThrow();
	});

	it('throws if vertex does not exist', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const b = f.createFreePoint(pt(0, 1));
		expect(() => f.createAngleMark(a, 'nope', b)).toThrow();
	});

	it('throws if p2 does not exist', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		expect(() => f.createAngleMark(a, v, 'nope')).toThrow();
	});

	it('throws if a parent is not a point element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const seg = f.createSegment(a, v);
		expect(() => f.createAngleMark(a, seg, v)).toThrow();
	});

	it('stores vertex position as the mark position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(2, 3));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b);
		const pos = f.getPosition(id)!;
		expect(pos).toBeDefined();
		// Should match vertex position
		const vpos = f.getPosition(v)!;
		expect(pos.x).toEqual(vpos.x);
		expect(pos.y).toEqual(vpos.y);
	});

	it('updates position when vertex is moved', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b);

		f.beginTransaction();
		f.movePoint(v, numeric(5), numeric(5));
		f.recompute();
		f.commit();

		const pos = f.getPosition(id)!;
		const vpos = f.getPosition(v)!;
		expect(pos.x).toEqual(vpos.x);
		expect(pos.y).toEqual(vpos.y);
	});

	it('is cascade-deleted when a parent point is removed', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b);

		f.beginTransaction();
		f.remove(v);
		f.commit();

		expect(f.getElementById(id)).toBeUndefined();
	});

	it('undo restores the angle mark after deletion', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b);

		f.beginTransaction();
		f.remove(v);
		f.commit();

		f.undo();
		f.recompute();

		expect(f.getElementById(v)).toBeDefined();
		expect(f.getElementById(id)).toBeDefined();
	});
});

describe('angleMarkToSVG', () => {
	it('returns arc path for a 90° angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0)); // right
		const v = f.createFreePoint(pt(0, 0)); // vertex at origin
		const b = f.createFreePoint(pt(0, 1)); // up
		const id = f.createAngleMark(a, v, b);

		const svg = angleMarkToSVG(id, f, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.paths).toHaveLength(1);
		expect(svg!.paths[0]).toContain('M ');
		expect(svg!.paths[0]).toContain(' A ');
	});

	it('returns right-angle square path', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b, { rightAngle: true });

		const svg = angleMarkToSVG(id, f, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.paths).toHaveLength(1);
		// Right angle uses L (line-to), not A (arc)
		expect(svg!.paths[0]).toContain(' L ');
		expect(svg!.paths[0]).not.toContain(' A ');
	});

	it('returns 2 paths for arcCount=2', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b, { arcCount: 2 });

		const svg = angleMarkToSVG(id, f, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.paths).toHaveLength(2);
	});

	it('returns 3 paths for arcCount=3', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b, { arcCount: 3 });

		const svg = angleMarkToSVG(id, f, transformer);
		expect(svg!.paths).toHaveLength(3);
	});

	it('returns null for non-angle-mark element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		expect(angleMarkToSVG(a, f, transformer)).toBeNull();
	});

	it('returns null if a parent has no position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b);

		// Remove the position of a parent to simulate missing data
		// We need to access internal state; use cascade remove instead
		f.beginTransaction();
		f.remove(a);
		f.commit();

		// The angle mark should also be removed
		expect(angleMarkToSVG(id, f, transformer)).toBeNull();
	});

	it('returns vertex coordinates', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(2, 3));
		const b = f.createFreePoint(pt(0, 1));
		const id = f.createAngleMark(a, v, b);

		const svg = angleMarkToSVG(id, f, transformer);
		expect(svg).not.toBeNull();
		const svgV = transformer.mathToSvg(2, 3);
		expect(svg!.vx).toBeCloseTo(svgV.x, 1);
		expect(svg!.vy).toBeCloseTo(svgV.y, 1);
	});

	it('handles obtuse angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(-1, 0.1)); // nearly 180°
		const id = f.createAngleMark(a, v, b);

		const svg = angleMarkToSVG(id, f, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.paths).toHaveLength(1);
	});

	it('handles acute angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0.5)); // small angle
		const id = f.createAngleMark(a, v, b);

		const svg = angleMarkToSVG(id, f, transformer);
		expect(svg).not.toBeNull();
	});
});
