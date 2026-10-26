import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	calc,
	card,
	cardAction,
	cardLocator,
	focusCardField,
	cards,
	expectLatex,
	hasSteps,
	normalizeLatex,
	openAtelier,
	steps,
	stepsAs,
	typeInCard,
	type Answer
} from './helpers/atelier';
import { openView, readCell, typeCell } from './helpers/grille';

/**
 * La console de l'Atelier, ses réglages, son historique — lignes de
 * `docs/wip/verifications-manuelles.md`
 * =====================================================================
 *
 * Ce qui entoure le calcul : la console qui s'ouvre et se ferme, l'historique
 * gardé au rechargement, les réglages (écriture mathématique, simplifications
 * qui changent le domaine), les cartes valeur qu'on retouche. Un test par
 * ligne, son numéro de PR dans le titre. L'attendu est celui de la ligne : un
 * test rouge est un bug ou une ligne périmée, à signaler à David — jamais un
 * attendu à changer pour passer. « console de l’Atelier » est le nom de sa ligne
 * (sans n° de PR). « Reste à la main » : ce qui reste dans la liste.
 */

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

/** Les lignes de l'historique de la console */
function historyLines(page: Page): Locator {
	return page.locator('ol.historique > li');
}

/** Le champ de la console en « Écriture mathématique » (MathLive) */
function mathConsole(page: Page): Locator {
	return page.locator('math-field[aria-label="Calcul, définition ou commande"]');
}

/** Ouvre la fenêtre « Réglages » de la barre du haut */
async function openSettings(page: Page): Promise<Locator> {
	await page.getByRole('button', { name: 'Réglages', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Réglages de l’atelier' });
	await expect(dialog).toBeVisible();
	return dialog;
}

/** Choisit un réglage (bouton radio) puis ferme la fenêtre */
async function chooseSetting(page: Page, label: string): Promise<void> {
	const dialog = await openSettings(page);
	await dialog.getByRole('radio', { name: label }).click();
	await expect(dialog.getByRole('radio', { name: label })).toBeChecked();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
}

/** Tape une ligne au vrai clavier dans le champ mathématique, Entrée, et rend sa ligne */
async function calcMath(page: Page, keys: string): Promise<Locator> {
	const before = await historyLines(page).count();
	await typeMath(page, keys);
	await page.keyboard.press('Enter');
	await expect(historyLines(page)).toHaveCount(before + 1);
	return historyLines(page).nth(before);
}

/**
 * Tape au vrai clavier dans le champ mathématique vide. Juste après un
 * rechargement ou un changement de réglage, MathLive perd la première frappe :
 * on recommence tant que le champ reste vide.
 */
async function typeMath(page: Page, keys: string): Promise<void> {
	const field = mathConsole(page);
	await expect(async () => {
		await field.click();
		await page.keyboard.type(keys);
		expect(await mathValue(field)).not.toBe('');
	}).toPass();
}

/** Le LaTeX du champ mathématique */
async function mathValue(field: Locator): Promise<string> {
	return field.evaluate((element) => (element as HTMLElement & { value: string }).value);
}

/** Ajoute puis efface un chiffre au bout du champ d'une carte, puis Entrée */
async function retouchCard(page: Page, name: string): Promise<void> {
	await focusCardField(page, name);
	await page.keyboard.press('End');
	await page.keyboard.type('1');
	await page.keyboard.press('Backspace');
	await page.keyboard.press('Enter');
}

/** Le LaTeX du champ d'une carte, normalisé */
async function cardField(page: Page, name: string): Promise<string> {
	return normalizeLatex((await card(page, name)).latex ?? '');
}

/** Le bouton « Console » de la barre du haut */
function consoleButton(page: Page): Locator {
	return page.getByRole('button', { name: 'Console', exact: true });
}

test('#1289 — durée et fraction tapées dans une carte valeur ; .convertir', async ({ page }) => {
	await calc(page, 'd = 1');
	await typeInCard(page, 'd', '2 h 30 min');
	expect((await calc(page, 'd')).text).toContain('2 h 30 min');
	// Retouchée, la carte montre la durée et se relit
	await retouchCard(page, 'd');
	expect(await cardField(page, 'd')).toBe(normalizeLatex('2\\,h\\,30\\,\\min'));
	expect((await calc(page, 'd')).text).toContain('2 h 30 min');

	await calc(page, '2 h 30 min');
	expect((await calc(page, '.convertir min')).text).toContain('2 h 30 min=150 min');

	// `1/2 m` : la fraction 1/2, → pour en sortir, puis l'unité (`\frac{1}{2}\,m`, la forme que
	// #1289 relit). Tapé d'un trait, MathLive met « 2 m » au dénominateur, comme toute fraction
	await calc(page, 'v = 1');
	await typeInCard(page, 'v', '1/2', ' m');
	const half = await calc(page, 'v');
	expect(half.refused).toBe(false);
	expect(half.text).toMatch(/0,5 m|1\/2 m/);
	await retouchCard(page, 'v');
	expect((await card(page, 'v')).message).toBeNull();
	expect((await calc(page, 'v')).text).toBe(half.text);
});

test('#1296 — carte valeur : virgule décimale ; durée retouchée qui reste une durée', async ({
	page
}) => {
	await calc(page, 'd = 2,5 km');
	expect(await cardField(page, 'd')).toBe(normalizeLatex('2{,}5~\\operatorname{\\mathrm{km}}'));

	// Sans parenthèses, refusée depuis #1562 : la carte dit quoi écrire, comme la ligne de calcul
	const glued = await calc(page, 't = 1 h 30 min * 2');
	expect(glued.refused).toBe(true);
	expect(glued.text).toContain('écris 2*(1 h 30 min) pour 3 h');
	expect((await card(page, 't')).message).toContain('écris 2*(1 h 30 min) pour 3 h');

	await calc(page, 'd = (1 h 30 min) * 2');
	expect((await calc(page, 'd')).text).toContain('3 h');
	await retouchCard(page, 'd');
	expect((await card(page, 'd')).message).toBeNull();
	expect((await calc(page, 'd')).text).toContain('3 h');
});

test('#1301 — carte valeur retouchée : la grandeur reste ; virgules dans une carte fonction', async ({
	page
}) => {
	await calc(page, 'd = 10^3[m]');
	await retouchCard(page, 'd');
	// Le champ a été relu : la carte est toujours une longueur, sans erreur
	await expect.poll(() => cardField(page, 'd')).toContain('\\mathrm{m}');
	expect((await card(page, 'd')).message).toBeNull();
	expect((await calc(page, 'd')).text).toContain('1000 m');
	await calc(page, 'f(x) = 2,5x + 0,5');
	expect(await cardField(page, 'f')).toBe(normalizeLatex('2{,}5 x + 0{,}5'));
});

/** Les numéros « Étape N » d'un texte d'étapes */
function stepNumbers(text: string): string[] {
	return text.match(/Étape \d+/g) ?? [];
}

/** Les mots de `short` se lisent dans `long`, dans l'ordre : rien d'ajouté ni de changé */
function isSubsequence(short: string, long: string): boolean {
	const words = long.split(' ');
	let index = 0;
	return short.split(' ').every((word) => {
		while (index < words.length && words[index] !== word) index++;
		return index++ < words.length;
	});
}

/** Les calculs (`aligned`) d'un texte d'étapes */
function alignedBlocks(text: string): string[] {
	return [...text.matchAll(/\\begin\{aligned\}.*?\\end\{aligned\}/g)].map((match) =>
		normalizeLatex(match[0])
	);
}

/** Le choix pressé de l'interrupteur « Résumé / Détaillé » d'une ligne */
async function pressedChoice(answer: Answer): Promise<string | null> {
	return answer.line.locator('button[aria-pressed="true"]').textContent();
}

test('#1292, #1313, #1318 — « Résumé / Détaillé » : ligne par ligne, retenu ; intégrales', async ({
	page
}) => {
	const inequation = await calc(page, '.résoudre 3x-4\\leq 2x+1');
	const detailed = await steps(inequation);
	expect(await pressedChoice(inequation)).toContain('Détaillé');
	const summary = await stepsAs(inequation, 'Résumé');
	// Le résumé retire les explications, pas les étapes ni la réponse
	expect(summary.length).toBeLessThan(detailed.length);
	expect(stepNumbers(summary)).toEqual(stepNumbers(detailed));
	expect(stepNumbers(summary)).toHaveLength(3);
	expect(isSubsequence(summary, detailed)).toBe(true);
	expect(alignedBlocks(summary)).toEqual(alignedBlocks(detailed));
	// La réponse affichée de la ligne n'a pas changé
	expect(await inequation.line.locator('.reponse .math').getAttribute('data-latex')).toBe(
		inequation.latex
	);
	await stepsAs(inequation, 'Détaillé');

	// #1313 : deux lignes dépliées, la 1re en « Résumé » ne change pas la 2e
	const derivative = await calc(page, '.dériver x^2\\sin x');
	await steps(derivative);
	await stepsAs(inequation, 'Résumé');
	expect(await pressedChoice(derivative)).toContain('Détaillé');
	// Une 3e ligne dépliée ensuite s'ouvre en « Résumé »
	const third = await calc(page, '.résoudre 2x+1=5');
	await steps(third);
	expect(await pressedChoice(third)).toContain('Résumé');

	// #1292 : le choix est retenu après rechargement
	await page.reload();
	const afterReload = await calc(page, '.résoudre 5x-1\\geq 4');
	await steps(afterReload);
	expect(await pressedChoice(afterReload)).toContain('Résumé');

	// #1318 : intégrales
	for (const input of ['.intégrer x^2 de 0 à 1', '.intégrer xe^x', '.intégrer e^{2x}']) {
		const integral = await calc(page, input);
		expect(await hasSteps(integral), input).toBe(true);
		expect((await steps(integral)).length, input).toBeGreaterThan(0);
	}
	const noSteps = await calc(page, '.intégrer \\frac{1}{4x^2-1}');
	expect(noSteps.refused).toBe(false);
	expect(await hasSteps(noSteps)).toBe(false);
});

test('#1340 — /cas mène à l’atelier ; .aide, .valeurs, .exporter', async ({ page }) => {
	// `.exporter` n'écrit pas de ligne : il le dit sous la console
	const field = page.getByLabel('Calcul, définition ou commande');
	const notice = page.locator('p.retour');
	await field.fill('.exporter');
	await field.press('Enter');
	await expect(notice).toHaveText('Rien à exporter pour l’instant.');

	for (const address of ['/cas', '/cas?x=1']) {
		await page.goto(address);
		await expect(page).toHaveURL(/\/atelier/);
	}
	await openAtelier(page);
	const help = await calc(page, '.aide');
	expect(help.text).toContain('Réglages');
	expect(help.text).toContain('.valeurs');
	expect(help.text).toContain('.fonctions');
	await calc(page, 'a = 3');
	expect((await calc(page, '.valeurs')).text).toContain('Tes valeurs : a = 3');

	const download = page.waitForEvent('download');
	await page.getByLabel('Calcul, définition ou commande').fill('.exporter');
	await page.getByLabel('Calcul, définition ou commande').press('Enter');
	expect((await download).suggestedFilename()).toMatch(/\.json$/);
	await expect(notice).toContainText('Historique exporté');
});

test('#1356 — l’historique revient au rechargement ; ↑ ; le lien n’emporte que les cartes', async ({
	page
}) => {
	await calc(page, '1/4+1/3');
	await calc(page, '.dériver x^2');
	await calc(page, 'f(x) = 2x');
	await calc(page, '2+3');
	const before = (await cards(page)).map((each) => each.name);
	await page.reload();

	const lines = historyLines(page);
	await expect(lines).toHaveCount(4);
	const fraction = lines.first();
	expect(
		normalizeLatex((await fraction.locator('.reponse .math').getAttribute('data-latex')) ?? '')
	).toBe(normalizeLatex('\\frac{7}{12}'));
	await expect(fraction.getByRole('button', { name: 'Valeur approchée' })).toBeAttached();
	// La définition revenue ne crée pas de carte en double
	expect((await cards(page)).map((each) => each.name)).toEqual(before);

	// ↑ rappelle les saisies
	const field = page.getByLabel('Calcul, définition ou commande');
	await field.click();
	await field.press('ArrowUp');
	await expect(field).toHaveValue('2+3');
	await field.press('ArrowUp');
	await expect(field).toHaveValue('f(x) = 2x');

	// Le lien de partage : les cartes, pas la console. La page du lien partage le stockage de
	// celle-ci (même contexte) : f visible et aucune ligne prouvent que le lien a été lu
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.getByRole('button', { name: 'Partager', exact: true }).click();
	await expect(page.getByLabel('Lien de partage')).toHaveValue(/\?a=/);
	const link = await page.getByLabel('Lien de partage').inputValue();
	const other = await page.context().newPage();
	await other.goto(link);
	await expect(cardLocator(other, 'f')).toBeVisible();
	await expect(other.locator('ol.historique > li')).toHaveCount(0);
	await other.close();

	// « Repartir de zéro » vide les cartes ; la console garde ses lignes (décision du
	// 2026-10-19, #1530), y compris après rechargement
	await page.getByRole('button', { name: 'Repartir de zéro', exact: true }).click();
	await page.getByRole('button', { name: 'Vider l’atelier', exact: true }).click();
	await expect(page.locator('article.objet')).toHaveCount(0);
	await expect(lines.last()).toContainText('Atelier vidé.');
	const kept = await lines.count();
	expect(kept).toBeGreaterThanOrEqual(5);
	await page.reload();
	await expect(lines).toHaveCount(kept);
	await expect(page.locator('article.objet')).toHaveCount(0);
});

test('#1385, #1388, #1423 — « Écriture mathématique » : choix retenu, saisies au clavier', async ({
	page
}) => {
	const dialog = await openSettings(page);
	await expect(dialog.getByRole('radio', { name: 'Texte' })).toBeChecked();
	await page.keyboard.press('Escape');
	await chooseSetting(page, 'Écriture mathématique');
	const field = mathConsole(page);
	await expect(field).toBeVisible();
	await expect(page.locator('input[aria-label="Calcul, définition ou commande"]')).toHaveCount(0);
	// #1388 : la consigne du champ vide
	expect(await field.getAttribute('placeholder')).toMatch(/f\(x\)/);

	await page.reload();
	await expect(mathConsole(page)).toBeVisible();

	// #1388 : la ligne de l'historique écrite en maths, sans point
	const solve = await calcMath(page, 'résoudre x^2=4');
	const written = solve.locator('.saisie');
	await expect(written).toContainText('résoudre');
	await expect(written).not.toContainText('.résoudre');
	await expect(solve.locator('.reponse')).toContainText('2');

	for (const [keys, expected] of [
		['dériver x^3', '3 x^2'],
		['1/4+1/3', '\\frac{7}{12}'],
		['5 km + 300 m', '5{,}3']
	] as const) {
		const line = await calcMath(page, keys);
		await expect(line, keys).not.toHaveClass(/refus/);
		const shown = (await line.locator('.reponse .math').getAttribute('data-latex')) ?? '';
		expect(normalizeLatex(shown), keys).toContain(normalizeLatex(expected));
	}
	// 5 km + 300 m : la grandeur dite en texte
	await expect(historyLines(page).last().locator('.reponse')).toContainText('5,3 km');

	// #1423 : `3*4` → la croix ×, puis 12
	await field.click();
	await page.keyboard.type('3*4');
	expect(await mathValue(field)).toContain('\\times');
	expect(await mathValue(field)).not.toContain('\\cdot');
	await page.keyboard.press('Enter');
	await expect(historyLines(page).last().locator('.reponse')).toContainText('12');

	// ↑ rappelle la saisie précédente
	await field.click();
	await page.keyboard.press('ArrowUp');
	expect(await mathValue(field)).toContain('\\times');

	// Rechargée, la ligne revient écrite de même
	await page.reload();
	await expect(historyLines(page).first().locator('.saisie')).toContainText('résoudre');
	await expect(historyLines(page).first().locator('.saisie')).not.toContainText('.résoudre');

	// #1385 : passer au Graphe et revenir, la ligne commencée reste
	await typeMath(page, '2+');
	await openView(page, 'Graphe');
	await openView(page, 'Données');
	await openView(page, 'Graphe');
	if ((await consoleButton(page).getAttribute('aria-expanded')) === 'false') {
		await consoleButton(page).click();
	}
	expect(await mathValue(mathConsole(page))).toContain('2+');
});

test('#1385 — « Simuler avec probabilités M » : simuler L M 100, lettres séparées', async ({
	page
}) => {
	await calc(page, 'L = 1 ; 2 ; 3 ; 4 ; 5 ; 6');
	await calc(page, 'M = 0,1 ; 0,1 ; 0,1 ; 0,1 ; 0,1 ; 0,5');
	await chooseSetting(page, 'Écriture mathématique');
	await cardAction(page, 'L', 'Avec une autre liste');
	await page.getByRole('menuitem', { name: /Simuler avec probabilités M/ }).click();
	const value = await mathValue(mathConsole(page));
	expect(value.replace(/\s+/g, '')).toBe('\\text{simuler}\\,L\\,M\\,100');
});

/** Le bouton ☰ et le bouton du clavier virtuel d'un champ MathLive sont-ils affichés ? */
async function mathFieldButtons(field: Locator): Promise<{ menu: boolean; keyboard: boolean }> {
	return field.evaluate((element) => {
		const shown = (part: string) => {
			const node = element.shadowRoot?.querySelector(`[part~="${part}"]`);
			return node !== null && node !== undefined && getComputedStyle(node).display !== 'none';
		};
		return { menu: shown('menu-toggle'), keyboard: shown('virtual-keyboard-toggle') };
	});
}

test('#1425 — pas de menu ☰ ni de menu au clic droit dans les champs mathématiques', async ({
	page
}) => {
	const menu = page.locator('.ui-menu-container');
	await chooseSetting(page, 'Écriture mathématique');
	await calcMath(page, 'f(x)=x^2');
	for (const field of [mathConsole(page), cardLocator(page, 'f').locator('math-field')]) {
		expect(await mathFieldButtons(field)).toEqual({ menu: false, keyboard: true });
		await field.click({ button: 'right' });
		// Une absence ne s'attend pas : un court délai, le témoin ci-dessous s'ouvre en moins
		await page.waitForTimeout(500);
		await expect(menu).toHaveCount(0);
		await page.keyboard.press('Escape');
	}
	// Témoin, en dernier (son menu ne se referme pas à Échap ici) : un champ
	// MathLive ordinaire a son ☰ et son menu au clic droit
	await page.evaluate(() => {
		const plain = document.createElement('math-field');
		plain.id = 'temoin';
		plain.style.cssText = 'position:fixed;top:300px;left:600px;width:200px;z-index:9999';
		document.body.append(plain);
	});
	const plain = page.locator('#temoin');
	await expect.poll(async () => (await mathFieldButtons(plain)).menu).toBe(true);
	await plain.click({ button: 'right' });
	await expect(menu.first()).toBeVisible();
});

test('#1442 — fonctions de la grille tapées dans Calcul ; π dans la grille', async ({ page }) => {
	await calc(page, 'L = 12 ; 15 ; 9');
	for (const input of ['mediane(L)', 'médiane(L)']) {
		const answer = await calc(page, input);
		expect(answer.text, input).toContain('MEDIANE est une fonction de la grille');
		expect(answer.text, input).toContain('tape .stats L');
	}
	expectLatex(await calc(page, 'max(2;3)'), '3');

	await openView(page, 'Données');
	await typeCell(page, 'A1', '=pi');
	expect((await readCell(page, 'A1')).note).toContain('Écris π avec \\pi ou le symbole π.');
	await typeCell(page, 'A2', '=PI()');
	expect((await readCell(page, 'A2')).latex).toBe(normalizeLatex('\\pi'));
});

/** Le bouton n'est recouvert par rien : un clic en son centre l'atteint */
async function expectNotCovered(button: Locator): Promise<void> {
	expect(
		await button.evaluate((element) => {
			const box = element.getBoundingClientRect();
			const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
			return top !== null && element.contains(top);
		})
	).toBe(true);
}

test('#1442 — téléphone (390 px) : « Mes objets » hors de la barre d’icônes, défile à 8 objets', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.reload();
	const panel = page.locator('aside.panneau');
	const scrolls = () =>
		panel.evaluate((element) =>
			[element, ...element.querySelectorAll('*')].some(
				(node) =>
					node.scrollHeight > node.clientHeight + 1 &&
					['auto', 'scroll'].includes(getComputedStyle(node).overflowY)
			)
		);
	for (const name of ['a', 'b']) await calc(page, `${name} = 1`);
	await consoleButton(page).click();
	await expect(consoleButton(page)).toHaveAttribute('aria-expanded', 'false');
	// Replié au téléphone depuis #1546 (plus récent que la ligne) : on le déplie
	await expect(panel).toHaveClass(/replie/);
	await panel.locator('button.replier').click();
	await expect(panel.locator('.compte')).toHaveText(/2\s+objets/);
	// Contre-épreuve : avec 2 objets, rien ne défile
	expect(await scrolls()).toBe(false);
	for (const name of ['c', 'k', 's', 'p', 'q', 'r']) await calc(page, `${name} = 1`);
	await consoleButton(page).click();
	await expect(panel.locator('.compte')).toHaveText(/8\s+objets/);
	// Ni le panneau ni ses boutons « + Fonction… » ne passent sous « Partager », « Réglages »
	for (const name of ['Partager', 'Réglages']) {
		await expectNotCovered(page.getByRole('button', { name, exact: true }));
	}
	await expectNotCovered(panel.getByRole('button', { name: '+ Fonction' }));
	// Avec 8 objets, le panneau défile
	expect(await scrolls()).toBe(true);
	// Reste à la main : la vue Graphe utilisable à 390 px
});

test('#1692 — tableur V4 retiré : /spreadsheet mène à l’atelier', async ({ page }) => {
	for (const address of ['/spreadsheet', '/spreadsheet/00000000-0000-0000-0000-000000000000']) {
		await page.goto(address);
		await expect(page).toHaveURL(/\/atelier/);
	}
	await openView(page, 'Données');
	await typeCell(page, 'A1', '=2+3');
	expect((await readCell(page, 'A1')).shown).toBe('5');
});

/** Clique « Simplifier pour … » d'une ligne et rend sa réponse */
async function simplifyFor(answer: Answer, condition: string): Promise<string> {
	await answer.line.getByRole('button', { name: `Simplifier pour ${condition}` }).click();
	await expect(answer.line.getByRole('button', { name: 'Sans simplifier' })).toBeVisible();
	return normalizeLatex(
		(await answer.line.locator('.reponse .math').getAttribute('data-latex')) ?? ''
	);
}

test('#1807 — « Simplifier pour x ≠ … » et « Sans simplifier »', async ({ page }) => {
	const fraction = await calc(page, '.simplifier (x^2-1)/(x+1)');
	await simplifyFor(fraction, 'x ≠ −1');
	await fraction.line.getByRole('button', { name: 'Sans simplifier' }).click();
	await expect(fraction.line.getByRole('button', { name: 'Simplifier pour x ≠ −1' })).toBeVisible();
	expect(
		normalizeLatex((await fraction.line.locator('.reponse .math').getAttribute('data-latex')) ?? '')
	).toBe(normalizeLatex('\\dfrac{x^2 - 1}{x + 1}'));

	const typed = await calc(page, 'x/x');
	await expect(typed.line.getByRole('button', { name: 'Simplifier pour x ≠ 0' })).toBeVisible();

	const developed = await calc(page, '.développer x(1/x-1)');
	expectLatex(developed, '-x + \\dfrac{x}{x}');
	expect(await simplifyFor(developed, 'x ≠ 0')).toContain(normalizeLatex('-x + 1'));

	const log = await calc(page, '.simplifier ln(x^2)');
	expect(await log.line.getByRole('button', { name: /Simplifier pour/ }).count()).toBe(0);
});

test('#1811 — réglage « Simplifications qui changent le domaine »', async ({ page }) => {
	const dialog = await openSettings(page);
	await expect(dialog.getByText('Simplifications qui changent le domaine')).toBeVisible();
	await expect(dialog.getByRole('radio', { name: 'Garder l’écriture' })).toBeChecked();
	await page.keyboard.press('Escape');

	const kept = await calc(page, 'x/x');
	expect(kept.text).toContain(
		'On peut simplifier davantage pour x ≠ 0 : ajoute « avec x ≠ 0 » (ou « dans ℝ \\ {0} »)'
	);
	expectLatex(await calc(page, 'x/x avec x ≠ 0'), '1');

	await chooseSetting(page, 'Simplifier en disant la condition');
	const simplified = await calc(page, 'x/x');
	expectLatex(simplified, '1\\text{,}\\quad\\text{pour }x \\neq 0');
	await expect(simplified.line.getByRole('button', { name: 'Sans simplifier' })).toBeVisible();
	// L'ancienne ligne ne change pas
	expect(
		normalizeLatex((await kept.line.locator('.reponse .math').getAttribute('data-latex')) ?? '')
	).toBe(normalizeLatex(kept.latex ?? ''));

	await page.reload();
	const again = await openSettings(page);
	await expect(
		again.getByRole('radio', { name: 'Simplifier en disant la condition' })
	).toBeChecked();
	await page.keyboard.press('Escape');
	expectLatex(await calc(page, '.simplifier ln(x)-ln(x) dans ]0;+∞[ ∩ ]-∞;5]'), '0');
});

test('console de l’Atelier — ouverte, fermée, raccourcis, poignée, lignes, menu', async ({
	page
}) => {
	// Plus d'onglet Calcul ; /atelier ouvre la console
	await expect(
		page
			.getByRole('navigation', { name: "Vues de l'atelier" })
			.getByRole('button', { name: 'Calcul' })
	).toHaveCount(0);
	await expect(consoleButton(page)).toHaveAttribute('aria-expanded', 'true');

	// Lignes : « > », « --> », « a est correctement défini »
	const defined = await calc(page, 'a = 2');
	await expect(defined.line.locator('.invite')).toHaveText('>');
	await expect(defined.line.locator('.fleche')).toHaveText('-->');
	expect(defined.text).toContain('a est correctement défini.');
	await expect(defined.line.locator('.nom-defini')).toHaveText('a');

	// Ctrl+Entrée ferme, même depuis le champ ; Échap aussi, focus au bouton
	const field = page.getByLabel('Calcul, définition ou commande');
	await field.focus();
	await page.keyboard.press('Control+Enter');
	await expect(consoleButton(page)).toHaveAttribute('aria-expanded', 'false');
	await page.keyboard.press('Control+Enter');
	await expect(consoleButton(page)).toHaveAttribute('aria-expanded', 'true');
	await field.focus();
	await page.keyboard.press('Escape');
	await expect(consoleButton(page)).toHaveAttribute('aria-expanded', 'false');
	await expect(consoleButton(page)).toBeFocused();

	// La touche sous Échap hors d'un champ ouvre / ferme ; dans un champ, elle tape
	// (le focus est sur le bouton Console, hors d'un champ)
	await page.keyboard.press('Backquote');
	await expect(consoleButton(page)).toHaveAttribute('aria-expanded', 'true');
	await field.focus();
	await field.fill('');
	await page.keyboard.press('Backquote');
	await expect(consoleButton(page)).toHaveAttribute('aria-expanded', 'true');
	await expect(field).not.toHaveValue('');
	await field.fill('');

	// Poignée : les flèches changent la hauteur
	const handle = page.getByRole('separator', { name: 'Hauteur de la console' });
	const height = Number(await handle.getAttribute('aria-valuenow'));
	await handle.focus();
	await handle.press('ArrowDown');
	expect(Number(await handle.getAttribute('aria-valuenow'))).not.toBe(height);

	// Action de carte console fermée : un nombre sur le bouton
	await calc(page, 'f(x) = x^2');
	await page.keyboard.press('Control+Enter');
	await expect(consoleButton(page)).toHaveAttribute('aria-expanded', 'false');
	await cardAction(page, 'f', 'Variations');
	await expect(consoleButton(page)).toHaveAccessibleDescription('1 nouveau résultat');

	// Menu ⋮ : copier / télécharger l'historique ubumark
	await consoleButton(page).click();
	await page.getByRole('button', { name: 'Menu de la console' }).click();
	await expect(
		page.getByRole('menuitem', { name: 'Copier l’historique pour une fiche' })
	).toBeVisible();
	const download = page.waitForEvent('download');
	await page.getByRole('menuitem', { name: 'Télécharger l’historique (ubumark)' }).click();
	expect((await download).suggestedFilename()).toBeTruthy();

	// /grapheur : console fermée
	await page.goto('/grapheur');
	await expect(consoleButton(page)).toHaveAttribute('aria-expanded', 'false');
});
