import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import type { GeoImage } from '../../types/elements';
import { geoToNumber } from '../../compute/to-number';

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

// =============================================================================
// E. Transformations on images
// =============================================================================

describe('DSL image() — transformations', () => {
	it('translates a free-positioned image', () => {
		const { figure } = runDsl(
			[
				'img = image("https://example.com/v.png", 0, 0, largeur=3)',
				'A = point(0, 0)',
				'B = point(2, 3)',
				'v = vecteur(A, B)',
				't = translation(vecteur=v)',
				'img2 = transforme(t, img)'
			].join('\n')
		);
		const images = figure.getAllElements().filter((e) => e.type === 'image');
		expect(images).toHaveLength(2);
		// The transformed image should be anchored to a transformed point
		const img2 = images[1] as GeoImage;
		expect(img2.url).toBe('https://example.com/v.png');
		expect(img2.width).toBe(3);
		expect(img2.anchorId).toBeDefined();
	});

	it('rotates an anchored image', () => {
		const { figure } = runDsl(
			[
				'A = point(2, 0)',
				'img = image("https://example.com/w.png", A, largeur=3)',
				'O = point(0, 0)',
				'r = rotation(centre=O, angle=90)',
				'img2 = transforme(r, img)'
			].join('\n')
		);
		const images = figure.getAllElements().filter((e) => e.type === 'image');
		expect(images).toHaveLength(2);
		const img2 = images[1] as GeoImage;
		expect(img2.url).toBe('https://example.com/w.png');
		expect(img2.anchorId).toBeDefined();
	});

	it('scales image dimensions with homothety', () => {
		const { figure } = runDsl(
			[
				'img = image("https://example.com/x.png", 1, 1, largeur=4, hauteur=3)',
				'O = point(0, 0)',
				'h = homothetie(centre=O, rapport=2)',
				'img2 = transforme(h, img)'
			].join('\n')
		);
		const images = figure.getAllElements().filter((e) => e.type === 'image');
		const img2 = images[1] as GeoImage;
		expect(img2.width).toBe(8);
		expect(img2.height).toBe(6);
	});

	it('transforms a 2-point image', () => {
		const { figure } = runDsl(
			[
				'A = point(-2, -1)',
				'B = point(2, 1)',
				'img = image("https://example.com/y.png", A, B)',
				'O = point(0, 0)',
				'r = rotation(centre=O, angle=90)',
				'img2 = transforme(r, img)'
			].join('\n')
		);
		const images = figure.getAllElements().filter((e) => e.type === 'image');
		expect(images).toHaveLength(2);
		const img2 = images[1] as GeoImage;
		expect(img2.point1Id).toBeDefined();
		expect(img2.point2Id).toBeDefined();
	});

	it('reflects an image', () => {
		const { figure } = runDsl(
			[
				'img = image("https://example.com/z.png", 2, 0, largeur=3)',
				'O = point(0, 0)',
				's = symetrie(centre=O)',
				'img2 = transforme(s, img)'
			].join('\n')
		);
		const images = figure.getAllElements().filter((e) => e.type === 'image');
		expect(images).toHaveLength(2);
	});
});

// =============================================================================
// E2. Visual transforms (rotation/flipped)
// =============================================================================

describe('DSL image() — visual transforms', () => {
	it('rotation(90°) sets rotation = PI/2', () => {
		const { figure } = runDsl(
			[
				'img = image("https://example.com/v.png", 2, 0, largeur=3)',
				'O = point(0, 0)',
				'r = rotation(centre=O, angle=90)',
				'img2 = transforme(r, img)'
			].join('\n')
		);
		const img2 = figure.getAllElements().filter((e) => e.type === 'image')[1] as GeoImage;
		expect(img2.rotation).toBeCloseTo(Math.PI / 2, 10);
		expect(img2.flipped).toBeFalsy();
	});

	it('symetrie(centre) sets rotation = ±PI', () => {
		const { figure } = runDsl(
			[
				'img = image("https://example.com/v.png", 2, 0, largeur=3)',
				'O = point(0, 0)',
				's = symetrie(centre=O)',
				'img2 = transforme(s, img)'
			].join('\n')
		);
		const img2 = figure.getAllElements().filter((e) => e.type === 'image')[1] as GeoImage;
		// PI and -PI are equivalent rotations
		expect(Math.abs(img2.rotation!)).toBeCloseTo(Math.PI, 10);
		expect(img2.flipped).toBeFalsy();
	});

	it('symetrie(axe horizontal) sets flipped = true', () => {
		const { figure } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'img = image("https://example.com/v.png", 0, 1, largeur=3)',
				's = symetrie(axe=(A, B))',
				'img2 = transforme(s, img)'
			].join('\n')
		);
		const img2 = figure.getAllElements().filter((e) => e.type === 'image')[1] as GeoImage;
		expect(img2.flipped).toBe(true);
		expect(img2.rotation).toBeCloseTo(0, 10);
	});

	it('symetrie(axe at 45°) sets flipped and adjusts rotation', () => {
		const { figure } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(1, 1)',
				'img = image("https://example.com/v.png", 2, 0, largeur=3)',
				's = symetrie(axe=(A, B))',
				'img2 = transforme(s, img)'
			].join('\n')
		);
		const img2 = figure.getAllElements().filter((e) => e.type === 'image')[1] as GeoImage;
		expect(img2.flipped).toBe(true);
		// axis angle = PI/4, currentRotation = 0 → newRotation = 2*(PI/4) - 0 = PI/2
		expect(img2.rotation).toBeCloseTo(Math.PI / 2, 10);
	});

	it('homothetie(rapport=-2) sets rotation = ±PI and scales dimensions', () => {
		const { figure } = runDsl(
			[
				'img = image("https://example.com/v.png", 1, 1, largeur=4, hauteur=3)',
				'O = point(0, 0)',
				'h = homothetie(centre=O, rapport=-2)',
				'img2 = transforme(h, img)'
			].join('\n')
		);
		const img2 = figure.getAllElements().filter((e) => e.type === 'image')[1] as GeoImage;
		expect(Math.abs(img2.rotation!)).toBeCloseTo(Math.PI, 10);
		expect(img2.width).toBe(8);
		expect(img2.height).toBe(6);
		expect(img2.flipped).toBeFalsy();
	});

	it('translation does not change visual transform', () => {
		const { figure } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(2, 3)',
				'v = vecteur(A, B)',
				't = translation(vecteur=v)',
				'img = image("https://example.com/v.png", 0, 0, largeur=3)',
				'img2 = transforme(t, img)'
			].join('\n')
		);
		const img2 = figure.getAllElements().filter((e) => e.type === 'image')[1] as GeoImage;
		expect(img2.rotation).toBeUndefined();
		expect(img2.flipped).toBeUndefined();
	});

	it('composition: rotation then axial symmetry accumulates correctly', () => {
		const { figure } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'img = image("https://example.com/v.png", 2, 0, largeur=3)',
				'O = point(0, 0)',
				'r = rotation(centre=O, angle=90)',
				's = symetrie(axe=(A, B))',
				'c = compose(s, r)',
				'img2 = transforme(c, img)'
			].join('\n')
		);
		const img2 = figure.getAllElements().filter((e) => e.type === 'image')[1] as GeoImage;
		// r applies first: rotation = PI/2, flipped = false
		// s applies second (axis angle=0): flipped = true, rotation = 2*0 - PI/2 = -PI/2
		expect(img2.flipped).toBe(true);
		expect(img2.rotation).toBeCloseTo(-Math.PI / 2, 10);
	});

	it('serialization includes rotation param', () => {
		const dsl = 'img = image("https://example.com/v.png", 0, 0, largeur=3, rotation=1.5708)';
		const { figure } = runDsl(dsl);
		const serialized = serializeDsl(figure);
		expect(serialized).toContain('rotation=1.5708');
	});

	it('serialization includes miroir for flipped images', () => {
		const dsl = 'img = image("https://example.com/v.png", 0, 0, largeur=3, miroir="vrai")';
		const { figure } = runDsl(dsl);
		const serialized = serializeDsl(figure);
		expect(serialized).toContain('miroir="vrai"');
	});

	it('roundtrip preserves rotation via direct DSL params', () => {
		const dsl =
			'img = image("https://example.com/v.png", 0, 0, largeur=3, rotation=1.5708, miroir="vrai")';
		const { figure } = runDsl(dsl);
		const img = figure.getAllElements().find((e) => e.type === 'image') as GeoImage;
		expect(img.rotation).toBeCloseTo(1.5708, 4);
		expect(img.flipped).toBe(true);
		const serialized = serializeDsl(figure);
		const { figure: figure2 } = runDsl(serialized);
		const img2 = figure2.getAllElements().find((e) => e.type === 'image') as GeoImage;
		expect(img2.rotation).toBeCloseTo(1.5708, 4);
		expect(img2.flipped).toBe(true);
	});

	it('2-point mode + axial symmetry sets flipped', () => {
		const { figure } = runDsl(
			[
				'A = point(-2, -1)',
				'B = point(2, 1)',
				'P1 = point(0, 0)',
				'P2 = point(1, 0)',
				'img = image("https://example.com/v.png", A, B)',
				's = symetrie(axe=(P1, P2))',
				'img2 = transforme(s, img)'
			].join('\n')
		);
		const img2 = figure.getAllElements().filter((e) => e.type === 'image')[1] as GeoImage;
		expect(img2.flipped).toBe(true);
	});
});

// =============================================================================
// F. Reactive transforms on free-positioned images
// =============================================================================

describe('DSL image() — reactive free-position transforms', () => {
	it('dragging a free image updates the transformed image', () => {
		const { figure, symbols } = runDsl(
			[
				'img = image("https://example.com/r.png", 2, 0, largeur=3)',
				'A = point(0, 0)',
				'B = point(1, 0)',
				'v = vecteur(A, B)',
				't = translation(vecteur=v)',
				'img2 = transforme(t, img)'
			].join('\n')
		);
		const img2Entry = symbols.get('img2')!;
		const img2El = figure.getElementById(img2Entry.figureId) as GeoImage;
		const anchorBefore = figure.getPosition(img2El.anchorId!);
		expect(anchorBefore).toBeDefined();
		const xBefore = geoToNumber(anchorBefore!.x);

		// Drag the source image
		const imgEntry = symbols.get('img')!;
		figure.moveImage(imgEntry.figureId, 5, 0);
		figure.recompute();

		const anchorAfter = figure.getPosition(img2El.anchorId!);
		const xAfter = geoToNumber(anchorAfter!.x);
		// Translation by (1,0): new center should be at 5+1 = 6 (offset by -W/2 for anchor)
		expect(xAfter).not.toBeCloseTo(xBefore);
		expect(xAfter - xBefore).toBeCloseTo(3); // moved from 2 to 5 = delta 3
	});

	it('second transforme() reuses the same _centerPointId', () => {
		const { figure, symbols } = runDsl(
			[
				'img = image("https://example.com/r.png", 2, 0, largeur=3)',
				'O = point(0, 0)',
				'r = rotation(centre=O, angle=90)',
				's = symetrie(centre=O)',
				'img2 = transforme(r, img)',
				'img3 = transforme(s, img)'
			].join('\n')
		);
		const imgEl = figure.getElementById(symbols.get('img')!.figureId) as GeoImage;
		expect(imgEl._centerPointId).toBeDefined();
		// Both transforms should depend on the same hidden center point
		// Count free points — only one hidden center should exist for 'img'
		const allElements = figure.getAllElements();
		const hiddenFreePoints = allElements.filter(
			(e) => e.type === 'freePoint' && !e.visible && e.id === imgEl._centerPointId
		);
		expect(hiddenFreePoints).toHaveLength(1);
	});

	it('moveImage without _centerPointId works as before', () => {
		const { figure, symbols } = runDsl(
			['img = image("https://example.com/r.png", 2, 0, largeur=3)'].join('\n')
		);
		const imgEntry = symbols.get('img')!;
		figure.moveImage(imgEntry.figureId, 5, 7);
		const imgEl = figure.getElementById(imgEntry.figureId) as GeoImage;
		expect(imgEl.position).toEqual({ x: 5, y: 7 });
		expect(imgEl._centerPointId).toBeUndefined();
	});
});
