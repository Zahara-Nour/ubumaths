import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	calc,
	card,
	cardAction,
	cardLocator,
	normalizeLatex,
	openAtelier
} from './helpers/atelier';
import { openView } from './helpers/grille';

/**
 * Le panneau « Propriétés » d'une carte — lignes de `docs/wip/verifications-manuelles.md`
 * =========================================================================================
 *
 * Menu ⋮ d'une carte → « Propriétés » : le panneau se déplie sous la carte, une
 * ligne par propriété (son LaTeX affiché, sa valeur approchée). Un test par
 * ligne, son numéro de PR dans le titre. L'attendu est celui de la ligne : un
 * test rouge est un bug ou une ligne périmée, à signaler à David — jamais un
 * attendu à changer pour passer.
 */

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

function panel(page: Page): Locator {
	return page.locator('.proprietes');
}

/** Ouvre « Propriétés » d'une carte et rend ses lignes : libellé → LaTeX (et ≈ valeur) */
async function properties(page: Page, name: string): Promise<Record<string, string>> {
	await cardAction(page, name, 'Propriétés');
	await expect(panel(page).getByRole('heading', { name: `Propriétés de ${name}` })).toBeVisible();
	return shownProperties(page);
}

/** Les lignes du panneau ouvert ; une valeur approchée s'ajoute après « ≈ » */
async function shownProperties(page: Page): Promise<Record<string, string>> {
	const rows = await panel(page)
		.locator('dl .ligne')
		.evaluateAll((lines) =>
			lines.map((line) => [
				line.querySelector('dt')?.textContent?.trim() ?? '',
				line.querySelector('[data-latex]')?.getAttribute('data-latex') ?? '',
				line.querySelector('.approche')?.textContent?.trim() ?? ''
			])
		);
	return Object.fromEntries(
		rows.map(([label, latex, approximate]) => [
			label,
			normalizeLatex(latex) + (approximate === '' ? '' : ` ${approximate}`)
		])
	);
}

async function closeProperties(page: Page, name: string): Promise<void> {
	await panel(page)
		.getByRole('button', { name: `Fermer les propriétés de ${name}` })
		.click();
	await expect(panel(page)).toHaveCount(0);
}

test('#1634 — propriétés d’un cercle : fractions, π et racines bien écrits', async ({ page }) => {
	await calc(page, 'c : 3x^2+3y^2=1');
	const c = await properties(page, 'c');
	// Périmètre 2π√3/3 (et non (2/3)π√3), aire π/3
	expect(c['Périmètre']).toBe(`${normalizeLatex('\\frac{2\\pi\\sqrt{3}}{3}')} ≈ 3,6276`);
	expect(c['Aire']).toBe(`${normalizeLatex('\\frac{\\pi}{3}')} ≈ 1,0472`);
	await closeProperties(page, 'c');

	await calc(page, 'k : 4x^2+4y^2=1');
	expect((await properties(page, 'k'))['Aire']).toBe(
		`${normalizeLatex('\\frac{\\pi}{4}')} ≈ 0,7854`
	);
	await closeProperties(page, 'k');

	// Rayon 2√5/3, sans parenthèses
	await calc(page, 'w : 9x^2+9y^2=20');
	expect((await properties(page, 'w'))['Rayon']).toBe(
		`${normalizeLatex('\\frac{2\\sqrt{5}}{3}')} ≈ 1,4907`
	);
});

test('#1630 — « Propriétés » d’un segment, d’une droite, d’un cercle ; renommer', async ({
	page
}) => {
	await calc(page, 'A = (0;1)');
	await calc(page, 'B = (1;3)');
	await calc(page, 's = [AB]');
	const s = await properties(page, 's');
	expect(s['Longueur']).toBe('\\sqrt{5} ≈ 2,2361');
	expect(s['Milieu']).toBe(normalizeLatex('\\left(\\frac{1}{2};2\\right)'));
	expect(s['Dépend de']).toBe('\\text{A,B}');
	await closeProperties(page, 's');

	// Renommer A en E : s = [EB], le panneau reste ouvert ; un nom pris est refusé
	await properties(page, 'A');
	const nameField = panel(page).getByLabel('Nom');
	await nameField.fill('E');
	await panel(page).getByRole('button', { name: 'Renommer' }).click();
	await expect(panel(page).getByRole('heading', { name: 'Propriétés de E' })).toBeVisible();
	await expect.poll(async () => normalizeLatex((await card(page, 's')).latex ?? '')).toBe('[EB]');
	await nameField.fill('B');
	await panel(page).getByRole('button', { name: 'Renommer' }).click();
	await expect(panel(page).getByRole('alert')).not.toBeEmpty();
	// Échap referme
	await nameField.press('Escape');
	await expect(panel(page)).toHaveCount(0);

	await calc(page, 'd = (EB)');
	const d = await properties(page, 'd');
	expect(d['Équation cartésienne']).toBe('2x-y+1=0');
	expect(d['Vecteur directeur']).toBe('(1;2)');
	await closeProperties(page, 'd');

	await calc(page, 'c : 3x^2+3y^2=1');
	expect((await properties(page, 'c'))['Rayon']).toBe(
		`${normalizeLatex('\\frac{\\sqrt{3}}{3}')} ≈ 0,5774`
	);
	await closeProperties(page, 'c');

	// Étiquette d'un point décochée dans le panneau : son nom disparaît de Géométrie
	await openView(page, 'Géométrie');
	const label = page.locator('text.label', { hasText: /^E$/ });
	await expect(label).toHaveCount(1);
	await properties(page, 'E');
	await panel(page).getByRole('checkbox', { name: 'Afficher l’étiquette de E' }).click();
	await expect(label).toHaveCount(0);

	// « Convertir » d'une grandeur : grisé, avec sa raison
	await calc(page, 'v = 12[km]');
	await cardLocator(page, 'v').getByRole('button', { name: 'Options de v' }).click();
	const convert = page.getByRole('menuitem', { name: /Convertir/ });
	await expect(convert).toHaveAttribute('aria-disabled', 'true');
	await expect(convert).toContainText('Cette action arrive dans un prochain lot.');
});

test('cartes point et courbe (lot 4b) — nature, valeur, équation, étiquette : dans « Propriétés »', async ({
	page
}) => {
	// Ligne récrite (David, 2026-10-26) : la nature, la valeur d'une construction et
	// l'équation ont quitté la carte pour le panneau (5490181c2), l'étiquette aussi
	await calc(page, 'A = (1 ; 2)');
	await calc(page, 'B = (0 ; 2)');
	await calc(page, 'I = milieu(A, B)');
	const i = await properties(page, 'I');
	expect(i['Coordonnées']).toBe(normalizeLatex('\\left(\\frac{1}{2};2\\right)'));
	await expect(panel(page).locator('.ligne', { hasText: 'Nature' })).toContainText('milieu');
	await expect(
		panel(page).getByRole('checkbox', { name: 'Afficher l’étiquette de I' })
	).toBeChecked();
	await closeProperties(page, 'I');

	await calc(page, 'd = (AB)');
	const d = await properties(page, 'd');
	expect(d['Équation réduite']).toBe('y=2');
	await expect(panel(page).locator('.ligne', { hasText: 'Nature' })).toContainText('droite');
});
