import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
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
	await page.keyboard.type('1+2+3+4+5+6+7+8+9+10+11+12+13+14+15+16+17+18+19+20');
	const after = await field.boundingBox();
	expect(after?.height).toBe(before?.height);
	expect(after?.width).toBe(before?.width);
	await shoot(page, '1388-longue-saisie', testInfo.project.name);
	await page.keyboard.press('Escape');

	// Menu du site (panneau latéral) : la croix a un nom, « Fermer ». Sa taille
	// (16 px) est l'écart E22 de `ecarts-verifs-progress.md`, pas mesurée ici
	await page.getByRole('button', { name: 'Ouvrir le menu' }).first().tap();
	const close = page.getByRole('dialog').getByRole('button', { name: 'Fermer' });
	await expect(close).toBeVisible();
	await close.tap();
	await expect(page.getByRole('dialog')).toHaveCount(0);
});
