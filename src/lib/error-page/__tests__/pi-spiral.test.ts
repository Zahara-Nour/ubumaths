import { describe, expect, it } from 'vitest';
import { PI_DECIMALS } from '../pi-decimals';
import { DEFAULT_SPIRAL_OPTIONS, spiralGlyphs } from '../pi-spiral';

describe('spirale de π', () => {
	const glyphs = spiralGlyphs(PI_DECIMALS, 1272);

	it('commence par « 3,14159 »', () => {
		expect(
			glyphs
				.slice(0, 7)
				.map((g) => g.char)
				.join('')
		).toBe('3,14159');
	});

	it('colore exactement les trois chiffres du code, à leur vraie place', () => {
		const highlighted = glyphs.flatMap((g, i) => (g.highlighted ? [i] : []));

		// 1 272ᵉ décimale = glyphe 1 273 (après « 3 » et « , »)
		expect(highlighted).toEqual([1273, 1274, 1275]);
		expect(highlighted.map((i) => glyphs[i].char).join('')).toBe('404');
	});

	it('s’enroule vers le centre sans passer sous le rayon intérieur', () => {
		const radii = glyphs.map((g) => -g.y);

		for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeLessThanOrEqual(radii[i - 1]);
		expect(radii[0]).toBe(DEFAULT_SPIRAL_OPTIONS.outerRadius);
		expect(Math.min(...radii)).toBeGreaterThanOrEqual(DEFAULT_SPIRAL_OPTIONS.innerRadius);
	});

	it('la taille des chiffres suit le rayon', () => {
		const first = glyphs[0];
		const last = glyphs[glyphs.length - 1];

		expect(first.size / -first.y).toBeCloseTo(DEFAULT_SPIRAL_OPTIONS.sizeRatio, 2);
		expect(last.size / -last.y).toBeCloseTo(DEFAULT_SPIRAL_OPTIONS.sizeRatio, 2);
	});

	it('ne colore rien pour un code absent de la spirale (500 : 6 238ᵉ décimale)', () => {
		expect(spiralGlyphs(PI_DECIMALS, 6238).some((g) => g.highlighted)).toBe(false);
		expect(spiralGlyphs(PI_DECIMALS, null).some((g) => g.highlighted)).toBe(false);
	});

	it('colore un code dès la première décimale (415 : 3,1415…)', () => {
		const chars = spiralGlyphs(PI_DECIMALS, 2)
			.filter((g) => g.highlighted)
			.map((g) => g.char);

		expect(chars.join('')).toBe('415');
	});

	it('n’invente pas de chiffres quand les décimales manquent', () => {
		expect(spiralGlyphs('14159', null)).toHaveLength(7);
	});
});
