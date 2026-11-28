import { expect, test, type Page } from '@playwright/test';
import { assertLocalServerEnv } from './helpers/carnet';
import { brouillons } from './helpers/modele-brouillon';

/**
 * Forme exigée : message de l'auteur (chantier `outil-formes-messages`, outils-manquants n° 75)
 * ============================================================================================
 *
 * Un modèle brouillon « 7/5 = entier + fraction plus petite que 1 », joué dans l'aperçu admin :
 * - l'élève tape 7/5 (l'erreur prévue, de la bonne valeur) → le message de l'erreur prévue ;
 * - il tape 14/10 (même valeur, autre écriture) → le message de forme de l'auteur ;
 * - l'éditeur montre le message sous le motif.
 *
 * Captures à l'œil : `.captures/verifs/message-de-forme/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());

const SHOTS = '.captures/verifs/message-de-forme';
const decor = brouillons('Verifs message de forme', SHOTS);
const { openPreview, validate, previewText, shootThemes } = decor;

const FORME = 'Le numérateur de la fraction doit être plus petit que 5.';
const RECOPIE = '7/5 n’est pas plus petite que 1 : il reste un entier dedans.';
const EXTRA = {
	blanks: [
		{
			expectedAnswer: '1+2/5',
			requiredForm: {
				pattern: 'a:integer + b:integer/c:integer',
				message: 'Le numérateur de la fraction doit être plus petit que {{d}}.'
			},
			expectedErrors: [{ answer: '7/5', message: RECOPIE }]
		}
	],
	variables: [{ name: 'd', expression: '5' }]
};
const STATEMENT =
	'Écris sous la forme d’un entier plus une fraction plus petite que 1 : $\\frac{7}{5}=?$';

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

test('l’élève recopie 7/5 : le message de l’erreur prévue', async ({ page }) => {
	await openPreview(page, 'recopie', STATEMENT, EXTRA);
	await taper(page, '7/5');
	await validate(page);
	await expect.poll(() => previewText(page)).toContain(RECOPIE);
	expect(await previewText(page)).not.toContain(FORME);
	await shootThemes(page, page.locator('#contenu-principal'), 'recopie');
});

test('l’élève écrit 14/10 : le message de forme de l’auteur', async ({ page }) => {
	await openPreview(page, 'autre-ecriture', STATEMENT, EXTRA);
	await taper(page, '14/10');
	await validate(page);
	await expect.poll(() => previewText(page)).toContain(FORME);
	expect(await previewText(page)).not.toContain('ne respecte pas la forme demandée');
	await shootThemes(page, page.locator('#contenu-principal'), 'autre-ecriture');
});

test('l’éditeur montre le message sous le motif', async ({ page }) => {
	const id = await openPreview(page, 'editeur', STATEMENT, {
		requiredForm: { pattern: 'a:integer + b:integer/c:integer', message: FORME }
	});
	await page.goto(`/dashboard/admin/questions/${id}/edit`);
	await page.waitForLoadState('networkidle');
	const champ = page.getByLabel('Message si la forme n’est pas respectée').first();
	// Le champ est dans les réglages repliés de la variation : les ouvrir s'il le faut
	if (!(await champ.isVisible())) {
		await page
			.getByText(/surcharges|réglages de la variation/i)
			.first()
			.click();
	}
	await expect(champ).toHaveValue(FORME);
	await champ.scrollIntoViewIfNeeded();
	await page.screenshot({ path: `${SHOTS}/editeur.png` });
});
