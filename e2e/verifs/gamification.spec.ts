import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test, type Page, type Route } from '@playwright/test';
import { MATHOU_RACES } from '../../src/lib/components/mathoux/mathou-races';
import { ADMIN, assertLocalServerEnv, login, PHONE, sql, TEACHER } from './helpers/carnet';
import { acquireLock, LOCK_WAIT_MAX_MS, releaseLock } from './helpers/verrou';

/**
 * Gamification de l'élève — les vérifications manuelles, sur la base locale
 * =========================================================================
 *
 * Reprend les lignes #1599/#1600, #1588 (retour après une longue absence),
 * #1587, #1582, #1575 (annonces et dessins des Mathoux), #1580 (Palotins),
 * #1579 (vue du professeur), #1471, #1484 (pansées, Constance), #1490,
 * #1493/#1494, #1498 (Chatterie) de `docs/wip/verifications-manuelles.md`.
 *
 *   VERIFS_PORT=5179 pnpm test:verifs gamification --project ordi-chrome
 *
 * Élèves utilisés : eleve10 à eleve15 SEULEMENT. L'état de leurs lignes est
 * photographié avant et remis après (`afterAll`).
 *
 * ⚠️ La présence d'un élève n'est notée qu'une fois par jour et par instance du
 * serveur de dev (mémoire de `studentPresenceHandle`, sans cookie). Les deux
 * tests qui posent une absence AVANT la connexion (eleve15, eleve13) ne
 * peuvent donc compter qu'une fois par jour de serveur : au second passage ils
 * se sautent en le disant, au lieu d'échouer sur un état qu'ils ne contrôlent pas.
 *
 * Captures : `.captures/verifs/gamification/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.describe.configure({ mode: 'serial' });

// Constantes

const PASSWORD = 'local-eleve';
const E10 = { email: 'eleve10@local.test', id: '5eed0000-0000-4000-8000-000000000010' }; // 6e, Pile
const E11 = { email: 'eleve11@local.test', id: '5eed0000-0000-4000-8000-000000000011' }; // 1re spé, Pile
const E12 = { email: 'eleve12@local.test', id: '5eed0000-0000-4000-8000-000000000012' }; // 1re spé, Giron
const E13 = { email: 'eleve13@local.test', id: '5eed0000-0000-4000-8000-000000000013' }; // 1re spé, Pile
const E14 = { email: 'eleve14@local.test', id: '5eed0000-0000-4000-8000-000000000014' }; // 2de, Cotice
const E15 = { email: 'eleve15@local.test', id: '5eed0000-0000-4000-8000-000000000015' }; // 6e, Pile
const ALL_IDS = [E10, E11, E12, E13, E14, E15].map((e) => e.id);
const SHOTS = '.captures/verifs/gamification';

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

/** Les trois répliques de retour de Pile (`return_after_pause`, src/lib/config/buddy-messages.ts). */
const PILE_RETURN_LINES =
	/Te revoilà au travail|Quel plaisir de te retrouver ici|La reprise te va bien/;
/** « tu m'as manqué » : la réplique d'avant le 2026-11-12, que R2 a retirée. */
const MISSED_YOU = /manqu/i;

// Décor

let startedAt = '';
const snapshot = new Map<string, unknown[]>();
let startGidouilles: { id: string; gidouilles: string }[] = [];

let lockHeld = false;

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
	assertLocalServerEnv();
	// Mêmes élèves que mathoux-decorations : un seul des deux fichiers à la fois
	await acquireLock('eleves-10-15');
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
	startGidouilles = await sql<{ id: string; gidouilles: string }>(
		'select id, gidouilles::text from profiles where id = any($1)',
		[ALL_IDS]
	);
});

test.afterAll(async () => {
	try {
		await restoreDecor();
	} finally {
		if (lockHeld) releaseLock('eleves-10-15');
	}
});

async function restoreDecor(): Promise<void> {
	if (!startedAt) return;
	for (const table of APPENDED_TABLES) {
		await sql(`delete from ${table} where student_id = any($1) and created_at >= $2`, [
			ALL_IDS,
			startedAt
		]);
	}
	for (const table of SNAPSHOT_TABLES) {
		// Table pas photographiée (beforeAll interrompu) : on n'y touche pas
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
	for (const row of startGidouilles) {
		await sql('update profiles set gidouilles = $2::numeric where id = $1', [
			row.id,
			row.gidouilles
		]);
	}
	await sql(`delete from rate_limits where key like 'account_export:%'`);
}

// Functions

/** Les tests qui écrivent dans la base ne jouent que sur l'ordinateur Chrome. */
function onlyDesktopChrome(testInfo: { project: { name: string } }): void {
	test.skip(testInfo.project.name !== 'ordi-chrome', 'décor partagé : ordinateur Chrome seul');
}

async function studentPage(page: Page, student: { email: string }): Promise<void> {
	await login(page, student.email, PASSWORD);
	await page.waitForLoadState('networkidle');
}

async function goto(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}

/**
 * Connexion sans arriver sur une page : les requêtes vers `/dashboard` sont coupées
 * (à la charge de l'appelant de lever la coupure), on attend seulement le cookie de session.
 */
async function loginWithoutLanding(page: Page, student: { email: string }): Promise<void> {
	await page.goto('/auth/login');
	await page.waitForLoadState('networkidle');
	await page.locator('input[name="email"]').fill(student.email);
	await page.locator('input[type="password"]').fill(PASSWORD);
	await page.locator('button[type="submit"]').click();
	await expect
		.poll(async () => (await page.context().cookies()).some((c) => /auth-token/.test(c.name)), {
			timeout: 20_000
		})
		.toBe(true);
}

/** Le texte de la bulle du Palotin (vide quand il ne dit rien). */
function bubble(page: Page) {
	return page.locator('[data-buddy-bubble]');
}

/** Ce que dit la bulle maintenant (rien si elle n'est pas affichée) ne ressemble pas à `pattern`. */
async function expectNoBubbleLike(page: Page, pattern: RegExp): Promise<void> {
	const said = (await bubble(page).allInnerTexts()).join(' ');
	expect(said).not.toMatch(pattern);
}

function palotinImage(page: Page) {
	return page.getByRole('button', { name: /^Mon Palotin/ }).locator('img');
}

async function utcToday(): Promise<string> {
	return (await sql<{ d: string }>(`select (now() at time zone 'utc')::date::text as d`))[0].d;
}

async function visitRow(id: string) {
	return (
		await sql<{ last_visit_date: string; welcome_back_on: string | null }>(
			`select last_visit_date::text, welcome_back_on::text from student_last_visits where student_id = $1`,
			[id]
		)
	)[0];
}

/**
 * Mémoire de `studentPresenceHandle` (`notedToday`) : un élève n'est noté qu'une fois par
 * jour et par PROCESSUS du serveur de dev. La base ne le prouve pas (l'`afterAll` y remet
 * l'ancienne date) : un repère dans `.captures/` retient « tel processus a noté tel élève
 * tel jour ». Le test ne se saute que si CE processus l'a déjà noté aujourd'hui ; sinon une
 * visite non écrite est une régression et le test échoue.
 */
function presenceMarker(id: string, day: string): string | null {
	const port = process.env.VERIFS_PORT ?? '5176';
	let pid = '';
	try {
		pid = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim().split('\n')[0];
	} catch {
		return null;
	}
	return pid === '' ? null : `.captures/verifs/presence/${pid}-${day}-${id}`;
}

function notedByThisServer(id: string, day: string): boolean {
	const marker = presenceMarker(id, day);
	return marker !== null && existsSync(marker);
}

function rememberNoted(id: string, day: string): void {
	const marker = presenceMarker(id, day);
	if (marker === null) return;
	mkdirSync(dirname(marker), { recursive: true });
	writeFileSync(marker, '');
}

/**
 * Une série d'une seule question (l'Entraînement de « Faire grandir » raccourci :
 * 1 question, 10 s), sans réponse : le temps passe, la question est comptée fausse,
 * ce qui suffit à gagner des pansées (3 par réponse, 5 au premier travail du jour).
 * Rend quand l'écran de résultats est affiché.
 */
async function playOneQuestionSeries(
	page: Page,
	beforeStart: () => Promise<void> = async () => undefined
): Promise<void> {
	await goto(page, '/dashboard/student/chatterie');
	const href = await page.locator('a[aria-label^="Faire grandir"]').first().getAttribute('href');
	expect(href, 'un « Faire grandir » sur la Chatterie').not.toBeNull();
	const url = new URL(href as string, 'http://local');
	const raw = url.searchParams.get('modeles') ?? '';
	const items = JSON.parse(decodeURIComponent(decodeURIComponent(raw))) as {
		templateId: string;
		quantity: number;
		delay: number;
	}[];
	const one = [{ ...items[0], quantity: 1, delay: 10 }];
	const query = encodeURIComponent(encodeURIComponent(JSON.stringify(one)));
	// Après la Chatterie : sa page calcule la collection et consommerait les nouveautés
	await beforeStart();
	// Deux essais : une page rechargée par le serveur de dev pendant la série la perd
	for (let attempt = 1; attempt <= 2; attempt++) {
		await goto(page, `/automaths/test?modeles=${query}&mode=interactive`);
		await startSeries(page);
		const done = await page
			.getByText('Résultats du test')
			.waitFor({ timeout: 30_000 })
			.then(() => true)
			.catch(() => false);
		if (done) return;
	}
	await expect(page.getByText('Résultats du test')).toBeVisible({ timeout: 1000 });
}

/** « C'est parti ! » : recliqué tant que la série n'a pas démarré (bouton pas encore hydraté). */
async function startSeries(page: Page): Promise<void> {
	await expect(async () => {
		const start = page.getByRole('button', { name: /C'est parti/ });
		if (await start.isVisible()) await start.click();
		await expect(page.getByText(/Question 1 sur \d+|Résultats du test/).first()).toBeVisible({
			timeout: 4000
		});
	}).toPass({ timeout: 30_000 });
}

/** Ouvre le panneau du Palotin (clic sur son dessin) et rend son texte. */
async function palotinPanelText(page: Page): Promise<string> {
	await page.getByRole('button', { name: /^Mon Palotin/ }).click();
	const panel = page
		.locator('h3', { hasText: /Giron|Pile|Cotice/ })
		.locator('..')
		.locator('..');
	await expect(panel).toBeVisible();
	return panel.innerText();
}

// ============================================================================
// #1599, #1600 · #1588 — retour après une longue absence
// ============================================================================

test.describe('retour après une longue absence', () => {
	test('#1599 #1600 #1588 : 21 jours d’absence, le retour est noté dès la première page vue, hors tableau de bord', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(150_000);
		const today = await utcToday();
		const remembered = notedByThisServer(E15.id, today);
		await sql(
			`insert into student_last_visits (student_id, last_visit_date, welcome_back_on)
			 values ($1, (now() at time zone 'utc')::date - 21, null)
			 on conflict (student_id) do update
			 set last_visit_date = excluded.last_visit_date, welcome_back_on = null`,
			[E15.id]
		);
		// Le Palotin n'a pas travaillé depuis le retour : l'élève n'a encore rien fait
		await sql(
			`update student_buddies set last_activity_date = (now() at time zone 'utc')::date - 30
			 where student_id = $1`,
			[E15.id]
		);

		// La connexion arrive sur le tableau de bord : on coupe ces requêtes pour que la
		// PREMIÈRE page vue de l'élève soit une page qui n'est pas le tableau de bord.
		const isDashboard = (url: URL) => url.pathname.startsWith('/dashboard');
		const cut = (route: Route) => route.abort();
		await page.route(isDashboard, cut);
		await loginWithoutLanding(page, E15);
		await page.unroute(isDashboard, cut);
		// Connecté, mais aucune page vue : la connexion elle-même n'a rien noté
		expect((await visitRow(E15.id)).last_visit_date).not.toBe(today);

		// Première page vue : une page qui n'est PAS le tableau de bord
		await goto(page, '/automaths');
		await expect
			.poll(async () => (await visitRow(E15.id)).last_visit_date, { timeout: 8000 })
			.toBe(today)
			.catch(() => undefined);
		const row = await visitRow(E15.id);
		// Déjà noté aujourd'hui avant le test : la mémoire du serveur empêche d'écrire de nouveau
		test.skip(
			remembered && row.last_visit_date !== today,
			'eleve15 déjà passé aujourd’hui sur ce serveur : relancer le serveur de dev pour rejouer'
		);
		if (row.last_visit_date === today) rememberNoted(E15.id, today);

		// Noté sur une page qui n'est PAS le tableau de bord (#1599) ; retour à fêter noté
		expect(row.welcome_back_on).toBe(today);
		expect(row.last_visit_date).toBe(today);
	});

	test('#1599 #1588 : retour noté mais pas encore travaillé : aucune bulle, jamais « tu m’as manqué », Palotin pas triste', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(150_000);
		const today = await utcToday();
		await studentPage(page, E15);
		// Retour noté aujourd'hui, mais aucun jour travaillé depuis (R2, 2026-11-12)
		await sql(
			`update student_last_visits set welcome_back_on = (now() at time zone 'utc')::date,
			   last_visit_date = (now() at time zone 'utc')::date where student_id = $1`,
			[E15.id]
		);
		await sql(
			`update student_buddies set last_activity_date = (now() at time zone 'utc')::date - 30
			 where student_id = $1`,
			[E15.id]
		);
		await goto(page, '/automaths');
		await page.waitForTimeout(3000);
		await expectNoBubbleLike(page, PILE_RETURN_LINES);
		await expectNoBubbleLike(page, MISSED_YOU);

		// Tableau de bord : pas de fête non plus, pas de Palotin triste (#1588 : périmé, R2)
		await goto(page, '/dashboard');
		await expect(palotinImage(page)).toBeVisible();
		await page.waitForTimeout(3000);
		await expect(page.getByText(MISSED_YOU)).toHaveCount(0);
		await expectNoBubbleLike(page, PILE_RETURN_LINES);
		await expect(palotinImage(page)).not.toHaveAttribute('src', /-sad/);
		expect((await visitRow(E15.id)).welcome_back_on).toBe(today);
		await page.screenshot({ path: `${SHOTS}/retour-sans-travail.png` });
	});

	test('#1599 #1600 : le retour est fêté une fois le travail fait, joyeux, puis oublié ; le survol ne le consomme pas', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(150_000);
		const today = await utcToday();
		await studentPage(page, E10);
		// Retour noté aujourd'hui ET jour travaillé aujourd'hui : à fêter
		await sql(
			`update student_last_visits set welcome_back_on = (now() at time zone 'utc')::date,
			   last_visit_date = (now() at time zone 'utc')::date where student_id = $1`,
			[E10.id]
		);
		await sql(
			`update student_buddies set last_activity_date = (now() at time zone 'utc')::date
			 where student_id = $1`,
			[E10.id]
		);
		// Horloge gelée : le survol de « Mes cours » (préchargement) a lieu AVANT la bulle
		const start = new Date();
		await page.clock.install({ time: start });
		await page.clock.pauseAt(new Date(start.getTime() + 1000));
		await page.goto('/dashboard');
		await expect(palotinImage(page)).toBeVisible();
		await page.getByRole('link', { name: 'Mes cours' }).first().hover();
		await page.clock.runFor(300);
		expect((await visitRow(E10.id)).welcome_back_on, 'le survol ne consomme rien').toBe(today);
		await expectNoBubbleLike(page, PILE_RETURN_LINES);

		// La bulle arrive une seconde après le montage
		await page.clock.runFor(1500);
		await expect(bubble(page)).toHaveText(PILE_RETURN_LINES);
		await expectNoBubbleLike(page, MISSED_YOU);
		await expect(palotinImage(page)).toHaveAttribute('src', /pile-happy/);
		await page.screenshot({ path: `${SHOTS}/retour-fete.png` });
		// Dite : le serveur oublie le retour (#1599 : « recharger → plus rien »)
		await expect
			.poll(async () => (await visitRow(E10.id)).welcome_back_on, { timeout: 8000 })
			.toBeNull();
		await page.clock.resume();
		await goto(page, '/dashboard');
		await page.waitForTimeout(3000);
		await expectNoBubbleLike(page, PILE_RETURN_LINES);
	});

	test('#1599 : un retour noté il y a 7 jours et jamais fêté est effacé au premier passage du jour', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(150_000);
		const remembered = notedByThisServer(E13.id, await utcToday());
		await sql(
			`update student_last_visits
			 set welcome_back_on = (now() at time zone 'utc')::date - 7,
			     last_visit_date = (now() at time zone 'utc')::date - 1
			 where student_id = $1`,
			[E13.id]
		);
		await sql(
			`update student_buddies set last_activity_date = (now() at time zone 'utc')::date
			 where student_id = $1`,
			[E13.id]
		);
		await studentPage(page, E13);
		const row = await visitRow(E13.id);
		test.skip(
			remembered && row.last_visit_date !== (await utcToday()),
			'eleve13 déjà passé aujourd’hui sur ce serveur : relancer le serveur de dev pour rejouer'
		);
		if (row.last_visit_date === (await utcToday())) rememberNoted(E13.id, await utcToday());
		expect(row.welcome_back_on, 'retour périmé effacé').toBeNull();
		await page.waitForTimeout(3000);
		await expectNoBubbleLike(page, PILE_RETURN_LINES);
	});

	test('#1599 : prof, admin et compte en attente : aucune ligne de présence écrite', async ({
		page,
		browser
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		const rowsFor = async (email: string) =>
			(
				await sql<{ n: string }>(
					`select count(*)::text as n from student_last_visits v join profiles p on p.id = v.student_id where p.email = $1`,
					[email]
				)
			)[0].n;
		await login(page, TEACHER.email, TEACHER.password);
		await page.waitForLoadState('networkidle');
		await goto(page, '/automaths');
		expect(await rowsFor(TEACHER.email)).toBe('0');
		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();
		await login(adminPage, ADMIN.email, ADMIN.password);
		await adminPage.waitForLoadState('networkidle');
		await goto(adminPage, '/automaths');
		expect(await rowsFor(ADMIN.email)).toBe('0');
		await adminContext.close();
		// Compte en attente : le test ne le pose pas (un compte en attente ne peut pas se
		// connecter normalement) ; couvert par studentPresenceHandle.test.ts.
	});

	test('#1599 #1588 : l’export RGPD porte le dernier passage et le retour à fêter', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await sql(`delete from rate_limits where key like 'account_export:%'`);
		await sql(
			`insert into student_last_visits (student_id, last_visit_date, welcome_back_on)
			 values ($1, (now() at time zone 'utc')::date, (now() at time zone 'utc')::date - 2)
			 on conflict (student_id) do update
			 set last_visit_date = excluded.last_visit_date, welcome_back_on = excluded.welcome_back_on`,
			[E14.id]
		);
		await studentPage(page, E14);
		const response = await page.request.get('/api/account/export');
		expect(response.status()).toBe(200);
		const body = (await response.json()) as {
			gaming: Record<string, unknown> & {
				mathoux: { asleep?: boolean }[];
				palotin: { palotin_type: string } | null;
			};
		};
		const visit = await visitRow(E14.id);
		expect(body.gaming.dernier_passage).toBe(visit.last_visit_date);
		expect(body.gaming.dernier_passage).toBe(await utcToday());
		expect(body.gaming.retour_a_feter).toBe(visit.welcome_back_on);
		expect(body.gaming.retour_a_feter).not.toBeNull();
		// #1493/#1494 : sections mathoux et palotin ; #1587 : `asleep` présent
		expect(body.gaming.palotin?.palotin_type).toBe('cotice');
		expect(body.gaming.mathoux.length).toBeGreaterThan(0);
		expect(body.gaming.mathoux.every((m) => typeof m.asleep === 'boolean')).toBe(true);
	});
});

// ============================================================================
// #1471 · #1484 — pansées et Constance Royale, par de vraies séances
// ============================================================================

test.describe('pansées et Constance Royale', () => {
	test('#1471 #1484 : une série donne des pansées, un jour sur 3, une seule fois par jour', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(240_000);
		await sql(
			`update student_buddies set xp_earned_today = 0, last_xp_date = null,
			   constance_days_this_week = 0, constance_week_start = null,
			   current_streak = 0, last_activity_date = (now() at time zone 'utc')::date - 2
			 where student_id = $1`,
			[E12.id]
		);
		await studentPage(page, E12);
		await goto(page, '/dashboard');
		const before = await palotinPanelText(page);
		// R1 (2026-11-12) : à 0, aucune ligne « Constance Royale : 0 semaine »
		expect(before).not.toContain('Constance Royale');
		expect(before).toContain('Cette semaine : 0 jour sur 3');
		expect(before).toMatch(/Tour de panse \d+/);
		expect(before).toMatch(/\d+ \/ \d+ pansées/);
		expect(before).not.toMatch(/\bXP\b|Niveau/);

		const xpBefore = (
			await sql<{ xp: number }>('select xp from student_buddies where student_id = $1', [E12.id])
		)[0].xp;
		await playOneQuestionSeries(page);
		await expect(page.getByText(/Giron a gagné \d+ pansées?/)).toBeVisible();
		await page.screenshot({ path: `${SHOTS}/gain-pansees.png`, fullPage: true });
		const xpAfter = (
			await sql<{ xp: number; d: number }>(
				'select xp, constance_days_this_week as d from student_buddies where student_id = $1',
				[E12.id]
			)
		)[0];
		expect(xpAfter.xp).toBeGreaterThan(xpBefore);
		expect(xpAfter.d).toBe(1);

		// Le tableau de bord (rechargé : « sans recharger » demande l'œil de David)
		await goto(page, '/dashboard');
		const after = await palotinPanelText(page);
		expect(after).toContain('Cette semaine : 1 jour sur 3');
		expect(after).not.toMatch(/\bXP\b|Niveau/);

		// Une seconde série le même jour : pas de jour de plus
		await playOneQuestionSeries(page);
		expect(
			(
				await sql<{ d: number }>(
					'select constance_days_this_week as d from student_buddies where student_id = $1',
					[E12.id]
				)
			)[0].d
		).toBe(1);
	});

	test('#1471 : au plafond du jour (100), la série ne rapporte plus rien', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(150_000);
		await sql(
			`update student_buddies set xp_earned_today = 100, last_xp_date = (now() at time zone 'utc')::date
			 where student_id = $1`,
			[E12.id]
		);
		const before = (
			await sql<{ xp: number }>('select xp from student_buddies where student_id = $1', [E12.id])
		)[0].xp;
		await studentPage(page, E12);
		await playOneQuestionSeries(page);
		await expect(page.getByText(/a gagné \d+ pansées?/)).toHaveCount(0);
		const after = (
			await sql<{ xp: number; x: number }>(
				'select xp, xp_earned_today as x from student_buddies where student_id = $1',
				[E12.id]
			)
		)[0];
		expect(after.xp).toBe(before);
		expect(after.x).toBe(100);
	});

	test('#1471 : au plafond du jour, la carte de fin de série dit « Sa panse est pleine pour aujourd’hui »', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(150_000);
		// E29 (corrigé) : le service rend `daily_cap_reached` quand son calcul local a tronqué
		// la séance, même s'il n'appelle pas la base (plafond déjà atteint).
		await sql(
			`update student_buddies set xp_earned_today = 100, last_xp_date = (now() at time zone 'utc')::date
			 where student_id = $1`,
			[E12.id]
		);
		await studentPage(page, E12);
		await playOneQuestionSeries(page);
		await expect(page.getByText(/Sa panse est pleine pour aujourd’hui/)).toBeVisible({
			timeout: 8000
		});
	});

	test('#1484 : le 3e jour de la semaine, +30 pansées et « Constance Royale : 1 semaine »', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(150_000);
		// Deux jours déjà travaillés cette semaine (lundi UTC), hier compris
		await sql(
			`update student_buddies set xp_earned_today = 0, last_xp_date = (now() at time zone 'utc')::date - 1,
			   constance_week_start = date_trunc('week', now() at time zone 'utc')::date,
			   constance_days_this_week = 2, current_streak = 0,
			   last_activity_date = (now() at time zone 'utc')::date - 1
			 where student_id = $1`,
			[E12.id]
		);
		await studentPage(page, E12);
		const xpBefore = (
			await sql<{ xp: number }>('select xp from student_buddies where student_id = $1', [E12.id])
		)[0].xp;
		await playOneQuestionSeries(page);
		const row = (
			await sql<{ xp: number; d: number; s: number }>(
				'select xp, constance_days_this_week as d, current_streak as s from student_buddies where student_id = $1',
				[E12.id]
			)
		)[0];
		expect(row.d).toBe(3);
		expect(row.s).toBe(1);
		expect(row.xp - xpBefore, 'dont +30 de la semaine tenue').toBeGreaterThanOrEqual(30);
		await page.screenshot({ path: `${SHOTS}/constance-semaine-tenue.png`, fullPage: true });
		await goto(page, '/dashboard');
		const panel = await palotinPanelText(page);
		expect(panel).toContain('Constance Royale : 1 semaine');
		expect(panel).toContain('Cette semaine : 3 jours sur 3');
	});

	test('#1484 : tableau du professeur (Palotins), Constance en « sem. »', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await login(page, TEACHER.email, TEACHER.password);
		await goto(page, '/dashboard/teacher/gamification/buddies');
		await expect(page.getByText(/Constance moy\. [\d.,]+ sem\./).first()).toBeVisible();
		await page.screenshot({ path: `${SHOTS}/prof-palotins.png`, fullPage: true });
	});
});

// ============================================================================
// #1587 · #1582 · #1575 — annonces de fin de séance et dessins animés
// ============================================================================

test.describe('Mathoux : fin de séance', () => {
	test('#1587 #1575 #1582 : fin de série, un Mathou naît et un autre se réveille, annoncés avec leur scène', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(150_000);
		// Mémoire d'un Mathou retirée → il naît à ce calcul ; un autre dormait à ce calcul → il se réveille
		await studentPage(page, E12);
		let awake: { notion_id: string }[] = [];
		await playOneQuestionSeries(page, async () => {
			// Lu APRÈS la page de la Chatterie, qui remet la mémoire d'accord avec les points
			awake = await sql<{ notion_id: string }>(
				`select notion_id from student_mathoux where student_id = $1 and not asleep order by notion_id`,
				[E12.id]
			);
			expect(awake.length, 'eleve12 a au moins deux Mathoux éveillés').toBeGreaterThanOrEqual(2);
			await sql(`delete from student_mathoux where student_id = $1 and notion_id = $2`, [
				E12.id,
				awake[0].notion_id
			]);
			await sql(
				`update student_mathoux set asleep = true where student_id = $1 and notion_id = $2`,
				[E12.id, awake[1].notion_id]
			);
			await sql(
				`update student_buddies set xp_earned_today = 0, last_xp_date = null where student_id = $1`,
				[E12.id]
			);
		});
		const card = page.getByTestId('mathou-news-card');
		await expect(card).toBeVisible({ timeout: 15_000 });
		// Naissance (#1575) et réveil (#1587)
		await expect(card).toContainText(
			/Un chaton est né à la Chatterie : .+ !|est arrivé à la Chatterie/
		);
		await expect(card).toContainText(/s’est réveillé !/);
		await expect(card.getByRole('link', { name: 'Voir la Chatterie' })).toBeVisible();
		// Scène : les dessins de la carte s'animent (apparition, réveil) — état des animations CSS
		const animated = await card.evaluate(
			(el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length
		);
		await page.screenshot({ path: `${SHOTS}/fin-de-serie-nouveautes.png`, fullPage: true });
		expect(animated, 'animations en cours sur la carte du Mathou né / réveillé').toBeGreaterThan(0);
		// Mémoire à jour : le Mathou né est écrit, le réveillé n'dort plus
		const memory = await sql<{ notion_id: string; asleep: boolean }>(
			`select notion_id, asleep from student_mathoux where student_id = $1 and notion_id = any($2)`,
			[E12.id, [awake[0].notion_id, awake[1].notion_id]]
		);
		expect(memory.find((m) => m.notion_id === awake[0].notion_id)).toBeDefined();
		expect(memory.find((m) => m.notion_id === awake[1].notion_id)?.asleep).toBe(false);

		// Une nouvelle série ne répète pas l'annonce
		await playOneQuestionSeries(page);
		await page.waitForTimeout(2500);
		const second = (await page.getByTestId('mathou-news-card').allInnerTexts()).join(' ');
		expect(second).not.toMatch(/s’est réveillé|est né/);
	});

	test('#1575 : premier passage d’un élève qui a déjà travaillé, « N Mathoux t’attendent à la Chatterie »', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await sql(`delete from student_mathoux where student_id = $1`, [E10.id]);
		await studentPage(page, E10);
		await expect(bubble(page)).toHaveText(/\d+ Mathoux t’attendent à la Chatterie !/, {
			timeout: 20_000
		});
		await expect(bubble(page).getByRole('link', { name: 'Aller à la Chatterie' })).toBeVisible();
		await page.screenshot({ path: `${SHOTS}/premier-passage.png` });
	});
});

// ============================================================================
// #1490 · #1493/#1494 · #1498 · #1582 — la Chatterie
// ============================================================================

test.describe('la Chatterie', () => {
	test('#1490 : entrée de navigation, mots du lore, sieste annoncée sur le tableau de bord et pas sur la Chatterie', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await studentPage(page, E11);
		const nav = page.getByRole('link', { name: /Chatterie/ });
		await expect(nav.first()).toBeVisible();
		// Le Palotin du tableau de bord annonce les siestes, avec un lien
		await goto(page, '/dashboard');
		await expect(bubble(page)).toHaveText(/(?:1 Mathou fait|\d+ Mathoux font) la sieste/, {
			timeout: 20_000
		});
		await expect(bubble(page).getByRole('link', { name: 'Aller à la Chatterie' })).toBeVisible();

		await nav.first().click();
		await page.waitForURL(/\/dashboard\/student\/chatterie/);
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('La Chatterie de Faustroll');
		await expect(page.getByText(/\d+ Mathoux?, \d+ en sieste, \d+ à découvrir/)).toBeVisible();
		await expect(page.getByText('À découvrir').first()).toBeVisible();
		const text = await page.locator('#contenu-principal').innerText();
		expect(text.length).toBeGreaterThan(200);
		expect(text).not.toMatch(/\bniveau\b|\bXP\b|\bscore\b/i);
		// Pas d'annonce de siestes sur la Chatterie elle-même
		await page.waitForTimeout(4000);
		await expectNoBubbleLike(page, /(?:fait|font) la sieste/);
	});

	test('#1490 : lisible à 390 px, sans défilement horizontal', async ({ page }) => {
		// Joué sur tous les projets, iPhone compris : lecture seule
		await page.setViewportSize(PHONE);
		await studentPage(page, E11);
		await goto(page, '/dashboard/student/chatterie');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow, 'défilement horizontal de la page').toBeLessThanOrEqual(0);
		// Chaque carte de Mathou tient dans la largeur de l'écran
		const widest = await page
			.locator('li', { has: page.locator('svg') })
			.evaluateAll((els) => Math.max(...els.map((e) => e.getBoundingClientRect().right)));
		expect(widest).toBeLessThanOrEqual(PHONE.width + 1);
		const shots = `${SHOTS}/chatterie-390`;
		for (const scheme of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme: scheme });
			await page.screenshot({ path: `${shots}-${scheme}.png`, fullPage: false });
		}
	});

	test('#1493 #1494 : une race distincte par branche, mots du lore, dessin et stade lisibles', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		expect(MATHOU_RACES.length, '19 races').toBe(19);
		expect(new Set(MATHOU_RACES.map((r) => r.name)).size, '19 noms de race distincts').toBe(19);
		await studentPage(page, E11);
		await goto(page, '/dashboard/student/chatterie');
		const sections = page.locator('section[aria-labelledby^="race-"]');
		const count = await sections.count();
		expect(count).toBeGreaterThan(5);
		const raceNames = await sections.locator('header p').allInnerTexts();
		expect(new Set(raceNames).size, 'une race par branche, toutes différentes').toBe(count);
		expect(raceNames.every((name) => MATHOU_RACES.some((r) => r.name === name))).toBe(true);
		// Un Mathou né : dessin et stade dits ; une silhouette : dessin « à découvrir »
		await expect(page.getByRole('img', { name: /^Dessin d’un chaton/ }).first()).toBeVisible();
		await expect(
			page.getByRole('img', { name: /^Silhouette d’un Mathou à découvrir/ }).first()
		).toBeVisible();
		await expect(page.getByText('Fait la sieste').first()).toBeVisible();
		await page.screenshot({ path: `${SHOTS}/chatterie-ordi.png`, fullPage: true });
	});

	test('#1498 : « Faire grandir » (10 questions au plus), « Réveiller », silhouette sans bouton', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E11);
		await goto(page, '/dashboard/student/chatterie');
		const grow = page.locator('a[aria-label^="Faire grandir"]');
		const growCount = await grow.count();
		expect(growCount).toBeGreaterThan(0);
		for (let i = 0; i < growCount; i++) {
			const href = (await grow.nth(i).getAttribute('href')) as string;
			const url = new URL(href, 'http://local');
			expect(url.pathname).toBe('/automaths/test');
			const items = JSON.parse(
				decodeURIComponent(decodeURIComponent(url.searchParams.get('modeles') ?? '[]'))
			) as { quantity: number }[];
			const questions = items.reduce((sum, item) => sum + item.quantity, 0);
			expect(questions, `Entraînement n° ${i + 1}`).toBeGreaterThan(0);
			expect(questions, `Entraînement n° ${i + 1} : 10 questions au plus`).toBeLessThanOrEqual(10);
		}
		// Endormi avec carte due : « Réveiller » (révisions) ET « Faire grandir »
		const napping = page.locator('li', { hasText: 'Fait la sieste' });
		expect(await napping.count()).toBeGreaterThan(0);
		const first = napping.first();
		await expect(first.getByRole('link', { name: /^Réveiller/ })).toHaveAttribute(
			'href',
			/\/dashboard\/revisions\/decks\/programme/
		);
		await expect(first.getByRole('link', { name: /^Faire grandir/ })).toBeVisible();
		// Une silhouette n'a aucun bouton
		const silhouettes = page.locator('li', { hasText: 'À découvrir' });
		const n = await silhouettes.count();
		expect(n).toBeGreaterThan(0);
		for (let i = 0; i < n; i++) {
			await expect(silhouettes.nth(i).locator('a, button')).toHaveCount(0);
		}
	});
});

// ============================================================================
// #1582 · #1580 — animations des Mathoux et des Palotins
// ============================================================================

test.describe('animations', () => {
	test('#1582 : la Chatterie bouge doucement, les silhouettes non ; « réduire les animations » : rien ne bouge', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E11);
		await goto(page, '/dashboard/student/chatterie');
		const born = page.locator('li', { hasText: /Chaton|Matou/ }).filter({
			has: page.getByRole('img', { name: /^Dessin d’un/ })
		});
		const silhouette = page.locator('li', {
			has: page.getByRole('img', { name: /^Silhouette/ })
		});
		const running = (loc: ReturnType<Page['locator']>) =>
			loc
				.first()
				.evaluate(
					(el) =>
						el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length
				);
		expect(await running(born), 'animations d’un Mathou né').toBeGreaterThan(0);
		expect(await running(silhouette), 'animations d’une silhouette').toBe(0);

		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.reload();
		await page.waitForLoadState('networkidle');
		expect(await running(born), 'réduire les animations : Mathou né').toBe(0);
	});

	test('#1580 : Palotin qui respire au repos ; « réduire les animations » : version fixe', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E10);
		await goto(page, '/dashboard');
		const image = palotinImage(page);
		await expect(image).toBeVisible();
		const src = async () => image.evaluate((el: HTMLImageElement) => el.currentSrc);
		await expect.poll(src).toMatch(/\/images\/buddies\/pile-[a-z]+\.svg$/);
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect.poll(src).toMatch(/\/images\/buddies\/pile-[a-z]+-fixe\.svg$/);
	});

	test('#1580 : trois erreurs sur une notion, le Palotin passe « déterminé » et s’affaisse', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(150_000);
		await studentPage(page, E10);
		await goto(page, '/dashboard/student/chatterie');
		const href = await page.locator('a[aria-label^="Faire grandir"]').first().getAttribute('href');
		const url = new URL(href as string, 'http://local');
		const items = JSON.parse(
			decodeURIComponent(decodeURIComponent(url.searchParams.get('modeles') ?? '[]'))
		) as { templateId: string; quantity: number; delay: number }[];
		// 4 questions de la même notion (10 s chacune), jamais répondues : 3 erreurs sur la
		// notion, le Palotin passe entre la 3e et la 4e question (`seance-reactions.ts`)
		const query = encodeURIComponent(
			encodeURIComponent(JSON.stringify([{ ...items[0], quantity: 4, delay: 10 }]))
		);
		await goto(page, `/automaths/test?modeles=${query}&mode=interactive`);
		await startSeries(page);
		const droop = page.locator('img[class*="reaction-affaisse"]');
		await expect(droop.first()).toBeAttached({ timeout: 60_000 });
		await expect(droop.first()).toHaveAttribute('src', /\/images\/buddies\/pile-determined/);
		await page.screenshot({ path: `${SHOTS}/palotin-erreur.png` });
	});
});

// ============================================================================
// #1579 — vue du professeur
// ============================================================================

test.describe('vue du professeur', () => {
	test('#1579 : onglet Mathoux, une carte par classe, élève, Chatterie en lecture seule ; l’admin est refusé', async ({
		page,
		browser
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await login(page, TEACHER.email, TEACHER.password);
		await page.waitForLoadState('networkidle');
		await goto(page, '/dashboard/teacher/gamification/buddies');
		const tab = page.getByRole('tab', { name: 'Mathoux' });
		await expect(page.getByRole('tab', { name: 'Palotins' })).toBeVisible();
		await tab.click();
		await page.waitForURL(/gamification\/mathoux/);
		await page.waitForLoadState('networkidle');
		const classes = page.locator('button[aria-expanded]');
		expect(await classes.count(), 'une carte par classe active').toBeGreaterThan(0);
		// Déplier la classe d'eleve11 (« 1SPE 1 »)
		const cls = page.locator('button[aria-expanded]', { hasText: '1SPE 1' });
		await cls.click();
		await expect(cls).toHaveAttribute('aria-expanded', 'true');
		const row = page.locator(`a[href$="/teacher/students/${E11.id}/chatterie"]`);
		await expect(row).toBeVisible();
		await expect(row).toContainText(/\d+ Mathoux?(, dont \d+ grands? matous?)?|Aucun Mathou/);
		await page.screenshot({ path: `${SHOTS}/prof-mathoux.png`, fullPage: true });
		await row.click();
		await page.waitForURL(new RegExp(`/teacher/students/${E11.id}/chatterie`));
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Chatterie de');
		// Y compris les siestes ; ni « Réveiller » ni « Faire grandir », ni « Décorer »
		await expect(page.getByText('Fait la sieste').first()).toBeVisible();
		await expect(page.getByRole('link', { name: /Réveiller|Faire grandir/ })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Décorer/ })).toHaveCount(0);
		await page.screenshot({ path: `${SHOTS}/prof-chatterie-eleve.png`, fullPage: true });
		// Les Mathoux de la vue du prof bougent aussi (#1582)
		const moving = await page
			.locator('li', { has: page.getByRole('img', { name: /^Dessin d’un/ }) })
			.first()
			.evaluate(
				(el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length
			);
		expect(moving).toBeGreaterThan(0);
		// Retour vers l'onglet
		await page.getByRole('link', { name: /Retour aux Mathoux/ }).click();
		await page.waitForURL(/gamification\/mathoux/);

		// Les nouveautés de l'élève sont intactes : la visite du prof n'a rien écrit
		const news = await sql<{ n: string }>(
			`select count(*)::text as n from student_mathoux where student_id = $1`,
			[E11.id]
		);
		expect(Number(news[0].n)).toBeGreaterThan(0);

		// Admin : l'adresse de la Chatterie d'un élève est refusée
		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();
		await login(adminPage, ADMIN.email, ADMIN.password);
		await adminPage.waitForLoadState('networkidle');
		const refused = await adminPage.goto(`/dashboard/teacher/students/${E11.id}/chatterie`);
		expect(refused?.status()).toBeGreaterThanOrEqual(300);
		await expect(adminPage.getByRole('heading', { name: /Chatterie de/ })).toHaveCount(0);
		await adminContext.close();
	});
});
