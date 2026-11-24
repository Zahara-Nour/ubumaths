import { expect, test, type Locator, type Page } from '@playwright/test';
import { buildSeriesLink, type SeriesItem } from '../../src/lib/validation/series';
import { buddyMessages } from '../../src/lib/config/buddy-messages';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { acquireLock, LOCK_WAIT_MAX_MS, releaseLock, refreshLock } from './helpers/verrou';

/**
 * Séances de l'élève — paquet 6 du tri — base LOCALE
 * ===================================================
 *
 * Reprend les lignes #2565 (forme Saisie), #2554 (une trace par question, « Contrôle
 * blanc »), #2551 (deux boutons « Pas réussi / Réussi »), #2550 (le Palotin réagit en
 * séance), #2544 (maison et passages du Palotin, écusson) et #2559 (traces d'un contrôle)
 * de `docs/wip/verifications-manuelles.md`.
 *
 *   VERIFS_PORT=5179 pnpm test:verifs e2e/verifs/seances-paquet6.spec.ts --workers=2
 *
 * Élèves : eleve16 à eleve20 SEULEMENT (verrou `eleves-16-20`). Les tables que les séances
 * écrivent (Palotin, traces, révision espacée, gidouilles) sont photographiées avant et
 * remises après (`afterAll`) ; les modèles, séries et contrôles « Verifs6 … » sont supprimés.
 *
 * Attendus changés par une décision écrite : « Entraînement » s'appelle « Contrôle blanc »
 * (#2554, `TestInteractive`) ; « Panier » s'appelle « Ma série ».
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.describe.configure({ mode: 'serial' });

// Constantes

const PASSWORD = 'local-eleve';
const E16 = { email: 'eleve16@local.test', id: '5eed0000-0000-4000-8000-000000000016' }; // 1re spé, Giron
const E17 = { email: 'eleve17@local.test', id: '5eed0000-0000-4000-8000-000000000017' }; // 1re spé, Pile
const E18 = { email: 'eleve18@local.test', id: '5eed0000-0000-4000-8000-000000000018' }; // 1re spé, Giron
const E19 = { email: 'eleve19@local.test', id: '5eed0000-0000-4000-8000-000000000019' }; // 2de, Giron
const E20 = { email: 'eleve20@local.test', id: '5eed0000-0000-4000-8000-000000000020' }; // 6e, sans Palotin
const ALL_IDS = [E16, E17, E18, E19, E20].map((e) => e.id);
const PREFIXE = 'Verifs6 seances';
const SHOTS = '.captures/verifs/seances6';

/** Tables de l'élève photographiées puis remises (clé : `student_id`). */
const SNAPSHOT_TABLES = [
	'student_buddies',
	'student_last_visits',
	'student_mathoux',
	'student_mathou_decorations',
	'student_point_state',
	'student_observable_state'
] as const;
/** Tables où une séance ajoute des lignes : on retire celles créées depuis le début. */
const APPENDED_TABLES = ['skill_attempts', 'gidouilles_activity', 'reward_events'] as const;

// Décor

let startedAt = '';
let lockHeld = false;
const snapshot = new Map<string, unknown[]>();
let srsSnapshot: unknown[] | null = null;
let startGidouilles: { id: string; gidouilles: string }[] = [];
const createdTemplates: string[] = [];
const createdSeries: string[] = [];
const createdEvaluations: string[] = [];

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
	assertLocalServerEnv();
	await acquireLock('eleves-16-20');
	lockHeld = true;
	startedAt = (await sql<{ now: string }>('select now()::text as now'))[0].now;
	for (const table of SNAPSHOT_TABLES) {
		const rows = await sql<{ r: unknown }>(
			`select to_jsonb(t) as r from ${table} t where student_id = any($1)`,
			[ALL_IDS]
		);
		snapshot.set(
			table,
			rows.map((row) => row.r)
		);
	}
	const srs = await sql<{ r: unknown }>(
		`select to_jsonb(t) as r from srs_card_stats t where user_id = any($1)`,
		[ALL_IDS]
	);
	srsSnapshot = srs.map((row) => row.r);
	startGidouilles = await sql<{ id: string; gidouilles: string }>(
		'select id, gidouilles::text from profiles where id = any($1)',
		[ALL_IDS]
	);
});

// Le fichier dure plus que les 30 min au bout desquelles un verrou est repris
test.beforeEach(() => {
	if (lockHeld) refreshLock('eleves-16-20');
});

test.afterAll(async () => {
	try {
		await restoreDecor();
	} finally {
		if (lockHeld) releaseLock('eleves-16-20');
	}
});

async function restoreDecor(): Promise<void> {
	if (!startedAt) return;
	// Évaluations d'abord : copies, assignations, puis séries et modèles
	const evaluationIds = [...createdEvaluations];
	const prefixed = await sql<{ id: string }>(
		`select e.id::text from evaluations e join series s on s.id = e.series_id where s.title like $1`,
		[`${PREFIXE} %`]
	);
	evaluationIds.push(...prefixed.map((row) => row.id));
	if (evaluationIds.length > 0) {
		await sql(`delete from test_sessions where evaluation_id = any($1::uuid[])`, [evaluationIds]);
		await sql(`delete from evaluation_assignments where evaluation_id = any($1::uuid[])`, [
			evaluationIds
		]);
		await sql(`delete from evaluations where id = any($1::uuid[])`, [evaluationIds]);
	}
	await sql(`delete from series where title like $1`, [`${PREFIXE} %`]);
	// Paquets d'essai (leurs cartes suivent), séances de révision et signalements anti-triche écrits depuis le début
	await sql(`delete from srs_decks where name like $1`, [`${PREFIXE} %`]);
	await sql(`delete from srs_review_sessions where user_id = any($1) and started_at >= $2`, [
		ALL_IDS,
		startedAt
	]);
	await sql(`delete from srs_anti_fraud_flags where student_id = any($1) and created_at >= $2`, [
		ALL_IDS,
		startedAt
	]);
	for (const table of APPENDED_TABLES) {
		await sql(`delete from ${table} where student_id = any($1) and created_at >= $2`, [
			ALL_IDS,
			startedAt
		]);
	}
	for (const table of SNAPSHOT_TABLES) {
		const rows = snapshot.get(table);
		if (rows === undefined) continue;
		await sql(`delete from ${table} where student_id = any($1)`, [ALL_IDS]);
		if (rows.length > 0) {
			await sql(
				`insert into ${table} select * from jsonb_populate_recordset(null::${table}, $1::jsonb)`,
				[JSON.stringify(rows)]
			);
		}
	}
	if (srsSnapshot !== null) {
		await sql(`delete from srs_card_stats where user_id = any($1)`, [ALL_IDS]);
		if (srsSnapshot.length > 0) {
			await sql(
				`insert into srs_card_stats select * from jsonb_populate_recordset(null::srs_card_stats, $1::jsonb)`,
				[JSON.stringify(srsSnapshot)]
			);
		}
	}
	for (const row of startGidouilles) {
		await sql('update profiles set gidouilles = $2::numeric where id = $1', [
			row.id,
			row.gidouilles
		]);
	}
	await sql(
		`delete from question_template_points where template_id in (select id from question_templates where title like $1)`,
		[`${PREFIXE} %`]
	);
	// Modèles « Verifs6 … » en dernier (les lignes qui les citent sont parties)
	await sql(
		`delete from skill_attempts where template_id in (select id from question_templates where title like $1)`,
		[`${PREFIXE} %`]
	);
	await sql(
		`delete from srs_card_stats where card_reference_id in (select id from question_templates where title like $1)`,
		[`${PREFIXE} %`]
	);
	await sql(`delete from question_templates where title like $1`, [`${PREFIXE} %`]);
	if (createdTemplates.length > 0) {
		await sql(`delete from question_templates where id = any($1::uuid[])`, [createdTemplates]);
	}
}

// Functions

type Student = { email: string; id: string };

/** Un modèle « Verifs6 … » publié, posé par SQL : « Combien font 3 + 4 ? » → 7 */
async function makeTemplate(
	title: string,
	options: {
		notionId?: string | null;
		answer?: string;
		course?: boolean;
		grade?: string;
		math?: boolean;
	} = {}
): Promise<string> {
	const { notionId = null, answer = '7', course = false, grade = 'CE1', math = false } = options;
	const variations = course
		? [
				{
					statement: `Que vaut ${title} ? (tirage n° {{n}})`,
					variables: [{ name: 'n', expression: '1..99' }],
					correction: { steps: ['La réponse de la carte.'] }
				}
			]
		: [
				{
					// `n` ne sert qu'à rendre chaque tirage distinct (une série écarte les doublons)
					// `$?$` : case de maths (MathLive) ; `[_]` : case de texte
					statement: math
						? 'Calcule (tirage n° {{n}}) : $3 + 4 = ?$'
						: 'Combien font 3 + 4 ? (tirage n° {{n}}) [_]',
					variables: [{ name: 'n', expression: '1..99' }],
					blanks: [{ expectedAnswer: answer }],
					correction: { steps: ['On additionne : $3 + 4 = 7$.'] }
				}
			];
	const rows = await sql<{ id: string }>(
		`insert into question_templates (type, grades, level, variations, status, title, created_by,
		                                 options, classification_node_id)
		 values ($1, array[$7::text], 1, $2::jsonb, 'published', $3,
		         (select id from profiles where email = $4), $5::jsonb, $6)
		 returning id::text`,
		[
			course ? 'course_card' : 'fill_in_blanks',
			JSON.stringify(variations),
			`${PREFIXE} ${title}`,
			TEACHER.email,
			JSON.stringify(course ? { courseCard: true, courseQuestion: true } : {}),
			notionId,
			grade
		]
	);
	createdTemplates.push(rows[0].id);
	return rows[0].id;
}

function seriesUrl(
	items: SeriesItem[],
	mode: 'typing' | 'interactive' | 'flash' | 'course',
	seed = 6
): string {
	return buildSeriesLink('', items, { mode, seed });
}

async function loginAs(page: Page, student: Student): Promise<void> {
	await login(page, student.email, PASSWORD);
	await page.waitForLoadState('networkidle');
}

/** Ouvre une série et attend sa première carte (la page `/automaths/test` peut être lente) */
async function openSeries(page: Page, url: string): Promise<void> {
	await page.goto(url);
	await page.waitForLoadState('networkidle');
}

/** Tape au vrai clavier dans la case de réponse de `scope` (case texte ou MathLive). */
async function typeInto(page: Page, scope: Locator, typed: string): Promise<void> {
	const field = scope.locator('input:not([type=hidden]):not([type=radio]), math-field').first();
	await field.scrollIntoViewIfNeeded();
	await field.click();
	await page.keyboard.type(typed, { delay: 60 });
}

async function shootPage(page: Page, name: string): Promise<void> {
	await page.screenshot({ path: `${SHOTS}/${name}-${test.info().project.name}.png` });
}

async function attemptsOf(student: Student, place: string, templateIds: string[]) {
	return sql<{
		place: string;
		success: boolean;
		response_ms: number | null;
		allotted_ms: number | null;
		end_reason: string | null;
		seed: number | null;
		template_id: string;
	}>(
		`select place, success, response_ms, allotted_ms, end_reason, seed, template_id::text
		   from skill_attempts
		  where student_id = $1 and place = $2 and template_id = any($3::uuid[]) and created_at >= $4
		  order by created_at`,
		[student.id, place, templateIds, startedAt]
	);
}

// ============================================================================
// #2565 — Forme Saisie
// ============================================================================

/** « Valider » de la question en cours, quand la carte est encore au recto */
const validate = (page: Page): Locator =>
	page.getByRole('button', { name: 'Valider', exact: true });

/** Le verdict affiché au verso d'une carte (« Juste », « Faux », « ½ point ») */
const verdictOf = (card: Locator): Locator => card.getByText(/^(Juste|Faux|½ point)$/).first();

test('#2565 — forme Saisie : une question à la fois, ni chrono ni retournement avant « Valider », la carte se retourne seule (réponse, verdict, correction) ; « Suivante » puis « Terminer » ; valider à vide montre la réponse', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2565 saisie');
	await loginAs(page, E16);
	await openSeries(page, seriesUrl([{ templateId: template, quantity: 3, delay: 0 }], 'typing'));

	const card = page.getByTestId('typing-card');
	const next = page.locator('[data-typing-next]');
	await card.locator('.flip-card-front').waitFor();

	// Question 1 : une seule question à l'écran, pas de chrono, pas de bouton de retournement
	await expect(page.getByTestId('typing-position')).toHaveText('Question 1 / 3');
	await expect(page.locator('.timer-container')).toHaveCount(0);
	await expect(card.getByRole('button')).toHaveText(['Valider']);
	await expect(card.getByRole('button', { name: 'Voir la correction' })).toHaveCount(0);
	await expect(next).toHaveCount(0);

	// Une réponse fausse puis « Valider » : la carte se retourne SEULE
	await typeInto(page, card, '5');
	await validate(page).click();
	await expect(card.getByText('Réponse', { exact: true })).toBeVisible();
	await expect(verdictOf(card)).toHaveText('Faux');
	// Sa réponse (5, face à la bonne : 7) et la correction
	await expect(card.getByText('Ta réponse :')).toBeVisible();
	await expect(card.locator('.flip-card-back')).toContainText('5');
	await expect(card.locator('.flip-card-back')).toContainText('7');
	await expect(card.getByText('Correction', { exact: true })).toBeVisible();
	await expect(card.getByText('On additionne')).toBeVisible();
	await shootPage(page, '2565-saisie-faux');
	await expect(next).toHaveText(/Suivante/);

	// « Suivante » : question 2, de nouveau au recto, sans chrono
	await next.click();
	await expect(page.getByTestId('typing-position')).toHaveText('Question 2 / 3');
	await card.locator('.flip-card-front').waitFor();
	await expect(card.getByRole('button')).toHaveText(['Valider']);
	await typeInto(page, card, '7');
	await validate(page).click();
	await expect(verdictOf(card)).toHaveText('Juste');
	await next.click();

	// Question 3 : valider À VIDE montre la réponse ; le bouton dit « Terminer »
	await expect(page.getByTestId('typing-position')).toHaveText('Question 3 / 3');
	await card.locator('.flip-card-front').waitFor();
	await validate(page).click();
	await expect(verdictOf(card)).toHaveText('Faux');
	await expect(card.locator('.flip-card-back')).toContainText('7');
	await expect(card.getByText('Correction', { exact: true })).toBeVisible();
	await expect(next).toHaveText(/Terminer/);
	await next.click();

	// Fin : « k questions réussies sur n » (1 sur 3 : singulier), revoir les ratées, gain du Palotin
	const summary = page.getByTestId('typing-summary');
	await expect(summary).toBeVisible();
	await expect(summary.getByText('1 question réussie sur 3')).toBeVisible();
	await expect(
		summary.getByRole('button', { name: "Revoir celles que je n'avais pas réussies" })
	).toBeVisible();
	await expect(page.getByTestId('buddy-gain-card')).toBeVisible();
	await shootPage(page, '2565-saisie-bilan');
});

test('#2565 — forme Saisie : « Revoir celles que je n’avais pas réussies » ne rejoue que les ratées, sans nouvelle trace ; chaque réponse est tracée dès « Valider »', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2565 revoir');
	await loginAs(page, E17);
	await openSeries(page, seriesUrl([{ templateId: template, quantity: 3, delay: 0 }], 'typing'));
	const card = page.getByTestId('typing-card');
	const next = page.locator('[data-typing-next]');
	await card.locator('.flip-card-front').waitFor();

	// Dès le premier « Valider » (série pas finie), la trace de la question existe : le prof la voit
	await typeInto(page, card, '7');
	await validate(page).click();
	await expect(verdictOf(card)).toHaveText('Juste');
	await expect.poll(async () => (await attemptsOf(E17, 'typing', [template])).length).toBe(1);
	const [first] = await attemptsOf(E17, 'typing', [template]);
	expect(first).toMatchObject({ place: 'typing', success: true });
	await next.click();

	// Question 2 ratée (5), question 3 ratée (à vide)
	await typeInto(page, card, '5');
	await validate(page).click();
	await expect(verdictOf(card)).toHaveText('Faux');
	await expect.poll(async () => (await attemptsOf(E17, 'typing', [template])).length).toBe(2);
	await next.click();
	await card.locator('.flip-card-front').waitFor();
	await validate(page).click();
	await expect(verdictOf(card)).toHaveText('Faux');
	await next.click();
	await expect(
		page.getByTestId('typing-summary').getByText('1 question réussie sur 3')
	).toBeVisible();
	await expect.poll(async () => (await attemptsOf(E17, 'typing', [template])).length).toBe(3);
	const outcomes = (await attemptsOf(E17, 'typing', [template])).map((row) => row.success);
	expect(outcomes).toEqual([true, false, false]);

	// « Revoir » : seulement les 2 ratées, de nouveau avec une question à la fois
	await page.getByRole('button', { name: "Revoir celles que je n'avais pas réussies" }).click();
	await expect(page.getByTestId('typing-position')).toHaveText('Question 1 / 2');
	await card.locator('.flip-card-front').waitFor();
	await typeInto(page, card, '7');
	await validate(page).click();
	await expect(verdictOf(card)).toHaveText('Juste');
	await next.click();
	await expect(page.getByTestId('typing-position')).toHaveText('Question 2 / 2');
	await card.locator('.flip-card-front').waitFor();
	await typeInto(page, card, '7');
	await validate(page).click();
	await expect(next).toHaveText(/Terminer/);
	await next.click();
	await expect(
		page.getByTestId('typing-summary').getByText('2 questions réussies sur 2')
	).toBeVisible();
	await expect(page.getByRole('button', { name: /Revoir celles/ })).toHaveCount(0);
	// « Revoir » n'ajoute rien : toujours 3 traces
	await page.waitForLoadState('networkidle');
	expect((await attemptsOf(E17, 'typing', [template])).length).toBe(3);
});

test('#2565 — forme Saisie, carte de cours : retourner puis « Pas réussi / Réussi » ; la carte compte dans le bilan à part', async ({
	page
}) => {
	test.setTimeout(240_000);
	const cours = await makeTemplate('2565 carte', { course: true });
	await loginAs(page, E18);
	await openSeries(page, seriesUrl([{ templateId: cours, quantity: 2, delay: 0 }], 'typing'));
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor();
	await expect(page.getByTestId('typing-position')).toHaveText('Question 1 / 2');
	// Avant retournement : pas de boutons d'auto-évaluation, on invite à retourner la carte
	await expect(page.getByText('Retourne la carte pour voir la réponse.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Pas réussi' })).toHaveCount(0);
	await card.getByRole('button', { name: 'Voir la correction' }).click();
	await expect(page.getByRole('button', { name: 'Pas réussi' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Réussi', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Réussi', exact: true }).click();
	// Carte suivante : au recto de nouveau
	await expect(page.getByTestId('typing-position')).toHaveText('Question 2 / 2');
	await expect(page.getByText('Retourne la carte pour voir la réponse.')).toBeVisible();
	await card.getByRole('button', { name: 'Voir la correction' }).click();
	await page.getByRole('button', { name: 'Pas réussi' }).click();
	const summary = page.getByTestId('typing-summary');
	await expect(summary).toBeVisible();
	await expect(summary.getByText('2 cartes de cours révisées')).toBeVisible();
	await expect(summary.getByText(/questions? réussies? sur/)).toHaveCount(0);
});

// ============================================================================
// #2554 — Une trace par question ; « Entraînement » devient « Contrôle blanc »
// ============================================================================

const CART_KEY = 'chiphre_question_cart';

/** Met une série dans « Ma série » (localStorage) avant le premier chargement de la page */
async function seedCart(page: Page, items: SeriesItem[]): Promise<void> {
	await page.addInitScript(
		([key, json]) => {
			if (!sessionStorage.getItem('verifs6-seeded')) {
				localStorage.setItem(key, json);
				sessionStorage.setItem('verifs6-seeded', '1');
			}
		},
		[CART_KEY, JSON.stringify(items)] as const
	);
}

/** Contrôle blanc : tape sa réponse dans LA question affichée (l'ancienne glisse hors de l'écran) puis « Valider » */
async function answerInteractive(page: Page, typed: string): Promise<void> {
	const question = page.getByTestId('interactive-question');
	await expect(question).toHaveCount(1);
	await typeInto(page, question, typed);
	await validate(page).click();
}

/** « C'est parti ! » : recliqué tant que la série n'a pas démarré (bouton pas encore hydraté) */
async function startSeries(page: Page, started: Locator): Promise<void> {
	await expect(async () => {
		const start = page.getByRole('button', { name: /C'est parti/ });
		if (await start.isVisible()) await start.click();
		await expect(started).toBeVisible({ timeout: 4000 });
	}).toPass({ timeout: 30_000 });
}

test('#2554 — « Contrôle blanc » partout : choix de la forme, page d’attente, titre, résultats, lien de partage ; plus aucun « Entraînement » ; gain du Palotin à la fin', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2554 libellé');
	const items: SeriesItem[] = [{ templateId: template, quantity: 2, delay: 60 }];
	await seedCart(page, items);
	await loginAs(page, E16);
	await page.goto('/automaths/panier');
	await page.waitForLoadState('networkidle');

	// Lien de partage : la forme se choisit dans une liste qui dit « Contrôle blanc »
	await page.getByRole('combobox', { name: /forme/i }).first().click();
	await expect(page.getByRole('option', { name: 'Contrôle blanc' })).toBeVisible();
	await expect(page.getByRole('option', { name: /Entraînement/ })).toHaveCount(0);
	await page.keyboard.press('Escape');

	// Choix de la forme : « Contrôle blanc », jamais « Entraînement »
	await page.getByRole('button', { name: /Commencer un test/ }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByText('Contrôle blanc', { exact: true })).toBeVisible();
	await expect(dialog.getByText(/Entraînement/)).toHaveCount(0);
	await dialog.getByText('Contrôle blanc', { exact: true }).click();
	await expect(page).toHaveURL(/\/automaths\/test\?.*mode=interactive/);

	// Page d'attente, puis titre de la série
	await expect(page.getByRole('heading', { name: 'Contrôle blanc', level: 2 })).toBeVisible();
	await startSeries(page, page.getByTestId('interactive-position'));
	await expect(page.getByRole('heading', { name: 'Contrôle blanc', level: 1 })).toBeVisible();
	await expect(page.getByText(/Entraînement/)).toHaveCount(0);
	for (let n = 1; n <= 2; n++) {
		await expect(page.getByTestId('interactive-position')).toHaveText(`Question ${n} sur 2`);
		await answerInteractive(page, '7');
	}

	// Résultats : « Contrôle blanc » sous le titre, gain du Palotin comme avant
	await expect(page.getByRole('heading', { name: 'Résultats du test' })).toBeVisible();
	await expect(page.getByText('Contrôle blanc', { exact: true })).toBeVisible();
	await expect(page.getByText(/Entraînement/)).toHaveCount(0);
	await expect(page.getByTestId('buddy-gain-card')).toBeVisible();
	await shootPage(page, '2554-controle-blanc-resultats');
});

test('#2554 — Contrôle blanc : 2 réponses puis « Quitter » → les 2 réponses sont déjà tracées (lieu `mock_test`, durées renseignées), les autres questions pas', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2554 quitter');
	await loginAs(page, E17);
	await openSeries(
		page,
		seriesUrl([{ templateId: template, quantity: 4, delay: 60 }], 'interactive')
	);
	await startSeries(page, page.getByTestId('interactive-position'));

	await expect(page.getByTestId('interactive-position')).toHaveText('Question 1 sur 4');
	await answerInteractive(page, '7');
	await expect(page.getByTestId('interactive-position')).toHaveText('Question 2 sur 4');
	await answerInteractive(page, '5');
	await expect(page.getByTestId('interactive-position')).toHaveText('Question 3 sur 4');

	// Quitter : retour à « Ma série », série pas finie
	await page.getByRole('link', { name: 'Quitter' }).click();
	await expect(page).toHaveURL(/\/automaths\/panier/);

	// Côté base (ce que lit la grille du prof) : les 2 réponses comptent déjà, une juste, une fausse
	await expect.poll(async () => (await attemptsOf(E17, 'mock_test', [template])).length).toBe(2);
	const rows = await attemptsOf(E17, 'mock_test', [template]);
	expect(rows.map((row) => row.success)).toEqual([true, false]);
	for (const row of rows) {
		expect(row.end_reason).toBe('validated');
		expect(row.response_ms).toBeGreaterThan(0);
		expect(row.allotted_ms).toBe(60_000);
	}
	// Rien n'est inventé pour les questions 3 et 4 non répondues
	await page.waitForLoadState('networkidle');
	expect((await attemptsOf(E17, 'mock_test', [template])).length).toBe(2);
});

test('#2554 — Course aux nombres : une question validée puis « Terminer » → les autres comptent ratées (sans durée ni fin) ; gain du Palotin à la fin', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2554 course');
	await loginAs(page, E18);
	// Le bouton « Terminer » demande confirmation tant qu'il reste des questions sans réponse
	page.once('dialog', (dialog) => void dialog.accept());
	await openSeries(
		page,
		buildSeriesLink('', [{ templateId: template, quantity: 3, delay: 20 }], {
			mode: 'course',
			timeLimit: 300,
			seed: 6
		})
	);
	await startSeries(page, page.getByRole('heading', { name: 'Course aux nombres', level: 1 }));

	// Les trois questions à l'écran : on valide la première seulement
	await expect(page.getByRole('button', { name: 'Valider', exact: true })).toHaveCount(3);
	const first = page.locator('#question-0');
	await typeInto(page, first, '7');
	await first.getByRole('button', { name: 'Valider', exact: true }).click();
	await expect(page.getByText('1 / 3 répondu')).toBeVisible();
	await expect.poll(async () => (await attemptsOf(E18, 'number_race', [template])).length).toBe(1);

	await page.getByRole('button', { name: 'Terminer' }).click();
	await expect(page.getByRole('heading', { name: 'Résultats du test' })).toBeVisible();
	await expect(page.getByText('Course aux nombres', { exact: true })).toBeVisible();
	await expect.poll(async () => (await attemptsOf(E18, 'number_race', [template])).length).toBe(3);
	const rows = await attemptsOf(E18, 'number_race', [template]);
	const [validated, ...left] = [...rows].sort((a, b) => Number(b.success) - Number(a.success));
	expect(validated).toMatchObject({ success: true, end_reason: 'validated' });
	expect(validated.response_ms).toBeGreaterThan(0);
	expect(validated.allotted_ms).toBe(300_000);
	expect(left).toHaveLength(2);
	for (const row of left) {
		// Ratée, laissée par « Terminer » : ni durée ni fin
		expect(row).toMatchObject({ success: false, end_reason: null, response_ms: null });
	}
	await expect(page.getByTestId('buddy-gain-card')).toBeVisible();
});

test('#2554 — Flash-cards : chaque « Réussi / Pas réussi » compte aussitôt, « Revoir » n’ajoute rien, aucun gain du Palotin', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2554 flash');
	await loginAs(page, E19);
	await openSeries(page, seriesUrl([{ templateId: template, quantity: 3, delay: 0 }], 'flash'));
	const card = page.getByTestId('flash-card');
	await expect(page.getByTestId('flash-position')).toHaveText('Carte 1 / 3');

	const flip = card.getByRole('button', { name: 'Voir la correction' });
	await flip.click();
	await page.getByRole('button', { name: 'Réussi', exact: true }).click();
	// Aussitôt : la trace de la 1re carte existe, la série n'est pas finie
	await expect.poll(async () => (await attemptsOf(E19, 'flash_cards', [template])).length).toBe(1);
	await expect(page.getByTestId('flash-position')).toHaveText('Carte 2 / 3');
	await flip.click();
	await page.getByRole('button', { name: 'Pas réussi' }).click();
	await expect.poll(async () => (await attemptsOf(E19, 'flash_cards', [template])).length).toBe(2);
	await expect(page.getByTestId('flash-position')).toHaveText('Carte 3 / 3');
	await flip.click();
	await page.getByRole('button', { name: 'Pas réussi' }).click();
	await expect(page.getByTestId('flash-summary')).toBeVisible();
	await expect.poll(async () => (await attemptsOf(E19, 'flash_cards', [template])).length).toBe(3);
	expect((await attemptsOf(E19, 'flash_cards', [template])).map((row) => row.success)).toEqual([
		true,
		false,
		false
	]);

	// « Revoir » : les 2 cartes non trouvées, sans nouvelle trace
	await page.getByRole('button', { name: /Revoir celles que je n'avais pas trouvées/ }).click();
	await expect(page.getByTestId('flash-position')).toHaveText('Carte 1 / 2');
	await flip.click();
	await page.getByRole('button', { name: 'Réussi', exact: true }).click();
	await flip.click();
	await page.getByRole('button', { name: 'Réussi', exact: true }).click();
	await expect(page.getByTestId('flash-summary')).toBeVisible();
	await page.waitForLoadState('networkidle');
	expect((await attemptsOf(E19, 'flash_cards', [template])).length).toBe(3);
	// Flash-cards : pas de gain
	await expect(page.getByTestId('buddy-gain-card')).toHaveCount(0);
});

test('#2554 — réseau coupé pendant une série puis finir → un seul message « Certaines réponses n’ont pas été enregistrées. »', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2554 réseau');
	await loginAs(page, E20);
	await openSeries(page, seriesUrl([{ templateId: template, quantity: 3, delay: 0 }], 'typing'));
	const card = page.getByTestId('typing-card');
	const next = page.locator('[data-typing-next]');
	await card.locator('.flip-card-front').waitFor();
	// Réseau coupé : les traces ne partent plus
	await page.route('**/api/skill-attempts', (route) => route.abort('internetdisconnected'));
	for (let n = 1; n <= 3; n++) {
		await expect(page.getByTestId('typing-position')).toHaveText(`Question ${n} / 3`);
		await card.locator('.flip-card-front').waitFor();
		await typeInto(page, card, '7');
		await validate(page).click();
		await expect(next).toBeVisible();
		await next.click();
	}
	await expect(page.getByTestId('typing-summary')).toBeVisible();
	const warning = page.getByText("Certaines réponses n'ont pas été enregistrées.");
	await expect(warning).toHaveCount(1);
	// Un seul, pas un par réponse perdue : il ne s'en ajoute pas
	await page.waitForTimeout(1500);
	await expect(warning).toHaveCount(1);
	expect((await attemptsOf(E20, 'typing', [template])).length).toBe(0);
});

// ============================================================================
// Décors communs aux révisions, au Palotin et aux contrôles
// ============================================================================

/** Un paquet « Verifs6 … » de cartes libres (recto / verso) à l'élève : `count` cartes dues */
async function makeDeck(student: Student, title: string, count: number): Promise<string> {
	const [deck] = await sql<{ id: string }>(
		`insert into srs_decks (name, owner_id, deck_type) values ($1, $2, 'personal') returning id::text`,
		[`${PREFIXE} ${title}`, student.id]
	);
	for (let n = 1; n <= count; n++) {
		await sql(
			`insert into srs_cards (deck_id, card_type, front_content, back_content)
			 values ($1, 'custom', $2, $3)`,
			[deck.id, `Question libre ${n} ?`, `Réponse libre ${n}.`]
		);
	}
	return deck.id;
}

/** Une notion de l'arbre (sa clé range un modèle : les erreurs « sur la même notion » se comptent par elle) */
async function aNotionId(): Promise<string> {
	const [notion] = await sql<{ id: string }>(
		`select id::text from classification_nodes where kind = 'notion' and archived_at is null order by position limit 1`
	);
	return notion.id;
}

/** La bulle de parole du Palotin (vide quand il ne dit rien) */
const bubble = (page: Page): Locator => page.locator('[data-buddy-bubble]');
/** Le Palotin entré en séance (son dessin remplace l'écusson) */
const palotinIn = (page: Page): Locator => page.getByRole('button', { name: /^Mon Palotin/ });
/** L'écusson, en bas à droite hors de la maison du Palotin */
const badgeOf = (page: Page): Locator => page.getByTestId('palotin-badge');

// ============================================================================
// #2551 — Deux boutons « Pas réussi / Réussi »
// ============================================================================

const SELF_ASSESS_OLD = /^(Encore|Difficile|Bien|Facile)$/;

test('#2551 — révision d’un paquet : après « Voir la réponse », deux boutons seulement (plus Encore / Difficile / Bien / Facile) ; touche 1 = pas réussi, touche 2 = réussi, le bouton « Réussi » marche aussi', async ({
	page
}) => {
	test.setTimeout(240_000);
	const deck = await makeDeck(E19, '2551 paquet', 3);
	await loginAs(page, E19);
	await openSeries(page, `/dashboard/revisions/decks/${deck}/study`);
	await expect(page.getByText('Carte 1 sur 3')).toBeVisible();

	// Avant « Voir la réponse » : aucune note proposée
	await expect(page.getByTestId('self-assess')).toHaveCount(0);
	await page.getByRole('button', { name: 'Voir la réponse' }).click();
	const assess = page.getByTestId('self-assess');
	await expect(assess).toBeVisible();
	await expect(assess.getByRole('button')).toHaveText(['Pas réussi', 'Réussi']);
	await expect(page.getByRole('button', { name: SELF_ASSESS_OLD })).toHaveCount(0);
	await expect(assess.getByText('Clavier : 1 pas réussi · 2 réussi')).toBeVisible();
	await shootPage(page, '2551-revision-boutons');

	// Touche 1 = pas réussi : on passe à la carte 2
	await page.keyboard.press('1');
	await expect(page.getByText('Carte 2 sur 3')).toBeVisible();
	// Touche 2 = réussi
	await page.getByRole('button', { name: 'Voir la réponse' }).click();
	await page.keyboard.press('2');
	await expect(page.getByText('Carte 3 sur 3')).toBeVisible();
	// Le bouton « Réussi » à la souris
	await page.getByRole('button', { name: 'Voir la réponse' }).click();
	await page.getByRole('button', { name: 'Réussi', exact: true }).click();

	// Bilan : 1 pas réussi (touche 1), 2 réussis (touche 2 et bouton)
	await expect(page.getByText('Session terminée !')).toBeVisible();
	const summary = page.locator('.grid', { hasText: 'Cartes révisées' });
	await expect(summary.getByText('Réussies').locator('..')).toContainText('2');
	await expect(summary.getByText('Ratées').locator('..')).toContainText('1');
	// Les trois révisions sont enregistrées (une fiche de révision espacée par carte)
	const stats = await sql<{ total_reviews: number }>(
		`select total_reviews from srs_card_stats
		  where user_id = $1 and card_reference_type = 'custom'
		    and card_reference_id in (select id from srs_cards where deck_id = $2)`,
		[E19.id, deck]
	);
	expect(stats).toHaveLength(3);
});

test('#2551 — Flash-cards : mêmes deux boutons, mêmes touches 1 et 2 (`/automaths/test`, forme Flash-cards)', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2551 flash');
	await loginAs(page, E18);
	await openSeries(page, seriesUrl([{ templateId: template, quantity: 3, delay: 0 }], 'flash'));
	const card = page.getByTestId('flash-card');
	await expect(page.getByTestId('flash-position')).toHaveText('Carte 1 / 3');
	await expect(page.getByTestId('self-assess')).toHaveCount(0);
	await card.getByRole('button', { name: 'Voir la correction' }).click();
	const assess = page.getByTestId('self-assess');
	await expect(assess.getByRole('button')).toHaveText(['Pas réussi', 'Réussi']);
	await expect(page.getByRole('button', { name: SELF_ASSESS_OLD })).toHaveCount(0);
	await expect(assess.getByText('Clavier : 1 pas réussi · 2 réussi')).toBeVisible();
	await page.keyboard.press('1');
	await expect(page.getByTestId('flash-position')).toHaveText('Carte 2 / 3');
	await card.getByRole('button', { name: 'Voir la correction' }).click();
	await page.keyboard.press('2');
	await expect(page.getByTestId('flash-position')).toHaveText('Carte 3 / 3');
	await card.getByRole('button', { name: 'Voir la correction' }).click();
	await page.keyboard.press('2');
	// La touche 1 a noté « pas réussi », la touche 2 « réussi » (traces des cartes)
	await expect.poll(async () => (await attemptsOf(E18, 'flash_cards', [template])).length).toBe(3);
	expect((await attemptsOf(E18, 'flash_cards', [template])).map((row) => row.success)).toEqual([
		false,
		true,
		true
	]);
	await expect(
		page.getByTestId('flash-summary').getByText('2 cartes trouvées sur 3')
	).toBeVisible();
});

// ============================================================================
// #2550 — Le Palotin réagit en séance
// ============================================================================

/** Position affichée du Contrôle blanc : « Question n sur N » */
const position = (page: Page, n: number, total: number): Locator =>
	page.getByTestId('interactive-position').filter({ hasText: `Question ${n} sur ${total}` });

/** Le Palotin attendu en séance : son écusson est là, il ne dit rien */
async function expectBadgeAlone(page: Page): Promise<void> {
	await expect(badgeOf(page)).toBeVisible();
	await expect(palotinIn(page)).toHaveCount(0);
	await expect(bubble(page)).not.toHaveText(/\S/);
}

/** Le texte de la bulle fait partie de la banque de répliques du Palotin pour ce contexte */
async function expectLineFrom(
	page: Page,
	palotin: 'giron' | 'pile' | 'cotice',
	context: 'correct' | 'incorrect'
): Promise<string> {
	await expect(bubble(page)).toHaveText(/\S/);
	const said = ((await bubble(page).innerText()) ?? '').replace(/\s+/g, ' ').trim();
	const pool = buddyMessages[palotin][context].map((line) => line.replace(/\s+/g, ' ').trim());
	expect(pool, `« ${said} » dans la banque « ${context} » de ${palotin}`).toContain(said);
	return said;
}

test('#2550 — Contrôle blanc : 5 bonnes réponses d’affilée → le Palotin entre, s’exclame, repart (~3 s) PUIS la question suivante arrive avec son chrono ; plus aucune réaction ensuite', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2550 série');
	await loginAs(page, E16);
	await openSeries(
		page,
		seriesUrl([{ templateId: template, quantity: 7, delay: 60 }], 'interactive')
	);
	await startSeries(page, page.getByTestId('interactive-position'));
	// En séance : l'écusson seul, aucune bulle
	await expectBadgeAlone(page);

	// Questions 1 à 4 : la suivante arrive aussitôt, le Palotin ne bouge pas
	for (let n = 1; n <= 4; n++) {
		await expect(position(page, n, 7)).toBeVisible();
		await answerInteractive(page, '7');
		await expect(position(page, n + 1, 7)).toBeVisible({ timeout: 2500 });
		await expect(palotinIn(page)).toHaveCount(0);
	}

	// Question 5 : la 5e bonne réponse d'affilée
	await expect(position(page, 5, 7)).toBeVisible();
	await answerInteractive(page, '7');
	await expect(palotinIn(page)).toBeVisible({ timeout: 3000 });
	const enteredAt = Date.now();
	const said = await expectLineFrom(page, 'giron', 'correct');
	expect(said.length).toBeGreaterThan(0);
	// Pendant son passage, la question suivante n'est pas arrivée
	await expect(position(page, 5, 7)).toBeVisible();
	await expect(position(page, 6, 7)).toHaveCount(0);
	await shootPage(page, '2550-palotin-streak');
	// Il repart (~3 s plus l'entrée et la sortie), l'écusson revient
	await expect(palotinIn(page)).toHaveCount(0, { timeout: 8000 });
	const stayedMs = Date.now() - enteredAt;
	expect(stayedMs, 'durée du passage').toBeGreaterThanOrEqual(2000);
	expect(stayedMs, 'durée du passage').toBeLessThan(7000);
	await expect(badgeOf(page)).toBeVisible();
	// PUIS la question suivante, avec son chrono
	await expect(position(page, 6, 7)).toBeVisible({ timeout: 3000 });
	await expect(page.locator('.timer-container')).toBeVisible();

	// Plus aucune réaction ensuite : questions 6 et 7 sans pause
	await answerInteractive(page, '7');
	await expect(position(page, 7, 7)).toBeVisible({ timeout: 2500 });
	await expect(palotinIn(page)).toHaveCount(0);
	await answerInteractive(page, '7');
	await expect(page.getByRole('heading', { name: 'Résultats du test' })).toBeVisible({
		timeout: 4000
	});
});

test('#2550 — rien sur la dernière question : 5 questions toutes justes, la fin arrive sans passage du Palotin', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2550 dernière');
	await loginAs(page, E17);
	await openSeries(
		page,
		seriesUrl([{ templateId: template, quantity: 5, delay: 60 }], 'interactive')
	);
	await startSeries(page, page.getByTestId('interactive-position'));
	await expectBadgeAlone(page);
	for (let n = 1; n <= 4; n++) {
		await expect(position(page, n, 5)).toBeVisible();
		await answerInteractive(page, '7');
	}
	// 5e bonne d'affilée, mais c'est la dernière : l'écran de fin, aucun passage
	await expect(position(page, 5, 5)).toBeVisible({ timeout: 2500 });
	await answerInteractive(page, '7');
	await expect(page.getByRole('heading', { name: 'Résultats du test' })).toBeVisible({
		timeout: 4000
	});
	await expect(palotinIn(page)).toHaveCount(0);
	await expect(bubble(page)).not.toHaveText(/\S/);
});

test('#2550 — nouvelle série : 3 erreurs sur des questions de la même notion → encouragement (banque « incorrect »), sans indice, la question suivante attend', async ({
	page
}) => {
	test.setTimeout(240_000);
	const notion = await aNotionId();
	const template = await makeTemplate('2550 notion', { notionId: notion });
	await loginAs(page, E18);
	await openSeries(
		page,
		seriesUrl([{ templateId: template, quantity: 5, delay: 60 }], 'interactive')
	);
	await startSeries(page, page.getByTestId('interactive-position'));
	await expectBadgeAlone(page);

	// Deux erreurs : rien
	for (let n = 1; n <= 2; n++) {
		await expect(position(page, n, 5)).toBeVisible();
		await answerInteractive(page, '5');
		await expect(position(page, n + 1, 5)).toBeVisible({ timeout: 2500 });
		await expect(palotinIn(page)).toHaveCount(0);
	}
	// La troisième : le Palotin encourage, la question 4 attend
	await expect(position(page, 3, 5)).toBeVisible();
	await answerInteractive(page, '5');
	await expect(palotinIn(page)).toBeVisible({ timeout: 3000 });
	await expectLineFrom(page, 'giron', 'incorrect');
	await expect(position(page, 4, 5)).toHaveCount(0);
	await expect(page.getByText(/indice|coup de pouce/i)).toHaveCount(0);
	await shootPage(page, '2550-palotin-encouragement');
	await expect(palotinIn(page)).toHaveCount(0, { timeout: 8000 });
	await expect(position(page, 4, 5)).toBeVisible({ timeout: 3000 });
	// Une fois par série : la 4e erreur ne déclenche rien
	await answerInteractive(page, '5');
	await expect(position(page, 5, 5)).toBeVisible({ timeout: 2500 });
	await expect(palotinIn(page)).toHaveCount(0);
});

test('#2550 — chrono court (5 s) : la fin du chrono de la question déjà répondue pendant la pause ne gêne pas (une seule trace, ni saut ni double validation)', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2550 chrono');
	await loginAs(page, E16);
	await openSeries(
		page,
		seriesUrl([{ templateId: template, quantity: 6, delay: 5 }], 'interactive')
	);
	await startSeries(page, page.getByTestId('interactive-position'));
	for (let n = 1; n <= 4; n++) {
		await expect(position(page, n, 6)).toBeVisible();
		await answerInteractive(page, '7');
	}
	// Question 5 : on répond tard, le chrono (5 s) finira PENDANT la pause de 3 s du Palotin
	await expect(position(page, 5, 6)).toBeVisible({ timeout: 2500 });
	await page.waitForTimeout(3000);
	await answerInteractive(page, '7');
	await expect(palotinIn(page)).toBeVisible({ timeout: 3000 });
	await expect(palotinIn(page)).toHaveCount(0, { timeout: 8000 });
	// Après la pause : la question 6, pas une sauterie vers la fin
	await expect(position(page, 6, 6)).toBeVisible({ timeout: 3000 });
	await page.waitForTimeout(1500);
	await expect(position(page, 6, 6)).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Résultats du test' })).toHaveCount(0);
	// Cinq traces, une par question répondue : le chrono de la 5e n'en a pas ajouté
	await expect.poll(async () => (await attemptsOf(E16, 'mock_test', [template])).length).toBe(5);
	const rows = await attemptsOf(E16, 'mock_test', [template]);
	expect(rows.map((row) => row.end_reason)).toEqual([
		'validated',
		'validated',
		'validated',
		'validated',
		'validated'
	]);
	await answerInteractive(page, '7');
	await expect(page.getByRole('heading', { name: 'Résultats du test' })).toBeVisible({
		timeout: 4000
	});
	await expect.poll(async () => (await attemptsOf(E16, 'mock_test', [template])).length).toBe(6);
});

test('#2550 — révision d’un paquet : 5 « Réussi » d’affilée → même passage, la carte suivante attend', async ({
	page
}) => {
	test.setTimeout(240_000);
	const deck = await makeDeck(E17, '2550 paquet', 7);
	await loginAs(page, E17);
	await openSeries(page, `/dashboard/revisions/decks/${deck}/study`);
	await expect(page.getByText('Carte 1 sur 7')).toBeVisible();
	// En révision : l'écusson seul
	await expectBadgeAlone(page);
	for (let n = 1; n <= 4; n++) {
		await expect(page.getByText(`Carte ${n} sur 7`)).toBeVisible();
		await page.getByRole('button', { name: 'Voir la réponse' }).click();
		await page.keyboard.press('2');
		await expect(page.getByText(`Carte ${n + 1} sur 7`)).toBeVisible({ timeout: 4000 });
		await expect(palotinIn(page)).toHaveCount(0);
	}
	await page.getByRole('button', { name: 'Voir la réponse' }).click();
	await page.keyboard.press('2');
	await expect(palotinIn(page)).toBeVisible({ timeout: 4000 });
	await expectLineFrom(page, 'pile', 'correct');
	// La carte suivante attend le départ du Palotin
	await expect(page.getByText('Carte 5 sur 7')).toBeVisible();
	await expect(page.getByText('Carte 6 sur 7')).toHaveCount(0);
	await shootPage(page, '2550-palotin-revision');
	await expect(palotinIn(page)).toHaveCount(0, { timeout: 8000 });
	await expect(page.getByText('Carte 6 sur 7')).toBeVisible({ timeout: 4000 });
	await expect(page.getByRole('button', { name: 'Voir la réponse' })).toBeVisible();
});

test('#2550 — Flash-cards et Course aux nombres : jamais de réaction du Palotin, même après 5 réussites d’affilée', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2550 autres formes');
	await loginAs(page, E18);
	// Flash-cards : 7 cartes, 6 « Réussi » : la carte suivante arrive aussitôt, le Palotin ne vient pas
	await openSeries(page, seriesUrl([{ templateId: template, quantity: 7, delay: 0 }], 'flash'));
	const card = page.getByTestId('flash-card');
	for (let n = 1; n <= 6; n++) {
		await expect(page.getByTestId('flash-position')).toHaveText(`Carte ${n} / 7`);
		await card.getByRole('button', { name: 'Voir la correction' }).click();
		await page.keyboard.press('2');
		await expect(palotinIn(page)).toHaveCount(0);
	}
	await expect(page.getByTestId('flash-position')).toHaveText('Carte 7 / 7', { timeout: 2000 });
	await expect(bubble(page)).not.toHaveText(/\S/);

	// Course aux nombres : 7 questions, 6 validées justes
	await openSeries(
		page,
		buildSeriesLink('', [{ templateId: template, quantity: 7, delay: 20 }], {
			mode: 'course',
			timeLimit: 300,
			seed: 7
		})
	);
	await startSeries(page, page.getByRole('heading', { name: 'Course aux nombres', level: 1 }));
	for (let n = 0; n < 6; n++) {
		const one = page.locator(`#question-${n}`);
		await typeInto(page, one, '7');
		await one.getByRole('button', { name: 'Valider', exact: true }).click();
	}
	await expect(page.getByText('6 / 7 répondu')).toBeVisible();
	await page.waitForTimeout(1500);
	await expect(palotinIn(page)).toHaveCount(0);
	await expect(bubble(page)).not.toHaveText(/\S/);
});

test('#2550 — prof et visiteur sur `/automaths/test` : aucune pause, aucun Palotin', async ({
	page,
	browser
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2550 prof visiteur');
	const url = seriesUrl([{ templateId: template, quantity: 7, delay: 60 }], 'interactive');

	async function playSix(who: Page, label: string): Promise<void> {
		await openSeries(who, url);
		await startSeries(who, who.getByTestId('interactive-position'));
		for (let n = 1; n <= 6; n++) {
			await expect(position(who, n, 7), `${label} : question ${n}`).toBeVisible({ timeout: 4000 });
			await answerInteractive(who, '7');
		}
		// 6 bonnes d'affilée : la 7e arrive sans pause, ni Palotin ni écusson
		await expect(position(who, 7, 7), `${label} : question 7`).toBeVisible({ timeout: 2500 });
		await expect(palotinIn(who)).toHaveCount(0);
		await expect(badgeOf(who)).toHaveCount(0);
		await expect(who.getByTestId('palotin-presence')).toHaveCount(0);
	}

	// Visiteur : un contexte sans session
	const visitor = await browser.newContext(test.info().project.use);
	try {
		await playSix(await visitor.newPage(), 'visiteur');
	} finally {
		await visitor.close();
	}
	// Prof
	await login(page, TEACHER.email, TEACHER.password);
	await page.waitForLoadState('networkidle');
	await playSix(page, 'prof');
});

// ============================================================================
// #2559 (et #2550 : contrôle assigné) — traces d'un contrôle
// ============================================================================

/** Un contrôle publié (forme Contrôle blanc) sur ces lignes, assigné à l'élève ; rend l'assignation */
async function assignEvaluation(
	student: Student,
	items: SeriesItem[],
	title: string
): Promise<string> {
	const [teacher] = await sql<{ id: string }>(`select id::text from profiles where email = $1`, [
		TEACHER.email
	]);
	const [series] = await sql<{ id: string }>(
		`insert into series (title, items, created_by, grade) values ($1, $2::jsonb, $3, 'CE1') returning id::text`,
		[`${PREFIXE} ${title}`, JSON.stringify(items), teacher.id]
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

test('#2559 #2550 — contrôle assigné de 6 questions (5 validées d’affilée, la dernière laissée au chrono) : aucune réaction du Palotin ; traces `skill_attempts` : lieu `evaluation`, durées et fin renseignées, graine NULL', async ({
	page
}) => {
	test.setTimeout(240_000);
	const template = await makeTemplate('2559 contrôle');
	const assignment = await assignEvaluation(
		E19,
		[{ templateId: template, quantity: 6, delay: 8 }],
		'2559 contrôle'
	);
	await loginAs(page, E19);
	await openSeries(page, `/automaths/test?assignment=${assignment}`);
	await page.getByRole('button', { name: /C.est parti/ }).click();
	const questions = page.getByTestId('interactive-question');
	for (let n = 1; n <= 5; n++) {
		await expect(page.getByText(`Question ${n} sur 6`)).toBeVisible({ timeout: 4000 });
		await expect(questions).toHaveCount(1);
		await typeInto(page, questions, '7');
		await validate(page).click();
		// Contrôle : jamais de passage du Palotin, la question suivante arrive aussitôt
		await expect(palotinIn(page)).toHaveCount(0);
	}
	await expect(page.getByText('Question 6 sur 6')).toBeVisible({ timeout: 2500 });
	await expect(palotinIn(page)).toHaveCount(0);
	// Question 6 : laissée au chrono (8 s) → la copie part, la note s'affiche
	await page.waitForURL(/\/dashboard\/student\/assessments\/[0-9a-f-]+\/results$/, {
		timeout: 40_000
	});
	await expect(page.getByText('Contrôle terminé')).toBeVisible();
	await expect(palotinIn(page)).toHaveCount(0);

	// Les traces du contrôle (lieu `evaluation`) : 5 validées + 1 au chrono
	await expect
		.poll(async () => (await attemptsOf(E19, 'evaluation', [template])).length, { timeout: 15_000 })
		.toBe(6);
	const rows = await attemptsOf(E19, 'evaluation', [template]);
	for (const row of rows) {
		expect(row.place).toBe('evaluation');
		expect(row.response_ms, 'durée de réponse').not.toBeNull();
		expect(row.allotted_ms, 'durée allouée').toBe(8000);
		expect(row.end_reason, 'fin').not.toBeNull();
		// Un contrôle fige ses questions : aucune graine d'entraînement libre
		expect(row.seed, 'graine').toBeNull();
	}
	expect(rows.filter((row) => row.end_reason === 'validated')).toHaveLength(5);
	const timedOut = rows.filter((row) => row.end_reason === 'timeout');
	expect(timedOut).toHaveLength(1);
	// La question laissée au chrono : ratée
	expect(timedOut[0].success).toBe(false);
});

// ============================================================================
// #2544 — Maison et passages du Palotin, écusson
// ============================================================================

/** Les points de la pièce héraldique de chaque Palotin (`PalotinBadge`) : triangle Giron, pointe Pile, diagonale Cotice */
const PIECES = {
	giron: '3,3 12,12.5 3,12.5',
	pile: '8,3 16,3 12,21',
	cotice: '3,5.5 5.5,3 19,16.5 16.5,19'
} as const;
const NAMES = { giron: 'Giron', pile: 'Pile', cotice: 'Cotice' } as const;

/** Page de l'espace élève prête : le Palotin lu, l'écusson (ou le Palotin) montré */
async function openStudentPage(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}

test('#2544 — maison : l’accueil `/dashboard` et la Chatterie montrent le Palotin (pas d’écusson) ; un clic ouvre son état', async ({
	page
}) => {
	test.setTimeout(240_000);
	await loginAs(page, E16);
	for (const path of ['/dashboard', '/dashboard/student/chatterie']) {
		await openStudentPage(page, path);
		// Le Palotin est là, comme avant
		await expect(palotinIn(page), path).toBeVisible({ timeout: 20_000 });
		await expect(badgeOf(page), `${path} : pas d'écusson`).toHaveCount(0);
		// Clic = son état (nom, tour de panse, cette semaine)
		await palotinIn(page).click();
		await expect(page.getByRole('heading', { name: 'Giron', level: 3 })).toBeVisible();
		await expect(page.getByText(/Cette semaine : \d+ jours? sur \d+/)).toBeVisible();
		await shootPage(page, `2544-maison-${path.split('/').pop()}`);
	}
});

// « Devoirs » (`/dashboard/student/devoirs`) redirige vers l'accueil tant que Google Classroom est
// désactivé (`GOOGLE_CLASSROOM_ENABLED`) : « Mon travail » le remplace dans la liste des passages.
const PASSAGE_PAGES = [
	'/dashboard/student/work',
	'/dashboard/student/cours',
	'/dashboard/revisions'
] as const;
for (const [who, palotin, pages] of [
	[E16, 'giron', PASSAGE_PAGES],
	[E17, 'pile', PASSAGE_PAGES]
] as const) {
	test(`#2544 — passages (${NAMES[palotin]}) : Mon travail (ex-Devoirs), Cours, Révisions → plus de Palotin mais un écusson à sa pièce, en bas à droite, qui ne cache aucun bouton ; clic → il entre avec son état, fermer → il repart`, async ({
		page
	}) => {
		test.setTimeout(240_000);
		await loginAs(page, who);
		for (const path of pages) {
			await openStudentPage(page, path);
			// L'écusson attend la fin d'un éventuel passage (nouveautés, sieste) : jusqu'à 20 s
			await expect(badgeOf(page), path).toBeVisible({ timeout: 30_000 });
			await expect(palotinIn(page), `${path} : plus de Palotin`).toHaveCount(0);
			const badge = badgeOf(page);
			await expect(badge).toHaveAttribute('data-palotin', palotin);
			// La pièce : triangle Giron, pointe Pile
			await expect(badge.locator('polygon')).toHaveAttribute('points', PIECES[palotin]);
			// Bas à droite, sans cacher un bouton ni un lien de la page
			const view = page.viewportSize() ?? { width: 1280, height: 720 };
			const holder = page.getByRole('button', { name: `Appeler ${NAMES[palotin]}` });
			const box = await holder.boundingBox();
			expect(box, `${path} : l'écusson a une place`).not.toBeNull();
			expect(box!.x + box!.width / 2, `${path} : à droite`).toBeGreaterThan(view.width / 2);
			expect(box!.y + box!.height / 2, `${path} : en bas`).toBeGreaterThan(view.height / 2);
			const hidden = await page.evaluate(
				([x, y, w, h]) => {
					const overlaps: string[] = [];
					const own = document.querySelector('[data-testid="palotin-presence"]');
					for (const el of document.querySelectorAll<HTMLElement>(
						'button, a[href], input, select, textarea, [role="button"]'
					)) {
						if (own?.contains(el)) continue;
						const r = el.getBoundingClientRect();
						if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden')
							continue;
						// « Caché » : l'écusson couvre le centre de l'élément ou plus du tiers de sa surface
						// (une carte entière qui est un lien, dont il frôle le coin, n'est pas cachée)
						const overlapW = Math.min(r.right, x + w) - Math.max(r.left, x);
						const overlapH = Math.min(r.bottom, y + h) - Math.max(r.top, y);
						const share =
							overlapW > 0 && overlapH > 0 ? (overlapW * overlapH) / (r.width * r.height) : 0;
						const cx = r.left + r.width / 2;
						const cy = r.top + r.height / 2;
						const centerCovered = cx >= x && cx <= x + w && cy >= y && cy <= y + h;
						if (centerCovered || share > 1 / 3) {
							overlaps.push(
								`${el.tagName} « ${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 40)} »`
							);
						}
					}
					return overlaps;
				},
				[box!.x, box!.y, box!.width, box!.height] as const
			);
			expect(hidden, `${path} : éléments cachés par l'écusson`).toEqual([]);

			// Clic → le Palotin entre avec son état ; fermer → il repart
			await holder.click();
			await expect(palotinIn(page)).toBeVisible();
			await expect(page.getByRole('heading', { name: NAMES[palotin], level: 3 })).toBeVisible();
			await shootPage(page, `2544-passage-${palotin}-${path.split('/').pop()}`);
			await page
				.getByRole('heading', { name: NAMES[palotin], level: 3 })
				.locator('..')
				.getByRole('button')
				.click();
			await expect(page.getByRole('heading', { name: NAMES[palotin], level: 3 })).toHaveCount(0);
			await expect(palotinIn(page)).toHaveCount(0);
			await expect(badge).toBeVisible();
		}
	});
}

/** Remplace `/api/student/mathoux` : `napping` Mathoux en sieste, aucune nouveauté (le serveur ne la rend qu'une fois) */
async function stubNapping(page: Page, napping: number): Promise<void> {
	await page.route('**/api/student/mathoux', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				born: 3,
				napping,
				toDiscover: 5,
				news: { firstVisit: false, total: 0, items: [] }
			})
		})
	);
}

/** Se déconnecte par la page de profil */
async function logoutStudent(page: Page): Promise<void> {
	await page.goto('/dashboard/profile');
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Se déconnecter' }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/dashboard'));
}

test('#2544 — Mathoux en sieste (réponse simulée de `/api/student/mathoux`) : en arrivant sur une page de l’espace élève, le Palotin entre, annonce la sieste avec le lien, repart ; recharger avant 10 min → rien ; un autre élève sur le même navigateur peut avoir son passage tout de suite', async ({
	page
}) => {
	test.setTimeout(300_000);
	await stubNapping(page, 2);
	await loginAs(page, E18);
	await page.goto('/dashboard/student/cours');
	await page.waitForLoadState('networkidle');
	// Le Palotin entre et annonce la sieste, avec le lien vers la Chatterie
	await expect(palotinIn(page)).toBeVisible({ timeout: 30_000 });
	await expect(bubble(page)).toContainText('2 Mathoux font la sieste.');
	const link = bubble(page).getByRole('link', { name: 'Aller à la Chatterie' });
	await expect(link).toHaveAttribute('href', '/dashboard/student/chatterie');
	await shootPage(page, '2544-sieste');
	// Il repart (la bulle à lien reste ~20 s), l'écusson revient
	await expect(palotinIn(page)).toHaveCount(0, { timeout: 40_000 });
	await expect(badgeOf(page)).toBeVisible();

	// Recharger avant 10 min : plus rien (heure du dernier passage retenue par le navigateur)
	expect(
		await page.evaluate(() => localStorage.getItem('chiphre:palotin:dernier-passage'))
	).toMatch(/^\d+$/);
	await page.reload();
	await page.waitForLoadState('networkidle');
	await expect(badgeOf(page)).toBeVisible({ timeout: 20_000 });
	await page.waitForTimeout(3000);
	await expect(palotinIn(page)).toHaveCount(0);
	await expect(bubble(page)).not.toHaveText(/\S/);

	// Se déconnecter puis se reconnecter avec un autre élève : son Palotin passe tout de suite
	await logoutStudent(page);
	await loginAs(page, E19);
	await page.goto('/dashboard/student/cours');
	await page.waitForLoadState('networkidle');
	await expect(palotinIn(page)).toBeVisible({ timeout: 30_000 });
	await expect(bubble(page)).toContainText('2 Mathoux font la sieste.');
});

test('#2544 — « Réduire les animations » du système : le Palotin apparaît sans glisser (aucune animation à son entrée) ; sinon il glisse', async ({
	page
}) => {
	test.setTimeout(240_000);
	await loginAs(page, E17);
	/**
	 * Entrée du Palotin par un clic sur l'écusson : les animations de 300 ms (glissement du Palotin)
	 * relevées à chaque image pendant 700 ms ; celle de 150 ms est le fondu du panneau d'état
	 */
	async function animationsOnEntry(): Promise<number> {
		await page.goto('/dashboard/student/cours');
		await page.waitForLoadState('networkidle');
		await expect(badgeOf(page)).toBeVisible({ timeout: 30_000 });
		await page.evaluate(() => {
			(window as unknown as { seen: string[] }).seen = [];
			const sample = () => {
				for (const a of document.getAnimations()) {
					(window as unknown as { seen: string[] }).seen.push(
						`${String(a.effect?.getComputedTiming().duration)}|${a.constructor.name}`
					);
				}
				requestAnimationFrame(sample);
			};
			sample();
		});
		await page.getByRole('button', { name: /^Appeler / }).click();
		await page.waitForTimeout(700);
		const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
		const count = seen.filter((entry) => entry.startsWith('300|')).length;
		await expect(palotinIn(page)).toBeVisible();
		return count;
	}
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	expect(await animationsOnEntry(), 'animations d’entrée de 300 ms').toBeGreaterThan(0);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	expect(await animationsOnEntry(), 'animations d’entrée avec « Réduire les animations »').toBe(0);
});

test('#2544 — élève sans Palotin : le quiz « Choisis ton Palotin ! » sur l’accueil seulement, ni quiz ni écusson ailleurs', async ({
	page
}) => {
	test.setTimeout(240_000);
	await loginAs(page, E20);
	await expect(page.getByRole('heading', { name: 'Choisis ton Palotin !' })).toBeVisible({
		timeout: 20_000
	});
	for (const path of ['/dashboard/student/cours', '/dashboard/revisions']) {
		await openStudentPage(page, path);
		await page.waitForTimeout(2500);
		await expect(page.getByRole('heading', { name: 'Choisis ton Palotin !' }), path).toHaveCount(0);
		await expect(badgeOf(page), path).toHaveCount(0);
		await expect(page.getByTestId('palotin-presence'), path).toHaveCount(0);
	}
});

test('#2544 — prof et visiteur : aucun Palotin, aucun écusson', async ({ page, browser }) => {
	test.setTimeout(240_000);
	const visitor = await browser.newContext(test.info().project.use);
	try {
		const visitorPage = await visitor.newPage();
		await openStudentPage(visitorPage, '/automaths');
		await visitorPage.waitForTimeout(2500);
		await expect(badgeOf(visitorPage)).toHaveCount(0);
		await expect(visitorPage.getByTestId('palotin-presence')).toHaveCount(0);
		await expect(visitorPage.getByRole('button', { name: /Palotin/ })).toHaveCount(0);
	} finally {
		await visitor.close();
	}
	await login(page, TEACHER.email, TEACHER.password);
	await page.waitForLoadState('networkidle');
	for (const path of ['/dashboard/teacher', '/automaths']) {
		await openStudentPage(page, path);
		await page.waitForTimeout(2500);
		await expect(badgeOf(page), path).toHaveCount(0);
		await expect(page.getByTestId('palotin-presence'), path).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Palotin/ }), path).toHaveCount(0);
	}
});

// ============================================================================
// Côté prof : grille points × élèves
// ============================================================================

test('#2565 #2554 — côté prof, grille points × élèves : la réponse compte dès « Valider » (série pas finie) ; « Revoir » n’ajoute rien', async ({
	page,
	browser
}) => {
	test.setTimeout(300_000);
	// Un modèle de 1re spé rangé sous un point du programme : sa colonne n'existe qu'une fois travaillé
	const [point] = await sql<{ id: string; name: string; node_id: string }>(
		`select id::text, name, node_id::text from curriculum_points
		  where grade = '1_SPE' and archived_at is null and node_id is not null order by id limit 1`
	);
	// Le modèle est rangé dans le nœud de l'arbre du point (la base refuse de taguer un modèle non rangé)
	const template = await makeTemplate('grille prof', { grade: '1_SPE', notionId: point.node_id });
	await sql(`insert into question_template_points (template_id, point_id) values ($1, $2)`, [
		template,
		point.id
	]);
	const [klass] = await sql<{ class_id: string }>(
		`select class_id::text from class_members where student_id = $1 and status = 'active' limit 1`,
		[E16.id]
	);

	// Le prof ouvre la grille de la classe de l'élève 16
	const teacherContext = await browser.newContext(test.info().project.use);
	try {
		const teacher = await teacherContext.newPage();
		await login(teacher, TEACHER.email, TEACHER.password);
		await teacher.goto(`/dashboard/teacher/classes/${klass.class_id}/analytics`);
		await teacher.waitForLoadState('networkidle');
		const grid = teacher.getByRole('table', { name: /^Grille points/ });
		const columnHeader = grid.locator(`thead th[title="${point.name.replace(/"/g, '\\"')}"]`);
		// Avant tout travail : pas de colonne pour ce point
		await expect(columnHeader).toHaveCount(0);

		// L'élève 16 valide UNE question de la série de trois (série pas finie)
		await loginAs(page, E16);
		await openSeries(page, seriesUrl([{ templateId: template, quantity: 3, delay: 0 }], 'typing'));
		const card = page.getByTestId('typing-card');
		await card.locator('.flip-card-front').waitFor();
		await typeInto(page, card, '7');
		await validate(page).click();
		await expect(verdictOf(card)).toHaveText('Juste');
		await expect.poll(async () => (await attemptsOf(E16, 'typing', [template])).length).toBe(1);

		// Dès « Valider », la grille du prof montre le point, travaillé par l'élève 16
		await teacher.getByRole('button', { name: 'Actualiser' }).click();
		await expect(columnHeader).toHaveCount(1);
		const row = grid.locator('tbody tr', { hasText: 'Élève 16' });
		const index = await grid
			.locator('thead th')
			.evaluateAll(
				(cells, name) => cells.findIndex((cell) => cell.getAttribute('title') === name),
				point.name
			);
		expect(index).toBeGreaterThan(0);
		const cell = row.locator('td').nth(index);
		await expect(cell.locator('svg[aria-label]')).not.toHaveAttribute(
			'aria-label',
			'Non commencée'
		);
		const label = await cell.locator('svg[aria-label]').getAttribute('aria-label');
		await shootPage(teacher, '2565-grille-prof');

		// L'élève finit sa série (2 ratées) puis « Revoir » : rien ne s'ajoute
		await page.locator('[data-typing-next]').click();
		await card.locator('.flip-card-front').waitFor();
		await validate(page).click();
		await page.locator('[data-typing-next]').click();
		await card.locator('.flip-card-front').waitFor();
		await validate(page).click();
		await page.locator('[data-typing-next]').click();
		await expect(page.getByTestId('typing-summary')).toBeVisible();
		await expect.poll(async () => (await attemptsOf(E16, 'typing', [template])).length).toBe(3);
		await page.getByRole('button', { name: "Revoir celles que je n'avais pas réussies" }).click();
		await card.locator('.flip-card-front').waitFor();
		await typeInto(page, card, '7');
		await validate(page).click();
		await page.locator('[data-typing-next]').click();
		await card.locator('.flip-card-front').waitFor();
		await typeInto(page, card, '7');
		await validate(page).click();
		await page.locator('[data-typing-next]').click();
		await expect(page.getByTestId('typing-summary')).toBeVisible();
		await page.waitForLoadState('networkidle');
		expect((await attemptsOf(E16, 'typing', [template])).length).toBe(3);
		await teacher.getByRole('button', { name: 'Actualiser' }).click();
		await expect(
			grid
				.locator('tbody tr', { hasText: 'Élève 16' })
				.locator('td')
				.nth(index)
				.locator('svg[aria-label]')
		).toHaveAttribute('aria-label', label ?? '');
	} finally {
		await teacherContext.close();
	}
});

test('#2551 — prof, analyse de la classe, « Détail par élève » : la courbe de rétention seule, pleine largeur, plus d’histogramme des notes ; la régularité d’activité est là', async ({
	page
}) => {
	test.setTimeout(240_000);
	const [klass] = await sql<{ class_id: string }>(
		`select class_id::text from class_members where student_id = $1 and status = 'active' limit 1`,
		[E16.id]
	);
	// La courbe a besoin d'au moins 3 révisions récentes sur la branche : on lui en fournit 8 semaines
	// (le rendu est ce qui se vérifie ici, pas le calcul du serveur)
	await page.route('**/analytics/knowledge-retention/**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				points: Array.from({ length: 8 }, (_, week) => ({
					week_start: `2026-10-${String(5 + week * 7).padStart(2, '0')}`,
					retrievability_avg: 0.6 + week * 0.04,
					review_count: 3
				}))
			})
		})
	);
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(`/dashboard/teacher/classes/${klass.class_id}/analytics`);
	await page.waitForLoadState('networkidle');
	const heading = page.getByText(/^Détail par /).first();
	await expect(heading).toBeVisible();
	const retention = page.locator('[data-slot="card"]', { hasText: /^Rétention de / }).last();
	await expect(retention).toBeVisible();
	const curve = retention.getByRole('img', { name: 'Courbe rétention' });
	await expect(curve).toBeVisible();
	// Le « Détail » n'a que cette carte : ni histogramme ni autre graphique
	const detail = page.locator('[data-slot="card"]', { has: retention }).first();
	await expect(detail.locator('[data-slot="card"]')).toHaveCount(1);
	await expect(detail.getByRole('img')).toHaveCount(1);
	await expect(detail.getByText(/histogramme/i)).toHaveCount(0);
	await expect(detail.getByText(/Facile|Difficile|Encore/)).toHaveCount(0);
	// Pleine largeur : la courbe prend l'essentiel de la largeur de sa carte (et la carte, celle du détail)
	const curveBox = await curve.boundingBox();
	const retentionBox = await retention.boundingBox();
	const detailBox = await detail.boundingBox();
	expect(curveBox!.width / retentionBox!.width, 'part de la largeur de la carte').toBeGreaterThan(
		0.8
	);
	expect(retentionBox!.width / detailBox!.width, 'carte dans le détail').toBeGreaterThan(0.8);
	await shootPage(page, '2551-detail-par-eleve');
	// La régularité d'activité (qui a remplacé la carte d'activité) est toujours là
	await expect(page.getByText('Régularité', { exact: true })).toBeVisible();
});

test('#2551 — ÉCART : la légende de « Détail par élève » promet encore une « distribution des grades sur les 7 derniers jours » alors que l’histogramme est retiré', async ({
	page
}) => {
	test.setTimeout(240_000);
	const [klass] = await sql<{ class_id: string }>(
		`select class_id::text from class_members where student_id = $1 and status = 'active' limit 1`,
		[E16.id]
	);
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(`/dashboard/teacher/classes/${klass.class_id}/analytics`);
	await page.waitForLoadState('networkidle');
	await expect(page.getByText(/^Rétention de /)).toBeVisible();
	// La ligne dit « la courbe de rétention seule » : la légende ne doit plus parler de distribution
	test.fail();
	await expect(page.getByText(/distribution des grades/)).toHaveCount(0);
});

// ============================================================================
// Vitrine `/demo/questions` (page publique)
// ============================================================================

test('#2565 — vitrine `/demo/questions`, onglet « Saisie » : « Valider » seul au recto, puis la carte se retourne avec « Suivante »', async ({
	page
}) => {
	test.setTimeout(120_000);
	await openSeries(page, '/demo/questions');
	await page.getByRole('tab', { name: 'Saisie', exact: true }).click();
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor();
	await expect(page.getByTestId('typing-position')).toHaveText(/^Question 1 \/ \d+$/);
	await expect(card.getByRole('button', { name: 'Voir la correction' })).toHaveCount(0);
	await expect(page.locator('.timer-container')).toHaveCount(0);
	// Valider à vide : la carte se retourne seule et montre la réponse
	await validate(page).click();
	await expect(verdictOf(card)).toHaveText('Faux');
	await expect(page.locator('[data-typing-next]')).toHaveText(/Suivante/);
});

test('#2551 — vitrine `/demo/questions`, onglet « Révisions espacées » : deux boutons, chacun avec sa date (« demain » / « dans N jours »)', async ({
	page
}) => {
	test.setTimeout(120_000);
	await openSeries(page, '/demo/questions');
	await page.getByRole('tab', { name: 'Révisions espacées', exact: true }).click();
	await expect(page.getByText(/^Carte 1 sur \d+$/)).toBeVisible();
	await page.getByRole('button', { name: 'Voir la correction' }).click();
	const assess = page.getByTestId('self-assess');
	await expect(assess.getByRole('button')).toHaveText(['Pas réussi', 'Réussi']);
	// Sous chaque bouton, sa date : « Pas réussi » revient demain, « Réussi » plus tard
	await expect(assess.getByText('demain')).toHaveCount(1);
	await expect(assess.getByText(/^dans \d+ jours$/)).toHaveCount(1);
	const missedColumn = assess.locator('div.flex-col', {
		has: page.getByRole('button', { name: 'Pas réussi' })
	});
	await expect(missedColumn).toContainText('demain');
	const succeededColumn = assess.locator('div.flex-col', {
		has: page.getByRole('button', { name: 'Réussi', exact: true })
	});
	await expect(succeededColumn).toContainText(/dans \d+ jours/);
});

test('#2565 — clavier MathLive au téléphone, forme Saisie : toucher la case ouvre le clavier, « Fermer le clavier » le referme, « Valider » retourne la carte', async ({
	page
}) => {
	test.skip(test.info().project.use.isMobile !== true, 'téléphone seulement');
	test.setTimeout(240_000);
	const template = await makeTemplate('2565 clavier', { math: true });
	await loginAs(page, E16);
	await openSeries(page, seriesUrl([{ templateId: template, quantity: 2, delay: 0 }], 'typing'));
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor();
	const field = card.locator('math-field').first();
	await field.scrollIntoViewIfNeeded();
	const keyboardVisible = (): Promise<boolean> =>
		page.evaluate(
			() =>
				(window as unknown as { mathVirtualKeyboard?: { visible: boolean } }).mathVirtualKeyboard
					?.visible === true
		);
	expect(await keyboardVisible(), 'clavier fermé au départ').toBe(false);
	await field.tap();
	await expect.poll(keyboardVisible).toBe(true);
	const close = page.locator('.math-keyboard-close');
	await expect(close).toBeVisible();
	await shootPage(page, '2565-clavier-ouvert');
	await close.tap();
	await expect.poll(keyboardVisible).toBe(false);
	// On tape (clavier de l'appareil), puis « Valider » : la carte se retourne avec son verdict
	// MathLive perd parfois la première frappe : on recommence tant que la case reste vide
	// (la valeur du champ est l'expression entière, « 3+4=\\placeholder[0]{7} »)
	const typed = (): Promise<string> =>
		field.evaluate((el) => (el as HTMLElement & { value: string }).value);
	for (let attempt = 1; attempt <= 3 && !(await typed()).includes('{7}'); attempt++) {
		await field.tap();
		await page.keyboard.type('7', { delay: 80 });
	}
	expect(await typed()).toContain('{7}');
	if (await close.isVisible()) await close.tap();
	await validate(page).tap();
	await expect(verdictOf(card)).toHaveText('Juste');
});
