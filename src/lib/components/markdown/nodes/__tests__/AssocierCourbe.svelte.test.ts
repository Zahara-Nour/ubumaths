/**
 * Associer, lot 2 — une courbe dans un élément, à l'écran (chantier
 * `docs/wip/associer-progress.md`, phase 0 du lot 2)
 *
 * Courbe en petit dans la case de l'élément (130 à 180 px), deux colonnes même au
 * téléphone, le geste se fait sur la case entière (la figure ne capte rien).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import AssocierPlacer from '../AssocierPlacer.svelte';
import { parseAssocierContent } from '$lib/ubumark/parser/associer-parser';

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

const courbe = (expr: string) => [
	'- ```courbe',
	'  x: -3 ; 3',
	'  y: -3 ; 3',
	`  f(x) = ${expr}`,
	'  ```',
	'  ->'
];
const node = (gesture: 'relier' | 'etiquettes') =>
	parseAssocierContent(
		[
			'case: 0',
			...(gesture === 'etiquettes' ? ['geste: étiquettes'] : []),
			...courbe('2*x'),
			...courbe('-x'),
			'- -> $x \\mapsto -x$',
			'- -> $x \\mapsto 2x$',
			'- -> $x \\mapsto x^2$'
		].join('\n')
	);

function answersProbe(count: number) {
	const probe = { values: Array<string>(count).fill('') };
	return {
		probe,
		answers: () =>
			probe.values.map((value, k) => ({
				value,
				isCorrect: null,
				disabled: false,
				onChange: (next: string) => {
					probe.values[k] = next;
				}
			}))
	};
}

describe('Associer — courbe dans un élément', () => {
	it('relier : chaque courbe dessinée en petit dans sa case, toucher la courbe puis une étiquette relie', async () => {
		const { probe, answers } = answersProbe(2);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: node('relier'), answers: answers() }
		});
		const root = screen.container;
		expect(node('relier').errors).toEqual([]);
		const items = [
			...root.querySelectorAll<HTMLButtonElement>('button[data-relier-case^="item:"]')
		];
		expect(items).toHaveLength(2);
		for (const item of items) {
			const svg = item.querySelector('svg');
			expect(svg).not.toBeNull();
			const width = svg!.getBoundingClientRect().width;
			expect(width).toBeGreaterThan(100);
			expect(width).toBeLessThanOrEqual(181);
		}
		const labels = [
			...root.querySelectorAll<HTMLButtonElement>('button[data-relier-case^="label:"]')
		];
		await userEvent.click(items[1].querySelector('svg')!, { force: true });
		await userEvent.click(labels[0]);
		await expect.poll(() => probe.values).toEqual(['', '0']);
	});

	it('étiquettes : la courbe à gauche de sa place', async () => {
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: node('etiquettes'), answers: answersProbe(2).answers() }
		});
		const root = screen.container;
		expect(root.querySelectorAll('[data-associer-bloc] svg')).toHaveLength(2);
	});

	it('téléphone (360 px) : deux colonnes, rien ne déborde', async () => {
		await page.viewport(360, 740);
		try {
			const screen = await render(AssocierPlacer, {
				target: mainElement(),
				props: { node: node('relier'), answers: answersProbe(2).answers() }
			});
			const root = screen.container as HTMLElement;
			expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
			const item = root.querySelector('button[data-relier-case="item:0"]')!.getBoundingClientRect();
			const label = root
				.querySelector('button[data-relier-case^="label:"]')!
				.getBoundingClientRect();
			expect(label.left).toBeGreaterThan(item.left);
			const svg = root.querySelector('[data-associer-bloc] svg')!.getBoundingClientRect();
			expect(svg.width).toBeGreaterThanOrEqual(120);
		} finally {
			await page.viewport(1280, 800);
		}
	});
});
