/**
 * Droite graduée avec zoom à l'écran (outil n° 54, chantier `docs/wip/droite-zoom-progress.md`)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NumberLine from '../NumberLine.svelte';
import { parseNumberLineContent } from '#lib/ubumark/parser/number-line-parser.ts';

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

function node(lines: string[]) {
	const { node, errors } = parseNumberLineContent(lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
}

async function svgOf(lines: string[]): Promise<SVGSVGElement> {
	const { container } = await render(NumberLine, {
		target: mainElement(),
		props: { node: node(lines) }
	});
	const svg = container.querySelector<SVGSVGElement>('svg.number-line-svg')!;
	await expect.poll(() => svg.getAttribute('width')).toBe(String(WIDTH));
	return svg;
}

const LINES = [
	'start: 12',
	'end: 13',
	'step: 0.1',
	'labels: 12, 13',
	'points: A=12.4, C=12.5, B=12.47',
	'zoom: 12.4 ; 12.5 ; step 0.01',
	'zoom: 12.47 ; 12.48 ; step 0.001'
];

/** Ordonnée d'un axe (trait plein horizontal) */
function axisYs(svg: SVGSVGElement): number[] {
	return [...svg.querySelectorAll('line.nl-axis')].map((l) => Number(l.getAttribute('y1')));
}

describe('Droite avec zoom — écran', () => {
	it('une droite par zoom, chacune plus bas que la précédente', async () => {
		const svg = await svgOf(LINES);
		const ys = axisYs(svg);
		expect(ys).toHaveLength(3);
		expect(ys[1]).toBeGreaterThan(ys[0]);
		expect(ys[2]).toBeGreaterThan(ys[1]);
		// Le dessin est assez haut pour les 3 droites
		expect(Number(svg.getAttribute('height'))).toBeGreaterThan(ys[2] + 40);
	});

	it('deux pointillés par zoom, des bouts agrandis aux bouts du zoom', async () => {
		const svg = await svgOf(LINES.slice(0, 6));
		const dashed = [...svg.querySelectorAll('line.nl-zoom-link')];
		expect(dashed).toHaveLength(2);
		const [left, right] = dashed;
		const axis = svg.querySelectorAll('line.nl-axis');
		const zoomAxis = axis[1];
		// En haut : 12,4 et 12,5 sur la droite principale (de 12 à 13)
		const x0 = Number(axis[0].getAttribute('x1'));
		const x1 = Number(axis[0].getAttribute('x2'));
		expect(Number(left.getAttribute('x1'))).toBeCloseTo(x0 + 0.4 * (x1 - x0), 1);
		expect(Number(right.getAttribute('x1'))).toBeCloseTo(x0 + 0.5 * (x1 - x0), 1);
		// En bas : les deux bouts du zoom
		expect(Number(left.getAttribute('x2'))).toBeCloseTo(Number(zoomAxis.getAttribute('x1')), 1);
		expect(Number(right.getAttribute('x2'))).toBeCloseTo(Number(zoomAxis.getAttribute('x2')), 1);
		expect(left.getAttribute('stroke-dasharray')).toBeTruthy();
	});

	it('le pointillé part sous le nombre écrit de la graduation, sans le barrer', async () => {
		// 12 est écrit : départ sous son étiquette ; 12,1 ne l'est pas : sous la graduation
		const svg = await svgOf([
			'start: 12',
			'end: 13',
			'step: 0.1',
			'labels: 12, 13',
			'zoom: 12 ; 12.1 ; step 0.01'
		]);
		const [left, right] = [...svg.querySelectorAll('line.nl-zoom-link')];
		const label = svg.querySelector('.number-line-label')!.closest('foreignObject')!;
		const labelTop = Number(label.getAttribute('y'));
		expect(Number(left.getAttribute('y1'))).toBeGreaterThan(labelTop + 15);
		expect(Number(right.getAttribute('y1'))).toBeLessThan(labelTop);
	});

	it('un point sur toutes les droites où il tombe', async () => {
		const svg = await svgOf(LINES);
		const names = [...svg.querySelectorAll('.point-label')].map((e) => e.textContent?.trim());
		// Droite 1 : A, C, B ; zoom 1 (12,4 à 12,5) : A, C, B ; zoom 2 (12,47 à 12,48) : B
		expect(names.filter((n) => n === 'B')).toHaveLength(3);
		expect(names.filter((n) => n === 'A')).toHaveLength(2);
		expect(names.filter((n) => n === 'C')).toHaveLength(2);
	});

	it('zoom sans labels : seules les 2 étiquettes de la droite principale', async () => {
		const svg = await svgOf(LINES);
		expect(svg.querySelectorAll('.number-line-label')).toHaveLength(2);
	});

	it('nom pour les lecteurs d’écran', async () => {
		await svgOf(LINES);
		const box = document.querySelector('.number-line-container')!;
		expect(box.getAttribute('aria-label')).toBe('Droite graduée, avec 2 zooms');
	});

	it('sans zoom : une seule droite, aucun pointillé, hauteur de toujours', async () => {
		const svg = await svgOf(['start: 0', 'end: 10', 'step: 1']);
		expect(axisYs(svg)).toHaveLength(1);
		expect(svg.querySelectorAll('line.nl-zoom-link')).toHaveLength(0);
		expect(svg.getAttribute('height')).toBe('120');
	});
});
