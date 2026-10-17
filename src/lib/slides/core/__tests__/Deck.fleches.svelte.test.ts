/**
 * Flèches de navigation du Deck sur le fond du thème (carnets, séries en classe) :
 * elles suivent les couleurs du thème, sinon une flèche blanche disparaît en thème clair.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync, tick } from 'svelte';
import DeckHarness from './DeckHarness.svelte';

// Composantes rouge, vert, bleu sur 0-255, que le navigateur écrive rgb() ou color(srgb …)
function channels(color: string): number[] {
	const values = color.match(/[\d.]+/g)!.map(Number);
	const scale = color.startsWith('color(') ? 255 : 1;
	return values.slice(0, 3).map((value) => Math.round(value * scale));
}

// Couleur calculée d'un jeton du thème, lue sur un élément témoin
function tokenColor(token: string): string {
	const probe = document.body.appendChild(document.createElement('span'));
	probe.style.color = `var(${token})`;
	const value = getComputedStyle(probe).color;
	probe.remove();
	return value;
}

describe('flèches de navigation', () => {
	it('la flèche a la couleur du texte du thème, posée sur le fond du thème', async () => {
		const { container } = await render(DeckHarness, {
			durations: [undefined, undefined],
			onprobe: () => {}
		});
		flushSync();
		await tick();

		const next = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Diapositive horizontale suivante"]'
		);
		expect(next).not.toBeNull();
		const style = getComputedStyle(next!);
		// Couleur du texte du thème (70 %) : mêmes composantes que le jeton
		expect(channels(style.color)).toEqual(channels(tokenColor('--color-foreground')));
		expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
	});
});
