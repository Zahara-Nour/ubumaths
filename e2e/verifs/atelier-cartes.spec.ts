import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	calc,
	card,
	cardAction,
	cardLocator,
	cards,
	chooseSetting,
	expectLatex,
	fieldValue,
	mathConsole,
	normalizeLatex,
	openAtelier,
	retypeCard,
	steps,
	typeInCard
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

/** Ouvre le menu « Options » d'une carte et rend le menu */
async function openOptions(page: Page, name: string): Promise<Locator> {
	const button = cardLocator(page, name).getByRole('button', {
		name: `Options de ${name}`,
		exact: true
	});
	// Un choix « radio » (Nuage / Escalier) laisse le menu ouvert : on le ferme d'abord
	if ((await button.getAttribute('aria-expanded')) === 'true') {
		await page.keyboard.press('Escape');
		await expect(page.getByRole('menu')).toHaveCount(0);
	}
	await button.click();
	const menu = page.getByRole('menu');
	await expect(menu).toBeVisible();
	return menu;
}

test('cartes de fonction (lot 3) — une ligne, Entrée range, point de couleur, menu ⋮, clavier', async ({
	page
}) => {
	await calc(page, 'f(x) = x^2');
	const f = cardLocator(page, 'f');
	// Une seule ligne : point de couleur, nom, champ, œil, ⋮
	await expect(f.getByRole('button', { name: 'Couleur et trait de f' })).toBeVisible();
	await expect(f.locator('math-field[aria-label="Définition de f"]')).toBeVisible();
	await expect(f.getByRole('button', { name: 'Tracer f' })).toHaveAttribute('aria-pressed', 'true');
	await expect(f.getByRole('button', { name: 'Options de f' })).toBeVisible();
	const curve = page.locator('path.function-curve');
	await expect(curve).toHaveAttribute('aria-label', 'Courbe de la fonction x^2');

	// Taper ne change rien avant Entrée ; « 3x+ » puis Entrée → erreur sur le champ, la
	// courbe reste ; Échap → l'ancienne définition
	await retypeCard(page, 'f', '3x+');
	await page.waitForTimeout(500);
	await expect(curve).toHaveAttribute('aria-label', 'Courbe de la fonction x^2');
	await page.keyboard.press('Enter');
	await expect(f.locator('math-field')).toHaveAttribute('aria-invalid', 'true');
	await expect(f.locator('.refus')).toContainText("« 3x+ » n'est pas une expression valide");
	await expect(curve).toHaveAttribute('aria-label', 'Courbe de la fonction x^2');
	await page.keyboard.press('Escape');
	await expect.poll(() => fieldValue(page, 'f')).toBe('x^2');
	await expect(f.locator('.refus')).toHaveCount(0);
	// Un clic ailleurs range aussi
	await retypeCard(page, 'f', '2x');
	await page.mouse.click(5, 5);
	await expect(curve).toHaveAttribute('aria-label', 'Courbe de la fonction 2 x');
	await calc(page, 'f(x) = x^2');

	// Le point de couleur : couleur, épaisseur, style
	await f.getByRole('button', { name: 'Couleur et trait de f' }).click();
	for (const group of ['Couleur de la courbe', 'Épaisseur du trait', 'Style du trait']) {
		await expect(page.getByRole('radiogroup', { name: group })).toBeVisible();
	}
	await page.keyboard.press('Escape');
	// Jamais tracée (une carte « + Fonction » vide) : la fenêtre propose de la tracer
	await page.getByRole('button', { name: '+ Fonction' }).click();
	await cardLocator(page, 'g').getByRole('button', { name: 'Couleur et trait de g' }).click();
	await expect(page.getByText('g n’est pas encore tracée')).toBeVisible();
	await expect(
		page.locator('[data-slot="popover-content"]').getByRole('button', { name: 'Tracer g' })
	).toBeVisible();
	await page.keyboard.press('Escape');

	// Menu ⋮ : Tangente et Aire sous la courbe s'affichent sous la carte
	const shown = f.getByRole('region', { name: 'Sur le graphique : f' });
	await (await openOptions(page, 'f')).getByRole('menuitemcheckbox', { name: 'Tangente' }).click();
	await page.keyboard.press('Escape');
	await expect(shown.getByRole('slider', { name: 'Abscisse du point de tangence' })).toBeVisible();
	await (
		await openOptions(page, 'f')
	)
		.getByRole('menuitemcheckbox', { name: 'Aire sous la courbe' })
		.click();
	await page.keyboard.press('Escape');
	await expect(shown.getByRole('group', { name: 'Bornes de l’aire' })).toBeVisible();
	// Bornes par défaut −5 et 5 : ∫ x² = 2 × 125/3 = 250/3 ≈ 83,33
	await expect(shown.getByRole('spinbutton', { name: /borne inférieure/ })).toHaveValue('-5');
	await expect(shown.getByRole('spinbutton', { name: /borne supérieure/ })).toHaveValue('5');
	await expect(shown).toContainText('aire = 83,33');

	// Tabuler : une petite fenêtre de / à / pas
	await (await openOptions(page, 'f')).getByRole('menuitem', { name: 'Tabuler' }).click();
	const tabulate = page.getByRole('dialog', { name: 'Tabuler f' });
	for (const field of ['Début', 'Fin', 'Pas']) {
		await expect(tabulate.getByRole('textbox', { name: `${field} du tableau de f` })).toBeVisible();
	}
	await tabulate.getByRole('button', { name: 'Fermer' }).click();

	// Variations : le tableau dans la console
	const lines = page.locator('ol.historique > li');
	await cardAction(page, 'f', 'Variations');
	await expect(lines.last().locator('.tableau')).toBeVisible();

	// Dériver : la carte f′, son icône de lien dit ce qu'elle suit, au survol (title)
	// comme au toucher (le bouton déplie la phrase)
	await cardAction(page, 'f', 'Dériver');
	const link = cardLocator(page, 'f′').getByRole('button', { name: 'dérivée de f — elle suit f' });
	await expect(link).toHaveAttribute('title', 'dérivée de f — elle suit f');
	await link.click();
	await expect(link).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator(`#${await link.getAttribute('aria-controls')}`)).toContainText(
		'elle suit f'
	);

	// Tout au clavier : Tab jusqu'au ⋮, Entrée, flèches
	const options = f.getByRole('button', { name: 'Options de f', exact: true });
	await f.getByRole('button', { name: 'Tracer f' }).focus();
	await page.keyboard.press('Tab');
	await expect(options).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('menu')).toBeVisible();
	// Le menu ouvert au clavier met le focus sur son premier choix ; ↓ passe au suivant
	await expect(page.getByRole('menuitemcheckbox', { name: 'Tangente' })).toBeFocused();
	await page.keyboard.press('ArrowDown');
	await expect(page.getByRole('menuitemcheckbox', { name: 'Aire sous la courbe' })).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('menu')).toHaveCount(0);
});

test('cartes valeur, suite, liste (lot 4a) — curseur, bornes, escalier, liste, Simuler', async ({
	page
}) => {
	// Valeur : une ligne `a = [champ]`, rangée à Entrée
	await calc(page, 'a = 2');
	await expect.poll(() => fieldValue(page, 'a')).toBe('2');
	// Rien de rangé pendant la frappe : Échap rend la valeur d'avant (un clic dans la
	// console, lui, rangerait la carte en sortant du champ)
	await retypeCard(page, 'a', '5');
	await page.waitForTimeout(300);
	await page.keyboard.press('Escape');
	await expect.poll(() => fieldValue(page, 'a')).toBe('2');
	await retypeCard(page, 'a', '5');
	await page.keyboard.press('Enter');
	expectLatex(await calc(page, 'a'), '5');

	// Citée par f : le curseur sous la ligne ; sinon ⋮ → Curseur l'affiche
	await calc(page, 'f(x) = a x');
	await expect(cardLocator(page, 'a').getByRole('slider', { name: 'Curseur de a' })).toBeVisible();
	await calc(page, 'b = 3');
	const bSlider = cardLocator(page, 'b').getByRole('slider', { name: 'Curseur de b' });
	await expect(bSlider).toHaveCount(0);
	await (await openOptions(page, 'b')).getByRole('menuitemcheckbox', { name: 'Curseur' }).click();
	await expect(bSlider).toBeVisible();
	// ⋮ → Bornes et pas : une petite fenêtre
	await (
		await openOptions(page, 'b')
	)
		.getByRole('menuitem', { name: 'Bornes et pas du curseur…' })
		.click();
	const bounds = page.getByRole('dialog', { name: 'Curseur de b' });
	for (const field of ['de, minimum', 'à, maximum', 'pas']) {
		await expect(
			bounds.getByRole('spinbutton', { name: `${field} du curseur de b` })
		).toBeVisible();
	}
	await bounds.getByRole('button', { name: 'Fermer' }).click();
	// Une grandeur : « Curseur » grisé, avec sa raison
	await calc(page, 'd = 12 km');
	const distance = (await openOptions(page, 'd')).getByRole('menuitemcheckbox', {
		name: /Curseur/
	});
	await expect(distance).toHaveAttribute('aria-disabled', 'true');
	await expect(distance).toContainText('pas de curseur');
	await page.keyboard.press('Escape');

	// Suite : `● u(n+1) = [champ]`, dessous `u(0) = [champ]`
	await calc(page, 'u(n+1) = 2u(n)');
	const u = cardLocator(page, 'u');
	await expect(u.getByRole('button', { name: 'Couleur et trait de u' })).toBeVisible();
	await expect(u.locator('.variable')).toHaveText('(n+1) =');
	await expect(u.getByRole('group', { name: 'Premier terme de u' })).toBeVisible();
	await u.getByRole('button', { name: 'Couleur et trait de u' }).click();
	await expect(page.getByRole('radiogroup', { name: 'Couleur de la courbe' })).toBeVisible();
	await page.keyboard.press('Escape');
	// ⋮ → Escalier : les marches (le nuage devient escalier)
	await (await openOptions(page, 'u')).getByRole('menuitemradio', { name: 'Escalier' }).click();
	await expect(
		(await openOptions(page, 'u')).getByRole('menuitemradio', { name: 'Escalier' })
	).toHaveAttribute('aria-checked', 'true');
	await expect(u.getByRole('group', { name: 'Escalier de u' })).toBeVisible();
	// ⋮ → Récurrence / Explicite : u se cite elle-même, Explicite est refusé avec sa raison
	await (await openOptions(page, 'u')).getByRole('menuitemradio', { name: /^Explicite/ }).click();
	await expect(u.getByRole('alert')).toHaveText(
		"« u » se cite elle-même : c'est une récurrence, pas une suite explicite."
	);
	await expect(u.locator('.variable')).toHaveText('(n+1) =');
	// Une définition qui ne la cite plus : Explicite passe ; l'escalier y est grisé
	await retypeCard(page, 'u', 'n+1');
	await page.keyboard.press('Enter');
	await (await openOptions(page, 'u')).getByRole('menuitemradio', { name: /^Explicite/ }).click();
	await expect(u.locator('.variable')).toHaveText('(n) =');
	const explicit = await openOptions(page, 'u');
	await expect(explicit.getByRole('menuitemradio', { name: /Escalier/ })).toHaveAttribute(
		'aria-disabled',
		'true'
	);
	await page.keyboard.press('Escape');

	// Liste : `L = {3 ; 5 ; 8 ; …} (12 valeurs)`, pas de champ
	await calc(page, 'L = 3 ; 5 ; 8 ; 1 ; 2 ; 4 ; 6 ; 7 ; 9 ; 10 ; 11 ; 12');
	await calc(page, 'M = 1 ; 2 ; 3 ; 4 ; 5 ; 6 ; 7 ; 8 ; 9 ; 10 ; 11 ; 12');
	const list = cardLocator(page, 'L');
	await expect(list).toContainText('{3 ; 5 ; 8 ; …} (12 valeurs)');
	await expect(list.locator('math-field')).toHaveCount(0);
	// ⋮ → Avec une autre liste → Nuage avec M
	await cardAction(page, 'L', 'Avec une autre liste');
	await page.getByRole('menuitem', { name: 'Nuage avec M' }).click();
	await expect(page.getByRole('img', { name: /nuage de points L \/ M/ })).toBeVisible();
	// ⋮ → Modifier dans Données : la grille, sur la colonne de L
	await cardAction(page, 'L', 'Modifier dans Données');
	await expect(
		page
			.getByRole('navigation', { name: "Vues de l'atelier" })
			.getByRole('button', { name: 'Données' })
	).toHaveAttribute('aria-current', 'page');
	await expect(page.locator('td[role="gridcell"].active')).toHaveAttribute(
		'data-cell',
		/^[A-Z]+1$/
	);

	// Écriture mathématique : ⋮ → Avec une autre liste → Simuler, la console prend le focus
	await chooseSetting(page, 'Écriture mathématique');
	await cardAction(page, 'L', 'Avec une autre liste');
	await page.getByRole('menuitem', { name: /Simuler avec probabilités M/ }).click();
	await expect(mathConsole(page)).toBeFocused();

	// Tout au clavier : → ouvre le sous-menu
	await page.keyboard.press('Escape');
	const options = list.getByRole('button', { name: 'Options de L', exact: true });
	await options.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('menuitem', { name: 'Statistiques', exact: true })).toBeFocused();
	for (let press = 0; press < 3; press++) await page.keyboard.press('ArrowDown');
	await expect(page.getByRole('menuitem', { name: 'Avec une autre liste' })).toBeFocused();
	await page.keyboard.press('ArrowRight');
	await expect(page.getByRole('menuitem', { name: 'Statistiques avec effectifs M' })).toBeFocused();
});

test('cartes point et courbe (lot 4b) — une ligne, Entrée range, lien, couleur, curseur gardé', async ({
	page
}) => {
	await calc(page, 'A = (1 ; 2)');
	const a = cardLocator(page, 'A');
	await expect(a).toHaveAttribute('data-kind', 'point');
	await expect(a.locator('.egal')).toHaveText('=');
	// Taper `(1;5)` sans Entrée ne change rien ; Entrée range
	// (même preuve que pour une valeur : Échap rend la définition d'avant)
	await retypeCard(page, 'A', '(1;5');
	await page.waitForTimeout(300);
	await page.keyboard.press('Escape');
	await expect.poll(() => fieldValue(page, 'A')).toBe('(1;2)');
	await retypeCard(page, 'A', '(1;5');
	await page.keyboard.press('Enter');
	expect((await calc(page, 'A')).text).toContain('A(1;5)');

	await calc(page, 'B = (0 ; 2)');
	await calc(page, 'I = milieu(A, B)');
	await expect(
		cardLocator(page, 'I').getByRole('button', {
			name: 'I se construit à partir de A et B, et suit leurs changements.'
		})
	).toBeVisible();
	await calc(page, 'd : y = 3x - 2');
	await expect(cardLocator(page, 'd').locator('.egal')).toHaveText(':');
	await expect(cardLocator(page, 'd')).toHaveAttribute('data-kind', 'curve');
	await calc(page, 'g = (AB)');
	await expect(cardLocator(page, 'g')).toHaveAttribute('data-kind', 'curve');

	// Point de couleur : d'un point → couleur et taille ; d'une courbe → couleur, épaisseur, style
	await a.getByRole('button', { name: 'Couleur et taille de A' }).click();
	await expect(page.getByRole('radiogroup', { name: 'Couleur du point' })).toBeVisible();
	await expect(page.getByRole('radiogroup', { name: 'Taille du point' })).toBeVisible();
	await page.keyboard.press('Escape');
	await cardLocator(page, 'd').getByRole('button', { name: 'Couleur et trait de d' }).click();
	for (const group of ['Couleur', 'Épaisseur du trait', 'Style du trait']) {
		await expect(page.getByRole('radiogroup', { name: new RegExp(`^${group}`) })).toBeVisible();
	}
	await page.keyboard.press('Escape');

	// Une valeur vide dit « à compléter »
	await page.getByRole('button', { name: '+ Valeur' }).click();
	await expect(page.locator('article.objet').last().locator('.etat')).toHaveText('à compléter');

	// ⋮ → Curseur sur `c = 2`, recharger : le curseur est toujours là
	await calc(page, 'c = 2');
	await (await openOptions(page, 'c')).getByRole('menuitemcheckbox', { name: 'Curseur' }).click();
	await expect(cardLocator(page, 'c').getByRole('slider', { name: 'Curseur de c' })).toBeVisible();
	await page.reload();
	await expect(cardLocator(page, 'c').getByRole('slider', { name: 'Curseur de c' })).toBeVisible();

	// Suite en escalier qui ne peut plus l'être (sa définition ne la cite plus) : retour
	// au nuage. Passer en Explicite depuis l'escalier est refusé (elle se cite elle-même)
	await calc(page, 'u(n+1) = u(n)/2 + 1');
	await (await openOptions(page, 'u')).getByRole('menuitemradio', { name: 'Escalier' }).click();
	await page.keyboard.press('Escape');
	await retypeCard(page, 'u', 'n+1');
	await page.keyboard.press('Enter');
	await expect(
		(await openOptions(page, 'u')).getByRole('menuitemradio', { name: 'Nuage' })
	).toHaveAttribute('aria-checked', 'true');
});
