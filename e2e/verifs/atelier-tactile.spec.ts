import { mkdir } from 'node:fs/promises';
import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import {
	calc,
	cardLocator,
	chooseSetting,
	mathConsole,
	openAtelier,
	steps,
	waitVirtualKeyboard
} from './helpers/atelier';
import { cellLocator, openView, setConsole, shownIn, typeColumn } from './helpers/grille';

/**
 * L'Atelier au doigt (tri des vérifications manuelles, paquet du 13 au 16 octobre)
 * ================================================================================
 *
 * Reprend la part « au doigt, sur téléphone ou tablette » des lignes #1292, #1388,
 * #1410, #1417, #1427, #1434 de `docs/wip/verifications-manuelles.md` : le reste de
 * ces lignes est déjà joué par `atelier-console`, `atelier-calcul`, `atelier-donnees`.
 *
 * Téléphones seulement (iPhone, Android : `hasTouch`) ; les gestes sont des `tap`.
 * Taille d'une cible : au moins 24 × 24 px (WCAG 2.2, 2.5.8, niveau AA).
 *
 * Captures à l'œil de la session : `.captures/verifs/tactile/`.
 */

// ============================================================================
// CONSTANTES
// ============================================================================

const MIN_TARGET = 24;
const SHOTS_DIR = '.captures/verifs/tactile';

// ============================================================================
// FUNCTIONS
// ============================================================================

test.beforeEach(async ({ page, hasTouch }) => {
	test.skip(!hasTouch, 'Gestes au doigt : téléphones seulement');
	await openAtelier(page);
});

/** La cible se touche : au moins 24 × 24 px à l'écran */
async function expectTouchTarget(target: Locator, label: string): Promise<void> {
	await expect(target, label).toBeVisible();
	const box = await target.boundingBox();
	expect(box, label).not.toBeNull();
	expect(box?.width ?? 0, `${label} : largeur`).toBeGreaterThanOrEqual(MIN_TARGET);
	expect(box?.height ?? 0, `${label} : hauteur`).toBeGreaterThanOrEqual(MIN_TARGET);
}

/** Capture de la page, au nom du projet (iphone, android) */
async function shoot(page: Page, name: string, projectName: string): Promise<void> {
	await mkdir(SHOTS_DIR, { recursive: true });
	await page.screenshot({ path: `${SHOTS_DIR}/${name}-${projectName}.png` });
}

// ============================================================================
// TESTS
// ============================================================================

test('#1292 — « Résumé / Détaillé » se touche du doigt', async ({ page }, testInfo) => {
	const inequation = await calc(page, '.résoudre 3x-4\\leq 2x+1');
	await steps(inequation);
	for (const choice of ['Résumé', 'Détaillé'] as const) {
		const button = inequation.line.getByRole('button', { name: choice });
		await expectTouchTarget(button, choice);
		// Pas encore choisi : le geste fait le changement
		await expect(button).toHaveAttribute('aria-pressed', 'false');
		await button.tap();
		await expect(button).toHaveAttribute('aria-pressed', 'true');
	}
	await inequation.line.scrollIntoViewIfNeeded();
	await shoot(page, '1292-resume-detaille', testInfo.project.name);
});

test('#1417 — la flèche ▾ de « Copier » se touche du doigt', async ({ page }) => {
	const developed = await calc(page, '.développer (2x-1)(x+3)');
	const arrow = developed.line.getByRole('button', { name: 'Autres façons de copier' });
	await expectTouchTarget(arrow, 'flèche ▾');
	await expectTouchTarget(
		developed.line.getByRole('button', { name: 'Copier', exact: true }),
		'Copier'
	);
	await arrow.tap();
	await expect(page.getByRole('menuitem', { name: 'Copier en LaTeX' })).toBeVisible();
});

test('#1427 — « Tabuler » : le bouton de la fenêtre suffit, sans Entrée', async ({ page }) => {
	await calc(page, 'f(x) = x^2-3x');
	await openView(page, 'Graphe');
	await cardLocator(page, 'f').getByRole('button', { name: 'Options de f' }).tap();
	await page.getByRole('menuitem', { name: 'Tabuler', exact: true }).tap();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel('Début du tableau de f').fill('-2');
	await dialog.getByLabel('Fin du tableau de f').fill('3');
	const submit = dialog.getByRole('button', { name: 'Tabuler', exact: true });
	await expectTouchTarget(submit, 'bouton Tabuler');
	await submit.tap();
	await expect(dialog).toHaveCount(0);
	// -2 à 3, pas 1 : 6 lignes ; f(3) = 0 en B6
	await expect.poll(() => shownIn(page, 'A6')).toBe('3');
	await expect.poll(() => shownIn(page, 'B6')).toBe('0');
});

test('#1410 — toucher une case, la modifier par la barre du haut', async ({ page }) => {
	await openView(page, 'Données');
	await setConsole(page, false);
	const cell = cellLocator(page, 'B2');
	await cell.tap();
	await expect(cell).toHaveClass(/\bactive\b/);
	const bar = page.locator('#atelier-barre-cellule');
	await bar.tap();
	await bar.fill('42');
	await bar.press('Enter');
	await expect.poll(() => shownIn(page, 'B2')).toBe('42');
});

test('#1434 — guillemets courbes du clavier d’iPad dans NB.SI', async ({ page }) => {
	await openView(page, 'Données');
	await typeColumn(page, 'B1', ['fille', 'garçon', 'Fille', 'garçon', 'fille']);
	// La ponctuation intelligente d'iOS écrit “…” à la place de "…"
	await typeColumn(page, 'D1', ['=NB.SI(B1:B5;“fille”)']);
	await expect.poll(() => shownIn(page, 'D1')).toBe('3');
});

test('#1388 — « Écriture mathématique » au téléphone : consigne, longue saisie, menu', async ({
	page
}, testInfo) => {
	await chooseSetting(page, 'Écriture mathématique');
	const field = mathConsole(page);
	await expect(field).toBeVisible();
	await shoot(page, '1388-consigne-vide', testInfo.project.name);

	// Une longue saisie reste dans sa ligne (la case ne grandit pas, elle défile)
	const before = await field.boundingBox();
	await field.tap();
	await waitVirtualKeyboard(page, field);
	// Le champ reste au-dessus du clavier virtuel : l'élève voit ce qu'il tape (E24)
	await expect
		.poll(async () => {
			const keyboardTop = await page.evaluate(() => {
				const keyboard = (window as unknown as { mathVirtualKeyboard?: { boundingRect: DOMRect } })
					.mathVirtualKeyboard;
				return keyboard?.boundingRect.top ?? 0;
			});
			const box = await field.boundingBox();
			return (box?.y ?? 0) + (box?.height ?? 0) <= keyboardTop;
		})
		.toBe(true);
	await page.keyboard.type('1+2+3+4+5+6+7+8+9+10+11+12+13+14+15+16+17+18+19+20');
	const after = await field.boundingBox();
	expect(after?.height).toBe(before?.height);
	expect(after?.width).toBe(before?.width);
	await shoot(page, '1388-longue-saisie', testInfo.project.name);
	await page.keyboard.press('Escape');

	// Menu du site (panneau latéral) : la croix a un nom, « Fermer », et se touche
	// du doigt (E22 : elle faisait 16 px)
	await page.getByRole('button', { name: 'Ouvrir le menu' }).first().tap();
	const close = page.getByRole('dialog').getByRole('button', { name: 'Fermer' });
	await expectTouchTarget(close, 'croix Fermer');
	await close.tap();
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

// ============================================================================
// GESTES À UN ET DEUX DOIGTS (paquet 2 du tri)
// ============================================================================

interface Spot {
	x: number;
	y: number;
}

/**
 * De vrais événements tactiles, à un ou plusieurs doigts, par le protocole de
 * Chromium (Playwright n'a que `tap`). Android seulement : WebKit et Firefox
 * n'ont pas ce protocole.
 */
class Fingers {
	private session: CDPSession | null = null;

	constructor(private readonly page: Page) {}

	private async send(type: 'touchStart' | 'touchMove' | 'touchEnd', spots: Spot[]): Promise<void> {
		this.session ??= await this.page.context().newCDPSession(this.page);
		await this.session.send('Input.dispatchTouchEvent', {
			type,
			touchPoints: spots.map((spot, id) => ({ x: spot.x, y: spot.y, id }))
		});
	}

	/** Les doigts partent de `from` et vont de `delta` (chacun le sien), en 8 pas */
	async drag(from: Spot[], delta: (finger: number, step: number) => Spot): Promise<void> {
		await this.send('touchStart', from);
		for (let step = 1; step <= 8; step++) {
			await this.send(
				'touchMove',
				from.map((spot, finger) => {
					const move = delta(finger, step / 8);
					return { x: spot.x + move.x, y: spot.y + move.y };
				})
			);
		}
		await this.send('touchEnd', []);
	}
}

/** Saute le test hors d'Android (gestes par le protocole de Chromium) */
function androidOnly(): void {
	test.skip(
		test.info().project.name !== 'android',
		'Gestes à plusieurs doigts : Chromium (Android)'
	);
}

/** Le centre de l'étiquette d'un point de la Géométrie (`A`, `B`…) */
async function labelAt(page: Page, name: string): Promise<Spot> {
	const label = page.locator('.figure svg text').filter({ hasText: new RegExp(`^${name}$`) });
	const box = await label.first().boundingBox();
	if (box === null) throw new Error(`étiquette ${name} introuvable`);
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function historyCount(page: Page): Promise<number> {
	return page.locator('ol.historique > li').count();
}

async function chooseFigureTool(page: Page, label: string): Promise<void> {
	await page
		.getByRole('toolbar', { name: 'Outils de géométrie' })
		.getByRole('button', { name: label, exact: true })
		.tap();
}

/** Géométrie au téléphone, avec A (0 ; 0) et B (2 ; 0) */
async function figureWithTwoPoints(
	page: Page
): Promise<{ canvas: NonNullable<Awaited<ReturnType<Locator['boundingBox']>>> }> {
	await calc(page, 'A = (0 ; 0)');
	await calc(page, 'B = (2 ; 0)');
	await openView(page, 'Géométrie');
	await setConsole(page, false);
	// « Mes objets » replié : la toile prend la place (les cartes déplient le panneau)
	const fold = page.locator('aside.panneau button.replier');
	if ((await fold.getAttribute('aria-expanded')) === 'true') await fold.tap();
	await expect(fold).toHaveAttribute('aria-expanded', 'false');
	const canvas = await page.locator('.figure .toile').boundingBox();
	if (canvas === null) throw new Error('toile introuvable');
	return { canvas };
}

test('#1540 — Géométrie au téléphone : toile, barre dessous qui défile, téléphone couché', async ({
	page
}, testInfo) => {
	const { canvas } = await figureWithTwoPoints(page);
	const bar = page.getByRole('toolbar', { name: 'Outils de géométrie' });
	const barBox = await bar.boundingBox();
	expect(barBox?.y ?? 0).toBeGreaterThanOrEqual(canvas.y + canvas.height - 1);
	// Plus large que l'écran : elle défile de côté
	expect(
		await bar.evaluate((element) => {
			for (let node: Element | null = element; node !== null; node = node.parentElement) {
				const overflow = getComputedStyle(node).overflowX;
				if ((overflow === 'auto' || overflow === 'scroll') && node.scrollWidth > node.clientWidth) {
					return true;
				}
			}
			return false;
		})
	).toBe(true);
	await shoot(page, '1540-geometrie', testInfo.project.name);
	// Téléphone couché : la barre reste à l'écran
	const viewport = page.viewportSize();
	if (viewport === null) throw new Error('pas de fenêtre');
	await page.setViewportSize({ width: viewport.height, height: viewport.width });
	await expect(bar).toBeInViewport();
	await shoot(page, '1540-geometrie-couche', testInfo.project.name);
});

test('#1540 — deux doigts : zoom et déplacement de la vue, avec un outil, sans rien écrire', async ({
	page
}) => {
	androidOnly();
	const { canvas } = await figureWithTwoPoints(page);
	await chooseFigureTool(page, 'Segment');
	const lines = await historyCount(page);
	const center = { x: canvas.x + canvas.width / 2, y: canvas.y + canvas.height / 2 + 40 };
	const fingers = new Fingers(page);
	const spread = async () => (await labelAt(page, 'B')).x - (await labelAt(page, 'A')).x;
	const before = await spread();
	// Pincer en écartant : la vue grossit
	await fingers.drag(
		[
			{ x: center.x - 30, y: center.y },
			{ x: center.x + 30, y: center.y }
		],
		(finger, t) => ({ x: (finger === 0 ? -64 : 64) * t, y: 0 })
	);
	await expect.poll(spread).toBeGreaterThan(before * 1.5);
	// Deux doigts qui glissent ensemble : la vue suit
	const a = await labelAt(page, 'A');
	await fingers.drag(
		[
			{ x: center.x - 30, y: center.y },
			{ x: center.x + 30, y: center.y }
		],
		(_finger, t) => ({ x: 48 * t, y: 40 * t })
	);
	await expect.poll(async () => (await labelAt(page, 'A')).x - a.x).toBeGreaterThan(30);
	// Aucun segment commencé, rien d'écrit
	expect(await historyCount(page)).toBe(lines);
});

test('#1540 — Déplacer : un doigt sur le fond déplace la vue, sur un point le glisse', async ({
	page
}) => {
	androidOnly();
	const { canvas } = await figureWithTwoPoints(page);
	await chooseFigureTool(page, 'Déplacer');
	const fingers = new Fingers(page);
	const a = await labelAt(page, 'A');
	const b = await labelAt(page, 'B');
	// Le fond, loin des points
	const empty = { x: canvas.x + 30, y: canvas.y + 30 };
	await fingers.drag([empty], (_finger, t) => ({ x: 60 * t, y: 0 }));
	await expect.poll(async () => (await labelAt(page, 'A')).x - a.x).toBeGreaterThan(40);
	// Toute la vue a bougé : la distance AB n'a pas changé
	expect(
		Math.abs((await labelAt(page, 'B')).x - (await labelAt(page, 'A')).x - (b.x - a.x))
	).toBeLessThan(3);
});

test('#1540, #1536, #1538 — Segment puis Milieu, par appuis du doigt', async ({ page }) => {
	await figureWithTwoPoints(page);
	const lines = await historyCount(page);
	await chooseFigureTool(page, 'Segment');
	const a = await labelAt(page, 'A');
	const b = await labelAt(page, 'B');
	// L'étiquette est en haut à droite de son point : on vise en bas à gauche d'elle
	const onA = await pointNear(page, { x: a.x - 8, y: a.y + 8 });
	const onB = await pointNear(page, { x: b.x - 8, y: b.y + 8 });
	await page.touchscreen.tap(onA.x, onA.y);
	await page.touchscreen.tap(onB.x, onB.y);
	await expect.poll(() => historyCount(page)).toBe(lines + 1);
	await chooseFigureTool(page, 'Milieu');
	await page.touchscreen.tap(onA.x, onA.y);
	await page.touchscreen.tap(onB.x, onB.y);
	await expect.poll(() => historyCount(page)).toBe(lines + 2);
});

/** Le centre du petit cercle (un point de la figure) le plus proche de `spot` */
async function pointNear(page: Page, spot: Spot): Promise<Spot> {
	const centers = await page.locator('.figure svg circle').evaluateAll((circles) =>
		circles
			.map((circle) => circle.getBoundingClientRect())
			.filter((box) => box.width > 0 && box.width < 20)
			.map((box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 }))
	);
	const distance = (c: Spot) => Math.hypot(c.x - spot.x, c.y - spot.y);
	const nearest = centers.sort((p, q) => distance(p) - distance(q))[0];
	if (nearest === undefined) throw new Error('aucun point dessiné');
	return nearest;
}

test('lecture graphique — losange glissé au doigt', async ({ page }) => {
	androidOnly();
	await calc(page, 'f(x) = x^2');
	await openView(page, 'Graphe');
	await cardLocator(page, 'f').getByRole('button', { name: 'Options de f', exact: true }).tap();
	await page.getByRole('menuitemcheckbox', { name: 'Lecture graphique' }).tap();
	await page.keyboard.press('Escape');
	await setConsole(page, false);
	const handle = page.getByRole('slider', { name: 'Lecture graphique de f' });
	const box = await handle.boundingBox();
	if (box === null) throw new Error('losange introuvable');
	await new Fingers(page).drag(
		[{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
		(_f, t) => ({
			x: 60 * t,
			y: 0
		})
	);
	await expect
		.poll(async () => Number(await handle.getAttribute('aria-valuenow')))
		.toBeGreaterThan(0);
});

test('Annuler / Rétablir (lot 5, PR 2) — curseur de a glissé au doigt : une étape', async ({
	page
}) => {
	androidOnly();
	await calc(page, 'a = 2');
	await calc(page, 'f(x) = a x');
	const slider = cardLocator(page, 'a').getByRole('slider');
	const before = await slider.getAttribute('aria-valuenow');
	const box = await slider.boundingBox();
	if (box === null) throw new Error('curseur sans boîte');
	await new Fingers(page).drag(
		[{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
		(_f, t) => ({
			x: 50 * t,
			y: 0
		})
	);
	await expect(slider).not.toHaveAttribute('aria-valuenow', before ?? '');
	const undo = page
		.getByRole('toolbar', { name: 'Outils de l’atelier' })
		.getByRole('button', { name: /^Annuler/ });
	await expect(undo).toHaveAccessibleName('Annuler : curseur de a');
	await undo.tap();
	await expect(slider).toHaveAttribute('aria-valuenow', before ?? '');
});

test('cartes de fonction (lot 3) — « dérivée de f — elle suit f » au toucher', async ({ page }) => {
	await calc(page, 'f(x) = x^2');
	await cardLocator(page, 'f').getByRole('button', { name: 'Options de f', exact: true }).tap();
	await page.getByRole('menuitem', { name: 'Dériver', exact: true }).tap();
	const link = cardLocator(page, 'f′').getByRole('button', { name: 'dérivée de f — elle suit f' });
	await link.tap();
	await expect(link).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator(`#${await link.getAttribute('aria-controls')}`)).toContainText(
		'elle suit f'
	);
});

test('console de l’Atelier — au téléphone : plein écran, « Tracer » la referme', async ({
	page
}) => {
	await calc(page, 'f(x) = x^2 - 1');
	const consoleButton = page.getByRole('button', { name: 'Console', exact: true });
	await expect(consoleButton).toHaveAttribute('aria-expanded', 'true');
	// Plein écran : la console couvre la vue, du bas des onglets jusqu'en bas
	const field = page.getByLabel('Calcul, définition ou commande');
	const viewport = page.viewportSize();
	const fieldBox = await field.boundingBox();
	expect(fieldBox).not.toBeNull();
	expect((fieldBox?.y ?? 0) + (fieldBox?.height ?? 0)).toBeGreaterThan(
		(viewport?.height ?? 0) * 0.8
	);
	// L'œil de la carte trace sans changer de vue (C3) : on retire le tracé, la console reste
	const eye = cardLocator(page, 'f').getByRole('button', { name: 'Tracer f' });
	await eye.tap();
	await expect(eye).toHaveAttribute('aria-pressed', 'false');
	await expect(consoleButton).toHaveAttribute('aria-expanded', 'true');
	// « Tracer » du menu ⋮ : la courbe revient, la console se referme, le Graphe se montre
	await cardLocator(page, 'f').getByRole('button', { name: 'Options de f', exact: true }).tap();
	await page.getByRole('menuitem', { name: /^Tracer/ }).tap();
	await expect(eye).toHaveAttribute('aria-pressed', 'true');
	await expect(consoleButton).toHaveAttribute('aria-expanded', 'false');
	await expect(
		page
			.getByRole('navigation', { name: "Vues de l'atelier" })
			.getByRole('button', { name: 'Graphe' })
	).toHaveAttribute('aria-current', 'page');
});

test('#1472 — ≥ et guillemets courbes du clavier d’iPad dans ET', async ({ page }) => {
	await openView(page, 'Données');
	await typeColumn(page, 'A1', ['12', '8']);
	await typeColumn(page, 'B1', ['fille', 'fille']);
	await typeColumn(page, 'C1', ['=SI(ET(A1≥10;B1=“fille”);1;0)', '=SI(ET(A2≥10;B2=“fille”);1;0)']);
	await expect.poll(() => shownIn(page, 'C1')).toBe('1');
	await expect.poll(() => shownIn(page, 'C2')).toBe('0');
});

test('#1473, barre d’icônes — au doigt : « Ouvrir un CSV… » et « Charger » ouvrent le choix de fichier', async ({
	page
}) => {
	const load = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Charger un atelier', exact: true }).tap();
	expect((await load).isMultiple()).toBe(false);
	await openView(page, 'Données');
	await setConsole(page, false);
	const csv = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Ouvrir un CSV…' }).tap();
	await csv;
});
