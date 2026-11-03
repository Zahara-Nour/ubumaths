/**
 * Droite graduée : crochets et demi-droite à l'écran (chantier `docs/wip/demi-droite-progress.md`)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NumberLine from '../NumberLine.svelte';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';

const WIDTH = 600;

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	main.style.width = `${WIDTH}px`;
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

function node(segments: string) {
	const lines = ['start: 0', 'end: 10', 'step: 1', 'arrows: true', `segments: ${segments}`];
	const { node, errors } = parseNumberLineContent(lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
}

async function svgOf(segments: string): Promise<SVGSVGElement> {
	const { container } = await render(NumberLine, {
		target: mainElement(),
		props: { node: node(segments) }
	});
	const svg = container.querySelector<SVGSVGElement>('svg.number-line-svg')!;
	await expect.poll(() => svg.getAttribute('width')).toBe(String(WIDTH));
	return svg;
}

/** Points (x, y) d'un crochet : `M x y L x y L x y L x y` */
function bracketPoints(path: Element): number[][] {
	const nums = (path.getAttribute('d') ?? '').match(/-?\d+(\.\d+)?/g)!.map(Number);
	const points: number[][] = [];
	for (let i = 0; i < nums.length; i += 2) points.push([nums[i], nums[i + 1]]);
	return points;
}

/** Sens des becs d'un crochet : +1 vers la droite, −1 vers la gauche */
function direction(path: Element): number {
	const [first, second] = bracketPoints(path);
	return Math.sign(first[0] - second[0]);
}

describe('Droite graduée — crochets', () => {
	it('[2, 5] : deux crochets, aucun disque', async () => {
		const svg = await svgOf('[2, 5]');
		const brackets = svg.querySelectorAll('path.nl-bracket');
		expect(brackets).toHaveLength(2);
		expect(svg.querySelectorAll('circle.nl-endpoint')).toHaveLength(0);
		// [ fermé : becs vers l'intérieur
		expect(direction(brackets[0])).toBe(1);
		expect(direction(brackets[1])).toBe(-1);
	});

	it(']2, 5[ : becs tournés vers l’extérieur', async () => {
		const svg = await svgOf(']2, 5[');
		const brackets = svg.querySelectorAll('path.nl-bracket');
		expect(direction(brackets[0])).toBe(-1);
		expect(direction(brackets[1])).toBe(1);
	});

	it('le crochet est à l’abscisse de sa borne et de la couleur du segment', async () => {
		const svg = await svgOf('[2, 5] rouge');
		const segment = svg.querySelector('line.nl-segment')!;
		const [bracket] = svg.querySelectorAll('path.nl-bracket');
		// coin du crochet (2e point) = début du trait
		expect(bracketPoints(bracket)[1][0]).toBeCloseTo(Number(segment.getAttribute('x1')), 5);
		expect(getComputedStyle(bracket).stroke).toBe(getComputedStyle(segment).stroke);
	});
});

describe('Droite graduée — demi-droite', () => {
	it('[2, +inf[ : un seul crochet, trait jusqu’au bout de la flèche', async () => {
		const svg = await svgOf('[2, +inf[');
		expect(svg.querySelectorAll('path.nl-bracket')).toHaveLength(1);
		const axis = svg.querySelector('line.nl-axis')!;
		const segment = svg.querySelector('line.nl-segment')!;
		expect(segment.getAttribute('x2')).toBe(axis.getAttribute('x2'));
	});

	it(']-inf, 3] : trait depuis le bout gauche de la flèche', async () => {
		const svg = await svgOf(']-inf, 3]');
		const axis = svg.querySelector('line.nl-axis')!;
		const segment = svg.querySelector('line.nl-segment')!;
		expect(segment.getAttribute('x1')).toBe(axis.getAttribute('x1'));
		const [bracket] = svg.querySelectorAll('path.nl-bracket');
		expect(direction(bracket)).toBe(-1);
	});

	it(']-inf, +inf[ : toute la droite, sans crochet', async () => {
		const svg = await svgOf(']-inf, +inf[');
		expect(svg.querySelectorAll('path.nl-bracket')).toHaveLength(0);
	});
});
