/**
 * Bloc ```trig interactif affiché à une autre taille que son dessin (diapositive
 * réduite, deck mis à l'échelle) : la souris saisit le point visé
 * (revue de #1731, chantier demo-debug)
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TrigCircle from '../TrigCircle.svelte';
import { parseTrigCircleContent } from '$lib/ubumark/parser/trig-circle-parser';

// Dessin de TrigCircle : 320 × 320, rayon 120, centre (160, 160)
const SVG_SIZE = 320;
const CENTER = 160;
const RADIUS = 120;

let hosts: HTMLElement[] = [];
afterEach(() => {
	for (const host of hosts) host.remove();
	hosts = [];
});

function scaledHost(scale: number): HTMLElement {
	const host = document.body.appendChild(document.createElement('main'));
	host.style.transform = `scale(${scale})`;
	host.style.transformOrigin = 'top left';
	hosts.push(host);
	return host;
}

describe('TrigCircle interactif à l’échelle', () => {
	it('un clic sur le haut du cercle réduit de moitié donne l’angle π/2', async () => {
		const node = parseTrigCircleContent(
			'preset: custom\nangles: pi/4\nmode: interactive\ndisplay: circle+table'
		).node!;
		const screen = await render(TrigCircle, { target: scaledHost(0.5), props: { node } });
		const selector = `svg[viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}"]`;
		await expect.poll(() => screen.container.querySelector(selector)).not.toBeNull();
		const svg = screen.container.querySelector(selector) as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const ratio = rect.width / SVG_SIZE;
		svg.dispatchEvent(
			new MouseEvent('mousedown', {
				bubbles: true,
				clientX: rect.left + CENTER * ratio,
				clientY: rect.top + (CENTER - RADIUS) * ratio
			})
		);
		// Ligne du tableau : angle, cosinus, sinus (décimaux à la souris, au pixel près)
		const cells = () =>
			[...screen.container.querySelectorAll('.trig-table td')].map((td) => td.textContent ?? '');
		await expect.poll(() => Number(cells()[2])).toBeGreaterThan(0.99);
		expect(Math.abs(Number(cells()[1]))).toBeLessThan(0.05);
	});
});
