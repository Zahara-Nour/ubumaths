import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	calc,
	chooseSetting,
	mathConsole,
	mathValue,
	openAtelier,
	waitVirtualKeyboard
} from './helpers/atelier';

/**
 * Ligne Atelier du paquet 7 du tri (12 – 14 novembre)
 * ====================================================
 *
 * #2641 de `docs/wip/verifications-manuelles.md` : le modèle « sur [a;b] » sous
 * le champ de la console.
 */

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFINITION_MODEL = 'Modèle : g(t) = t² sur [0;3] — pour choisir l’ensemble';
const INTERVAL_MODEL = 'Modèle : [a;b], ]a;b[, [0;+∞[';

// ============================================================================
// FUNCTIONS
// ============================================================================

function textConsole(page: Page): Locator {
	return page.getByLabel('Calcul, définition ou commande');
}

/** La ligne « Modèle : » de la console (`CalculView.svelte`, `{uid}-modele`) */
function modelLine(page: Page): Locator {
	return page.locator('[id$="-modele"]');
}

/** Le texte de la ligne « Modèle : », espaces (insécables compris) ramenés à un seul */
async function modelText(page: Page): Promise<string> {
	return (await modelLine(page).innerText()).replace(/\s+/g, ' ').trim();
}

/** Les bords haut et bas du champ et de la ligne « Modèle : » */
async function positions(
	page: Page,
	field: Locator
): Promise<{ fieldTop: number; fieldBottom: number; modelTop: number; modelBottom: number }> {
	const fieldBox = await field.boundingBox();
	const lineBox = await modelLine(page).boundingBox();
	if (fieldBox === null || lineBox === null) throw new Error('Champ ou modèle non affiché');
	return {
		fieldTop: fieldBox.y,
		fieldBottom: fieldBox.y + fieldBox.height,
		modelTop: lineBox.y,
		modelBottom: lineBox.y + lineBox.height
	};
}

async function typeInMathConsole(page: Page, keys: string): Promise<void> {
	const field = mathConsole(page);
	await expect(async () => {
		await field.click();
		expect(await field.evaluate((element) => element === document.activeElement)).toBe(true);
		await waitVirtualKeyboard(page, field);
		await page.keyboard.type(keys);
		expect(await mathValue(field)).not.toBe('');
	}).toPass();
}

// ============================================================================
// TESTS
// ============================================================================

test('#2641 — modèle « sur [a;b] » sous la console, écriture au clavier', async ({ page }) => {
	await openAtelier(page);
	const field = textConsole(page);

	// Rien tant qu'aucune définition de fonction n'est commencée
	await field.fill('3+4');
	await expect(modelLine(page)).toHaveCount(0);
	// Une suite refuse « sur » : pas de modèle
	await field.fill('u(n) = 2n+1');
	await expect(modelLine(page)).toHaveCount(0);

	await field.fill('g(t) = 3t');
	await expect(modelLine(page)).toBeVisible();
	expect(await modelText(page)).toBe(DEFINITION_MODEL);

	// « sur » tapé à la suite : les écritures d'un ensemble
	await field.pressSequentially(' sur');
	await expect(modelLine(page)).toContainText('[a;b]');
	expect(await modelText(page)).toBe(INTERVAL_MODEL);
});

test('#2641 — Entrée calcule la ligne telle quelle, le modèle n’y ajoute rien', async ({
	page
}) => {
	await openAtelier(page);
	const field = textConsole(page);
	await field.fill('g(t) = 3t');
	await expect(modelLine(page)).toBeVisible();

	const definition = await calc(page, 'g(t) = 3t');
	expect(definition.refused).toBe(false);
	// Définie sur ℝ, sans « sur [0;3] » : g(5) existe (5 est hors de [0;3])
	expect(definition.text).not.toContain('[0;3]');
	await expect(modelLine(page)).toHaveCount(0);
	const value = await calc(page, 'g(5)');
	expect(value.refused).toBe(false);
	expect(value.latex).toBe('15');
});

test(
	'#2641 — modèle « sur [a;b] » sous la console, écriture mathématique',
	{ tag: '@clavier-mathlive' },
	async ({ page }) => {
		await openAtelier(page);
		await chooseSetting(page, 'Écriture mathématique');
		const field = mathConsole(page);

		await typeInMathConsole(page, '3+4');
		await expect(modelLine(page)).toHaveCount(0);
		await field.evaluate((element) => {
			(element as HTMLElement & { value: string }).value = '';
		});

		await typeInMathConsole(page, 'g(t)=3t');
		await expect(modelLine(page)).toBeVisible();
		expect(await modelText(page)).toBe(DEFINITION_MODEL);

		await page.keyboard.type('sur');
		await expect(modelLine(page)).toContainText('[a;b]');
		expect(await modelText(page)).toBe(INTERVAL_MODEL);
	}
);

test('#2641 — le modèle est dessiné au-dessus du champ (E65, tranché le 2026-11-24)', async ({
	page
}) => {
	await openAtelier(page);
	const field = textConsole(page);
	await field.fill('g(t) = 3t');
	await expect(modelLine(page)).toBeVisible();
	const seen = await positions(page, field);
	// La ligne « Modèle : » finit avant le haut du champ (la place du modèle des commandes,
	// depuis `decebfa925`) : David a gardé cette place, la ligne #2641 disait « sous le champ »
	expect(seen.modelBottom, 'le modèle est au-dessus du champ').toBeLessThanOrEqual(
		seen.fieldTop + 1
	);
});
