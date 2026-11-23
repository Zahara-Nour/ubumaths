import { expect, test, type Locator, type Page } from '@playwright/test';

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

/** Le bouton « Signaler » du serveur de dev (jamais en prod) : au téléphone, il couvre des boutons */
const HIDE_REPORT_BUTTON = 'button[aria-controls="signaler-dev"] { display: none !important; }';

export async function openAtelier(page: Page): Promise<void> {
	// Posé à chaque chargement, sur toutes les pages du contexte (lien ouvert, fenêtre de Python)
	await page.context().addInitScript((css) => {
		addEventListener('DOMContentLoaded', () => {
			const style = document.createElement('style');
			style.textContent = css;
			document.head.append(style);
		});
	}, HIDE_REPORT_BUTTON);
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
	// Au téléphone, « Mes objets » se replie dès son premier objet : l'élève le déplie pour voir ses cartes
	await showCards(page);
	return { line, latex, text, refused };
}

/**
 * Ouvre une adresse retirée qui redirige vers une autre : WebKit interrompt le
 * chargement par la redirection, même en n'attendant que son début. Cette
 * interruption-là seulement est attendue ; l'arrivée se vérifie ensuite.
 */
export async function gotoRedirected(page: Page, address: string): Promise<void> {
	// L'arrivée : le `load` du document où mène la redirection, puis le réseau
	// calme (au démarrage, SvelteKit relit les données de la page :
	// `__data.json?…&x-sveltekit-invalidated=…`). Sans elle, la page suivante
	// partait pendant que la redirection était encore en vol (WebKit : «
	// interrupted by another navigation »), l'adresse d'avant (déjà `/atelier`)
	// passant pour l'arrivée
	const arrived = page.waitForEvent('load');
	await page.goto(address).catch((error: unknown) => {
		if (String(error).includes('is interrupted by another navigation')) return;
		arrived.catch(() => undefined);
		throw error;
	});
	await arrived;
	await page.waitForLoadState('networkidle');
}

/**
 * Le texte direct d'une formule (son LaTeX) : sous Chromium mobile, MathLive y
 * ajoute son rendu (shadow DOM), que `toHaveText` lirait en plus.
 */
export function ownTexts(formulas: Locator): Promise<string[]> {
	return formulas.evaluateAll((elements) =>
		elements.map((element) => element.textContent?.trim() ?? '')
	);
}

/** Téléphone : l'Atelier passe à une colonne à 720 px et moins (`ObjectPanel.svelte`) */
export function isNarrow(page: Page): boolean {
	return (page.viewportSize()?.width ?? Infinity) <= 720;
}

/** Les pages dont le test règle lui-même « Mes objets » (tests du repli au téléphone) */
const panelLeftAlone = new WeakSet<Page>();

/** `calc` et les cartes ne déplient plus « Mes objets » : le test le règle lui-même */
export function leavePanelAlone(page: Page): void {
	panelLeftAlone.add(page);
}

/**
 * Déplie « Mes objets » au téléphone, s'il est replié ; sur ordinateur il l'est
 * toujours. `afterLoad` : juste après un chargement (rechargement, lien), le
 * temps que les cartes reviennent et que la flèche paraisse.
 */
export async function showCards(page: Page, options: { afterLoad?: boolean } = {}): Promise<void> {
	if (!isNarrow(page) || panelLeftAlone.has(page)) return;
	const toggle = page.getByRole('button', { name: 'Mes objets', exact: true });
	if (options.afterLoad) {
		await toggle.waitFor({ state: 'attached', timeout: 5000 }).catch(() => undefined);
	}
	if ((await toggle.count()) === 0) return;
	if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
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
	// Les étapes se chargent au premier dépliage (`StepsOnDemand`) : attendre la fin
	await expect(box.locator('p.chargement')).toHaveCount(0, { timeout: 30 * 1000 });
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
	await showCards(page);
	await expect(cardLocator(page, name)).toBeVisible();
	const found = (await cards(page)).find((each) => each.name === name);
	if (found === undefined) throw new Error(`carte ${name} introuvable`);
	return found;
}

/** Choisit une action du menu « Options » d'une carte (« Dériver », « Réciproque »…) */
export async function cardAction(page: Page, name: string, action: string): Promise<void> {
	await showCards(page);
	await cardLocator(page, name)
		.getByRole('button', { name: `Options de ${name}` })
		.click();
	await page.getByRole('menuitem', { name: action, exact: true }).click();
}

/**
 * Écran tactile : MathLive ouvre son clavier au focus d'un champ, et le champ
 * perd puis reprend le focus à cet instant (mesuré sous WebKit iPhone). Une
 * frappe à ce moment-là se perd (« résoudre » devenait « dre »), et la sortie
 * du champ range une carte (lot 3 : un champ déjà vidé était rangé vide, la
 * courbe disparaissait). L'élève voit le clavier s'ouvrir avant de taper : on
 * l'attend aussi. Sans écran tactile, rien à attendre.
 */
export async function waitVirtualKeyboard(page: Page, field: Locator): Promise<void> {
	const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
	if (!touch) return;
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					(window as unknown as { mathVirtualKeyboard?: { visible: boolean } }).mathVirtualKeyboard
						?.visible === true
			)
		)
		.toBe(true);
	await expect(field).toBeFocused();
}

/** Met le focus dans le champ d'une carte (MathLive) */
export async function focusCardField(page: Page, name: string): Promise<void> {
	await showCards(page);
	const field = cardLocator(page, name).locator('math-field');
	// Juste après un calcul, la console reprend le focus au premier clic
	await expect(async () => {
		await field.click();
		expect(await field.evaluate((element) => element === document.activeElement)).toBe(true);
	}).toPass();
	await waitVirtualKeyboard(page, field);
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
	return normalizeLatex(await mathValue(cardLocator(page, name).locator('math-field')));
}

/**
 * Le presse-papiers lu et écrit par le test, selon le moteur : Chromium veut
 * les deux permissions ; WebKit et Firefox ne les connaissent pas
 * (`grantPermissions` refuse, « Unknown permission ») et laissent la page s'en
 * servir sans elles.
 */
export async function allowClipboard(page: Page): Promise<void> {
	if (test.info().project.use.defaultBrowserType === 'chromium') {
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
	}
}

/**
 * Le texte du presse-papiers. Chromium le rend à `readText()` ; WebKit refuse
 * `readText()` hors d'un geste de l'utilisateur : on colle (⌘/Ctrl+V) dans un
 * champ provisoire, comme un élève, puis on le retire et on rend le focus.
 */
export async function readClipboard(page: Page): Promise<string> {
	if (test.info().project.use.defaultBrowserType === 'chromium') {
		return page.evaluate(() => navigator.clipboard.readText());
	}
	const focused = await page.evaluateHandle(() => document.activeElement);
	const field = page.locator('#verifs-presse-papiers');
	try {
		await page.evaluate(() => {
			const relay = document.createElement('textarea');
			relay.id = 'verifs-presse-papiers';
			relay.style.position = 'fixed';
			relay.style.inset = '0 auto auto 0';
			document.body.append(relay);
		});
		// Le collage arrive après coup : coller dans un champ vide jusqu'à lire quelque chose
		let text = '';
		await expect(async () => {
			await field.fill('');
			await field.focus();
			await page.keyboard.press('ControlOrMeta+V');
			text = await field.inputValue();
			expect(text).not.toBe('');
		}).toPass({ timeout: 5000 });
		return text;
	} finally {
		// ⚠️ Le focus quitte la page un instant : une carte en cours de frappe serait rangée
		await page.evaluate((element) => {
			document.getElementById('verifs-presse-papiers')?.remove();
			if (element instanceof HTMLElement) element.focus();
		}, focused);
	}
}
