import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { numeric } from '../../types/geo-value';
import type { GeoImage } from '../../types/elements';
import { isImage } from '../../types/elements';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

// =============================================================================
// A. createImage
// =============================================================================

describe('createImage', () => {
	it('creates an image element with free position', () => {
		const f = new Figure();
		const id = f.createImage('https://example.com/img.png', 5, undefined, {
			position: { x: 2, y: 3 }
		});
		const el = f.getElementById(id)! as GeoImage;
		expect(el.type).toBe('image');
		expect(el.url).toBe('https://example.com/img.png');
		expect(el.width).toBe(5);
		expect(el.height).toBeUndefined();
		expect(el.position).toEqual({ x: 2, y: 3 });
		expect(el.anchorId).toBeUndefined();
	});

	it('generates id with img prefix', () => {
		const f = new Figure();
		const id = f.createImage('https://example.com/a.png', 3, undefined, {
			position: { x: 0, y: 0 }
		});
		expect(id).toMatch(/^img/);
	});

	it('creates an image with explicit height', () => {
		const f = new Figure();
		const id = f.createImage('https://example.com/b.png', 5, 3, {
			position: { x: 0, y: 0 }
		});
		const el = f.getElementById(id)! as GeoImage;
		expect(el.width).toBe(5);
		expect(el.height).toBe(3);
	});

	it('creates an image anchored to a point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 2));
		const id = f.createImage('https://example.com/c.png', 4, undefined, {
			anchorId: a,
			anchorOffset: { dx: 0.5, dy: -0.5 }
		});
		const el = f.getElementById(id)! as GeoImage;
		expect(el.anchorId).toBe(a);
		expect(el.anchorOffset).toEqual({ dx: 0.5, dy: -0.5 });
		expect(el.position).toBeUndefined();
	});

	it('has dependsOn = [anchorId] when anchored', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 2));
		const id = f.createImage('https://example.com/d.png', 4, undefined, {
			anchorId: a
		});
		const el = f.getElementById(id)! as GeoImage;
		expect(el.dependsOn).toContain(a);
	});

	it('has dependsOn = [] when free-positioned', () => {
		const f = new Figure();
		const id = f.createImage('https://example.com/e.png', 4, undefined, {
			position: { x: 0, y: 0 }
		});
		const el = f.getElementById(id)! as GeoImage;
		expect(el.dependsOn).toEqual([]);
	});

	it('is visible by default', () => {
		const f = new Figure();
		const id = f.createImage('https://example.com/f.png', 4, undefined, {
			position: { x: 0, y: 0 }
		});
		const el = f.getElementById(id)!;
		expect(el.visible).toBe(true);
	});

	it('throws if anchor is not a point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() =>
			f.createImage('https://example.com/g.png', 4, undefined, { anchorId: seg })
		).toThrow();
	});

	it('throws if anchor does not exist', () => {
		const f = new Figure();
		expect(() =>
			f.createImage('https://example.com/h.png', 4, undefined, { anchorId: 'nonexistent' })
		).toThrow();
	});
});

// =============================================================================
// B. isImage type guard
// =============================================================================

describe('isImage', () => {
	it('returns true for image elements', () => {
		const f = new Figure();
		const id = f.createImage('https://example.com/i.png', 4, undefined, {
			position: { x: 0, y: 0 }
		});
		const el = f.getElementById(id)!;
		expect(isImage(el)).toBe(true);
	});

	it('returns false for other elements', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const el = f.getElementById(a)!;
		expect(isImage(el)).toBe(false);
	});
});

// =============================================================================
// C. moveImage
// =============================================================================

describe('moveImage', () => {
	it('moves a free-positioned image', () => {
		const f = new Figure();
		const id = f.createImage('https://example.com/j.png', 4, undefined, {
			position: { x: 0, y: 0 }
		});
		f.moveImage(id, 5, 7);
		const el = f.getElementById(id)! as GeoImage;
		expect(el.position).toEqual({ x: 5, y: 7 });
	});

	it('throws if element is not an image', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(() => f.moveImage(a, 1, 1)).toThrow(/not an image/i);
	});

	it('throws if image is anchored (no free position)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const id = f.createImage('https://example.com/k.png', 4, undefined, { anchorId: a });
		expect(() => f.moveImage(id, 1, 1)).toThrow(/not a free-positioned/i);
	});
});
