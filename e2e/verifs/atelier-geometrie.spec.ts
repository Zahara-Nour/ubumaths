import { expect, test, type Page } from '@playwright/test';
import { calc, card, cardLocator, normalizeLatex, openAtelier } from './helpers/atelier';
import { openView, setConsole } from './helpers/grille';

/**
 * La vue Géométrie de l'Atelier à la souris — lignes de `docs/wip/verifications-manuelles.md`
 * ==========================================================================================
 *
 * Un outil ÉCRIT la ligne qu'on aurait tapée : on clique sur la toile en
 * coordonnées du repère et on lit les lignes de l'historique de la console
 * (lues dans le DOM, console fermée : ouverte, elle couvre la toile). Un test
 * par ligne, son numéro de PR dans le titre. L'attendu est celui de la ligne :
 * un test rouge est un bug ou une ligne périmée, à signaler à David — jamais
 * un attendu à changer pour passer.
 */

/** Unités sur le plus petit côté de la toile, à l'ouverture (`UNITS_ACROSS` de `FigureView`) */
const UNITS_ACROSS = 13;

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

/** Ouvre la Géométrie, console fermée */
async function openFigure(page: Page): Promise<void> {
	await openView(page, 'Géométrie');
	await setConsole(page, false);
}

/** Les définitions préparées dans la console, puis la Géométrie ouverte */
async function prepare(page: Page, lines: string[]): Promise<void> {
	// Une ligne refusée fausserait la suite sans bruit (`e : y = …` : e est la constante d'Euler)
	for (const line of lines) expect((await calc(page, line)).refused, line).toBe(false);
	await openFigure(page);
}

/** Le point de l'écran du point (x ; y) du repère : origine au centre, repère orthonormé */
async function screenOf(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
	const box = await page.locator('.figure .toile').boundingBox();
	if (box === null) throw new Error('toile introuvable');
	const [width, height] = [Math.floor(box.width), Math.floor(box.height)];
	const pixelsPerUnit = Math.min(width, height) / UNITS_ACROSS;
	return { x: box.x + width / 2 + x * pixelsPerUnit, y: box.y + height / 2 - y * pixelsPerUnit };
}

async function clickAt(page: Page, x: number, y: number): Promise<void> {
	const at = await screenOf(page, x, y);
	await page.mouse.click(at.x, at.y);
}

async function hoverAt(page: Page, x: number, y: number): Promise<void> {
	const at = await screenOf(page, x, y);
	await page.mouse.move(at.x, at.y);
}

async function chooseTool(page: Page, label: string): Promise<void> {
	await page
		.getByRole('toolbar', { name: 'Outils de géométrie' })
		.getByRole('button', { name: label, exact: true })
		.click();
}

/** Les lignes écrites dans la console (l'entrée de chaque ligne de l'historique) */
async function written(page: Page): Promise<string[]> {
	const lines = await page.locator('ol.historique > li').allTextContents();
	return lines.map((line) =>
		line
			.replace(/\s+/g, ' ')
			.replace(/^\s*>\s*/, '')
			.replace(/\s*-->.*$/, '')
			.trim()
	);
}

/** Attend une ligne de plus dans l'historique et la rend */
async function nextWritten(page: Page, before: number): Promise<string> {
	await expect(page.locator('ol.historique > li')).toHaveCount(before + 1);
	return (await written(page))[before];
}

/** La consigne (ou le refus) sous la barre */
function instruction(page: Page) {
	return page.locator('.figure p.refus');
}

/** Le fantôme de la construction en cours */
function ghost(page: Page) {
	return page.locator('.figure .fantome');
}

test('#1536 — Point, Segment, Droite, Demi-droite, Cercle à la souris ; Échap ; point réutilisé', async ({
	page
}) => {
	await openFigure(page);

	await chooseTool(page, 'Point');
	await expect(instruction(page)).toHaveText('Clique où placer le point.');
	await clickAt(page, 1, 2);
	expect(await nextWritten(page, 0)).toBe('A = (1 ; 2)');

	// Segment : consigne, fantôme du premier point au pointeur, un clic près de A le réutilise
	await chooseTool(page, 'Segment');
	await expect(instruction(page)).toHaveText('Clique sur un premier point.');
	await clickAt(page, -2, -1);
	expect(await nextWritten(page, 1)).toBe('B = (-2 ; -1)');
	await expect(instruction(page)).toHaveText('Clique sur un deuxième point.');
	await hoverAt(page, 0, 0);
	await expect(ghost(page)).toHaveCount(1);
	await clickAt(page, 1.05, 2.05);
	expect(await nextWritten(page, 2)).toBe('d = [BA]');
	await expect(instruction(page)).toHaveText('Clique sur un premier point.');

	// Échap abandonne la construction commencée : plus de fantôme, rien d'écrit
	await clickAt(page, 1, 2);
	await hoverAt(page, 0, 0);
	await expect(ghost(page)).toHaveCount(1);
	await page.keyboard.press('Escape');
	await expect(ghost(page)).toHaveCount(0);
	await expect(instruction(page)).toHaveText('Clique sur un premier point.');
	expect(await written(page)).toHaveLength(3);

	await chooseTool(page, 'Droite');
	await clickAt(page, 1, 2);
	await clickAt(page, -2, -1);
	expect(await nextWritten(page, 3)).toBe('d_1 = (AB)');

	await chooseTool(page, 'Demi-droite');
	await expect(instruction(page)).toHaveText('Clique sur l’origine de la demi-droite.');
	await clickAt(page, -2, -1);
	await clickAt(page, 1, 2);
	expect(await nextWritten(page, 4)).toBe('d_2 = [BA)');

	await chooseTool(page, 'Cercle');
	await expect(instruction(page)).toHaveText('Clique sur le centre du cercle.');
	await clickAt(page, 1, 2);
	await expect(instruction(page)).toHaveText('Clique sur un point du cercle.');
	await clickAt(page, -2, -1);
	expect(await nextWritten(page, 5)).toBe('c = cercle(A ; passant=B)');
	// Aucun point de plus : A et B réutilisés à chaque clic
	expect((await written(page)).filter((line) => /^[A-Z] = \(/.test(line))).toHaveLength(2);
});

test('#1536 — les flèches déplacent le dernier point posé (0,1 ; Maj : 1)', async ({ page }) => {
	await openFigure(page);
	await chooseTool(page, 'Point');
	await clickAt(page, 1, 2);
	await nextWritten(page, 0);
	const canvas = page.locator('.figure .toile');
	await expect(canvas).toHaveAttribute('aria-label', 'Figure : les flèches déplacent A');
	await canvas.focus();
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('Shift+ArrowUp');
	await expect
		.poll(async () => normalizeLatex((await card(page, 'A')).latex ?? ''))
		.toMatch(/^\(1\{,\}1;3\)$/);
});

test('#1538 — Milieu : deux points, ou un clic sur un segment', async ({ page }) => {
	await prepare(page, ['A = (0 ; 0)', 'B = (4 ; 0)', 'C = (0 ; 4)', 's = [AC]']);
	const before = (await written(page)).length;

	await chooseTool(page, 'Milieu');
	await expect(instruction(page)).toHaveText('Clique sur un premier point, ou sur un segment.');
	await clickAt(page, 0, 0);
	await hoverAt(page, 2, 1);
	await expect(ghost(page)).toHaveCount(1);
	await clickAt(page, 4, 0);
	expect(await nextWritten(page, before)).toBe('D = milieu(A ; B)');

	await clickAt(page, 0, 3);
	expect(await nextWritten(page, before + 1)).toBe('E = milieu(s)');
});

test('#1538 — Intersection : au croisement, ou deux objets ; Point sur un objet', async ({
	page
}) => {
	await prepare(page, ['A = (-3 ; -3)', 'B = (3 ; 3)', 'd = (AB)', 'k : y = -x + 2']);
	const before = (await written(page)).length;

	await chooseTool(page, 'Intersection');
	await expect(instruction(page)).toHaveText(
		'Clique sur un premier objet, ou là où deux objets se coupent.'
	);
	// d : y = x et k : y = −x + 2 se coupent en (1 ; 1)
	await clickAt(page, 1, 1);
	expect(await nextWritten(page, before)).toMatch(/^C = intersection\((d ; k|k ; d)\)$/);

	// Un objet, puis l'autre
	await clickAt(page, -2, -2);
	await expect(instruction(page)).toHaveText('Clique sur un deuxième objet.');
	await clickAt(page, 3, -1);
	expect(await nextWritten(page, before + 1)).toMatch(/^D = intersection\((d ; k|k ; d)\)$/);

	// Point sur un objet : un clic sur d ; dans le vide, la consigne
	await chooseTool(page, 'Point sur un objet');
	await clickAt(page, 5, -5);
	await expect(instruction(page)).toHaveText(
		'Clique sur une droite, un segment, un cercle ou une courbe.'
	);
	await clickAt(page, 2, 2);
	expect(await nextWritten(page, before + 2)).toMatch(/^E = point_sur\(d ; /);
});

test('#1538 — Parallèle, Perpendiculaire (fantôme) ; Point ou Segment sur un objet, au croisement', async ({
	page
}) => {
	await prepare(page, ['A = (-3 ; -3)', 'B = (3 ; 3)', 'd = (AB)', 'k : y = -x + 2']);
	const before = (await written(page)).length;

	await chooseTool(page, 'Parallèle');
	await clickAt(page, -2, -2);
	await expect(instruction(page)).toHaveText('Clique sur le point par lequel passe la parallèle.');
	// Dans le vide (ni sur d ni sur k) : le point est créé, puis la parallèle
	await hoverAt(page, -2, 1);
	await expect(ghost(page)).toHaveCount(1);
	await clickAt(page, -2, 1);
	await expect(page.locator('ol.historique > li')).toHaveCount(before + 2);
	expect((await written(page)).slice(before)).toEqual(['C = (-2 ; 1)', 'd_1 = parallele(C ; d)']);
	const afterParallel = (await written(page)).length;

	await chooseTool(page, 'Perpendiculaire');
	await clickAt(page, 2, 2);
	await expect(instruction(page)).toHaveText(
		'Clique sur le point par lequel passe la perpendiculaire.'
	);
	await hoverAt(page, -3, -3);
	await expect(ghost(page)).toHaveCount(1);
	await clickAt(page, -3, -3);
	expect(await nextWritten(page, afterParallel)).toBe('d_2 = perpendiculaire(A ; d)');

	// L'objet visé en évidence au survol
	await chooseTool(page, 'Point');
	// Dans le vide d'abord : rien en évidence, puis k survolée
	await hoverAt(page, -5, 4);
	await expect(page.locator('.figure .hovered')).toHaveCount(0);
	await hoverAt(page, 4, -2);
	await expect(page.locator('.figure .hovered')).not.toHaveCount(0);

	// Point : un clic sur k pose un point_sur, au croisement de d et k leur intersection
	const beforePoint = (await written(page)).length;
	await clickAt(page, 4, -2);
	expect(await nextWritten(page, beforePoint)).toMatch(/^D = point_sur\(k ; /);
	await clickAt(page, 1, 1);
	expect(await nextWritten(page, beforePoint + 1)).toMatch(/^E = intersection\((d ; k|k ; d)/);

	// Segment : ses extrémités aussi, sur un objet
	await chooseTool(page, 'Segment');
	await clickAt(page, 5, -3);
	await clickAt(page, 0, 0);
	await expect(page.locator('ol.historique > li')).toHaveCount(beforePoint + 5);
	const segment = (await written(page)).slice(beforePoint + 2);
	expect(segment[0]).toMatch(/^F = point_sur\(k ; /);
	expect(segment[1]).toMatch(/^G = point_sur\(d ; /);
	expect(segment[2]).toMatch(/^d_3 = \[FG\]$/);
});

/** La couleur de remplissage des noms (points, droites, cercles) dessinés dans la Géométrie */
async function nameColors(page: Page): Promise<string[]> {
	return page
		.locator('svg.geometry-canvas text.label, svg.geometry-canvas text.geo-text')
		.evaluateAll((labels) => labels.map((label) => getComputedStyle(label).fill));
}

/** La luminance (0 noir, 255 blanc) d'une couleur `rgb(r, g, b)` */
function lightness(color: string): number {
	const [r, g, b] = (color.match(/\d+/g) ?? []).map(Number);
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

test('#1627 — petit point de couleur, cartes sans nature, console en bas, noms en noir', async ({
	page
}) => {
	await prepare(page, ['A = (1 ; 2)', 'B = (3 ; 0)', 's = [AB]', 'c = cercle(A, 2)']);
	// Le point de couleur d'une carte : un petit point (10 px) dans sa cible, pas un disque plein
	const dot = page.locator('article.objet button.point').first();
	const style = await dot.evaluate((button) => {
		const after = getComputedStyle(button, '::after');
		return { fill: getComputedStyle(button).backgroundColor, width: after.width };
	});
	expect(style).toEqual({ fill: 'rgba(0, 0, 0, 0)', width: '10px' });
	// Plus de « POINT », « SEGMENT » ni de longueur sous les cartes
	const texts = (await page.locator('article.objet').allTextContents()).join(' ');
	expect(texts).not.toMatch(/POINT|SEGMENT|point|segment|longueur/);

	// Géométrie : les noms en noir, les objets gardent leur couleur
	const colors = await nameColors(page);
	expect(colors.length).toBeGreaterThanOrEqual(4);
	for (const color of colors) expect(lightness(color)).toBeLessThan(60);
	const segment = page.locator('svg.geometry-canvas line.segment');
	const segmentColor = await segment.evaluate((line) => getComputedStyle(line).stroke);
	expect(lightness(segmentColor)).toBeGreaterThan(60);
	// Thème sombre : les noms clairs
	await page.emulateMedia({ colorScheme: 'dark' });
	await expect
		.poll(async () => Math.min(...(await nameColors(page)).map(lightness)))
		.toBeGreaterThan(180);
	await page.emulateMedia({ colorScheme: 'light' });

	// La console descend en bas à chaque nouvelle ligne
	for (let line = 1; line <= 25; line++) await calc(page, `${line}+1`);
	const history = page.locator('ol.historique');
	const atBottom = () =>
		history.evaluate((list) => {
			let box: HTMLElement | null = list;
			while (box !== null && box.scrollHeight <= box.clientHeight) box = box.parentElement;
			// Une console qui ne défile pas ne prouverait rien : il faut un conteneur qui déborde
			return box !== null && box.scrollHeight - box.scrollTop - box.clientHeight < 4;
		});
	await expect.poll(atBottom).toBe(true);
});

test('#1546 — téléphone (390 px) : « Mes objets » replié, la place rendue, le compte suit', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	// Atelier vide : panneau déplié, sans flèche
	const panel = page.getByRole('complementary').filter({ hasText: 'Mes objets' });
	const toggle = panel.getByRole('button', { name: 'Mes objets', exact: true });
	await expect(panel.getByRole('button', { name: '+ Fonction' })).toBeVisible();
	await expect(toggle).toHaveCount(0);

	// Avec deux points, au rechargement : une barre « Mes objets · 2 objets » et une flèche
	await calc(page, 'A = (1 ; 2)');
	await calc(page, 'B = (3 ; 0)');
	await page.reload();
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await expect(panel).toContainText('2 objets');
	await expect(cardLocator(page, 'A')).toBeHidden();
	// Le Graphe prend la place libérée ; la flèche déplie / replie
	const graph = page.locator('main.grapheur-main');
	const folded = (await graph.boundingBox())?.height ?? 0;
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	await expect(cardLocator(page, 'A')).toBeVisible();
	expect((await graph.boundingBox())?.height ?? 0).toBeLessThan(folded);
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');

	// La toile de Géométrie ; un point posé à la barre d'outils : 3 objets, toujours replié
	await openFigure(page);
	await chooseTool(page, 'Point');
	await clickAt(page, -3, -3);
	await expect(panel).toContainText('3 objets');
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');

	// /grapheur sur un atelier vide : la carte f est visible et prête à taper
	await page.getByRole('button', { name: 'Repartir de zéro', exact: true }).click();
	await page.getByRole('button', { name: 'Vider l’atelier', exact: true }).click();
	await page.goto('/grapheur');
	const f = cardLocator(page, 'f');
	await expect(f).toBeVisible();
	await expect(f.locator('math-field')).toBeVisible();
});

test('#1546 — ordinateur : rien ne change, « Mes objets » déplié sans flèche', async ({ page }) => {
	await calc(page, 'A = (1 ; 2)');
	await calc(page, 'B = (3 ; 0)');
	await page.reload();
	const panel = page.getByRole('complementary').filter({ hasText: 'Mes objets' });
	await expect(cardLocator(page, 'A')).toBeVisible();
	await expect(panel.getByRole('button', { name: 'Mes objets', exact: true })).toHaveCount(0);
});
