import {
	expect as baseExpect,
	test,
	type Browser,
	type BrowserContext,
	type Locator,
	type Page
} from '@playwright/test';
import {
	buildSeriesLink,
	SERIES_SEED_PARAM,
	type SeriesItem
} from '../../src/lib/validation/series';
import { allowClipboard, readClipboard } from './helpers/atelier';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { gotoSettled, shoot } from './helpers/pages';
import { decodeQrOnScreen, pathOf } from './helpers/qr';
import { acquireLock, LOCK_WAIT_MAX_MS, refreshLock, releaseLock } from './helpers/verrou';

/**
 * Séries : page d'attente, Recommencer, « Mêmes nombres pour tous » — paquet 9 du tri — base LOCALE
 * ==================================================================================================
 *
 * Reprend #2936 (En classe : page d'attente et réglages), #2984 (Contrôle blanc et Course aux
 * nombres : page d'attente), #2988 (contrôle assigné : page d'attente), #2929 (Recommencer en
 * Course aux nombres) et #2922 (Mêmes nombres pour tous) de `docs/wip/verifications-manuelles.md`.
 *
 *   VERIFS_PORT=5176 pnpm test:verifs e2e/verifs/series-paquet9.spec.ts --project=ordi-chrome
 *
 * Décor : un modèle « Verifs9 … séries-N » publié, dont chaque tirage porte un nombre de quatre
 * chiffres (`tirage n° 4821`) : deux tirages égaux par hasard sont négligeables (1 sur 9000 par
 * question). Une série, deux contrôles assignés à eleve16 (Course aux nombres, Contrôle blanc),
 * un contrôle à date limite passée. Verrou `eleves-16-20` ; tout est retiré en `afterAll` (et au
 * passage suivant après un arrêt brutal : préfixe « Verifs9 <projet> séries-N »).
 *
 * Le prof ne passe PAS en mode test ici (aperçu d'un contrôle qu'il possède, QR) : pas de verrou
 * `compte-prof-mode-test`.
 *
 * Clause périmée de #2984, « contrôle assigné → inchangé (pas de page d'attente) » : #2988
 * (2026-11-22, PR 2b du chantier `diaporama-reglages`) a justement donné une page d'attente au
 * contrôle assigné (`readEvaluationOverview`, `GET /api/evaluations/assignments/[id]`) ; le
 * commentaire de `TestCourse.svelte` le dit. Les tests #2988 ci-dessous jouent le comportement
 * actuel.
 */

/** Serveur de dev partagé : « Préparation du test… » peut durer, d'où des attentes larges */
const expect = baseExpect.configure({ timeout: 40_000 });

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.describe.configure({ mode: 'serial' });
// Machine chargée par d'autres sessions : gestes et chargements aux délais larges
test.use({ actionTimeout: 45_000, navigationTimeout: 60_000 });

// Constantes

const LOCK = 'eleves-16-20';
const STUDENT = { email: 'eleve16@local.test', password: 'local-eleve' };
const CART_KEY = 'chiphre_question_cart';
const SETTINGS_KEY = 'classroomSettings';
const SHOTS = 'series-paquet9';
/** Attente large : le serveur de dev est partagé par cinq agents */
const SLOW = 20_000;
const TIRAGE = /tirage n° (\d{4})/g;

// Décor

let tag = '';
let COURSE_TITLE = '';
let BLANC_TITLE = '';
let LATE_TITLE = '';
let lockHeld = false;
let templateId = '';
let items: SeriesItem[] = [];
/** Deux questions de 5 s : une série qui se termine d'elle-même en 10 s */
let fastItems: SeriesItem[] = [];
let courseEval: { evaluationId: string; assignmentId: string } | null = null;
let blancEval: { evaluationId: string; assignmentId: string } | null = null;
let lateEval: { evaluationId: string; assignmentId: string } | null = null;
const createdEvaluations: string[] = [];
const createdSeries: string[] = [];
const createdCodes = new Set<string>();

const projectName = (): string => test.info().project.name;
const isPhone = (): boolean => test.info().project.use.isMobile === true;

/** Retire modèles, séries, contrôles et copies laissés par un passage interrompu */
async function removeOrphanDecor(): Promise<void> {
	const prefix = 'Verifs9 % séries-%';
	const evaluations = (
		await sql<{ id: string }>(
			`select e.id::text from evaluations e join series s on s.id = e.series_id where s.title like $1`,
			[prefix]
		)
	).map((row) => row.id);
	await removeEvaluations(evaluations);
	await sql(`delete from series where title like $1`, [prefix]);
	await sql(`delete from question_templates where title like $1`, [prefix]);
}

async function removeEvaluations(ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	const sessions = (
		await sql<{ id: string }>(
			`select id::text from test_sessions where evaluation_id = any($1::uuid[])`,
			[ids]
		)
	).map((row) => row.id);
	if (sessions.length > 0) {
		await sql(`delete from evaluation_attempt_questions where test_session_id = any($1::uuid[])`, [
			sessions
		]);
		await sql(`delete from test_answers where test_session_id = any($1::uuid[])`, [sessions]);
		await sql(`delete from test_sessions where id = any($1::uuid[])`, [sessions]);
	}
	await sql(`delete from evaluation_assignments where evaluation_id = any($1::uuid[])`, [ids]);
	await sql(`delete from evaluations where id = any($1::uuid[])`, [ids]);
}

/** Une série du prof (un titre à elle : la carte du contrôle se retrouve par son titre) */
async function makeSeries(title: string): Promise<string> {
	const [series] = await sql<{ id: string }>(
		`insert into series (title, grade, items, created_by)
		 values ($1, '6', $2::jsonb, (select id from profiles where email = $3)) returning id::text`,
		[title, JSON.stringify(items), TEACHER.email]
	);
	createdSeries.push(series.id);
	return series.id;
}

async function makeEvaluation(
	title: string,
	form: 'interactive' | 'course',
	deadline: string | null
): Promise<{ evaluationId: string; assignmentId: string }> {
	const seriesId = await makeSeries(title);
	const [evaluation] = await sql<{ id: string }>(
		`insert into evaluations (series_id, form, time_limit, status, created_by, deadline)
		 values ($1, $2, $3, 'published', (select id from profiles where email = $4), $5::timestamptz)
		 returning id::text`,
		[seriesId, form, form === 'course' ? 120 : null, TEACHER.email, deadline]
	);
	createdEvaluations.push(evaluation.id);
	const [assignment] = await sql<{ id: string }>(
		`insert into evaluation_assignments (evaluation_id, student_id, assigned_by)
		 values ($1, (select id from profiles where email = $2), (select id from profiles where email = $3))
		 returning id::text`,
		[evaluation.id, STUDENT.email, TEACHER.email]
	);
	return { evaluationId: evaluation.id, assignmentId: assignment.id };
}

test.beforeAll(async () => {
	const testInfo = test.info();
	test.setTimeout(LOCK_WAIT_MAX_MS + 120_000);
	assertLocalServerEnv();
	await acquireLock(LOCK);
	lockHeld = true;
	await removeOrphanDecor();
	tag = `Verifs9 ${testInfo.project.name} séries-${testInfo.parallelIndex}`;
	COURSE_TITLE = `${tag} course`;
	BLANC_TITLE = `${tag} blanc`;
	LATE_TITLE = `${tag} tardif`;

	const variations = [
		{
			statement: 'Combien font 3 + 4 ? (tirage n° {{n}}) [_]',
			variables: [{ name: 'n', expression: '1000..9999' }],
			blanks: [{ expectedAnswer: '7' }],
			correction: { steps: ['On additionne : $3 + 4 = 7$.'] }
		}
	];
	const [template] = await sql<{ id: string }>(
		`insert into question_templates (type, grades, level, variations, status, title, created_by, options)
		 values ('fill_in_blanks', array['6'], 1, $1::jsonb, 'published', $2,
		         (select id from profiles where email = $3), '{}'::jsonb)
		 returning id::text`,
		[JSON.stringify(variations), `${tag} modèle`, TEACHER.email]
	);
	templateId = template.id;
	items = [{ templateId, quantity: 3, delay: 10 }];
	fastItems = [{ templateId, quantity: 2, delay: 5 }];

	courseEval = await makeEvaluation(COURSE_TITLE, 'course', null);
	blancEval = await makeEvaluation(BLANC_TITLE, 'interactive', null);
	lateEval = await makeEvaluation(
		LATE_TITLE,
		'course',
		new Date(Date.now() - 86_400_000).toISOString()
	);
});

// Le fichier dure plus que les 30 min au bout desquelles un verrou est repris
test.beforeEach(() => {
	// Machine chargée : le délai par défaut (60 s) est trop court pour les chargements
	test.info().setTimeout(180_000);
	if (lockHeld) refreshLock(LOCK);
});

test.afterAll(async () => {
	try {
		await removeEvaluations(createdEvaluations);
		if (createdSeries.length > 0) {
			await sql(`delete from series where id = any($1::uuid[])`, [createdSeries]);
		}
		if (templateId) {
			await sql(`delete from skill_attempts where template_id = $1`, [templateId]);
			await sql(`delete from question_templates where id = $1`, [templateId]);
		}
		for (const code of createdCodes) await sql('delete from short_links where code = $1', [code]);
	} finally {
		if (lockHeld) releaseLock(LOCK);
	}
});

// Fonctions

/** Met une série dans « Ma série » (localStorage) avant le premier chargement */
async function seedCart(page: Page, value: unknown): Promise<void> {
	await page.addInitScript(
		([key, json]) => {
			if (!sessionStorage.getItem('verifs9-cart')) {
				localStorage.setItem(key, json);
				sessionStorage.setItem('verifs9-cart', '1');
			}
		},
		[CART_KEY, JSON.stringify(value)] as const
	);
}

/** Réglages « En classe » posés avant le premier chargement (une seule fois : un rechargement les relit) */
async function seedSettings(page: Page, settings: Record<string, unknown>): Promise<void> {
	await page.addInitScript(
		([key, json]) => {
			if (!sessionStorage.getItem('verifs9-settings')) {
				localStorage.setItem(key, json);
				sessionStorage.setItem('verifs9-settings', '1');
			}
		},
		[SETTINGS_KEY, JSON.stringify({ fullscreenOnStart: false, ...settings })] as const
	);
}

/** « Ma série » → « Commencer un test » → la forme (la Course demande « Commencer le test » en plus) */
async function startFromCart(
	page: Page,
	form: 'En classe' | 'Contrôle blanc' | 'Course aux nombres'
): Promise<void> {
	await seedCart(page, items);
	await gotoSettled(page, '/automaths/panier');
	await page.getByRole('button', { name: /Commencer un test/ }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByText(form, { exact: true }).click();
	if (form === 'Course aux nombres') {
		const start = dialog.getByRole('button', { name: 'Commencer le test' });
		await start.scrollIntoViewIfNeeded();
		await start.click();
	}
	await expect(page).toHaveURL(/\/automaths\/test\?/);
	await awaitStart(page);
}

const startButton = (page: Page): Locator => page.getByRole('button', { name: "C'est parti !" });

/** Page de démonstration : sa première compilation par le serveur de dev peut durer */
async function gotoDemo(page: Page): Promise<void> {
	await page.goto('/demo/questions', { timeout: 200_000 });
	await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
}

/** Attend la page d'attente (les modèles se chargent), puis « C'est parti ! » */
async function awaitStart(page: Page): Promise<void> {
	// Machine chargée : « Préparation du test… » reste parfois collé ; un rechargement le délivre
	const visible = await startButton(page)
		.waitFor({ timeout: 25_000 })
		.then(
			() => true,
			() => false
		);
	if (!visible) {
		await page.reload();
		await page.waitForLoadState('networkidle');
	}
	await expect(startButton(page)).toBeVisible();
}

async function begin(page: Page): Promise<void> {
	for (let attempt = 1; attempt <= 3; attempt++) {
		await awaitStart(page);
		await startButton(page).click();
		if (!page.url().includes('mode=display')) return;
		// Projection « En classe » : un rechargement à chaud du serveur de dev (modifs d'autres
		// sessions) la laisse parfois sans diapositive ; on le constate et on relance
		const shown = await expect
			.poll(
				async () =>
					(await classroomPosition(page)
						.innerText()
						.catch(() => '')) !== '',
				{
					timeout: 15_000
				}
			)
			.toBe(true)
			.then(
				() => true,
				() => false
			);
		if (shown) return;
		test.info().annotations.push({
			type: 'charge',
			description: `projection sans diapositive au lancement ${attempt}, relancée`
		});
		await page.reload();
		await page.waitForLoadState('networkidle');
	}
}
const summaryOf = (page: Page): Locator => page.getByTestId('series-start-summary');

/** Les nombres des tirages affichés (« tirage n° 4821 »), dans l'ordre de la page */
async function tirages(page: Page): Promise<string[]> {
	const text = await page.locator('body').innerText();
	return [...text.matchAll(TIRAGE)].map((match) => match[1]);
}

/** Les nombres des tirages d'une Course, une fois ses questions affichées */
async function courseNumbers(page: Page, count: number): Promise<string[]> {
	await expect.poll(async () => (await tirages(page)).length, { timeout: SLOW }).toBe(count);
	return tirages(page);
}

/** Temps restant du chrono (secondes) d'un Contrôle blanc ou d'une Course */
async function timerSeconds(page: Page): Promise<number> {
	return Number.parseInt(await page.locator('.timer-container span').first().innerText(), 10);
}

/** Position affichée par la projection « En classe » */
const classroomPosition = (page: Page): Locator => page.getByTestId('classroom-position');

/** Une réponse quelconque à la question n° `index` d'une Course, puis « Valider » */
async function answerCourseQuestion(page: Page, index: number): Promise<void> {
	const card = page.locator(`#question-${index}`);
	const field = card.locator('math-field').first();
	const validate = card.getByRole('button', { name: 'Valider' });
	for (let attempt = 1; attempt <= 4 && !(await validate.isEnabled()); attempt++) {
		if ((await field.count()) > 0) {
			await field.scrollIntoViewIfNeeded();
			const box = await field.boundingBox();
			await field.click({ position: { x: Math.max(5, (box?.width ?? 20) - 15), y: 10 } });
			await page.waitForTimeout(500);
			await page.keyboard.type('7', { delay: 80 });
		} else {
			await card.locator('input').first().fill('7');
		}
	}
	await validate.click();
}

/** Contexte neuf du même projet : « un autre appareil » (aucun stockage partagé) */
async function otherDevice(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
	const context = await browser.newContext(test.info().project.use);
	return { context, page: await context.newPage() };
}

/** Course : ouvre le lien, passe la page d'attente, rend les nombres affichés */
async function playCourse(page: Page, link: string, count: number): Promise<string[]> {
	await gotoSettled(page, link);
	await begin(page);
	return courseNumbers(page, count);
}

// #2936 ----------------------------------------------------------------------------------------

test.describe('#2936 — En classe : page d’attente et réglages', () => {
	test('#2936 — panier → « En classe » : « n questions · environ t », réglages, indications, « C’est parti ! », rien ne bouge avant le clic', async ({
		page
	}) => {
		await startFromCart(page, 'En classe');
		await expect(page.getByRole('heading', { name: 'En classe', level: 2 })).toBeVisible();
		await expect(summaryOf(page)).toHaveText('3 questions · environ 30 s');
		await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible();
		for (const label of [
			'Plein écran au lancement',
			'Correction après chaque question',
			'Pause à la fin du temps',
			'Son entre deux questions'
		]) {
			await expect(page.getByRole('checkbox', { name: label })).toBeVisible();
		}
		const hints = page.getByTestId('series-start-hints');
		await expect(hints).toContainText('Espace');
		await expect(hints).toContainText('plein écran');
		await expect(hints).toContainText('← →');
		await expect(startButton(page)).toBeVisible();
		// Rien ne bouge avant le clic : ni projection, ni minuteur
		await page.waitForTimeout(2500);
		await expect(classroomPosition(page)).toHaveCount(0);
		await expect(page.getByTestId('classroom-remaining')).toHaveCount(0);
		await shoot(page, `${SHOTS}-2936-attente`, projectName());
	});

	test('#2936 — les réglages de la page d’attente changent le résumé : correction après chaque question (+ durée), puis rechargement → réglages gardés', async ({
		page
	}) => {
		await gotoSettled(page, buildSeriesLink('', items, { mode: 'display' }));
		await awaitStart(page);
		await expect(summaryOf(page)).toHaveText('3 questions · environ 30 s');
		await page.getByRole('checkbox', { name: 'Correction après chaque question' }).click();
		// 3 × 10 s de questions + 3 × 10 s de corrections = 60 s
		await expect(summaryOf(page)).toHaveText('3 questions · environ 1 min');
		const seconds = page.getByTestId('classroom-correction-seconds');
		await expect(seconds).toHaveText('10 s');
		await page.getByRole('button', { name: 'Réduire la durée de correction' }).click();
		await expect(seconds).toHaveText('5 s');
		await expect(summaryOf(page)).toHaveText('3 questions · environ 45 s');
		await page.getByRole('button', { name: 'Augmenter la durée de correction' }).click();
		await page.getByRole('button', { name: 'Augmenter la durée de correction' }).click();
		await expect(seconds).toHaveText('15 s');
		await page.getByRole('checkbox', { name: 'Pause à la fin du temps' }).click();
		await page.getByRole('checkbox', { name: 'Son entre deux questions' }).click();
		await page.getByRole('checkbox', { name: 'Plein écran au lancement' }).click();

		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(
			page.getByRole('checkbox', { name: 'Correction après chaque question' })
		).toBeChecked();
		await expect(page.getByTestId('classroom-correction-seconds')).toHaveText('15 s');
		await expect(page.getByRole('checkbox', { name: 'Pause à la fin du temps' })).toBeChecked();
		await expect(page.getByRole('checkbox', { name: 'Son entre deux questions' })).toBeChecked();
		// Le plein écran, allumé par défaut, a été éteint : l'état éteint est gardé aussi
		await expect(
			page.getByRole('checkbox', { name: 'Plein écran au lancement' })
		).not.toBeChecked();
		await expect(summaryOf(page)).toHaveText('3 questions · environ 1 min');
	});

	test('#2936 — « C’est parti ! » → plein écran direct, sur la première question, chrono parti', async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.removeItem('classroomSettings'));
		await gotoSettled(page, buildSeriesLink('', items, { mode: 'display' }));
		await awaitStart(page);
		await expect(page.getByRole('checkbox', { name: 'Plein écran au lancement' })).toBeChecked();
		await begin(page);
		await expect(classroomPosition(page)).toHaveText('Question 1 / 3');
		const remaining = Number(await page.getByTestId('classroom-remaining').innerText());
		expect(remaining).toBeLessThanOrEqual(10);
		if (isPhone()) {
			// Un téléphone n'ouvre pas de plein écran de page : on constate seulement la demande
			test.info().annotations.push({
				type: 'limite',
				description: 'plein écran non vérifiable sur téléphone émulé'
			});
		} else {
			// Headless : le navigateur peut refuser `requestFullscreen` ; on lit ce qu'il a accordé
			await expect
				.poll(() => page.evaluate(() => document.fullscreenElement !== null), { timeout: 8000 })
				.toBe(true);
		}
		await shoot(page, `${SHOTS}-2936-projection`, projectName());
	});

	test('#2936 — correction après chaque question : « Correction i / n » avec le verso, durée de correction mesurée', async ({
		page
	}) => {
		test.setTimeout(90_000);
		await seedSettings(page, { correctionAfterEach: true, correctionSeconds: 5 });
		await gotoSettled(page, buildSeriesLink('', fastItems, { mode: 'display' }));
		await awaitStart(page);
		await begin(page);
		await expect(classroomPosition(page)).toHaveText('Question 1 / 2');
		const startedAt = Date.now();
		await expect(classroomPosition(page)).toHaveText('Correction 1 / 2', { timeout: SLOW });
		const questionMs = Date.now() - startedAt;
		// Le verso de la carte : la bonne réponse, pas l'énoncé seul
		const projection = page.locator('.classroom-projection');
		await expect(projection.getByText('7', { exact: true }).first()).toBeVisible();
		const fontPx = await projection
			.getByText('7', { exact: true })
			.first()
			.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
		const correctionAt = Date.now();
		await expect(page.getByTestId('classroom-duration')).toHaveText('5 s');
		await expect(classroomPosition(page)).toHaveText('Question 2 / 2', { timeout: SLOW });
		const correctionMs = Date.now() - correctionAt;
		test.info().annotations.push({
			type: 'mesure',
			description: `question ${questionMs} ms (attendu ~5000), correction ${correctionMs} ms (attendu ~5000), réponse en ${fontPx} px (lisible de loin : à juger au vidéoprojecteur)`
		});
		expect(questionMs).toBeGreaterThan(3500);
		expect(questionMs).toBeLessThan(8500);
		expect(correctionMs).toBeGreaterThan(3500);
		expect(correctionMs).toBeLessThan(8500);
		await shoot(page, `${SHOTS}-2936-correction`, projectName());
	});

	test('#2936 — −5 s / +5 s change la durée du modèle sans remise à zéro : mesure d’une question à 5 s', async ({
		page
	}) => {
		test.setTimeout(90_000);
		await seedSettings(page, {});
		await gotoSettled(page, buildSeriesLink('', items, { mode: 'display' }));
		await awaitStart(page);
		await begin(page);
		await expect(classroomPosition(page)).toHaveText('Question 1 / 3');
		const duration = page.getByTestId('classroom-duration');
		await expect(duration).toHaveText('10 s');
		await page.getByRole('button', { name: 'Augmenter la durée de 5 secondes' }).click();
		await expect(duration).toHaveText('15 s');
		await page.getByRole('button', { name: 'Réduire la durée de 5 secondes' }).click();
		await page.getByRole('button', { name: 'Réduire la durée de 5 secondes' }).click();
		await expect(duration).toHaveText('5 s');
		// Minimum 5 s : le bouton « − » est grisé
		await expect(
			page.getByRole('button', { name: 'Réduire la durée de 5 secondes' })
		).toHaveAttribute('aria-disabled', 'true');
		await expect(classroomPosition(page)).toHaveText('Question 2 / 3', { timeout: SLOW });
		const secondAt = Date.now();
		await expect(classroomPosition(page)).toHaveText('Question 3 / 3', { timeout: SLOW });
		const ms = Date.now() - secondAt;
		test.info().annotations.push({ type: 'mesure', description: `question à 5 s : ${ms} ms` });
		expect(ms).toBeGreaterThan(3500);
		expect(ms).toBeLessThan(7500);
	});

	test('#2936 — pause à la fin du temps : « Temps écoulé — Espace pour continuer », Espace passe à la suite', async ({
		page
	}) => {
		test.setTimeout(90_000);
		await seedSettings(page, { pauseAtEnd: true });
		await gotoSettled(page, buildSeriesLink('', fastItems, { mode: 'display' }));
		await awaitStart(page);
		await begin(page);
		await expect(classroomPosition(page)).toHaveText('Question 1 / 2');
		await expect(page.getByText('Temps écoulé — Espace pour continuer')).toBeVisible({
			timeout: SLOW
		});
		// La question reste affichée en pause
		await page.waitForTimeout(2500);
		await expect(classroomPosition(page)).toHaveText('Question 1 / 2');
		await page.keyboard.press('Space');
		await expect(classroomPosition(page)).toHaveText('Question 2 / 2');
		await expect(page.getByText('Temps écoulé — Espace pour continuer')).toHaveCount(0);
	});

	test('#2936 — son : un son est demandé à chaque nouvelle question (le volume ne se juge pas ici)', async ({
		page
	}) => {
		test.setTimeout(90_000);
		await page.addInitScript(() => {
			const holder = window as unknown as { __oscillators: number };
			holder.__oscillators = 0;
			const original = AudioContext.prototype.createOscillator;
			AudioContext.prototype.createOscillator = function (this: AudioContext) {
				holder.__oscillators += 1;
				return original.call(this);
			};
		});
		await seedSettings(page, { chime: true });
		await gotoSettled(page, buildSeriesLink('', fastItems, { mode: 'display' }));
		await awaitStart(page);
		await expect(page.getByRole('checkbox', { name: 'Son entre deux questions' })).toBeChecked();
		await begin(page);
		await expect(classroomPosition(page)).toHaveText('Question 1 / 2');
		const count = () =>
			page.evaluate(() => (window as unknown as { __oscillators: number }).__oscillators);
		const first = await count();
		await expect(classroomPosition(page)).toHaveText('Question 2 / 2', { timeout: SLOW });
		await expect.poll(count).toBeGreaterThan(first);
	});

	test('#2936 — ⚙ pendant la série : pause, cases au clavier (Espace coche, Échap ferme), allumer la correction garde la question', async ({
		page
	}) => {
		test.setTimeout(90_000);
		await seedSettings(page, {});
		await gotoSettled(page, buildSeriesLink('', fastItems, { mode: 'display' }));
		await awaitStart(page);
		await begin(page);
		await expect(classroomPosition(page)).toHaveText('Question 2 / 2', { timeout: SLOW });

		await page.getByRole('button', { name: 'Réglages', exact: true }).click();
		const panel = page.getByTestId('classroom-settings-panel');
		await expect(panel).toBeVisible();
		// Pause : le temps restant ne bouge plus
		const before = await page.getByTestId('classroom-remaining').innerText();
		await page.waitForTimeout(2200);
		expect(await page.getByTestId('classroom-remaining').innerText()).toBe(before);
		await expect(page.getByRole('button', { name: 'Reprendre' })).toBeVisible();
		// Le focus est dans le panneau ; Espace sur une case la coche (sans reprendre ni avancer)
		expect(
			await page.evaluate(() => document.activeElement?.closest('[data-settings-panel]') !== null)
		).toBe(true);
		const correction = panel.getByRole('checkbox', { name: 'Correction après chaque question' });
		await correction.focus();
		await page.keyboard.press('Space');
		await expect(correction).toBeChecked();
		await expect(classroomPosition(page)).toHaveText('Question 2 / 2');
		await expect(panel.getByRole('checkbox', { name: 'Plein écran au lancement' })).toHaveCount(0);
		// Échap ferme le panneau ; la question affichée est gardée (pas « Correction 1 / 2 » ni la 1)
		await page.keyboard.press('Escape');
		await expect(panel).toHaveCount(0);
		await expect(classroomPosition(page)).toHaveText('Question 2 / 2');
		// Le diaporama a repris : la suite arrive, c'est la correction de la question 2
		await expect(classroomPosition(page)).toHaveText('Correction 2 / 2', { timeout: SLOW });
	});

	test('#2936 — « Recommencer » → page d’attente ; /demo/questions, onglet « En classe » : page d’attente', async ({
		page
	}) => {
		test.setTimeout(300_000);
		await seedSettings(page, {});
		await gotoSettled(page, buildSeriesLink('', fastItems, { mode: 'display' }));
		await awaitStart(page);
		await begin(page);
		await expect(page.getByRole('heading', { name: 'Série terminée' })).toBeVisible({
			timeout: 40_000
		});
		await page.getByRole('button', { name: 'Recommencer' }).click();
		await expect(page.getByRole('heading', { name: 'En classe', level: 2 })).toBeVisible();
		await expect(summaryOf(page)).toBeVisible();
		await expect(startButton(page)).toBeVisible();
		await expect(classroomPosition(page)).toHaveCount(0);

		await gotoDemo(page);
		await expect(page.getByRole('tab', { name: 'En classe' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(startButton(page).locator('visible=true')).toBeVisible();
		await expect(summaryOf(page).locator('visible=true')).toHaveText(/^\d+ questions? · environ /);
	});
});

// #2984 ----------------------------------------------------------------------------------------

test.describe('#2984 — Contrôle blanc et Course aux nombres : page d’attente', () => {
	test('#2984 — panier → « Contrôle blanc » : « n questions · environ t », rien ne bouge avant « C’est parti ! », puis chrono de la question 1', async ({
		page
	}) => {
		await startFromCart(page, 'Contrôle blanc');
		await expect(page.getByRole('heading', { name: 'Contrôle blanc', level: 2 })).toBeVisible();
		await expect(summaryOf(page)).toHaveText('3 questions · environ 30 s');
		await page.waitForTimeout(2500);
		await expect(page.getByTestId('interactive-position')).toHaveCount(0);
		await expect(page.locator('.timer-container')).toHaveCount(0);
		await begin(page);
		await expect(page.getByTestId('interactive-position')).toHaveText('Question 1 sur 3');
		const first = await timerSeconds(page);
		expect(first).toBeLessThanOrEqual(10);
		expect(first).toBeGreaterThan(5);
		await expect.poll(() => timerSeconds(page), { timeout: 8000 }).toBeLessThan(first);
	});

	test('#2984 — panier → « Course aux nombres » (5 min) : « n questions · 5 min », chrono global au clic', async ({
		page
	}) => {
		await startFromCart(page, 'Course aux nombres');
		await expect(page.getByRole('heading', { name: 'Course aux nombres', level: 2 })).toBeVisible();
		await expect(summaryOf(page)).toHaveText('3 questions · 5 min');
		await page.waitForTimeout(2500);
		await expect(page.locator('.timer-container')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Terminer' })).toHaveCount(0);
		await begin(page);
		await expect(page.getByRole('button', { name: 'Terminer' })).toBeVisible();
		const first = await timerSeconds(page);
		expect(first).toBeLessThanOrEqual(300);
		expect(first).toBeGreaterThan(290);
		await expect.poll(() => timerSeconds(page), { timeout: 8000 }).toBeLessThan(first);
		await shoot(page, `${SHOTS}-2984-course`, projectName());
	});

	test('#2984 — Contrôle blanc : « Recommencer » → page d’attente', async ({ page }) => {
		test.setTimeout(90_000);
		await gotoSettled(page, buildSeriesLink('', fastItems, { mode: 'interactive' }));
		await awaitStart(page);
		await expect(summaryOf(page)).toHaveText('2 questions · environ 10 s');
		await begin(page);
		await expect(page.getByTestId('interactive-position')).toHaveText('Question 1 sur 2');
		const restart = page.getByRole('button', { name: /^Recommencer/ });
		await expect(restart).toBeVisible({ timeout: 40_000 });
		await restart.click();
		await expect(page.getByRole('heading', { name: 'Contrôle blanc', level: 2 })).toBeVisible();
		await expect(summaryOf(page)).toBeVisible();
		await expect(page.getByTestId('interactive-position')).toHaveCount(0);
		await expect(page.locator('.timer-container')).toHaveCount(0);
		await begin(page);
		await expect(page.getByTestId('interactive-position')).toHaveText('Question 1 sur 2');
	});

	test('#2984 — Course : « Recommencer » → page d’attente (« n questions · 5 min »), chrono à neuf au clic', async ({
		page
	}) => {
		await gotoSettled(page, buildSeriesLink('', items, { mode: 'course', timeLimit: 300 }));
		await awaitStart(page);
		await begin(page);
		await courseNumbers(page, 3);
		page.once('dialog', (dialog) => void dialog.accept());
		await page.getByRole('button', { name: 'Terminer' }).click();
		await page.getByRole('button', { name: 'Recommencer avec de nouvelles questions' }).click();
		await expect(page.getByRole('heading', { name: 'Course aux nombres', level: 2 })).toBeVisible();
		await expect(summaryOf(page)).toHaveText('3 questions · 5 min');
		await expect(page.locator('.timer-container')).toHaveCount(0);
		await begin(page);
		expect(await timerSeconds(page)).toBeGreaterThan(290);
	});

	test('#2984 — Flash-cards et Saisie : inchangés, aucune page d’attente', async ({ page }) => {
		await gotoSettled(page, buildSeriesLink('', items, { mode: 'flash' }));
		await expect(page.getByTestId('flash-card')).toBeVisible();
		await expect(startButton(page)).toHaveCount(0);
		await expect(summaryOf(page)).toHaveCount(0);
		await gotoSettled(page, buildSeriesLink('', items, { mode: 'typing' }));
		await expect(page.getByTestId('typing-card')).toBeVisible();
		await expect(startButton(page)).toHaveCount(0);
		await expect(summaryOf(page)).toHaveCount(0);
	});

	test('#2984 — /demo/questions, onglets « Contrôle blanc » et « Course aux nombres » : page d’attente', async ({
		page
	}) => {
		test.setTimeout(300_000);
		await gotoDemo(page);
		await page.getByRole('tab', { name: 'Contrôle blanc' }).click();
		await expect(page.getByRole('heading', { name: 'Contrôle blanc', level: 2 })).toBeVisible();
		await expect(summaryOf(page).locator('visible=true')).toHaveText(/^\d+ questions? · environ /);
		await expect(startButton(page).locator('visible=true')).toBeVisible();
		await page.getByRole('tab', { name: 'Course aux nombres' }).click();
		await expect(page.getByRole('heading', { name: 'Course aux nombres', level: 2 })).toBeVisible();
		await expect(summaryOf(page).locator('visible=true')).toHaveText(/^\d+ questions? · /);
		await expect(startButton(page).locator('visible=true')).toBeVisible();
	});
});

// #2988 ----------------------------------------------------------------------------------------

/** Le nombre de séances (tentatives) de l'élève sur ce contrôle, lu en base */
async function attemptsOf(evaluationId: string): Promise<number> {
	const [row] = await sql<{ n: string }>(
		`select count(*)::text as n from test_sessions
		  where evaluation_id = $1 and user_id = (select id from profiles where email = $2)`,
		[evaluationId, STUDENT.email]
	);
	return Number(row.n);
}

test.describe('#2988 — contrôle assigné : page d’attente avant le démarrage', () => {
	test('#2988 — Course aux nombres assignée : titre + résumé, aucun chrono avant « C’est parti ! », quitter / revenir sans compter la tentative, puis reprise', async ({
		page
	}) => {
		test.setTimeout(150_000);
		const evaluation = courseEval!;
		expect(await attemptsOf(evaluation.evaluationId)).toBe(0);
		await login(page, STUDENT.email, STUDENT.password);
		await gotoSettled(page, '/dashboard/student/assessments');
		const card = page.locator('div', { hasText: COURSE_TITLE }).filter({
			has: page.getByRole('button', { name: 'Commencer' })
		});
		await card.last().getByRole('button', { name: 'Commencer' }).click();
		await expect(page).toHaveURL(/\/automaths\/test\?assignment=/);
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: COURSE_TITLE, level: 2 })).toBeVisible();
		await expect(summaryOf(page)).toHaveText('Course aux nombres · 3 questions · 2 min');
		await page.waitForTimeout(2500);
		await expect(page.locator('.timer-container')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Terminer' })).toHaveCount(0);
		expect(await attemptsOf(evaluation.evaluationId)).toBe(0);
		await shoot(page, `${SHOTS}-2988-attente`, projectName());

		// Quitter, puis revenir avant de cliquer : toujours la page d'attente, rien de compté
		await page.getByRole('link', { name: 'Quitter' }).click();
		await expect(page).toHaveURL(/\/dashboard\/student\/assessments/);
		await gotoSettled(page, `/automaths/test?assignment=${evaluation.assignmentId}`);
		await expect(summaryOf(page)).toHaveText('Course aux nombres · 3 questions · 2 min');
		await expect(startButton(page)).toBeVisible();
		expect(await attemptsOf(evaluation.evaluationId)).toBe(0);

		// « C'est parti ! » : la tentative démarre (une séance), le chrono part
		await begin(page);
		await expect(page.getByRole('button', { name: 'Terminer' })).toBeVisible({ timeout: SLOW });
		expect(await timerSeconds(page)).toBeLessThanOrEqual(120);
		expect(await attemptsOf(evaluation.evaluationId)).toBe(1);
		await answerCourseQuestion(page, 0);
		await expect(page.getByText('1 / 3 répondu')).toBeVisible();

		// Recharger : reprise annoncée, bouton « Reprendre »
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(summaryOf(page)).toHaveText(
			/^Tu reprends ton contrôle : il te reste (\d+ min )?(\d+ s)?$/
		);
		const resume = page.getByRole('button', { name: 'Reprendre' });
		await expect(resume).toBeVisible();
		await expect(startButton(page)).toHaveCount(0);
		expect(await attemptsOf(evaluation.evaluationId)).toBe(1);
		await resume.click();
		await expect(page.getByRole('button', { name: 'Terminer' })).toBeVisible({ timeout: SLOW });
		// Reprise : même tentative, pas une deuxième
		expect(await attemptsOf(evaluation.evaluationId)).toBe(1);
	});

	test('#2988 — Contrôle blanc assigné : « Contrôle blanc · n questions · environ t »', async ({
		page
	}) => {
		await login(page, STUDENT.email, STUDENT.password);
		await gotoSettled(page, `/automaths/test?assignment=${blancEval!.assignmentId}`);
		await expect(page.getByRole('heading', { name: BLANC_TITLE, level: 2 })).toBeVisible();
		await expect(summaryOf(page)).toHaveText('Contrôle blanc · 3 questions · environ 30 s');
		await expect(page.getByTestId('interactive-position')).toHaveCount(0);
		await expect(startButton(page)).toBeVisible();
		expect(await attemptsOf(blancEval!.evaluationId)).toBe(0);
	});

	test('#2988 — contrôle à date limite passée : le message dès l’ouverture, pas de page d’attente', async ({
		page
	}) => {
		await login(page, STUDENT.email, STUDENT.password);
		await gotoSettled(page, `/automaths/test?assignment=${lateEval!.assignmentId}`);
		await expect(page.getByText('La date limite est dépassée')).toBeVisible();
		await expect(startButton(page)).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Mes contrôles' })).toBeVisible();
		expect(await attemptsOf(lateEval!.evaluationId)).toBe(0);
	});

	test('#2988 — prof, aperçu d’un contrôle : page d’attente, « Quitter » vers l’espace prof, aucune tentative créée', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, `/automaths/test?assignment=${courseEval!.assignmentId}`);
		await expect(page.getByRole('heading', { name: COURSE_TITLE, level: 2 })).toBeVisible();
		await expect(summaryOf(page)).toHaveText('Course aux nombres · 3 questions · 2 min');
		await expect(startButton(page)).toBeVisible();
		await page.getByRole('link', { name: 'Quitter' }).click();
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments/);
		const [row] = await sql<{ n: string }>(
			`select count(*)::text as n from test_sessions where evaluation_id = $1 and user_id = (select id from profiles where email = $2)`,
			[courseEval!.evaluationId, TEACHER.email]
		);
		expect(Number(row.n)).toBe(0);
	});
});

// #2929 ----------------------------------------------------------------------------------------

test.describe('#2929 — Recommencer en Course aux nombres', () => {
	/** Une Course lancée par `launch`, une réponse, « Terminer », puis le bouton de recommencement */
	async function finishAndRestart(
		page: Page,
		buttonName: string
	): Promise<{ before: string[]; after: string[] }> {
		await begin(page);
		const before = await courseNumbers(page, 3);
		await answerCourseQuestion(page, 0);
		await expect(page.getByText('1 / 3 répondu')).toBeVisible();
		const elapsed = await timerSeconds(page);
		page.once('dialog', (dialog) => void dialog.accept());
		await page.getByRole('button', { name: 'Terminer' }).click();
		await page.getByRole('button', { name: buttonName }).click();
		// Recommencer → page d'attente, puis la course repart au clic
		await expect(summaryOf(page)).toHaveText('3 questions · 5 min');
		await begin(page);
		const after = await courseNumbers(page, 3);
		// Chrono reparti à zéro : le temps restant est celui d'une course neuve
		expect(await timerSeconds(page)).toBeGreaterThanOrEqual(elapsed);
		expect(await timerSeconds(page)).toBeGreaterThan(290);
		// Réponses vides
		await expect(page.getByText('0 / 3 répondu')).toBeVisible();
		return { before, after };
	}

	test('#2929 — lien de série : « Recommencer avec de nouvelles questions » → autres nombres, chrono à neuf, réponses vides', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await gotoSettled(page, buildSeriesLink('', items, { mode: 'course', timeLimit: 300 }));
		await awaitStart(page);
		const { before, after } = await finishAndRestart(
			page,
			'Recommencer avec de nouvelles questions'
		);
		expect(after, `avant ${before.join(',')} / après ${after.join(',')}`).not.toEqual(before);
	});

	test('#2929 — Ma série : « Recommencer avec de nouvelles questions » → autres nombres, chrono à neuf, réponses vides', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await startFromCart(page, 'Course aux nombres');
		const { before, after } = await finishAndRestart(
			page,
			'Recommencer avec de nouvelles questions'
		);
		expect(after, `avant ${before.join(',')} / après ${after.join(',')}`).not.toEqual(before);
	});

	test('#2929 — lien « Mêmes nombres pour tous » : « Recommencer les mêmes questions » → mêmes nombres, chrono à neuf, réponses vides', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await gotoSettled(
			page,
			buildSeriesLink('', items, { mode: 'course', timeLimit: 300, seed: 2929 })
		);
		await awaitStart(page);
		const { before, after } = await finishAndRestart(page, 'Recommencer les mêmes questions');
		expect(after).toEqual(before);
	});
});

// #2922 ----------------------------------------------------------------------------------------

/** « Ma série » → forme du lien choisie dans « Copier le lien » */
async function chooseLinkForm(page: Page, form: string): Promise<void> {
	await page.getByRole('combobox', { name: 'Forme du lien' }).click();
	await page.getByRole('option', { name: form, exact: true }).click();
}

const sameNumbers = (page: Page): Locator =>
	page.getByRole('checkbox', { name: 'Mêmes nombres pour tous' });

/** « Copier le lien » puis lecture du presse-papiers */
async function copiedLink(page: Page): Promise<URL> {
	await allowClipboard(page);
	await page.getByRole('button', { name: 'Copier le lien' }).click();
	await expect(page.getByText('Lien copié').first()).toBeVisible();
	return new URL(await readClipboard(page));
}

test.describe('#2922 — Mêmes nombres pour tous', () => {
	test('#2922 — « Copier le lien » : sans forme pas de case ; forme « En classe » → case décochée ; la cocher met une graine dans le lien', async ({
		page
	}) => {
		await seedCart(page, items);
		await gotoSettled(page, '/automaths/panier');
		await expect(sameNumbers(page)).toHaveCount(0);
		await chooseLinkForm(page, 'En classe');
		await expect(sameNumbers(page)).toBeVisible();
		await expect(sameNumbers(page)).not.toBeChecked();
		const plain = await copiedLink(page);
		expect(plain.searchParams.get('mode')).toBe('display');
		expect(plain.searchParams.has(SERIES_SEED_PARAM)).toBe(false);
		await sameNumbers(page).click();
		await expect(sameNumbers(page)).toBeChecked();
		const seeded = await copiedLink(page);
		expect(seeded.searchParams.get(SERIES_SEED_PARAM)).toMatch(/^\d+$/);
		await shoot(page, `${SHOTS}-2922-case`, projectName());
	});

	test('#2922 — case cochée, lien ouvert sur deux appareils (Course) → mêmes questions, mêmes nombres, même ordre ; sans la case → nombres différents', async ({
		page,
		browser
	}) => {
		test.setTimeout(120_000);
		await seedCart(page, items);
		await gotoSettled(page, '/automaths/panier');
		await chooseLinkForm(page, 'Course aux nombres');

		// Sans la case : deux appareils, des nombres différents (comme avant)
		const free = await copiedLink(page);
		const freeA = await otherDevice(browser);
		const freeB = await otherDevice(browser);
		try {
			const a = await playCourse(freeA.page, `${free.pathname}${free.search}`, 3);
			const b = await playCourse(freeB.page, `${free.pathname}${free.search}`, 3);
			expect(a, `sans la case : ${a.join(',')} / ${b.join(',')}`).not.toEqual(b);
		} finally {
			await freeA.context.close();
			await freeB.context.close();
		}

		// Avec la case : mêmes nombres, même ordre
		await sameNumbers(page).click();
		const shared = await copiedLink(page);
		expect(shared.searchParams.has(SERIES_SEED_PARAM)).toBe(true);
		const deviceA = await otherDevice(browser);
		const deviceB = await otherDevice(browser);
		try {
			const a = await playCourse(deviceA.page, `${shared.pathname}${shared.search}`, 3);
			const b = await playCourse(deviceB.page, `${shared.pathname}${shared.search}`, 3);
			expect(a).toEqual(b);
			// Pas trois fois le même nombre : l'égalité prouve quelque chose
			expect(new Set(a).size).toBeGreaterThan(1);
			await shoot(deviceB.page, `${SHOTS}-2922-appareil-b`, projectName());
		} finally {
			await deviceA.context.close();
			await deviceB.context.close();
		}
	});

	test('#2922 — décocher puis recocher → nouveau lien, autres nombres', async ({
		page,
		browser
	}) => {
		test.setTimeout(120_000);
		await seedCart(page, items);
		await gotoSettled(page, '/automaths/panier');
		await chooseLinkForm(page, 'Course aux nombres');
		await sameNumbers(page).click();
		const first = await copiedLink(page);
		await sameNumbers(page).click();
		await expect(sameNumbers(page)).not.toBeChecked();
		const off = await copiedLink(page);
		expect(off.searchParams.has(SERIES_SEED_PARAM)).toBe(false);
		await sameNumbers(page).click();
		const second = await copiedLink(page);
		expect(second.searchParams.get(SERIES_SEED_PARAM)).not.toBe(
			first.searchParams.get(SERIES_SEED_PARAM)
		);
		const deviceA = await otherDevice(browser);
		const deviceB = await otherDevice(browser);
		try {
			const a = await playCourse(deviceA.page, `${first.pathname}${first.search}`, 3);
			const b = await playCourse(deviceB.page, `${second.pathname}${second.search}`, 3);
			expect(a, `ancien lien ${a.join(',')} / nouveau ${b.join(',')}`).not.toEqual(b);
		} finally {
			await deviceA.context.close();
			await deviceB.context.close();
		}
	});

	test('#2922 — QR code (prof) : lien court, même série, mêmes nombres que le lien copié', async ({
		page,
		browser
	}) => {
		test.setTimeout(120_000);
		await login(page, TEACHER.email, TEACHER.password);
		await seedCart(page, items);
		await gotoSettled(page, '/automaths/panier');
		await chooseLinkForm(page, 'Course aux nombres');
		await sameNumbers(page).click();
		const copied = await copiedLink(page);
		await page.getByRole('button', { name: /^QR code de/ }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('img.qr')).toBeVisible();
		const shown = await dialog.getByLabel('Adresse du QR code').inputValue();
		expect(shown).toMatch(/\/l\/[A-Za-z0-9]{8}$/);
		createdCodes.add(shown.split('/l/')[1]);
		// Scanner : décoder l'image comme un téléphone, visiter le chemin lu
		const decoded = await decodeQrOnScreen(page, dialog.locator('img.qr'), '2922-qr');
		expect(decoded).toBe(shown);
		const [row] = await sql<{ target: string }>('select target from short_links where code = $1', [
			shown.split('/l/')[1]
		]);
		expect(row.target).toContain(
			`${SERIES_SEED_PARAM}=${copied.searchParams.get(SERIES_SEED_PARAM)}`
		);

		const viaQr = await otherDevice(browser);
		const viaLink = await otherDevice(browser);
		try {
			await gotoSettled(viaQr.page, pathOf(decoded as string));
			await expect(viaQr.page).toHaveURL(/\/automaths\/test\?.*mode=course/);
			await begin(viaQr.page);
			const a = await courseNumbers(viaQr.page, 3);
			const b = await playCourse(viaLink.page, `${copied.pathname}${copied.search}`, 3);
			expect(a).toEqual(b);
		} finally {
			await viaQr.context.close();
			await viaLink.context.close();
		}
	});

	test('#2922 — Flash-cards : à la fin, « Recommencer les mêmes questions » redonne les mêmes ; sans graine, « nouvelles questions »', async ({
		page
	}) => {
		test.setTimeout(150_000);

		/** Joue les trois cartes d'une série flash, rend leurs nombres dans l'ordre */
		async function playFlash(): Promise<string[]> {
			const seen: string[] = [];
			for (let n = 1; n <= 3; n++) {
				await expect(page.getByTestId('flash-position')).toContainText(`${n}`);
				const front = await page.getByTestId('flash-card').innerText();
				// Le texte de la carte porte le nombre deux fois (énoncé et lecture) : on garde le premier
				seen.push(/tirage n° (\d{4})/.exec(front)?.[1] ?? '');
				await page.getByRole('button', { name: 'Voir la correction' }).first().click();
				await page.locator('[data-self-assess="found"]').first().click();
			}
			await expect(page.getByTestId('flash-summary')).toBeVisible();
			return seen;
		}

		await gotoSettled(page, buildSeriesLink('', items, { mode: 'flash', seed: 2922 }));
		const first = await playFlash();
		expect(first).toHaveLength(3);
		await page.getByRole('button', { name: 'Recommencer les mêmes questions' }).click();
		const second = await playFlash();
		expect(second).toEqual(first);

		await gotoSettled(page, buildSeriesLink('', items, { mode: 'flash' }));
		const free = await playFlash();
		await expect(
			page.getByRole('button', { name: 'Recommencer avec de nouvelles questions' })
		).toBeVisible();
		await page.getByRole('button', { name: 'Recommencer avec de nouvelles questions' }).click();
		const again = await playFlash();
		expect(again, `${free.join(',')} / ${again.join(',')}`).not.toEqual(free);
	});
});
