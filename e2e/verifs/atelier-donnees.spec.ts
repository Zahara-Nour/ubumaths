import { expect, test, type Page } from '@playwright/test';
import { calc, card, cardLocator, normalizeLatex, openAtelier } from './helpers/atelier';
import {
	cellLocator,
	hintWhileTyping,
	nameColumn,
	openView,
	readCell,
	selectCell,
	setConsole,
	shownIn,
	typeCell,
	typeColumn
} from './helpers/grille';

/**
 * La vue Données de l'Atelier — lignes de `docs/wip/verifications-manuelles.md`
 * ===============================================================================
 *
 * La grille : on tape dans une case par la barre du haut, on lit ce que la
 * case montre et ce qui s'écrit sous la barre (« Valeur exacte », message
 * d'une case en erreur, aide d'une fonction). Un test par ligne, son numéro de
 * PR dans le titre. L'attendu est celui de la ligne : un test rouge est un bug
 * ou une ligne périmée, à signaler à David — jamais un attendu à changer pour
 * passer.
 */

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
	await openView(page, 'Données');
});

/** Sélectionne la zone de `from` à `to` (clic, puis Maj + clic) */
async function selectZone(page: Page, from: string, to: string): Promise<void> {
	await selectCell(page, from);
	await cellLocator(page, to).click({ modifiers: ['Shift'] });
}

/** « Recopier vers le bas… » : recopie la première ligne de la zone jusqu'à la ligne `to` */
async function fillDownTo(page: Page, to: number): Promise<void> {
	await page.getByRole('button', { name: 'Recopier vers le bas…' }).click();
	const field = page.getByLabel('Recopier jusqu’à la ligne');
	await field.fill(String(to));
	await field.press('Enter');
}

test('#1421 — formules : cases, objets de l’atelier, case vide, erreur', async ({ page }) => {
	await typeCell(page, 'A1', '3');
	await typeCell(page, 'B1', '=a1/6+1/6');
	expect(await readCell(page, 'B1')).toMatchObject({ shown: '2/3', bar: '=A1/6+1/6' });
	await typeCell(page, 'B2', '=2^A1');
	await expect.poll(() => shownIn(page, 'B2')).toBe('8');
	await typeCell(page, 'B3', '=1,05^A1');
	await expect.poll(() => shownIn(page, 'B3')).toBe('1,157625');

	// Une fonction f et un curseur a de l'atelier
	await calc(page, 'f(x) = x^2');
	await calc(page, 'a = 2');
	await calc(page, 'g(x) = a x');
	await typeCell(page, 'C1', '=f(A1)');
	await expect.poll(() => shownIn(page, 'C1')).toBe('9');
	await typeCell(page, 'C2', '=a*A1');
	await expect.poll(() => shownIn(page, 'C2')).toBe('6');
	// Glisser le curseur : la case suit
	const slider = cardLocator(page, 'a').getByRole('slider');
	await slider.focus();
	await slider.press('ArrowRight');
	await expect.poll(() => shownIn(page, 'C2')).not.toBe('6');

	// Un nom inconnu : la case en erreur, en rouge, la phrase sous la barre
	await typeCell(page, 'C3', '=k*2');
	const unknown = await readCell(page, 'C3');
	expect(unknown).toMatchObject({ shown: 'erreur', error: true });
	expect(unknown.note).toContain('k n’est pas défini');

	// Une case vide citée : case vide, « A9 est vide. »
	await typeCell(page, 'C4', '=A9+1');
	expect(await readCell(page, 'C4')).toMatchObject({ shown: 'vide', note: 'A9 est vide.' });

	// 15 lignes recopiées à la main puis une racine : pas de gel
	await typeCell(page, 'D1', '=1000');
	for (let row = 2; row <= 15; row++) {
		await typeCell(page, `D${row}`, `=D${row - 1}*1,01`);
	}
	await typeCell(page, 'D16', '=sqrt(D15+1)');
	await expect.poll(() => shownIn(page, 'D16')).toMatch(/^≈ 33,/);
});

test('#1422 — valeur exacte sous la barre, π écrit en maths', async ({ page }) => {
	await typeCell(page, 'A1', '=sqrt(8)');
	const root = await readCell(page, 'A1');
	expect(root.latex).toBe('2\\sqrt{2}');
	expect(root.exact).toBe('2\\sqrt{2}');
	await typeCell(page, 'A2', '=π*3');
	expect((await readCell(page, 'A2')).latex).toBe('3\\pi');
	await typeCell(page, 'A3', '=1/123456789+1/7');
	const long = await readCell(page, 'A3');
	expect(long.shown).toBe('≈ 0,1429');
	expect(long.exact).not.toBeNull();
	// Une fraction s'écrit en texte, pas en maths (elle débordait de la ligne)
	await typeCell(page, 'A4', '=2/3');
	expect(await readCell(page, 'A4')).toMatchObject({ shown: '2/3', latex: null });
});

test('#1424 — recopier vers le bas : Ctrl+D, « Recopier vers le bas… », annuler, rechargement', async ({
	page
}) => {
	await typeCell(page, 'A1', '1');
	await typeCell(page, 'A2', '=A1*2');
	await selectZone(page, 'A2', 'A6');
	await page.keyboard.press('ControlOrMeta+D');
	await expect.poll(() => shownIn(page, 'A6')).toBe('32');

	await selectCell(page, 'A2');
	await fillDownTo(page, 10);
	expect((await readCell(page, 'A10')).bar).toBe('=A9*2');
	await expect.poll(() => shownIn(page, 'A10')).toBe('512');
	// Ctrl+Z annule la recopie d'un coup
	await selectCell(page, 'A2');
	await page.keyboard.press('ControlOrMeta+Z');
	await expect.poll(() => shownIn(page, 'A10')).toBe('vide');
	await expect.poll(() => shownIn(page, 'A6')).toBe('32');

	// Recharger la page : la formule est toujours là
	await typeCell(page, 'B1', '=max(1;2)');
	await page.reload();
	await openView(page, 'Données');
	expect(await readCell(page, 'B1')).toMatchObject({ shown: '2', bar: '=MAX(1;2)' });
});

test('#1426 — .tabuler : colonnes A et B, valeurs décimales, la colonne suit f', async ({
	page
}) => {
	await calc(page, 'f(x) = x^2-3x');
	const tabled = await calc(page, '.tabuler f de -2 à 3 pas 0,5');
	expect(tabled.text).toContain('colonnes A et B (11 lignes)');
	await openView(page, 'Données');
	await expect(page.getByLabel('Titre de la colonne A')).toHaveValue('x');
	await expect(page.getByLabel('Titre de la colonne B')).toHaveValue('f(x)');
	// A2 montre -1,5 (pas -3/2) ; B2 6,75, sans « Valeur exacte »
	await expect.poll(() => shownIn(page, 'A2')).toBe('-1,5');
	expect(await readCell(page, 'B2')).toMatchObject({ shown: '6,75', exact: null });

	await calc(page, 'f(x) = 10x');
	await expect.poll(() => shownIn(page, 'B2')).toBe('-15');

	const refused = await calc(page, '.tabuler x^2');
	expect(refused.refused).toBe(true);
	expect(refused.text).toContain('g(x) = x^2');

	await typeCell(page, 'D1', '=1/3');
	await expect.poll(() => shownIn(page, 'D1')).toBe('1/3');
});

test('#1430 — SOMME, MOYENNE, MEDIANE, ECARTYPE, plages, listes nommées', async ({ page }) => {
	await typeColumn(page, 'A1', ['12', '15', '9', '14']);
	await typeCell(page, 'B1', '=somme(a1:a4)');
	expect(await readCell(page, 'B1')).toMatchObject({ shown: '50', bar: '=SOMME(A1:A4)' });
	await typeCell(page, 'B2', '=MOYENNE(A:A)');
	await expect.poll(() => shownIn(page, 'B2')).toBe('12,5');
	await typeCell(page, 'B3', '=MEDIANE(A1:A4)');
	await expect.poll(() => shownIn(page, 'B3')).toBe('13');
	await typeCell(page, 'B4', '=ECARTYPE(A1:A4)');
	expect(await readCell(page, 'B4')).toMatchObject({ shown: '≈ 2,6458', exact: '\\sqrt{7}' });
	await typeCell(page, 'B5', '=A1:A2');
	expect((await readCell(page, 'B5')).note).toContain('Une plage s’utilise dans une fonction');

	// Somme cumulée : $A$1 reste, A1 glisse
	await typeCell(page, 'C1', '=SOMME($A$1:A1)');
	await selectZone(page, 'C1', 'C4');
	await page.keyboard.press('ControlOrMeta+D');
	for (const [row, sum] of ['12', '27', '36', '50'].entries()) {
		expect(await shownIn(page, `C${row + 1}`)).toBe(sum);
	}

	await nameColumn(page, 'A', 'L');
	await typeCell(page, 'D1', '=MOYENNE(L)');
	await expect.poll(() => shownIn(page, 'D1')).toBe('12,5');

	await calc(page, 'a = 6');
	await calc(page, 'b = 3');
	await typeCell(page, 'D2', '=a:b');
	await expect.poll(() => shownIn(page, 'D2')).toBe('2');
});

test('#1431 — ARRONDI, RACINE, PI et l’aide pendant la frappe', async ({ page }) => {
	await typeCell(page, 'A1', '=arrondi(2,675;2)');
	expect(await readCell(page, 'A1')).toMatchObject({ shown: '2,68', bar: '=ARRONDI(2,675;2)' });
	await typeCell(page, 'A2', '=ARRONDI(-2,5;0)');
	await expect.poll(() => shownIn(page, 'A2')).toBe('-3');
	await typeCell(page, 'A3', '=RACINE(8)');
	expect((await readCell(page, 'A3')).latex).toBe('2\\sqrt{2}');
	await typeCell(page, 'A4', '=RACINE(-1)');
	expect((await readCell(page, 'A4')).note).toContain('pas un nombre réel');
	await typeCell(page, 'A5', '=PI()');
	expect((await readCell(page, 'A5')).latex).toBe('\\pi');
	await typeCell(page, 'A6', '=ARRONDI(A1;100)');
	expect((await readCell(page, 'A6')).note).toContain('entre -15 et 15');

	expect(await hintWhileTyping(page, 'B1', '=ARRONDI(MOYENNE(A1')).toBe(
		'MOYENNE(plage ; …) — la moyenne des nombres'
	);
	expect(await hintWhileTyping(page, 'B1', '=A1*ab')).toBeNull();
});

test('#1432 — « Valeur exacte » quand la case montre autre chose', async ({ page }) => {
	await typeCell(page, 'A2', '=1/4');
	expect(await readCell(page, 'A2')).toMatchObject({ shown: '0,25', exact: '\\frac{1}{4}' });
	await typeCell(page, 'A3', '=0,25');
	expect((await readCell(page, 'A3')).exact).toBeNull();
	await typeCell(page, 'A1', '=ARRONDI(PI();4)');
	expect(await readCell(page, 'A1')).toMatchObject({ shown: '3,1416', exact: null });
	await typeCell(page, 'B1', '=A1+1');
	expect(await readCell(page, 'B1')).toMatchObject({ shown: '4,1416', exact: null });
	await typeCell(page, 'B2', '=MOYENNE(2;3)');
	expect(await readCell(page, 'B2')).toMatchObject({ shown: '2,5', exact: '\\frac{5}{2}' });
	await typeCell(page, 'B3', '=RACINE(2)');
	expect(await readCell(page, 'B3')).toMatchObject({ shown: '≈ 1,4142', exact: '\\sqrt{2}' });
});

test('#1434 — SI, NB.SI, et les refus d’un texte ou d’une comparaison seuls', async ({ page }) => {
	await typeColumn(page, 'A1', ['12', '8', '15', '10', '7,5']);
	await typeColumn(page, 'B1', ['fille', 'garçon', 'Fille', 'garçon', 'fille']);
	await typeCell(page, 'C1', '=SI(A1>=10;"admis";"ajourné")');
	await expect.poll(() => shownIn(page, 'C1')).toBe('admis');
	await selectZone(page, 'C1', 'C8');
	await page.keyboard.press('ControlOrMeta+D');
	await expect.poll(() => shownIn(page, 'C2')).toBe('ajourné');
	for (const row of [6, 7, 8]) expect(await shownIn(page, `C${row}`)).toBe('vide');

	await typeCell(page, 'D1', '=NB.SI(B1:B5;"fille")');
	await expect.poll(() => shownIn(page, 'D1')).toBe('3');
	await typeCell(page, 'D2', '=NB.SI(B1:B5;B1)');
	await expect.poll(() => shownIn(page, 'D2')).toBe('3');
	await typeCell(page, 'D3', '=NB.SI(A1:A5;">=10")');
	await expect.poll(() => shownIn(page, 'D3')).toBe('3');
	await typeCell(page, 'D4', '="fille"');
	expect((await readCell(page, 'D4')).note).toContain(
		'Un texte entre guillemets s’utilise dans SI ou NB.SI'
	);
	await typeCell(page, 'D5', '=A1>2');
	expect((await readCell(page, 'D5')).note).toContain('Une comparaison s’écrit dans SI');

	const calcRoot = await calc(page, 'racine(2)');
	expect(calcRoot.refused).toBe(true);
	expect(calcRoot.text).toContain('écris sqrt(…)');
});

test('#1437 — ALEA.ENTRE.BORNES, ALEA, gardés au rechargement', async ({ page }) => {
	// Des centaines de saisies : au-delà du délai par défaut sur un serveur de dev à froid
	test.setTimeout(120_000);
	await typeCell(page, 'A1', '=alea.entre.bornes(1;6)');
	const die = await readCell(page, 'A1');
	expect(die.bar).toBe('=ALEA.ENTRE.BORNES(1;6)');
	expect(['1', '2', '3', '4', '5', '6']).toContain(die.shown);

	await selectCell(page, 'A1');
	await fillDownTo(page, 200);
	await typeCell(page, 'B1', '=NB.SI(A1:A200;6)');
	// Environ 33 six sur 200 dés (au-delà de 10 à 60 : moins d'une chance sur un million)
	const sixes = Number(await shownIn(page, 'B1'));
	expect(sixes).toBeGreaterThanOrEqual(10);
	expect(sixes).toBeLessThanOrEqual(60);

	const before = await Promise.all(['A1', 'A2', 'A3', 'B1'].map((at) => shownIn(page, at)));
	await typeCell(page, 'C1', 'ailleurs');
	await page.reload();
	await openView(page, 'Données');
	const after = await Promise.all(['A1', 'A2', 'A3', 'B1'].map((at) => shownIn(page, at)));
	expect(after).toEqual(before);

	await typeCell(page, 'C2', '=ALEA()');
	const draw = Number((await shownIn(page, 'C2')).replace(/^≈ /, '').replace(',', '.'));
	expect(draw).toBeGreaterThanOrEqual(0);
	expect(draw).toBeLessThan(1);
	await typeCell(page, 'C3', '=ALEA.ENTRE.BORNES(6;1)');
	expect((await readCell(page, 'C3')).error).toBe(true);
});

test('#1444 — fonction nommée f_1 : Calcul, grille, refus sans valeur', async ({ page }) => {
	for (const definition of ['f(x) = x', 'g(x) = 2x', 'h(x) = 3x', 'f_1(x) = 3x^2']) {
		await calc(page, definition);
	}
	expect((await calc(page, 'f_1(3)')).latex).toBe('27');
	expect((await calc(page, "f_1'(2)")).latex).toBe('12');
	await typeCell(page, 'A1', '=f_1(2)');
	await expect.poll(() => shownIn(page, 'A1')).toBe('12');
	await typeCell(page, 'A2', '=2f_1');
	expect((await readCell(page, 'A2')).note).toBe(
		'f_1 est une fonction : écris-la avec une valeur, par exemple f_1(3).'
	);
});

test('#1472 — RESTE, SI avec ET et OU, ET seul refusé', async ({ page }) => {
	await typeCell(page, 'D1', '=RESTE(17;5)');
	await expect.poll(() => shownIn(page, 'D1')).toBe('2');
	await typeCell(page, 'D2', '=RESTE(-7;3)');
	await expect.poll(() => shownIn(page, 'D2')).toBe('2');
	await typeCell(page, 'D3', '=RESTE(5;0)');
	expect((await readCell(page, 'D3')).note).toContain('on ne divise pas par 0');
	expect(await hintWhileTyping(page, 'D4', '=RESTE(')).toContain('ENT(n/d)');

	// Notes en A, sexe en B, à partir de la ligne 2
	await typeColumn(page, 'A2', ['12', '8', '15', '3', '17']);
	await typeColumn(page, 'B2', ['fille', 'fille', 'garçon', 'fille', 'fille']);
	await typeCell(page, 'C2', '=SI(ET(A2>=10;B2="fille");"oui";"non")');
	await selectZone(page, 'C2', 'C6');
	await page.keyboard.press('ControlOrMeta+D');
	for (const [index, expected] of ['oui', 'non', 'non', 'non', 'oui'].entries()) {
		expect(await shownIn(page, `C${index + 2}`)).toBe(expected);
	}
	await typeCell(page, 'E2', '=SI(OU(A2<5;A2>15);1;0)');
	await selectZone(page, 'E2', 'E6');
	await page.keyboard.press('ControlOrMeta+D');
	for (const [index, expected] of ['0', '0', '0', '1', '1'].entries()) {
		expect(await shownIn(page, `E${index + 2}`)).toBe(expected);
	}

	await typeCell(page, 'F1', '=ET(A1>1;A2>1)');
	expect((await readCell(page, 'F1')).note).toContain('=SI(ET(');
});

test('#1477 — NBVAL et NB.VIDE : absents, cases laissées vides par une formule', async ({
	page
}) => {
	// Des centaines de saisies : au-delà du délai par défaut sur un serveur de dev à froid
	test.setTimeout(120_000);
	// 30 notes en A2:A31, deux absents (A5 et A20)
	const notes = Array.from({ length: 30 }, (_, i) => (i === 3 || i === 18 ? '' : String(i % 20)));
	for (const [index, note] of notes.entries()) {
		if (note !== '') await typeCell(page, `A${index + 2}`, note);
	}
	await typeCell(page, 'B2', '=SI(A2>=10;"admis";"")');
	await selectCell(page, 'B2');
	await fillDownTo(page, 31);

	await typeCell(page, 'C1', '=NBVAL(A2:A31)');
	await expect.poll(() => shownIn(page, 'C1')).toBe('28');
	await typeCell(page, 'C2', '=NB.VIDE(A2:A31)');
	await expect.poll(() => shownIn(page, 'C2')).toBe('2');
	// Les cases laissées vides par la formule (notes sous 10, absents) ne comptent pas
	const admitted = notes.filter((note) => note !== '' && Number(note) >= 10).length;
	await typeCell(page, 'C3', '=NBVAL(B2:B31)');
	await expect.poll(() => shownIn(page, 'C3')).toBe(String(admitted));

	await typeCell(page, 'C4', '=NB.VIDE(A:A)');
	expect((await readCell(page, 'C4')).note).toContain('NB.VIDE(A2:A31)');
	expect(await hintWhileTyping(page, 'C5', '=NB.V')).toContain('NB.VIDE');
});

test('#1410 — la grille : saisie répartie, colonne nommée en liste, nom retiré puis rendu', async ({
	page
}) => {
	await typeCell(page, 'A1', '12');
	// Entrée descend d'une case
	await expect(cellLocator(page, 'A2')).toHaveClass(/\bactive\b/);
	await typeCell(page, 'A2', '12 ; 15 ; 9');
	for (const [index, value] of ['12', '12', '15', '9'].entries()) {
		expect(await shownIn(page, `A${index + 1}`)).toBe(value);
	}

	await nameColumn(page, 'A', 'L');
	await expect(cardLocator(page, 'L')).toBeVisible();
	await expect(page.locator('tr.apercus')).toContainText('n = 4');

	// « × » retire le nom : la carte part, les cases restent ; ↶ remet L
	await page.getByRole('button', { name: 'Retirer le nom L de la colonne A' }).click();
	await expect(cardLocator(page, 'L')).toHaveCount(0);
	await expect.poll(() => shownIn(page, 'A3')).toBe('15');
	await page.getByRole('button', { name: 'Annuler : retirer le nom de la colonne A' }).click();
	await expect(cardLocator(page, 'L')).toBeVisible();
	// Ctrl+Z aussi
	await page.getByRole('button', { name: 'Retirer le nom L de la colonne A' }).click();
	await expect(cardLocator(page, 'L')).toHaveCount(0);
	await selectCell(page, 'A1');
	await page.keyboard.press('ControlOrMeta+Z');
	await expect(cardLocator(page, 'L')).toBeVisible();

	const cellInCalc = await calc(page, 'B2+1');
	expect(cellInCalc.refused).toBe(true);
	expect(cellInCalc.text).toContain('B2 est une cellule de la grille');
});

test('#1413 — lignes incomplètes écartées : ajustement, nuage, .stats, .croiser', async ({
	page
}) => {
	await typeColumn(page, 'A1', ['1', '2']);
	await typeCell(page, 'A4', '4');
	await typeColumn(page, 'B1', ['3', '5', '100', '9']);
	await nameColumn(page, 'A', 'L');
	await nameColumn(page, 'B', 'M');

	const withM = async (action: string) => {
		await cardLocator(page, 'L').getByRole('button', { name: 'Options de L' }).click();
		await page.getByRole('menuitem', { name: 'Avec une autre liste' }).click();
		await page.getByRole('menuitem', { name: action }).click();
	};
	await withM('Ajustement avec M');
	await expect(cardLocator(page, 'f')).toBeVisible();
	// La réponse de l'ajustement s'écrit dans la console
	const lines = page.locator('ol.historique > li');
	await setConsole(page, true);
	await expect(lines.last()).toContainText('f(x) = 2x + 1');
	await expect(lines.last()).toContainText('1 ligne incomplète écartée');
	// La carte créée dit f(x) = 2x + 1, comme la console
	await expect.poll(async () => normalizeLatex((await card(page, 'f')).latex ?? '')).toBe('2x+1');

	await withM('Nuage avec M');
	await openView(page, 'Graphe');
	await expect(page.locator('.scatter-point')).toHaveCount(3);

	const stats = await calc(page, '.stats L ; M');
	// Toutes les valeurs : 3 de L et 4 de M
	expect(stats.text).toContain('Effectif : 7');

	await openView(page, 'Données');
	await typeColumn(page, 'C1', ['fille', 'garçon', 'fille']);
	await typeColumn(page, 'D1', ['oui', 'non']);
	await typeCell(page, 'D3', '');
	await nameColumn(page, 'C', 'N');
	await nameColumn(page, 'D', 'P');
	const crossed = await calc(page, '.croiser N P');
	expect(crossed.text).toContain('1 ligne incomplète écartée');
	expect(crossed.text).not.toContain('.filtrer');
});

test('#1427 — « Tabuler » d’une carte : tableau dans la grille, annuler, pas refusé', async ({
	page
}) => {
	await calc(page, 'f(x) = x^2-3x');
	await openView(page, 'Graphe');
	await cardLocator(page, 'f').getByRole('button', { name: 'Options de f' }).click();
	await page.getByRole('menuitem', { name: 'Tabuler', exact: true }).click();
	const dialog = page.getByRole('dialog');
	const from = dialog.getByLabel('Début du tableau de f');
	const to = dialog.getByLabel('Fin du tableau de f');
	const step = dialog.getByLabel('Pas du tableau de f');
	// Pré-rempli « de -5 à 5 pas 1 »
	await expect(from).toHaveValue('-5');
	await expect(to).toHaveValue('5');
	await expect(step).toHaveValue('1');

	// Pas 0 : refus dans la fenêtre, rien d'écrit
	await step.fill('0');
	await step.press('Enter');
	await expect(dialog.getByRole('alert')).not.toBeEmpty();

	await from.fill('-2');
	await to.fill('3');
	await step.fill('0,5');
	await step.press('Enter');
	await expect(dialog).toHaveCount(0);
	await expect(
		page.getByRole('navigation', { name: "Vues de l'atelier" }).getByRole('button', {
			name: 'Données'
		})
	).toHaveAttribute('aria-current', 'page');
	// Zone A1:B11 sélectionnée, la phrase dans la carte
	await expect(page.locator('td[role="gridcell"][aria-selected="true"]')).toHaveCount(22);
	await expect(cellLocator(page, 'B11')).toHaveAttribute('aria-selected', 'true');
	await expect(cardLocator(page, 'f')).toContainText('colonnes A et B (11 lignes)');

	// Ctrl+Z tout de suite : le tableau et la phrase disparaissent
	await page.keyboard.press('ControlOrMeta+Z');
	await expect.poll(() => shownIn(page, 'B2')).toBe('vide');
	await expect(cardLocator(page, 'f')).not.toContainText('colonnes A et B');

	// Retour sur Données par l'onglet : plus de zone sélectionnée
	await openView(page, 'Graphe');
	await openView(page, 'Données');
	await expect(page.locator('td[role="gridcell"][aria-selected="true"]')).toHaveCount(1);
});

/** Les cases montrées de `from` à `to` dans une colonne (`A1`, `A10`) */
async function columnShown(page: Page, from: string, to: string): Promise<string[]> {
	const [, letter, first] = /^([A-Z]+)(\d+)$/.exec(from) ?? [];
	const last = Number(/\d+$/.exec(to)?.[0]);
	const shown: string[] = [];
	for (let row = Number(first); row <= last; row++) {
		shown.push(await shownIn(page, `${letter}${row}`));
	}
	return shown;
}

/** Le texte montré par une case, espaces insécables ramenées à des espaces */
async function shownText(page: Page, address: string): Promise<string> {
	return (await shownIn(page, address)).replace(/\s/g, ' ');
}

/** Choisit un format de nombre (« Nombre », « Pourcentage », « Monnaie ») pour la sélection */
async function chooseFormat(page: Page, format: string): Promise<void> {
	await page.getByRole('button', { name: /^Format de nombre/ }).click();
	await page.getByRole('option', { name: new RegExp(`^${format}`) }).click();
}

/** Le lien de « Partager », lu dans sa fenêtre (une grille seule se partage) */
async function shareLink(page: Page): Promise<string> {
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.getByRole('button', { name: 'Partager', exact: true }).click();
	const field = page.getByLabel('Lien de partage');
	await expect(field).toHaveValue(/\?/);
	const link = await field.inputValue();
	await page.keyboard.press('Escape');
	return link;
}

test('#1469 — gras, formats Nombre / Pourcentage / Monnaie, copier-coller, rechargement, lien', async ({
	page
}) => {
	await typeCell(page, 'A1', '=1/3');
	await typeCell(page, 'A2', '0,125');
	await typeCell(page, 'A3', '12,5');
	// A1:A3 puis G : les 3 cases en gras, le bouton enfoncé ; Ctrl+Z défait
	await selectZone(page, 'A1', 'A3');
	const bold = page.getByRole('button', { name: 'Gras', exact: true });
	await bold.click();
	await expect(bold).toHaveAttribute('aria-pressed', 'true');
	for (const address of ['A1', 'A2', 'A3']) {
		await expect(cellLocator(page, address)).toHaveClass(/\bgras\b/);
	}
	await page.keyboard.press('ControlOrMeta+Z');
	await expect(cellLocator(page, 'A2')).not.toHaveClass(/\bgras\b/);

	// `=1/3` en « Nombre » → 0,33 et « Valeur exacte : 1/3 » sous la barre
	await selectCell(page, 'A1');
	await chooseFormat(page, 'Nombre');
	expect(await readCell(page, 'A1')).toMatchObject({ shown: '0,33', exact: '\\frac{1}{3}' });
	// « Pourcentage » sur 0,125 → 13 %, avec 1 décimale → 12,5 %
	await selectCell(page, 'A2');
	await chooseFormat(page, 'Pourcentage');
	// Le format pose une espace insécable fine avant % et € : comparée en espace simple
	await expect.poll(() => shownText(page, 'A2')).toBe('13 %');
	await page.getByRole('button', { name: /^Décimales/ }).click();
	await page.getByRole('option', { name: /^1\b/ }).click();
	await expect.poll(() => shownText(page, 'A2')).toBe('12,5 %');
	// « Monnaie » sur 12,5 → 12,50 €
	await selectCell(page, 'A3');
	await chooseFormat(page, 'Monnaie');
	await expect.poll(() => shownText(page, 'A3')).toBe('12,50 €');

	// Copier une case mise en forme, la coller ailleurs : la mise en forme suit
	await selectCell(page, 'A3');
	await page.keyboard.press('ControlOrMeta+C');
	await selectCell(page, 'C3');
	await page.keyboard.press('ControlOrMeta+V');
	await expect.poll(() => shownText(page, 'C3')).toBe('12,50 €');

	// Recharger : la mise en forme est gardée ; un lien de partage la transporte
	await page.reload();
	await openView(page, 'Données');
	await expect.poll(() => shownText(page, 'A2')).toBe('12,5 %');
	await expect.poll(() => shownText(page, 'A3')).toBe('12,50 €');
	const link = await shareLink(page);
	const other = await page.context().newPage();
	await other.goto(link);
	await openView(other, 'Données');
	await expect.poll(() => shownIn(other, 'A1')).toBe('0,33');
	await expect.poll(() => shownText(other, 'A3')).toBe('12,50 €');
	await other.close();
});

test('#1412 — Ctrl+Z / Ctrl+Maj+Z dans la grille, boutons grisés, carte rendue', async ({
	page
}) => {
	const undo = page.getByRole('button', { name: /^Annuler/ });
	const redo = page.getByRole('button', { name: /^Rétablir/ });
	await expect(undo).toHaveAttribute('aria-disabled', 'true');
	await expect(redo).toHaveAttribute('aria-disabled', 'true');

	// Taper, coller un tableau (titres compris), effacer une zone
	await typeCell(page, 'A1', '5');
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.evaluate(() => navigator.clipboard.writeText('taille\tmasse\n150\t40\n160\t52'));
	await selectCell(page, 'C1');
	await page.keyboard.press('ControlOrMeta+V');
	// Les titres vont en tête des colonnes : C1 = 150, D2 = 52
	await expect.poll(() => shownIn(page, 'D2')).toBe('52');
	await expect(page.getByLabel('Titre de la colonne C')).toHaveValue('taille');
	await selectZone(page, 'C1', 'C2');
	await page.keyboard.press('Delete');
	await expect.poll(() => columnShown(page, 'C1', 'C2')).toEqual(['vide', 'vide']);

	// Chaque geste se défait, le collage d'un coup — Ctrl+Z comme ⌘Z
	await page.keyboard.press('Control+Z');
	await expect.poll(() => columnShown(page, 'C1', 'C2')).toEqual(['150', '160']);
	await page.keyboard.press('Meta+Z');
	await expect.poll(() => shownIn(page, 'D2')).toBe('vide');
	await expect(page.getByLabel('Titre de la colonne C')).toHaveValue('');
	await expect.poll(() => shownIn(page, 'A1')).toBe('5');
	await page.keyboard.press('ControlOrMeta+Z');
	await expect.poll(() => shownIn(page, 'A1')).toBe('vide');
	await expect(undo).toHaveAttribute('aria-disabled', 'true');
	// Ctrl+Maj+Z refait
	await page.keyboard.press('ControlOrMeta+Shift+Z');
	await expect.poll(() => shownIn(page, 'A1')).toBe('5');
	await page.keyboard.press('ControlOrMeta+Shift+Z');
	await expect.poll(() => shownIn(page, 'D2')).toBe('52');
	await expect(page.getByLabel('Titre de la colonne C')).toHaveValue('taille');

	// Supprimer une carte, puis Ctrl+Z sur une case : la carte revient (pas la dernière saisie)
	await calc(page, 'f(x) = 2x');
	await cardLocator(page, 'f').getByRole('button', { name: 'Options de f', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Supprimer', exact: true }).click();
	await expect(cardLocator(page, 'f')).toHaveCount(0);
	await selectCell(page, 'B5');
	await page.keyboard.press('ControlOrMeta+Z');
	await expect(cardLocator(page, 'f')).toBeVisible();
	await expect.poll(() => shownIn(page, 'D2')).toBe('52');
});

test('#1439 — « Relancer », F9, Ctrl+Z / Ctrl+Y des tirages, annonce, lien gardé', async ({
	page
}) => {
	const relaunch = page.getByRole('button', { name: 'Relancer', exact: true });
	await typeCell(page, 'A1', '5');
	await expect(relaunch).toHaveCount(0);

	// A1:A10 `=ALEA.ENTRE.BORNES(1;6)`, C1 `=NB.SI(A1:A10;6)` : « Relancer » apparaît
	await typeCell(page, 'A1', '=ALEA.ENTRE.BORNES(1;6)');
	await selectZone(page, 'A1', 'A10');
	await page.keyboard.press('ControlOrMeta+D');
	await typeCell(page, 'C1', '=NB.SI(A1:A10;6)');
	await expect(relaunch).toBeVisible();
	const sixes = async () =>
		String((await columnShown(page, 'A1', 'A10')).filter((die) => die === '6').length);
	const first = await columnShown(page, 'A1', 'A10');
	expect(first.every((die) => /^[1-6]$/.test(die))).toBe(true);
	await expect.poll(() => shownIn(page, 'C1')).toBe(await sixes());

	// Un clic : nouveaux dés, C1 suit ; l'annonce dit combien de cases
	await relaunch.click();
	await expect.poll(() => columnShown(page, 'A1', 'A10')).not.toEqual(first);
	const second = await columnShown(page, 'A1', 'A10');
	await expect.poll(() => shownIn(page, 'C1')).toBe(await sixes());
	await expect(page.getByText('Nouveaux tirages : 10 cases.')).toBeAttached();
	// Ctrl+Z aussitôt (sans cliquer une case) → les dés d'avant ; Ctrl+Y → ceux d'après.
	// Ctrl, pas ⌘ : sur Mac ⌘Y ne rétablit pas (⌘⇧Z, oui) — écart signalé à David
	await page.keyboard.press('ControlOrMeta+Z');
	await expect.poll(() => columnShown(page, 'A1', 'A10')).toEqual(first);
	await page.keyboard.press('Control+Y');
	await expect.poll(() => columnShown(page, 'A1', 'A10')).toEqual(second);

	// F9 dans une case → nouveaux dés ; F9 maintenu → une seule relance
	await selectCell(page, 'E5');
	await page.keyboard.press('F9');
	await expect.poll(() => columnShown(page, 'A1', 'A10')).not.toEqual(second);
	const third = await columnShown(page, 'A1', 'A10');
	// Maintenu : les appuis suivants arrivent avec `repeat` (Playwright le pose tant que la
	// touche n'est pas relâchée)
	await page.keyboard.down('F9');
	await page.keyboard.down('F9');
	await page.keyboard.down('F9');
	await page.keyboard.up('F9');
	await expect.poll(() => columnShown(page, 'A1', 'A10')).not.toEqual(third);
	await page.keyboard.press('ControlOrMeta+Z');
	await expect.poll(() => columnShown(page, 'A1', 'A10')).toEqual(third);

	// Le lien d'un atelier à dés, puis « Garder dans mon atelier » : les tirages sont refaits
	const link = await shareLink(page);
	const other = await page.context().newPage();
	await other.goto(link);
	await other.getByRole('button', { name: 'Garder dans mon atelier' }).click();
	await expect(
		other.getByText(/les tirages au hasard sont refaits dans ton atelier/)
	).toBeVisible();
	await other.close();
});

/** Un fichier choisi par « Ouvrir un CSV… » */
async function openCsv(
	page: Page,
	file: string | { name: string; mimeType: string; buffer: Buffer }
): Promise<void> {
	const chooser = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Ouvrir un CSV…' }).click();
	await (await chooser).setFiles(file);
}

/** Le champ du titre d'une colonne */
function title(page: Page, letter: string) {
	return page.getByRole('textbox', { name: `Titre de la colonne ${letter}`, exact: true });
}

/** Le dernier message (toast) affiché */
function lastToast(page: Page) {
	return page
		.getByRole('region', { name: /^Notifications/ })
		.getByRole('listitem')
		.first();
}

test('#1473 — « Ouvrir un CSV… » : Excel, LibreOffice, Google Sheets, aller-retour, .xlsx refusé', async ({
	page
}, testInfo) => {
	// Excel sous Windows : point-virgule, Windows-1252 → accents justes, titres en tête
	await openCsv(page, {
		name: 'excel.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from('Prénom;Âge;Taille\r\nZoé;12;1,52\r\nGaël;13;1,60\r\n', 'latin1')
	});
	await expect(lastToast(page)).toContainText(
		'2 lignes et 3 colonnes, avec leurs titres, posées à partir de A1.'
	);
	await expect(title(page, 'A')).toHaveValue('Prénom');
	await expect(title(page, 'B')).toHaveValue('Âge');
	expect(await columnShown(page, 'A1', 'A2')).toEqual(['Zoé', 'Gaël']);
	await expect.poll(() => shownIn(page, 'C1')).toBe('1,52');
	// Ctrl+Z défait tout
	await page.keyboard.press('ControlOrMeta+Z');
	await expect.poll(() => shownIn(page, 'A1')).toBe('vide');
	await expect(title(page, 'A')).toHaveValue('');

	// LibreOffice : UTF-8 avec sa marque
	await openCsv(page, {
		name: 'libreoffice.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from('﻿Prénom;Âge\nZoé;12\nGaël;13\n', 'utf8')
	});
	await expect(title(page, 'A')).toHaveValue('Prénom');
	expect(await columnShown(page, 'A1', 'A2')).toEqual(['Zoé', 'Gaël']);
	await page.keyboard.press('ControlOrMeta+Z');
	await expect.poll(() => shownIn(page, 'A1')).toBe('vide');

	// Rouvrir ce que « Télécharger en CSV » a écrit (colonnes de nombres titrées) → identique
	await title(page, 'A').fill('x');
	await title(page, 'A').press('Enter');
	await title(page, 'B').fill('y');
	await title(page, 'B').press('Enter');
	await typeColumn(page, 'A1', ['1', '2,5', '0,75']);
	await typeColumn(page, 'B1', ['4', '5', '6']);
	const before = [
		...(await columnShown(page, 'A1', 'A3')),
		...(await columnShown(page, 'B1', 'B3'))
	];
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Télécharger en CSV' }).click();
	const saved = testInfo.outputPath('grille.csv');
	await (await download).saveAs(saved);
	// Grille vidée (Repartir de zéro), puis le fichier rouvert
	await page.getByRole('button', { name: 'Repartir de zéro', exact: true }).click();
	await page.getByRole('button', { name: 'Vider l’atelier', exact: true }).click();
	await expect.poll(() => shownIn(page, 'A1')).toBe('vide');
	// Le fichier se pose à partir de la case choisie (« posées à partir de A1 » si c'est A1)
	await selectCell(page, 'A1');
	await openCsv(page, saved);
	await expect(lastToast(page)).toContainText(
		'3 lignes et 2 colonnes, avec leurs titres, posées à partir de A1.'
	);
	await expect(title(page, 'A')).toHaveValue('x');
	await expect(title(page, 'B')).toHaveValue('y');
	expect([
		...(await columnShown(page, 'A1', 'A3')),
		...(await columnShown(page, 'B1', 'B3'))
	]).toEqual(before);

	// Google Sheets : virgules, décimaux à point → bien coupé
	await selectCell(page, 'A1');
	await openCsv(page, {
		name: 'google.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from('u,v\n1.5,2.25\n3,4.75\n', 'utf8')
	});
	await expect(title(page, 'A')).toHaveValue('u');
	await expect(title(page, 'B')).toHaveValue('v');
	expect(await columnShown(page, 'B1', 'B2')).toEqual(['2.25', '4.75']);

	// Un .xlsx (un classeur zippé, octets nuls) → refus clair, rien ne bouge
	await openCsv(page, {
		name: 'classeur.xlsx',
		mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00])
	});
	await expect(page.getByText('Ce fichier n’est pas un tableau CSV')).toBeVisible();
	await expect.poll(() => shownIn(page, 'B1')).toBe('2.25');
});
