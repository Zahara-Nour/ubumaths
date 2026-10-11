/**
 * Couleur du texte d'une diapositive UbuMark sans fond imposé (présentation des carnets) :
 * une formule en bloc doit avoir la couleur du texte, pas le blanc par défaut des diapositives.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import UbuMarkDeckHarness from './UbuMarkDeckHarness.svelte';

describe('UbuMarkSlide sur le fond du thème', () => {
	it('une formule en bloc a la même couleur que le texte', async () => {
		const { container } = await render(UbuMarkDeckHarness, {
			content: 'La formule quadratique :\n\n$$x = \\frac{-b}{2a}$$'
		});

		await expect
			.poll(() => container.querySelector('.math-block-static'), { timeout: 5000 })
			.not.toBeNull();
		const paragraph = container.querySelector<HTMLElement>('.ubumark-slide p')!;
		const block = container.querySelector<HTMLElement>('.math-block-static')!;

		expect(getComputedStyle(block).color).toBe(getComputedStyle(paragraph).color);
	});
});
