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

/** Les lectures dessinées depuis la console : le texte de leurs deux étiquettes (« 2 4 ») */
async function consoleReadings(page: Page): Promise<string[]> {
	return page
		.locator('.image-readings g[data-source="console"]')
		.evaluateAll((groups) =>
			groups.map((group) =>
				[...group.querySelectorAll('text')]
					.map((label) => (label.textContent ?? '').trim().replace('−', '-'))
					.join(' ')
			)
		);
}

/** Les graduations de l'axe des x, pour voir si le graphe a bougé */
async function xTicks(page: Page): Promise<string[]> {
	return page.locator('.x-axis-ticks .axis-label').allTextContents();
}

test('lecture graphique — losange glissé ou au clavier, lectures de la console, décocher', async ({
	page
}) => {
	await calc(page, 'f(x) = x^2');
	await page.getByRole('button', { name: 'Options de f', exact: true }).click();
	await page.getByRole('menuitemcheckbox', { name: 'Lecture graphique' }).click();
	await page.keyboard.press('Escape');
	const handle = page.getByRole('slider', { name: 'Lecture graphique de f' });
	await expect(handle).toBeVisible();
	await expect(handle).toHaveAttribute('aria-valuetext', 'Lecture de f en x = 0 : f(0) = 0');

	// Glissé à la souris : le graphe ne bouge pas, la lecture suit, aimantée aux demis
	await setConsole(page, false);
	const ticks = await xTicks(page);
	const box = await handle.boundingBox();
	if (box === null) throw new Error('losange introuvable');
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2 + 97, box.y + box.height / 2, { steps: 8 });
	await page.mouse.up();
	const dragged = Number(await handle.getAttribute('aria-valuenow'));
	expect(dragged).toBeGreaterThan(0);
	expect(dragged * 2).toBe(Math.round(dragged * 2));
	expect(await xTicks(page)).toEqual(ticks);
	await expect(page.locator('.image-readings g[data-source="curseur"]')).toHaveCount(1);

	// Au clavier : une flèche avance d'un pas de la sous-grille (0,5)
	await handle.focus();
	await page.keyboard.press('ArrowRight');
	await expect(handle).toHaveAttribute('aria-valuenow', String(dragged + 0.5));

	// f(2) dans la console : pointillés de 2 à 4, qui restent
	await calc(page, 'f(2)');
	await expect.poll(() => consoleReadings(page)).toEqual(['2 4']);
	// f(-1), f(3), f(5) : seules les 3 dernières restent
	for (const input of ['f(-1)', 'f(3)', 'f(5)']) await calc(page, input);
	await expect.poll(() => consoleReadings(page)).toEqual(['-1 1', '3 9', '5 25']);

	// f(x) = √x et f(-1) : rien en −1 (f(3) et f(5) se relisent sur la nouvelle courbe)
	await calc(page, 'f(x) = sqrt(x)');
	await calc(page, 'f(-1)');
	await expect.poll(() => consoleReadings(page)).toEqual(['3 ≈ 1,73', '5 ≈ 2,24']);

	// Décocher l'option : tout disparaît, losange compris
	await page.getByRole('button', { name: 'Options de f', exact: true }).click();
	await page.getByRole('menuitemcheckbox', { name: 'Lecture graphique' }).click();
	await page.keyboard.press('Escape');
	await expect(handle).toHaveCount(0);
	await expect(page.locator('.image-readings g')).toHaveCount(0);
});
