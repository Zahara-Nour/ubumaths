import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
	calc,
	card,
	cardAction,
	chooseSetting,
	mathConsole,
	expectLatex,
	normalizeLatex,
	openAtelier,
	steps,
	waitVirtualKeyboard
} from './helpers/atelier';
import { openView, setConsole } from './helpers/grille';

/**
 * Restes Atelier du paquet 3 du tri (lignes du 23 au 25 octobre)
 * ================================================================
 *
 * La part de #1663, #1656, #1709, #1710, #1684 que `atelier-calcul.spec.ts` ne
 * jouait pas encore. Captures à l'œil de la session : `.captures/verifs/paquet3/`.
 */

// ============================================================================
// CONSTANTES
// ============================================================================

const SHOTS_DIR = '.captures/verifs/paquet3';

// ============================================================================
// FUNCTIONS
// ============================================================================

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

async function shoot(page: Page, name: string, projectName: string): Promise<void> {
	await mkdir(SHOTS_DIR, { recursive: true });
	await page.screenshot({ path: `${SHOTS_DIR}/${name}-${projectName}.png` });
}

// ============================================================================
// TESTS
// ============================================================================

test('#1663 — tableau de variations : ordonnées exactes, jamais cos(π/6)', async ({ page }) => {
	await calc(page, 'f(x) = cos(x)+x/2 sur [0;\\pi]');
	const table = await calc(page, '.variations f');
	const values = table.line.locator('.tableau');
	await expect(values).toBeVisible();
	// Les valeurs sont des formules : le texte d'un `math-span` est son LaTeX
	const latex = normalizeLatex(
		(await values.locator('.vt-value-container math-span').allTextContents()).join(' ')
	);
	expect(latex).toContain(normalizeLatex('\\dfrac{\\pi}{12}'));
	expect(latex).toContain(normalizeLatex('\\sqrt{3}'));
	expect(latex).not.toContain('cos');
	// sin(x) − 0,5 : le minimum vaut −1,5
	await calc(page, 'g(x) = sin(x)-0,5 sur [0;2\\pi]');
	const sine = await calc(page, '.variations g');
	const sineLatex = await sine.line
		.locator('.tableau .vt-value-container math-span')
		.allTextContents();
	expect(sineLatex.map(normalizeLatex)).toContain(normalizeLatex('-1{,}5'));
});

test('#1656 — carte « Dériver » : même chose que .dériver ; quotient réduit, signe devant', async ({
	page
}) => {
	await calc(page, 'f(x) = x^2/(x-1)^2');
	const derived = await calc(page, '.dériver f');
	expect(derived.latex).not.toBeNull();
	await cardAction(page, 'f', 'Dériver');
	expect(normalizeLatex((await card(page, 'f′')).latex ?? '')).toBe(
		normalizeLatex(derived.latex ?? '')
	);
	// Dernière étape « On simplifie » : le signe devant la barre
	const quotient = await calc(page, '.dériver (x+4)/(x-3)');
	expectLatex(quotient, '-\\dfrac{7}{(x - 3)^2}');
	expect(normalizeLatex(await steps(quotient))).toContain(normalizeLatex('-\\dfrac{7}{(x - 3)^2}'));
});

test(
	'#1709 — clavier virtuel : l’onglet « Calcul » dit « Les touches de calcul »',
	{ tag: '@clavier-mathlive' },
	async ({ page, hasTouch }) => {
		test.skip(!hasTouch, 'Le clavier virtuel s’ouvre au toucher');
		await chooseSetting(page, 'Écriture mathématique');
		const field = mathConsole(page);
		await field.tap();
		await waitVirtualKeyboard(page, field);
		// L'infobulle de l'onglet « Calcul » (`virtual-keyboard.ts`)
		const tooltips = await page.evaluate(() =>
			[...document.querySelectorAll('[data-tooltip]')].map((node) =>
				node.getAttribute('data-tooltip')
			)
		);
		expect(tooltips).toContain('Les touches de calcul');
	}
);

test('#1710 — « Comment ? » de .limite au téléphone : capture', async ({ page }, testInfo) => {
	test.skip(!testInfo.project.use.isMobile, 'Au téléphone seulement');
	const limit = await calc(page, '.limite ((x+1)^2-1)/x en 0');
	const text = await steps(limit);
	expect(text).toContain('facteur commun');
	await limit.line.locator('.etapes').scrollIntoViewIfNeeded();
	// Aucune formule plus large que la console : rien ne déborde
	const overflow = await limit.line
		.locator('.etapes')
		.evaluate((box) => box.scrollWidth - box.clientWidth);
	expect(overflow).toBeLessThanOrEqual(1);
	await shoot(page, '1710-limite', testInfo.project.name);
});

test('#1684 — « Garder » ln(x) − ln(x) : tracée pour x > 0 seulement', async ({
	page
}, testInfo) => {
	const logs = await calc(page, 'ln(x)-ln(x)');
	await logs.line.getByRole('button', { name: 'Garder…' }).click();
	await expect(page.locator('p.retour')).toContainText('Gardé sous le nom « f »');
	await openView(page, 'Graphe');
	await setConsole(page, false);
	// Le tracé : la courbe gardée n'a aucun point à gauche de l'axe x = 0 (ln n'existe que pour x > 0)
	const curve = page.locator('path.function-curve');
	await expect(curve).toHaveCount(1);
	const axisX = await page
		.locator('.axes line.axis-line')
		.evaluateAll((lines) =>
			lines
				.filter((line) => line.getAttribute('x1') === line.getAttribute('x2'))
				.map((line) => Number(line.getAttribute('x1')))
		);
	expect(axisX, 'un seul axe vertical (x = 0)').toHaveLength(1);
	// L'axe est bien dans la vue : sans cela, « rien à gauche de l'axe » ne prouverait rien
	expect(axisX[0], 'l’axe x = 0 est visible, avec de la place à sa gauche').toBeGreaterThan(20);
	const abscissas = ((await curve.getAttribute('d')) ?? '')
		.split(/[A-Za-z]/)
		.map((part) => part.trim().split(/[\s,]+/))
		.filter((numbers) => numbers.length >= 2 && numbers[0] !== '')
		.map((numbers) => Number(numbers[0]));
	expect(abscissas.length, 'des points tracés').toBeGreaterThan(10);
	expect(Math.min(...abscissas), 'aucun point à gauche de l’axe x = 0').toBeGreaterThanOrEqual(
		axisX[0] - 0.5
	);
	await shoot(page, '1684-garder-ln', testInfo.project.name);
});
