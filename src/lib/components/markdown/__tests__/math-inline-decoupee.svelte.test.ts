/**
 * Une formule découpée, dans le navigateur : le conteneur porte la lecture de la
 * formule entière. Elle n'est calculée qu'après le montage (le serveur ne sait pas
 * la calculer, cf. `math-inline-serveur.test.ts`) : ce test garde qu'elle arrive.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MathInline from '../nodes/MathInline.svelte';

// Lieu étroit (étapes à ranger) : les formules s'y découpent
vi.mock('../content-breakable-math', () => ({
	readBreakableMath: () => () => true
}));

describe('MathInline — formule découpée dans le navigateur', () => {
	it('le conteneur porte la lecture de la formule entière, les morceaux sont cachés', async () => {
		const { container } = await render(MathInline, { expression: 'a+b=c+d', syntax: 'latex' });

		const pieces = container.querySelector('.inline-math-pieces');
		await vi.waitFor(() => {
			expect(pieces?.getAttribute('aria-label') ?? '').not.toBe('');
		});
		expect(pieces?.getAttribute('role')).toBe('img');
		const spans = [...(pieces?.querySelectorAll('math-span') ?? [])];
		expect(spans.length).toBeGreaterThan(1);
		expect(spans.every((span) => span.getAttribute('aria-hidden') === 'true')).toBe(true);
	});
});
