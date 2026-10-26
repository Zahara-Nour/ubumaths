import { expect, type Locator, type Page } from '@playwright/test';
import { normalizeLatex } from './atelier';

/**
 * La grille de la vue Données de l'Atelier, pilotée comme un élève : on clique
 * une case, on tape dans la barre du haut, Entrée ; on lit ce que la case
 * MONTRE (son nom accessible, « A1 : 2/3 ») et ce qu'il y a sous la barre.
 */

/** Une case, telle qu'affichée une fois sélectionnée */
export interface Cell {
	/** Le texte de la case, celui que lit un lecteur d'écran (`vide` pour une case vide) */
	shown: string;
	/** Le LaTeX (`normalizeLatex`) d'une case écrite en maths (`\\frac{2}{3}`, `\\pi`), sinon `null` */
	latex: string | null;
	/** Ce que la barre montre de la case sélectionnée (la formule, `=A1*2`) */
	bar: string;
	/** Le LaTeX (`normalizeLatex`) de « Valeur exacte : … » sous la barre, sinon `null` */
	exact: string | null;
	/** La note sous la barre (message d'erreur d'une case), sinon `null` */
	note: string | null;
	/** Case en erreur (rouge) */
	error: boolean;
}

/** Ouvre une vue de l'Atelier (« Graphe », « Géométrie », « Données ») */
export async function openView(page: Page, view: 'Graphe' | 'Géométrie' | 'Données') {
	const tab = page.getByRole('navigation', { name: "Vues de l'atelier" }).getByRole('button', {
		name: view,
		exact: true
	});
	await tab.click();
	await expect(tab).toHaveAttribute('aria-current', 'page');
}

/** Le bouton « Console » de la barre du haut */
function consoleButton(page: Page): Locator {
	return page.getByRole('button', { name: 'Console', exact: true });
}

/** Ouvre ou ferme la console (elle descend par-dessus la vue) */
export async function setConsole(page: Page, open: boolean): Promise<void> {
	const button = consoleButton(page);
	if ((await button.getAttribute('aria-expanded')) !== String(open)) await button.click();
	await expect(button).toHaveAttribute('aria-expanded', String(open));
}

export function cellLocator(page: Page, address: string): Locator {
	return page.locator(`td[role="gridcell"][data-cell="${address}"]`);
}

function bar(page: Page): Locator {
	return page.locator('#atelier-barre-cellule');
}

/** Sélectionne une case (console fermée : elle cacherait la grille) */
export async function selectCell(page: Page, address: string): Promise<void> {
	await setConsole(page, false);
	const cell = cellLocator(page, address);
	await cell.click();
	await expect(cell).toHaveClass(/\bactive\b/);
}

/**
 * Tape `text` dans une case par la barre, puis Entrée. Rend le refus affiché
 * sous la barre (`''` si la case est rangée).
 */
export async function typeCell(page: Page, address: string, text: string): Promise<string> {
	await selectCell(page, address);
	await bar(page).fill(text);
	await bar(page).press('Enter');
	return refusal(page);
}

/** Le refus affiché sous la barre (`''` s'il n'y en a pas) */
export async function refusal(page: Page): Promise<string> {
	await rendered(page);
	return ((await page.locator('.donnees p.refus').textContent()) ?? '').replace(/\s+/g, ' ').trim();
}

/** Remplit une colonne vers le bas, une valeur par case, à partir de `address` */
export async function typeColumn(page: Page, address: string, values: string[]): Promise<void> {
	const [, letter, row] = /^([A-Z]+)(\d+)$/.exec(address) ?? [];
	for (const [index, value] of values.entries()) {
		expect(await typeCell(page, `${letter}${Number(row) + index}`, value)).toBe('');
	}
}

/**
 * Laisse passer une image : Svelte a rendu le dernier geste. Sans elle, un
 * attendu `null` (pas de « Valeur exacte », pas d'aide) passerait aussi sur un
 * bloc pas encore affiché.
 */
async function rendered(page: Page): Promise<void> {
	await page.evaluate(() => new Promise((done) => requestAnimationFrame(done)));
}

/** Le texte montré par une case, sans la sélectionner */
export async function shownIn(page: Page, address: string): Promise<string> {
	const label = (await cellLocator(page, address).getAttribute('aria-label')) ?? '';
	return label.replace(/^[A-Z]+\d+ : /, '');
}

/** Sélectionne une case et la lit, avec ce qu'en disent la barre et la note */
export async function readCell(page: Page, address: string): Promise<Cell> {
	await selectCell(page, address);
	await rendered(page);
	const read = async (selector: string) => {
		const found = page.locator(selector);
		return (await found.count()) === 0
			? null
			: ((await found.first().textContent()) ?? '').replace(/\s+/g, ' ').trim();
	};
	const latexOf = async (found: Locator) =>
		(await found.count()) === 0
			? null
			: normalizeLatex((await found.first().getAttribute('data-latex')) ?? '') || null;
	return {
		shown: await shownIn(page, address),
		latex: await latexOf(cellLocator(page, address).and(page.locator('[data-latex]'))),
		bar: await bar(page).inputValue(),
		exact: await latexOf(page.locator('.donnees .valeur-exacte [data-latex]')),
		note: await read('.donnees p.note:not(.valeur-exacte):not(.aide-formule)'),
		error: ((await cellLocator(page, address).getAttribute('class')) ?? '').includes('en-erreur')
	};
}

/** Tape `text` dans la barre SANS Entrée et rend l'aide affichée dessous (`null` sans aide) */
export async function hintWhileTyping(page: Page, address: string, text: string) {
	await selectCell(page, address);
	await bar(page).fill(text);
	await rendered(page);
	const hint = page.locator('.donnees .aide-formule');
	const shown = (await hint.count()) === 0 ? null : ((await hint.textContent()) ?? '').trim();
	await bar(page).press('Escape');
	return shown;
}
