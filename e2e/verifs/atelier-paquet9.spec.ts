import { expect, test, type Locator, type Page } from '@playwright/test';
import { calc, openAtelier } from './helpers/atelier';
import { assertLocalServerEnv, sql } from './helpers/carnet';
import { buildSeriesLink } from '../../src/lib/validation/series';

/**
 * Ligne Atelier du paquet 9 du tri (19 – 22 novembre)
 * ====================================================
 *
 * #3007 de `docs/wip/verifications-manuelles.md` : un produit collé derrière une puissance
 * (`4^{n+1}(n+1)`) est-il lu par le juge ? Dans l'Atelier, puis sur le VRAI modèle publié
 * « Sens de variation par le quotient u(n+1)/u(n) » (cdb5a1cf), variation « u_n = (n+1)/k^n ».
 *
 * Ce que la ligne soupçonnait n'existe pas : `k^{n+1}(n+1)` est lu. Ce qui est refusé, c'est le
 * NOMBRE collé derrière une parenthèse, `(n+2)k^n` : règle écrite du 2026-10-08
 * (`src/lib/mathAST/parser/number-after-factor.ts`), « le refus dit quoi écrire » ; la carte
 * l'écrit sous la case depuis l'écart E76. Le quotient juste mais non simplifié vaut ½ point
 * depuis l'écart E77 (modèle : `scripts/questions/1spe-quotient-simplifie-existants/`).
 *
 * La réponse de l'élève est insérée en LaTeX dans la case MathLive (commande `insert`), pas tapée
 * touche à touche : c'est le juge qui est regardé, pas le clavier.
 */

// ============================================================================
// CONSTANTES
// ============================================================================

const QUOTIENT = 'cdb5a1cf-f8df-4ab1-9305-4d1b5b790711';
/** Énoncé de la variation jouée : u_n = (n+1)/k^n, réponse attendue (n+2)/(k(n+1)) */
const VARIATION_MARK = '\\dfrac{n+1}{ {{k}}^n}';
const REFUSAL = 'écrit après un facteur';
/** Message d'un quotient juste mais non simplifié (motif `acceptable` du modèle) */
const NOT_SIMPLIFIED = 'La réponse est juste, mais pas écrite sous la forme demandée.';

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Rang (à partir de 0) de la variation u_n = (n+1)/k^n du modèle publié */
async function variationIndex(): Promise<number> {
	const rows = await sql<{ statement: string | null; rank: number }>(
		`select v->>'statement' as statement, (o - 1)::int as rank
		   from question_templates, jsonb_array_elements(variations) with ordinality as t(v, o)
		  where id = $1 and status = 'published'`,
		[QUOTIENT]
	);
	const found = rows.find((row) => (row.statement ?? '').includes(VARIATION_MARK));
	expect(found, 'variation u_n = (n+1)/k^n du modèle publié cdb5a1cf').toBeDefined();
	return found?.rank ?? -1;
}

/** Ouvre la question par le lien de série public ; rend la carte et le k tiré, lu dans l'énoncé */
async function openQuestion(page: Page, variation: number): Promise<{ card: Locator; k: number }> {
	const link = buildSeriesLink(
		'',
		[{ templateId: QUOTIENT, quantity: 1, delay: 0, variations: [variation] }],
		{ mode: 'typing', seed: 1 }
	);
	await page.goto(link);
	await page.waitForLoadState('networkidle');
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor();
	await expect(card.getByRole('button', { name: 'Valider' })).toBeVisible();
	const front = (await card.locator('.flip-card-front').first().textContent()) ?? '';
	const k = Number(/(\d+)\^n/.exec(front)?.[1]);
	expect(Number.isInteger(k) && k >= 2, `k lu dans l'énoncé : ${front.slice(0, 120)}`).toBe(true);
	return { card, k };
}

/** Insère la réponse dans la case, valide, rend le verdict affiché et le texte de la carte */
async function answer(
	page: Page,
	card: Locator,
	latex: string
): Promise<{ verdict: string; text: string }> {
	const field = card.locator('math-field').first();
	await field.click();
	await field.evaluate((element, value) => {
		const mathField = element as HTMLElement & {
			executeCommand: (command: [string, string]) => boolean;
		};
		mathField.executeCommand(['insert', value]);
	}, latex);
	await page.getByRole('button', { name: 'Valider' }).click();
	const verdict = card.getByText(/^(Juste|Faux|½ point)$/).first();
	await expect(verdict).toBeVisible();
	return {
		verdict: (await verdict.innerText()).trim(),
		text: ((await card.innerText()) ?? '').replace(/\s+/g, ' ')
	};
}

// ============================================================================
// TESTS
// ============================================================================

test('#3007 — Atelier : un produit collé derrière une puissance est lu comme le même produit écrit avec ×', async ({
	page
}) => {
	await openAtelier(page);
	const glued = await calc(page, '4^(n+1)(n+1)');
	const explicit = await calc(page, '4^(n+1)*(n+1)');
	expect(glued.refused).toBe(false);
	expect(glued.latex).not.toBeNull();
	expect(glued.latex).toBe(explicit.latex);

	// Le quotient de la ligne, nombre écrit DEVANT la parenthèse : même réponse qu'avec ×
	const quotient = await calc(page, '4^n(n+2)/(4^(n+1)(n+1))');
	const withTimes = await calc(page, '(n+2)*4^n/(4^(n+1)*(n+1))');
	expect(quotient.latex).not.toBeNull();
	expect(quotient.latex).toBe(withTimes.latex);
});

test('#3007 — Atelier : `(n+2)4^n` (nombre collé derrière une parenthèse) est refusé, et le refus dit quoi écrire', async ({
	page
}) => {
	await openAtelier(page);
	const refused = await calc(page, '(n+2)4^n/(4^(n+1)(n+1))');
	expect(refused.latex).toBeNull();
	expect(refused.text).toContain(`Nombre « 4 » ${REFUSAL}`);
});

test.describe('#3007 — le vrai modèle publié cdb5a1cf', () => {
	test.skip(process.env.VERIFS_URL !== undefined, 'lecture de la base locale');

	test.beforeAll(() => {
		assertLocalServerEnv();
	});

	test('produit collé derrière la puissance, nombre devant : la réponse n’est pas refusée ; avec × : ½ point (symboles de multiplication) ; forme attendue : juste', async ({
		page
	}) => {
		const variation = await variationIndex();

		const glued = await openQuestion(page, variation);
		const gluedResult = await answer(
			page,
			glued.card,
			`\\frac{${glued.k}^n(n+2)}{${glued.k}^{n+1}(n+1)}`
		);
		expect(gluedResult.verdict).not.toBe('Faux');

		const times = await openQuestion(page, variation);
		const timesResult = await answer(
			page,
			times.card,
			`\\frac{(n+2)\\times${times.k}^n}{${times.k}^{n+1}\\times(n+1)}`
		);
		expect(timesResult.verdict).toBe('½ point');
		expect(timesResult.text).toContain('Tu peux simplifier certains symboles de multiplication.');

		const expected = await openQuestion(page, variation);
		const expectedResult = await answer(page, expected.card, `\\frac{n+2}{${expected.k}(n+1)}`);
		expect(expectedResult.verdict).toBe('Juste');
	});

	test('`(n+2)k^n` au numérateur : compté « Faux », et la carte dit quoi écrire (E76)', async ({
		page
	}) => {
		const variation = await variationIndex();
		const { card, k } = await openQuestion(page, variation);
		const result = await answer(page, card, `\\frac{(n+2)${k}^n}{${k}^{n+1}(n+1)}`);
		// L'écriture reste refusée (règle du 2026-10-08), mais plus sans un mot
		expect(result.verdict).toBe('Faux');
		expect(result.text).toContain(`Nombre « ${k} » ${REFUSAL}`);
	});

	test('quotient non simplifié `k^n(n+2) / (k^{n+1}(n+1))` : ½ point, l’énoncé demande « un seul quotient simplifié » (E77)', async ({
		page
	}) => {
		const variation = await variationIndex();
		const { card, k } = await openQuestion(page, variation);
		await expect(card.locator('.flip-card-front').first()).toContainText(
			'un seul quotient simplifié'
		);
		const result = await answer(page, card, `\\frac{${k}^n(n+2)}{${k}^{n+1}(n+1)}`);
		expect(result.verdict).toBe('½ point');
		expect(result.text).toContain(NOT_SIMPLIFIED);
	});
});
