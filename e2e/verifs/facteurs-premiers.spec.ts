import { expect, test, type Page } from '@playwright/test';
import { assertLocalServerEnv } from './helpers/carnet';
import { brouillons } from './helpers/modele-brouillon';

/**
 * Forme exigée « produit de facteurs premiers » (chantier `outil-formes-messages`, n° 76)
 * =====================================================================================
 *
 * Un modèle brouillon « décompose 84 », joué dans l'aperçu admin :
 * - l'élève tape 4 × 21 → « 4 et 21 ne sont pas des nombres premiers. » (formules rendues) ;
 * - puissances exigées, il tape 2 × 2 × 3 × 7 → demi-point et « Regroupe les facteurs égaux en
 *   puissance : 2² × 3 × 7. ».
 *
 * Captures à l'œil : `.captures/verifs/facteurs-premiers/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());

const SHOTS = '.captures/verifs/facteurs-premiers';
const decor = brouillons('Verifs facteurs premiers', SHOTS);
const { openPreview, validate, previewText, shootThemes } = decor;

const STATEMENT = 'Décompose $84$ en produit de facteurs premiers : $84=?$';

/** Tape la réponse dans la case de la carte jouée */
async function taper(page: Page, saisie: string): Promise<void> {
	const field = page.locator('math-field:visible').first();
	await field.scrollIntoViewIfNeeded();
	const box = await field.boundingBox();
	if (!box) throw new Error('case de réponse introuvable');
	await field.click({ position: { x: Math.max(5, box.width - 15), y: box.height / 2 } });
	await page.waitForTimeout(500);
	await page.keyboard.type(saisie, { delay: 80 });
}

test('4 × 21 : les facteurs non premiers sont nommés', async ({ page }) => {
	await openPreview(page, 'non-premiers', STATEMENT, {
		blanks: [{ expectedAnswer: '84', requiredForm: 'primeFactors' }]
	});
	await taper(page, '4*21');
	await validate(page);
	await expect.poll(() => previewText(page)).toContain('ne sont pas des nombres premiers');
	expect(await previewText(page)).not.toContain('$');
	await shootThemes(page, page.locator('#contenu-principal'), 'non-premiers');
});

test('puissances exigées, 2 × 2 × 3 × 7 : demi-point et écriture regroupée', async ({ page }) => {
	await openPreview(page, 'regrouper', STATEMENT, {
		blanks: [{ expectedAnswer: '84', requiredForm: 'primeFactorsPowers' }]
	});
	await taper(page, '2*2*3*7');
	await validate(page);
	await expect.poll(() => previewText(page)).toContain('Regroupe les facteurs égaux en puissance');
	expect(await previewText(page)).not.toContain('$');
	await shootThemes(page, page.locator('#contenu-principal'), 'regrouper');
});
