import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import type { GeoImage } from '../../types/elements';

// =============================================================================
// A. DSL parsing — image()
// =============================================================================

describe('DSL image() — free position', () => {
	it('creates an image at free position with largeur', () => {
		const { figure } = runDsl(
			['img = image("https://example.com/a.png", 2, 3, largeur=5)'].join('\n')
		);
		const images = figure.getAllElements().filter((e) => e.type === 'image');
		expect(images).toHaveLength(1);
		const img = images[0] as GeoImage;
		expect(img.url).toBe('https://example.com/a.png');
		expect(img.position).toEqual({ x: 2, y: 3 });
		expect(img.width).toBe(5);
		expect(img.height).toBeUndefined();
	});

	it('creates an image with explicit hauteur', () => {
		const { figure } = runDsl(
			['img = image("https://example.com/b.png", 0, 0, largeur=4, hauteur=3)'].join('\n')
		);
		const images = figure.getAllElements().filter((e) => e.type === 'image');
		const img = images[0] as GeoImage;
		expect(img.width).toBe(4);
		expect(img.height).toBe(3);
	});

	it('throws on missing largeur', () => {
		expect(() => runDsl('img = image("https://example.com/c.png", 0, 0)')).toThrow();
	});

	it('throws on insufficient arguments', () => {
		expect(() => runDsl('img = image("https://example.com/d.png")')).toThrow();
	});

	it('accepts relative URLs starting with /', () => {
		const { figure } = runDsl('img = image("/static/photo.png", 0, 0, largeur=3)');
		const images = figure.getAllElements().filter((e) => e.type === 'image');
		expect(images).toHaveLength(1);
		expect((images[0] as GeoImage).url).toBe('/static/photo.png');
	});

	it('rejects javascript: URLs', () => {
		expect(() => runDsl('img = image("javascript:alert(1)", 0, 0, largeur=3)')).toThrow(/URL/);
	});

	it('rejects data: URLs', () => {
		expect(() => runDsl('img = image("data:image/png;base64,abc", 0, 0, largeur=3)')).toThrow(
			/URL/
		);
	});
});

describe('DSL image() — anchored', () => {
	it('creates an image anchored to a point', () => {
		const { figure } = runDsl(
			['A = point(1, 2)', 'img = image("https://example.com/e.png", A, largeur=3)'].join('\n')
		);
		const images = figure.getAllElements().filter((e) => e.type === 'image');
		expect(images).toHaveLength(1);
		const img = images[0] as GeoImage;
		expect(img.url).toBe('https://example.com/e.png');
		expect(img.anchorId).toBeDefined();
		expect(img.width).toBe(3);
		expect(img.position).toBeUndefined();
	});

	it('creates an image anchored with offset', () => {
		const { figure } = runDsl(
			[
				'A = point(1, 2)',
				'img = image("https://example.com/f.png", A, largeur=3, dx=0.5, dy=-0.5)'
			].join('\n')
		);
		const images = figure.getAllElements().filter((e) => e.type === 'image');
		const img = images[0] as GeoImage;
		expect(img.anchorOffset).toEqual({ dx: 0.5, dy: -0.5 });
	});
});

// =============================================================================
// B. Serialization + roundtrip
// =============================================================================

describe('image() serialization', () => {
	it('serializes free-positioned image', () => {
		const { figure, symbols } = runDsl('img = image("https://example.com/g.png", 2, 3, largeur=5)');
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).toContain('image("https://example.com/g.png"');
		expect(serialized).toContain('largeur=5');
	});

	it('serializes image with hauteur', () => {
		const { figure, symbols } = runDsl(
			'img = image("https://example.com/h.png", 0, 0, largeur=4, hauteur=3)'
		);
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).toContain('largeur=4');
		expect(serialized).toContain('hauteur=3');
	});

	it('serializes anchored image', () => {
		const { figure, symbols } = runDsl(
			['A = point(1, 2)', 'img = image("https://example.com/i.png", A, largeur=3)'].join('\n')
		);
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).toContain('image("https://example.com/i.png", A');
		expect(serialized).toContain('largeur=3');
	});

	it('roundtrips free-positioned image', () => {
		const script = 'img = image("https://example.com/j.png", 2, 3, largeur=5)';
		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);
		const { figure: fig2 } = runDsl(serialized);

		const images1 = fig1.getAllElements().filter((e) => e.type === 'image');
		const images2 = fig2.getAllElements().filter((e) => e.type === 'image');
		expect(images2).toHaveLength(images1.length);

		const img1 = images1[0] as GeoImage;
		const img2 = images2[0] as GeoImage;
		expect(img2.url).toBe(img1.url);
		expect(img2.width).toBe(img1.width);
		expect(img2.position).toEqual(img1.position);
	});

	it('roundtrips anchored image with offset', () => {
		const script = [
			'A = point(1, 2)',
			'img = image("https://example.com/k.png", A, largeur=3, dx=0.5, dy=-0.5)'
		].join('\n');
		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);
		const { figure: fig2 } = runDsl(serialized);

		const images1 = fig1.getAllElements().filter((e) => e.type === 'image');
		const images2 = fig2.getAllElements().filter((e) => e.type === 'image');
		expect(images2).toHaveLength(images1.length);

		const img1 = images1[0] as GeoImage;
		const img2 = images2[0] as GeoImage;
		expect(img2.url).toBe(img1.url);
		expect(img2.width).toBe(img1.width);
		expect(img2.anchorOffset).toEqual(img1.anchorOffset);
	});
});

// =============================================================================
// C. Layer (couche) support
// =============================================================================

describe('DSL image() — couche', () => {
	it('creates a fond image', () => {
		const { figure } = runDsl(
			'img = image("https://example.com/bg.png", 0, 0, largeur=10, couche="fond")'
		);
		const img = figure.getAllElements().find((e) => e.type === 'image') as GeoImage;
		expect(img.layer).toBe('fond');
	});

	it('defaults to undefined layer (avant)', () => {
		const { figure } = runDsl('img = image("https://example.com/fg.png", 0, 0, largeur=5)');
		const img = figure.getAllElements().find((e) => e.type === 'image') as GeoImage;
		expect(img.layer).toBeUndefined();
	});

	it('rejects invalid couche value', () => {
		expect(() =>
			runDsl('img = image("https://example.com/x.png", 0, 0, largeur=5, couche="milieu")')
		).toThrow(/couche/);
	});

	it('roundtrips couche=fond', () => {
		const script = 'img = image("https://example.com/bg.png", 0, 0, largeur=10, couche="fond")';
		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);
		expect(serialized).toContain('couche="fond"');
		const { figure: fig2 } = runDsl(serialized);
		const img = fig2.getAllElements().find((e) => e.type === 'image') as GeoImage;
		expect(img.layer).toBe('fond');
	});

	it('does not serialize couche when avant (default)', () => {
		const script = 'img = image("https://example.com/fg.png", 0, 0, largeur=5)';
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).not.toContain('couche');
	});
});

// =============================================================================
// D. 2-point anchoring
// =============================================================================

describe('DSL image() — 2-point mode', () => {
	it('creates an image filling a rectangle between 2 points', () => {
		const { figure } = runDsl(
			[
				'A = point(-3, -2)',
				'B = point(3, 2)',
				'img = image("https://example.com/r.png", A, B)'
			].join('\n')
		);
		const img = figure.getAllElements().find((e) => e.type === 'image') as GeoImage;
		expect(img.point1Id).toBeDefined();
		expect(img.point2Id).toBeDefined();
		expect(img.position).toBeUndefined();
		expect(img.anchorId).toBeUndefined();
	});

	it('does not require largeur in 2-point mode', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(4, 3)',
					'img = image("https://example.com/s.png", A, B)'
				].join('\n')
			)
		).not.toThrow();
	});

	it('serializes as image("url", A, B)', () => {
		const script = [
			'A = point(0, 0)',
			'B = point(4, 3)',
			'img = image("https://example.com/t.png", A, B)'
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).toContain('image("https://example.com/t.png", A, B)');
	});

	it('roundtrips 2-point mode', () => {
		const script = [
			'A = point(-1, -1)',
			'B = point(5, 4)',
			'img = image("https://example.com/u.png", A, B)'
		].join('\n');
		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);
		const { figure: fig2 } = runDsl(serialized);
		const img1 = fig1.getAllElements().find((e) => e.type === 'image') as GeoImage;
		const img2 = fig2.getAllElements().find((e) => e.type === 'image') as GeoImage;
		expect(img2.point1Id).toBeDefined();
		expect(img2.point2Id).toBeDefined();
		expect(img2.url).toBe(img1.url);
	});
});
