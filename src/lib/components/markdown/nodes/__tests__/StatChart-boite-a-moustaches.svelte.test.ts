/**
 * Bloc ```boite-a-moustaches à l'écran (chantier `boite-a-moustaches`, palier 1)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css`), Tailwind chargé
 * par le projet de tests navigateur. On asserte le RENDU : boîtes visibles,
 * noms, description lue par le lecteur d'écran.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StatChart from '../StatChart.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';

// =============================================================================
// Helpers
// =============================================================================

const NAUTIC = [
	'axe: 25 à 60, de 5 en 5',
	'titre: temps (en s)',
	'Nautic = 28 ; 30 ; 37 ; 45 ; 58',
	'Neptune = 36 ; 37 ; 39 ; 42 ; 46'
].join('\n');

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

// =============================================================================
// Rendu
// =============================================================================

describe('StatChart — boîte à moustaches', () => {
	it('deux boîtes VISIBLES, leurs noms, une médiane chacune', async () => {
		const node = parseStatChartContent('boite-a-moustaches', NAUTIC);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector<SVGSVGElement>('svg[role="img"]')!;
		const boxes = [...svg.querySelectorAll<SVGRectElement>('rect.stat-boite')];
		const medians = [...svg.querySelectorAll<SVGLineElement>('line.stat-mediane')];
		const names = [...svg.querySelectorAll('text.stat-nom-boite')].map((t) => t.textContent);

		expect(boxes).toHaveLength(2);
		expect(boxes[0].getBoundingClientRect().width).toBeGreaterThan(0);
		expect(boxes[0].getBoundingClientRect().height).toBeGreaterThan(0);
		expect(getComputedStyle(boxes[0]).stroke).not.toBe('none');
		expect(medians).toHaveLength(2);
		// Médiane plus épaisse que le contour de la boîte
		expect(parseFloat(getComputedStyle(medians[0]).strokeWidth)).toBeGreaterThan(
			parseFloat(getComputedStyle(boxes[0]).strokeWidth)
		);
		expect(names).toEqual(['Nautic', 'Neptune']);
		// Nautic au-dessus de Neptune
		expect(boxes[0].getBoundingClientRect().top).toBeLessThan(boxes[1].getBoundingClientRect().top);
	});

	it('la boîte s’étend de Q1 à Q3, les moustaches du minimum au maximum', async () => {
		const node = parseStatChartContent('boite-a-moustaches', NAUTIC);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector<SVGSVGElement>('svg[role="img"]')!;
		const box = svg.querySelector<SVGRectElement>('rect.stat-boite')!;
		const x = (v: number) => {
			// Graduations : 25 à 60, lues sur les étiquettes de l'axe
			const ticks = [...svg.querySelectorAll<SVGTextElement>('.stat-axes text.stat-graduation')];
			const first = Number(ticks[0].getAttribute('x'));
			const last = Number(ticks.at(-1)!.getAttribute('x'));
			return first + ((v - 25) / 35) * (last - first);
		};
		expect(Number(box.getAttribute('x'))).toBeCloseTo(x(30), 1);
		expect(Number(box.getAttribute('x')) + Number(box.getAttribute('width'))).toBeCloseTo(x(45), 1);
		const whiskers = [...svg.querySelectorAll<SVGLineElement>('line.stat-moustache')];
		const ends = whiskers
			.slice(0, 2)
			.flatMap((w) => [Number(w.getAttribute('x1')), Number(w.getAttribute('x2'))]);
		expect(Math.min(...ends)).toBeCloseTo(x(28), 1);
		expect(Math.max(...ends)).toBeCloseTo(x(58), 1);
	});

	it('un axe gradué en bas, son titre, un trait vertical léger par graduation', async () => {
		const node = parseStatChartContent('boite-a-moustaches', NAUTIC);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector<SVGSVGElement>('svg[role="img"]')!;
		const labels = [...svg.querySelectorAll('.stat-axes text.stat-graduation')].map(
			(t) => t.textContent
		);

		expect(labels).toEqual(['25', '30', '35', '40', '45', '50', '55', '60']);
		expect(svg.querySelectorAll('.stat-grille')).toHaveLength(8);
		expect(svg.querySelector('text.stat-titre-axe')?.textContent).toBe('temps (en s)');
	});

	it('description accessible reliée au SVG', async () => {
		const node = parseStatChartContent('boite-a-moustaches', NAUTIC);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector<SVGSVGElement>('svg[role="img"]')!;
		const desc = document.getElementById(svg.getAttribute('aria-describedby')!)!;
		const title = document.getElementById(svg.getAttribute('aria-labelledby')!)!;

		expect(title.textContent).toBe('Boîte à moustaches');
		expect(desc.textContent).toContain(
			'Boîte Nautic : minimum 28, premier quartile 30, médiane 37, troisième quartile 45, maximum 58.'
		);
	});

	it('valeurs absentes par défaut, écrites avec `valeurs: oui`', async () => {
		const without = await render(StatChart, {
			target: mainElement(),
			props: { node: parseStatChartContent('boite-a-moustaches', NAUTIC) }
		});
		expect(without.container.querySelectorAll('.stat-valeur')).toHaveLength(0);

		const withValues = await render(StatChart, {
			target: mainElement(),
			props: { node: parseStatChartContent('boite-a-moustaches', `${NAUTIC}\nvaleurs: oui`) }
		});
		const values = [...withValues.container.querySelectorAll('.stat-valeur')].map(
			(t) => t.textContent
		);
		expect(values).toEqual(['28', '30', '37', '45', '58', '36', '37', '39', '42', '46']);
	});

	it('bloc en erreur : message situé pour le prof, rien de dessiné', async () => {
		const node = parseStatChartContent('boite-a-moustaches', 'A = 1 ; 2 ; 3');
		const screen = await render(StatChart, {
			target: mainElement(),
			props: { node, showErrors: true }
		});
		expect(screen.container.querySelector('svg[role="img"]')).toBeNull();
		expect(screen.container.textContent).toContain('3 valeurs');
	});

	it('rendu depuis un document (premier niveau et liste)', async () => {
		const block = '```boite-a-moustaches\nA = 1 ; 2 ; 3 ; 4 ; 5\n```';
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: `${block}\n\n1. Lis la boîte :\n\n   ${block.replaceAll('\n', '\n   ')}` }
		});
		expect(screen.container.querySelectorAll('rect.stat-boite')).toHaveLength(2);
	});
});
