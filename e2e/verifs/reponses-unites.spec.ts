import { expect, test, type Page } from '@playwright/test';
import { assertLocalServerEnv } from './helpers/carnet';
import { buildSeriesLink } from '../../src/lib/validation/series';

/**
 * Cases à unité, couleurs de la FlashCard, saisie de nombres — base LOCALE
 * =========================================================================
 *
 * Reprend les lignes #1578 (FlashCard : couleur d'une case après « Valider ») et
 * #1573, #1574 (cases à unité et cases à arrondi : forme de la saisie) de
 * `docs/wip/verifications-manuelles.md`.
 *
 * Les modèles de la base locale sont ceux de la prod : on les joue par le lien de
 * série public `/automaths/test?modeles=…&mode=typing&graine=…`, qui montre la
 * FlashCard « Valider » et ses cases corrigées. La graine fixe les nombres : l'énoncé
 * est lu à l'écran pour en déduire les réponses. L'état de chaque case est lu dans le
 * libellé que MathLive lit aux lecteurs d'écran (« Case 1 : juste / fausse / forme à
 * améliorer »), qui suit exactement la couleur (vert / rouge / ambre).
 *
 * Rien n'est écrit en base : la série est jouée sans compte.
 */

// Base locale seulement : contre la prod (`VERIFS_URL`), les mêmes modèles n'ont pas les mêmes numéros
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

test.beforeAll(() => {
	assertLocalServerEnv();
});

// Constantes

/** « Calcul du périmètre d'un carré. » : case à unité (`unit.expected`), côté en mm */
const PERIMETRE_CARRE = '060086c8-2576-4b6f-a2c1-5994b83530db';
/** « Arrondir un nombre décimal », variation 1 : au dixième, case sans unité */
const ARRONDIR = 'e75cb1a3-56f6-4498-b6bf-06e852b3252d';
/** « Additionner des fractions » (5e) : case exacte, la fraction irréductible est attendue */
const ADDITIONNER_FRACTIONS = '71ee6212-6739-4b1c-adf9-358cfda13cea';
const SEED = 5;

interface Verdict {
	/** « Case 1 : juste », « Case 1 : fausse » ou « Case 1 : forme à améliorer » */
	state: string;
	/** Tout le texte de la carte après « Valider » (remarques comprises) */
	text: string;
	/** La saisie telle que MathLive l'a rangée (LaTeX) */
	typed: string;
	/** La case porte la couleur ambre (`math-prompt-unoptimal`) */
	amber: boolean;
}

// Functions

/** Joue la question d'un modèle (une variation, une graine) ; rend la carte devant la saisie. */
async function openQuestion(page: Page, templateId: string, variation: number): Promise<void> {
	const link = buildSeriesLink(
		'',
		[{ templateId, quantity: 1, delay: 0, variations: [variation] }],
		{ mode: 'typing', seed: SEED }
	);
	await page.goto(link);
	await page.waitForLoadState('networkidle');
	await page.getByTestId('typing-card').locator('math-field').first().waitFor();
}

/** Les formules de l'énoncé, en LaTeX (les `math-span` de la face avant). */
async function statementFormulas(page: Page): Promise<string[]> {
	return page
		.getByTestId('typing-card')
		.locator('.flip-card-front math-span, .flip-card-front .katex-mathml annotation')
		.allTextContents();
}

/**
 * Tape la réponse dans la case (au vrai clavier), puis « Valider ». MathLive perd la
 * première frappe si elle suit de trop près le clic : on attend, puis on vérifie ce
 * qui est rangé avant de valider.
 */
async function answer(page: Page, typed: string): Promise<Verdict> {
	const card = page.getByTestId('typing-card');
	const field = card.locator('math-field').first();
	const box = await field.boundingBox();
	if (!box) throw new Error('case de réponse introuvable');
	// Le clic va sur la droite du champ : là où se trouve la case à remplir
	await field.click({ position: { x: Math.max(5, box.width - 15), y: box.height / 2 } });
	await page.waitForTimeout(500);
	await page.keyboard.type(typed, { delay: 80 });
	const stored = await field.evaluate(
		(element) => (element as HTMLElement & { value: string }).value
	);
	await page.getByRole('button', { name: 'Valider' }).click();
	const states = page.locator('[id$="-etats"]');
	await expect(states).toHaveCount(1);
	return {
		state: (await states.innerText()).trim(),
		text: (await card.innerText()).replace(/\s+/g, ' '),
		typed: stored,
		amber: (await card.locator('math-field.math-prompt-unoptimal').count()) > 0
	};
}

/** Le côté du carré (en mm) lu dans la face avant : `9~\mathrm{mm}` */
async function sideInMm(page: Page): Promise<number> {
	const formulas = await statementFormulas(page);
	const side = formulas.map((tex) => /^(\d+)~\\mathrm\{mm\}$/.exec(tex)?.[1]).find(Boolean);
	if (!side) throw new Error(`côté du carré introuvable dans ${JSON.stringify(formulas)}`);
	return Number(side);
}

// ============================================================================
// #1578 — FlashCard : la couleur d'une case après « Valider »
// ============================================================================

test('#1578 — case à unité : une bonne réponse (36 mm, ou 3,6 cm pour 36 mm) est verte, une mauvaise valeur reste rouge', async ({
	page
}) => {
	test.setTimeout(120_000);
	await openQuestion(page, PERIMETRE_CARRE, 0);
	const perimeter = 4 * (await sideInMm(page));
	const right = await answer(page, `${perimeter} mm`);
	expect(right.typed).toContain(`${perimeter}\\,mm`);
	expect(right.state).toBe('Case 1 : juste');
	expect(right.text).toContain('Juste');
	await page.screenshot({ path: '.captures/verifs/programme/1578-case-verte.png' });

	// La même valeur dans une autre unité : aussi verte
	await openQuestion(page, PERIMETRE_CARRE, 0);
	const inCm = String(perimeter / 10).replace('.', ',');
	expect((await answer(page, `${inCm} cm`)).state).toBe('Case 1 : juste');

	// Une valeur fausse : rouge
	await openQuestion(page, PERIMETRE_CARRE, 0);
	const wrong = await answer(page, `${perimeter + 1} mm`);
	expect(wrong.state).toBe('Case 1 : fausse');
	expect(wrong.text).toContain('Faux');
	await page.screenshot({ path: '.captures/verifs/programme/1578-case-rouge.png' });
});

test('#1578 — case exacte : une fraction non simplifiée (juste en valeur) devient ambre, la forme irréductible est verte, une mauvaise fraction reste rouge', async ({
	page
}) => {
	test.setTimeout(120_000);
	await openQuestion(page, ADDITIONNER_FRACTIONS, 0);
	// L'énoncé est la somme suivie de la case : `\dfrac{8}{5}+\dfrac{2}{45}=\placeholder[0]{}`
	const shown = await page
		.getByTestId('typing-card')
		.locator('math-field')
		.first()
		.evaluate((element) => (element as HTMLElement & { value: string }).value);
	const sum = /^\\d?frac\{(\d+)\}\{(\d+)\}\+\\d?frac\{(\d+)\}\{(\d+)\}=/.exec(shown);
	if (!sum) throw new Error(`somme de fractions introuvable dans ${shown}`);
	const [a, b, c, d] = sum.slice(1).map(Number);
	const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
	const denominator = (b * d) / gcd(b, d);
	const numerator = a * (denominator / b) + c * (denominator / d);
	const divisor = gcd(numerator, denominator);
	const [n, m] = [numerator / divisor, denominator / divisor];
	expect(gcd(n, m), 'la fraction attendue est irréductible').toBe(1);

	// Non simplifiée (le double) : juste en valeur mais perfectible
	const notReduced = await answer(page, `${2 * n}/${2 * m}`);
	expect(notReduced.state, notReduced.text).toBe('Case 1 : forme à améliorer');
	expect(notReduced.text).toContain('La fraction peut être simplifiée.');
	expect(notReduced.amber).toBe(true);
	await page.screenshot({ path: '.captures/verifs/programme/1578-case-ambre.png' });

	// Simplifiée : verte
	await openQuestion(page, ADDITIONNER_FRACTIONS, 0);
	const green = await answer(page, `${n}/${m}`);
	expect(green.state).toBe('Case 1 : juste');
	expect(green.amber).toBe(false);

	// Mauvaise fraction : rouge
	await openQuestion(page, ADDITIONNER_FRACTIONS, 0);
	expect((await answer(page, `${n + 1}/${m}`)).state).toBe('Case 1 : fausse');
});

// ============================================================================
// #1573, #1574 — forme de la saisie d'une case à unité
// ============================================================================

test('#1573 — case à unité, au clavier MathLive : 2×18 mm pour 36 mm → « pas écrite sous la forme demandée » ; (36) mm → compté juste (ambre) avec « parenthèses inutiles »', async ({
	page
}) => {
	test.setTimeout(120_000);
	await openQuestion(page, PERIMETRE_CARRE, 0);
	const perimeter = 4 * (await sideInMm(page));
	const half = perimeter / 2;

	await openQuestion(page, PERIMETRE_CARRE, 0);
	const product = await answer(page, `2*${half} mm`);
	expect(product.typed).toContain(`2\\cdot${half}`);
	expect(product.state).toBe('Case 1 : fausse');
	expect(product.text).toContain("Ta réponse n'est pas écrite sous la forme demandée.");

	await openQuestion(page, PERIMETRE_CARRE, 0);
	const parentheses = await answer(page, `(${perimeter}) mm`);
	expect(parentheses.state).toBe('Case 1 : forme à améliorer');
	expect(parentheses.text).toContain('Il y a des parenthèses inutiles.');
	expect(parentheses.text).not.toContain('Faux');
	await page.screenshot({ path: '.captures/verifs/programme/1573-parentheses.png' });
});

test('#1574 — case à unité : 0,036 m (écrit 0,036) est juste pour 36 mm, mais « ,036 m » et « 36, mm » sont refusés', async ({
	page
}) => {
	test.setTimeout(120_000);
	await openQuestion(page, PERIMETRE_CARRE, 0);
	const perimeter = 4 * (await sideInMm(page));
	expect(perimeter, 'le test écrit 36 mm = 0,036 m').toBe(36);

	await openQuestion(page, PERIMETRE_CARRE, 0);
	expect((await answer(page, '0,036 m')).state).toBe('Case 1 : juste');

	await openQuestion(page, PERIMETRE_CARRE, 0);
	const noLeadingZero = await answer(page, ',036 m');
	expect(noLeadingZero.state).toBe('Case 1 : fausse');

	await openQuestion(page, PERIMETRE_CARRE, 0);
	const trailingComma = await answer(page, '36, mm');
	expect(trailingComma.state).toBe('Case 1 : fausse');
});

test('#1573 #1574 — même chose dans une case sans unité à arrondi : 58,5 juste, 2×29,25 « forme demandée », (58,5) parenthèses inutiles, « 58, » refusé', async ({
	page
}) => {
	test.setTimeout(180_000);
	await openQuestion(page, ARRONDIR, 1);
	const formulas = await statementFormulas(page);
	const x = formulas.map((tex) => /^(\d+)\{,\}(\d+)$/.exec(tex)).find((match) => match !== null);
	if (!x) throw new Error(`nombre à arrondir introuvable dans ${JSON.stringify(formulas)}`);
	// 58,488 → 58,5 (au dixième)
	const value = Number(`${x[1]}.${x[2]}`);
	const rounded = (Math.round(value * 10) / 10).toFixed(1).replace('.', ',');
	expect(rounded).toBe('58,5');

	await openQuestion(page, ARRONDIR, 1);
	expect((await answer(page, '58,5')).state).toBe('Case 1 : juste');

	await openQuestion(page, ARRONDIR, 1);
	const product = await answer(page, '2*29,25');
	expect(product.state).toBe('Case 1 : fausse');
	expect(product.text).toContain("Ta réponse n'est pas écrite sous la forme demandée.");

	await openQuestion(page, ARRONDIR, 1);
	const parentheses = await answer(page, '(58,5)');
	expect(parentheses.state).toBe('Case 1 : forme à améliorer');
	expect(parentheses.text).toContain('Il y a des parenthèses inutiles.');

	await openQuestion(page, ARRONDIR, 1);
	expect((await answer(page, '58,')).state).toBe('Case 1 : fausse');
});

test('#1574 (E53) — case sans unité, arrondi à l’unité : la bonne valeur suivie d’une virgule seule est refusée avec le message de forme ; une valeur fausse suivie d’une virgule, sans ce message', async ({
	page
}) => {
	test.setTimeout(120_000);
	const FORM = "Ta réponse n'est pas écrite sous la forme demandée.";
	await openQuestion(page, ARRONDIR, 0);
	const formulas = await statementFormulas(page);
	const x = formulas.map((tex) => /^(\d+)\{,\}(\d+)$/.exec(tex)).find((match) => match !== null);
	if (!x) throw new Error(`nombre à arrondir introuvable dans ${JSON.stringify(formulas)}`);
	const rounded = Math.round(Number(`${x[1]}.${x[2]}`));

	const trailingComma = await answer(page, `${rounded},`);
	expect(trailingComma.state).toBe('Case 1 : fausse');
	expect(trailingComma.text).toContain(FORM);

	await openQuestion(page, ARRONDIR, 0);
	const wrongValue = await answer(page, `${rounded + 1},`);
	expect(wrongValue.state).toBe('Case 1 : fausse');
	expect(wrongValue.text).not.toContain(FORM);

	await openQuestion(page, ARRONDIR, 0);
	expect((await answer(page, `${rounded}`)).state).toBe('Case 1 : juste');
});
