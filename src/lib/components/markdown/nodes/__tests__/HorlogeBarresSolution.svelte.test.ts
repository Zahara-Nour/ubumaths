/**
 * Horloge et barres `solution: oui` à l'écran : la réponse en vert, rien à faire (V109)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Horloge from '../Horloge.svelte';
import StatChart from '../StatChart.svelte';
import { parseHorlogeContent } from '#lib/ubumark/parser/horloge-parser.ts';
import { parseStatChartContent } from '#lib/ubumark/parser/stat-chart-parser.ts';

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

/** Couleur calculée d'une variable du thème, comme le navigateur la résout */
function themeColor(variable: string): string {
	const probe = mainElement().appendChild(document.createElement('span'));
	probe.style.color = `var(${variable})`;
	return getComputedStyle(probe).color;
}

describe('Horloge — solution: oui', () => {
	it('les deux aiguilles, en vert, sans geste à faire', async () => {
		const { container } = await render(Horloge, {
			target: mainElement(),
			props: { node: parseHorlogeContent('placer: 9 h 25\nsolution: oui') }
		});
		expect(container.querySelector('button')).toBeNull();
		const aiguilles = container.querySelectorAll('.horloge-aiguille');
		expect(aiguilles).toHaveLength(2);
		const vert = themeColor('--color-fig-vert');
		for (const a of aiguilles) expect(getComputedStyle(a).stroke).toBe(vert);
	});

	it('sans `solution: oui` : le cadran à régler, sans les aiguilles attendues', async () => {
		const { container } = await render(Horloge, {
			target: mainElement(),
			props: { node: parseHorlogeContent('placer: 9 h 25') }
		});
		expect(container.querySelector('.horloge-solution')).toBeNull();
	});
});

describe('StatChart — barres solution: oui', () => {
	const SOURCE = [
		'axes: Sport ; Effectif',
		'Football = 12',
		'Natation = 8',
		'Danse = 7',
		'axe: 0 à 20, de 2 en 2',
		'placer: Natation ; Danse'
	];

	it('toutes les barres, les attendues en vert, sans geste à faire', async () => {
		const { container } = await render(StatChart, {
			target: mainElement(),
			props: { node: parseStatChartContent('barres', [...SOURCE, 'solution: oui'].join('\n')) }
		});
		expect(container.querySelector('button')).toBeNull();
		expect(container.querySelectorAll('rect.stat-barre')).toHaveLength(3);
		const vertes = container.querySelectorAll('rect.stat-barre-solution');
		expect(vertes).toHaveLength(2);
		const vert = themeColor('--color-fig-vert');
		for (const b of vertes) expect(getComputedStyle(b).fill).toBe(vert);
	});
});
