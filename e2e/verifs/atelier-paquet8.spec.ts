import { expect, test, type Locator, type Page } from '@playwright/test';
import { openAtelier, openSettings } from './helpers/atelier';
import { openView, setConsole } from './helpers/grille';

/**
 * Lignes Atelier du paquet 8 du tri (15 – 18 novembre)
 * =====================================================
 *
 * #2678 et #2691 de `docs/wip/verifications-manuelles.md` : les outils du graphe
 * repliables, et la fenêtre « Réglages » qui défile sur un écran court.
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/** Hauteur d'un écran court : un téléphone couché, une fenêtre basse */
const SHORT_HEIGHT = 420;

const TOOLS = ['Zoom avant', 'Zoom arrière', 'Réinitialiser la vue'];

// ============================================================================
// FUNCTIONS
// ============================================================================

function button(page: Page, name: string): Locator {
	return page.getByRole('button', { name, exact: true });
}

/** Appuie au doigt sur un téléphone, à la souris sinon */
async function press(locator: Locator, hasTouch: boolean | undefined): Promise<void> {
	if (hasTouch) await locator.tap();
	else await locator.click();
}

async function openGraph(page: Page): Promise<void> {
	await openAtelier(page);
	await openView(page, 'Graphe');
	// La console ouverte couvre les boutons du graphe
	await setConsole(page, false);
}

async function expectToolsCollapsed(page: Page): Promise<void> {
	await expect(button(page, 'Afficher les outils du graphe')).toBeVisible();
	for (const tool of TOOLS) await expect(button(page, tool)).toHaveCount(0);
}

// ============================================================================
// TESTS
// ============================================================================

test('#2678 — le bouton replie les outils du graphe, et la page rechargée les garde repliés', async ({
	page,
	hasTouch
}) => {
	await openGraph(page);
	for (const tool of TOOLS) await expect(button(page, tool)).toBeVisible();

	await press(button(page, 'Replier les outils du graphe'), hasTouch);
	await expectToolsCollapsed(page);
	await expect(button(page, 'Agrandir le graphe')).toHaveCount(0);

	await page.reload();
	await openView(page, 'Graphe');
	await setConsole(page, false);
	await expectToolsCollapsed(page);

	// Et ils se déplient
	await press(button(page, 'Afficher les outils du graphe'), hasTouch);
	for (const tool of TOOLS) await expect(button(page, tool)).toBeVisible();
});

test('#2678 — graphe agrandi puis outils repliés : « Réduire » reste visible et marche', async ({
	page,
	hasTouch
}) => {
	await openGraph(page);
	await press(button(page, 'Agrandir le graphe'), hasTouch);
	const reduce = button(page, 'Réduire le graphe');
	await expect(reduce).toBeVisible();

	await press(button(page, 'Replier les outils du graphe'), hasTouch);
	await expectToolsCollapsed(page);
	await expect(reduce).toBeVisible();
	// Entièrement dans la fenêtre : atteignable au doigt
	const box = await reduce.boundingBox();
	const viewport = page.viewportSize();
	if (box === null || viewport === null) throw new Error('« Réduire » non dessiné');
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.y).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
	expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

	await press(reduce, hasTouch);
	await expect(reduce).toHaveCount(0);
	// Le graphe n'est plus agrandi : les vues de l'atelier sont de retour
	await expect(page.getByRole('navigation', { name: "Vues de l'atelier" })).toBeVisible();
	await expectToolsCollapsed(page);
});

test('#2691 — sur un écran court, la fenêtre « Réglages » défile jusqu’à sa dernière option', async ({
	page
}) => {
	const viewport = page.viewportSize();
	if (viewport === null) throw new Error('Fenêtre sans taille');
	await page.setViewportSize({ width: viewport.width, height: SHORT_HEIGHT });
	await openAtelier(page);
	const dialog = await openSettings(page);

	// La fenêtre tient dans l'écran et son contenu la dépasse : elle doit défiler
	const sizes = await dialog.evaluate((element) => ({
		top: element.getBoundingClientRect().top,
		bottom: element.getBoundingClientRect().bottom,
		client: element.clientHeight,
		scroll: element.scrollHeight
	}));
	expect(sizes.top).toBeGreaterThanOrEqual(0);
	expect(sizes.bottom).toBeLessThanOrEqual(SHORT_HEIGHT);
	expect(sizes.scroll).toBeGreaterThan(sizes.client);

	// La dernière option : hors de vue d'abord, visible et cliquable une fois défilée
	const options = dialog.getByRole('radio');
	expect(await options.count()).toBeGreaterThan(3);
	const last = options.last();
	const before = await last.boundingBox();
	if (before === null) throw new Error('Dernière option non dessinée');
	expect(before.y).toBeGreaterThan(sizes.bottom);

	await dialog.evaluate((element) => element.scrollTo(0, element.scrollHeight));
	await expect
		.poll(async () => {
			const box = await last.boundingBox();
			return box === null ? Infinity : box.y + box.height;
		})
		.toBeLessThanOrEqual(sizes.bottom);
	await last.click();
	await expect(last).toBeChecked();
});
