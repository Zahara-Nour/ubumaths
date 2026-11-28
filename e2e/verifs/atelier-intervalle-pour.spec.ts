import { expect, test, type Locator } from '@playwright/test';
import { calc, card, normalizeLatex, openAtelier, retypeCard } from './helpers/atelier';
import { setConsole } from './helpers/grille';

/**
 * Fonction définie par une condition dans l'Atelier (chantier `fonctions-domaines`)
 * ================================================================================
 *
 * `f(x) = x pour x > 2` vaut `f(x) = x sur ]2;+∞[` : le champ de la carte
 * réaffiche ce qui a été tapé (« pour »), et la courbe ne part que
 * de x = 2 — plus à droite que celle de `g(x) = x`, sans restriction. Dans la
 * carte, MathLive colle les lettres (`xpour2<x<4`) : la condition doit se lire.
 */

/** L'abscisse (px du SVG) la plus à gauche d'un tracé : premier nombre de chaque commande */
async function leftmostX(curve: Locator): Promise<number> {
	const d = (await curve.getAttribute('d')) ?? '';
	const xs = [...d.matchAll(/[ML]\s*(-?[\d.]+)[ ,]/g)].map((match) => Number(match[1]));
	return Math.min(...xs);
}

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

test('Calcul : f(x) = x pour x > 2, carte et tracé restreint', async ({ page }) => {
	const answer = await calc(page, 'f(x) = x pour x > 2');
	expect(answer.refused).toBe(false);
	await calc(page, 'g(x) = x');

	const f = await card(page, 'f');
	expect(normalizeLatex(f.latex ?? '')).toBe(normalizeLatex('x\\text{ pour }x>2'));
	expect(f.message).toBeNull();

	const curves = page.locator('path.function-curve');
	await expect(curves).toHaveCount(2);
	await setConsole(page, false);
	await expect.poll(() => curves.first().getAttribute('d')).not.toBe('');
	// La courbe de f commence à x = 2, celle de g bien avant
	expect(await leftmostX(curves.first())).toBeGreaterThan((await leftmostX(curves.nth(1))) + 10);
	await page.screenshot({ path: test.info().outputPath('pour-x-sup-2.png'), fullPage: false });
});

test('la carte : « pour 2 < x < 4 » tapé dans le champ', async ({ page }) => {
	await calc(page, 'g(x) = x');
	await retypeCard(page, 'g', 'x pour 2<x<4');
	await page.keyboard.press('Enter');

	await expect.poll(async () => (await card(page, 'g')).message).toBeNull();
	// L'ensemble est pris : g(3) se calcule, g(1) est refusé
	expect((await calc(page, 'g(3)')).refused).toBe(false);
	expect((await calc(page, 'g(1)')).refused).toBe(true);
	await page.screenshot({ path: test.info().outputPath('carte-pour.png'), fullPage: false });
});

test('Calcul : f(x) = x pour x > k, la borne suit k', async ({ page }) => {
	expect((await calc(page, 'k = 2')).refused).toBe(false);
	expect((await calc(page, 'f(x) = x pour x > k')).refused).toBe(false);

	const f = await card(page, 'f');
	expect(normalizeLatex(f.latex ?? '')).toBe(normalizeLatex('x\\text{ pour }x>k'));
	expect(f.message).toBeNull();
	// k = 2 : f(1) refusé ; k = 0 : f(1) accepté
	expect((await calc(page, 'f(1)')).refused).toBe(true);
	expect((await calc(page, 'k = 0')).refused).toBe(false);
	expect((await calc(page, 'f(1)')).refused).toBe(false);
	await page.screenshot({ path: test.info().outputPath('pour-x-sup-k.png'), fullPage: false });
});
