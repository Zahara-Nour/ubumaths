import { describe, expect, it } from 'vitest';
import { piSpiralSvg } from '../pi-spiral-svg';

describe('piSpiralSvg', () => {
	it('rend un chiffre par <text>, en currentColor, masqué aux lecteurs d’écran', () => {
		const svg = piSpiralSvg(null);

		expect(svg.startsWith('<svg viewBox="-500 -500 1000 1000"')).toBe(true);
		expect(svg).toContain('aria-hidden="true"');
		expect(svg).toContain('fill="currentColor"');
		expect(svg.match(/<text /g)?.length).toBeGreaterThan(1500);
		expect(svg).toContain('>3</text><text');
	});

	it('marque les trois chiffres du code, et eux seuls', () => {
		// 503 commence à la 837ᵉ décimale
		const highlighted = [...piSpiralSvg(837).matchAll(/class="highlighted">(\d)</g)].map(
			(m) => m[1]
		);

		expect(highlighted.join('')).toBe('503');
		expect(piSpiralSvg(null)).not.toContain('highlighted');
	});
});
