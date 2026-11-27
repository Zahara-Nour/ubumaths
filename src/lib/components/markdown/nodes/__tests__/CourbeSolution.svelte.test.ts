/**
 * Repère `solution: oui` à l'écran : la réponse dessinée, rien à faire (V108)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Courbe from '../Courbe.svelte';
import { parseCourbeContent } from '#lib/ubumark/parser/courbe-parser.ts';

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

const WINDOW = ['x: -5 ; 5', 'y: -4 ; 4', 'grille: 1'];
const node = (...lines: string[]) => parseCourbeContent([...WINDOW, ...lines].join('\n'));

describe('Courbe — solution: oui', () => {
	it('vecteur : la flèche juste, sans zone de geste ni étiquettes', async () => {
		const { container } = await render(Courbe, {
			target: mainElement(),
			props: { node: node('points: A(-1;2)', 'tracer: vecteur (3 ; -2) depuis A', 'solution: oui') }
		});
		expect(container.querySelector('[role="slider"]')).toBeNull();
		expect(container.querySelector('button')).toBeNull();
		const fleches = container.querySelectorAll('.courbe-fleche');
		expect(fleches).toHaveLength(1);
		expect(getComputedStyle(fleches[0]).stroke).not.toBe('none');
	});

	it('droite verticale : un trait, deux nœuds', async () => {
		const { container } = await render(Courbe, {
			target: mainElement(),
			props: { node: node('tracer: x = 3', 'solution: oui') }
		});
		const traits = container.querySelectorAll('line.courbe-trace');
		expect(traits).toHaveLength(1);
		expect(traits[0].getAttribute('x1')).toBe(traits[0].getAttribute('x2'));
		expect(container.querySelectorAll('circle.courbe-pose')).toHaveLength(2);
	});

	it('sans `solution: oui` : le geste à faire, sans la réponse', async () => {
		const { container } = await render(Courbe, {
			target: mainElement(),
			props: { node: node('tracer: x = 3') }
		});
		expect(container.querySelector('[role="slider"]')).not.toBeNull();
		expect(container.querySelectorAll('line.courbe-trace')).toHaveLength(0);
	});
});
