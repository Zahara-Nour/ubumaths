/**
 * Blocs ```barres et ```circulaire à l'écran (lot 2, 2026-10-01)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des
 * règles), Tailwind chargé par le projet de tests navigateur.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StatChart from '../StatChart.svelte';
import ListNode from '../ListNode.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { buildStatChartScene, type PieScene } from '$lib/ubumark/utils/stat-chart-scene';
import { parseMarkdown, type ListNode as ListAst } from '$lib/ubumark';
import { DOCUMENT_FIGURE_LIMITS } from '../../render-budget';

// =============================================================================
// Helpers
// =============================================================================

const BARS = 'titre: Sports\naxes: Sport ; Élèves\nFootball = 12\nNatation = 8,0\nDanse = 7';
const PIE = 'titre: Transport\nBus = 14\nVélo = 6\nÀ pied = 10';

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
// Diagrammes
// =============================================================================

describe('StatChart — barres', () => {
	it('une barre VISIBLE par catégorie', async () => {
		const node = parseStatChartContent('barres', 'A = 3\nB = 5\nC = 1');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const bars = screen.container.querySelectorAll<SVGRectElement>('.stat-barre');

		expect(bars.length).toBe(3);
		const style = getComputedStyle(bars[0]);
		expect(style.fill).not.toBe('none');
		expect(bars[0].getBoundingClientRect().height).toBeGreaterThan(0);
	});

	it('noms des catégories, graduations et titres d’axes affichés', async () => {
		const node = parseStatChartContent('barres', 'axes: Sport ; Élèves\nA = 1 %\nB = 2 %');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const text = screen.container.textContent ?? '';

		expect(text).toContain('Sport');
		expect(text).toContain('Élèves');
		expect(text).toMatch(/\d,\d/);
	});

	it('valeurs au-dessus des barres seulement si demandé', async () => {
		const without = await render(StatChart, {
			target: mainElement(),
			props: { node: parseStatChartContent('barres', 'A = 12,5 %') }
		});
		expect(without.container.querySelectorAll('.stat-valeur').length).toBe(0);

		const withValues = await render(StatChart, {
			target: mainElement(),
			props: { node: parseStatChartContent('barres', 'valeurs: oui\nA = 12,5 %') }
		});
		expect(withValues.container.querySelector('.stat-valeur')?.textContent).toBe('12,5 %');
	});
});

describe('StatChart — circulaire', () => {
	it('autant de secteurs que la scène, une légende par catégorie', async () => {
		const node = parseStatChartContent('circulaire', `${PIE}\nRien = 0`);
		const scene = buildStatChartScene(node.spec!) as PieScene;
		const screen = await render(StatChart, { target: mainElement(), props: { node } });

		expect(screen.container.querySelectorAll('.stat-secteur').length).toBe(scene.sectors.length);
		const legend = [...screen.container.querySelectorAll('.stat-legende li')].map((li) =>
			li.textContent?.trim()
		);
		expect(legend).toEqual(['Bus — 46,7 %', 'Vélo — 20 %', 'À pied — 33,3 %', 'Rien — 0 %']);
	});

	it('les secteurs ont des couleurs différentes', async () => {
		const node = parseStatChartContent('circulaire', PIE);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const fills = [...screen.container.querySelectorAll('.stat-secteur')].map(
			(s) => getComputedStyle(s).fill
		);

		expect(new Set(fills).size).toBe(3);
	});
});

// =============================================================================
// Accessibilité
// =============================================================================

describe('StatChart — accessibilité', () => {
	it('SVG role="img" relié à un <title> et à un <desc>', async () => {
		const node = parseStatChartContent('barres', 'Football = 12\nNatation = 8');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector('svg[role="img"]')!;
		const title = svg.querySelector('title')!;
		const desc = svg.querySelector('desc')!;

		expect(title.textContent).toBe('Diagramme en barres');
		expect(desc.textContent).toBe('Diagramme en barres : Football 12, Natation 8.');
		expect(svg.getAttribute('aria-labelledby')).toBe(title.id);
		expect(svg.getAttribute('aria-describedby')).toBe(desc.id);
	});

	it('deux diagrammes sur la page : des identifiants distincts', async () => {
		const target = mainElement();
		await render(StatChart, { target, props: { node: parseStatChartContent('barres', 'A = 1') } });
		await render(StatChart, { target, props: { node: parseStatChartContent('barres', 'B = 1') } });
		const ids = [...target.querySelectorAll('svg title')].map((t) => t.id);

		expect(new Set(ids).size).toBe(2);
	});

	// Audit a11y du lot 2 : figcaption ET <title> identiques = titre annoncé deux fois
	it('le titre de l’auteur est affiché une fois ; l’image annonce son genre', async () => {
		const node = parseStatChartContent('circulaire', PIE);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });

		expect(screen.container.querySelector('figcaption')?.textContent).toBe('Transport');
		expect(screen.container.querySelector('svg title')?.textContent).toBe('Diagramme circulaire');
	});

	// Audit a11y du lot 2 : noms inclinés et graduations sortaient du cadre
	it('aucun texte ne sort du cadre, même avec un long nom incliné et de grandes graduations', async () => {
		const long = 'Une catégorie au nom vraiment très long';
		const node = parseStatChartContent(
			'barres',
			`${long} = 12500\nB = 3\nC = 4\nD = 1\nE = 2\nF = 3\nG = 4`
		);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector('svg')!;
		const [, , width, height] = svg.getAttribute('viewBox')!.split(' ').map(Number);

		for (const text of svg.querySelectorAll<SVGTextElement>('text')) {
			const box = text.getBBox();
			const matrix = text.getCTM()!.inverse().multiply(svg.getCTM()!).inverse();
			const corners = [
				new DOMPoint(box.x, box.y),
				new DOMPoint(box.x + box.width, box.y + box.height),
				new DOMPoint(box.x, box.y + box.height),
				new DOMPoint(box.x + box.width, box.y)
			].map((p) => p.matrixTransform(matrix));
			for (const c of corners) {
				expect(c.x, text.textContent ?? '').toBeGreaterThanOrEqual(-1);
				expect(c.x, text.textContent ?? '').toBeLessThanOrEqual(width + 1);
				expect(c.y, text.textContent ?? '').toBeGreaterThanOrEqual(-1);
				expect(c.y, text.textContent ?? '').toBeLessThanOrEqual(height + 1);
			}
		}
	});

	it('un nom hostile s’affiche en texte, sans être interprété', async () => {
		const node = parseStatChartContent('barres', '<b>gras</b> = 2');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });

		expect(screen.container.querySelector('svg b')).toBeNull();
		expect(screen.container.textContent).toContain('<b>gras</b>');
	});
});

// =============================================================================
// Erreurs (Q48) et intégration
// =============================================================================

describe('StatChart — erreurs (Q48)', () => {
	it('élève (défaut) : cadre neutre, pas de détail', async () => {
		const node = parseStatChartContent('barres', 'A = -1');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const text = screen.container.textContent ?? '';

		expect(text).toContain('Figure indisponible');
		expect(text).not.toContain('Ligne');
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('prof : message situé', async () => {
		const node = parseStatChartContent('barres', 'A = -1');
		const screen = await render(StatChart, {
			target: mainElement(),
			props: { node, showErrors: true }
		});

		expect(screen.container.textContent).toContain('Ligne 1');
	});

	it('MarkdownRenderer : élève par défaut, prof avec `showAuthoringErrors`', async () => {
		const content = ['Avant.', '', '```circulaire', 'A = 50 %', '```', '', 'Après.'].join('\n');
		const eleve = await render(MarkdownRenderer, { target: mainElement(), props: { content } });
		expect(eleve.container.textContent).toContain('Figure indisponible');
		expect(eleve.container.textContent).toContain('Après.');

		const prof = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content, showAuthoringErrors: true }
		});
		expect(prof.container.textContent).toContain('50 %');
	});
});

describe('StatChart — dans un document', () => {
	it('ListNode affiche le diagramme d’un item de liste', async () => {
		const md = [
			'1. Lire :',
			'',
			'   ```barres',
			...BARS.split('\n').map((l) => `   ${l}`),
			'   ```'
		].join('\n');
		const list = parseMarkdown(md).children[0] as ListAst;
		const screen = await render(ListNode, {
			target: mainElement(),
			props: { ordered: true, items: list.items }
		});

		expect(screen.container.querySelectorAll('.stat-barre').length).toBe(3);
	});

	it('compte dans le budget de figures du document', async () => {
		const count = DOCUMENT_FIGURE_LIMITS.blocks + 1;
		const content = Array.from({ length: count }, () => '```barres\nA = 1\n```').join('\n\n');
		const screen = await render(MarkdownRenderer, { target: mainElement(), props: { content } });

		expect(screen.container.querySelectorAll('svg[role="img"]').length).toBe(
			DOCUMENT_FIGURE_LIMITS.blocks
		);
		expect(screen.container.textContent).toContain('Figure indisponible');
	});
});
