import { expect, test, type Page } from '@playwright/test';
import { calc, openAtelier } from './helpers/atelier';
import { openView, setConsole } from './helpers/grille';

/**
 * La vue Graphe de l'Atelier — lignes de `docs/wip/verifications-manuelles.md`
 * ============================================================================
 *
 * On définit une fonction dans la console, on ouvre le Graphe, on dézoome au
 * bouton « Zoom arrière » et on compte ce que le grapheur DESSINE : asymptotes
 * verticales (tirets 5,5) et horizontales (8,4), marqueurs de zéro. Un test par ligne, son numéro de
 * PR dans le titre. L'attendu est celui de la ligne : un test rouge est un bug
 * ou une ligne périmée, à signaler à David — jamais un attendu à changer pour
 * passer.
 */

/** 10 clics « Zoom arrière » (× 1,5 chacun) : de ±10 à ±577, le « x ≈ ±600 » de la ligne */
const ZOOM_OUT_CLICKS = 10;

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

/** Définit `f`, ouvre le Graphe et dézoome jusqu'à x ≈ ±600 */
async function plotZoomedOut(page: Page, definition: string): Promise<void> {
	await calc(page, `f(x) = ${definition}`);
	await openView(page, 'Graphe');
	// La console ouverte couvre les boutons de zoom
	await setConsole(page, false);
	const zoomOut = page.getByRole('button', { name: 'Zoom arrière' });
	for (let click = 0; click < ZOOM_OUT_CLICKS; click++) await zoomOut.click();
	// Le dézoom a eu lieu : la plus grande graduation de l'axe des x dépasse 400
	const ticks = page.locator('.x-axis-ticks .axis-label');
	await expect
		.poll(async () =>
			Math.max(
				...(await ticks.allTextContents()).map((tick) =>
					Math.abs(Number(tick.replace(/\s/g, '').replace('−', '-').replace(',', '.')))
				)
			)
		)
		.toBeGreaterThan(400);
}

/** Les asymptotes verticales dessinées (un tracé non vide) */
function verticalAsymptotes(page: Page) {
	return page.locator('.asymptote-lines path[stroke-dasharray="5,5"]:not([d=""])');
}

/**
 * Rend le nombre d'asymptotes verticales une fois l'analyse posée : chaque
 * fonction de ces lignes a une asymptote horizontale, on attend qu'elle soit
 * dessinée (sans elle, « 0 asymptote verticale » ne prouverait rien).
 */
async function settledVerticalCount(page: Page): Promise<number> {
	// Compter, pas toBeVisible : un trait horizontal a une boîte de hauteur nulle
	const horizontal = page.locator('.asymptote-lines path[stroke-dasharray="8,4"]:not([d=""])');
	await expect.poll(() => horizontal.count()).toBeGreaterThan(0);
	return verticalAsymptotes(page).count();
}

test('#1400 — e^x+45 dézoomé : plus aucune asymptote verticale', async ({ page }) => {
	await plotZoomedOut(page, 'e^x+45');
	expect(await settledVerticalCount(page)).toBe(0);
});

for (const definition of ['e^{-x}', '2^x']) {
	test(`#1401 — ${definition} dézoomé : aucun zéro posé sur l’axe`, async ({ page }) => {
		await plotZoomedOut(page, definition);
		await settledVerticalCount(page);
		await expect(page.locator('.root-marker')).toHaveCount(0);
	});
}

for (const definition of ['\\frac{1}{x}', '\\frac{x^2+1}{x-1}']) {
	test(`#1402 — ${definition} dézoomé : l’asymptote verticale reste visible`, async ({ page }) => {
		await plotZoomedOut(page, definition);
		await expect.poll(() => verticalAsymptotes(page).count()).toBe(1);
	});
}

test('#1405 — e^{1/x} dézoomé : asymptote x = 0', async ({ page }) => {
	await plotZoomedOut(page, 'e^{\\frac{1}{x}}');
	await expect.poll(() => verticalAsymptotes(page).count()).toBe(1);
	await expect(page.locator('.asymptote-lines')).toContainText(/x\s*=\s*0/);
});

test('#1405 — sin(x)/x dézoomé : aucune asymptote verticale', async ({ page }) => {
	await plotZoomedOut(page, '\\frac{\\sin(x)}{x}');
	expect(await settledVerticalCount(page)).toBe(0);
});
