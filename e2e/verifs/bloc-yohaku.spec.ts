import { expect, test, type Page } from '@playwright/test';
import { yohakuEntry } from '../../src/lib/block-catalog/yohaku';
import { assertLocalServerEnv } from './helpers/carnet';
import { brouillons } from './helpers/modele-brouillon';

/**
 * Bloc ```yohaku : la grille à remplir jouée dans l'aperçu admin (chantier `outil-yohaku`)
 * ======================================================================================
 *
 * Le bloc de départ est l'exemple « Produits de binômes » de `/aide-ecriture/blocs/yohaku`, lu
 * dans `src/lib/block-catalog/yohaku.ts`. L'élève tape dans les champs MathLive, valide :
 * - la solution de l'auteur → juste ;
 * - un autre remplissage juste (tous les signes changés) → juste aussi ;
 * - la 2e ligne fausse → faux, message et totaux faux en rouge.
 *
 * Ce que ces tests ne voient pas : le clavier virtuel du vrai iPhone.
 *
 * Captures à l'œil : `.captures/verifs/bloc-yohaku/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());

const SHOTS = '.captures/verifs/bloc-yohaku';
const decor = brouillons('Verifs yohaku', SHOTS);
const { openPreview, validate, previewText, shootThemes } = decor;

function exemple(title: string): string {
	const found = yohakuEntry.examples.find((example) => example.title === title);
	if (!found) throw new Error(`exemple introuvable dans le catalogue : ${title}`);
	return found.source;
}

const STATEMENT = `Complète la grille.\n\n${exemple('Produits de binômes')}`;

/** Tape une formule dans le champ de rang `rang` de la grille */
async function remplir(page: Page, valeurs: string[]): Promise<void> {
	// L'aperçu a plusieurs grilles (dont des cachées) : les champs visibles de la première
	const champs = page.locator('[data-yohaku]:visible').first().locator('math-field');
	await expect(champs).toHaveCount(valeurs.length);
	for (const [i, valeur] of valeurs.entries()) {
		const champ = champs.nth(i);
		const nom = await champ.getAttribute('aria-label');
		await champ.scrollIntoViewIfNeeded();
		await champ.click();
		// MathLive prend le focus un peu après le clic : une frappe trop tôt partirait dans la page
		await expect
			.poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label')))
			.toBe(nom);
		await page.keyboard.type(valeur, { delay: 80 });
	}
}

test('la solution de l’auteur est juste', async ({ page }) => {
	await openPreview(page, 'solution', STATEMENT);
	await remplir(page, ['x+2', 'x+3', '2x+1']);
	await shootThemes(page, page.locator('[data-yohaku]:visible').first(), 'saisie');
	await validate(page);
	await expect(page.locator('[data-yohaku]:visible').first()).toHaveAttribute('data-etat', 'juste');
	await shootThemes(page, page.locator('[data-yohaku]:visible').first(), 'juste');
});

test('un autre remplissage juste est juste (toutes les cases à remplir)', async ({ page }) => {
	// Solution de l'auteur : x+2 | x+3 / 2x+1 | x+1 ; tous les signes changés, les produits ne
	// changent pas : la grille de l'élève est juste sans être celle de l'auteur
	const libre = [
		'Complète la grille.',
		'',
		'```yohaku',
		'opération: produit',
		'ligne: [x+2] | [x+3]',
		'ligne: [2x+1] | [x+1]',
		'```'
	].join('\n');
	await openPreview(page, 'autre', libre);
	await remplir(page, ['-x-2', '-x-3', '-2x-1', '-x-1']);
	await validate(page);
	await expect(page.locator('[data-yohaku]:visible').first()).toHaveAttribute('data-etat', 'juste');
});

test('la 2e ligne fausse : faux, message, totaux en rouge', async ({ page }) => {
	await openPreview(page, 'faux', STATEMENT);
	await remplir(page, ['x+2', 'x+3', '2x+2']);
	await validate(page);
	await expect(page.locator('[data-yohaku]:visible').first()).toHaveAttribute('data-etat', 'faux');
	expect(await previewText(page)).toContain('ne donnent pas le bon produit');
	await shootThemes(page, page.locator('[data-yohaku]:visible').first(), 'faux');
});
