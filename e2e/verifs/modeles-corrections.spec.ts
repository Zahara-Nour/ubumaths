import { expect, test, type Locator, type Page } from '@playwright/test';
import { ADMIN, assertLocalServerEnv, login, sql } from './helpers/carnet';
import { acquireLock, LOCK_WAIT_MAX_MS, releaseLock } from './helpers/verrou';
import { buildSeriesLink } from '../../src/lib/validation/series';

/**
 * Modèles de questions et corrections générées — base LOCALE
 * ============================================================
 *
 * Reprend les lignes #1702, #1670, #1664, #1646, #1640, #1642, #1635, #1650, #1628, #1636,
 * #1691, #1696 et #1708 de `docs/wip/verifications-manuelles.md`. Les modèles de la base locale
 * portent les identifiants de la prod : on les joue par le lien de série public
 * (`/automaths/test?…&mode=typing&graine=…`, la FlashCard « Valider » des élèves) et, pour la
 * logique de tirage sur beaucoup de graines, par l'API de génération que l'aperçu admin appelle
 * (`POST /api/questions/generate/<id>`).
 *
 * Écrit en base : seuls les brouillons « Verifs3 … » des tests #1691, #1696 et #1708, supprimés en
 * `afterAll`. Rien d'autre n'est modifié.
 */

// Base locale seulement : contre la prod, les données (statuts, brouillons) ne sont pas les mêmes
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

// La config est `fullyParallel` et chaque `afterAll` efface tout le décor « Verifs3 % » : en série,
// sinon un worker effacerait le décor d'un autre en plein test.
test.describe.configure({ mode: 'serial' });

// Élèves 16 à 20 partagés avec `questions-paquet4.spec.ts` : un seul fichier à la fois
let lockHeld = false;

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
	assertLocalServerEnv();
	await acquireLock('eleves-16-20');
	lockHeld = true;
});

test.afterAll(() => {
	if (lockHeld) releaseLock('eleves-16-20');
});

// Constantes

const DECOMPOSER_CP = '52c4d773-d86c-45a3-88e4-ddc99cc4beab';
const COMPLEMENT_CP = '0e5372a4-17af-4e8e-8eac-e7b3ed966f2f';
const DOUBLES_MOITIES_CE1 = [
	'25285413-ba15-401d-a0e8-fd0a84770f3a', // Trouver le double, nombre inférieur à 10
	'a3ef26ab-2334-4061-86f4-295f5e4e0bc4', // Trouver le double, dizaines entières
	'89bef942-2e3f-4f76-8712-4bf7e6f226cf' // Trouver la moitié, nombre pair inférieur à 20
];
const PERPENDICULAIRE_A03 = '518f7f0b-389b-4cf2-b67c-5591ca00afb9';
const RACINES_ET_OPERATIONS = '0d2edda7-1d90-46ee-b07d-792ebbd43849';
const CALCULER_UNE_DERIVEE = 'a86442c1-78a0-42d1-af23-7f43d217bfa3';
const DERIVEE_RACINE = 'ff36ebdf-b40d-4a1a-9eae-abe61c05cc80';
const LIMITE_SUITE = '849aabbc-4576-4644-a5c6-5b840b4dbbb9';
const CARTE_ETUDE_FONCTION = 'bb554c62-ed89-4c2f-817b-c5aed549a469';
const DERIVEE_EXP_AFFINE = '227f2c9c-3494-412d-bf88-e9b2c48c01a6';
const COMPLEMENT_10000_ECOLE = '17a3c039-744d-4108-9b47-49f0183990b7';
const COMPLEMENT_10000_A_TROU = '45e9fa53-1c61-40e8-88a4-183fcb162ce5';
const MULTIPLIER_PAR_1000 = '19323604-1e27-4b0f-8a24-1eef76ab6e59';
const RATIONALISER = '96ede34c-259b-43f0-b920-d9e90003576e';
const FACTORISER_TRINOME = '604f83b7-4ed3-4b0f-b393-85e60ac353b4';
const SUITE_ARITHMETIQUE_PRECEDENT = '337d31c3-5d6b-4bd0-b9da-f025ddb26145';
// Préfixe propre à ce fichier : d'autres vérifications posent des modèles « Verifs3 … » qu'on ne supprime pas
const PREFIXE = 'Verifs3 modc';

interface GeneratedInstance {
	statement: string;
	correction?: { steps?: string[] };
	blanks?: { expectedAnswer: string }[];
	resolvedVariables?: { name: string; value: string }[];
	selectedVariationIndex?: number;
}

// Functions

/** Une instance du modèle, par l'API d'aperçu (connexion admin faite). */
async function generate(page: Page, templateId: string, seed: number): Promise<GeneratedInstance> {
	const response = await page.request.post(`/api/questions/generate/${templateId}`, {
		data: { seed }
	});
	expect(response.status(), `génération ${templateId} graine ${seed}`).toBe(200);
	const body = (await response.json()) as { instance: GeneratedInstance };
	return body.instance;
}

/** Joue une question par le lien de série public ; rend la carte une fois la face avant prête. */
async function openQuestion(
	page: Page,
	templateId: string,
	seed: number,
	variation?: number
): Promise<Locator> {
	const link = buildSeriesLink(
		'',
		[
			{
				templateId,
				quantity: 1,
				delay: 0,
				...(variation === undefined ? {} : { variations: [variation] })
			}
		],
		{ mode: 'typing', seed }
	);
	await page.goto(link);
	await page.waitForLoadState('networkidle');
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor();
	await expect(card.getByRole('button', { name: 'Valider' })).toBeVisible();
	return card;
}

/** Les formules (LaTeX) de la carte entière : énoncé, remarques, correction. */
function formulas(card: Locator): Promise<string[]> {
	return card.locator('math-span, math-div').allTextContents();
}

async function fieldValue(card: Locator): Promise<string> {
	return card
		.locator('math-field')
		.first()
		.evaluate((element) => (element as HTMLElement & { value: string }).value);
}

/** Texte lu de la face avant (formules KaTeX comprises) sur une ligne. */
async function frontText(card: Locator): Promise<string> {
	return ((await card.locator('.flip-card-front').first().textContent()) ?? '').replace(
		/\s+/g,
		' '
	);
}

/**
 * Tape la réponse dans la case (au vrai clavier), puis « Valider ». MathLive perd la
 * première frappe si elle suit de trop près le clic : on vérifie ce qui est rangé.
 */
async function typeAndValidate(page: Page, card: Locator, typed: string): Promise<string> {
	const field = card.locator('math-field').first();
	const box = await field.boundingBox();
	if (!box) throw new Error('case de réponse introuvable');
	await field.click({ position: { x: Math.max(5, box.width - 15), y: box.height / 2 } });
	await expect
		.poll(async () => page.evaluate(() => document.activeElement?.tagName))
		.toBe('MATH-FIELD');
	// « > » = flèche droite (sortir d'une racine ou d'un exposant avant de taper « / »)
	for (const key of typed) {
		if (key === '>') await page.keyboard.press('ArrowRight');
		else await page.keyboard.type(key, { delay: 80 });
	}
	await page.getByRole('button', { name: 'Valider' }).click();
	await expect(page.locator('[id$="-etats"]')).toHaveCount(1);
	return ((await card.innerText()) ?? '').replace(/\s+/g, ' ');
}

async function caseState(page: Page): Promise<string> {
	return (await page.locator('[id$="-etats"]').innerText()).trim();
}

/** Valide sans répondre : la correction s'affiche, c'est ce qu'on lit. */
async function validateEmpty(card: Locator): Promise<void> {
	await card.getByRole('button', { name: 'Valider' }).click();
	await expect(card.getByText('Correction', { exact: true }).first()).toBeVisible();
}

/** Choisit la réponse `index` (0 = A) puis « Valider » ; rend le texte de la carte. */
async function chooseAndValidate(page: Page, card: Locator, index: number): Promise<string> {
	await card.locator('.flip-card-front').getByRole('radio').nth(index).click();
	await page.getByRole('button', { name: 'Valider' }).click();
	await expect(card.getByText(/^(Juste|Faux|½ point)$/).first()).toBeVisible();
	return ((await card.innerText()) ?? '').replace(/\s+/g, ' ');
}

async function shoot(page: Page, name: string): Promise<void> {
	await page.screenshot({ path: `.captures/verifs/modeles/${name}.png` });
}

// ============================================================================
// #1702 — Modèles CP corrigés
// ============================================================================

test('#1702 — « Décomposer l’écriture décimale » (CP) : corrigé sans × ni centaines, « n dizaines, c’est … ; p unités, c’est … » puis « n = … + … », rangé sous « Entiers : numération › écritures » (point CP-004)', async ({
	page
}) => {
	test.setTimeout(240_000);
	await login(page, ADMIN.email, ADMIN.password);
	// Logique de tirage : 40 graines par l'API
	for (let seed = 1; seed <= 40; seed++) {
		const instance = await generate(page, DECOMPOSER_CP, seed);
		const steps = (instance.correction?.steps ?? []).join('\n');
		const number = /\$\$<<expr:expression>>(\d+)\$\$/.exec(instance.statement)?.[1];
		expect(number, `graine ${seed} : le nombre à décomposer`).toBeDefined();
		const [tens, units] = [Math.floor(Number(number) / 10), Number(number) % 10];
		expect(steps, `graine ${seed} : pas de ×`).not.toMatch(/\\times|×/);
		expect(steps, `graine ${seed} : pas de centaines`).not.toMatch(/centaine/i);
		expect(steps, `graine ${seed} : la ligne finale`).toContain(
			`$$${number} = ${tens * 10} + ${units}$$`
		);
		expect(steps, `graine ${seed} : « ${tens} dizaine(s), c'est ${tens * 10} »`).toMatch(
			new RegExp(`\\{${tens}\\}\\$ dizaines?, c'est \\$${tens * 10}\\$`)
		);
	}

	// Le rendu : la correction affichée à l'élève
	for (const seed of [1, 2, 3, 4]) {
		const card = await openQuestion(page, DECOMPOSER_CP, seed);
		const number = (await fieldValue(card)).match(/^(\d+)=/)?.[1] ?? '';
		await validateEmpty(card);
		const [tens, units] = [Math.floor(Number(number) / 10), Number(number) % 10];
		const text = formulasAndText(await formulas(card));
		expect(text, `graine ${seed} : rendu sans ×`).not.toMatch(/\\times/);
		const rendered = (await card.innerText()).replace(/\s+/g, ' ');
		expect(rendered, `graine ${seed} : rendu sans centaines`).not.toMatch(/centaine/i);
		expect(rendered).toMatch(/dizaines?, c'est/);
		expect(await formulas(card), `graine ${seed} : « ${number} = … »`).toContain(`${tens * 10}`);
		expect(await formulas(card)).toContain(`${units}`);
		if (seed === 1) await shoot(page, '1702-decomposer-cp');
	}

	// Le rangement
	const rows = await sql<{ notion: string; sous_notion: string; code: string }>(
		`select p.name as notion, n.name as sous_notion, cp.code
		   from question_templates t
		   join classification_nodes n on n.id = t.classification_node_id
		   join classification_nodes p on p.id = n.parent_id
		   join question_template_points tp on tp.template_id = t.id
		   join curriculum_points cp on cp.id = tp.point_id
		  where t.id = $1`,
		[DECOMPOSER_CP]
	);
	expect(rows).toEqual([
		{ notion: 'Entiers : numération', sous_notion: 'écritures', code: 'CP-004' }
	]);
});

/** Concatène les formules en un texte pour y chercher une commande LaTeX. */
function formulasAndText(parts: string[]): string {
	return parts.join(' ');
}

test('#1702 — « Trouver le complément » (CP, « À 10 ou à la dizaine supérieure ») : « 74 + ? = 80 » et « ? + 38 = 40 » se tirent, la réponse est le complément à la dizaine supérieure', async ({
	page
}) => {
	test.setTimeout(240_000);
	await login(page, ADMIN.email, ADMIN.password);
	const forms = new Set<string>();
	for (let seed = 1; seed <= 60; seed++) {
		const instance = await generate(page, COMPLEMENT_CP, seed);
		const statement = instance.statement;
		const answer = Number(instance.blanks?.[0]?.expectedAnswer);
		const after = /(\d{2}) \+ \\placeholder\[0\]\{\} = (\d{2,3})/.exec(statement);
		const before = /\\placeholder\[0\]\{\} \+ (\d{2}) = (\d{2,3})/.exec(statement);
		const ten = /(?:(\d) \+ \\placeholder\[0\]\{\}|\\placeholder\[0\]\{\} \+ (\d)) = 10\b/.exec(
			statement
		);
		const hit = after ?? before;
		if (hit) {
			const n = Number(hit[1]);
			forms.add(after ? 'n + ? = m' : '? + n = m');
			expect(Number(hit[2]), `graine ${seed} : ${statement}`).toBe(Math.floor(n / 10) * 10 + 10);
			expect(answer, `graine ${seed} : réponse attendue`).toBe(Number(hit[2]) - n);
			expect(answer).toBeGreaterThan(0);
			expect(answer).toBeLessThan(10);
		} else {
			expect(ten, `graine ${seed} : complément à 10 attendu : ${statement}`).not.toBeNull();
			forms.add('complément à 10');
		}
	}
	expect([...forms].sort(), 'les trois formes se tirent').toEqual([
		'? + n = m',
		'complément à 10',
		'n + ? = m'
	]);

	// Rendu et réponse au clavier : « 74 + ? = 80 » compté juste avec le complément (variation 3)
	const card = await openQuestion(page, COMPLEMENT_CP, 2, 2);
	const shown = await fieldValue(card);
	const sum = /^(\d{2})\+\\placeholder\[0\]\{\}=(\d{2,3})$/.exec(shown);
	expect(sum, `« n + ? = m » dans la case : ${shown}`).not.toBeNull();
	const expected = Number(sum?.[2]) - Number(sum?.[1]);
	await typeAndValidate(page, card, String(expected));
	expect(await caseState(page)).toBe('Case 1 : juste');
	await shoot(page, '1702-complement-cp');
	const wrong = await openQuestion(page, COMPLEMENT_CP, 2, 2);
	await typeAndValidate(page, wrong, String(expected + 1));
	expect(await caseState(page)).toBe('Case 1 : fausse');
});

test('#1702 — « Trouver le double » / « Trouver la moitié » : plus de 0 tiré ; les trois modèles sont au catalogue CE1, plus au CP', async ({
	page
}) => {
	test.setTimeout(240_000);
	await login(page, ADMIN.email, ADMIN.password);
	for (const templateId of DOUBLES_MOITIES_CE1) {
		for (let seed = 1; seed <= 40; seed++) {
			const instance = await generate(page, templateId, seed);
			const number = /de \$(\d+)\$/.exec(instance.statement)?.[1];
			expect(number, `${templateId} graine ${seed} : ${instance.statement}`).toBeDefined();
			expect(Number(number), `${templateId} graine ${seed} : jamais 0`).toBeGreaterThan(0);
			expect(Number(instance.blanks?.[0]?.expectedAnswer)).toBeGreaterThan(0);
		}
	}
	const rows = await sql<{ id: string; grades: string[] }>(
		`select id::text, grades from question_templates where id = any($1::uuid[])`,
		[DOUBLES_MOITIES_CE1]
	);
	expect(rows).toHaveLength(3);
	for (const row of rows) expect(row.grades, row.id).toEqual(['CE1']);
	// Le rendu à l'élève
	const card = await openQuestion(page, DOUBLES_MOITIES_CE1[0], 3);
	expect(await frontText(card)).toMatch(/Quel est le double de \d+/);
});

// ============================================================================
// #1670 — A-03 « Droite perpendiculaire passant par un point », variation 3
// ============================================================================

test('#1670 — A-03, variation 3 : la figure s’affiche sur plusieurs tirages (graine 16 comprise), étiquette « d » près de la droite, la bonne équation est juste', async ({
	page
}) => {
	test.setTimeout(240_000);
	for (const seed of [16, 1, 2, 3, 4, 5, 6, 7]) {
		const card = await openQuestion(page, PERPENDICULAIRE_A03, seed, 2);
		const figure = card.locator('.flip-card-front svg.figure-svg');
		await expect(figure, `graine ${seed} : figure`).toBeVisible();
		// Les étiquettes sont des formules KaTeX posées dans la figure : on lit le texte affiché
		// (graduations, puis « O » l'origine, « A » le point, « d » la droite)
		const labels = ((await figure.textContent()) ?? '').replace(/[−\d\s]/g, '');
		expect(labels, `graine ${seed} : étiquettes de la figure`).toBe('OAd');
		expect((await card.locator('.flip-card-front').innerText()).toLowerCase()).not.toContain(
			'figure indisponible'
		);
		if (seed === 16) await shoot(page, '1670-figure-graine-16');
	}

	// Bout en bout : la droite d, le point A → l'équation de la perpendiculaire écrite dans la correction
	const card = await openQuestion(page, PERPENDICULAIRE_A03, 16, 2);
	const front = await frontText(card);
	const d =
		/d'équation (-?\d*) ?x ([+-]) (\d*) ?y ([+-]) (\d+) = 0 et le point A\((-?\d+)\\,;\\,(-?\d+)\)/.exec(
			front
		);
	expect(d, `énoncé lisible : ${front}`).not.toBeNull();
	const read = (coef: string) => (coef === '' ? 1 : Number(coef));
	const a = read(d?.[1] ?? '');
	const b = (d?.[2] === '-' ? -1 : 1) * read(d?.[3] ?? '');
	const x0 = Number(d?.[6]);
	const y0 = Number(d?.[7]);
	// Perpendiculaire : −b·x + a·y + c' = 0 avec c' = b·x0 − a·y0
	const cp = b * x0 - a * y0;
	const typed = `${-b}x${a < 0 ? '' : '+'}${a}y${cp < 0 ? '' : '+'}${cp}=0`;
	await typeAndValidate(page, card, typed);
	expect(await caseState(page), `réponse ${typed} pour ${front}`).toBe('Case 1 : juste');
});

// ============================================================================
// #1664 — Vrai ou Faux : racines et opérations (2de)
// ============================================================================

test('#1664 — « Vrai ou Faux : racines et opérations » : 4 formes se tirent ; « √a × √b = √(a + b) » jamais avec a = b = 2 ; corrigés lisibles (« Or 12 ≠ 8… ») ; la bonne réponse est juste', async ({
	page
}) => {
	test.setTimeout(300_000);
	await login(page, ADMIN.email, ADMIN.password);
	const seen = new Set<number>();
	for (let seed = 1; seed <= 80; seed++) {
		const instance = await generate(page, RACINES_ET_OPERATIONS, seed);
		const variation = instance.selectedVariationIndex ?? -1;
		seen.add(variation);
		const vars = Object.fromEntries(
			(instance.resolvedVariables ?? []).map((v) => [v.name, v.value])
		);
		if (variation === 2) {
			expect(
				vars.a === '2' && vars.b === '2',
				`graine ${seed} : √2 × √2 = √4 n'est pas une forme « faux »`
			).toBe(false);
			const steps = (instance.correction?.steps ?? []).join('\n');
			expect(steps).toContain(
				`Or $${Number(vars.a) * Number(vars.b)} \\neq ${Number(vars.a) + Number(vars.b)}$`
			);
		}
	}
	expect([...seen].sort(), 'les 4 formes du modèle se tirent').toEqual([0, 1, 2, 3]);

	// Le rendu : on joue 30 graines de la série, on répond juste, on lit la correction
	const forms = new Set<string>();
	for (let seed = 1; seed <= 30; seed++) {
		const card = await openQuestion(page, RACINES_ET_OPERATIONS, seed);
		const front = (await formulas(card)).join(' ') + (await frontText(card));
		const sum = /\\sqrt\{(\d+)\} \+ \\sqrt\{(\d+)\} = \\sqrt\{(\d+)\}/.exec(front);
		const product = /\\sqrt\{(\d+)\} \\times \\sqrt\{(\d+)\} = \\sqrt\{(\d+)\}/.exec(front);
		const double = /\\sqrt\{(\d+)\} \+ \\sqrt\{\1\} = 2 \\sqrt\{\1\}/.exec(front);
		let isTrue: boolean;
		let form: string;
		if (double) {
			isTrue = true;
			form = '√a + √a = 2√a';
		} else if (sum) {
			isTrue = false;
			form = '√a + √b = √(a+b)';
		} else if (product) {
			const [a, b, c] = product.slice(1).map(Number);
			isTrue = c === a * b;
			form = isTrue ? '√a × √b = √(ab)' : '√a × √b = √(a+b)';
			if (!isTrue) expect(a === 2 && b === 2, `graine ${seed} : jamais a = b = 2`).toBe(false);
		} else {
			throw new Error(`graine ${seed} : forme inconnue dans ${front}`);
		}
		if (forms.has(form) && forms.size < 4) {
			// Une forme déjà jouée : on ne la rejoue pas pour aller plus vite
			continue;
		}
		forms.add(form);
		const text = await chooseAndValidate(page, card, isTrue ? 0 : 1);
		expect(text, `graine ${seed} (${form})`).toContain('Juste');
		if (form === '√a × √b = √(a+b)') {
			const rendered = await formulas(card);
			const [a, b] = (product ?? []).slice(1).map(Number);
			expect(rendered.join(' ')).toContain(`${a * b} \\neq ${a + b}`);
			await shoot(page, '1664-racines-corrige-faux');
		}
		if (forms.size === 4) break;
	}
	expect([...forms].sort(), 'les 4 formes jouées de bout en bout').toEqual([
		'√a + √a = 2√a',
		'√a + √b = √(a+b)',
		'√a × √b = √(a+b)',
		'√a × √b = √(ab)'
	]);
});

// ============================================================================
// #1646 — Scissions de la passe lycée
// ============================================================================

test('#1646 — « Calculer une dérivée » (1re spé) ne tire plus f(x) = √x ; la carte « Dérivée de la fonction racine carrée » pose (√x)′ et accepte 1/(2√x)', async ({
	page
}) => {
	test.setTimeout(300_000);
	await login(page, ADMIN.email, ADMIN.password);
	const functions = new Set<string>();
	for (let seed = 1; seed <= 80; seed++) {
		const instance = await generate(page, CALCULER_UNE_DERIVEE, seed);
		const f = /f\\left\( x \\right\) = (.+?)(?:\$|\n|\\placeholder|$)/.exec(
			instance.statement.replace(/\n+/g, '\n')
		)?.[1];
		expect(f, `graine ${seed} : ${instance.statement}`).toBeDefined();
		expect(f, `graine ${seed} : pas de racine`).not.toMatch(/sqrt|\\sqrt/);
		functions.add(String(f));
	}
	expect(
		functions.size,
		`plusieurs fonctions tirées : ${[...functions].join(' ; ')}`
	).toBeGreaterThan(3);

	// La carte racine carrée : l'énoncé est (√x)′ et la correction pose 1/(2√x)
	const card = await openQuestion(page, DERIVEE_RACINE, 1);
	expect(await fieldValue(card)).toContain('f^{\\prime}\\left(x\\right)=');
	expect((await formulas(card)).join(' ')).toContain('\\sqrt{x}');
	await validateEmpty(card);
	expect((await formulas(card)).join(' ')).toContain('\\dfrac{1}{2 \\sqrt{x}}');
	await shoot(page, '1646-derivee-racine');

	// Au clavier, la forme 1/(2√x) est acceptée
	const typedCard = await openQuestion(page, DERIVEE_RACINE, 1);
	await typeAndValidate(page, typedCard, '1/(2sqrt(x))');
	const state = await caseState(page);
	expect(state === 'Case 1 : juste' || state === 'Case 1 : forme à améliorer', state).toBe(true);
	expect(state, 'compté juste, pas faux').not.toBe('Case 1 : fausse');
});

// ============================================================================
// #1640 — Lot C de la passe lycée
// ============================================================================

test('#1640 — « Conjecturer la limite d’une suite » : énoncé « Quelle semble être la limite… », corrigé de qⁿ avec 1/b « la limite semble être 0 » ; la carte « Étude de fonction : ce qu’on cherche » sans « limites aux bornes » ; corrigé de e^(ax)·e^b', async ({
	page
}) => {
	test.setTimeout(300_000);
	await login(page, ADMIN.email, ADMIN.password);
	let fractionBase = 0;
	for (let seed = 1; seed <= 80; seed++) {
		const instance = await generate(page, LIMITE_SUITE, seed);
		expect(instance.statement).toContain(
			'Quelle semble être la limite de la suite dont le terme général est donné ci-dessous ?'
		);
		if (/\\left\( -?\\dfrac\{1\}\{\d+\} \\right\)\^n/.test(instance.statement)) {
			fractionBase += 1;
			const steps = (instance.correction?.steps ?? []).join('\n');
			expect(steps, `graine ${seed} : ${instance.statement}`).toMatch(/limite semble être/);
			expect(steps).toMatch(/limite semble être \$?0\$?/);
		}
	}
	expect(fractionBase, 'qⁿ avec q = ±1/b tiré au moins une fois').toBeGreaterThan(0);

	// Le rendu à l'élève : q = −1/5, la bonne réponse (0) est juste et le corrigé dit 0
	let rendered = false;
	for (let seed = 1; seed <= 30 && !rendered; seed++) {
		const card = await openQuestion(page, LIMITE_SUITE, seed);
		if (!/\\left\( -?\\dfrac\{1\}\{\d+\} \\right\)\^n/.test(await frontText(card))) continue;
		const choices = await card.locator('.flip-card-front').getByRole('radio').allTextContents();
		const zero = choices.findIndex((text) => text.trim().endsWith('0'));
		expect(zero, `un choix « 0 » parmi ${JSON.stringify(choices)}`).toBeGreaterThanOrEqual(0);
		const text = await chooseAndValidate(page, card, zero);
		expect(text).toContain('Juste');
		expect(text).toMatch(/Correction/);
		await shoot(page, '1640-limite-suite-q-fraction');
		rendered = true;
	}
	expect(rendered, 'une suite (±1/b)ⁿ jouée').toBe(true);

	// Carte de cours : le verso ne parle plus de « limites aux bornes »
	const [carte] = await sql<{ variations: unknown }>(
		'select variations from question_templates where id = $1',
		[CARTE_ETUDE_FONCTION]
	);
	expect(JSON.stringify(carte.variations)).not.toMatch(/limites? aux bornes/i);
	expect(JSON.stringify(carte.variations)).toContain('variations');
	await page.goto(`/dashboard/admin/questions/${CARTE_ETUDE_FONCTION}/preview`);
	await page.waitForLoadState('networkidle');
	await expect(page.getByText("Étude de fonction : ce qu'on cherche").first()).toBeVisible();
	expect(await page.locator('body').innerText()).not.toMatch(/limites? aux bornes/i);

	// Brouillon `227f2c9c` : corrigé par e^(ax) × e^b, puis rendu dans l'énoncé
	const decomposed: string[] = [];
	for (let seed = 1; seed <= 40; seed++) {
		const instance = await generate(page, DERIVEE_EXP_AFFINE, seed);
		const steps = (instance.correction?.steps ?? []).join('\n');
		if (steps.includes('e^{-x}\\times e')) decomposed.push(steps);
		expect(steps, `graine ${seed} : toute dérivée finit par a·e^(ax)`).toMatch(/a\\,e\^\{ax\}/);
	}
	expect(decomposed.length, 'un tirage avec b ≠ 0 corrigé par e^(ax)·e^b').toBeGreaterThan(0);
});

// ============================================================================
// #1642 — Espaces de groupement (règle du BIPM)
// ============================================================================

test('#1642 — modèle marqué « Espaces dès 4 chiffres » (Complément à 10 000, CM1) : « 8 500 » et « 10 000 » dans l’énoncé, la correction aussi ; « 1500 » sans espace est remarqué', async ({
	page
}) => {
	test.setTimeout(240_000);
	const [options] = await sql<{ options: { constraints?: { spacesFromFourDigits?: boolean } } }>(
		'select options from question_templates where id = $1',
		[COMPLEMENT_10000_A_TROU]
	);
	expect(options.options.constraints?.spacesFromFourDigits).toBe(true);

	await login(page, ADMIN.email, ADMIN.password);
	const card = await openQuestion(page, COMPLEMENT_10000_A_TROU, 1);
	const statement = await fieldValue(card);
	// « ? + 2 200 = 10 000 » (la case d'abord)
	const parts = /^\\placeholder\[0\]\{\}\+(\d+)=(\d+)$/.exec(statement.replace(/\\,|\\ /g, ''));
	expect(parts, `énoncé : ${statement}`).not.toBeNull();
	// L'espace est dans l'énoncé (« 8\,500 »), pas seulement dans la valeur
	expect(statement).toMatch(/\d\\[, ]\d{3}/);
	const answer = Number(parts?.[2]) - Number(parts?.[1]);
	expect(answer, `complément de ${parts?.[1]} à ${parts?.[2]}`).toBeGreaterThanOrEqual(1000);
	expect(answer).toBeGreaterThanOrEqual(1000);
	const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	const typed = await typeAndValidate(page, card, String(answer));
	expect(typed, 'la remarque sur l’espace manquant').toContain('Les chiffres sont mal espacés.');
	await shoot(page, '1642-espaces-remarque');
	const correct = await openQuestion(page, COMPLEMENT_10000_A_TROU, 1);
	await typeAndValidate(
		page,
		correct,
		`${Math.floor(answer / 1000)} ${String(answer % 1000).padStart(3, '0')}`
	);
	expect(await caseState(page), `réponse « ${group(answer)} »`).toBe('Case 1 : juste');
	const correction = await openQuestion(page, COMPLEMENT_10000_A_TROU, 1);
	await validateEmpty(correction);
	expect((await formulas(correction)).join(' '), 'la correction groupe aussi').toMatch(
		/\d\\[, ]\d{3}/
	);
});

test('#1642 — question de calcul ordinaire (« Calculer un produit », CM2, × 1000) : 4 chiffres sans espace acceptés sans remarque, 5 chiffres sans espace remarqués', async ({
	page
}) => {
	test.setTimeout(240_000);
	// Un produit de 4 chiffres (≥ 1000, < 10 000) et un de 5 chiffres, lus à l'écran
	let four: { seed: number; answer: number } | null = null;
	let five: { seed: number; answer: number } | null = null;
	for (let seed = 1; seed <= 60 && !(four && five); seed++) {
		const card = await openQuestion(page, MULTIPLIER_PAR_1000, seed);
		const shown = await fieldValue(card);
		const operands = /^([\d.]+)\\times1000=/.exec(shown.replace(/\{,\}/g, '.').replace(/\s/g, ''));
		if (!operands) continue;
		const answer = Math.round(Number(operands[1]) * 1000);
		if (answer >= 1000 && answer < 10_000 && Number.isInteger(answer) && !four)
			four = { seed, answer };
		if (answer >= 10_000 && answer < 100_000 && !five) five = { seed, answer };
	}
	expect(four, 'une graine à 4 chiffres').not.toBeNull();
	expect(five, 'une graine à 5 chiffres').not.toBeNull();

	const fourCard = await openQuestion(page, MULTIPLIER_PAR_1000, four?.seed ?? 0);
	const fourText = await typeAndValidate(page, fourCard, String(four?.answer));
	expect(await caseState(page)).toBe('Case 1 : juste');
	expect(fourText, 'aucune remarque d’espace dès 4 chiffres').not.toContain(
		'Les chiffres sont mal espacés.'
	);
	// L'affichage reste sans espace pour 4 chiffres
	expect(await fieldValue(fourCard)).not.toMatch(/\d\\[, ]\d{3}=/);

	const fiveCard = await openQuestion(page, MULTIPLIER_PAR_1000, five?.seed ?? 0);
	const fiveText = await typeAndValidate(page, fiveCard, String(five?.answer));
	expect(fiveText, '5 chiffres sans espace remarqués').toContain('Les chiffres sont mal espacés.');
	await shoot(page, '1642-espace-5-chiffres');
});

// ============================================================================
// #1650 — Fiche du modèle en tête de l'aperçu et de l'éditeur
// ============================================================================

test('#1650 — fiche du modèle « Trouver le complément » (CM1) : en tête de l’aperçu (titre, statut, type, classe, chemin, points « aucun », réglage, lien) et version courte dans l’éditeur', async ({
	page
}) => {
	test.setTimeout(120_000);
	// Le statut réel du modèle en base locale (« Publié » en prod, brouillon ici : donnée, pas code)
	const [row] = await sql<{ status: string }>(
		'select status from question_templates where id = $1',
		[COMPLEMENT_10000_ECOLE]
	);
	const status = row.status === 'published' ? 'Publié' : 'Brouillon';
	await login(page, ADMIN.email, ADMIN.password);
	await page.goto(`/dashboard/admin/questions/${COMPLEMENT_10000_ECOLE}/preview`);
	await page.waitForLoadState('networkidle');
	const sheet = page.getByRole('main');
	await expect(sheet.getByText('Trouver le complément').first()).toBeVisible();
	const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
	expect(text).toContain(status);
	expect(text).toContain('À trous');
	expect(text).toContain('CM1');
	expect(text).toContain('Nombres et calculs › Entiers : addition et soustraction › complément');
	expect(text).toMatch(
		/aucun — Aucun point de CM1 ou d’une classe suivante sur ce nœud ni sur sa notion/
	);
	expect(text).toContain('Espaces dès 4 chiffres (7 900, numération)');
	await expect(page.getByRole('link', { name: 'Modifier le modèle' })).toHaveAttribute(
		'href',
		new RegExp(`/dashboard/admin/questions/${COMPLEMENT_10000_ECOLE}/edit`)
	);
	await shoot(page, '1650-fiche-apercu');
	// « aucun » en rouge
	const none = page.getByText('aucun', { exact: true }).first();
	await expect(none).toBeVisible();
	const color = await none.evaluate((el) => getComputedStyle(el).color);
	const [r, g, b] = (color.match(/[\d.]+/g) ?? []).map(Number);
	expect(r, `couleur de « aucun » : ${color}`).toBeGreaterThan(Math.max(g, b) + 40);

	await page.goto(`/dashboard/admin/questions/${COMPLEMENT_10000_ECOLE}/edit`);
	await page.waitForLoadState('networkidle');
	const edit = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
	expect(edit).toContain('Trouver le complément');
	expect(edit).toContain(status);
	expect(edit).toContain('CM1');
	expect(edit).toContain('Nombres et calculs › Entiers : addition et soustraction › complément');
	await expect(page.getByRole('link', { name: 'Aperçu du modèle' })).toBeVisible();
	expect(edit).toMatch(/Aucun point de CM1 ou d.une classe suivante/);
	await shoot(page, '1650-fiche-editeur');

	// Un modèle relié à un point : code et nom affichés (Décomposer, CP-004)
	await page.goto(`/dashboard/admin/questions/${DECOMPOSER_CP}/preview`);
	await page.waitForLoadState('networkidle');
	const linked = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
	expect(linked).toContain('CP-004');
	expect(linked).toContain("Connaitre et utiliser diverses représentations d'un nombre");
	await shoot(page, '1650-fiche-point');
});

// ============================================================================
// #1635 — Libellés des points de programme (sélecteur de points d'un exercice)
// ============================================================================

test('#1635 — points de programme : TSPE-626 juste après TSPE-444 (Tle spé), TCOMP-379 après TCOMP-236 (Tle compl.), libellés de 2-273 et 1GEN-029/030/031 ; formules rendues dans le sélecteur', async ({
	page
}) => {
	test.setTimeout(120_000);
	const point = async (code: string) =>
		(
			await sql<{ name: string; display_order: number; grade: string; id: string }>(
				'select id::text, name, display_order, grade from curriculum_points where code = $1',
				[code]
			)
		)[0];
	// Ordre : le premier point qui suit le TSPE-444, dans la même classe, est le TSPE-626
	for (const [before, after, grade] of [
		['TSPE-444', 'TSPE-626', 'T_SPE'],
		['TCOMP-236', 'TCOMP-379', 'T_COMP']
	]) {
		const [b, a] = [await point(before), await point(after)];
		expect(b.grade).toBe(grade);
		expect(a.grade).toBe(grade);
		expect(a.name).toBe(
			"Utiliser l'équation fonctionnelle de l'exponentielle pour transformer une écriture"
		);
		const between = await sql(
			`select code from curriculum_points where grade = $1 and archived_at is null
			    and display_order > $2 and display_order < $3`,
			[grade, b.display_order, a.display_order]
		);
		expect(between, `points entre ${before} et ${after}`).toEqual([]);
	}
	expect((await point('2-273')).name).toMatch(/\(par exemple \$U = RI\$, /);
	for (const code of ['1GEN-029', '1GEN-030', '1GEN-031']) {
		expect((await point(code)).name, code).toContain('à termes strictement positifs');
	}

	// Rendu : la fiche d'un modèle relié à un point écrit son nom (même rendu que le sélecteur de
	// points d'un exercice, qui reste à voir : non rejoué ici)
	await login(page, ADMIN.email, ADMIN.password);
	await page.goto(`/dashboard/admin/questions/${DECOMPOSER_CP}/preview`);
	await page.waitForLoadState('networkidle');
	await expect(page.getByText('CP-004').first()).toBeVisible();
});

// ============================================================================
// #1628 — Forme demandée : √3/3
// ============================================================================

test('#1628 — « Rationaliser un dénominateur » (k/√n) : k√(1/n) n’est « pas sous la forme demandée » (et non faux), k√n est faux, k√n/n est juste', async ({
	page
}) => {
	test.setTimeout(240_000);
	// Variation « k / √n » (la première) : la forme demandée est « k√n / n », sans racine au dénominateur
	const read = async (): Promise<{ card: Locator; k: number; n: number }> => {
		const card = await openQuestion(page, RATIONALISER, 1, 0);
		const shown = await fieldValue(card);
		const hit = /^\\d?frac\{(\d+)\}\{\\sqrt\{(\d+)\}\}=/.exec(shown);
		expect(hit, `énoncé : ${shown}`).not.toBeNull();
		return { card, k: Number(hit?.[1]), n: Number(hit?.[2]) };
	};
	const { card, k, n } = await read();
	expect(Number.isInteger(Math.sqrt(n)), `√${n} n'est pas entière`).toBe(false);

	// Même valeur, mais la racine reste au dénominateur de fait : k√(1/n)
	const text = await typeAndValidate(page, card, `${k}*sqrt(1/${n})`);
	expect(text, `${k}√(1/${n}) : forme demandée`).toContain(
		'La réponse est juste, mais pas écrite sous la forme demandée.'
	);
	expect(text, 'pas « Faux »').not.toContain('Faux');
	expect(await caseState(page)).toBe('Case 1 : forme à améliorer');
	await shoot(page, '1628-forme-demandee');

	// Une vraie erreur reste fausse : k√n
	const wrong = await read();
	const wrongText = await typeAndValidate(page, wrong.card, `${k}*sqrt(${n})`);
	expect(await caseState(page)).toBe('Case 1 : fausse');
	expect(wrongText).toContain('Faux');

	// La forme rationalisée est juste : k√n / n
	const right = await read();
	await typeAndValidate(page, right.card, `${k}sqrt${n}>/${n}`);
	expect(await caseState(page)).toBe('Case 1 : juste');
});

// ============================================================================
// #1636 — Factoriser un trinôme à l'aide de ses racines
// ============================================================================

test('#1636 — « Factoriser un trinôme à l’aide de ses racines » : la forme a(x − x₁)(x − x₂) suit le x₁, x₂ du texte de la correction', async ({
	page
}) => {
	test.setTimeout(240_000);
	await login(page, ADMIN.email, ADMIN.password);
	let checked = 0;
	for (let seed = 1; seed <= 80; seed++) {
		const instance = await generate(page, FACTORISER_TRINOME, seed);
		const steps = (instance.correction?.steps ?? []).join('\n');
		const roots = /x_1=.*?=(-?\d+)\s*\\qquad x_2=.*?=(-?\d+)\$\$/s.exec(steps);
		if (!roots) continue;
		const last = steps.split('\n').at(-1) ?? '';
		const factors = [...last.matchAll(/\\left\( x ([+-]) (\d+) \\right\)/g)].map((m) =>
			m[1] === '+' ? -Number(m[2]) : Number(m[2])
		);
		expect(factors.sort(), `graine ${seed} : ${last}`).toEqual(
			[Number(roots[1]), Number(roots[2])].sort()
		);
		// La réponse attendue porte les mêmes facteurs
		const expected = instance.blanks?.[0]?.expectedAnswer ?? '';
		const inExpected = [...expected.matchAll(/\(x([+-])(\d+)\)/g)].map((m) =>
			m[1] === '+' ? -Number(m[2]) : Number(m[2])
		);
		expect(inExpected.sort(), `graine ${seed} : réponse attendue ${expected}`).toEqual(
			[Number(roots[1]), Number(roots[2])].sort()
		);
		checked += 1;
	}
	expect(checked, 'tirages avec racines à calculer').toBeGreaterThan(0);
});

/**
 * Le rendu à l'élève (variation « calculer les racines ») : x₁ et x₂ affichés, puis
 * a(x − x₁)(x − x₂) écrit avec les facteurs dans CET ordre.
 */
async function expectFactorsFollowRoots(
	page: Page,
	seed: number,
	knownGap?: string
): Promise<void> {
	const card = await openQuestion(page, FACTORISER_TRINOME, seed, 1);
	await validateEmpty(card);
	const shown = await formulas(card);
	const roots = /x_1=.*?=(-?\d+) \\qquad x_2=.*?=(-?\d+)$/s.exec(
		shown.find((tex) => tex.startsWith('x_1=')) ?? ''
	);
	expect(roots, `graine ${seed} : x₁ et x₂ affichés : ${JSON.stringify(shown)}`).not.toBeNull();
	const last = shown.at(-1) ?? '';
	const factors = [...last.matchAll(/\\left\( x ([+-]) (\d+) \\right\)/g)].map((m) =>
		m[1] === '+' ? -Number(m[2]) : Number(m[2])
	);
	await shoot(page, `1636-trinome-graine-${seed}`);
	// Écart connu : « attendu en échec » seulement ICI, après la mise en place (connexion, rendu,
	// lecture des racines), pour qu'une erreur de mise en place reste un vrai échec
	if (knownGap !== undefined) test.fail(true, knownGap);
	expect(
		factors,
		`graine ${seed} : x₁ = ${roots?.[1]}, x₂ = ${roots?.[2]} mais la correction écrit « ${last} »`
	).toEqual([Number(roots?.[1]), Number(roots?.[2])]);
}

test('#1636 — rendu : a > 0 (2x² − 6x − 20), les facteurs suivent x₁ = −2 puis x₂ = 5', async ({
	page
}) => {
	test.setTimeout(120_000);
	await expectFactorsFollowRoots(page, 1);
});

// Écart E34, constaté le 2026-11-24 : pour a < 0 (−2x² + 2x + 24), la correction écrit
// x₁ = 4 et x₂ = −3, puis « −2(x + 3)(x − 4) » : les facteurs sont dans l'ordre croissant des
// racines, pas dans celui de x₁, x₂ du texte. Corrigé (E34) : la dernière étape écrit les
// facteurs dans l'ordre de x₁, x₂ selon le signe de a.
test('#1636 — a < 0 (−2x² + 2x + 24, x₁ = 4, x₂ = −3) : les facteurs suivent x₁, x₂, −2(x − 4)(x + 3)', async ({
	page
}) => {
	test.setTimeout(120_000);
	await expectFactorsFollowRoots(page, 2);
});

// ============================================================================
// #1691, #1696, #1708 — modèles d'essai (brouillons « Verifs3 … »)
// ============================================================================

test.describe('modèles d’essai', () => {
	let createdIds: string[] = [];

	test.afterAll(async () => {
		// Ne supprime que les brouillons « Verifs3 … » créés par ces tests
		await sql(`delete from question_templates where title like $1 and status = 'draft'`, [
			`${PREFIXE} %`
		]);
		// Par identifiant aussi : un modèle passé en publié ne doit pas échapper au nettoyage
		if (createdIds.length > 0) {
			await sql(`delete from question_templates where id = any($1::uuid[])`, [createdIds]);
		}
		createdIds = [];
	});

	async function createDraft(
		page: Page,
		title: string,
		generatedSteps: Record<string, unknown>
	): Promise<string> {
		const response = await page.request.post('/api/questions/templates', {
			data: {
				type: 'fill_in_blanks',
				title: `${PREFIXE} ${title}`,
				grades: ['T_SPE'],
				level: 2,
				status: 'draft',
				delay: 60,
				variations: [
					{
						statement: 'Essai : correction automatique.\n\n$?$',
						blanks: [{ expectedAnswer: '0' }],
						correction: { generatedSteps }
					}
				]
			}
		});
		const body = (await response.json()) as { template?: { id: string }; errors?: string[] };
		expect(response.status(), JSON.stringify(body)).toBeLessThan(300);
		const id = body.template?.id ?? '';
		expect(id).not.toBe('');
		createdIds.push(id);
		return id;
	}

	async function correctionOf(
		page: Page,
		id: string,
		options: { allowEmpty?: boolean } = {}
	): Promise<string> {
		const response = await page.request.post(`/api/questions/generate/${id}`, {
			data: { seed: 1 }
		});
		expect(response.status()).toBe(200);
		const body = (await response.json()) as {
			instance: {
				correction?: { _renderedSteps?: { title?: string; expressionLatex?: string }[] };
			};
		};
		const rendered = (body.instance.correction?._renderedSteps ?? [])
			.map((s) => `${s.title ?? ''} :: ${s.expressionLatex ?? ''}`)
			.join('\n');
		// `allowEmpty` : le test d'écart #1708 attend justement une correction vide, et l'asserte
		// lui-même après `test.fail`
		if (options.allowEmpty !== true) {
			expect(rendered, `correction rendue : ${JSON.stringify(body.instance.correction)}`).not.toBe(
				''
			);
		}
		return rendered;
	}

	test('#1696 — dérivée (x³ − 3x² + 5, factorisée) finit par « On factorise » 3x² − 6x = 3x(x − 2) ; x·eˣ développée par « On développe » ; primitive de x·e^(−x) développée puis + C', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await login(page, ADMIN.email, ADMIN.password);
		const factorised = await correctionOf(
			page,
			await createDraft(page, 'dérivée factorisée', {
				kind: 'differentiate',
				expression: 'x^3 - 3x^2 + 5',
				finalForm: 'factorisee'
			})
		);
		expect(factorised).toContain('On factorise');
		expect(factorised).toMatch(/3 ?x\^?2?.*6 ?x.*=.*3 ?x ?\\left\( ?x - 2 ?\\right\)/);

		const developed = await correctionOf(
			page,
			await createDraft(page, 'dérivée développée', {
				kind: 'differentiate',
				expression: 'x e^x',
				finalForm: 'developpee'
			})
		);
		expect(developed).toContain('On développe');
		expect(developed).toMatch(/x ?\\?(exponentialE|e)\^\{?x\}? \+ \\?(exponentialE|e)\^\{?x\}?/);

		const primitive = await correctionOf(
			page,
			await createDraft(page, 'primitive développée', {
				kind: 'integrate',
				expression: 'x e^(-x)',
				finalForm: 'developpee'
			})
		);
		expect(primitive).toMatch(
			/- ?x ?\\?(exponentialE|e)\^\{ ?-x ?\} - \\?(exponentialE|e)\^\{ ?-x ?\}/
		);
		expect(primitive).toContain('+ C');
	});

	test('#1708 — primitive de 0,6x² − 0,6, forme factorisée : 0,2x(x − √3)(x + √3)', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await login(page, ADMIN.email, ADMIN.password);
		// Avec le point décimal (« 0.6x^2-0.6 ») ; la virgule de la ligne : test suivant
		const id = await createDraft(page, 'primitive décimale factorisée', {
			kind: 'integrate',
			expression: '0.6x^2-0.6',
			finalForm: 'factorisee'
		});
		const rendered = await correctionOf(page, id);
		expect(rendered).toMatch(
			/0\.2 x \\left\( x - \\sqrt\{3\} \\right\) \\left\( x \+ \\sqrt\{3\} \\right\) \+ C/
		);
	});

	// Écart E35, constaté le 2026-11-24 : la ligne écrit `0,6x^2-0,6` ; avec la virgule, la
	// correction automatique ne rend AUCUNE étape (ni erreur ni message), avec le point elle est juste.
	// Corrigé (E35) : la correction relit la virgule nue entre deux chiffres comme décimale.
	test('#1708 — « 0,6x^2-0,6 » (virgule, comme écrit dans la ligne) : même correction qu’avec le point', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await login(page, ADMIN.email, ADMIN.password);
		const rendered = await correctionOf(
			page,
			await createDraft(page, 'primitive virgule', {
				kind: 'integrate',
				expression: '0,6x^2-0,6',
				finalForm: 'factorisee'
			}),
			{ allowEmpty: true }
		);
		expect(rendered).toContain('\\sqrt{3}');
	});

	test('#1691 — le formulaire de modèle garde « feedback » : enregistrer une copie de « Calculer un terme d’une suite arithmétique » après avoir changé une virgule', async ({
		page
	}) => {
		test.setTimeout(180_000);
		const [copy] = await sql<{ id: string }>(
			`insert into question_templates (type, title, description, grades, level, variations, status, shared, options, classification_node_id, created_by)
			   select type, $2 || ' suite arithmétique', description, grades, level, variations, 'draft', shared, options, classification_node_id, created_by
			     from question_templates where id = $1
			 returning id::text`,
			[SUITE_ARITHMETIQUE_PRECEDENT, PREFIXE]
		);
		await login(page, ADMIN.email, ADMIN.password);
		await page.goto(`/dashboard/admin/questions/${copy.id}/edit`);
		await page.waitForLoadState('networkidle');
		// La correction de la variation 1 : on change un détail du texte (« (essai) » ajouté en fin)
		const correction = page.getByPlaceholder('Explication de la solution (optionnel)...');
		if (!(await correction.isVisible())) {
			await page.getByRole('button', { name: /Correction \(optionnel\)/ }).click();
		}
		await expect(correction).toBeVisible();
		const before = await correction.inputValue();
		await correction.fill(`${before} (essai)`);
		await page.getByRole('button', { name: 'Enregistrer brouillon' }).click();
		// Le brouillon enregistré porte le texte changé ET le message de retour (feedback)
		await expect
			.poll(async () => {
				const [row] = await sql<{ step: string; feedback: string | null }>(
					`select variations->0->'correction'->'steps'->>0 as step,
					        variations->0->'correction'->'feedback'->>'correct' as feedback
					   from question_templates where id = $1`,
					[copy.id]
				);
				return row;
			})
			.toEqual({
				step: `${before} (essai)`,
				feedback: 'Le terme précédent est {{answer}}.'
			});
		createdIds.push(copy.id);
	});
});
