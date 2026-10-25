import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	calc,
	card,
	cardAction,
	cardLocator,
	cards,
	expectLatex,
	normalizeLatex,
	openAtelier,
	steps
} from './helpers/atelier';

/**
 * Les cartes de l'Atelier — lignes de `docs/wip/verifications-manuelles.md`
 * ===========================================================================
 *
 * Les lignes où l'on clique une carte (« Dériver », « Réciproque »), où l'on
 * tape DANS une carte, où l'on regarde le Graphe. Un test par ligne, son
 * numéro de PR dans le titre. L'attendu est celui de la ligne : un test rouge
 * est un bug ou une ligne périmée, à signaler à David — jamais un attendu à
 * changer pour passer.
 */

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

/** Le LaTeX d'une carte est celui-ci (aux écarts invisibles près) */
async function expectCardLatex(page: Page, name: string, expected: string): Promise<void> {
	await expect
		.poll(async () => normalizeLatex((await card(page, name)).latex ?? ''))
		.toBe(normalizeLatex(expected));
}

/**
 * Tape au vrai clavier dans le champ d'une carte (MathLive), à la place de ce
 * qu'il contient, puis Entrée range la carte. Chaque morceau de `keys` est
 * tapé, puis → (sortir d'un exposant) ; `infty` est le raccourci de ∞.
 */
async function typeInCard(page: Page, name: string, ...keys: string[]): Promise<void> {
	const field = cardLocator(page, name).locator('math-field');
	// Juste après un calcul, la console reprend le focus au premier clic
	await expect(async () => {
		await field.click();
		expect(await field.evaluate((element) => element === document.activeElement)).toBe(true);
	}).toPass();
	await page.keyboard.press('ControlOrMeta+A');
	await page.keyboard.press('Backspace');
	for (const [index, part] of keys.entries()) {
		if (index > 0) await page.keyboard.press('ArrowRight');
		await page.keyboard.type(part);
	}
	await page.keyboard.press('Enter');
}

/** Les formules d'une réponse de la console, en LaTeX (celles d'un refus, `FormulaText`) */
async function answerFormulas(line: Locator): Promise<string[]> {
	return line
		.locator('.reponse .formule [data-latex]')
		.evaluateAll((spans) => spans.map((span) => span.getAttribute('data-latex') ?? ''));
}

/** Pousse un curseur (`role="slider"`) jusqu'à ce que son texte annonce `target` */
async function slideUntil(slider: Locator, key: string, reached: () => Promise<boolean>) {
	await slider.focus();
	for (let press = 0; press < 400 && !(await reached()); press++) {
		await slider.press(key);
	}
	expect(await reached()).toBe(true);
}

/** Les courbes tracées dans le Graphe */
function curves(page: Page): Locator {
	return page.locator('path.function-curve');
}

test('#1305 — intervalle d’une carte : tapé au clavier, gardé au rechargement, refusé hors domaine', async ({
	page
}) => {
	// Au vrai clavier, dans une carte
	await calc(page, 'f(x) = x');
	await typeInCard(page, 'f', 'x^2', ' sur [0;+infty[');
	// La ligne dit seulement « affiche x² sur [0 ; +∞[ » : la forme exacte du champ est celle
	// de l'appli. Il garde la frappe ; « sur » devient du texte une fois la carte relue
	await expectCardLatex(page, 'f', 'x^2sur[0;+\\infty[');
	expect((await calc(page, 'f(-1)')).text).toContain(
		"n'est pas dans l'ensemble de définition de f, [0 ; +∞["
	);
	await page.reload();
	await expectCardLatex(page, 'f', 'x^2\\text{ sur }[0;+\\infty[');
	expect((await calc(page, 'f(-1)')).refused).toBe(true);

	await calc(page, 'f(x) = x^2 sur [0;2]');
	const outside = await calc(page, 'f(5)');
	expect(outside.refused).toBe(true);
	expect(outside.text).toContain("5 n'est pas dans l'ensemble de définition de f, [0 ; 2]");

	const ln = await calc(page, 'l(x) = ln(x) sur [-1;2]');
	expect(ln.refused).toBe(true);
	expect(ln.text).toContain('pas défini sur tout [−1 ; 2] (pas en −1)');

	// Sans intervalle, les parenthèses se referment comme avant
	await calc(page, 'p(x) = x');
	await typeInCard(page, 'p', '(x+1)/(x-1)');
	// Chaque « ( » a sa « ) », sans doublon, et la carte calcule
	const typed = normalizeLatex((await card(page, 'p')).latex ?? '');
	expect(typed).not.toContain('))');
	expect(typed.split('(').length).toBe(typed.split(')').length);
	expectLatex(await calc(page, 'p(3)'), '2');

	// `a = 3 sur 4` n'est pas pris pour un intervalle : la carte a est rangée, en erreur
	// comme avant (« 3 sur 4 » ne se lit pas), sans refus d'intervalle
	const notInterval = await calc(page, 'a = 3 sur 4');
	expect(notInterval.text).toContain('« a » est dans tes objets');
	expect(notInterval.text).not.toContain('intervalle');
	expect((await card(page, 'a')).message).toBe("« 3 sur 4 » n'est pas une expression valide.");
});

test('#1307 — variations, résolution et dérivée sur un intervalle', async ({ page }) => {
	await calc(page, 'f(x) = x^2 sur [0;+\\infty[');
	const variations = await calc(page, '.variations f');
	const table = variations.line.locator('.tableau');
	const bounds = table.locator('.vt-domain-point');
	// Les bornes sont des formules : leur texte est le LaTeX
	await expect(bounds).toHaveText(['0', '+\\infty']);
	// 0 fermé
	await expect(bounds.first()).not.toHaveClass(/vt-open/);
	expect(normalizeLatex(await steps(variations))).toContain('croissante');

	await cardAction(page, 'f', 'Dériver');
	await expectCardLatex(page, 'f′', '2 x');
	expect((await card(page, 'f′')).interval).toBe('[0 ; +∞[');

	await calc(page, 'f(x) = x^2 sur [0;5[');
	const open = await calc(page, '.variations f');
	const openBounds = open.line.locator('.tableau .vt-domain-point');
	await expect(openBounds.last()).toHaveText('5');
	await expect(openBounds.last()).toHaveClass(/vt-open/);

	await calc(page, 's(x) = sin(x) sur [0;\\pi]');
	expectLatex(await calc(page, '.résoudre s(x)=0'), 'S = \\left\\{ 0 \\,;\\, \\pi \\right\\}');

	// En dernier : « Comment ? » casse la page (each_key_duplicate, comme #1674)
	await calc(page, 'f(x) = x^2 sur [0;+\\infty[');
	const solved = await calc(page, '.résoudre f(x)=4');
	expectLatex(solved, 'x = 2');
	expect(await steps(solved)).toContain('on ne garde que');
});

test('#1309 — max(… ; …) dans une carte', async ({ page }) => {
	await calc(page, 'f(x) = max(2,5 ; x)');
	await expectCardLatex(page, 'f', '\\max\\left( 2{,}5; x \\right)');

	await calc(page, 'g(x) = x');
	await typeInCard(page, 'g', 'max(2;x)');
	expectLatex(await calc(page, 'g(1)'), '2');

	const comma = await calc(page, 'h(x) = max(1,2)+x');
	expect(comma.refused).toBe(true);
	expect(comma.text).toContain('Sépare les valeurs avec « ; »');

	// Décimal tapé → réponse décimale (comme #1717), retenu par David (2026-10-26)
	expectLatex(await calc(page, 'f(1)'), '2{,}5');
});

test('#1315 — Graphe : bornes pleines et creuses, morceaux', async ({ page }) => {
	await calc(page, 'f(x) = x+1 sur ]0;5]');
	await expect(page.locator('circle.endpoint-open')).toHaveCount(1);
	await expect(page.locator('circle.endpoint-closed')).toHaveCount(1);
	const openX = Number(await page.locator('circle.endpoint-open').getAttribute('cx'));
	const closedX = Number(await page.locator('circle.endpoint-closed').getAttribute('cx'));
	expect(openX).toBeLessThan(closedX);
	// (0 ; 1) plus bas que (5 ; 6) : y SVG plus grand
	const openY = Number(await page.locator('circle.endpoint-open').getAttribute('cy'));
	const closedY = Number(await page.locator('circle.endpoint-closed').getAttribute('cy'));
	expect(openY).toBeGreaterThan(closedY);
	// L'intérieur du creux est la couleur du fond, pas le noir d'un cercle SVG
	const fill = await page
		.locator('circle.endpoint-open')
		.evaluate((circle) => getComputedStyle(circle).fill);
	expect(fill).not.toBe('rgb(0, 0, 0)');
	expect(fill).not.toBe('none');

	// 1/x sur ]0;5] : aucun point en 0, le plein en 5 seulement (le creux à 0 prouve le
	// nouveau tracé avant de compter les pleins)
	await calc(page, 'f(x) = 1/x sur ]0;5]');
	await expect(page.locator('circle.endpoint-open')).toHaveCount(0);
	await expect(page.locator('circle.endpoint-closed')).toHaveCount(1);

	// Deux morceaux : le chemin est relu jusqu'à ce que le nouveau tracé soit là
	await calc(page, 'f(x) = x sur [-1;1] \\cup [2;3]');
	await expect(curves(page)).toHaveCount(1);
	await expect
		.poll(async () => ((await curves(page).getAttribute('d')) ?? '').match(/M/g)?.length)
		.toBe(2);

	// Sans « sur » : une courbe, aucun point de borne
	await calc(page, 'f(x) = x+1');
	await expect(page.locator('circle.endpoint-closed')).toHaveCount(0);
	await expect(page.locator('circle.endpoint-open')).toHaveCount(0);
	await expect(curves(page)).toHaveCount(1);
});

test('#1328 — bouton « Réciproque », refus de .réciproque', async ({ page }) => {
	await calc(page, 'f(x) = sqrt(x+2)');
	await cardAction(page, 'f', 'Réciproque');
	await expectCardLatex(page, 'f⁻¹', 'x^2 - 2');
	expect((await card(page, 'f⁻¹')).interval).toBe('[0 ; +∞[');
	// Tracée avec f : f, f⁻¹ et la droite y = x
	await expect(curves(page)).toHaveCount(3);
	const inverse = page.locator('path.function-curve[aria-label="Courbe de la fonction x^2 - 2"]');
	await expect(inverse).toHaveCount(1);
	// Demi-parabole : un seul point de borne, plein, là où commence le tracé (x = 0)
	const start = page.locator('circle.endpoint-closed');
	await expect(start).toHaveCount(1);
	await expect(page.locator('circle.endpoint-open')).toHaveCount(0);
	const startX = Number(await start.getAttribute('cx'));
	const xs = ((await inverse.getAttribute('d')) ?? '')
		.split(/[MCL ]/)
		.filter((pair) => pair.includes(','))
		.map((pair) => Number(pair.split(',')[0]));
	expect(Math.min(...xs)).toBeCloseTo(startX, 0);

	await calc(page, 'g(x) = x^2');
	const twoWays = await calc(page, '.réciproque g');
	expect(twoWays.refused).toBe(true);
	const formulas = (await answerFormulas(twoWays.line)).map(normalizeLatex);
	expect(formulas.some((formula) => formula.endsWith('=-\\sqrt{x}'))).toBe(true);
	expect(formulas.some((formula) => formula.endsWith('=\\sqrt{x}'))).toBe(true);

	await calc(page, 'a = 2');
	await calc(page, 'b = 3');
	await calc(page, 'f(x) = a x + b');
	await expect(page.getByRole('slider', { name: 'Curseur de a' })).toBeVisible();
	const slider = page.getByRole('slider', { name: 'Curseur de a' });
	const valueIs = (value: string) => async () =>
		(await slider.getAttribute('aria-valuetext')) === `a = ${value}`;
	await slideUntil(slider, 'ArrowLeft', valueIs('0'));
	await expect(cardLocator(page, 'f⁻¹').locator('.message')).toContainText('f est constante');
	await slideUntil(slider, 'ArrowRight', valueIs('1'));
	await expect(cardLocator(page, 'f⁻¹')).toBeVisible();
	await expect(cardLocator(page, 'f⁻¹').locator('.message')).toHaveCount(0);

	await calc(page, 'f(x) = x^2 sur [0;+\\infty[');
	const outside = await calc(page, '.réciproque f sur [-4;-1]');
	expect(outside.refused).toBe(true);
	expect(outside.text).toContain("f n'est définie que sur [0 ; +∞[");
});

test('#1337 — domaine choisi : .domaine, héritage, intégrale, tangente, lien', async ({ page }) => {
	await calc(page, 'f(x) = x^2 sur [0;+\\infty[');
	expect((await calc(page, '.domaine f')).text).toContain(
		'f est définie sur [0 ; +∞[ (ensemble choisi) ; sans ce choix'
	);
	await calc(page, 'g(x) = f(x)+1');
	expectLatex(await calc(page, '.résoudre g(x)=5'), 'x = 2');

	await calc(page, 'f(x) = x^2 sur ]0;2]');
	expectLatex(await calc(page, '.intégrer f de 0 à 2'), '\\dfrac{8}{3}');
	const outside = await calc(page, '.intégrer f de -1 à 2');
	expect(outside.refused).toBe(true);
	expect(outside.text).toContain("-1 n'est pas dans l'ensemble de définition de f, ]0 ; 2]");

	// Graphe : tangente en −1 refusée, message sous le réglage
	await cardLocator(page, 'f').getByRole('button', { name: 'Options de f' }).click();
	await page.getByRole('menuitemcheckbox', { name: 'Tangente' }).click();
	await page.keyboard.press('Escape');
	const tangent = page.getByRole('slider', { name: 'Abscisse du point de tangence' });
	const shown = page.locator('.curseur .nombre.fixe');
	await slideUntil(tangent, 'ArrowLeft', async () =>
		['-1', '−1'].includes(((await shown.textContent()) ?? '').trim())
	);
	await expect(page.locator('.refus-tangente')).not.toBeEmpty();

	// Le lien : demi-parabole, pleine en 0
	await page.goto(`/atelier?f=${encodeURIComponent('x^2 sur [0;+∞[')}`);
	await expect(cardLocator(page, 'f')).toBeVisible();
	await expect(curves(page)).toHaveCount(1);
	await expect(page.locator('circle.endpoint-closed')).toHaveCount(1);
	await expect(page.locator('circle.endpoint-open')).toHaveCount(0);

	// L'ensemble hérité se lit par .domaine : le champ de la carte ne montre que
	// l'ensemble PROPRE (décision d de #1337)
	await calc(page, 'g(x) = f(x)+1');
	expect((await calc(page, '.domaine g')).text).toContain(
		'g est définie sur [0 ; +∞[ (ensemble hérité)'
	);
});

test('#1338 — f⁻¹ dans Calcul, droite y = x, refus de .réciproque sin, f(x)^-1', async ({
	page
}) => {
	await calc(page, 'f(x) = 2x+3');
	expectLatex(await calc(page, 'f⁻¹(5)'), '1');
	expect((await cards(page)).map((each) => each.name)).not.toContain('f⁻¹');
	await calc(page, 'g(x) = f⁻¹(x)');
	expectLatex(await calc(page, 'g(5)'), '1');

	await calc(page, 'f(x) = e^(x/2) - 1');
	await cardAction(page, 'f', 'Réciproque');
	await expect(cardLocator(page, 'f⁻¹')).toBeVisible();
	// La droite y = x : en pointillés, entre f et f⁻¹
	const identity = curves(page).and(page.locator('[aria-label="Courbe de la fonction x"]'));
	await expect(identity).toHaveCount(1);
	expect(await identity.getAttribute('stroke-dasharray')).toBeTruthy();
	await cardLocator(page, 'f⁻¹').getByRole('button', { name: 'Tracer f⁻¹' }).click();
	await expect(identity).toHaveCount(0);

	await calc(page, 'g(x) = f(x)^-1');
	await calc(page, 'f(x) = 2x+3');
	expectLatex(await calc(page, 'g(2)'), '\\dfrac{1}{7}');

	// `sin` sans parenthèses est refusé partout depuis le 2026-10-06 : la ligne dit `sin(x)`
	const sin = await calc(page, '.réciproque sin(x)');
	expect(sin.refused).toBe(true);
	expect(sin.text).toContain('arcsin');
	expect(sin.text).not.toContain('.réciproque');
});

test('#1703 — carte f′ du bouton « Dériver » de 1 − x eˣ', async ({ page }) => {
	await calc(page, 'f(x) = 1 - x e^x');
	await cardAction(page, 'f', 'Dériver');
	await expectCardLatex(page, 'f′', '-\\left( x + 1 \\right) e^x');
});
