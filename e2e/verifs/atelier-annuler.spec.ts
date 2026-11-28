import { expect, test, type Locator, type Page } from '@playwright/test';
import { calc, cardLocator, mathConsole, openAtelier, showCards } from './helpers/atelier';
import { openView, setConsole, shownIn, typeCell } from './helpers/grille';

/**
 * Annuler / Rétablir de l'Atelier (lot 5, PR 1 à 3)
 * ================================================
 *
 * Reprend les lignes « Annuler / Rétablir (lot 5, PR 1 / 2 / 3) » de
 * `docs/wip/verifications-manuelles.md`. Elles demandaient Safari et Chrome :
 * le fichier tourne sur tous les projets de `pnpm test:verifs:tout`, les
 * raccourcis au clavier seulement sur ordinateur (`@bureau`).
 */

// ============================================================================
// FUNCTIONS
// ============================================================================

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

/** Le bouton ↶ (son nom dit l'étape qu'il défait) */
function undoButton(page: Page): Locator {
	return page.getByRole('toolbar', { name: 'Outils de l’atelier' }).getByRole('button', {
		name: /^Annuler/
	});
}

function redoButton(page: Page): Locator {
	return page.getByRole('toolbar', { name: 'Outils de l’atelier' }).getByRole('button', {
		name: /^Rétablir/
	});
}

/** Choisit une autre couleur pour la courbe de `name` */
async function recolor(page: Page, name: string): Promise<void> {
	await showCards(page);
	await cardLocator(page, name)
		.getByRole('button', { name: `Couleur et trait de ${name}` })
		.click();
	const colors = page.getByRole('radiogroup', { name: 'Couleur de la courbe' }).getByRole('radio');
	// Une couleur qui n'est pas celle cochée
	const count = await colors.count();
	for (let index = 0; index < count; index++) {
		if ((await colors.nth(index).getAttribute('aria-checked')) !== 'true') {
			await colors.nth(index).click();
			break;
		}
	}
	await page.keyboard.press('Escape');
}

// ============================================================================
// TESTS
// ============================================================================

test('Annuler / Rétablir (lot 5, PR 1) — ↶ nomme chaque étape et la défait, ↷ la refait', async ({
	page
}) => {
	await expect(undoButton(page)).toHaveAccessibleName('Annuler');
	await calc(page, 'f(x) = x^2');
	await expect(undoButton(page)).toHaveAccessibleName(/^Annuler : .*f/);
	await recolor(page, 'f');
	await expect(undoButton(page)).toHaveAccessibleName('Annuler : couleur de f');
	await calc(page, 'g(x)=2x');
	await expect(undoButton(page)).toHaveAccessibleName('Annuler : « g(x)=2x »');
	await openView(page, 'Données');
	await typeCell(page, 'A1', '3');
	await expect(undoButton(page)).toHaveAccessibleName('Annuler : modifier la grille');

	// Chaque clic défait une étape ; le nom passe à la précédente
	await undoButton(page).click();
	await expect.poll(() => shownIn(page, 'A1')).toBe('vide');
	await expect(undoButton(page)).toHaveAccessibleName('Annuler : « g(x)=2x »');
	await expect(redoButton(page)).toHaveAccessibleName('Rétablir : modifier la grille');
	await undoButton(page).click();
	await showCards(page);
	await expect(cardLocator(page, 'g')).toHaveCount(0);
	await expect(undoButton(page)).toHaveAccessibleName('Annuler : couleur de f');
	await undoButton(page).click();
	await expect(undoButton(page)).toHaveAccessibleName(/^Annuler : .*f/);
	await undoButton(page).click();
	await expect(cardLocator(page, 'f')).toHaveCount(0);
	await expect(undoButton(page)).toHaveAccessibleName('Annuler');

	// ↷ refait dans l'ordre
	await redoButton(page).click();
	await expect(cardLocator(page, 'f')).toHaveCount(1);
	await redoButton(page).click();
	await redoButton(page).click();
	await expect(cardLocator(page, 'g')).toHaveCount(1);
	await redoButton(page).click();
	await openView(page, 'Données');
	await expect.poll(() => shownIn(page, 'A1')).toBe('3');

	// Recharger : plus rien à annuler
	await page.reload();
	await expect(undoButton(page)).toHaveAccessibleName('Annuler');
});

test(
	'Annuler / Rétablir (lot 5, PR 1) — Ctrl+Z / Ctrl+Y hors champ ; dans la console, la frappe',
	{ tag: '@bureau' },
	async ({ page }) => {
		await calc(page, 'f(x) = x^2');
		await calc(page, 'g(x)=2x');
		await page.locator('body').click({ position: { x: 2, y: 2 } });
		await page.keyboard.press('ControlOrMeta+Z');
		await expect(cardLocator(page, 'g')).toHaveCount(0);
		// Ctrl+Y (et ⌘⇧Z sur Mac) rétablit
		await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y');
		await expect(cardLocator(page, 'g')).toHaveCount(1);

		// Dans le champ de la console, Ctrl+Z défait la frappe, pas l'atelier
		const field = page.getByLabel('Calcul, définition ou commande');
		await field.fill('');
		await field.pressSequentially('h(x)');
		await field.press('ControlOrMeta+Z');
		await expect(cardLocator(page, 'g')).toHaveCount(1);
		expect(await field.inputValue()).not.toBe('h(x)');
	}
);

test('Annuler / Rétablir (lot 5, PR 1) — carte supprimée : le toast puis ↶ la remettent', async ({
	page
}) => {
	await calc(page, 'f(x) = x^2');
	await showCards(page);
	await cardLocator(page, 'f').getByRole('button', { name: 'Options de f' }).click();
	await page.getByRole('menuitem', { name: 'Supprimer', exact: true }).click();
	await expect(cardLocator(page, 'f')).toHaveCount(0);
	await page.getByRole('button', { name: 'Annuler', exact: true }).last().click();
	await expect(cardLocator(page, 'f')).toHaveCount(1);
	// Supprimée de nouveau, le toast parti : ↶ la remet encore
	await cardLocator(page, 'f').getByRole('button', { name: 'Options de f' }).click();
	await page.getByRole('menuitem', { name: 'Supprimer', exact: true }).click();
	await expect(cardLocator(page, 'f')).toHaveCount(0);
	await undoButton(page).click();
	await expect(cardLocator(page, 'f')).toHaveCount(1);
});

test('Annuler / Rétablir (lot 5, PR 2) — curseur de a : une étape par geste', async ({ page }) => {
	await calc(page, 'a = 2');
	await calc(page, 'f(x) = a x');
	await showCards(page);
	const slider = cardLocator(page, 'a').getByRole('slider');
	const before = await slider.getAttribute('aria-valuenow');
	// Glisser (souris ou doigt) : une seule étape
	const box = await slider.boundingBox();
	if (box === null) throw new Error('curseur sans boîte');
	const y = box.y + box.height / 2;
	await page.mouse.move(box.x + box.width / 2, y);
	await page.mouse.down();
	for (let step = 1; step <= 5; step++) await page.mouse.move(box.x + box.width / 2 + step * 8, y);
	await page.mouse.up();
	await expect(slider).not.toHaveAttribute('aria-valuenow', before ?? '');
	await expect(undoButton(page)).toHaveAccessibleName('Annuler : curseur de a');
	await undoButton(page).click();
	await expect(slider).toHaveAttribute('aria-valuenow', before ?? '');
	await expect(undoButton(page)).not.toHaveAccessibleName('Annuler : curseur de a');
});

test(
	'Annuler / Rétablir (lot 5, PR 2) — trois flèches = trois étapes ; console barrée',
	{ tag: '@bureau' },
	async ({ page }) => {
		await calc(page, 'a = 2');
		await calc(page, 'f(x) = a x');
		await showCards(page);
		const slider = cardLocator(page, 'a').getByRole('slider');
		const before = await slider.getAttribute('aria-valuenow');
		await slider.focus();
		for (let press = 0; press < 3; press++) await slider.press('ArrowRight');
		for (let press = 0; press < 3; press++) await undoButton(page).click();
		await expect(slider).toHaveAttribute('aria-valuenow', before ?? '');

		// Une ligne de console annulée est barrée (« Annulée : … »), « Annulé : … » s'écrit
		const lines = page.locator('ol.historique > li');
		const struck = lines.filter({ hasText: 'b = 2' }).and(page.locator('li.annulee'));
		await calc(page, 'b = 2');
		await page.locator('body').click({ position: { x: 2, y: 2 } });
		await page.keyboard.press('ControlOrMeta+Z');
		await expect(struck).toHaveCount(1);
		await expect(lines.last()).toContainText('Annulé : « b = 2 »');
		// Ctrl+Y (⌘⇧Z sur Mac) la débarre
		await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y');
		await expect(struck).toHaveCount(0);
		// Annulée de nouveau puis la page rechargée : elle reste barrée
		await page.keyboard.press('ControlOrMeta+Z');
		await expect(struck).toHaveCount(1);
		await page.reload();
		await expect(struck).toHaveCount(1);
	}
);

test('Annuler / Rétablir (lot 5, PR 2) — /atelier?f=x^2 : rien à annuler', async ({ page }) => {
	await page.goto('/atelier?f=x^2');
	await page.waitForLoadState('networkidle');
	await expect(undoButton(page)).toHaveAccessibleName('Annuler');
});

test('Annuler / Rétablir (lot 5, PR 3) — « Repartir de zéro » puis ↶ rend tout', async ({
	page
}) => {
	await calc(page, 'f(x) = x^2');
	await calc(page, 'a = 3');
	await openView(page, 'Données');
	await typeCell(page, 'A1', '7');
	await setConsole(page, true);
	const field = mathConsole(page).or(page.getByLabel('Calcul, définition ou commande'));
	await expect(field.first()).toBeVisible();
	await page
		.getByRole('toolbar', { name: 'Outils de l’atelier' })
		.getByRole('button', { name: /Repartir de zéro/ })
		.click();
	const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog'));
	await confirm.getByRole('button', { name: /Repartir|Confirmer|Vider/ }).click();
	await showCards(page);
	await expect(cardLocator(page, 'f')).toHaveCount(0);
	await undoButton(page).click();
	await expect(cardLocator(page, 'f')).toHaveCount(1);
	await expect(cardLocator(page, 'a')).toHaveCount(1);
	await openView(page, 'Données');
	await expect.poll(() => shownIn(page, 'A1')).toBe('7');
});
