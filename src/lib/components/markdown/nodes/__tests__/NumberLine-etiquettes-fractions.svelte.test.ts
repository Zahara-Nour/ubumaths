/**
 * Droite graduée : une étiquette en fraction (23/10) est montrée en entier
 * (`docs/wip/questions-cm1-progress.md` § 10 ter : le dénominateur était coupé,
 * math-field de 42 px dans une zone de 30 px)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NumberLine from '../NumberLine.svelte';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';

let mains: HTMLElement[] = [];
function mainElement(width: number): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	main.style.width = `${width}px`;
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

function node(...lines: string[]) {
	const { node, errors } = parseNumberLineContent(lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
}

/** Les math-fields des étiquettes, une fois dessinés (hauteur non nulle) */
async function labelsOf(root: Element): Promise<HTMLElement[]> {
	const fields = () =>
		[...root.querySelectorAll<HTMLElement>('.number-line-label math-field')].filter(
			(m) => m.getBoundingClientRect().height > 0
		);
	await expect.poll(() => fields().length).toBe(2);
	return fields();
}

describe('Droite graduée — étiquettes en fraction', () => {
	it('le dénominateur de 23/10 et 24/10 est dans la zone de l’étiquette et dans le dessin', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(400),
			props: {
				node: node('start: 23/10', 'end: 24/10', 'step: 1/100', 'major: 10', 'labels: 23/10, 24/10')
			}
		});
		const svg = screen.container.querySelector<SVGSVGElement>('svg.number-line-svg')!;
		for (const field of await labelsOf(screen.container)) {
			const box = field.getBoundingClientRect();
			const zone = field.closest('foreignObject')!.getBoundingClientRect();
			expect(box.bottom).toBeLessThanOrEqual(zone.bottom + 0.5);
			expect(box.bottom).toBeLessThanOrEqual(svg.getBoundingClientRect().bottom + 0.5);
		}
	});
});
