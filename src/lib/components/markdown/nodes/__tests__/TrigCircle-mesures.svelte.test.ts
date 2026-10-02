/**
 * Bloc ```trig à l'écran : mesures principales (décision de David, 2026-10-02)
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

/** Source LaTeX des étiquettes d'angle VISIBLES (boîte non vide) */
async function visibleLabels(source: string): Promise<string[]> {
	const node = parseTrigCircleContent(source).node!;
	const screen = await render(TrigCircle, { target: mainElement(), props: { node } });
	const labels = [...screen.container.querySelectorAll('.trig-label')];
	return labels
		.filter((l) => {
			const box = l.getBoundingClientRect();
			return box.width > 0 && box.height > 0;
		})
		.map((l) => l.querySelector('math-span')?.textContent?.trim() ?? '');
}

describe('TrigCircle — mesures', () => {
	it('principales : la solution de sin(x) = -1/2 s’écrit −π/6', async () => {
		const labels = await visibleLabels(
			'preset: custom\nequation: sin(x) = -1/2\nmesures: principales'
		);
		expect(labels).toContain('-\\frac{\\pi}{6}');
		expect(labels).toContain('-\\frac{5\\pi}{6}');
		expect(labels).not.toContain('\\frac{11\\pi}{6}');
	});

	it('défaut : la même solution s’écrit 11π/6', async () => {
		const labels = await visibleLabels('preset: custom\nequation: sin(x) = -1/2');
		expect(labels).toContain('\\frac{11\\pi}{6}');
		expect(labels).not.toContain('-\\frac{\\pi}{6}');
	});

	it('principales, tableau de valeurs : θ écrit −π/3', async () => {
		const node = parseTrigCircleContent(
			'preset: custom\nangles: 5*pi/3\ndisplay: circle+table\nmesures: principales'
		).node!;
		const screen = await render(TrigCircle, { target: mainElement(), props: { node } });
		const cells = [...screen.container.querySelectorAll('.trig-table tbody td:first-child')];
		expect(cells.map((c) => c.textContent?.trim())).toEqual(['-\\frac{\\pi}{3}']);
	});
});
