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
	expect(ticks.length).toBeGreaterThan(2);
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

/** La demi-largeur de la fenêtre du graphe, lue dans sa description (« Fenetre de x=-a a a ») */
async function halfWidth(page: Page): Promise<number> {
	const label =
		(await page.locator('[role="img"][aria-label^="Graphique"]').getAttribute('aria-label')) ?? '';
	const match = /Fenetre de x=(-?[\d.]+) a (-?[\d.]+)/.exec(label);
	if (match === null) throw new Error(`fenêtre illisible : ${label}`);
	return (Number(match[2]) - Number(match[1])) / 2;
}

/** `/grapheur` : définit `f` dans la console, la referme, puis `clicks` fois « Zoom arrière » */
async function grapheur(page: Page, definition: string, clicks: number): Promise<void> {
	await page.goto('/grapheur');
	await calc(page, `f(x) = ${definition}`);
	await setConsole(page, false);
	const zoomOut = page.getByRole('button', { name: 'Zoom arrière' });
	for (let click = 0; click < clicks; click++) await zoomOut.click();
}

/** Les étiquettes des asymptotes dessinées (« y = 0 », « x = e ») */
async function asymptoteLabels(page: Page): Promise<string> {
	return ((await page.locator('.asymptote-lines').textContent()) ?? '').replace(/\s+/g, ' ');
}

test('#1415, #1416, #1418, #1419 — grapheur : pôles de tan, asymptotes y = 0, y = e, x = e', async ({
	page
}) => {
	// tan(x) sur ±100 (6 clics : ±114) : tous les pôles en pointillés
	await grapheur(page, '\\tan(x)', 6);
	await expect.poll(() => halfWidth(page)).toBeGreaterThan(100);
	const half = await halfWidth(page);
	let poles = 0;
	for (let k = -1000; k <= 1000; k++) {
		if (Math.abs(Math.PI / 2 + k * Math.PI) < half) poles++;
	}
	await expect.poll(() => verticalAsymptotes(page).count()).toBe(poles);
	// Dézoomé à ±600 : aucun
	const zoomOut = page.getByRole('button', { name: 'Zoom arrière' });
	for (let click = 0; click < 4; click++) await zoomOut.click();
	await expect.poll(() => halfWidth(page)).toBeGreaterThan(500);
	await expect.poll(() => verticalAsymptotes(page).count()).toBe(0);

	// ln(x)/√x : asymptote « y = 0 » à droite
	await grapheur(page, '\\frac{\\ln(x)}{\\sqrt{x}}', 0);
	await expect.poll(() => asymptoteLabels(page)).toMatch(/y\s*=\s*0(?![\d.,])/);
	// (1 + 1/x)^x : étiquette « y = e »
	await grapheur(page, '\\left(1+\\frac{1}{x}\\right)^{x}', 0);
	await expect.poll(() => asymptoteLabels(page)).toMatch(/y\s*=\s*e/);
	// 1/(ln(x) − 1) dézoomé : asymptote x = e
	await grapheur(page, '\\frac{1}{\\ln(x)-1}', 3);
	await expect.poll(() => verticalAsymptotes(page).count()).toBe(1);
	await expect.poll(() => asymptoteLabels(page)).toMatch(/x\s*=\s*e(?![\d.,])/);
});

test('#1415, #1416, #1418, #1419 — Atelier : a = 1/3, (a x + 1)/(x² − a) se trace sans figer', async ({
	page
}) => {
	await calc(page, 'a = 1/3');
	const start = Date.now();
	await calc(page, 'f(x) = (a x + 1)/(x^2 - a)');
	await expect(page.locator('path.function-curve')).toHaveCount(1);
	// « Fluide » : tracé en moins de 3 s, aller-retour de la console compris (avant :
	// plusieurs secondes figé, en plus)
	expect(Date.now() - start).toBeLessThan(3000);
	// Le curseur de a bouge le tracé sans figer : 5 pas en moins de 2 s
	const slider = page.getByRole('slider', { name: 'Curseur de a' });
	const curve = page.locator('path.function-curve');
	const before = await slider.getAttribute('aria-valuetext');
	const drawn = await curve.getAttribute('d');
	const moving = Date.now();
	await slider.focus();
	for (let press = 0; press < 5; press++) await slider.press('ArrowRight');
	await expect(slider).not.toHaveAttribute('aria-valuetext', before ?? '');
	await expect.poll(() => curve.getAttribute('d')).not.toBe(drawn);
	expect(Date.now() - moving).toBeLessThan(3000);
});
