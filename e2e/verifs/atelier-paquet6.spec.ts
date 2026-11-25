import { expect, test, type Locator, type Page } from '@playwright/test';
import { calc, isNarrow, normalizeLatex, openAtelier, steps } from './helpers/atelier';
import { openView, setConsole } from './helpers/grille';

/**
 * Lignes Atelier du paquet 6 du tri (6 – 11 novembre)
 * ====================================================
 *
 * #2501, #2545, #2553, #2555, #2540 de `docs/wip/verifications-manuelles.md`.
 */

// ============================================================================
// TYPES
// ============================================================================

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Contre la prod (`VERIFS_URL`), les modules ont d'autres adresses : pas de retard posé */
const LOCAL = process.env.VERIFS_URL === undefined;

/** Les fenêtres d'ordinateur de la ligne #2555 */
const DESKTOP_WINDOWS = [
	{ width: 1280, height: 800 },
	{ width: 1366, height: 768 }
] as const;

const TEN_FUNCTIONS = [
	'f(x)=x^2-3x+1',
	'g(x)=sin(2x)+x^2/2',
	'h(x)=x^3-2x',
	'k(x)=cos(x)',
	'm(x)=2x-1',
	'n(x)=-x^2+4',
	'p(x)=x/2+1',
	'q(x)=sin(x)',
	'r(x)=x^2/4-2',
	's(x)=-x+3'
];

// ============================================================================
// FUNCTIONS
// ============================================================================

async function box(locator: Locator): Promise<Box> {
	const bounds = await locator.boundingBox();
	if (bounds === null) throw new Error('Élément sans boîte : il n’est pas affiché');
	return bounds;
}

function expectSameBox(actual: Box, expected: Box, what: string): void {
	for (const side of ['x', 'y', 'width', 'height'] as const) {
		expect(Math.abs(actual[side] - expected[side]), `${what} : ${side}`).toBeLessThanOrEqual(1);
	}
}

/** Les marqueurs du graphe : points remarquables, intersections, étiquettes épinglées */
function graphMarkers(page: Page): Promise<{ special: number; crossing: number; pinned: number }> {
	return page.evaluate(() => ({
		special: document.querySelectorAll('.special-points path, .special-points circle').length,
		crossing: document.querySelectorAll('.intersection-marker').length,
		pinned: document.querySelectorAll('.pinned-marker').length
	}));
}

// ============================================================================
// TESTS
// ============================================================================

test('#2501 — .résoudre lit comme le registre : degrés gardés, paramètre, virgule', async ({
	page
}) => {
	await openAtelier(page);

	// Angle quelconque : la réponse et les étapes restent en degrés (petit rond)
	const degrees = await calc(page, '.résoudre cos(20°)x=1');
	expect(normalizeLatex(degrees.latex ?? '')).toBe(
		normalizeLatex('S = \\left\\{ \\dfrac{1}{\\cos\\left( 20{}^{\\circ} \\right)} \\right\\}')
	);
	expect(degrees.latex).not.toMatch(/\\unit|rad/);
	const degreesSteps = await steps(degrees);
	expect(degreesSteps).toContain('\\cos\\left( 20{}^{\\circ}\\right)');
	expect(degreesSteps).not.toMatch(/\\unit|rad/);

	// Famille périodique : 20° écrit en degrés, sans `rad`
	const family = await calc(page, '.résoudre cos(x) = cos(20°)');
	// E54 (David, 2026-11-24) : la famille en degrés, période comprise, sans arccos
	expect(normalizeLatex(family.latex ?? '')).toBe(
		normalizeLatex(
			'S = \\left\\{ -20{}^{\\circ} + k \\cdot 360{}^{\\circ} \\,;\\, 20{}^{\\circ} + k \\cdot 360{}^{\\circ} ,\\; k \\in \\mathbb{Z} \\right\\}'
		)
	);
	expect(family.latex).toContain('k \\in \\mathbb{Z}');
	expect(family.latex + family.text).not.toMatch(/\\unit|rad/);

	// Paramètre libre : refus qui le nomme ; posé, il est remplacé
	const free = await calc(page, '.résoudre a x = 4');
	expect(free.text).toContain('Le résultat dépend de a');
	await calc(page, 'a = 2');
	const set = await calc(page, '.résoudre a x = 4');
	expect(normalizeLatex(set.latex ?? '')).toBe(normalizeLatex('S = \\left\\{ 2 \\right\\}'));

	// Virgule décimale lue, réponse décimale
	const decimal = await calc(page, '.résoudre x+0,5=2');
	expect(normalizeLatex(decimal.latex ?? '')).toBe(
		normalizeLatex('S = \\left\\{ 1{,}5 \\right\\}')
	);
});

test('#2545 — chargement allégé : polices de maths, étapes à la demande, stats, loi, figure', async ({
	page
}) => {
	// Le module des étapes n'arrive qu'à la demande : retardé, son attente se voit
	let stepsRequests = 0;
	if (LOCAL) {
		await page.route(/GeneratedStepsCorrection/, async (route) => {
			stepsRequests++;
			await new Promise((resolve) => setTimeout(resolve, 1200));
			await route.continue();
		});
	}
	await openAtelier(page);

	// Formule composée avec les polices de maths chargées (pas la police de secours)
	const derived = await calc(page, '.dériver x^2');
	const glyph = derived.line.locator('.reponse .math .ML__mathit').first();
	await expect(glyph).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
	const family = await glyph.evaluate((element) => getComputedStyle(element).fontFamily);
	expect(family).toContain('KaTeX_Math');
	expect(
		await page.evaluate(() =>
			[...document.fonts]
				.filter((font) => font.status === 'loaded')
				.map((font) => font.family.replace(/"/g, ''))
		)
	).toEqual(expect.arrayContaining(['KaTeX_Main', 'KaTeX_Math']));

	// « Comment ? » : bref « Chargement des étapes… » la première fois, puis les étapes
	await derived.line.getByRole('button', { name: 'Comment ?' }).click();
	if (LOCAL) {
		await expect(derived.line.getByText('Chargement des étapes…')).toBeVisible();
	}
	await expect(derived.line.locator('.etapes')).toContainText('Étape 1');
	await expect(derived.line.getByText('Chargement des étapes…')).toHaveCount(0);

	// Une deuxième ligne se déplie aussitôt : le module est là, plus d'attente affichée
	const second = await calc(page, '.dériver x^3');
	const seen = stepsRequests;
	await second.line.getByRole('button', { name: 'Comment ?' }).click();
	await expect(second.line.locator('.etapes')).toContainText('Étape 1', { timeout: 1000 });
	expect(stepsRequests).toBe(seen);

	// Un graphique de stats et une loi s'affichent, dessinés
	const stats = await calc(page, '.stats 12 ; 15 ; 9');
	expect(stats.refused).toBe(false);
	await expect(stats.line.locator('.reponse')).toContainText('Moyenne = 12');
	await expect(stats.line.locator('.reponse')).toContainText('Écart type ≈ 2,45');
	const law = await calc(page, '.binomiale X 10 0,3');
	expect(law.refused).toBe(false);
	await expect(law.line.locator('.reponse')).toContainText('X suit B(10 ; 0,3)');
	// La loi dessinée sous la ligne : son tableau et son diagramme
	const lawFigure = law.line.locator('figure.stat-figure').first();
	await expect(lawFigure.locator('table.stat-tableau').first()).toBeVisible();
	// Le diagramme en bâtons : des traits dessinés (11 valeurs de 0 à 10)
	const drawn = await lawFigure.evaluate(
		(figure) => figure.querySelectorAll('svg rect, svg line, svg path').length
	);
	expect(drawn).toBeGreaterThanOrEqual(11);

	// Une figure de géométrie : les deux points et leurs noms
	await calc(page, 'A = (1 ; 2)');
	await calc(page, 'B = (4 ; 3)');
	await openView(page, 'Géométrie');
	await setConsole(page, false);
	const figure = page.locator('.vue svg', { hasText: 'A' }).last();
	await expect(figure).toBeVisible();
	await expect(figure.getByText('B', { exact: true })).toBeVisible();
});

test('#2553 — silhouette de l’atelier pendant le chargement, rien ne saute à l’arrivée', async ({
	page
}) => {
	// Réseau lent : chaque script attend, la page du serveur s'affiche seule d'abord
	let release: () => void = () => undefined;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route(
		(url) =>
			/\.(js|ts|svelte)(\?|$)/.test(url.pathname + url.search) || url.pathname.includes('/@'),
		async (route) => {
			await held;
			await route.continue();
		}
	);
	await page.goto('/atelier', { waitUntil: 'commit' });

	const outline = page.locator('.silhouette');
	await expect(outline.getByRole('status')).toHaveText('Chargement de l’atelier…');
	await expect(outline.getByText('Mes objets', { exact: true })).toBeVisible();
	for (const tab of ['Graphe', 'Géométrie', 'Données']) {
		await expect(outline.locator('.onglets').getByText(tab, { exact: true })).toBeVisible();
	}
	// Barre d'outils en blocs gris : 5 + 3, aucun bouton
	await expect(outline.locator('.barre .bloc.outil')).toHaveCount(8);
	// Rien n'est cliquable : ni bouton ni lien, et les parties visibles sont inertes
	await expect(outline.locator('button, a, input')).toHaveCount(0);
	for (const part of ['.panneau', '.barre', '.onglets']) {
		expect(
			await outline.locator(part).evaluate((element) => (element as HTMLElement).inert),
			`${part} inerte`
		).toBe(true);
	}

	// La feuille de style appliquée (elle bloque le premier affichage : l'élève ne voit jamais la page sans elle)
	await expect(outline).toHaveCSS('display', 'grid');
	const narrow = isNarrow(page);
	const before = {
		bar: await box(outline.locator('.barre')),
		tabs: await box(outline.locator('.onglets')),
		panel: await box(outline.locator('.panneau'))
	};

	// L'atelier arrive : barre et onglets à la même place
	release();
	const workshop = page.locator('.atelier');
	await expect(workshop.getByRole('toolbar', { name: 'Outils de l’atelier' })).toBeVisible({
		timeout: 30_000
	});
	await expect(outline).toHaveCount(0);
	expectSameBox(await box(workshop.locator('.barre')), before.bar, 'barre d’outils');
	expectSameBox(await box(workshop.locator('nav.onglets')), before.tabs, 'onglets');
	if (!narrow) expectSameBox(await box(workshop.locator('.panneau')), before.panel, 'Mes objets');
});

for (const size of DESKTOP_WINDOWS) {
	test(
		`#2555 — atelier sur bureau ${size.width}×${size.height} : tout tient, boutons du bas entiers`,
		{ tag: '@bureau' },
		async ({ page }) => {
			await page.setViewportSize(size);
			await openAtelier(page);
			for (const view of ['Graphe', 'Géométrie', 'Données'] as const) {
				await openView(page, view);
				// Sans défiler : la page n'est pas plus haute ni plus large que la fenêtre
				const overflow = await page.evaluate(() => ({
					height: document.documentElement.scrollHeight - window.innerHeight,
					width: document.documentElement.scrollWidth - window.innerWidth
				}));
				expect(overflow.height, `${view} : hauteur`).toBeLessThanOrEqual(0);
				expect(overflow.width, `${view} : largeur`).toBeLessThanOrEqual(0);
				// Les boutons du bas de « Mes objets », sur deux rangées, entiers dans la fenêtre
				const buttons = page.locator('.panneau footer.creer button');
				const boxes = await buttons.evaluateAll((elements) =>
					elements.map((element) => {
						const rect = element.getBoundingClientRect();
						return {
							label: element.textContent?.trim() ?? '',
							top: rect.top,
							bottom: rect.bottom,
							left: rect.left,
							right: rect.right
						};
					})
				);
				const labels = boxes.map((button) => button.label);
				expect(labels, view).toEqual(expect.arrayContaining(['+ Fonction', '+ Point', '+ Courbe']));
				expect(
					new Set(boxes.map((button) => Math.round(button.top))).size,
					`${view} : rangées`
				).toBe(2);
				for (const button of boxes) {
					expect(button.bottom, `${view} : ${button.label}`).toBeLessThanOrEqual(size.height);
					expect(button.top, `${view} : ${button.label}`).toBeGreaterThanOrEqual(0);
					expect(button.left, `${view} : ${button.label}`).toBeGreaterThanOrEqual(0);
				}
				// Rien ne les couvre : le point du milieu de chaque bouton est bien le bouton
				const covered = await buttons.evaluateAll((elements) =>
					elements
						.filter((element) => {
							const rect = element.getBoundingClientRect();
							const top = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 2);
							return top === null || !element.contains(top);
						})
						.map((element) => element.textContent?.trim() ?? '')
				);
				expect(covered, `${view} : boutons couverts`).toEqual([]);
			}
		}
	);
}

test(
	'#2540 — molette du graphe à 10 fonctions : marqueurs cachés pendant le geste, revenus après',
	{ tag: '@bureau' },
	async ({ page }) => {
		test.slow();
		await openAtelier(page);
		for (const definition of TEN_FUNCTIONS) await calc(page, definition);
		await openView(page, 'Graphe');
		await setConsole(page, false);
		await expect.poll(async () => (await graphMarkers(page)).special).toBeGreaterThan(0);
		await expect.poll(async () => (await graphMarkers(page)).crossing).toBeGreaterThan(0);

		// Une étiquette épinglée : clic sur un point remarquable
		const marker = await box(page.locator('.special-points path').first());
		await page.mouse.click(marker.x + marker.width / 2, marker.y + marker.height / 2);
		await expect.poll(async () => (await graphMarkers(page)).pinned).toBe(1);
		const rest = await graphMarkers(page);

		const graph = await box(page.locator('.vue svg').first());
		const center = { x: graph.x + graph.width / 2, y: graph.y + graph.height / 2 };
		await page.mouse.move(center.x, center.y);
		const ticks = page.locator('.x-axis-ticks .axis-label');
		const ticksBefore = (await ticks.allTextContents()).join('|');

		// Molette : pendant le geste (crans rapprochés), plus aucun marqueur
		const during: { special: number; crossing: number; pinned: number }[] = [];
		const started = Date.now();
		for (let notch = 0; notch < 12; notch++) {
			await page.mouse.wheel(0, 60);
			during.push(await graphMarkers(page));
		}
		const elapsed = Date.now() - started;
		for (const seen of during.slice(1)) {
			expect(seen).toEqual({ special: 0, crossing: 0, pinned: 0 });
		}
		// Le zoom a suivi : les graduations ont changé
		await expect.poll(async () => (await ticks.allTextContents()).join('|')).not.toBe(ticksBefore);
		// Sans à-coups : 12 crans et leurs lectures en moins de 6 s (plafond large sous charge ; 150 ms par cran avant #2540, à dix courbes)
		expect(elapsed).toBeLessThan(6000);

		// À l'arrêt, tout revient en une fraction de seconde
		await expect
			.poll(async () => (await graphMarkers(page)).special, { timeout: 2000 })
			.toBeGreaterThan(0);
		await expect.poll(async () => (await graphMarkers(page)).pinned, { timeout: 2000 }).toBe(1);
		await expect
			.poll(async () => (await graphMarkers(page)).crossing, { timeout: 2000 })
			.toBeGreaterThan(0);
		expect(rest.pinned).toBe(1);

		// Glisser puis molette mêlés : tout revient au lâcher
		await page.mouse.move(center.x + 30, center.y + 40);
		await page.mouse.down();
		await page.mouse.move(center.x + 80, center.y + 60, { steps: 4 });
		await page.mouse.wheel(0, -60);
		await page.mouse.move(center.x + 120, center.y + 70, { steps: 4 });
		expect((await graphMarkers(page)).special).toBe(0);
		// La molette s'est tue depuis plus de 150 ms, le glisser tient encore : toujours rien
		await page.waitForTimeout(400);
		expect((await graphMarkers(page)).special).toBe(0);
		await page.mouse.up();
		await expect
			.poll(async () => (await graphMarkers(page)).special, { timeout: 2000 })
			.toBeGreaterThan(0);
	}
);
