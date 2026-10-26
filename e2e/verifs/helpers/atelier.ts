import { expect, type Locator, type Page } from '@playwright/test';

/**
 * La console de l'Atelier (`/atelier`), pilotée comme un élève : on tape une
 * ligne, Entrée, et on lit la réponse AFFICHÉE.
 */

export interface Answer {
	/** La ligne de l'historique (`li`), pour « Comment ? » et ses étapes */
	line: Locator;
	/** Le LaTeX de la réponse composée (`data-latex`), ou `null` si la réponse est du texte */
	latex: string | null;
	/** Le texte visible de la réponse */
	text: string;
	/** Ligne refusée (classe `refus`, couleur de refus) */
	refused: boolean;
}

export async function openAtelier(page: Page): Promise<void> {
	await page.goto('/atelier');
	await expect(consoleInput(page)).toBeVisible();
}

function consoleInput(page: Page): Locator {
	return page.getByLabel('Calcul, définition ou commande');
}

/** Tape une ligne dans la console et rend sa réponse */
export async function calc(page: Page, input: string): Promise<Answer> {
	const field = consoleInput(page);
	// Fermée (pour lire la grille, par exemple), la console se rouvre. Repliée, son
	// champ reste dans la page et passe pour visible : c'est le bouton qui le dit
	const button = page.getByRole('button', { name: 'Console', exact: true });
	if ((await button.getAttribute('aria-expanded')) === 'false') {
		await button.click();
		// Elle rend le focus à son champ après coup : attendre, sinon la frappe se perd
		await expect(field).toBeFocused();
	}
	const lines = page.locator('ol.historique > li');
	const before = await lines.count();
	await field.fill(input);
	await field.press('Enter');
	await expect(lines).toHaveCount(before + 1);
	const line = lines.nth(before);
	// La réponse affichée, formule ou texte, avant de la lire
	await expect(line.locator('.reponse .math, .reponse .texte').first()).toBeVisible();
	const math = line.locator('.reponse .math');
	const latex = (await math.count()) > 0 ? await math.getAttribute('data-latex') : null;
	const text = ((await line.locator('.reponse').innerText()) ?? '').replace(/\s+/g, ' ').trim();
	const refused = ((await line.getAttribute('class')) ?? '').includes('refus');
	return { line, latex, text, refused };
}

/**
 * Le LaTeX ramené à une forme comparable : sans espaces, `\dfrac` = `\frac`,
 * sans `\left` / `\right`, `\exponentialE` = `e`. Ces écarts ne se voient
 * pas à l'écran.
 */
export function normalizeLatex(latex: string): string {
	return latex
		.replace(/\\exponentialE(?![a-zA-Z])/g, 'e')
		.replace(/\\(left|right)(?![a-zA-Z])/g, '')
		.replace(/\\[dt]frac/g, '\\frac')
		.replace(/\\[,;:! ]/g, '')
		.replace(/\s+/g, '');
}

/** La réponse composée est ce LaTeX (aux écarts invisibles près) */
export function expectLatex(answer: Answer, expected: string): void {
	expect(answer.latex, `réponse en texte : « ${answer.text} »`).not.toBeNull();
	expect(normalizeLatex(answer.latex ?? '')).toBe(normalizeLatex(expected));
}

/**
 * Déplie « Comment ? » et rend le texte des étapes, chaque formule écrite
 * `$latex$` : `<math-span>` compose dans son ombre, son texte visible est vide.
 */
export async function steps(answer: Answer): Promise<string> {
	await answer.line.getByRole('button', { name: 'Comment ?' }).click();
	return shownSteps(answer);
}

/**
 * Choisit la rédaction des étapes dépliées (interrupteur « Résumé / Détaillé »)
 * et rend leur texte. Les étapes doivent être dépliées (`steps()` d'abord) ; le
 * choix est retenu pour les lignes dépliées ensuite.
 */
export async function stepsAs(answer: Answer, choice: 'Résumé' | 'Détaillé'): Promise<string> {
	const button = answer.line.getByRole('button', { name: choice });
	await button.click();
	await expect(button).toHaveAttribute('aria-pressed', 'true');
	return shownSteps(answer);
}

/** Le texte des étapes déjà dépliées */
async function shownSteps(answer: Answer): Promise<string> {
	const box = answer.line.locator('.etapes');
	await expect(box).toBeVisible();
	const text = await box.evaluate((element) => {
		const copy = element.cloneNode(true) as HTMLElement;
		for (const math of copy.querySelectorAll('math-span')) {
			math.replaceWith(`$${math.textContent ?? ''}$`);
		}
		return copy.textContent ?? '';
	});
	return text.replace(/\s+/g, ' ').trim();
}

/** La réponse composée contient ce LaTeX (aux écarts invisibles près) */
export function expectLatexContaining(answer: Answer, expected: string): void {
	expect(answer.latex, `réponse en texte : « ${answer.text} »`).not.toBeNull();
	expect(normalizeLatex(answer.latex ?? '')).toContain(normalizeLatex(expected));
}

/** La ligne a un bouton « Comment ? » */
export async function hasSteps(answer: Answer): Promise<boolean> {
	return (await answer.line.getByRole('button', { name: 'Comment ?' }).count()) > 0;
}

/** Une carte de l'Atelier, telle qu'affichée */
export interface Card {
	/** Le nom affiché (`f`, `f′`, `f⁻¹`) */
	name: string;
	/** Le LaTeX : celui du champ d'une carte qu'on écrit, ou `data-latex` d'une carte calculée */
	latex: string | null;
	/** L'intervalle affiché après « sur », sans le « sur » */
	interval: string | null;
	/** Le message de la carte, ou le refus de son champ */
	message: string | null;
}

/** La carte de ce nom affiché */
export function cardLocator(page: Page, name: string): Locator {
	return page
		.locator('article.objet')
		.filter({ has: page.locator('.nom', { hasText: new RegExp(`^${escapeRegExp(name)}$`) }) });
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Toutes les cartes affichées, dans l'ordre */
export async function cards(page: Page): Promise<Card[]> {
	return page.locator('article.objet').evaluateAll((articles) =>
		articles.map((article) => {
			const read = (selector: string) =>
				article.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || null;
			const field = article.querySelector('math-field') as
				(HTMLElement & { value?: string }) | null;
			const shown = article.querySelector('[data-latex]');
			return {
				name: read('.nom') ?? '',
				latex: field ? (field.value ?? null) : (shown?.getAttribute('data-latex') ?? null),
				interval: read('.intervalle')?.replace(/^sur /, '') ?? null,
				message: read('.message') ?? read('.refus')
			};
		})
	);
}

/** La carte de ce nom, lue ; échoue si elle n'est pas affichée */
export async function card(page: Page, name: string): Promise<Card> {
	await expect(cardLocator(page, name)).toBeVisible();
	const found = (await cards(page)).find((each) => each.name === name);
	if (found === undefined) throw new Error(`carte ${name} introuvable`);
	return found;
}

/** Choisit une action du menu « Options » d'une carte (« Dériver », « Réciproque »…) */
export async function cardAction(page: Page, name: string, action: string): Promise<void> {
	await cardLocator(page, name)
		.getByRole('button', { name: `Options de ${name}` })
		.click();
	await page.getByRole('menuitem', { name: action, exact: true }).click();
}

/** Met le focus dans le champ d'une carte (MathLive) */
export async function focusCardField(page: Page, name: string): Promise<void> {
	const field = cardLocator(page, name).locator('math-field');
	// Juste après un calcul, la console reprend le focus au premier clic
	await expect(async () => {
		await field.click();
		expect(await field.evaluate((element) => element === document.activeElement)).toBe(true);
	}).toPass();
}

/**
 * Tape au vrai clavier dans le champ d'une carte (MathLive), à la place de ce
 * qu'il contient, puis Entrée range la carte. Chaque morceau de `keys` est
 * tapé, puis → (sortir d'un exposant) ; `infty` est le raccourci de ∞.
 */
export async function typeInCard(page: Page, name: string, ...keys: string[]): Promise<void> {
	await focusCardField(page, name);
	await page.keyboard.press('ControlOrMeta+A');
	await page.keyboard.press('Backspace');
	for (const [index, part] of keys.entries()) {
		if (index > 0) await page.keyboard.press('ArrowRight');
		await page.keyboard.type(part);
	}
	await page.keyboard.press('Enter');
}

/** Le champ de la console en « Écriture mathématique » (MathLive) */
export function mathConsole(page: Page): Locator {
	return page.locator('math-field[aria-label="Calcul, définition ou commande"]');
}

/** Ouvre la fenêtre « Réglages » de la barre du haut */
export async function openSettings(page: Page): Promise<Locator> {
	await page.getByRole('button', { name: 'Réglages', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Réglages de l’atelier' });
	await expect(dialog).toBeVisible();
	return dialog;
}

/** Choisit un réglage (bouton radio) puis ferme la fenêtre */
export async function chooseSetting(page: Page, label: string): Promise<void> {
	const dialog = await openSettings(page);
	await dialog.getByRole('radio', { name: label }).click();
	await expect(dialog.getByRole('radio', { name: label })).toBeChecked();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
}

/** Le LaTeX du champ mathématique */
export async function mathValue(field: Locator): Promise<string> {
	return field.evaluate((element) => (element as HTMLElement & { value: string }).value);
}

/** Met le focus dans le champ d'une carte et le remplace par `keys`, SANS Entrée */
export async function retypeCard(page: Page, name: string, keys: string): Promise<void> {
	await focusCardField(page, name);
	// MathLive peut perdre le premier geste : on vide jusqu'à ce que le champ le soit
	await expect(async () => {
		await page.keyboard.press('ControlOrMeta+A');
		await page.keyboard.press('Backspace');
		expect(await fieldValue(page, name)).toBe('');
	}).toPass();
	await page.keyboard.type(keys);
}

/** Le LaTeX que montre le champ d'une carte */
export async function fieldValue(page: Page, name: string): Promise<string> {
	return normalizeLatex(
		await cardLocator(page, name)
			.locator('math-field')
			.evaluate((element) => (element as HTMLElement & { value: string }).value)
	);
}
