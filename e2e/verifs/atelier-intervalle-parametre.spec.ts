import { expect, test, type Locator } from '@playwright/test';
import { calc, openAtelier } from './helpers/atelier';
import { setConsole } from './helpers/grille';

/**
 * Intervalle à paramètre dans l'Atelier (chantier `fonctions-morceaux`)
 * =====================================================================
 *
 * `k = 2` puis `f(x) = x sur [k;5]` : la courbe ne part que de x = k, et le
 * curseur de k déplace son début. On lit le tracé DESSINÉ (`path.function-curve`) :
 * son abscisse la plus à gauche, en pixels, doit avancer quand k grandit.
 */

/** L'abscisse (px du SVG) la plus à gauche du tracé : premier nombre de chaque commande */
async function leftmostX(curve: Locator): Promise<number> {
	const d = (await curve.getAttribute('d')) ?? '';
	const xs = [...d.matchAll(/[ML]\s*(-?[\d.]+)[ ,]/g)].map((match) => Number(match[1]));
	return Math.min(...xs);
}

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

test('f(x) = x sur [k;5] : tracé restreint, le curseur de k déplace son début', async ({
	page
}) => {
	await calc(page, 'k = 2');
	const answer = await calc(page, 'f(x) = x sur [k;5]');
	expect(answer.refused).toBe(false);
	const curve = page.locator('path.function-curve');
	await expect(curve).toHaveCount(1);
	await expect.poll(() => curve.getAttribute('d')).not.toBe('');
	// La console ouverte couvre le graphe
	await setConsole(page, false);
	const before = await leftmostX(curve);
	await page.screenshot({ path: test.info().outputPath('k-2.png'), fullPage: false });

	// k grandit au clavier : le début du tracé part vers la droite
	const slider = page.getByRole('slider', { name: 'Curseur de k' });
	const valueBefore = await slider.getAttribute('aria-valuetext');
	await slider.focus();
	for (let press = 0; press < 5; press++) await slider.press('ArrowRight');
	await expect(slider).not.toHaveAttribute('aria-valuetext', valueBefore ?? '');
	await expect.poll(() => leftmostX(curve)).toBeGreaterThan(before + 1);
	await page.screenshot({ path: test.info().outputPath('k-plus.png'), fullPage: false });
});
