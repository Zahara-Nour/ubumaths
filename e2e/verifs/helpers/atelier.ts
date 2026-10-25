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
	const lines = page.locator('ol.historique > li');
	const before = await lines.count();
	const field = consoleInput(page);
	await field.fill(input);
	await field.press('Enter');
	await expect(lines).toHaveCount(before + 1);
	const line = lines.nth(before);
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
