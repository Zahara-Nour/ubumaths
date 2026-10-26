import { expect, test, type Locator, type Page } from '@playwright/test';
import { calc, card, cardLocator, openAtelier, retypeCard } from './helpers/atelier';
import { openView, setConsole } from './helpers/grille';

/**
 * La barre d'icônes de l'Atelier — lignes de `docs/wip/verifications-manuelles.md`
 * ================================================================================
 *
 * Repartir de zéro, Charger, Enregistrer, Partager, Réglages ; Annuler /
 * Rétablir (lot 5). Les fichiers sont ceux que l'appli télécharge elle-même
 * (« Enregistrer », `.exporter`), rechoisis par « Charger ». Un test par ligne,
 * son numéro de PR dans le titre (« barre d'icônes de l'Atelier » est le nom de
 * sa ligne). L'attendu est celui de la ligne : un test rouge est un bug ou une
 * ligne périmée, à signaler à David — jamais un attendu à changer pour passer.
 */

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

function toolButton(page: Page, name: string): Locator {
	return page.getByRole('button', { name, exact: true });
}

/** Les lignes de l'historique de la console, en texte (console ouverte ou fermée) */
async function historyTexts(page: Page): Promise<string[]> {
	const lines = await page.locator('ol.historique > li').allTextContents();
	return lines.map((line) => line.replace(/\s+/g, ' ').trim());
}

/** « Enregistrer l'atelier » : le fichier téléchargé, gardé dans le dossier du test */
async function save(page: Page, path: string): Promise<string> {
	const download = page.waitForEvent('download');
	await toolButton(page, 'Enregistrer l’atelier').click();
	const file = await download;
	expect(file.suggestedFilename()).toMatch(/^atelier-\d{4}-\d{2}-\d{2}\.atelier\.json$/);
	await file.saveAs(path);
	return path;
}

/** « Charger un atelier » : choisit ce fichier dans la fenêtre du système */
async function load(
	page: Page,
	file: string | { name: string; mimeType: string; buffer: Buffer }
): Promise<void> {
	const chooser = page.waitForEvent('filechooser');
	await toolButton(page, 'Charger un atelier').click();
	await (await chooser).setFiles(file);
}

/** Le message (toast) de ce texte */
function toast(page: Page, text: string | RegExp): Locator {
	return page.getByRole('region', { name: /^Notifications/ }).getByText(text);
}

/** Les avis sous la console (refus de chargement, atelier mis de côté) */
function notices(page: Page): Locator {
	return page.locator('ul.avis');
}

test('barre d’icônes de l’Atelier — infobulles, grisés, Enregistrer puis Charger, refus', async ({
	page
}, testInfo) => {
	// Une seule barre : Repartir de zéro, Charger, Enregistrer à gauche ; Partager, Réglages à droite
	const order = [
		'Repartir de zéro',
		'Charger un atelier',
		'Enregistrer l’atelier',
		'Partager',
		'Réglages'
	];
	const lefts: number[] = [];
	for (const name of order) {
		const box = await toolButton(page, name).boundingBox();
		lefts.push(box?.x ?? Number.NaN);
	}
	expect([...lefts].sort((a, b) => a - b)).toEqual(lefts);
	// Une infobulle sur chacune ; atelier vide → Enregistrer / Repartir / Partager grisés,
	// l'infobulle dit pourquoi
	for (const name of order) {
		await expect(toolButton(page, name)).toHaveAttribute('title', new RegExp(`^${name}`));
	}
	for (const name of ['Enregistrer l’atelier', 'Repartir de zéro', 'Partager']) {
		await expect(toolButton(page, name)).toHaveAttribute('aria-disabled', 'true');
		await expect(toolButton(page, name)).toHaveAttribute('title', new RegExp(`^${name} — .+`));
	}

	// Une définition retouchée sur sa carte, une couleur, le tableur
	await calc(page, 'f(x) = x^2');
	await calc(page, 'a = 2');
	// Un historique `calcul-….json` d'avant la refonte (celui de `.exporter`), pris tôt :
	// le rejeu s'arrête à un chargement (« rupture »)
	const download = page.waitForEvent('download');
	// `.exporter` n'écrit pas de ligne dans la console : tapé sans `calc`
	const field = page.getByLabel('Calcul, définition ou commande');
	await field.fill('.exporter');
	await field.press('Enter');
	const exported = await download;
	expect(exported.suggestedFilename()).toMatch(/^calcul-.+\.json$/);
	const history = testInfo.outputPath('calcul.json');
	await exported.saveAs(history);

	await retypeCard(page, 'f', 'x^3');
	await page.keyboard.press('Enter');
	await expect.poll(async () => (await card(page, 'f')).latex).toBe('x^3');
	await cardLocator(page, 'f').getByRole('button', { name: 'Couleur et trait de f' }).click();
	await page.getByRole('radio', { name: 'framboise' }).click();
	await page.keyboard.press('Escape');
	await openView(page, 'Données');
	await setConsole(page, false);
	await page.locator('td[role="gridcell"][data-cell="B2"]').click();
	await page.locator('#atelier-barre-cellule').fill('42');
	await page.locator('#atelier-barre-cellule').press('Enter');
	const lines = await historyTexts(page);

	const saved = await save(page, testInfo.outputPath('atelier.atelier.json'));
	await toolButton(page, 'Repartir de zéro').click();
	await page.getByRole('button', { name: 'Vider l’atelier', exact: true }).click();
	await expect(page.locator('article.objet')).toHaveCount(0);

	// Charger le fichier (atelier vide : sans confirmation) : tout revient, console comprise
	await load(page, saved);
	await expect.poll(async () => (await card(page, 'f')).latex).toBe('x^3');
	await expect(cardLocator(page, 'a')).toBeVisible();
	await cardLocator(page, 'f').getByRole('button', { name: 'Couleur et trait de f' }).click();
	await expect(page.getByRole('radio', { name: 'framboise' })).toBeChecked();
	await page.keyboard.press('Escape');
	await expect(page.locator('td[role="gridcell"][data-cell="B2"]')).toHaveAttribute(
		'aria-label',
		'B2 : 42'
	);
	const after = await historyTexts(page);
	for (const line of lines.filter((text) => text !== '')) expect(after).toContain(line);

	// Un ancien `calcul-….json` (exporté au début) → rejoué
	await load(page, history);
	await expect(page.getByRole('dialog', { name: 'Rejouer cet historique ?' })).toBeVisible();
	await page.getByRole('button', { name: 'Rejouer', exact: true }).click();
	await expect.poll(async () => (await card(page, 'f')).latex).toBe('x^2');

	// Une image, un .json quelconque → refus clair, rien ne change
	const before = (await page.locator('article.objet').count()) as number;
	await load(page, { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('PNG') });
	await expect(notices(page)).toContainText('Ce fichier n’est pas un atelier Chiphre.');
	await load(page, {
		name: 'notes.json',
		mimeType: 'application/json',
		buffer: Buffer.from('{"bonjour": 1}')
	});
	await expect(notices(page).locator('li')).toHaveCount(2);
	await expect(page.locator('article.objet')).toHaveCount(before);
});

test('#1530 — Repartir de zéro garde la console, Ctrl+Z après Charger, « Annuler » périmé', async ({
	page
}, testInfo) => {
	await calc(page, 'f(x) = x^2');
	await calc(page, 'a = 2');
	const lines = page.locator('ol.historique > li');
	await expect(lines).toHaveCount(2);

	// Repartir de zéro : la confirmation dit que la console garde ses lignes
	await toolButton(page, 'Repartir de zéro').click();
	const confirm = page.getByRole('dialog', { name: 'Repartir de zéro ?' });
	await expect(confirm).toContainText('La console garde ses lignes');
	await page.getByRole('button', { name: 'Vider l’atelier', exact: true }).click();
	await expect(page.locator('article.objet')).toHaveCount(0);
	// Les deux lignes restent, « Atelier vidé. » s'ajoute
	await expect(lines).toHaveCount(3);
	await expect(lines.last()).toContainText('Atelier vidé.');
	// Ctrl+Z rend f et a
	await page.locator('body').click({ position: { x: 5, y: 5 } });
	await page.keyboard.press('ControlOrMeta+Z');
	await expect(cardLocator(page, 'f')).toBeVisible();
	await expect(cardLocator(page, 'a')).toBeVisible();

	// Une loi, le repère de Géométrie masqué, Charger un fichier puis Ctrl+Z : P(X=3) se
	// calcule encore, le repère reste masqué
	const saved = testInfo.outputPath('atelier.atelier.json');
	const download = page.waitForEvent('download');
	await toolButton(page, 'Enregistrer l’atelier').click();
	await (await download).saveAs(saved);
	// La loi se tape `.binomiale X 10 0,5` ; « X suit B(10 ; 0,5) » est ce que la console
	// répond (tapé tel quel, il est refusé : « Il manque « ) » »)
	await calc(page, '.binomiale X 10 0,5');
	await openView(page, 'Géométrie');
	await setConsole(page, false);
	const axes = page.getByRole('checkbox', { name: 'Repère' });
	await axes.uncheck();
	await load(page, saved);
	await page.getByRole('button', { name: 'Charger', exact: true }).click();
	await expect(toast(page, 'Atelier chargé.')).toBeVisible();
	await page.locator('body').click({ position: { x: 5, y: 5 } });
	await page.keyboard.press('ControlOrMeta+Z');
	await expect(axes).not.toBeChecked();
	expect((await calc(page, 'P(X=3)')).refused).toBe(false);

	// Atelier sans objet ni grille, avec des lignes : Repartir de zéro grisé
	await toolButton(page, 'Repartir de zéro').click();
	await page.getByRole('button', { name: 'Vider l’atelier', exact: true }).click();
	await expect(toolButton(page, 'Repartir de zéro')).toHaveAttribute('aria-disabled', 'true');

	// Charger, modifier une carte, puis « Annuler » du message : « D'autres changements ont
	// suivi », rien n'est défait
	await load(page, saved);
	await expect(toast(page, 'Atelier chargé.')).toBeVisible();
	await calc(page, 'a = 7');
	await page
		.getByRole('region', { name: /^Notifications/ })
		.getByRole('listitem')
		.filter({ hasText: 'Atelier chargé.' })
		.getByRole('button', { name: 'Annuler', exact: true })
		.click();
	await expect(toast(page, /D[’']autres changements ont suivi/)).toBeVisible();
	await expect.poll(async () => (await card(page, 'a')).latex).toBe('7');
});
