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
import {
	buildStatChartScene,
	type PieScene,
	type SimulationScene
} from '$lib/ubumark/utils/stat-chart-scene';
import { parseMarkdown, type ListNode as ListAst } from '$lib/ubumark';
import { DOCUMENT_FIGURE_LIMITS } from '../../render-budget';
import { buildComparisonScene } from '$lib/ubumark/utils/comparison-scene';
import { describeList } from '$lib/statistics/describe';

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

describe('StatChart — palette commune des figures', () => {
	it('les secteurs puisent dans la palette, dans un ordre fixe : bleu, orange, vert', async () => {
		const node = parseStatChartContent('circulaire', PIE);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const root = document.documentElement;
		try {
			root.style.colorScheme = 'light';
			const fills = [...screen.container.querySelectorAll('.stat-secteur')].map(
				(s) => getComputedStyle(s).fill
			);
			// #2563eb, #b65a00, #018639
			expect(fills).toEqual(['rgb(37, 99, 235)', 'rgb(182, 90, 0)', 'rgb(1, 134, 57)']);
		} finally {
			root.style.colorScheme = '';
		}
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

	// Audit a11y du lot 4 : un tableau qui déborde doit défiler au clavier
	it('zone de défilement focalisable, nommée par la légende du tableau', async () => {
		const node = parseStatChartContent('tableau-croise', `titre: Régime\n${TABLE}`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const region = screen.container.querySelector('[role="region"]')!;
		const caption = screen.container.querySelector('caption')!;

		expect(region.getAttribute('tabindex')).toBe('0');
		expect(region.getAttribute('aria-labelledby')).toBe(caption.id);
	});

	it('case à compléter : assez large pour écrire, et repérable à l’œil', async () => {
		const node = parseStatChartContent('tableau-croise', `${TABLE}\nmasquer: Fille/Externe`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const cell = screen.container.querySelector<HTMLTableCellElement>('td.stat-case-vide')!;
		const filled = screen.container.querySelectorAll<HTMLTableCellElement>('tbody td')[1];

		expect(cell.getBoundingClientRect().width).toBeGreaterThanOrEqual(50);
		expect(getComputedStyle(cell).backgroundColor).not.toBe(
			getComputedStyle(filled).backgroundColor
		);
	});

	it('sans titre : légende accessible « Tableau croisé »', async () => {
		const node = parseStatChartContent('tableau-croise', TABLE);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });

		expect(screen.container.querySelector('caption')?.textContent).toBe('Tableau croisé');
	});
});

describe('StatChart — loi d’une variable aléatoire (lot 6)', () => {
	const GAME = 'G = -2 ; 0 ; 5\nP = 1/2 ; 3/10 ; 1/5';

	it('un tableau de deux lignes : gᵢ et P(G = gᵢ), en-têtes de ligne', async () => {
		const node = parseStatChartContent('loi', `${GAME}\nindicateurs: espérance`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const table = screen.container.querySelector('table')!;
		const headers = [...table.querySelectorAll('th[scope="row"]')].map((th) => th.textContent);

		expect(headers).toEqual(['gi', 'P(G = gi)']);
		expect(
			[...table.querySelectorAll('tr')[0].querySelectorAll('td')].map((td) => td.textContent)
		).toEqual(['−2', '0', '5']);
		expect(table.querySelector('caption')?.textContent).toBe('Loi de G');
		expect(screen.container.querySelector('.stat-indicateurs li')?.textContent).toBe('E(G) = 0');
	});

	it('probabilité masquée : case à compléter annoncée, et assez large', async () => {
		const node = parseStatChartContent('loi', `${GAME}\nmasquer: 5`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const cell = screen.container.querySelector<HTMLTableCellElement>('td.stat-case-vide')!;

		expect(cell.textContent?.trim()).toBe('case à compléter');
		expect(cell.getBoundingClientRect().width).toBeGreaterThanOrEqual(50);
	});
});

describe('StatChart — série brute (`données:`, v2 lot 4)', () => {
	it('le bloc dépouille la série : une barre par valeur, dans l’ordre croissant', async () => {
		const node = parseStatChartContent('barres', 'données: 12 ; 15 ; 12 ; 8\nvaleurs: oui');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const values = [...screen.container.querySelectorAll('.stat-valeur')].map((t) => t.textContent);

		expect(screen.container.querySelectorAll('rect.stat-barre')).toHaveLength(3);
		expect(values).toEqual(['1', '2', '1']);
	});
});

describe('StatChart — `série:` (v2 lot 4, Q106)', () => {
	it('affichée : la série en texte, sous le titre, avant la figure', async () => {
		const node = parseStatChartContent(
			'barres',
			'titre: Notes\ndonnées: 12 ; −3 ; 12,5\nsérie: affichée'
		);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const series = screen.container.querySelector('.stat-serie')!;
		const svg = screen.container.querySelector('svg[role="img"]')!;

		expect(series.textContent).toBe('Série\u00a0: 12\u00a0; −3\u00a0; 12,5');
		expect(series.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('la légende du carreau garde sa mise en page (régression de la règle .stat-serie)', async () => {
		const node = parseStatChartContent(
			'histogramme',
			'[0 ; 10[ = 4\n[10 ; 20[ = 6\nlégende: 1 carreau = 2 élèves'
		);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const legend = screen.container.querySelector<HTMLElement>('.stat-legende-aire')!;

		expect(getComputedStyle(legend).display).toBe('flex');
		expect(getComputedStyle(legend).justifyContent).toBe('center');
	});

	it('seule : la série, ni figure ni indicateurs', async () => {
		const node = parseStatChartContent(
			'histogramme',
			'titre: Notes\nclasses: 0 ; 10 ; 20\ndonnées: 12 ; 3\nsérie: seule\nindicateurs: moyenne'
		);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });

		expect(screen.container.querySelector('.stat-serie')?.textContent).toBe(
			'Série\u00a0: 12\u00a0; 3'
		);
		expect(screen.container.querySelector('figcaption')?.textContent).toBe('Notes');
		expect(screen.container.querySelector('svg')).toBeNull();
		expect(screen.container.querySelector('.stat-indicateurs')).toBeNull();
	});
});

describe('StatChart — comparaison de deux séries (`.comparer`, v2 lot 5)', () => {
	it('un tableau accessible : en-têtes de colonnes et de lignes, groupes marqués', async () => {
		const scene = buildComparisonScene([
			{ name: 'L', summary: describeList([12, 15, 9])! },
			{ name: 'M', summary: describeList([8, 17])! }
		]);
		const screen = await render(StatChart, { target: mainElement(), props: { scene } });
		const table = screen.container.querySelector('table')!;
		const columns = [...table.querySelectorAll('th[scope="col"]')].map((th) => th.textContent);
		const rows = [...table.querySelectorAll('tbody tr')];
		const first = (header: string) =>
			rows.find((tr) => tr.querySelector('th')?.textContent === header)!;

		expect(table.querySelector('caption')?.textContent).toBe('Comparaison de L et M');
		expect(columns).toEqual(['L', 'M']);
		expect([...first('Moyenne').querySelectorAll('td')].map((td) => td.textContent)).toEqual([
			'12',
			'12,5'
		]);
		const border = (header: string) =>
			parseFloat(getComputedStyle(first(header).querySelector('th')!).borderTopWidth);
		expect(border('Moyenne')).toBeGreaterThan(border('Écart type'));
		expect(screen.container.querySelector('figcaption')).toBeNull();
	});
});

describe('StatChart — barres à deux séries (v2 lot 5, Q115-Q118)', () => {
	const SOURCE =
		'données Garçons: 12 ; 15 ; 12 ; 9\ndonnées Filles: 14 ; 12 ; 15\nindicateurs: moyenne';

	it('barres groupées, la seconde hachurée, une étiquette par valeur, une légende', async () => {
		const node = parseStatChartContent('barres', SOURCE);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const rects = [...screen.container.querySelectorAll('rect.stat-barre')];
		const hatched = rects.filter((r) => r.classList.contains('stat-barre-hachuree'));
		const pattern = screen.container.querySelector('pattern');

		expect(rects).toHaveLength(8);
		expect(hatched).toHaveLength(4);
		expect(pattern).not.toBeNull();
		expect(getComputedStyle(hatched[0]).fill).toContain(pattern!.id);
		expect(
			[...screen.container.querySelectorAll('.stat-categories text')].map((t) => t.textContent)
		).toEqual(['9', '12', '14', '15']);
		expect(
			[...screen.container.querySelectorAll('.stat-legende-series li')].map((li) =>
				li.textContent?.trim()
			)
		).toEqual(['Garçons', 'Filles']);
	});

	it('valeurs plus petites qu’avec une série (deux barres par bande)', async () => {
		const size = async (source: string) => {
			const node = parseStatChartContent('barres', `${source}\nvaleurs: oui`);
			const screen = await render(StatChart, { target: mainElement(), props: { node } });
			return parseFloat(getComputedStyle(screen.container.querySelector('.stat-valeur')!).fontSize);
		};

		expect(await size('données A: 1 ; 2\ndonnées B: 2')).toBeLessThan(await size('données: 1 ; 2'));
	});

	it('le tableau d’indicateurs sous la figure, une colonne par série', async () => {
		const node = parseStatChartContent('barres', SOURCE);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const tables = screen.container.querySelectorAll('table');

		expect(tables).toHaveLength(1);
		expect([...tables[0].querySelectorAll('th[scope="col"]')].map((th) => th.textContent)).toEqual([
			'Garçons',
			'Filles'
		]);
		expect(tables[0].querySelector('tbody th')?.textContent).toBe('Moyenne');
		expect(screen.container.querySelector('.stat-indicateurs')).toBeNull();
	});
});

describe('StatChart — deux séries en classes (v2 lot 5 PR c)', () => {
	const BLOCK =
		'classes: 0 ; 5 ; 10 ; 15 ; 20\ndonnées 2de A: 12 ; 3 ; 17 ; 5\ndonnées 2de B: 9 ; 14 ; 11\nindicateurs: moyenne';

	it('deux histogrammes, nommés, le second hachuré, puis le tableau', async () => {
		const node = parseStatChartContent('histogramme', BLOCK);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const svgs = screen.container.querySelectorAll('svg.stat-svg');
		const hatched = screen.container.querySelectorAll('rect.stat-rectangle-hachure');

		expect(svgs).toHaveLength(2);
		expect(
			[...screen.container.querySelectorAll('.stat-nom-serie')].map((p) => p.textContent)
		).toEqual(['2de A', '2de B']);
		// Pas un <p> : `main p { font-size … !important }` (app.css) annulerait ses 0,875 rem
		const name = screen.container.querySelector<HTMLElement>('.stat-nom-serie')!;
		const paragraph = document.createElement('p');
		paragraph.textContent = 'x';
		screen.container.append(paragraph);
		expect(parseFloat(getComputedStyle(name).fontSize)).toBeLessThan(
			parseFloat(getComputedStyle(paragraph).fontSize)
		);
		paragraph.remove();
		expect(hatched).toHaveLength(4);
		expect(svgs[1].contains(hatched[0])).toBe(true);
		expect(getComputedStyle(hatched[0]).fill).toContain(svgs[1].querySelector('pattern')!.id);
		expect(screen.container.querySelectorAll('table')).toHaveLength(1);
	});

	it('deux polygones sur les mêmes axes, le second en pointillés, une légende', async () => {
		const node = parseStatChartContent('frequences-cumulees', BLOCK);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const second = screen.container.querySelector<SVGElement>('polyline.stat-polygone-second')!;

		expect(screen.container.querySelectorAll('svg.stat-svg')).toHaveLength(1);
		expect(getComputedStyle(second).strokeDasharray).not.toBe('none');
		expect(
			[...screen.container.querySelectorAll('.stat-legende-series li')].map((li) =>
				li.textContent?.trim()
			)
		).toEqual(['2de A', '2de B']);
	});
});

describe('StatChart — tableau d’effectifs (Q125-Q129)', () => {
	it('horizontal : une ligne des valeurs (en-têtes de colonne), une ligne par grandeur', async () => {
		const node = parseStatChartContent(
			'effectifs',
			'données: 12 ; 15 ; 12 ; 8\nlignes: effectifs ; fréquences'
		);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const table = screen.container.querySelector('table')!;

		expect(table.querySelector('caption')?.textContent).toBe('Tableau des effectifs');
		expect([...table.querySelectorAll('th[scope="col"]')].map((th) => th.textContent)).toEqual([
			'8',
			'12',
			'15',
			'Total'
		]);
		expect([...table.querySelectorAll('th[scope="row"]')].map((th) => th.textContent)).toEqual([
			'Valeur',
			'Effectif',
			'Fréquence'
		]);
		expect(
			[...table.querySelectorAll('tr')[1].querySelectorAll('td')].map((td) => td.textContent)
		).toEqual(['1', '2', '1', '4']);
	});

	it('une case masquée : vide, assez large, annoncée « case à compléter »', async () => {
		const node = parseStatChartContent('effectifs', 'données: 1 ; 2 ; 2\nmasquer: 2/effectifs');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const cell = screen.container.querySelector<HTMLTableCellElement>('td.stat-case-vide')!;

		expect(cell.textContent?.trim()).toBe('case à compléter');
		expect(cell.getBoundingClientRect().width).toBeGreaterThanOrEqual(50);
		expect(screen.container.querySelectorAll('td.stat-case-vide')).toHaveLength(1);
	});

	it('vertical : la case masquée est celle de sa valeur et de sa ligne', async () => {
		const values = Array.from({ length: 13 }, (_, i) => i).join(' ; ');
		const node = parseStatChartContent('effectifs', `données: ${values}\nmasquer: 3/effectifs`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const hidden = [...screen.container.querySelectorAll('td.stat-case-vide')];

		expect(hidden).toHaveLength(1);
		expect(hidden[0].closest('tr')?.querySelector('th')?.textContent).toBe('3');
		expect(hidden[0].textContent?.trim()).toBe('case à compléter');
	});

	it('la case Total d’un cumul : vide, annoncée « sans objet »', async () => {
		const node = parseStatChartContent('effectifs', 'données: 1 ; 2\nlignes: effectifs cumulés');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const last = [...screen.container.querySelectorAll('tbody tr')].at(-1)!.querySelectorAll('td');

		expect(last[last.length - 1].textContent).toBe('sans objet');
		expect(last[last.length - 1].querySelector('.sr-only')).not.toBeNull();
	});

	it('vertical au-delà de 12 valeurs : les grandeurs en colonnes', async () => {
		const values = Array.from({ length: 13 }, (_, i) => i).join(' ; ');
		const node = parseStatChartContent('effectifs', `données: ${values}`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const table = screen.container.querySelector('table')!;

		expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual([
			'Valeur',
			'Effectif'
		]);
		expect(table.querySelectorAll('tbody tr')).toHaveLength(14);
	});
});

describe('StatChart — loi binomiale (manche 11)', () => {
	it('le tableau P(X = k) au millième, le nom de la loi, les probabilités', async () => {
		const node = parseStatChartContent('loi', 'X ~ B(10 ; 0,3)\nprobabilités: P(X ⩽ 4)');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const table = screen.container.querySelector('table')!;

		expect(table.querySelector('caption')?.textContent).toBe('Loi de X : B(10 ; 0,3)');
		expect(table.querySelectorAll('tr')[1].querySelectorAll('td')[0].textContent).toBe('0,028');
		expect(screen.container.querySelector('.stat-indicateurs li')?.textContent).toBe(
			'P(X ⩽ 4) ≈ 0,850'
		);
	});

	it('diagramme et intervalle : les bâtons hors de I en gris', async () => {
		const node = parseStatChartContent('loi', 'X ~ B(10 ; 0,3)\ndiagramme: oui\nintervalle: 0,95');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const bars = screen.container.querySelectorAll('rect.stat-barre');

		expect(bars).toHaveLength(11);
		expect(screen.container.querySelectorAll('rect.stat-rectangle-hors')).toHaveLength(4);
		// Le gris est bien PEINT, pas seulement une classe (revue)
		const grey = screen.container.querySelector<SVGRectElement>('rect.stat-rectangle-hors')!;
		const blue = screen.container.querySelector<SVGRectElement>(
			'rect.stat-barre:not(.stat-rectangle-hors)'
		)!;
		expect(getComputedStyle(grey).fill).not.toBe(getComputedStyle(blue).fill);
		expect([...screen.container.querySelectorAll('.stat-indicateurs li')][0].textContent).toBe(
			'I = [0 ; 6] : P(X ∈ I) ≈ 0,989 ⩾ 0,95'
		);
	});

	it('horizontal : une ligne des valeurs, une ligne des probabilités', async () => {
		const node = parseStatChartContent('loi', 'X ~ B(5 ; 0,5)');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const rows = screen.container.querySelectorAll('tbody tr');

		expect(rows).toHaveLength(2);
		expect([...rows[1].querySelectorAll('td')].map((td) => td.textContent)).toEqual([
			'0,031',
			'0,156',
			'0,313',
			'0,313',
			'0,156',
			'0,031'
		]);
	});

	it('trop large : vertical ; plus de 30 valeurs : pas de tableau', async () => {
		const vertical = parseStatChartContent('loi', 'X ~ B(20 ; 0,5)');
		const v = await render(StatChart, { target: mainElement(), props: { node: vertical } });
		expect(v.container.querySelectorAll('tbody tr')).toHaveLength(21);

		const large = parseStatChartContent('loi', 'X ~ B(100 ; 0,5)\nprobabilités: P(X ⩽ 50)');
		const l = await render(StatChart, { target: mainElement(), props: { node: large } });
		expect(l.container.querySelector('table')).toBeNull();
		expect(l.container.querySelector('.stat-titre')?.textContent).toBe('Loi de X : B(100 ; 0,5)');
		expect(l.container.querySelector('.stat-indicateurs li')?.textContent).toBe(
			'P(X ⩽ 50) ≈ 0,540'
		);
	});
});

describe('StatChart — lois de maths complémentaires (manche 13)', () => {
	it('loi géométrique : la colonne « … », les bâtons coupés et la mention sous le diagramme', async () => {
		const node = parseStatChartContent('loi', "X ~ G(0,2)\njusqu'à: 4\ndiagramme: oui");
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const table = screen.container.querySelector('table')!;

		expect(table.querySelector('caption')?.textContent).toBe('Loi de X : G(0,2)');
		expect(table.textContent).toContain('…');
		expect(screen.container.querySelectorAll('rect.stat-barre')).toHaveLength(4);
		const note = screen.container.querySelector<HTMLElement>('.stat-mention')!;
		expect(note.textContent).toBe('valeurs suivantes non représentées');
		// Pas un <p> : `main p { font-size … !important }` (app.css) annulerait sa petite taille
		expect(note.tagName).not.toBe('P');
		const paragraph = document.createElement('p');
		paragraph.textContent = 'x';
		screen.container.append(paragraph);
		expect(parseFloat(getComputedStyle(note).fontSize)).toBeLessThan(
			parseFloat(getComputedStyle(paragraph).fontSize)
		);
	});

	it('loi uniforme : le titre, l’espérance par défaut', async () => {
		const node = parseStatChartContent('loi', 'X ~ U(1 ; 6)');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });

		expect(screen.container.querySelector('caption')?.textContent).toBe(
			'Loi de X : loi uniforme sur {1, …, 6}'
		);
		expect(screen.container.querySelector('.stat-indicateurs li')?.textContent).toBe(
			'E(X) = 7/2 = 3,5'
		);
	});
});

describe('StatChart — lois à densité (manche 13, PR b)', () => {
	it('loi exponentielle : le nom, la courbe, l’aire hachurée, les lignes', async () => {
		const node = parseStatChartContent('loi', 'X ~ E(0,5)\ndiagramme: oui\nprobabilités: P(X ⩽ 2)');
		const screen = await render(StatChart, { target: mainElement(), props: { node } });

		expect(screen.container.querySelector('table')).toBeNull();
		expect(screen.container.querySelector('.stat-titre')?.textContent).toBe('Loi de X : E(0,5)');
		expect(screen.container.querySelector('polyline.stat-densite')).not.toBeNull();
		const area = screen.container.querySelector<SVGPolygonElement>('polygon.stat-aire')!;
		// Le navigateur normalise `url(#id)` en `url("#id")`
		expect(getComputedStyle(area).fill).toMatch(/url\("?#.*hachures"?\)/);
		// De vrais exposants (<sup>), et une lecture « e puissance … » pour le lecteur d'écran
		const line = [...screen.container.querySelectorAll('.stat-indicateurs li')].find((li) =>
			li.textContent?.includes('P(X ⩽ 2)')
		)!;
		expect([...line.querySelectorAll('sup')].map((sup) => sup.textContent)).toEqual([
			'−0,5 × 2',
			'−1'
		]);
		expect(line.textContent).not.toContain('^(');
		expect(line.querySelector('.sr-only')?.textContent).toBe(
			'P(X ⩽ 2) = 1 − e puissance (−0,5 × 2) = 1 − e puissance −1 ≈ 0,632'
		);
	});
});

describe('StatChart — simulation d’une loi à densité (manche 14, PR b)', () => {
	it('histogramme en densité et courbe superposée, dans la même figure, dessinée après', async () => {
		const node = parseStatChartContent('simulation', 'X ~ E(0,5)\ntirages: 1000\ngraine: 4');
		const scene = buildStatChartScene(node.spec!);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector('svg[role="img"]')!;
		const rects = [...svg.querySelectorAll('rect.stat-rectangle')];
		const curve = svg.querySelector<SVGPolylineElement>('polyline.stat-densite')!;
		const items = [...screen.container.querySelectorAll('.stat-indicateurs li')].map(
			(li) => li.textContent
		);

		expect(rects).toHaveLength(10);
		expect(curve).not.toBeNull();
		// Superposée : la courbe vient APRÈS le dernier rectangle, donc devant
		expect(
			rects[rects.length - 1].compareDocumentPosition(curve) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		// Tracée en couleur pleine, visible sur les rectangles
		expect(getComputedStyle(curve).stroke).not.toBe('none');
		expect(getComputedStyle(curve).strokeWidth).toBe('2px');
		// Même échelle verticale : haut de la courbe (λ = 0,5) et premier rectangle
		// dans le rapport de leurs valeurs
		const first = (rects[0] as SVGRectElement).getBBox();
		const baseline = first.y + first.height;
		const height = scene.kind === 'histogramme' ? scene.rects[0].height : NaN;
		expect((baseline - curve.getBBox().y) / first.height).toBeCloseTo(0.5 / height, 1);
		expect(svg.querySelector('text.stat-titre-axe')?.textContent).toBe('Densité');
		expect(items).toEqual(scene.indicators);
		expect(items[2]).toBe('graine 4');
	});
});

describe('StatChart — bloc simulation (v2, lot 3)', () => {
	const DIE = 'X = 1 ; 2 ; 3 ; 4 ; 5 ; 6\nP = 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6';

	it('mode moyenne : la courbe, la droite E(X), la graine sous la figure', async () => {
		const node = parseStatChartContent('simulation', `${DIE}\nmode: moyenne\ngraine: 42`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const items = [...screen.container.querySelectorAll('.stat-indicateurs li')].map(
			(li) => li.textContent
		);

		expect(screen.container.querySelector('svg[role="img"]')).not.toBeNull();
		expect(screen.container.querySelector('.stat-reference')).not.toBeNull();
		expect(items[0]).toMatch(/^moyenne des 100 tirages : .* ; espérance E\(X\) = 7\/2$/);
		expect(items[1]).toBe('graine 42');
	});

	it('mode échantillons : classes hors de μ ± 2σ/√n en gris, la phrase, la graine', async () => {
		const node = parseStatChartContent(
			'simulation',
			`${DIE}\nmode: échantillons\néchantillons: 200\ntaille: 50\ngraine: 42`
		);
		const scene = buildStatChartScene(node.spec!);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const rects = [...screen.container.querySelectorAll('rect.stat-rectangle')];
		const grey = rects.filter((r) => r.classList.contains('stat-rectangle-hors'));
		const items = [...screen.container.querySelectorAll('.stat-indicateurs li')].map(
			(li) => li.textContent
		);

		expect(scene.kind).toBe('histogramme');
		expect(grey.length).toBeGreaterThan(0);
		expect(rects.length).toBeGreaterThan(grey.length);
		expect(grey.length).toBe(
			scene.kind === 'histogramme' ? scene.rects.filter((r) => r.highlighted === false).length : -1
		);
		expect(items).toEqual(scene.indicators);
		expect(items[1]).toMatch(/échantillons sur 200 ont une moyenne dans/);
	});

	it('une ligne par valeur, effectifs qui font n, légende des tirages', async () => {
		const node = parseStatChartContent('simulation', `${DIE}\ntirages: 600\ngraine: 42`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const table = screen.container.querySelector('table')!;
		const columns = [...table.querySelectorAll('th[scope="col"]')].map((th) => th.textContent);
		const rows = [...table.querySelectorAll('tbody tr')];
		const counts = rows.map((tr) => Number(tr.querySelectorAll('td')[0].textContent));

		expect(table.querySelector('caption')?.textContent).toBe(
			'Simulation de 600 tirages (graine 42)'
		);
		expect(columns).toEqual(['xi', 'Effectif', 'Fréquence observée', 'Probabilité']);
		expect(rows.map((tr) => tr.querySelector('th[scope="row"]')?.textContent)).toEqual([
			'1',
			'2',
			'3',
			'4',
			'5',
			'6'
		]);
		expect(counts.reduce((a, b) => a + b, 0)).toBe(600);
		expect(rows[0].querySelectorAll('td')[2].textContent).toBe('1/6');
	});

	it('mêmes nombres que la scène, donc que le PDF', async () => {
		const node = parseStatChartContent('simulation', `${DIE}\ntirages: 600\ngraine: 42`);
		const scene = buildStatChartScene(node.spec!) as SimulationScene;
		const screen = await render(StatChart, { target: mainElement(), props: { node } });
		const cells = [...screen.container.querySelectorAll('tbody tr')].map((tr) =>
			[...tr.querySelectorAll('td')].map((td) => td.textContent)
		);

		expect(cells).toEqual(scene.rows.map((r) => [r.count, r.frequency, r.probability]));
	});

	it('le titre de l’auteur, puis la légende, dans <caption>', async () => {
		const node = parseStatChartContent('simulation', `${DIE}\ntitre: Cent lancers`);
		const screen = await render(StatChart, { target: mainElement(), props: { node } });

		expect(screen.container.querySelector('figcaption')).toBeNull();
		expect(screen.container.querySelector('caption')?.textContent).toBe(
			'Cent lancersSimulation de 100 tirages (graine 1)'
		);
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
