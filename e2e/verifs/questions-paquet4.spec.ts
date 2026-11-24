import { expect, test, type Locator, type Page } from '@playwright/test';
import { ADMIN, assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { acquireLock, LOCK_WAIT_MAX_MS, releaseLock } from './helpers/verrou';
import { buildSeriesLink } from '../../src/lib/validation/series';

/**
 * Questions, modèles et évaluations — paquet 4 — base LOCALE
 * ==========================================================
 *
 * Reprend les lignes #1877, #1855, #1816 / #1822, #1812, #1820, #1825, #1843 et
 * #2120 / #2130 / #2145 de `docs/wip/verifications-manuelles.md`. Les modèles de la base
 * locale portent les identifiants de la prod : on les joue par le lien de série public
 * (`/automaths/test?…&mode=typing&graine=…`). Les modèles d'essai sont des copies
 * « Verifs4 … » posées par SQL.
 *
 * Écrit en base : modèles, série, évaluation et assignation « Verifs4 … » (supprimés en
 * `afterAll`, par identifiant ET par préfixe). Les élèves 16 à 20 sont partagés avec
 * `modeles-corrections.spec.ts` : verrou `eleves-16-20`.
 */

// Base locale seulement
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

test.describe.configure({ mode: 'serial' });

// Constantes

// Préfixe propre à ce fichier (« Verifs4 q4 ») : d'autres vérifications posent des modèles « Verifs4 … »
const PREFIXE = 'Verifs4 q4';
const SHOTS = '.captures/verifs/questions';
const STUDENT = { email: 'eleve16@local.test', password: 'local-eleve' };
const RESOUDRE_X2_A = 'ac9579d6-7d48-4b88-8d2f-e8c5319867db';
const SIGNE_FACTEUR = 'ace89247-0194-4049-b365-76c3a644069b';
const PARITE_ENTIER = 'c73734a8-aac1-4ce7-9aae-d568ce8752c5';
const VRAI_FAUX_RACINES = '0d2edda7-1d90-46ee-b07d-792ebbd43849';
const SUITE_MAJOREE = 'b59fe450-e57a-4dfc-8aa7-29337b3fa28f';
const VALEUR_E0 = 'ac3e6395-2d00-4ef5-a23e-50819afd7e50';

const createdTemplates: string[] = [];
const createdSeries: string[] = [];
const createdEvaluations: string[] = [];
let lockHeld = false;

/** Le compagnon de l'élève 16 avant les tests (lu seulement si les tests ont tourné) : rendu en `afterAll`. */
interface BuddyRow {
	xp: number;
	level: number;
	current_streak: number;
	longest_streak: number;
	last_activity_date: string | null;
	xp_earned_today: number;
	last_xp_date: string | null;
	themes_explored: string[];
	constance_week_start: string | null;
	constance_days_this_week: number;
	updated_at: string;
}
let buddyBefore: BuddyRow | null = null;

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
	assertLocalServerEnv();
	await acquireLock('eleves-16-20');
	lockHeld = true;
	// Rendre une évaluation notée change l'expérience et la révision espacée de l'élève : on photographie
	const [buddy] = await sql<BuddyRow>(
		`select xp, level, current_streak, longest_streak, last_activity_date::text, xp_earned_today,
		        last_xp_date::text, themes_explored, constance_week_start::text, constance_days_this_week,
		        updated_at::text
		   from student_buddies where student_id = (select id from profiles where email = $1)`,
		[STUDENT.email]
	);
	buddyBefore = buddy ?? null;
});

test.afterAll(async () => {
	try {
		await cleanup();
	} finally {
		if (lockHeld) releaseLock('eleves-16-20');
	}
});

async function cleanup(): Promise<void> {
	// Le compagnon de l'élève d'abord : un `delete` en échec plus bas ne doit pas le laisser modifié
	if (buddyBefore !== null) {
		await sql(
			`update student_buddies set xp = $2, level = $3, current_streak = $4, longest_streak = $5,
			        last_activity_date = $6, xp_earned_today = $7, last_xp_date = $8, themes_explored = $9,
			        constance_week_start = $10, constance_days_this_week = $11, updated_at = $12
			  where student_id = (select id from profiles where email = $1)`,
			[
				STUDENT.email,
				buddyBefore.xp,
				buddyBefore.level,
				buddyBefore.current_streak,
				buddyBefore.longest_streak,
				buddyBefore.last_activity_date,
				buddyBefore.xp_earned_today,
				buddyBefore.last_xp_date,
				buddyBefore.themes_explored,
				buddyBefore.constance_week_start,
				buddyBefore.constance_days_this_week,
				buddyBefore.updated_at
			]
		);
	}
	// Révision espacée écrite par l'évaluation rendue : ses cartes sur nos modèles (avant leur suppression)
	await sql(
		`delete from srs_card_stats
		  where user_id = (select id from profiles where email = $1) and card_reference_type = 'template'
		    and card_reference_id in (select id from question_templates where title like $2 or id = any($3::uuid[]))`,
		[STUDENT.email, `${PREFIXE} %`, createdTemplates]
	);
	// Évaluations d'abord (par identifiant puis par préfixe de série), puis séries, puis modèles
	const evaluationIds = [...createdEvaluations];
	const prefixed = await sql<{ id: string }>(
		`select e.id::text from evaluations e join series s on s.id = e.series_id where s.title like $1`,
		[`${PREFIXE} %`]
	);
	evaluationIds.push(...prefixed.map((row) => row.id));
	if (evaluationIds.length > 0) {
		// Les copies de l'élève (séances, réponses, questions figées) avant l'évaluation
		await sql(`delete from test_sessions where evaluation_id = any($1::uuid[])`, [evaluationIds]);
		await sql(`delete from evaluation_assignments where evaluation_id = any($1::uuid[])`, [
			evaluationIds
		]);
		await sql(`delete from evaluations where id = any($1::uuid[])`, [evaluationIds]);
	}
	if (createdSeries.length > 0) {
		await sql(`delete from series where id = any($1::uuid[])`, [createdSeries]);
	}
	await sql(`delete from series where title like $1`, [`${PREFIXE} %`]);
	const allTemplates = [...createdTemplates];
	if (allTemplates.length > 0) {
		await sql(`delete from skill_attempts where template_id = any($1::uuid[])`, [allTemplates]);
		await sql(`delete from question_templates where id = any($1::uuid[])`, [allTemplates]);
	}
	await sql(
		`delete from skill_attempts where template_id in (select id from question_templates where title like $1)`,
		[`${PREFIXE} %`]
	);
	await sql(`delete from question_templates where title like $1`, [`${PREFIXE} %`]);
}

// Types

interface Variation {
	statement: string;
	blanks?: { expectedAnswer: string; answerKind?: string }[];
	variables?: unknown[];
	correction?: unknown;
	[key: string]: unknown;
}

// Functions

/** Un modèle publié « Verifs4 … » posé par SQL (comme `operations.spec.ts`). */
async function makeTemplate(
	title: string,
	variations: Variation[],
	status: 'published' | 'draft' = 'published'
): Promise<string> {
	const rows = await sql<{ id: string }>(
		`insert into question_templates (type, grades, level, variations, status, title, created_by)
		 values ('fill_in_blanks', array['CE1'], 1, $1::jsonb, $4, $2,
		   (select id from profiles where email = $3))
		 returning id::text`,
		[JSON.stringify(variations), `${PREFIXE} ${title}`, TEACHER.email, status]
	);
	createdTemplates.push(rows[0].id);
	return rows[0].id;
}

async function variationsOf(templateId: string): Promise<Variation[]> {
	const rows = await sql<{ variations: Variation[] }>(
		`select variations from question_templates where id = $1`,
		[templateId]
	);
	return rows[0].variations;
}

/** Joue une question par le lien de série public ; rend la carte une fois prête. */
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

/** Texte lu de la face avant (formules comprises) sur une ligne. */
async function frontText(card: Locator): Promise<string> {
	return ((await card.locator('.flip-card-front').first().textContent()) ?? '').replace(
		/\s+/g,
		' '
	);
}

async function cardText(card: Locator): Promise<string> {
	return ((await card.innerText()) ?? '').replace(/\s+/g, ' ');
}

async function shoot(page: Page, name: string): Promise<void> {
	// Le compte à rebours d'une évaluation anime la page en permanence : on n'attend pas plus de 3 s
	await page
		.waitForFunction(() => document.getAnimations().length === 0, undefined, { timeout: 3000 })
		.catch(() => undefined);
	await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Tape au vrai clavier dans la première case MathLive, puis « Valider ». */
async function typeAndValidate(page: Page, card: Locator, typed: string): Promise<string> {
	const field = card.locator('math-field').first();
	const box = await field.boundingBox();
	if (!box) throw new Error('case de réponse introuvable');
	await field.click({ position: { x: Math.max(5, box.width - 15), y: box.height / 2 } });
	await expect
		.poll(async () => page.evaluate(() => document.activeElement?.tagName))
		.toBe('MATH-FIELD');
	// « > » = flèche droite (sortir d'une racine avant de continuer)
	for (const key of typed) {
		if (key === '>') await page.keyboard.press('ArrowRight');
		else await page.keyboard.type(key, { delay: 80 });
	}
	await page.getByRole('button', { name: 'Valider' }).click();
	await expect(page.locator('[id$="-etats"]')).toHaveCount(1);
	return cardText(card);
}

/** Choisit la réponse `index` (0 = A) puis « Valider » ; rend le verdict affiché. */
async function chooseAndValidate(page: Page, card: Locator, index: number): Promise<string> {
	await card.locator('.flip-card-front').getByRole('radio').nth(index).click();
	await page.getByRole('button', { name: 'Valider' }).click();
	// Le verdict lui-même (« Juste », « Faux », « ½ point »), pas le texte de toute la carte
	const verdict = card.getByText(/^(Juste|Faux|½ point)$/).first();
	await expect(verdict).toBeVisible();
	return (await verdict.innerText()).trim();
}

// ============================================================================
// #1877 — Racine à simplifier dans une case intervalles
// ============================================================================

test('#1877 — « Résoudre une équation x² = a », le VRAI modèle publié (variation « k²·m ») : {−√a ; √a} → ½ « La racine peut être simplifiée. », {−k√m ; k√m} → juste', async ({
	page
}) => {
	test.setTimeout(180_000);
	// Le modèle publié lui-même, pas une copie : son réglage `blankDefaults.answerKind: 'intervalles'`
	// vit dans `shared`, qu'une copie des variations perd (c'est ce qui avait créé le faux écart E42)
	const variations = await variationsOf(RESOUDRE_X2_A);
	const kTimesRootM = variations.findIndex((variation) =>
		(variation.statement ?? '').includes('(k)^2*(m)')
	);
	expect(kTimesRootM, 'variation « k²·m » du modèle publié').toBeGreaterThanOrEqual(0);

	/** a = k²·m lu dans l'énoncé (k de 2 à 5, m sans facteur carré) */
	const read = async (card: Locator): Promise<{ a: number; k: number; m: number }> => {
		const match = /x\^2\s*=\s*(\d+)/.exec(await frontText(card));
		if (!match) throw new Error('équation x² = a introuvable dans l’énoncé');
		const a = Number(match[1]);
		const k = [5, 4, 3, 2].find((candidate) => a % (candidate * candidate) === 0);
		if (k === undefined) throw new Error(`a = ${a} n'est pas de la forme k²·m`);
		return { a, k, m: a / (k * k) };
	};

	const half = await openQuestion(page, RESOUDRE_X2_A, 1, kTimesRootM);
	const first = await read(half);
	const halfText = await typeAndValidate(page, half, `{-sqrt${first.a}>;sqrt${first.a}>}`);
	await shoot(page, '1877-moitie');
	expect(halfText).toContain('La racine peut être simplifiée.');
	expect(halfText).toContain('½ point');

	const right = await openQuestion(page, RESOUDRE_X2_A, 2, kTimesRootM);
	const second = await read(right);
	const rightText = await typeAndValidate(
		page,
		right,
		`{-${second.k}sqrt${second.m}>;${second.k}sqrt${second.m}>}`
	);
	expect(rightText).not.toContain('La racine peut être simplifiée.');
	expect(rightText).toContain('Juste');
});

// ============================================================================
// #1855 — QCM migrés en cases choix
// ============================================================================

/** Libellés lus des choix (radios) de la face avant, dans l'ordre affiché. */
async function choiceLabels(card: Locator): Promise<string[]> {
	return (await card.locator('.flip-card-front').getByRole('radio').allTextContents()).map(
		// « A négatif » : la lettre du choix précède son texte
		(text) =>
			text
				.replace(/\s+/g, ' ')
				.trim()
				.replace(/^[A-H] /, '')
	);
}

/** Choisit le choix dont le texte est exactement `label`, puis « Valider » ; rend le verdict affiché. */
async function chooseLabelAndValidate(page: Page, card: Locator, label: string): Promise<string> {
	const labels = await choiceLabels(card);
	const index = labels.findIndex((text) => text === label);
	expect(index, `choix « ${label} » parmi ${JSON.stringify(labels)}`).toBeGreaterThanOrEqual(0);
	return chooseAndValidate(page, card, index);
}

test('#1855 — « Déterminer le signe d’un facteur » : (−a) × … = b sans case dans l’égalité, deux choix positif / négatif, négatif est juste, positif est faux', async ({
	page
}) => {
	test.setTimeout(180_000);
	// Variation 1 du modèle : « (−a) × … = b » avec b > 0 → le facteur manquant est négatif
	const card = await openQuestion(page, SIGNE_FACTEUR, 1, 0);
	const front = await frontText(card);
	expect(front).toMatch(/\\left\( -\d+ \\right\) \\times … = \d+/);
	// Pas de case de formule dans l'égalité : seulement les choix
	await expect(card.locator('math-field')).toHaveCount(0);
	expect(front).not.toContain('placeholder');
	expect((await choiceLabels(card)).sort()).toEqual(['négatif', 'positif']);
	await shoot(page, '1855-signe-facteur');
	expect(await chooseLabelAndValidate(page, card, 'négatif')).toBe('Juste');

	const wrong = await openQuestion(page, SIGNE_FACTEUR, 1, 0);
	expect(await chooseLabelAndValidate(page, wrong, 'positif')).toBe('Faux');
});

test('#1855 — « Parité d’un nombre entier » : pair puis impair, toujours dans cet ordre ; la bonne parité est juste, l’autre est fausse', async ({
	page
}) => {
	test.setTimeout(240_000);
	const seen = new Set<string>();
	for (let seed = 1; seed <= 8; seed++) {
		const card = await openQuestion(page, PARITE_ENTIER, seed);
		expect(await choiceLabels(card), `graine ${seed} : ordre fixe`).toEqual(['pair', 'impair']);
		const number = /de ce nombre \?\s*(\d+)/.exec(await frontText(card));
		expect(
			number,
			`graine ${seed} : nombre dans l'énoncé : ${await frontText(card)}`
		).not.toBeNull();
		const parity = Number(number?.[1]) % 2 === 0 ? 'pair' : 'impair';
		const other = parity === 'pair' ? 'impair' : 'pair';
		seen.add(parity);
		if (seed <= 2) {
			expect(await chooseLabelAndValidate(page, card, parity)).toBe('Juste');
			const wrong = await openQuestion(page, PARITE_ENTIER, seed);
			expect(await chooseLabelAndValidate(page, wrong, other)).toBe('Faux');
		}
	}
	expect([...seen].sort(), 'les deux parités se tirent').toEqual(['impair', 'pair']);
});

test('#1855 — un Vrai / Faux (« Vrai ou Faux : racines et opérations ») : « Vrai » puis « Faux » sur 10 tirages, jamais mélangés', async ({
	page
}) => {
	test.setTimeout(240_000);
	for (let seed = 1; seed <= 10; seed++) {
		const card = await openQuestion(page, VRAI_FAUX_RACINES, seed);
		expect(await choiceLabels(card), `graine ${seed}`).toEqual(['Vrai', 'Faux']);
	}
});

test('#1855 — lycée : « Valeur de e⁰ » et « Suite majorée, minorée ou bornée » : (uₙ) et e rendus en formules, sans $ affichés ; plus aucun modèle à choix de l’ancien type', async ({
	page
}) => {
	test.setTimeout(180_000);
	// Plus d'ancien type « choix multiple » : tous les QCM sont des cases choix
	const old = await sql<{ n: string }>(
		`select count(*)::text as n from question_templates where type not in ('fill_in_blanks', 'course_card')`
	);
	expect(old[0].n).toBe('0');

	const e0 = await openQuestion(page, VALEUR_E0, 1);
	const e0Labels = await choiceLabels(e0);
	expect(e0Labels).toHaveLength(4);
	// Les choix de « Que vaut e⁰ ? » : 0, 1, e (le nombre d'Euler, \\exponentialE), texte (ordre fixe, `melanger: non`)
	expect(e0Labels.slice(0, 3)).toEqual(['0', '1', '\\exponentialE']);
	expect(e0Labels[3]).toBe("Ce nombre n'existe pas.");
	// « e » est une formule (KaTeX), pas du texte brut entouré de $
	expect(
		await e0.locator('.flip-card-front [role="radio"] math-span').count()
	).toBeGreaterThanOrEqual(3);
	expect(await frontText(e0)).not.toContain('$');
	await shoot(page, '1855-valeur-e0');
	expect(await chooseLabelAndValidate(page, e0, '1')).toBe('Juste');

	const suite = await openQuestion(page, SUITE_MAJOREE, 1);
	const labels = await choiceLabels(suite);
	expect(labels).toHaveLength(4);
	for (const label of labels) {
		expect(label, 'la suite (u_n) est rendue').toContain('\\left( u_n \\right)');
		expect(label).not.toContain('$');
	}
	expect(await frontText(suite)).toMatch(/Soit \\left\( u_n \\right\)/);
	await shoot(page, '1855-suite-majoree');
});

// ============================================================================
// #1816, #1822 — Case choix dans l'éditeur de modèle
// ============================================================================

const STATEMENT_PLACEHOLDER = "Ecrivez l'enonce de la question en markdown...";

/** Un brouillon « Verifs4 … » sans case, ouvert dans l'éditeur admin. */
async function openEditor(page: Page, title: string, statement = 'Quels nombres sont pairs ?') {
	const id = await makeTemplate(title, [{ statement }], 'draft');
	await login(page, ADMIN.email, ADMIN.password);
	await page.goto(`/dashboard/admin/questions/${id}/edit`);
	await page.waitForLoadState('networkidle');
	return { id, statement: page.getByPlaceholder(STATEMENT_PLACEHOLDER) };
}

/** La réponse de la première case du brouillon, relue en base (« 1 », « 0;2 »). */
async function storedAnswers(id: string): Promise<string[]> {
	const rows = await sql<{ answers: string[] }>(
		`select coalesce(
		   (select array_agg(b->>'expectedAnswer' order by o) from jsonb_array_elements(variations->0->'blanks') with ordinality as t(b, o)),
		   '{}') as answers
		   from question_templates where id = $1`,
		[id]
	);
	return rows[0].answers;
}

test('#1816 #1822 — « Ajouter une case choix » puis « Vrai / Faux » : blocs en fin d’énoncé, cartes « Case N : choix » ; choix tapés avec leurs espaces, ajoutés, supprimés (la bonne réponse suit son choix)', async ({
	page
}) => {
	// L'éditeur de modèles est un outil du prof sur ordinateur (au téléphone, la barre
	// collante couvre ses boutons)
	test.skip(test.info().project.use.isMobile === true, 'éditeur du prof : ordinateur');
	test.setTimeout(180_000);
	const { statement } = await openEditor(page, '1816 éditeur');

	await page.getByRole('button', { name: 'Ajouter une case choix' }).click();
	await expect(page.getByText('Case 1 : choix')).toBeVisible();
	// Le bloc est ajouté en fin d'énoncé
	expect(await statement.inputValue()).toBe('Quels nombres sont pairs ?\n\n```choix\n-\n-\n```');

	await page.getByRole('textbox', { name: 'Choix A', exact: true }).fill('Deux et quatre');
	await page.getByRole('textbox', { name: 'Choix B', exact: true }).fill('Trois et cinq');
	expect(await statement.inputValue()).toBe(
		'Quels nombres sont pairs ?\n\n```choix\n- Deux et quatre\n- Trois et cinq\n```'
	);

	// Un choix de plus, tapé au clavier (espaces compris)
	await page.getByRole('button', { name: 'Ajouter un choix' }).click();
	const choiceC = page.getByRole('textbox', { name: 'Choix C', exact: true });
	await choiceC.click();
	await page.keyboard.type('Un autre choix', { delay: 30 });
	await expect(choiceC).toHaveValue('Un autre choix');
	expect(await statement.inputValue()).toContain('- Un autre choix\n```');

	// La bonne réponse suit son choix : B bonne, puis A supprimé → l'ancien B devient A et reste coché
	await page.getByRole('radio', { name: 'Choix B : bonne réponse' }).click();
	await page.getByRole('button', { name: 'Supprimer le choix A' }).click();
	await expect(page.getByRole('textbox', { name: 'Choix A', exact: true })).toHaveValue(
		'Trois et cinq'
	);
	await expect(page.getByRole('radio', { name: 'Choix A : bonne réponse' })).toBeChecked();
	await expect(page.getByRole('radio', { name: 'Choix B : bonne réponse' })).not.toBeChecked();
	expect(await statement.inputValue()).not.toContain('Deux et quatre');
	await shoot(page, '1816-case-choix-editeur');

	// « Vrai / Faux » : un second bloc, jamais mélangé, deuxième case
	await page.getByRole('button', { name: 'Vrai / Faux' }).click();
	await expect(page.getByText('Case 2 : choix')).toBeVisible();
	expect(await statement.inputValue()).toContain('```choix\nmelanger: non\n- Vrai\n- Faux\n```');
});

test('#1816 #1822 — « Plusieurs bonnes réponses » : cases à cocher ; aperçu : l’élève coche, verdict juste / ½ / faux ; la réponse enregistrée est « 0;2 »', async ({
	page
}) => {
	// L'éditeur de modèles est un outil du prof sur ordinateur (au téléphone, la barre
	// collante couvre ses boutons)
	test.skip(test.info().project.use.isMobile === true, 'éditeur du prof : ordinateur');
	test.setTimeout(240_000);
	const { id, statement } = await openEditor(page, '1816 plusieurs');
	await page.getByRole('button', { name: 'Ajouter une case choix' }).click();
	await expect(page.getByText('Case 1 : choix')).toBeVisible();
	for (const [letter, text] of [
		['A', 'Deux'],
		['B', 'Trois'],
		['C', 'Quatre']
	]) {
		if (letter === 'C') await page.getByRole('button', { name: 'Ajouter un choix' }).click();
		await page.getByRole('textbox', { name: `Choix ${letter}`, exact: true }).fill(text);
	}
	await page.getByRole('radio', { name: 'Choix A : bonne réponse' }).click();
	await page.getByRole('checkbox', { name: 'Plusieurs bonnes réponses' }).click();
	// Cases à cocher : plus de ronds
	await expect(page.getByRole('radio', { name: /bonne réponse/ })).toHaveCount(0);
	await page.getByRole('checkbox', { name: 'Choix C : bonne réponse' }).click();
	await expect(page.getByRole('checkbox', { name: 'Choix A : bonne réponse' })).toBeChecked();
	await expect(page.getByRole('checkbox', { name: 'Choix B : bonne réponse' })).not.toBeChecked();
	await expect(page.getByRole('checkbox', { name: 'Choix C : bonne réponse' })).toBeChecked();
	expect(await statement.inputValue()).toContain('- Deux\n- Trois\n- Quatre');

	// Aperçu interactif : l'élève coche
	await page.getByText('Interactive', { exact: true }).click();
	const choice = (text: string): Locator =>
		page.locator('[role="checkbox"], [role="radio"]').filter({ hasText: text }).last();
	// Le verdict seul (« Juste », « Faux », « ½ point »), pas le texte de la page entière : le bouton
	// « Vrai / Faux » de l'éditeur contient déjà « Faux »
	const verdictLocator = page.getByText(/^(Juste|Faux|½ point)$/);
	const validate = async (): Promise<string> => {
		await page.getByRole('button', { name: 'Valider', exact: true }).click();
		await expect(verdictLocator.first()).toBeVisible();
		return (await verdictLocator.first().innerText()).trim();
	};
	const retry = async (): Promise<void> => {
		await page.getByRole('button', { name: 'Régénérer' }).click();
		await expect(page.getByRole('button', { name: 'Valider', exact: true })).toBeVisible();
		await expect(verdictLocator).toHaveCount(0);
	};

	await choice('Deux').click();
	await choice('Quatre').click();
	expect(await validate()).toBe('Juste');
	await shoot(page, '1816-plusieurs-juste');

	await retry();
	await choice('Deux').click();
	expect(await validate()).toBe('½ point');

	await retry();
	await choice('Deux').click();
	await choice('Trois').click();
	await choice('Quatre').click();
	expect(await validate()).toBe('Faux');

	// Enregistré : « 0;2 » (les choix A et C)
	await page.getByRole('button', { name: 'Enregistrer brouillon' }).click();
	await expect.poll(async () => storedAnswers(id)).toEqual(['0;2']);
});

test('#1816 #1822 — variation sans énoncé propre : carte « Case 1 : choix » en lecture seule (aucun champ de texte, on coche seulement), pas d’ajout de case choix', async ({
	page
}) => {
	// L'éditeur de modèles est un outil du prof sur ordinateur (au téléphone, la barre
	// collante couvre ses boutons)
	test.skip(test.info().project.use.isMobile === true, 'éditeur du prof : ordinateur');
	test.setTimeout(180_000);
	const id = await sql<{ id: string }>(
		`insert into question_templates (type, grades, level, variations, status, title, created_by, shared)
		 values ('fill_in_blanks', array['CE1'], 1, $1::jsonb, 'draft', $2, (select id from profiles where email = $3), $4::jsonb)
		 returning id::text`,
		[
			JSON.stringify([
				{ statement: '', blanks: [{ expectedAnswer: '1' }] },
				{ statement: '', blanks: [{ expectedAnswer: '0' }] }
			]),
			`${PREFIXE} 1816 partagé`,
			TEACHER.email,
			JSON.stringify({
				statement: 'Quelle est la parité ?\n\n```choix\nmelanger: non\n- pair\n- impair\n```'
			})
		]
	);
	createdTemplates.push(id[0].id);
	await login(page, ADMIN.email, ADMIN.password);
	await page.goto(`/dashboard/admin/questions/${id[0].id}/edit`);
	await page.waitForLoadState('networkidle');

	await expect(page.getByText('Case 1 : choix')).toBeVisible();
	await expect(
		page.getByText("Énoncé partagé : les cases choix s'ajoutent dans l'énoncé partagé.")
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Ajouter une case choix' })).toHaveCount(0);
	// Lecture seule : les choix s'affichent mais aucun ne se tape ; la bonne réponse se coche
	await expect(page.getByRole('textbox', { name: /^Choix/ })).toHaveCount(0);
	const goodB = page.getByRole('radio', { name: 'Choix B : bonne réponse' });
	await expect(goodB).toBeEnabled();
	await expect(goodB).toBeChecked(); // variation 1 : « 1 » = impair
	await page.getByRole('radio', { name: 'Choix A : bonne réponse' }).click();
	await expect(page.getByRole('radio', { name: 'Choix A : bonne réponse' })).toBeChecked();
	await shoot(page, '1816-variation-sans-enonce');
});

test('#1816 #1822 — éditeur de tests : la case choix s’affiche (A. pair, B. impair) et se coche, le test s’ajoute à la liste', async ({
	page
}) => {
	// L'éditeur de modèles est un outil du prof sur ordinateur (au téléphone, la barre
	// collante couvre ses boutons)
	test.skip(test.info().project.use.isMobile === true, 'éditeur du prof : ordinateur');
	test.setTimeout(180_000);
	const id = await makeTemplate(
		'1816 tests',
		[
			{
				statement: 'Quelle est la parité de 8 ?\n\n```choix\nmelanger: non\n- pair\n- impair\n```',
				blanks: [{ expectedAnswer: '0' }]
			}
		],
		'draft'
	);
	await login(page, ADMIN.email, ADMIN.password);
	await page.goto(`/dashboard/admin/questions/${id}/edit`);
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: /Tests/ }).first().click();
	await page.getByRole('button', { name: 'Ajouter un test' }).click();
	await expect(page.getByText('Nouveau test')).toBeVisible();
	await shoot(page, '1816-editeur-de-tests');
	// La case choix du test : deux cases à cocher, « A. pair » et « B. impair », aucune cochée au départ
	const form = page
		.locator('div')
		.filter({ has: page.getByText('Reponses (LaTeX)') })
		.filter({ has: page.getByRole('checkbox', { name: /^A\. pair/ }) })
		.last();
	await expect(form.getByText('Case 1 : choix')).toBeVisible();
	const pair = form.getByRole('checkbox', { name: /^A\. pair/ });
	const impair = form.getByRole('checkbox', { name: /^B\. impair/ });
	await expect(pair).not.toBeChecked();
	await expect(impair).not.toBeChecked();
	await pair.click();
	await expect(pair).toBeChecked();
	await expect(impair).not.toBeChecked();
	// Le test ajouté (il lui faut une description)
	await page.getByPlaceholder('Ex: 3+7 = 10').fill('La parité de 8');
	await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
	await expect(page.getByText(/Aucun test defini/)).toHaveCount(0);
	await expect(page.getByText('La parité de 8')).toBeVisible();
});

// ============================================================================
// #1812, #1820, #1825 — Collection et monnaie à construire
// ============================================================================

const isPhone = (page: Page): boolean => (page.viewportSize()?.width ?? 1280) < 600;

/** Les objets posés sur un plan (`Ta collection`, `Ton argent`) : un `<g>` par objet. */
function placed(card: Locator, plan: string): Locator {
	return card
		.getByRole('img', { name: plan, exact: true })
		.locator('g.collection-objet, g.monnaie-objet');
}

/** Un modèle publié dont l'énoncé porte un bloc à construire (la case est créée d'office). */
async function makeBuildTemplate(title: string, fence: string[], intro: string): Promise<string> {
	const statement = [intro, '', ...fence].join('\n');
	return makeTemplate(title, [{ statement }]);
}

/** Touche (doigt sur téléphone / tablette, souris sinon) le centre d'un élément. */
async function touch(page: Page, target: Locator): Promise<void> {
	await target.scrollIntoViewIfNeeded();
	const box = await target.boundingBox();
	if (!box) throw new Error('objet introuvable');
	const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
	if (isPhone(page)) await page.touchscreen.tap(x, y);
	else await page.mouse.click(x, y);
}

test('#1812 — collection à construire (« Construis 34. ») : plan vide et réserve, objets posés et rangés, toucher un objet l’enlève, « Enlever », « Tout enlever », aucun nombre affiché ; 2 barres + 14 cubes → juste, 32 → « Ta collection vaut 32. » et une construction juste', async ({
	page
}) => {
	test.setTimeout(240_000);
	const id = await makeBuildTemplate(
		'1812 collection',
		['```collection', 'construire: 34', '```'],
		'Construis 34.'
	);
	let card = await openQuestion(page, id, 1);
	const plan = card.getByRole('img', { name: 'Ta collection', exact: true });
	await expect(plan).toBeVisible();
	// Plan vide, réserve : une barre de dix et un cube (pas de centaine pour 34)
	await expect(placed(card, 'Ta collection')).toHaveCount(0);
	const addTen = card.getByRole('button', { name: 'Ajouter une barre de dix' });
	const addUnit = card.getByRole('button', { name: 'Ajouter un cube' });
	await expect(addTen).toBeVisible();
	await expect(addUnit).toBeVisible();
	await expect(card.getByRole('button', { name: 'Tout enlever' })).toBeDisabled();
	await shoot(page, '1812-plan-vide');

	// Les objets posés sont rangés : tous dans le cadre du plan, sans se superposer
	await addTen.click();
	await addTen.click();
	for (let i = 0; i < 14; i++) await addUnit.click();
	await expect(placed(card, 'Ta collection')).toHaveCount(16);
	const planBox = await plan.boundingBox();
	const boxes = await placed(card, 'Ta collection').evaluateAll((els) =>
		els.map((e) => {
			const r = e.getBoundingClientRect();
			return { x: r.x, y: r.y, w: r.width, h: r.height };
		})
	);
	for (const box of boxes) {
		expect(box.x).toBeGreaterThanOrEqual((planBox?.x ?? 0) - 1);
		expect(box.x + box.w).toBeLessThanOrEqual((planBox?.x ?? 0) + (planBox?.width ?? 0) + 1);
	}
	await shoot(page, '1812-construction');
	// Aucun nombre affiché pendant la construction (ni la valeur posée, ni dans le nom du plan)
	expect(await cardText(card)).not.toMatch(/vaut|Ta collection est/);
	expect(await plan.getAttribute('aria-label')).toBe('Ta collection');

	// Toucher un objet posé l'enlève (doigt sur téléphone / tablette, souris sinon) : un cube
	await touch(page, placed(card, 'Ta collection').locator('.collection-forme').last());
	await expect(placed(card, 'Ta collection')).toHaveCount(15);
	// « Enlever un cube » (clavier) puis « Tout enlever »
	await card.getByRole('button', { name: 'Enlever un cube' }).click();
	await expect(placed(card, 'Ta collection')).toHaveCount(14);
	await card.getByRole('button', { name: 'Tout enlever' }).click();
	await expect(placed(card, 'Ta collection')).toHaveCount(0);

	// 2 barres + 14 cubes = 34 → juste
	await addTen.click();
	await addTen.click();
	for (let i = 0; i < 14; i++) await addUnit.click();
	expect(await chooseValidate(page, card)).toBe('Juste');

	// 32 (3 barres + 2 cubes) → « Ta collection vaut 32. » et une construction juste (3 barres + 4 cubes)
	card = await openQuestion(page, id, 1);
	for (let i = 0; i < 3; i++)
		await card.getByRole('button', { name: 'Ajouter une barre de dix' }).click();
	for (let i = 0; i < 2; i++) await card.getByRole('button', { name: 'Ajouter un cube' }).click();
	expect(await chooseValidate(page, card)).toBe('Faux');
	await expect(card.getByText('Ta collection vaut 32.').first()).toBeVisible();
	const solution = card.getByRole('img', { name: 'Une collection juste', exact: true }).first();
	await expect(solution.locator('g.collection-objet')).toHaveCount(7);
	await shoot(page, '1812-faux-32');
});

test('#1812 — collection à construire, `dessin: paquets` : paquets et jetons à la place des barres et des cubes ; au téléphone le plan tient dans la largeur', async ({
	page
}) => {
	test.setTimeout(180_000);
	const id = await makeBuildTemplate(
		'1812 paquets',
		['```collection', 'construire: 34', 'dessin: paquets', '```'],
		'Construis 34.'
	);
	const card = await openQuestion(page, id, 1);
	await expect(card.getByRole('button', { name: 'Ajouter un paquet de dix' })).toBeVisible();
	await expect(card.getByRole('button', { name: 'Ajouter un jeton' })).toBeVisible();
	await expect(card.getByRole('button', { name: 'Ajouter une barre de dix' })).toHaveCount(0);
	await card.getByRole('button', { name: 'Ajouter un paquet de dix' }).click();
	await card.getByRole('button', { name: 'Ajouter un jeton' }).click();
	// Un paquet et un jeton posés ; aucun cube ni barre nulle part (plan ou réserve)
	await expect(placed(card, 'Ta collection')).toHaveCount(2);
	await expect(card.locator('g.collection-jeton').first()).toBeVisible();
	await expect(card.locator('g.collection-cube, g.collection-barre')).toHaveCount(0);
	await shoot(page, '1812-paquets');
	// Le plan et la réserve tiennent dans la largeur de l'écran (téléphone compris)
	const width = page.viewportSize()?.width ?? 1280;
	const plan = await card.getByRole('img', { name: 'Ta collection', exact: true }).boundingBox();
	expect(plan?.x ?? -1).toBeGreaterThanOrEqual(0);
	expect((plan?.x ?? 0) + (plan?.width ?? 0)).toBeLessThanOrEqual(width);
	const reserve = await card.locator('.construire-reserve').boundingBox();
	expect((reserve?.x ?? 0) + (reserve?.width ?? 0)).toBeLessThanOrEqual(width + 1);
});

test('#1820 — monnaie à construire (« Paie le ballon à 35 €. ») : réserve 50, 20, 10, 5 € et pièces de 2 et 1 €, billets en haut et pièces dessous, toucher une coupure posée l’enlève, aucune somme affichée ; 3 × 10 + 2 + 2 + 1 € → juste (trois billets de 10 €), 32 € → « Tu as posé 32 €. » + 20 + 10 + 5 €', async ({
	page
}) => {
	test.setTimeout(240_000);
	const id = await makeBuildTemplate(
		'1820 monnaie',
		['```monnaie', 'construire: 35', '```'],
		'Paie le ballon à 35 €.'
	);
	let card = await openQuestion(page, id, 1);
	const plan = card.getByRole('img', { name: 'Ton argent', exact: true });
	await expect(plan).toBeVisible();
	await expect(placed(card, 'Ton argent')).toHaveCount(0);
	const add = (name: string): Locator => card.getByRole('button', { name: `Ajouter ${name}` });
	const reserve = [
		'un billet de 50 €',
		'un billet de 20 €',
		'un billet de 10 €',
		'un billet de 5 €',
		'une pièce de 2 €',
		'une pièce de 1 €'
	];
	for (const name of reserve) await expect(add(name)).toBeVisible();
	await expect(card.getByRole('button', { name: /^Ajouter / })).toHaveCount(reserve.length);
	await shoot(page, '1820-plan-vide');

	// Dans l'ordre de la ligne : 10, 10, 10, 2, 2, 1
	for (const name of reserve.slice(2, 3)) for (let i = 0; i < 3; i++) await add(name).click();
	for (let i = 0; i < 2; i++) await add('une pièce de 2 €').click();
	await add('une pièce de 1 €').click();
	await expect(placed(card, 'Ton argent')).toHaveCount(6);
	// Les trois billets de 10 € restent trois billets ; billets en haut, pièces dessous
	await expect(
		card.getByRole('img', { name: 'Ton argent', exact: true }).locator('g.monnaie-billet')
	).toHaveCount(3);
	const tops = await plan.evaluate((svg) => {
		const y = (selector: string): number[] =>
			[...svg.querySelectorAll(selector)].map((e) => e.getBoundingClientRect().top);
		return { notes: y('g.monnaie-billet'), coins: y('g.monnaie-objet:not(.monnaie-billet)') };
	});
	expect(Math.max(...tops.notes)).toBeLessThan(Math.min(...tops.coins));
	await shoot(page, '1820-construction');
	expect(await cardText(card)).not.toMatch(/Tu as posé|Tu n’as rien posé/);

	// Toucher une coupure posée l'enlève (doigt / souris), « Enlever », « Tout enlever »
	await touch(page, plan.locator('g.monnaie-objet:not(.monnaie-billet)').last());
	await expect(placed(card, 'Ton argent')).toHaveCount(5);
	await card.getByRole('button', { name: 'Enlever une pièce de 2 €' }).click();
	await expect(placed(card, 'Ton argent')).toHaveCount(4);
	await card.getByRole('button', { name: 'Tout enlever' }).click();
	await expect(placed(card, 'Ton argent')).toHaveCount(0);

	// 10 + 10 + 10 + 2 + 2 + 1 = 35 → juste, et les trois billets de 10 € restent trois billets
	for (let i = 0; i < 3; i++) await add('un billet de 10 €').click();
	for (let i = 0; i < 2; i++) await add('une pièce de 2 €').click();
	await add('une pièce de 1 €').click();
	expect(await chooseValidate(page, card)).toBe('Juste');
	await expect(
		card.getByRole('img', { name: 'Ton argent', exact: true }).first().locator('g.monnaie-billet')
	).toHaveCount(3);

	// 32 € = 20 + 10 + 2 → « Tu as posé 32 €. » et la correction 20 + 10 + 5 €
	card = await openQuestion(page, id, 1);
	await card.getByRole('button', { name: 'Ajouter un billet de 20 €' }).click();
	await card.getByRole('button', { name: 'Ajouter un billet de 10 €' }).click();
	await card.getByRole('button', { name: 'Ajouter une pièce de 2 €' }).click();
	expect(await chooseValidate(page, card)).toBe('Faux');
	await expect(card.getByText('Tu as posé 32 €.').first()).toBeVisible();
	const solution = card.getByRole('img', { name: 'Une somme juste', exact: true }).first();
	await expect(solution.locator('g.monnaie-objet')).toHaveCount(3);
	expect(
		(await solution.locator('g.monnaie-valeur, text.monnaie-valeur').allTextContents()).join(' ')
	).toContain('20 €');
	await shoot(page, '1820-faux-32');
});

test('#1820 — monnaie à construire : `réserve: 2 5` + `construire: 6` → la correction est 3 pièces de 2 €, jamais un billet', async ({
	page
}) => {
	test.setTimeout(180_000);
	const id = await makeBuildTemplate(
		'1820 réserve',
		['```monnaie', 'construire: 6', 'réserve: 2 5', '```'],
		'Paie 6 €.'
	);
	const card = await openQuestion(page, id, 1);
	await expect(card.getByRole('button', { name: /^Ajouter / })).toHaveCount(2);
	await card.getByRole('button', { name: 'Ajouter un billet de 5 €' }).click();
	expect(await chooseValidate(page, card)).toBe('Faux');
	const solution = card.getByRole('img', { name: 'Une somme juste', exact: true }).first();
	await expect(solution.locator('g.monnaie-objet')).toHaveCount(3);
	await expect(solution.locator('g.monnaie-billet')).toHaveCount(0);
	await shoot(page, '1820-reserve-2-5');
});

// ÉCART constaté le 2026-11-24 (rien corrigé) : la ligne #1820 attend « 50 + 20 + 20 € → Ajouter un
// billet de 20 € grisé ». Le code ne grise un bouton qu'aux plafonds du plan (1 000 € ou 30 objets :
// `canAdd`, `BUILD_LIMITS`), pas selon la somme à construire ; la ligne est probablement mal recopiée
// (voir le test du plafond ci-dessous, qui passe). `test.fail` : échoue tant que l'écart dure.
test('#1820 — ÉCART : 50 + 20 + 20 € pour 35 € → « Ajouter un billet de 20 € » grisé (la ligne le dit, le code ne grise qu’au plafond)', async ({
	page
}) => {
	test.setTimeout(120_000);
	const id = await makeBuildTemplate(
		'1820 grisé',
		['```monnaie', 'construire: 35', '```'],
		'Paie le ballon à 35 €.'
	);
	const card = await openQuestion(page, id, 1);
	const twenty = card.getByRole('button', { name: 'Ajouter un billet de 20 €' });
	await card.getByRole('button', { name: 'Ajouter un billet de 50 €' }).click();
	await twenty.click();
	await twenty.click();
	await expect(placed(card, 'Ton argent')).toHaveCount(3);
	test.fail(true, 'écart #1820 : 50 + 20 + 20 € ne grise pas « Ajouter un billet de 20 € »');
	await expect(twenty).toBeDisabled();
});

test('#1820 — plafond du plan : à 1 000 € (20 billets de 50 €) « Ajouter un billet de 50 € » se grise, « Enlever » le rend', async ({
	page
}) => {
	test.setTimeout(180_000);
	const id = await makeBuildTemplate(
		'1820 plafond',
		['```monnaie', 'construire: 35', '```'],
		'Paie le ballon à 35 €.'
	);
	const card = await openQuestion(page, id, 1);
	const fifty = card.getByRole('button', { name: 'Ajouter un billet de 50 €' });
	for (let i = 0; i < 19; i++) await fifty.click();
	await expect(fifty).toBeEnabled();
	await fifty.click();
	await expect(placed(card, 'Ton argent')).toHaveCount(20);
	await expect(fifty).toBeDisabled();
	await card.getByRole('button', { name: 'Enlever un billet de 50 €' }).click();
	await expect(fifty).toBeEnabled();
});

// ============================================================================
// #1825 — Copie corrigée d'une case à construire
// ============================================================================

/** Ajoute `n` fois la coupure ou la pièce dont le bouton porte ce nom. */
async function addTimes(card: Locator, name: string, n: number): Promise<void> {
	for (let i = 0; i < n; i++) await card.getByRole('button', { name }).click();
}

/** Ouvre la série en flash-cards (mode `flash`), carte du dessus. */
async function openFlash(page: Page, templateId: string, seed: number): Promise<Locator> {
	await page.goto(
		buildSeriesLink('', [{ templateId, quantity: 1, delay: 0 }], { mode: 'flash', seed })
	);
	await page.waitForLoadState('networkidle');
	const card = page.getByTestId('flash-card');
	await expect(card).toBeVisible();
	return card;
}

test('#1825 — collection à construire en entraînement : 32 → copie corrigée = consigne, plan VERROUILLÉ sans réserve avec la construction posée, « Ta collection vaut 32. », une construction juste ; 34 → cadre vert, pas de correction', async ({
	page
}) => {
	test.setTimeout(240_000);
	const id = await makeBuildTemplate(
		'1825 collection',
		['```collection', 'construire: 34', '```'],
		'Construis 34.'
	);
	const card = await openQuestion(page, id, 1);
	await addTimes(card, 'Ajouter une barre de dix', 3);
	await addTimes(card, 'Ajouter un cube', 2);
	expect(await chooseValidate(page, card)).toBe('Faux');

	// La consigne seule, le plan verrouillé (sans réserve visible) avec la construction posée
	await expect(card.locator('.flip-card-back').getByText('Construis 34.')).toBeVisible();
	const locked = card.locator('.flip-card-back .construire-plan-verrouille');
	await expect(locked.first()).toBeVisible();
	await expect(locked.first().locator('g.collection-objet')).toHaveCount(5);
	await expect(card.locator('.flip-card-back .construire-reserve')).toHaveCount(0);
	await expect(
		card.locator('.flip-card-back').getByRole('button', { name: /^Ajouter / })
	).toHaveCount(0);
	await expect(card.getByText('Ta collection vaut 32.').first()).toBeVisible();
	await expect(
		card.getByRole('img', { name: 'Une collection juste', exact: true }).first()
	).toBeVisible();
	await shoot(page, '1825-collection-faux');

	// Thème sombre (comme les autres vérifications : `emulateMedia`) : le fond du plan change, la copie reste lisible
	const frame = locked.first().locator('.construire-cadre');
	const fill = (): Promise<string> => frame.evaluate((el) => getComputedStyle(el).fill);
	const lightFill = await fill();
	await page.emulateMedia({ colorScheme: 'dark' });
	await expect.poll(fill).not.toBe(lightFill);
	await expect(locked.first().locator('g.collection-objet')).toHaveCount(5);
	await shoot(page, '1825-collection-faux-sombre');
	await page.emulateMedia({ colorScheme: 'light' });
	await expect.poll(fill).toBe(lightFill);

	// Réponse juste : cadre vert, aucune correction
	const right = await openQuestion(page, id, 1);
	await addTimes(right, 'Ajouter une barre de dix', 3);
	await addTimes(right, 'Ajouter un cube', 4);
	expect(await chooseValidate(page, right)).toBe('Juste');
	await expect(right.locator('.flip-card-back .construire-cadre-juste').first()).toBeVisible();
	await expect(right.getByText('Correction', { exact: true })).toHaveCount(0);
	await expect(right.getByRole('img', { name: 'Une collection juste', exact: true })).toHaveCount(
		0
	);
});

test('#1825 — monnaie à construire en entraînement : 32 € → plan verrouillé avec la construction posée, « Tu as posé 32 €. », une somme juste ; 35 € → cadre vert, pas de correction', async ({
	page
}) => {
	test.setTimeout(240_000);
	const id = await makeBuildTemplate(
		'1825 monnaie',
		['```monnaie', 'construire: 35', '```'],
		'Paie le ballon à 35 €.'
	);
	const card = await openQuestion(page, id, 1);
	await addTimes(card, 'Ajouter un billet de 20 €', 1);
	await addTimes(card, 'Ajouter un billet de 10 €', 1);
	await addTimes(card, 'Ajouter une pièce de 2 €', 1);
	expect(await chooseValidate(page, card)).toBe('Faux');
	const locked = card.locator('.flip-card-back .construire-plan-verrouille');
	await expect(locked.first().locator('g.monnaie-objet')).toHaveCount(3);
	await expect(card.locator('.flip-card-back .construire-reserve')).toHaveCount(0);
	await expect(card.getByText('Tu as posé 32 €.').first()).toBeVisible();
	await expect(
		card.getByRole('img', { name: 'Une somme juste', exact: true }).first()
	).toBeVisible();
	await shoot(page, '1825-monnaie-faux');

	const right = await openQuestion(page, id, 1);
	await addTimes(right, 'Ajouter un billet de 20 €', 1);
	await addTimes(right, 'Ajouter un billet de 10 €', 1);
	await addTimes(right, 'Ajouter un billet de 5 €', 1);
	expect(await chooseValidate(page, right)).toBe('Juste');
	await expect(right.locator('.flip-card-back .construire-cadre-juste').first()).toBeVisible();
	await expect(right.getByText('Correction', { exact: true })).toHaveCount(0);
});

test('#1825 — flash-card à construire retournée : la construction juste seule (ni plan à remplir, ni réserve)', async ({
	page
}) => {
	test.setTimeout(180_000);
	const id = await makeBuildTemplate(
		'1825 flash',
		['```collection', 'construire: 34', '```'],
		'Construis 34.'
	);
	const card = await openFlash(page, id, 1);
	await expect(card.getByText('Construis 34.').first()).toBeVisible();
	await card.getByRole('button', { name: 'Voir la correction' }).click();
	// Le dos : la consigne et la construction juste seule (3 barres + 4 cubes), ni plan à remplir ni réserve
	const back = card.locator('.flip-card-back');
	await expect(back.getByText('Construis 34.')).toBeVisible();
	await expect(
		back
			.getByRole('img', { name: "Collection d'objets", exact: true })
			.locator('g.collection-objet')
	).toHaveCount(7);
	await expect(back.getByRole('img', { name: 'Ta collection', exact: true })).toHaveCount(0);
	await expect(back.getByRole('button', { name: /^Ajouter / })).toHaveCount(0);
	await shoot(page, '1825-flash-retournee');
});

/** Valide une case construite (« Valider ») et rend le verdict affiché. */
async function chooseValidate(page: Page, card: Locator): Promise<string> {
	await page.getByRole('button', { name: 'Valider' }).click();
	const verdict = card.getByText(/^(Juste|Faux|½ point)$/).first();
	await expect(verdict).toBeVisible();
	return (await verdict.innerText()).trim();
}

// ============================================================================
// #1843 — Modèles CE1 corrigés
// ============================================================================

const MOITIE_CE1 = 'c96ecf4d-caa9-4e5a-946f-c7ee0ecc352e';
const DISTRIBUTIVITE_CE1 = '9d709f5b-e079-4316-a4c7-fe51ae73544c';
const DOUBLE_BROUILLON = '47f97c9f-5117-4817-8d10-7c17777397d8';
const DECOMPOSITIONS_CE1 = [
	'495a397f-23b6-4bc4-82c3-2974b234b275',
	'9827242b-fbcd-4b63-8003-2b898372be63',
	'3eedd905-1526-4c90-9005-eb1df389a9f9'
];
const SOMMES_DIFFERENCES_CE2 = [
	'579d0b00-b3a5-46e6-a076-04ec265c1c4f',
	'7d2d412b-843c-446f-8394-2a31856556d5',
	'810f1824-18ac-48e5-bf15-1c0b3854f78b',
	'de71495c-b88c-4b42-9cd7-3562847aedfc'
];

/** Valide sans répondre : la correction s'affiche ; rend ses formules sans espaces. */
async function correctionFormulas(card: Locator): Promise<string> {
	await card.getByRole('button', { name: 'Valider' }).click();
	await expect(card.getByText('Correction', { exact: true }).first()).toBeVisible();
	const all = await card.locator('math-span, math-div').allTextContents();
	// Sans espaces, ni alignement (&), ni gras / couleur du facteur : « 13\times7=10\times7+3\times7 »
	return all
		.join(' | ')
		.replace(/\s+/g, '')
		.replace(/\\bold\{\\textcolor\{[^}]*\}\{(\d+)\}\}/g, '$1')
		.replace(/&/g, '');
}

test('#1843 — « Trouver la moitié » (CE1) : un nombre à 3 chiffres (≤ 698) se tire ; corrigé « n = centaines + reste », moitiés, somme', async ({
	page
}) => {
	test.setTimeout(300_000);
	let threeDigits = 0;
	for (let seed = 1; seed <= 6; seed++) {
		// Variation 3 du modèle : n = 100c + (10d + 2j)
		const card = await openQuestion(page, MOITIE_CE1, seed, 2);
		const n = Number(/moitié de (\d+)/.exec(await frontText(card))?.[1]);
		expect(n, `graine ${seed} : le nombre`).toBeGreaterThanOrEqual(100);
		expect(n).toBeLessThanOrEqual(698);
		expect(n % 2, 'un nombre pair').toBe(0);
		threeDigits++;
		const hundreds = Math.floor(n / 100) * 100;
		const rest = n - hundreds;
		const text = await correctionFormulas(card);
		expect(text, `graine ${seed} : décomposition`).toContain(`${n}=${hundreds}+${rest}`);
		expect(text, `graine ${seed} : moitiés`).toContain(`${hundreds / 2}`);
		expect(text).toContain(`${rest / 2}`);
		expect(text, `graine ${seed} : somme`).toContain(`${hundreds / 2}+${rest / 2}=${n / 2}`);
		if (seed === 1) await shoot(page, '1843-moitie');
	}
	expect(threeDigits).toBe(6);
});

test('#1843 — « Utiliser la distributivité » (CE1) : premier facteur de 11 à 19, corrigé « n × a = 10 × a + u × a »', async ({
	page
}) => {
	test.setTimeout(240_000);
	const firsts = new Set<number>();
	for (let seed = 1; seed <= 5; seed++) {
		const card = await openQuestion(page, DISTRIBUTIVITE_CE1, seed);
		const shown = (await fieldText(card)).replace(/\s+/g, '');
		const factors = /^(\d+)\\times(\d+)=/.exec(shown) ?? /^(\d+)\*(\d+)=/.exec(shown);
		expect(factors, `graine ${seed} : « n × a » dans la case : ${shown}`).not.toBeNull();
		const [n, a] = [Number(factors?.[1]), Number(factors?.[2])];
		expect(n, `graine ${seed} : premier facteur`).toBeGreaterThanOrEqual(11);
		expect(n).toBeLessThanOrEqual(19);
		firsts.add(n);
		const unit = n - 10;
		const text = await correctionFormulas(card);
		expect(text, `graine ${seed} : ${n} × ${a}`).toContain(
			`${n}\\times${a}=10\\times${a}+${unit}\\times${a}`
		);
		expect(text).toContain(`${10 * a}+${unit * a}`);
		expect(text).toContain(`${n * a}`);
		if (seed === 1) await shoot(page, '1843-distributivite');
	}
	expect(firsts.size, 'plusieurs premiers facteurs différents se tirent').toBeGreaterThan(1);
});

/** Le contenu de la première case MathLive (LaTeX). */
async function fieldText(card: Locator): Promise<string> {
	return card
		.locator('math-field')
		.first()
		.evaluate((element) => (element as HTMLElement & { value: string }).value);
}

test('#1843 — « Parité d’un nombre entier » (CE1) : des nombres de 0 à 999 se tirent (40 graines, par l’API d’aperçu), les deux parités, le corrigé juste', async ({
	page
}) => {
	test.setTimeout(240_000);
	await login(page, ADMIN.email, ADMIN.password);
	const numbers: number[] = [];
	for (let seed = 1; seed <= 40; seed++) {
		const response = await page.request.post(`/api/questions/generate/${PARITE_ENTIER}`, {
			data: { seed }
		});
		expect(response.status()).toBe(200);
		const body = (await response.json()) as {
			instance: {
				statement: string;
				correction?: { steps?: string[] };
				blanks?: { expectedAnswer: string }[];
			};
		};
		const number = Number(/\$\$(\d+)\$\$/.exec(body.instance.statement)?.[1]);
		expect(number, `graine ${seed} : ${body.instance.statement}`).toBeGreaterThanOrEqual(0);
		expect(number).toBeLessThanOrEqual(999);
		numbers.push(number);
		// Le corrigé est l'indice du bon choix dans ['pair', 'impair'] : « 0 » pour un nombre pair, « 1 » pour un impair
		expect(body.instance.blanks?.[0]?.expectedAnswer, `graine ${seed} : corrigé de ${number}`).toBe(
			number % 2 === 0 ? '0' : '1'
		);
	}
	expect(Math.max(...numbers), 'au moins un nombre à 3 chiffres').toBeGreaterThanOrEqual(100);
	expect(new Set(numbers.map((n) => n % 2)).size, 'pair et impair').toBe(2);
});

test('#1843 — rangement et catalogue : 3 décompositions sous « Entiers : numération › écritures » (CE1), « Trouver le double » 47f97c9f hors catalogue élève (brouillon), 4 sommes / différences au CE2 et plus au CE1', async () => {
	const decompositions = await sql<{
		id: string;
		grades: string[];
		status: string;
		notion: string;
		sous: string;
	}>(
		`select t.id::text, t.grades, t.status, p.name as notion, n.name as sous
		   from question_templates t
		   join classification_nodes n on n.id = t.classification_node_id
		   join classification_nodes p on p.id = n.parent_id
		  where t.id = any($1::uuid[])`,
		[DECOMPOSITIONS_CE1]
	);
	expect(decompositions).toHaveLength(3);
	for (const row of decompositions) {
		expect(row, row.id).toMatchObject({
			grades: ['CE1'],
			status: 'published',
			notion: 'Entiers : numération',
			sous: 'écritures'
		});
	}

	const double = await sql<{ status: string }>(
		`select status from question_templates where id = $1`,
		[DOUBLE_BROUILLON]
	);
	// Un brouillon n'est jamais dans le catalogue élève (seuls les modèles publiés y sont)
	expect(double).toEqual([{ status: 'draft' }]);

	const sums = await sql<{ id: string; grades: string[]; status: string }>(
		`select id::text, grades, status from question_templates where id = any($1::uuid[])`,
		[SOMMES_DIFFERENCES_CE2]
	);
	expect(sums).toHaveLength(4);
	for (const row of sums)
		expect(row, row.id).toMatchObject({ grades: ['CE2'], status: 'published' });
});

// ============================================================================
// #2120, #2130, #2145 — Évaluation notée avec un bloc à geste
// ============================================================================

/** Une évaluation publiée (contrôle blanc) de ces modèles, assignée à l'élève 16 ; rend l'assignation. */
async function assignEvaluation(templateIds: string[], title: string): Promise<string> {
	const [teacher] = await sql<{ id: string }>(`select id::text from profiles where email = $1`, [
		TEACHER.email
	]);
	const [student] = await sql<{ id: string }>(`select id::text from profiles where email = $1`, [
		STUDENT.email
	]);
	const [series] = await sql<{ id: string }>(
		`insert into series (title, items, created_by, grade) values ($1, $2::jsonb, $3, 'CE1') returning id::text`,
		[
			`${PREFIXE} ${title}`,
			JSON.stringify(templateIds.map((templateId) => ({ templateId, quantity: 1, delay: 120 }))),
			teacher.id
		]
	);
	createdSeries.push(series.id);
	const [evaluation] = await sql<{ id: string }>(
		`insert into evaluations (series_id, form, status, created_by, shuffle_questions)
		 values ($1, 'interactive', 'published', $2, false) returning id::text`,
		[series.id, teacher.id]
	);
	createdEvaluations.push(evaluation.id);
	const [assignment] = await sql<{ id: string }>(
		`insert into evaluation_assignments (evaluation_id, student_id, assigned_by)
		 values ($1, $2, $3) returning id::text`,
		[evaluation.id, student.id, teacher.id]
	);
	return assignment.id;
}

test('#2120 #2130 #2145 — évaluation notée avec une droite à placer, un partage à colorier et une collection à construire : en élève, même écran qu’à l’entraînement (figure, geste, pas de « Remplissez les blancs »), le geste se fait, la note rendue est juste', async ({
	page
}) => {
	test.setTimeout(300_000);
	const droite = await makeTemplate('2120 droite', [
		{
			statement:
				'Place le point A sur 7.\n\n```line\nstart: 0\nend: 20\nstep: 1\nlabels: 0, 10, 20\nplacer: A=7\n```'
		}
	]);
	const partage = await makeTemplate('2130 partage', [
		{ statement: 'Colorie 3/8.\n\n```partage\nforme: bande 8\ncolorier: 3/8\n```' }
	]);
	const collection = await makeTemplate('2145 collection', [
		{ statement: 'Construis 34.\n\n```collection\nconstruire: 34\n```' }
	]);
	const assignment = await assignEvaluation([droite, partage, collection], '2120 évaluation');

	await login(page, STUDENT.email, STUDENT.password);
	await page.goto(`/automaths/test?assignment=${assignment}`);
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: /C.est parti/ }).click();
	await expect(page.getByText('Question 1 sur 3')).toBeVisible();

	// Question 1 : la droite à placer — la figure et le geste, jamais « Remplissez les blancs »
	await expect(page.getByText('Place le point A sur 7.')).toBeVisible();
	await expect(page.getByText('Remplissez les blancs')).toHaveCount(0);
	const slider = page.getByRole('slider');
	await expect(slider).toBeVisible();
	await shoot(page, '2120-evaluation-droite');

	// Le geste se fait : le premier cran pose le point en 0, six crans le mènent en 5 (faux : on attend 7)
	const forward = page.getByRole('button', { name: 'Avancer le point d’une graduation' });
	await expect(page.getByRole('button', { name: 'Valider' })).toBeDisabled();
	for (let i = 0; i < 6; i++) await forward.click();
	await expect(slider).toHaveAttribute('aria-valuenow', '5');
	await expect(slider).toHaveAttribute('aria-valuetext', 'point A sur 5');
	await expect(page.getByRole('button', { name: 'Valider' })).toBeEnabled();
	await shoot(page, '2120-evaluation-droite-placee');
	await page.getByRole('button', { name: 'Valider' }).click();

	// Question 2 : le partage à colorier — trois parts sur huit
	await expect(page.getByText('Question 2 sur 3')).toBeVisible();
	await expect(page.getByText('Colorie 3/8.')).toBeVisible();
	await expect(page.getByText('Remplissez les blancs')).toHaveCount(0);
	const parts = page.getByRole('button', { name: /^Part \d+ sur 8/ });
	await expect(parts).toHaveCount(8);
	await shoot(page, '2130-evaluation-partage');
	for (let i = 0; i < 3; i++) await parts.nth(i).click();
	await expect(page.locator('[aria-pressed="true"]')).toHaveCount(3);
	await page.getByRole('button', { name: 'Valider' }).click();

	// Question 3 : la collection à construire — 3 barres et 4 cubes
	await expect(page.getByText('Question 3 sur 3')).toBeVisible();
	await expect(page.getByText('Construis 34.')).toBeVisible();
	await expect(page.getByText('Remplissez les blancs')).toHaveCount(0);
	await shoot(page, '2145-evaluation-collection');
	await addTimes(page.locator('body'), 'Ajouter une barre de dix', 3);
	await addTimes(page.locator('body'), 'Ajouter un cube', 4);
	await expect(
		page.getByRole('img', { name: 'Ta collection', exact: true }).locator('g.collection-objet')
	).toHaveCount(7);
	await page.getByRole('button', { name: 'Valider' }).click();

	// La note rendue : 2 réponses justes sur 3 → 2 points sur 3, 13,5 / 20 (13,33 arrondi au demi-point)
	await page.waitForURL(/\/dashboard\/student\/assessments\/[0-9a-f-]+\/results$/);
	const copy = page.getByText('Contrôle terminé');
	await expect(copy).toBeVisible();
	const result = (await page.locator('main').last().innerText()).replace(/\s+/g, ' ');
	expect(result).toContain('13,5/20');
	expect(result).toContain('2/3 questions');
	expect(result).toContain('2 points sur 3');
	expect(result).toMatch(/Question 1 Faux Place le point A sur 7\./);
	expect(result).toContain('Tu as placé A sur 5.');
	expect(result).toMatch(/Question 2 Juste Colorie 3\/8\./);
	expect(result).toMatch(/Question 3 Juste Construis 34\./);
	await shoot(page, '2120-evaluation-note');
});
