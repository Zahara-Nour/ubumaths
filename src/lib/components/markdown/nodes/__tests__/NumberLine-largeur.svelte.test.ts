/**
 * Droite graduée à la largeur réelle de son conteneur (téléphone :
 * `docs/wip/reponses-a-placer-progress.md` § 8, décision 1)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NumberLine from '../NumberLine.svelte';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { NL_LAYOUT } from '$lib/ubumark/utils/number-line-render';

let mains: HTMLElement[] = [];
/** Un <main> de la largeur voulue (écran de téléphone, d'ordinateur) */
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

const LINE_0_20 = ['start: 0', 'end: 20', 'step: 1', 'labels: 0, 10, 20'];
const LINE_0_10 = ['start: 0', 'end: 10', 'step: 1', 'labels: 0, 5, 10'];

/** Attendre que la droite ait pris la largeur de son conteneur */
async function svgOf(root: Element, width: number): Promise<SVGSVGElement> {
	const svg = root.querySelector<SVGSVGElement>('svg.number-line-svg')!;
	await expect.poll(() => svg.getAttribute('width')).toBe(String(width));
	return svg;
}

/** Abscisses (px à l'écran) des graduations */
function tickXs(svg: SVGSVGElement): number[] {
	const left = svg.getBoundingClientRect().left;
	return [...svg.querySelectorAll('line.nl-tick')].map(
		(t) => t.getBoundingClientRect().left - left
	);
}

describe('Droite graduée — largeur réelle', () => {
	it('téléphone (320 px) : la droite fait 320 px, sans réduction', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(320),
			props: { node: node(...LINE_0_20) }
		});
		const svg = await svgOf(screen.container, 320);
		expect(svg.getAttribute('viewBox')).toMatch(/^0 0 320 /);
		expect(svg.getBoundingClientRect().width).toBeCloseTo(320, 0);
	});

	it('les chiffres gardent leur taille ; seul l’écart entre graduations change', async () => {
		const phone = await render(NumberLine, {
			target: mainElement(320),
			props: { node: node(...LINE_0_20) }
		});
		const desk = await render(NumberLine, {
			target: mainElement(700),
			props: { node: node(...LINE_0_20) }
		});
		const phoneSvg = await svgOf(phone.container, 320);
		const deskSvg = await svgOf(desk.container, 700);

		const labelWidth = (svg: SVGSVGElement) =>
			svg.querySelector('foreignObject')!.getBoundingClientRect().width;
		expect(labelWidth(phoneSvg)).toBeCloseTo(labelWidth(deskSvg), 0);

		const gap = (svg: SVGSVGElement) => {
			const xs = tickXs(svg);
			return xs[1] - xs[0];
		};
		expect(gap(phoneSvg)).toBeCloseTo(12, 0);
		expect(gap(deskSvg)).toBeCloseTo(31, 0);
	});
});

describe('Droite graduée — avertissement téléphone', () => {
	it('prof, droite à placer : graduations à 12 px sur téléphone → avertissement', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(700),
			props: { node: node(...LINE_0_20, 'placer: 7'), showErrors: true }
		});
		expect(screen.container.querySelector('.nl-warnings')?.textContent).toContain('téléphone');
	});

	it('élève : jamais d’avertissement', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(700),
			props: { node: node(...LINE_0_20, 'placer: 7') }
		});
		expect(screen.container.querySelector('.nl-warnings')).toBeNull();
	});

	it('prof, droite à placer : graduations assez écartées → rien', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(700),
			props: { node: node(...LINE_0_10, 'placer: 7'), showErrors: true }
		});
		expect(screen.container.querySelector('.nl-warnings')).toBeNull();
	});

	it('prof, droite d’affichage (sans placer:) : graduations fines permises', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(700),
			props: { node: node(...LINE_0_20), showErrors: true }
		});
		expect(screen.container.querySelector('.nl-warnings')).toBeNull();
	});

	it('droite à placer : l’avertissement une seule fois, correction comprise', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(700),
			props: {
				node: node(...LINE_0_20, 'placer: 7'),
				showErrors: true,
				answer: { value: '9', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		expect(screen.container.querySelectorAll('.nl-warnings li')).toHaveLength(1);
	});
});

describe('Droite à placer — téléphone', () => {
	it('320 px : toucher la graduation 13 pose le point sur 13, pas à côté', async () => {
		const changes: string[] = [];
		const screen = await render(NumberLine, {
			target: mainElement(320),
			props: {
				node: node(...LINE_0_20, 'placer: 7'),
				answer: { value: '', isCorrect: null, disabled: false, onChange: (v) => changes.push(v) }
			}
		});
		const zone = screen.container.querySelector<HTMLElement>('[role="slider"]')!;
		const svg = zone.querySelector<SVGSVGElement>('svg')!;
		const rect = svg.getBoundingClientRect();
		await expect.poll(() => svg.getAttribute('width')).toBe(String(Math.round(rect.width)));
		// graduation 13 à l'écran : marge fixe + 13/20 de la ligne
		const { MARGIN_LEFT, MARGIN_RIGHT } = NL_LAYOUT;
		const clientX = rect.left + MARGIN_LEFT + (13 / 20) * (rect.width - MARGIN_LEFT - MARGIN_RIGHT);
		const init = { bubbles: true, clientX, clientY: rect.top + 50, pointerId: 1 };
		zone.dispatchEvent(new PointerEvent('pointerdown', init));
		zone.dispatchEvent(new PointerEvent('pointerup', init));
		expect(changes).toEqual(['13']);
	});
});
