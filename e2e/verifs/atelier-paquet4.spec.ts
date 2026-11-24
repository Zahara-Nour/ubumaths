import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
	calc,
	card,
	chooseSetting,
	expectLatex,
	expectLatexContaining,
	normalizeLatex,
	openAtelier,
	steps
} from './helpers/atelier';
import { cellLocator, openView, setConsole, typeCell } from './helpers/grille';

/**
 * Lignes Atelier du paquet 4 du tri (26 octobre – 2 novembre)
 * ============================================================
 *
 * #2118, #1862, #1827, #1813, #1828, #1835 de `docs/wip/verifications-manuelles.md`.
 * Captures à l'œil de la session : `.captures/verifs/paquet4/`.
 */

// ============================================================================
// CONSTANTES
// ============================================================================

const SHOTS_DIR = '.captures/verifs/paquet4';

// ============================================================================
// FUNCTIONS
// ============================================================================

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

async function shoot(page: Page, name: string, projectName: string): Promise<void> {
	await mkdir(SHOTS_DIR, { recursive: true });
	await page.screenshot({ path: `${SHOTS_DIR}/${name}-${projectName}.png` });
}

/** Le texte de la ligne de réponse (conditions écrites après la formule comprises) */
async function answerText(page: Page, input: string): Promise<{ latex: string; text: string }> {
	const answer = await calc(page, input);
	return {
		latex: normalizeLatex(answer.latex ?? ''),
		text: ((await answer.line.locator('.reponse').textContent()) ?? '').replace(/\s+/g, ' ')
	};
}

// ============================================================================
// TESTS
// ============================================================================

test('#2118 — conditions de √ et ln à paramètre', async ({ page }) => {
	const root = await answerText(page, '.intégrer \\sqrt{a} x de 0 à 1');
	expect(root.latex + ' ' + root.text).toMatch(/a\s*(⩾|≥|\\geqslant|\\ge)\s*0/);
	const log = await answerText(page, '.intégrer \\ln(a+2) x de 0 à 1');
	expect(log.latex + ' ' + log.text).toMatch(/a\s*>\s*(−|-)\s*2/);
	const both = await answerText(page, '.intégrer \\sqrt{a}\\ln(a) x de 0 à 1');
	expect(both.latex + ' ' + both.text).toMatch(/a\s*>\s*0/);
	expect(both.latex + ' ' + both.text).not.toMatch(/a\s*(⩾|≥|\\geqslant|\\ge)\s*0/);
	// Une primitive : pas de condition
	const primitive = await answerText(page, '.intégrer \\sqrt{a} x');
	expect(primitive.latex).toContain('sqrt');
	expect(primitive.latex + ' ' + primitive.text).not.toMatch(/a\s*(⩾|≥|>|\\geqslant|\\ge)/);
});

test('#1862 — valeurs remarquables', async ({ page }) => {
	const simplified = await calc(page, '.simplifier x cos(π/3)');
	expectLatexContaining(simplified, '\\dfrac{x}{2}');
	expect(await steps(simplified)).toContain('On utilise une valeur remarquable');
	expectLatexContaining(await calc(page, '.développer (x+cos(π/3))^2'), 'x^2 + x + \\dfrac{1}{4}');
	const solved = await calc(page, '.résoudre cos(π/3)x=1');
	expect(normalizeLatex(solved.latex ?? '')).toContain('2');
	const solvedSteps = await steps(solved);
	expect(solvedSteps).toContain('valeur remarquable');
	const degrees = await calc(page, '.résoudre cos(60°)x=1');
	// Le signe degré collé au nombre (LaTeX `60{}^{\circ}`)
	expect(await steps(degrees)).toMatch(/cos\\left\( 60\{\}\^\{\\circ\} \\right\) = /);
	expectLatexContaining(await calc(page, '.simplifier cos(20°)x'), 'cos');
});

test('#1827 — graphe agrandi : toute la fenêtre, Échap réduit sans recadrer', async ({
	page
}, testInfo) => {
	test.skip(testInfo.project.use.isMobile === true, 'Échap et menu : ordinateur');
	await calc(page, 'f(x) = x^2');
	await openView(page, 'Graphe');
	await setConsole(page, false);
	const enlarge = page.getByRole('button', { name: 'Agrandir le graphe' });
	await enlarge.click();
	const reduce = page.getByRole('button', { name: 'Réduire le graphe' });
	await expect(reduce).toBeVisible();
	// Toute la fenêtre : ni en-tête du site, ni « Mes objets »
	const objects = page.getByText('Mes objets', { exact: true });
	await expect(objects).toBeHidden();
	const viewport = page.viewportSize();
	const graph = await page.locator('.graph-container').first().boundingBox();
	expect(graph?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.95);
	await shoot(page, '1827-agrandi', testInfo.project.name);
	// Échap sur le menu Exporter ouvert : seulement le menu
	await page.getByRole('button', { name: 'Exporter le graphique' }).click();
	await expect(page.getByRole('menu')).toBeVisible();
	await page.keyboard.press('Escape');
	// Le menu est parti, le graphe reste agrandi
	await expect(page.getByRole('menu')).toHaveCount(0);
	await expect(reduce).toBeVisible();
	// Échap de nouveau : le graphe se réduit
	await page.keyboard.press('Escape');
	await expect(enlarge).toBeVisible();
	await expect(objects).toBeVisible();
});

test('#1813 — Données : la grille ne bouge pas d’une case à l’autre', async ({
	page
}, testInfo) => {
	await openView(page, 'Données');
	await typeCell(page, 'A1', '=sqrt(8)');
	await typeCell(page, 'A3', '=1/0');
	const grid = page.locator('table[role="grid"], [role="grid"]').first();
	const top = async () => (await grid.boundingBox())?.y ?? -1;
	const start = await top();
	expect(start).toBeGreaterThan(0);
	for (const address of ['A1', 'A2', 'A3']) {
		await cellLocator(page, address).click();
		expect(await top(), address).toBe(start);
	}
	// Pendant la frappe d'une formule
	await cellLocator(page, 'B1').click();
	await page.locator('#atelier-barre-cellule').pressSequentially('=SI(');
	// Écart E41 : sur un écran court (iPhone 15, 659 px de haut), l'aide de SI et la barre de
	// mise en forme repoussent la grille ; sur Pixel 7 (839 px), elle ne bouge pas
	if ((page.viewportSize()?.height ?? 1000) < 700) {
		test.fail(true, 'écart E41 (#1813) : la grille descend pendant la frappe au téléphone');
	}
	expect(await top()).toBe(start);
	await shoot(page, '1813-donnees', testInfo.project.name);
});

test('#1828 — « Simplifier en disant la condition » : « ou » en texte droit, √ rendus', async ({
	page
}) => {
	// Mode par défaut : le bouton nomme les deux conditions, √ rendus
	const fraction = await calc(page, '.simplifier (x^2-2)/(x^2-2)');
	await expect(
		fraction.line.getByRole('button', { name: /Simplifier pour x ≠ −√2 et x ≠ √2/ })
	).toBeVisible();
	await chooseSetting(page, 'Simplifier en disant la condition');
	const zero = await calc(page, '.simplifier ln(x^2-2)-ln(x^2-2)');
	const shown = (await zero.line.locator('.reponse').textContent()) ?? '';
	expect(shown).toContain('ou');
	expect(shown).not.toContain('ext');
	expect(normalizeLatex(zero.latex ?? '')).not.toContain('\\text{ ou');
});

test('#1835 — composée d’une fonction à ensemble', async ({ page }) => {
	await calc(page, 'f(x) = x^2 sur [0;+\\infty[');
	await calc(page, 'g(x) = f(2x)');
	const domain = await calc(page, '.domaine g');
	expect(domain.text).toContain('2x doit être dans');
	const solved = await calc(page, '.résoudre f(2x)=4');
	expectLatex(solved, 'S = \\{ 1 \\}');
	expect(await steps(solved)).toContain('2x doit être dans');
	const wrong = await calc(page, 'h(x) = f(x^2)');
	// h(x) = f(x^2) est refusée avec un message qui dit pourquoi (x^2 n'est pas de la forme ax + b)
	expect(wrong.text).toContain('« h » est dans tes objets, mais elle est en erreur');
	expect(wrong.text).toContain('f est définie sur [0 ; +∞[ : dans f(x^2), x^2 doit y être');
	expect(wrong.text).toContain('pour une expression de la forme ax + b');
	// Écart E40 : la carte g (en champ) ne dit plus « sur [0 ; +∞[ », l'ensemble hérité de f
	expect((await card(page, 'g')).interval).toBe('[0 ; +∞[');
});
