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
		expect(legend).toEqual([
			'1 Bus — 46,7 %',
			'2 Vélo — 20 %',
			'3 À pied — 33,3 %',
			'4 Rien — 0 %'
		]);
	});

	// Q23 : le numéro relie le secteur à sa légende sans passer par la couleur
	it('chaque secteur porte un repère numéroté, lisible sur sa couleur', async () => {
		const node = parseStatChartContent('circulaire', PIE);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const markers = [...screen.container.querySelectorAll('.stat-repere text')].map(
			(t) => t.textContent
		);

		expect(markers).toEqual(['1', '2', '3']);
		const disk = screen.container.querySelector('.stat-repere circle') as SVGCircleElement;
		expect(getComputedStyle(disk).fill).not.toBe('none');
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

describe('StatChart — histogramme et polygone (lot 3)', () => {
	const TRAJETS = '[0 ; 10[ = 12\n[10 ; 20[ = 18\n[20 ; 40[ = 10';

	it('histogramme : un rectangle VISIBLE par classe, légende d’aire affichée', async () => {
		const node = parseStatChartContent('histogramme', TRAJETS);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const rects = screen.container.querySelectorAll<SVGRectElement>('.stat-rectangle');

		expect(rects.length).toBe(3);
		expect(getComputedStyle(rects[0]).fill).not.toBe('none');
		expect(screen.container.textContent).toContain('1 carreau = 2');
	});

	it('polygone : un tracé VISIBLE et les lectures demandées', async () => {
		const node = parseStatChartContent('frequences-cumulees', `lecture: quartiles\n${TRAJETS}`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const line = screen.container.querySelector<SVGPolylineElement>('.stat-polygone')!;

		expect(line.getAttribute('points')?.split(' ')).toHaveLength(4);
		expect(getComputedStyle(line).stroke).not.toBe('none');
		expect(screen.container.querySelectorAll('.stat-lecture').length).toBe(3);
		expect(screen.container.textContent).toContain('Me ≈ 14,44');
	});

	it('ligne d’indicateurs sous la figure', async () => {
		const node = parseStatChartContent(
			'histogramme',
			`indicateurs: effectif ; moyenne\n${TRAJETS}`
		);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });

		// Une liste : « · » n'est ni lu ni marqué d'une pause par les lecteurs d'écran (audit a11y)
		const items = [...screen.container.querySelectorAll('.stat-indicateurs li')].map(
			(li) => li.textContent
		);
		expect(items).toEqual(['Effectif total : 40', 'Moyenne = 15,75']);
	});

	// Audit a11y : un effectif écrit DANS le rectangle disparaissait (rectangle bas, effectif 0)
	// ou manquait de contraste (rouge, bleu en sombre)
	it('valeurs: oui — l’effectif est écrit au-dessus du rectangle, même nul', async () => {
		const node = parseStatChartContent('histogramme', 'valeurs: oui\n[0 ; 10[ = 0\n[10 ; 20[ = 5');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const rects = screen.container.querySelectorAll<SVGRectElement>('.stat-rectangle');
		const labels = screen.container.querySelectorAll<SVGTextElement>('.stat-valeur');

		expect(labels.length).toBe(2);
		labels.forEach((label, i) => {
			const top = rects[i].getBoundingClientRect().top;
			expect(label.getBoundingClientRect().bottom).toBeLessThanOrEqual(top + 1);
		});
	});
});

describe('StatChart — tableau croisé (lot 4)', () => {
	const TABLE =
		'lignes: Fille ; Garçon\ncolonnes: Externe ; Demi-pensionnaire\nFille = 45 ; 120\nGarçon = 50 ; 110';

	it('un vrai tableau : légende, en-têtes de colonnes et de lignes', async () => {
		const node = parseStatChartContent('tableau-croise', `titre: Régime\n${TABLE}`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const table = screen.container.querySelector('table')!;

		expect(table.querySelector('caption')?.textContent).toBe('Régime');
		expect(
			[...table.querySelectorAll('thead th[scope="col"]')].map((th) => th.textContent)
		).toEqual(['Externe', 'Demi-pensionnaire', 'Total']);
		expect(
			[...table.querySelectorAll('tbody th[scope="row"]')].map((th) => th.textContent)
		).toEqual(['Fille', 'Garçon', 'Total']);
		expect(table.querySelector('tbody tr td')?.textContent).toBe('45');
	});

	it('case masquée : vide à l’écran, annoncée « case à compléter »', async () => {
		const node = parseStatChartContent('tableau-croise', `${TABLE}\nmasquer: Fille/Externe`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const cell = screen.container.querySelector('tbody tr td')!;

		expect(cell.textContent?.trim()).toBe('case à compléter');
		const hint = cell.querySelector('span')!;
		expect(hint.getBoundingClientRect().width).toBeLessThanOrEqual(1);
	});

	it('sans titre : légende accessible « Tableau croisé »', async () => {
		const node = parseStatChartContent('tableau-croise', TABLE);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });

		expect(screen.container.querySelector('caption')?.textContent).toBe('Tableau croisé');
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

// Revue du lot 3 : une exception de la scène cassait le rendu de TOUTE la page
describe('StatChart — scène qui échoue', () => {
	function brokenNode() {
		const node = parseStatChartContent('histogramme', '[0 ; 1[ = 1\n[1 ; 3[ = 1');
		// Spécification forgée, hors du parseur : quadrillage démesuré
		node.spec!.data[1].interval = { lower: 1, upper: 1_000_000_000 };
		return node;
	}

	it('élève : cadre neutre, la page continue', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: 'Avant.' }
		});
		const chart = await render(StatChart, { target: mainElement(), props: { node: brokenNode() } });

		expect(chart.container.textContent).toContain('Figure indisponible');
		expect(screen.container.textContent).toContain('Avant.');
	});

	it('prof : un message dit que le diagramme n’a pas pu être dessiné', async () => {
		const chart = await render(StatChart, {
			target: mainElement(),
			props: { node: brokenNode(), showErrors: true }
		});

		expect(chart.container.textContent).toMatch(/non dessiné/);
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
