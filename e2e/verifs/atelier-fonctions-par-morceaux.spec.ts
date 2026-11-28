import { expect, test } from '@playwright/test';
import { calc, card, normalizeLatex, openAtelier, retypeCard } from './helpers/atelier';
import { openView, setConsole } from './helpers/grille';

/**
 * Fonction par morceaux dans l'Atelier (chantier `fonctions-par-morceaux`, PR 2)
 * ==============================================================================
 *
 * `f(x) = x pour x < 2, x^2 pour x ≥ 2` tapé dans Calcul : la carte réaffiche
 * chaque morceau avec « pour », les images prennent la formule de leur morceau,
 * la Géométrie trace les deux morceaux. Dans la carte, MathLive colle les mots
 * (`xpourx<2,x^2pourx\ge2`) : l'écriture doit se lire.
 */

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

test('Calcul : deux morceaux, la carte, les images', async ({ page }) => {
	expect((await calc(page, 'f(x) = x pour x < 2, x^2 pour x ≥ 2')).refused).toBe(false);

	const f = await card(page, 'f');
	expect(normalizeLatex(f.latex ?? '')).toBe(
		normalizeLatex('x\\text{ pour }x<2,x^2\\text{ pour }x\\ge2')
	);
	expect(f.message).toBeNull();
	expect((await calc(page, 'f(1)')).refused).toBe(false);
	expect((await calc(page, 'f(3)')).refused).toBe(false);
	// Q3 : une commande d'étude refusée, en français
	expect((await calc(page, '.variations f')).refused).toBe(true);
	await page.screenshot({ path: test.info().outputPath('calcul-morceaux.png'), fullPage: false });
});

test('la carte : deux morceaux tapés dans le champ', async ({ page }) => {
	await calc(page, 'g(x) = x');
	await retypeCard(page, 'g', 'x pour x<2,x^2 pour x>=2');
	await page.keyboard.press('Enter');

	await expect.poll(async () => (await card(page, 'g')).message).toBeNull();
	expect((await calc(page, 'g(3)')).refused).toBe(false);
	expect((await calc(page, 'g(1)')).refused).toBe(false);
	await page.screenshot({ path: test.info().outputPath('carte-morceaux.png'), fullPage: false });
});

test('la carte : des conditions qui se chevauchent, refusées', async ({ page }) => {
	await calc(page, 'g(x) = x');
	await retypeCard(page, 'g', 'x pour x<3,x^2 pour x>2');
	await page.keyboard.press('Enter');

	await expect
		.poll(async () => (await card(page, 'g')).message ?? '')
		.toContain('Les conditions se chevauchent');
	await page.screenshot({
		path: test.info().outputPath('carte-chevauchement.png'),
		fullPage: false
	});
});

test('Graphe : la courbe se trace', async ({ page }) => {
	expect((await calc(page, 'f(x) = x pour x < 2, x^2 pour x ≥ 2')).refused).toBe(false);
	await setConsole(page, false);
	await openView(page, 'Graphe');
	const curves = page.locator('path.function-curve');
	await expect(curves).toHaveCount(1);
	await expect.poll(() => curves.first().getAttribute('d')).not.toBe('');
	await page.screenshot({ path: test.info().outputPath('graphe-morceaux.png'), fullPage: false });
});
