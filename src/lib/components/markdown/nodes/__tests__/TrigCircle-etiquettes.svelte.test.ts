/**
 * Étiquettes des angles du cercle : jamais sur les axes, leurs flèches ni leurs
 * valeurs ±1 (retour de David, 2026-11-02 : π/2 et 3π/2 mêlés à la flèche ou à
 * la graduation, les autres collés à la figure)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TrigCircle from '../TrigCircle.svelte';
import { parseTrigCircleContent } from '$lib/ubumark/parser/trig-circle-parser';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

/** Boîte écran du texte de l'étiquette `latex` */
function labelBox(root: Element, latex: string): DOMRect {
	const label = [...root.querySelectorAll('.trig-label')].find(
		(l) => l.querySelector('math-span')?.textContent === latex
	);
	if (!label) throw new Error(`étiquette ${latex} absente`);
	return label.querySelector('math-span')!.getBoundingClientRect();
}

describe('TrigCircle — étiquettes des repères', () => {
	it('π/2 et 3π/2 à droite de l’axe vertical ; 0 et π au-dessus de l’axe horizontal', async () => {
		const node = parseTrigCircleContent('preset: quarters').node!;
		const screen = await render(TrigCircle, { target: mainElement(), props: { node } });
		const root = screen.container;
		const svg = root.querySelector('svg')!.getBoundingClientRect();
		const centerX = svg.left + svg.width / 2;
		const centerY = svg.top + svg.height / 2;
		await expect.poll(() => labelBox(root, '\\frac{\\pi}{2}').width).toBeGreaterThan(0);
		expect(labelBox(root, '\\frac{\\pi}{2}').left).toBeGreaterThan(centerX);
		expect(labelBox(root, '\\frac{3\\pi}{2}').left).toBeGreaterThan(centerX);
		expect(labelBox(root, '0').bottom).toBeLessThan(centerY);
		expect(labelBox(root, '\\pi').bottom).toBeLessThan(centerY);
	});

	it('une étiquette hors du cercle : π/4 au-dessus et à droite de son point', async () => {
		const node = parseTrigCircleContent('preset: all').node!;
		const screen = await render(TrigCircle, { target: mainElement(), props: { node } });
		const root = screen.container;
		const svg = root.querySelector('svg')!.getBoundingClientRect();
		const scale = svg.width / 320;
		const pointX = svg.left + (160 + 120 * Math.SQRT1_2) * scale;
		const pointY = svg.top + (160 - 120 * Math.SQRT1_2) * scale;
		await expect.poll(() => labelBox(root, '\\frac{\\pi}{4}').width).toBeGreaterThan(0);
		const box = labelBox(root, '\\frac{\\pi}{4}');
		expect(box.left).toBeGreaterThan(pointX);
		expect(box.bottom).toBeLessThan(pointY);
	});
});
