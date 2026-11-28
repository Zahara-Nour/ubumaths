import { expect, test, type Locator, type Page } from '@playwright/test';
import { assertLocalServerEnv } from './helpers/carnet';
import { brouillons, fence } from './helpers/modele-brouillon';

/**
 * Bloc ```courbe : construire l'escalier de uₙ₊₁ = f(uₙ) dans l'aperçu admin (outil 48)
 * ====================================================================================
 *
 * L'élève pose u₁, u₂… sur l'axe des abscisses ; sa marche se dessine après chaque terme. Chaque
 * terme se juge depuis le terme précédent DE L'ÉLÈVE, marge 3 % de la largeur (décision de David
 * du 2026-11-28, journal `docs/wip/outil-escalier-suite-progress.md`) :
 * - escalier juste (√(2x + 3), u₀ = 0) → juste ;
 * - u₁ faux, u₂ et u₃ justes depuis le u₁ de l'élève → faux, une seule phrase, la correction ;
 * - spirale (−0,5x + 3) juste → juste ;
 * - un toucher du repère pose bien le terme là où on touche.
 *
 * Les termes se posent au clavier (flèches, pas de 0,01) : la valeur posée est exacte. Le
 * toucher est vérifié à part, à la louche.
 *
 * Captures à l'œil : `.captures/verifs/bloc-courbe-construire/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());

const SHOTS = '.captures/verifs/bloc-courbe-construire';
const decor = brouillons('Verifs construire', SHOTS);
const { openPreview, validate, shootThemes } = decor;

const ESCALIER = `Construis u₁, u₂ et u₃ sur l'axe des abscisses.\n\n${fence(
	'courbe',
	'x: 0 ; 4',
	'y: 0 ; 4',
	'grille: 1',
	'u(0) = 0 ; u(n+1) = sqrt(2*u(n)+3) pour n de 0 à 3 construire 3'
)}`;

const SPIRALE = `Construis u₁ à u₄ sur l'axe des abscisses.\n\n${fence(
	'courbe',
	'x: 0 ; 4',
	'y: 0 ; 4',
	'grille: 1',
	'u(0) = 0 ; u(n+1) = -0.5*u(n)+3 pour n de 0 à 4 construire 4'
)}`;

/** Le repère de la carte jouée (l'aperçu rend d'autres copies, cachées) */
function zoneOf(page: Page): Locator {
	return page.getByRole('slider', { name: /termes de ton escalier/ }).locator('visible=true');
}

/** Pose le terme de rang `rank` (0 = u₁) à `value`, au clavier */
async function setTerm(page: Page, rank: number, value: number): Promise<void> {
	const zone = zoneOf(page).first();
	const labels = page.getByRole('button', { name: /^Terme / }).locator('visible=true');
	if ((await labels.count()) > 1) await labels.nth(rank).click();
	await zone.focus();
	// Première flèche : le terme se pose sur le précédent
	await page.keyboard.press('ArrowRight');
	const start = Number(await zone.getAttribute('aria-valuenow'));
	const steps = Math.round((value - start) * 100);
	const key = steps >= 0 ? 'ArrowRight' : 'ArrowLeft';
	for (let i = 0; i < Math.abs(steps); i++) await page.keyboard.press(key);
	await expect(zone).toHaveAttribute('aria-valuenow', String(value));
}

test('escalier juste : juste', async ({ page }) => {
	await openPreview(page, 'escalier juste', ESCALIER);
	const zone = zoneOf(page).first();
	await expect(zone).toBeVisible({ timeout: 30_000 });
	await shootThemes(page, zone, 'vide');
	await setTerm(page, 0, 1.73);
	await setTerm(page, 1, 2.54);
	await setTerm(page, 2, 2.84);
	await shootThemes(page, zone, 'escalier-pose');
	await validate(page);
	await expect(
		page.getByRole('status').filter({ hasText: 'réponse juste' }).first()
	).toBeAttached();
	await shootThemes(page, zone, 'escalier-juste');
});

test('u₁ faux, la suite juste depuis lui : une seule phrase et la correction', async ({ page }) => {
	await openPreview(page, 'u1 faux', ESCALIER);
	const zone = zoneOf(page).first();
	await expect(zone).toBeVisible({ timeout: 30_000 });
	await setTerm(page, 0, 2.2);
	// f(2,2) = √7,4 ≈ 2,720 ; f(2,72) = √8,44 ≈ 2,905
	await setTerm(page, 1, 2.72);
	await setTerm(page, 2, 2.91);
	await validate(page);
	await expect(
		page.getByRole('status').filter({ hasText: 'réponse fausse' }).first()
	).toBeAttached();
	const text = (await page.locator('#contenu-principal').innerText()).replace(/\s+/g, ' ');
	expect(text).toMatch(/1,73/);
	expect(text).not.toMatch(/2,72|2,91/);
	await expect(page.getByText('Correction').locator('visible=true').first()).toBeVisible();
	await shootThemes(page, page.getByText('Correction').locator('visible=true').first(), 'u1-faux');
	// La carte de correction entière (l'appli défile dans un cadre intérieur)
	await page
		.locator('.correction-card-wrapper')
		.locator('visible=true')
		.first()
		.screenshot({ path: `${SHOTS}/u1-faux-carte.png` });
	await page
		.locator('.construire-correction')
		.locator('visible=true')
		.first()
		.screenshot({ path: `${SHOTS}/u1-faux-correction.png` });
});

test('spirale juste : juste', async ({ page }) => {
	await openPreview(page, 'spirale', SPIRALE);
	const zone = zoneOf(page).first();
	await expect(zone).toBeVisible({ timeout: 30_000 });
	await setTerm(page, 0, 3);
	await setTerm(page, 1, 1.5);
	await setTerm(page, 2, 2.25);
	await setTerm(page, 3, 1.88);
	await shootThemes(page, zone, 'spirale-posee');
	await validate(page);
	await expect(
		page.getByRole('status').filter({ hasText: 'réponse juste' }).first()
	).toBeAttached();
});

test('un toucher du repère pose le terme là où on touche', async ({ page }) => {
	await openPreview(page, 'toucher', ESCALIER);
	const zone = zoneOf(page).first();
	await expect(zone).toBeVisible({ timeout: 30_000 });
	await zone.scrollIntoViewIfNeeded();
	// L'axe des abscisses est le bas du repère (y de 0 à 4) : on vise x = 2 par la grille dessinée
	const svg = zone.locator('svg').first();
	const box = await svg.boundingBox();
	if (!box) throw new Error('repère sans boîte');
	await page.mouse.click(box.x + box.width / 2, box.y + box.height - 20);
	// Le terme posé, l'étiquette passe au suivant : revenir à u₁ pour lire sa valeur
	await page
		.getByRole('button', { name: /^Terme / })
		.locator('visible=true')
		.first()
		.click();
	const value = Number(await zone.getAttribute('aria-valuenow'));
	expect(value).toBeGreaterThan(1.6);
	expect(value).toBeLessThan(2.4);
	await shootThemes(page, zone, 'toucher');
});
