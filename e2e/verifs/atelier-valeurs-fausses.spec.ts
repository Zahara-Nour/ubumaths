import { expect, test } from '@playwright/test';
import { calc, openAtelier } from './helpers/atelier';

/**
 * Trois valeurs fausses de l'Atelier corrigées (registre des écarts : V85, V92,
 * V103). La réponse affichée à l'écran, pas seulement celle du moteur.
 */

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

test('V85 — le domaine de 1/(sin x cos x) exclut les kπ/2', async ({ page }) => {
	const answer = await calc(page, '.domaine \\frac{1}{\\sin x\\cos x}');

	expect(answer.refused).toBe(false);
	expect(answer.latex).toContain('\\frac{k\\pi}{2}');
});

test('V92 — x² − ab = 0 garde la racine du produit', async ({ page }) => {
	const answer = await calc(page, '.résoudre x^2-ab=0');

	expect(answer.latex).toContain('\\sqrt{a b}');
	expect(answer.latex).toContain('a b \\geqslant 0');
});

test('V103 — une limite à paramètre dit sa condition', async ({ page }, testInfo) => {
	const logarithm = await calc(page, '.limite \\ln(x+k) en 0+');
	const anyParameter = await calc(page, '.limite x^2+kx en 0+');
	const inverse = await calc(page, '.limite \\frac{1}{x^2+k} en 0');

	expect(inverse.latex).toContain('\\dfrac{1}{k}');
	expect(inverse.latex).toContain('k \\neq 0');
	expect(logarithm.latex).toContain('k > 0');
	expect(anyParameter.refused).toBe(false);
	expect(anyParameter.latex).toContain('= 0');
	await page.screenshot({ path: testInfo.outputPath('limites.png'), fullPage: true });
});
