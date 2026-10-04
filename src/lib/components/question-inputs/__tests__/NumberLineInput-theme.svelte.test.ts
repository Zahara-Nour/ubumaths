/**
 * Saisie élève sur droite graduée : le halo des points et les points ouverts ont la
 * couleur du FOND, dans les deux modes — comme le bloc NumberLine depuis le lot 3.
 * Avant : halo sur `var(--number-line-bg, white)`, variable posée seulement en sombre
 * et via `hsl(var(--background))` (inexistante) → blanc en sombre ; segments jamais
 * dessinés. On lit la couleur RENDUE (`getComputedStyle`).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NumberLineInput from '../NumberLineInput.svelte';

// --color-background (app.css)
const BACKGROUND = { light: 'rgb(250, 250, 250)', dark: 'rgb(38, 38, 36)' };

const CONFIG = ['start: 0', 'end: 10', 'step: 1'].join('\n');

let mains: HTMLElement[] = [];
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

function inBothModes(read: () => string): { light: string; dark: string } {
	// Décor de mode-watcher : `color-scheme` (tokens light-dark()) ET classe `.dark`
	const root = document.documentElement;
	try {
		root.style.colorScheme = 'light';
		root.classList.remove('dark');
		const light = read();
		root.style.colorScheme = 'dark';
		root.classList.add('dark');
		const dark = read();
		return { light, dark };
	} finally {
		root.style.colorScheme = '';
		root.classList.remove('dark');
	}
}

async function renderInput(props: {
	fixedPoints?: string;
	fixedSegments?: string;
	value?: string;
}) {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	const screen = await render(NumberLineInput, {
		target: main,
		props: { configBlock: CONFIG, task: 'place-point', snap: true, value: '', ...props }
	});
	return screen.container;
}

function all(container: Element, selector: string): Element[] {
	const found = [...container.querySelectorAll(selector)];
	if (found.length === 0) throw new Error(`aucun élément ${selector}`);
	return found;
}

describe('NumberLineInput : halos et points ouverts sur la couleur du fond', () => {
	it('point placé par l’élève : halo de la couleur du fond, pas blanc en sombre', async () => {
		const c = await renderInput({ value: '4' });
		const [placed] = all(c, 'circle.placed-point');
		expect(inBothModes(() => getComputedStyle(placed).stroke)).toEqual(BACKGROUND);
	});

	it('points fixes de l’énoncé : halo de la couleur du fond', async () => {
		const c = await renderInput({ fixedPoints: 'A=2, B=7' });
		const circles = all(c, 'circle.nl-point');
		expect(circles).toHaveLength(2);
		for (const circle of circles) {
			expect(inBothModes(() => getComputedStyle(circle).stroke)).toEqual(BACKGROUND);
		}
	});

	it('segment à bornes ouvertes : les deux extrémités remplies de la couleur du fond', async () => {
		const c = await renderInput({ fixedSegments: ']1, 3[ bleu' });
		const open = all(c, 'circle.nl-endpoint-open');
		expect(open).toHaveLength(2);
		for (const end of open) {
			expect(inBothModes(() => getComputedStyle(end).fill)).toEqual(BACKGROUND);
		}
	});
});
