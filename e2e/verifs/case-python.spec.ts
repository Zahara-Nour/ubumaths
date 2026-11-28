import { expect, test, type Page } from '@playwright/test';
import { assertLocalServerEnv } from './helpers/carnet';
import { brouillons } from './helpers/modele-brouillon';

/**
 * Case « programme Python » (bloc ```python-a-ecrire, chantier `outil-python`, outil 49)
 * =====================================================================================
 *
 * Un modèle brouillon joué dans l'aperçu admin : l'élève écrit `seuil(A)`, valide ; le
 * programme tourne dans le navigateur (Pyodide), comparé à la solution de l'auteur :
 * - une fonction juste → juste ;
 * - le cas du bord raté (`seuil(2)`) → faux, message du premier essai raté ;
 * - une erreur de syntaxe → faux, message avec la ligne.
 *
 * Ce que ces tests ne voient pas : le premier chargement de Pyodide sur un vrai téléphone.
 *
 * Captures à l'œil : `.captures/verifs/case-python/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
// Pyodide se charge au premier essai (CDN, ~10 Mo) : plus long qu'un bloc ordinaire
test.setTimeout(120_000);

const SHOTS = '.captures/verifs/case-python';
const decor = brouillons('Verifs python', SHOTS);
const { openPreview, validate, previewText, shootThemes } = decor;

const STATEMENT = [
	'La suite $u$ est définie par $u_0 = 2$ et $u_{n+1} = 1{,}5\\,u_n$. Écris la fonction `seuil(A)` qui rend le plus petit rang $n$ tel que $u_n > A$.',
	'',
	'```python-a-ecrire',
	'fonction: seuil',
	'depart: |',
	'  def seuil(A):',
	'      u = 2',
	'      n = 0',
	'      while ...:',
	'          ...',
	'      return n',
	'solution: |',
	'  def seuil(A):',
	'      u = 2',
	'      n = 0',
	'      while u <= A:',
	'          u = 1.5 * u',
	'          n = n + 1',
	'      return n',
	'essais: seuil(2) ; seuil(100) ; seuil(10000)',
	'exiger: boucle',
	'```'
].join('\n');

const JUSTE = [
	'def seuil(A):',
	'    u = 2',
	'    n = 0',
	'    while u <= A:',
	'        u = 1.5 * u',
	'        n = n + 1',
	'    return n'
].join('\n');

// `<` au lieu de `<=` : seuil(2) rend 0 au lieu de 1
const BORD_RATE = JUSTE.replace('u <= A', 'u < A');

const SYNTAXE = JUSTE.replace('while u <= A:', 'while u <= A');

const caseZone = (page: Page) => page.locator('[data-python-case]:visible').first();

/** Remplace le code de l'éditeur (insertion brute : pas d'indentation automatique) */
async function ecrire(page: Page, code: string): Promise<void> {
	const editeur = caseZone(page).locator('.cm-content');
	await editeur.click();
	await page.keyboard.press('ControlOrMeta+A');
	await page.keyboard.press('Delete');
	await page.keyboard.insertText(code);
}

async function attendreVerdict(page: Page): Promise<void> {
	await expect(caseZone(page).getByText('Ton programme tourne…')).toHaveCount(0, {
		timeout: 90_000
	});
}

test('une fonction juste est juste', async ({ page }) => {
	await openPreview(page, 'juste', STATEMENT);
	await expect(caseZone(page)).toBeVisible();
	await shootThemes(page, caseZone(page), 'depart');
	await ecrire(page, JUSTE);
	await validate(page);
	await attendreVerdict(page);
	const texte = await previewText(page);
	expect(texte).not.toContain('on attendait');
	// Le badge de la carte (vu à l'écran : il disait « Faux » quand la case disait « juste »)
	await expect(page.getByText('Juste', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
	await expect(page.getByText('Faux', { exact: true })).toHaveCount(0);
	await shootThemes(page, page.locator('main'), 'juste');
});

test('le cas du bord raté : faux, premier essai raté cité', async ({ page }) => {
	await openPreview(page, 'bord', STATEMENT);
	await ecrire(page, BORD_RATE);
	await validate(page);
	await attendreVerdict(page);
	await expect.poll(() => previewText(page), { timeout: 30_000 }).toContain('seuil(2)');
	expect(await previewText(page)).toContain('on attendait 1');
	await shootThemes(page, page.locator('main'), 'bord-rate');
});

test('une erreur de syntaxe : faux, la ligne est donnée', async ({ page }) => {
	await openPreview(page, 'syntaxe', STATEMENT);
	await ecrire(page, SYNTAXE);
	await validate(page);
	await attendreVerdict(page);
	await expect.poll(() => previewText(page), { timeout: 30_000 }).toMatch(/ligne 4/i);
	await shootThemes(page, page.locator('main'), 'syntaxe');
});
