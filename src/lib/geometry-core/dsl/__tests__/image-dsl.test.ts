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
