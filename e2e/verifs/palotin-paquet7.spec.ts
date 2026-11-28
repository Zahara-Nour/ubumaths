import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { buildSeriesLink, type SeriesItem } from '../../src/lib/validation/series';
import { buddyMessages } from '../../src/lib/config/buddy-messages';
import type { BuddyMessageContext, PalotinType } from '../../src/lib/config/buddy-messages';
import { lore } from '../../src/lib/config/lore';
import { AVATAR_FAMILIES } from '../../src/lib/avatars/shop';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { acquireLock, LOCK_WAIT_MAX_MS, releaseLock, refreshLock } from './helpers/verrou';

/**
 * Le Palotin et la boutique d'avatars — paquet 7 du tri — base LOCALE
 * =====================================================================
 *
 * Reprend les lignes #2599 (question longtemps ratée enfin réussie), #2595 (semaine qui
 * devient active), #2589 (retour après une pause, Constance perdue) et #2574 (boutique
 * d'avatars) de `docs/wip/verifications-manuelles.md`.
 *
 *   VERIFS_PORT=5176 pnpm test:verifs e2e/verifs/palotin-paquet7.spec.ts
 *
 * Élèves : eleve16 à eleve20 SEULEMENT (verrou `eleves-16-20`). Les tables que Palotin,
 * séances et boutique écrivent sont photographiées avant et remises après (`afterAll`).
 *
 * Reprise après un arrêt brutal : tout l'état d'origine (dates des traces, tables des élèves,
 * profils : consentement, avatar, gidouilles ; Marché des classes) est écrit dans
 * `.captures/verifs/palotin-paquet7-reprise.json` AVANT la première modification. En tête de
 * `beforeAll`, sous le verrou, ce fichier est rejoué s'il existe, puis supprimé une fois l'état
 * remis. `afterAll` remet les états partagés avant les suppressions, étape par étape (une erreur
 * n'arrête pas les suivantes) et échoue à la fin si une étape a échoué.
 *
 * DÉPENDANCES AU CALENDRIER (le fichier suppose ces conditions ; sinon il échoue, il ne saute rien) :
 *   - Lundi de la semaine : `week_celebrated_on` est comparé au lundi de Paris de « maintenant »
 *     (`mondayOfThisWeek`) ; un passage à cheval sur le lundi 00:00 (Paris) lit deux semaines.
 *   - Minuit : le décor mêle « aujourd'hui » de Paris (traces, jours actifs) et la date UTC
 *     (`last_activity_date`, Constance : semaine UTC). Entre 00:00 et 01:00 ou 02:00 de Paris
 *     (heure d'hiver / d'été) les deux dates diffèrent ; et les 5 traces « du jour » sont posées
 *     sur les 5 dernières minutes, donc à cheval sur deux jours juste après minuit. Ne pas lancer
 *     ni laisser tourner le fichier autour de minuit, ni le dimanche soir tard.
 *   - Rentrée et recul : le palier « 10 semaines d'affilée » pose une activité pour les 9 semaines
 *     précédentes ; le compte part de la rentrée de l'année scolaire ACTIVE des écoles locales
 *     (31 août 2026 pour la plus ancienne ; `readStudentSchoolYear`, `buddy-weeks.ts`). Le lundi de
 *     la 10e semaine en arrière doit être au plus tôt le lundi de la rentrée : valable à partir de
 *     la semaine du 2 novembre 2026 (31 août + 9 semaines) et tant que cette année reste la plus
 *     récente commencée : la base locale n'en a aucune autre (les années locales finissent en
 *     juillet et août 2027) ; si une année suivante est créée, attendre 9 semaines après sa
 *     rentrée ou reculer sa date. La lecture est bornée à 20 semaines (`STREAK_WINDOW_DAYS`).
 *   - Vacances : une semaine de vacances sans activité est sautée, mais le décor pose une
 *     activité chaque semaine de la série, donc les vacances ne changent pas le compte.
 *
 * Le PASSÉ se pose en base (client SQL local), le geste se joue par l'interface :
 *   - échecs d'un modèle « il y a 8 jours » : 3 traces `auto` à `now() - 8 jours` ;
 *   - jours actifs : 5 traces `auto` (lieu `typing`) un même jour de Paris, marquées
 *     portées par un modèle « Verifs7 palotin marqueur » (supprimé avec ses traces) ; semaines actives d'affilée =
 *     un jour actif par semaine, les semaines précédentes ;
 *   - retour après 21 jours : `student_last_visits.welcome_back_on` = aujourd'hui (la
 *     présence « une écriture par jour et par processus » du serveur de dev ne laisse pas
 *     rejouer la détection du retour : l'état qu'elle écrit est posé directement), le
 *     dernier jour travaillé reculé de 22 jours ; le travail du jour se joue pour de vrai
 *     (série de Saisie), la présence se relit alors par le chemin réel du client ;
 *   - Constance perdue : semaine enregistrée il y a 3 semaines, 3 jours, série 4, record 6 ;
 *   - catalogue d'avatars : vide en base locale (le premier lot arrive avec la PR 3 du
 *     chantier) : l'écran vide se vérifie tel quel, l'écran rempli avec 4 avatars
 *     « verifs7_… » posés puis retirés (images interceptées, aucun fichier ajouté).
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.describe.configure({ mode: 'serial' });

// Constantes

const PASSWORD = 'local-eleve';
const E16 = { email: 'eleve16@local.test', id: '5eed0000-0000-4000-8000-000000000016' };
const E17 = { email: 'eleve17@local.test', id: '5eed0000-0000-4000-8000-000000000017' };
const E18 = { email: 'eleve18@local.test', id: '5eed0000-0000-4000-8000-000000000018' };
const E19 = { email: 'eleve19@local.test', id: '5eed0000-0000-4000-8000-000000000019' };
const E20 = { email: 'eleve20@local.test', id: '5eed0000-0000-4000-8000-000000000020' };
const ALL_IDS = [E16, E17, E18, E19, E20].map((e) => e.id);
const PREFIXE = 'Verifs7 palotin';
const SHOTS = '.captures/verifs/palotin7';
/** Une page de l'espace élève où le Palotin « passe » (zone passage) */
const PASSAGE_PAGE = '/dashboard/student/inventory';
/** L'accueil de l'élève : la « maison » du Palotin */
const HOME_PAGE = '/dashboard';
const LOCK = 'eleves-16-20';
/** Reprise après un arrêt brutal : tout l'état d'origine, écrit avant la 1re modification */
const RECOVERY = '.captures/verifs/palotin-paquet7-reprise.json';
/** Une photo Google fictive et les images de la boutique (servies par une interception) */
const GOOGLE_PHOTO = 'https://lh3.googleusercontent.com/verifs7-photo';
/** Ce que les bulles du Palotin ne disent jamais : un nombre de jours, la Constance Royale */
const FORBIDDEN_IN_BUBBLE = /\bjours?\b|Constance/i;

const SNAPSHOT_TABLES = [
	'student_buddies',
	'student_last_visits',
	'student_mathoux',
	'student_mathou_decorations',
	'student_point_state',
	'student_observable_state',
	'student_avatars'
] as const;
const APPENDED_TABLES = ['skill_attempts', 'gidouilles_activity', 'reward_events'] as const;

type Student = { email: string; id: string };

// Décor

/** Tout l'état d'origine à remettre (aussi écrit sur disque avant toute modification) */
interface DecorState {
	startedAt: string;
	snapshot: Record<string, unknown[]>;
	profiles: Record<string, unknown>[];
	marketplace: unknown[];
	/** Dates d'origine des traces de ces élèves (reculées pendant le fichier, remises après) */
	traces: { id: string; created_at: string }[];
}

let startedAt = '';
let lockHeld = false;
let decor: DecorState | null = null;
const createdTemplates: string[] = [];

/** Photographie de ce que le fichier va modifier */
async function captureState(): Promise<DecorState> {
	const startedAtNow = (await sql<{ now: string }>('select now()::text as now'))[0].now;
	const snapshot: Record<string, unknown[]> = {};
	for (const table of SNAPSHOT_TABLES) {
		const rows = await sql<{ r: unknown }>(
			`select to_jsonb(t) as r from ${table} t where student_id = any($1)`,
			[ALL_IDS]
		);
		snapshot[table] = rows.map((row) => row.r);
	}
	const profiles = (
		await sql<{ r: Record<string, unknown> }>(
			`select jsonb_build_object('id', id, 'gidouilles', gidouilles::text,
			        'consent_required', consent_required,
			        'consent_granted_at', consent_granted_at::text,
			        'consent_grace_period_ends', consent_grace_period_ends::text,
			        'avatar_url', avatar_url, 'google_avatar_url', google_avatar_url,
			        'worn_avatar', worn_avatar) as r
			   from profiles where id = any($1)`,
			[ALL_IDS]
		)
	).map((row) => row.r);
	const traces = await sql<{ id: string; created_at: string }>(
		`select id::text, created_at::text from skill_attempts where student_id = any($1)`,
		[ALL_IDS]
	);
	const marketplace = (
		await sql<{ r: unknown }>(
			`select to_jsonb(m) as r from marketplace_config m
			  where m.class_id in (select class_id from class_members where student_id = any($1))`,
			[ALL_IDS]
		)
	).map((row) => row.r);
	return { startedAt: startedAtNow, snapshot, profiles, marketplace, traces };
}

/** Reprise après un arrêt brutal : l'état d'un passage interrompu est remis, puis le fichier supprimé */
async function recoverFromCrash(): Promise<void> {
	if (!existsSync(RECOVERY)) return;
	const saved = JSON.parse(readFileSync(RECOVERY, 'utf8')) as DecorState;
	await restoreDecor(saved);
	rmSync(RECOVERY, { force: true });
}

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 120_000);
	assertLocalServerEnv();
	await acquireLock(LOCK);
	lockHeld = true;
	await recoverFromCrash();
	decor = await captureState();
	startedAt = decor.startedAt;
	// L'état d'origine est sur disque AVANT la première modification
	mkdirSync(dirname(RECOVERY), { recursive: true });
	writeFileSync(RECOVERY, JSON.stringify(decor));
	// Les traces du jeu d'essai (jours actifs, semaines d'affilée) fausseraient les comptes posés ici :
	// elles sont reculées de 3 ans le temps du fichier (hors de l'année scolaire), puis remises
	await sql(
		`update skill_attempts set created_at = created_at - interval '3 years' where student_id = any($1)`,
		[ALL_IDS]
	);
});

// Le fichier dure plus que les 30 min au bout desquelles un verrou est repris
test.beforeEach(() => {
	if (lockHeld) refreshLock(LOCK);
});

test.afterAll(async () => {
	try {
		if (decor) {
			await restoreDecor(decor);
			// Rien n'est supprimé si la remise a échoué : le prochain passage la rejouera
			rmSync(RECOVERY, { force: true });
		}
	} finally {
		if (lockHeld) releaseLock(LOCK);
	}
});

/**
 * Remet l'état d'origine : les états partagés (dates des traces, tables des élèves, profils, Marché)
 * AVANT les suppressions du décor. Chaque étape est isolée : une erreur n'empêche pas les suivantes,
 * puis la remise échoue à la fin si une étape a échoué.
 */
async function restoreDecor(saved: DecorState): Promise<void> {
	const failures: string[] = [];
	const step = async (name: string, task: () => Promise<void>): Promise<void> => {
		try {
			await task();
		} catch (error) {
			failures.push(`${name} : ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	// 1. Les traces d'origine retrouvent leur date (avant tout nettoyage par date)
	await step('dates des traces', async () => {
		if (saved.traces.length === 0) return;
		await sql(
			`update skill_attempts s set created_at = r.created_at
			   from jsonb_to_recordset($1::jsonb) as r(id uuid, created_at timestamptz)
			  where s.id = r.id`,
			[JSON.stringify(saved.traces)]
		);
	});
	// 2. Boutique d'avatars : le port d'abord (clé composite vers la collection), puis les lignes posées
	await step('port et collection d’avatars', async () => {
		await sql(`update profiles set worn_avatar = null where id = any($1)`, [ALL_IDS]);
		await sql(`delete from student_avatars where student_id = any($1)`, [ALL_IDS]);
		await sql(`update profiles set worn_avatar = null where worn_avatar like 'verifs7\\_%'`);
	});
	// 3. Tables des élèves (Palotin, visites, Mathoux, points, avatars)
	for (const table of SNAPSHOT_TABLES) {
		await step(`table ${table}`, async () => {
			const rows = saved.snapshot[table];
			if (rows === undefined) return;
			await sql(`delete from ${table} where student_id = any($1)`, [ALL_IDS]);
			if (rows.length > 0) {
				await sql(
					`insert into ${table} select * from jsonb_populate_recordset(null::${table}, $1::jsonb)`,
					[JSON.stringify(rows)]
				);
			}
		});
	}
	// 4. Profils (consentement, avatar, gidouilles) puis avatar porté (après la collection)
	await step('profils', async () => {
		for (const row of saved.profiles) {
			await sql(
				`update profiles set gidouilles = $2::numeric, consent_required = $3,
				        consent_granted_at = $4::timestamptz, consent_grace_period_ends = $5::timestamptz,
				        google_avatar_url = $6, avatar_url = $7
				  where id = $1`,
				[
					row.id,
					row.gidouilles,
					row.consent_required,
					row.consent_granted_at,
					row.consent_grace_period_ends,
					row.google_avatar_url,
					row.avatar_url
				]
			);
			await sql(`update profiles set worn_avatar = $2 where id = $1`, [row.id, row.worn_avatar]);
		}
	});
	// 5. Marché : les classes rouvertes ou refermées par un test retrouvent leur réglage
	await step('Marché des classes', async () => {
		for (const row of saved.marketplace) {
			await sql(
				`update marketplace_config set enabled_for_class = (($1::jsonb)->>'enabled_for_class')::boolean
				  where id = (($1::jsonb)->>'id')::uuid`,
				[JSON.stringify(row)]
			);
		}
	});

	// Suppressions du décor : paquets de révision d'essai (leurs cartes suivent)
	await step('paquets de révision', async () => {
		await sql(`delete from srs_decks where name like $1`, [`${PREFIXE} %`]);
		await sql(`delete from srs_review_sessions where user_id = any($1) and started_at >= $2`, [
			ALL_IDS,
			saved.startedAt
		]);
		await sql(`delete from srs_card_stats where user_id = any($1) and created_at >= $2`, [
			ALL_IDS,
			saved.startedAt
		]);
	});
	// Traces posées par ce fichier, puis celles que les séances ont ajoutées depuis le début
	await step('traces posées', async () => {
		await sql(
			`delete from skill_attempts where template_id in (select id from question_templates where title like $1)`,
			[`${PREFIXE} %`]
		);
	});
	for (const table of APPENDED_TABLES) {
		await step(`ajouts de ${table}`, async () => {
			await sql(`delete from ${table} where student_id = any($1) and created_at >= $2`, [
				ALL_IDS,
				saved.startedAt
			]);
		});
	}
	await step('catalogue d’avatars', async () => {
		await sql(`delete from avatar_catalog where key like 'verifs7\\_%'`);
	});
	// Modèles « Verifs7 … » en dernier (les lignes qui les citent sont parties)
	await step('modèles', async () => {
		await sql(
			`delete from question_template_points where template_id in (select id from question_templates where title like $1)`,
			[`${PREFIXE} %`]
		);
		await sql(`delete from question_templates where title like $1`, [`${PREFIXE} %`]);
		if (createdTemplates.length > 0) {
			await sql(`delete from question_templates where id = any($1::uuid[])`, [createdTemplates]);
		}
	});

	if (failures.length > 0) {
		throw new Error(`Remise de l'état d'origine incomplète :\n${failures.join('\n')}`);
	}
}

// Functions

/** Un modèle « Verifs7 … » publié, posé par SQL : « Combien font 3 + 4 ? » → 7 */
async function makeTemplate(title: string): Promise<string> {
	const variations = [
		{
			// `n` ne sert qu'à rendre chaque tirage distinct (une série écarte les doublons)
			statement: 'Combien font 3 + 4 ? (tirage n° {{n}}) [_]',
			variables: [{ name: 'n', expression: '1..99' }],
			blanks: [{ expectedAnswer: '7' }],
			correction: { steps: ['On additionne : $3 + 4 = 7$.'] }
		}
	];
	const rows = await sql<{ id: string }>(
		`insert into question_templates (type, grades, level, variations, status, title, created_by,
		                                 options, classification_node_id)
		 values ('fill_in_blanks', array['CE1'], 1, $1::jsonb, 'published', $2,
		         (select id from profiles where email = $3), '{}'::jsonb, null)
		 returning id::text`,
		[JSON.stringify(variations), `${PREFIXE} ${title}`, TEACHER.email]
	);
	createdTemplates.push(rows[0].id);
	return rows[0].id;
}

function seriesUrl(items: SeriesItem[], mode: 'typing' | 'interactive' | 'flash'): string {
	return buildSeriesLink('', items, { mode, seed: 7 });
}

async function loginAs(page: Page, student: Student): Promise<void> {
	await login(page, student.email, PASSWORD);
	await page.waitForLoadState('networkidle');
}

/** Va sur une page de l'espace élève et attend qu'elle soit calme (présence lue) */
async function visit(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}

async function typeInto(page: Page, scope: Locator, typed: string): Promise<void> {
	const field = scope.locator('input:not([type=hidden]):not([type=radio]), math-field').first();
	await field.scrollIntoViewIfNeeded();
	await field.click();
	await page.keyboard.type(typed, { delay: 60 });
}

const validate = (page: Page): Locator =>
	page.getByRole('button', { name: 'Valider', exact: true });

/** « C'est parti ! » : recliqué tant que la série n'a pas démarré (bouton pas encore hydraté) */
async function startSeries(page: Page, started: Locator): Promise<void> {
	await expect(async () => {
		const start = page.getByRole('button', { name: /C'est parti/ });
		if (await start.isVisible()) await start.click();
		await expect(started).toBeVisible({ timeout: 4000 });
	}).toPass({ timeout: 30_000 });
}

/** Joue une série de Saisie de `count` questions, toutes réussies, jusqu'au bilan */
async function playTypingSeries(page: Page, template: string, count: number): Promise<void> {
	await page.goto(seriesUrl([{ templateId: template, quantity: count, delay: 0 }], 'typing'));
	await page.waitForLoadState('networkidle');
	const card = page.getByTestId('typing-card');
	const next = page.locator('[data-typing-next]');
	for (let n = 1; n <= count; n++) {
		await expect(page.getByTestId('typing-position')).toHaveText(`Question ${n} / ${count}`);
		await card.locator('.flip-card-front').waitFor();
		await typeInto(page, card, '7');
		await validate(page).click();
		await expect(card.getByText(/^Juste$/).first()).toBeVisible();
		await next.click();
	}
	await expect(page.getByTestId('typing-summary')).toBeVisible();
}

/** Joue un Contrôle blanc de `count` questions, toutes réussies, jusqu'aux résultats */
async function playMockTest(page: Page, template: string, count: number): Promise<void> {
	await page.goto(seriesUrl([{ templateId: template, quantity: count, delay: 60 }], 'interactive'));
	await page.waitForLoadState('networkidle');
	await startSeries(page, page.getByTestId('interactive-position'));
	for (let n = 1; n <= count; n++) {
		await expect(page.getByTestId('interactive-position')).toHaveText(`Question ${n} sur ${count}`);
		const question = page.getByTestId('interactive-question');
		await expect(question).toHaveCount(1);
		await typeInto(page, question, '7');
		await validate(page).click();
	}
	await expect(page.getByRole('heading', { name: 'Résultats du test' })).toBeVisible();
}

// Palotin : décor

async function palotinOf(student: Student): Promise<PalotinType> {
	const rows = await sql<{ palotin_type: PalotinType }>(
		'select palotin_type from student_buddies where student_id = $1',
		[student.id]
	);
	return rows[0].palotin_type;
}

/** Les répliques d'un contexte pour ce Palotin, en une expression régulière exacte */
async function pool(student: Student, context: BuddyMessageContext): Promise<RegExp> {
	const messages = buddyMessages[await palotinOf(student)][context];
	const escaped = messages.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	return new RegExp(`^(${escaped.join('|')})$`);
}

/** Les répliques d'un contexte, en liste (pour dire laquelle on a vue) */
async function lines(student: Student, context: BuddyMessageContext): Promise<string[]> {
	return buddyMessages[await palotinOf(student)][context];
}

/**
 * L'élève au point neutre : aucune trace de ce fichier, Palotin sans Constance ni gain du jour,
 * dernier passage aujourd'hui, ni retour ni semaine déjà fêtés.
 */
async function baseline(student: Student): Promise<void> {
	await sql(
		`delete from skill_attempts where student_id = $1
		    and template_id in (select id from question_templates where title like $2)`,
		[student.id, `${PREFIXE} marqueur`]
	);
	await sql(`delete from skill_attempts where student_id = $1 and created_at >= $2`, [
		student.id,
		startedAt
	]);
	await sql(
		`update student_buddies
		    set xp_earned_today = 0, last_xp_date = (now() at time zone 'utc')::date - 1,
		        current_streak = 0, longest_streak = 0, last_activity_date = null,
		        constance_week_start = null, constance_days_this_week = 0
		  where student_id = $1`,
		[student.id]
	);
	await sql(
		`update student_last_visits
		    set last_visit_date = (now() at time zone 'utc')::date, welcome_back_on = null,
		        week_celebrated_on = null
		  where student_id = $1`,
		[student.id]
	);
}

/** Le Palotin à un niveau donné (pansées totales et tour de panse) */
async function setBuddyXp(student: Student, xp: number, level: number): Promise<void> {
	await sql(`update student_buddies set xp = $2, level = $3 where student_id = $1`, [
		student.id,
		xp,
		level
	]);
}

let markerTemplate: string | null = null;

/** Le modèle qui porte les traces de jours actifs (une trace de la RÉGULARITÉ exige un modèle) */
async function getMarkerTemplate(): Promise<string> {
	markerTemplate ??= await makeTemplate('marqueur');
	return markerTemplate;
}

/** 5 traces autonomes aujourd'hui : un jour actif */
async function plantActiveToday(student: Student, count = 5): Promise<void> {
	await sql(
		`insert into skill_attempts (student_id, template_id, success, source, place, created_at)
		 select $1, $2::uuid, true, 'auto', 'typing', now() - (i * interval '1 minute')
		   from generate_series(1, $3) i`,
		[student.id, await getMarkerTemplate(), count]
	);
}

/** Un jour actif (5 traces) le mercredi de la semaine qui précède de `weeksAgo` semaines */
async function plantActiveWeek(student: Student, weeksAgo: number): Promise<void> {
	await sql(
		`insert into skill_attempts (student_id, template_id, success, source, place, created_at)
		 select $1, $3::uuid, true, 'auto', 'typing',
		        ((date_trunc('week', now() at time zone 'Europe/Paris')
		          - make_interval(weeks => $2::int) + interval '2 days 11 hours')
		         at time zone 'Europe/Paris') + (i * interval '1 minute')
		   from generate_series(1, 5) i`,
		[student.id, weeksAgo, await getMarkerTemplate()]
	);
}

/** Aujourd'hui actif et `weeks - 1` semaines actives d'affilée avant : un compte de `weeks` */
async function plantStreak(student: Student, weeks: number): Promise<void> {
	await plantActiveToday(student);
	for (let k = 1; k < weeks; k++) await plantActiveWeek(student, k);
}

/** Lundi de la semaine en cours (heure de Paris) */
async function mondayOfThisWeek(): Promise<string> {
	const rows = await sql<{ monday: string }>(
		`select (date_trunc('week', now() at time zone 'Europe/Paris'))::date::text as monday`
	);
	return rows[0].monday;
}

async function weekCelebratedOn(student: Student): Promise<string | null> {
	const rows = await sql<{ d: string | null }>(
		'select week_celebrated_on::text as d from student_last_visits where student_id = $1',
		[student.id]
	);
	return rows[0].d;
}

async function welcomeBackOn(student: Student): Promise<string | null> {
	const rows = await sql<{ d: string | null }>(
		'select welcome_back_on::text as d from student_last_visits where student_id = $1',
		[student.id]
	);
	return rows[0].d;
}

// Palotin : rendu

/** Le badge orange de la Constance, posé à côté de l'avatar du Palotin (le bouton « Signaler » est orange aussi) */
const constanceBadge = (page: Page): Locator =>
	page
		.getByRole('button', { name: /Mon Palotin/ })
		.locator('xpath=following-sibling::div[contains(@class, "bg-orange-500")]');

/** Les répliques visibles dans la bulle du Palotin (accueil ou passage) */
const bubbleLines = (page: Page): Locator => page.locator('[data-buddy-bubble] p');

/** Relève, pendant `ms`, toutes les répliques qui passent dans la bulle */
async function watchBubble(page: Page, ms: number): Promise<string[]> {
	const seen = new Set<string>();
	const end = Date.now() + ms;
	while (Date.now() < end) {
		for (const text of await bubbleLines(page).allTextContents()) seen.add(text.trim());
		await page.waitForTimeout(250);
	}
	return [...seen];
}

/** Attend une réplique de ce contexte dans la bulle et la rend */
async function waitForLine(page: Page, student: Student, context: BuddyMessageContext) {
	const bubble = bubbleLines(page).filter({ hasText: await pool(student, context) });
	await expect(bubble.first()).toBeVisible({ timeout: 20_000 });
	return ((await bubble.first().textContent()) ?? '').trim();
}

/** L'expression du Palotin sur la carte de gain : ravi (`excited`) à la victoire, content (`happy`) sinon */
async function gainExpression(card: Locator): Promise<string> {
	const src =
		(await card.locator('img[src*="/images/buddies/"]').first().getAttribute('src')) ?? '';
	return /-(excited|happy|neutral)\b/.exec(src)?.[1] ?? src;
}

async function shootPage(page: Page, name: string): Promise<void> {
	await page.screenshot({ path: `${SHOTS}/${name}-${test.info().project.name}.png` });
}

// ============================================================================
// #2595 — Palotin, semaine qui devient active
// ============================================================================

test('#2595 — 5 réponses un même jour (série jouée) : le Palotin fête la 1re activité de la semaine à l’accueil, une seule fois ; recharger ou changer de page : plus rien ; aucun nombre de jours ni « Constance Royale »', async ({
	page
}) => {
	test.setTimeout(300_000);
	await baseline(E16);
	const template = await makeTemplate('2595 semaine');
	await loginAs(page, E16);

	// Une série de 5 réponses (hors contrôle) : 5 traces le même jour = jour actif
	await playTypingSeries(page, template, 5);
	await expect(page.getByTestId('buddy-gain-card')).toBeVisible();
	await expect
		.poll(
			async () =>
				(
					await sql<{ n: string }>(
						`select count(*)::text as n from skill_attempts
						  where student_id = $1 and template_id = $2 and place = 'typing' and source = 'auto'`,
						[E16.id, template]
					)
				)[0].n
		)
		.toBe('5');

	// Retour à l'accueil : le Palotin fête la semaine qui devient active
	await page.goto(HOME_PAGE);
	await page.waitForLoadState('networkidle');
	const said = await waitForLine(page, E16, 'week_first_activity');
	expect(said).not.toMatch(FORBIDDEN_IN_BUBBLE);
	await shootPage(page, '2595-semaine-accueil');
	// Le serveur retient le lundi de la semaine : une seule fois
	await expect.poll(() => weekCelebratedOn(E16)).toBe(await mondayOfThisWeek());

	// Recharger : plus rien ; une page de passage : plus rien non plus
	await page.reload();
	await page.waitForLoadState('networkidle');
	const afterReload = await watchBubble(page, 6000);
	const weekLines = await lines(E16, 'week_first_activity');
	expect(afterReload.filter((text) => weekLines.includes(text))).toEqual([]);
	await visit(page, PASSAGE_PAGE);
	const onPassage = await watchBubble(page, 6000);
	expect(onPassage.filter((text) => weekLines.includes(text))).toEqual([]);
});

test('#2595 — le même jour sans cinq réponses (4 traces) : rien à l’arrivée, ni à l’accueil ni sur une page de l’espace élève', async ({
	page
}) => {
	test.setTimeout(120_000);
	await baseline(E17);
	await plantActiveToday(E17, 4);
	await loginAs(page, E17);
	const onHome = await watchBubble(page, 7000);
	const weekLines = [
		...(await lines(E17, 'week_first_activity')),
		...(await lines(E17, 'active_weeks_3')),
		...(await lines(E17, 'return_after_pause'))
	];
	expect(onHome.filter((text) => weekLines.includes(text))).toEqual([]);
	await visit(page, PASSAGE_PAGE);
	// Le Palotin est bien là (écusson) : le silence n'est pas une page sans Palotin
	await expect(page.getByTestId('palotin-presence')).toBeVisible();
	const onPassage = await watchBubble(page, 7000);
	expect(onPassage.filter((text) => weekLines.includes(text))).toEqual([]);
	expect(await weekCelebratedOn(E17)).toBeNull();
});

for (const [weeks, context] of [
	[3, 'active_weeks_3'],
	[5, 'active_weeks_5'],
	[10, 'active_weeks_10']
] as const) {
	test(`#2595 — ${weeks}e semaine active d’affilée : réplique du palier ${weeks} à la place de la 1re activité, sur une page de l’espace élève`, async ({
		page
	}) => {
		test.setTimeout(120_000);
		await baseline(E18);
		await loginAs(page, E18);
		// La page d'arrivée (accueil) vient d'être vue sans fête : le décor se pose après la connexion
		await plantStreak(E18, weeks);
		await visit(page, PASSAGE_PAGE);
		const said = await waitForLine(page, E18, context);
		expect(said).not.toMatch(FORBIDDEN_IN_BUBBLE);
		// Pas la réplique ordinaire de la semaine à la place du palier
		const ordinary = await lines(E18, 'week_first_activity');
		expect(ordinary).not.toContain(said);
		await shootPage(page, `2595-palier-${weeks}`);
		await expect.poll(() => weekCelebratedOn(E18)).toBe(await mondayOfThisWeek());
	});
}

test('#2595 — 4 semaines d’affilée (entre deux paliers) : la réplique ordinaire de la 1re activité, pas un palier', async ({
	page
}) => {
	test.setTimeout(120_000);
	await baseline(E18);
	await loginAs(page, E18);
	await plantStreak(E18, 4);
	await visit(page, PASSAGE_PAGE);
	const said = await waitForLine(page, E18, 'week_first_activity');
	expect(said).not.toMatch(FORBIDDEN_IN_BUBBLE);
});

test('#2595 — élève revenu après une pause (jour actif le jour même) : seule la fête du retour, pas de seconde bulle ce jour-là, aucun nombre de jours', async ({
	page
}) => {
	test.setTimeout(120_000);
	await baseline(E19);
	await loginAs(page, E19);
	await plantStreak(E19, 3);
	// Retour noté aujourd'hui, et un jour travaillé depuis (le jour même) : la fête du retour est due
	await sql(
		`update student_last_visits set welcome_back_on = (now() at time zone 'utc')::date
	            where student_id = $1`,
		[E19.id]
	);
	await sql(
		`update student_buddies set last_activity_date = (now() at time zone 'utc')::date
	            where student_id = $1`,
		[E19.id]
	);
	await visit(page, PASSAGE_PAGE);
	const first = await waitForLine(page, E19, 'return_after_pause');
	expect(first).not.toMatch(FORBIDDEN_IN_BUBBLE);
	// Pendant les 14 secondes qui suivent (la bulle dure 5 s), aucune réplique de semaine
	const seen = await watchBubble(page, 14_000);
	const weekLines = [
		...(await lines(E19, 'week_first_activity')),
		...(await lines(E19, 'active_weeks_3')),
		...(await lines(E19, 'active_weeks_5'))
	];
	expect(seen.filter((text) => weekLines.includes(text))).toEqual([]);
	// Le retour est effacé, et la semaine est retenue d'office (un moment à la fois)
	await expect.poll(() => welcomeBackOn(E19)).toBeNull();
	expect(await weekCelebratedOn(E19)).toBe(await mondayOfThisWeek());
});

// ============================================================================
// #2589 — Palotin, retour après une pause et Constance
// ============================================================================

test('#2589 — Constance perdue : l’état du Palotin ne montre ni « Constance Royale : 0 semaine » ni badge, aucune réplique de semaine ratée ; « Cette semaine : x jours sur 3 » et le record restent', async ({
	page
}) => {
	test.setTimeout(120_000);
	await baseline(E17);
	// Dernière semaine enregistrée il y a 3 semaines, tenue (3 jours), série 4, record 6 : la Constance est perdue
	await sql(
		`update student_buddies
		    set constance_week_start = (date_trunc('week', (now() at time zone 'utc')::date) - interval '21 days')::date,
		        constance_days_this_week = 3, current_streak = 4, longest_streak = 6
		  where student_id = $1`,
		[E17.id]
	);
	await loginAs(page, E17);
	await visit(page, HOME_PAGE);
	const avatar = page.getByRole('button', { name: /Mon Palotin/ });
	await expect(avatar).toBeVisible({ timeout: 20_000 });
	// Aucun badge orange de la Constance sur l'avatar
	await expect(constanceBadge(page)).toHaveCount(0);
	// Les répliques des 8 premières secondes : aucune « semaine ratée », aucune Constance
	const seen = await watchBubble(page, 8000);
	expect(seen.filter((text) => /Constance|semaine|série/i.test(text))).toEqual([]);

	// L'état (clic sur l'écusson) : la semaine en cours et le record restent, pas de Constance
	await avatar.click();
	const panel = page.locator('div.rounded-lg.bg-popover', { hasText: 'Cette semaine' });
	await expect(panel).toBeVisible();
	await expect(panel.getByText('Cette semaine : 0 jour sur 3')).toBeVisible();
	await expect(panel.getByText('Record : 6 semaines')).toBeVisible();
	await expect(panel.getByText(lore.learning.streak)).toHaveCount(0);
	await expect(panel).not.toContainText(/0 semaine/);
	await shootPage(page, '2589-constance-perdue');

	// La remise à zéro est faite en silence côté base, le record reste
	await expect
		.poll(async () => {
			const rows = await sql<{ current_streak: number; longest_streak: number }>(
				'select current_streak, longest_streak from student_buddies where student_id = $1',
				[E17.id]
			);
			return `${rows[0].current_streak}/${rows[0].longest_streak}`;
		})
		.toBe('0/6');

	// Contrôle : une Constance tenue (série 2, semaine en cours) SE VOIT, pour que l'absence ci-dessus compte
	await sql(
		`update student_buddies
		    set constance_week_start = date_trunc('week', (now() at time zone 'utc')::date)::date,
		        constance_days_this_week = 2, current_streak = 2, longest_streak = 6
		  where student_id = $1`,
		[E17.id]
	);
	await visit(page, HOME_PAGE);
	await expect(constanceBadge(page)).toHaveText('2', { timeout: 20_000 });
	await page.getByRole('button', { name: /Mon Palotin/ }).click();
	await expect(page.getByText(`${lore.learning.streak} : 2 semaines`)).toBeVisible();
	await expect(page.getByText('Cette semaine : 2 jours sur 3')).toBeVisible();
});

/** Décor du retour après 21 jours : retour noté aujourd'hui, pas encore de travail depuis */
async function plantReturnAfterPause(student: Student): Promise<void> {
	await baseline(student);
	await sql(
		`update student_last_visits set welcome_back_on = (now() at time zone 'utc')::date
		  where student_id = $1`,
		[student.id]
	);
	await sql(
		`update student_buddies set last_activity_date = (now() at time zone 'utc')::date - 22
		  where student_id = $1`,
		[student.id]
	);
}

for (const [where, path] of [
	['à l’accueil', HOME_PAGE],
	['sur une page de l’espace élève', PASSAGE_PAGE]
] as const) {
	test(`#2589 — retour après 21 jours : à l’arrivée aucune bulle triste ni « tu m’as manqué » ; après une série, ${where} le Palotin, joyeux, fête le retour une seule fois, sans nombre de jours, et rien ne le recouvre`, async ({
		page
	}) => {
		test.setTimeout(240_000);
		const student = where === 'à l’accueil' ? E18 : E19;
		await plantReturnAfterPause(student);
		const template = await makeTemplate(`2589 retour ${student.email.slice(5, 8)}`);
		await loginAs(page, student);
		const returnLines = await lines(student, 'return_after_pause');

		// À l'arrivée : l'élève n'a pas encore travaillé, le Palotin ne fête rien et ne dit rien de triste
		await visit(page, path);
		const arrival = await watchBubble(page, 6000);
		expect(arrival.filter((text) => returnLines.includes(text))).toEqual([]);
		expect(arrival.filter((text) => /manqu|absen|jours?\b|semaine/i.test(text))).toEqual([]);
		expect(await welcomeBackOn(student)).not.toBeNull();

		// Une série d'Entraînement (1 question réussie) : un jour travaillé
		await playTypingSeries(page, template, 1);
		await expect(page.getByTestId('buddy-gain-card')).toBeVisible();

		// De retour sur la page : la fête du retour, joyeuse (une seule bulle, jamais recouverte)
		await page.goto(path);
		const said = await waitForLine(page, student, 'return_after_pause');
		expect(said).not.toMatch(FORBIDDEN_IN_BUBBLE);
		const avatarSrc = await page
			.locator('img[src*="/images/buddies/"]')
			.evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src') ?? ''));
		expect(avatarSrc.some((src) => /-happy/.test(src))).toBe(true);
		await shootPage(page, `2589-retour-${student.email.slice(5, 8)}`);
		// Pendant la bulle (5 s), personne ne la remplace : salutation, annonce de la Chatterie
		const during = await watchBubble(page, 4000);
		expect(during.filter((text) => text !== said && text !== '')).toEqual([]);

		// Le serveur a retenu la fête : recharger ne la refait pas
		await expect.poll(() => welcomeBackOn(student)).toBeNull();
		await page.reload();
		await page.waitForLoadState('networkidle');
		const afterReload = await watchBubble(page, 6000);
		expect(afterReload.filter((text) => returnLines.includes(text))).toEqual([]);
	});
}

// ============================================================================
// #2599 — Palotin, question longtemps ratée enfin réussie
// ============================================================================

/** 3 échecs « auto » d'un modèle, le 1er il y a 8 jours, sans réussite entre eux */
async function plantStruggle(student: Student, template: string, failures = 3): Promise<void> {
	await sql(
		`insert into skill_attempts (student_id, template_id, success, source, place, created_at)
		 select $1, $2::uuid, false, 'auto', 'typing', now() - interval '8 days' + (i * interval '2 hours')
		   from generate_series(1, $3) i`,
		[student.id, template, failures]
	);
}

test('#2599 — Saisie : 3 échecs dont le 1er il y a 8 jours, puis réussi → la réplique de victoire sur la carte de fin de série, « Nouveau tour de panse » toujours dit', async ({
	page
}) => {
	test.setTimeout(240_000);
	await baseline(E16);
	await setBuddyXp(E16, 175, 4);
	const template = await makeTemplate('2599 saisie');
	await plantStruggle(E16, template);
	await loginAs(page, E16);
	await playTypingSeries(page, template, 1);
	const card = page.getByTestId('buddy-gain-card');
	await expect(card).toBeVisible();
	const victory = await lines(E16, 'long_struggle_won');
	const shown = (await card.locator('p.italic').textContent()) ?? '';
	expect(victory.map((m) => `« ${m} »`)).toContain(shown.trim());
	expect(await gainExpression(card)).toBe('excited');
	await expect(card.getByText(`Nouveau ${lore.buddy.level.toLowerCase()} : 5 !`)).toBeVisible();
	await shootPage(page, '2599-saisie-victoire');
});

test('#2599 — Saisie, plafond du jour atteint (95 sur 100 gagnés, puis le 3e jour de la semaine : +30 de Constance dans un plafond plein) : la réplique de victoire ET « panse pleine » restent dits', async ({
	page
}) => {
	test.setTimeout(240_000);
	await baseline(E16);
	await setBuddyXp(E16, 120, 4);
	await sql(
		`update student_buddies
		    set xp_earned_today = 95, last_xp_date = (now() at time zone 'utc')::date,
		        constance_week_start = date_trunc('week', (now() at time zone 'utc')::date)::date,
		        constance_days_this_week = 2, last_activity_date = (now() at time zone 'utc')::date - 1
		  where student_id = $1`,
		[E16.id]
	);
	const template = await makeTemplate('2599 plafond');
	await plantStruggle(E16, template);
	await loginAs(page, E16);
	await playTypingSeries(page, template, 1);
	const card = page.getByTestId('buddy-gain-card');
	await expect(card).toBeVisible();
	await expect(card.getByText(/Sa panse est pleine pour aujourd’hui/)).toBeVisible();
	const victory = await lines(E16, 'long_struggle_won');
	const shown = (await card.locator('p.italic').textContent()) ?? '';
	expect(victory.map((m) => `« ${m} »`)).toContain(shown.trim());
	expect(await gainExpression(card)).toBe('excited');
});

test('#2599 — relancer une série avec le même modèle réussi : la réplique habituelle, plus celle de victoire', async ({
	page
}) => {
	test.setTimeout(300_000);
	await baseline(E18);
	await setBuddyXp(E18, 30, 2);
	const template = await makeTemplate('2599 rejouer');
	await plantStruggle(E18, template);
	await loginAs(page, E18);
	const victory = (await lines(E18, 'long_struggle_won')).map((m) => `« ${m} »`);

	await playTypingSeries(page, template, 1);
	let card = page.getByTestId('buddy-gain-card');
	await expect(card).toBeVisible();
	expect(victory).toContain(((await card.locator('p.italic').textContent()) ?? '').trim());

	// Même modèle, nouvelle série : la dernière réussite n'est plus précédée de 3 échecs
	await playTypingSeries(page, template, 1);
	card = page.getByTestId('buddy-gain-card');
	await expect(card).toBeVisible();
	const usual = (await card.locator('p.italic').textContent()) ?? '';
	expect(victory).not.toContain(usual.trim());
	expect(await gainExpression(card)).toBe('happy');
	// Un gain ordinaire de séance, ni victoire ni montée de tour de panse
	expect(await lines(E18, 'session_gain')).toContain(usual.replace(/^« | »$/g, ''));
	await shootPage(page, '2599-rejouer-habituelle');
});

test('#2599 — Contrôle blanc : même modèle longtemps raté puis réussi → la réplique de victoire sur la carte de fin', async ({
	page
}) => {
	test.setTimeout(240_000);
	await baseline(E17);
	await setBuddyXp(E17, 300, 6);
	const template = await makeTemplate('2599 contrôle blanc');
	await plantStruggle(E17, template);
	await loginAs(page, E17);
	await playMockTest(page, template, 1);
	const card = page.getByTestId('buddy-gain-card');
	await expect(card).toBeVisible();
	const victory = await lines(E17, 'long_struggle_won');
	const shown = (await card.locator('p.italic').textContent()) ?? '';
	expect(victory.map((m) => `« ${m} »`)).toContain(shown.trim());
	expect(await gainExpression(card)).toBe('excited');
	await shootPage(page, '2599-controle-blanc-victoire');
});

test('#2599 — flash-cards : même modèle longtemps raté puis « Réussi » → aucune carte de gain, donc aucune réplique de victoire', async ({
	page
}) => {
	test.setTimeout(240_000);
	await baseline(E19);
	const template = await makeTemplate('2599 flash');
	await plantStruggle(E19, template);
	await loginAs(page, E19);
	await page.goto(seriesUrl([{ templateId: template, quantity: 1, delay: 0 }], 'flash'));
	await page.waitForLoadState('networkidle');
	await expect(page.getByTestId('flash-position')).toHaveText('Carte 1 / 1');
	await page.getByTestId('flash-card').getByRole('button', { name: 'Voir la correction' }).click();
	await page.getByRole('button', { name: 'Réussi', exact: true }).click();
	await expect(page.getByTestId('flash-summary')).toBeVisible();
	await page.waitForLoadState('networkidle');
	await expect(page.getByTestId('buddy-gain-card')).toHaveCount(0);
	const victory = await lines(E19, 'long_struggle_won');
	const bodyText = (await page.locator('body').textContent()) ?? '';
	expect(victory.filter((m) => bodyText.includes(m))).toEqual([]);
});

test('#2599 — Course aux nombres : même modèle longtemps raté puis réussi → la réplique de victoire sur la carte de fin', async ({
	page
}) => {
	test.setTimeout(240_000);
	await baseline(E17);
	await setBuddyXp(E17, 90, 3);
	const template = await makeTemplate('2599 course');
	await plantStruggle(E17, template);
	await loginAs(page, E17);
	await page.goto(
		buildSeriesLink('', [{ templateId: template, quantity: 1, delay: 0 }], {
			mode: 'course',
			timeLimit: 120,
			seed: 7
		})
	);
	await page.waitForLoadState('networkidle');
	const finish = page.getByRole('button', { name: 'Terminer', exact: true });
	await startSeries(page, finish);
	const question = page.locator('#question-0');
	await expect(question).toBeVisible();
	await typeInto(page, question, '7');
	await validate(page).click();
	await finish.click();
	const card = page.getByTestId('buddy-gain-card');
	await expect(card).toBeVisible({ timeout: 20_000 });
	const victory = await lines(E17, 'long_struggle_won');
	const shown = (await card.locator('p.italic').textContent()) ?? '';
	expect(victory.map((m) => `« ${m} »`)).toContain(shown.trim());
	expect(await gainExpression(card)).toBe('excited');
	await shootPage(page, '2599-course-victoire');
});

test('#2599 — révision d’un paquet : même modèle longtemps raté puis « Réussi » → le gain de la séance s’affiche mais jamais la réplique de victoire', async ({
	page
}) => {
	test.setTimeout(240_000);
	await baseline(E18);
	const template = await makeTemplate('2599 révision');
	await plantStruggle(E18, template);
	const [deck] = await sql<{ id: string }>(
		`insert into srs_decks (name, owner_id, deck_type) values ($1, $2, 'personal') returning id::text`,
		[`${PREFIXE} 2599 paquet`, E18.id]
	);
	await sql(`insert into srs_cards (deck_id, card_type, template_id) values ($1, 'template', $2)`, [
		deck.id,
		template
	]);
	await loginAs(page, E18);
	await page.goto(`/dashboard/revisions/decks/${deck.id}/study`);
	await page.waitForLoadState('networkidle');
	await expect(page.getByText('Carte 1 sur 1')).toBeVisible();
	await page.getByRole('button', { name: 'Voir la correction' }).click();
	await page.getByRole('button', { name: 'Réussi', exact: true }).click();
	await expect(page.getByText('Session terminée !')).toBeVisible();
	await page.waitForLoadState('networkidle');
	// La séance de révision a son gain (forfait) : la carte est là, sans réplique de victoire
	await expect(page.getByTestId('buddy-gain-card')).toBeVisible();
	const victory = await lines(E18, 'long_struggle_won');
	const bodyText = (await page.locator('body').textContent()) ?? '';
	expect(victory.filter((m) => bodyText.includes(m))).toEqual([]);
	await shootPage(page, '2599-revision-sans-victoire');
	// La carte a bien été révisée (sinon l'absence ne prouve rien) : une trace de révision du modèle
	const stats = await sql<{ n: string }>(
		`select count(*)::text as n from skill_attempts
		  where student_id = $1 and template_id = $2 and place = 'review'`,
		[E18.id, template]
	);
	expect(stats[0].n).toBe('1');
});

// ============================================================================
// #2574 — Boutique d'avatars
// ============================================================================

const SHOP_IMAGE = Buffer.from('R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=', 'base64');

/** Les images de la boutique et la photo Google fictive : un pixel, aucun fichier ajouté au dépôt */
async function stubAvatarImages(page: Page): Promise<void> {
	const serve = (route: { fulfill: (o: { contentType: string; body: Buffer }) => Promise<void> }) =>
		route.fulfill({ contentType: 'image/gif', body: SHOP_IMAGE });
	await page.route('**/avatars/verifs7_*.webp', serve);
	await page.route('**/lh3.googleusercontent.com/**', serve);
}

/** Le catalogue : 4 avatars « verifs7_… » (prix 15, 30, 60 et 100), retirés par `restoreDecor` */
async function plantCatalog(): Promise<void> {
	await sql(
		`insert into avatar_catalog (key, family, name, price, image_path, sort_order) values
		   ('verifs7_emblem', 'emblem', 'Verifs7 Emblème', 15, '/avatars/verifs7_emblem.webp', 1),
		   ('verifs7_galopin', 'galopin', 'Verifs7 Galopin', 30, '/avatars/verifs7_galopin.webp', 2),
		   ('verifs7_creature', 'creature', 'Verifs7 Créature', 60, '/avatars/verifs7_creature.webp', 3),
		   ('verifs7_automate', 'automaton', 'Verifs7 Automate', 100, '/avatars/verifs7_automate.webp', 4)
		 on conflict (key) do nothing`
	);
}

async function setProfile(
	student: Student,
	fields: Record<string, string | number | boolean | null>
) {
	const allowed = [
		'gidouilles',
		'consent_required',
		'consent_granted_at',
		'consent_grace_period_ends',
		'avatar_url',
		'google_avatar_url'
	];
	for (const [column, value] of Object.entries(fields)) {
		if (!allowed.includes(column)) throw new Error(`colonne non prévue : ${column}`);
		await sql(`update profiles set ${column} = $2 where id = $1`, [student.id, value]);
	}
}

/** Fermer ou rouvrir le Marché de la classe de l'élève */
async function setMarketplaceOpen(student: Student, open: boolean): Promise<void> {
	await sql(
		`update marketplace_config set enabled_for_class = $2
		  where class_id in (select class_id from class_members where student_id = $1)`,
		[student.id, open]
	);
}

const avatarsTab = (page: Page): Locator => page.getByRole('tab', { name: 'Avatars' });
const headerImage = (page: Page): Locator =>
	page.locator('header a[href="/dashboard/profile"] img');

test('#2574 — Marché, onglet « Avatars » (libellé visible sur ordinateur, icône seule sur téléphone) : catalogue vide → « Les premiers avatars arrivent bientôt au Marché. »', async ({
	page
}) => {
	test.setTimeout(120_000);
	await baseline(E16);
	// La base locale n'a pas encore le premier lot (PR 3 du chantier) : le catalogue est vide
	expect((await sql<{ n: string }>('select count(*)::text as n from avatar_catalog'))[0].n).toBe(
		'0'
	);
	await loginAs(page, E16);
	await visit(page, '/dashboard/student/marketplace');
	await expect(avatarsTab(page)).toBeVisible();
	const label = avatarsTab(page).locator('span', { hasText: 'Avatars' });
	const box = await label.boundingBox();
	const isPhone = (page.viewportSize()?.width ?? 1280) < 640;
	if (isPhone) {
		// Téléphone : l'icône seule, le libellé n'est lu que par les lecteurs d'écran (1 px)
		expect(box === null || box.width <= 2).toBe(true);
		await expect(avatarsTab(page).locator('svg')).toBeVisible();
	} else {
		expect(box?.width ?? 0).toBeGreaterThan(30);
	}
	await avatarsTab(page).click();
	await expect(page.getByText('Les premiers avatars arrivent bientôt au Marché.')).toBeVisible();
	await shootPage(page, '2574-marche-vide');
});

test('#2574 — « Mon profil » : la section Avatars est là, catalogue vide ; classe à Marché FERMÉ : le Marché renvoie à l’accueil mais la section reste dans « Mon profil »', async ({
	page
}) => {
	test.setTimeout(120_000);
	await baseline(E19);
	await loginAs(page, E19);
	// Marché ouvert : « Mon profil » a la section
	await visit(page, '/dashboard/profile');
	const section = page.getByRole('region', { name: 'Avatars' });
	await expect(section).toBeVisible();
	await expect(section.getByText('Les premiers avatars arrivent bientôt au Marché.')).toBeVisible();

	// Marché fermé pour la classe : plus de Marché, mais la boutique reste dans « Mon profil »
	await setMarketplaceOpen(E19, false);
	await page.goto('/dashboard/student/marketplace');
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL(/\/dashboard\/?$/);
	await visit(page, '/dashboard/profile');
	await expect(page.getByRole('region', { name: 'Avatars' })).toBeVisible();
	await expect(
		page.getByRole('region', { name: 'Avatars' }).getByText('Les premiers avatars arrivent bientôt')
	).toBeVisible();
	await shootPage(page, '2574-profil-marche-ferme');
	await setMarketplaceOpen(E19, true);
});

test('#2574 — catalogue rempli : rangé par famille avec prix, « Il te manque N gidouilles » ; acheter débite et inscrit au journal, « Porter » change l’en-tête aussitôt, « Retirer mon avatar » rend la photo Google', async ({
	page
}) => {
	test.setTimeout(180_000);
	await baseline(E16);
	await plantCatalog();
	await setProfile(E16, {
		gidouilles: 51,
		consent_required: false,
		avatar_url: GOOGLE_PHOTO,
		google_avatar_url: GOOGLE_PHOTO
	});
	await stubAvatarImages(page);
	await loginAs(page, E16);
	await visit(page, '/dashboard/student/marketplace');
	await avatarsTab(page).click();

	// Les familles présentes (titres du catalogue), les noms et les prix
	for (const family of ['emblem', 'galopin', 'creature', 'automaton'] as const) {
		const label = AVATAR_FAMILIES.find((f) => f.id === family)?.label ?? '';
		await expect(page.getByRole('heading', { name: label })).toBeVisible();
	}
	const emblem = page.locator('article', { hasText: 'Verifs7 Emblème' });
	await expect(emblem).toContainText('15');
	// Solde 51 : l'avatar à 60 manque de 9 gidouilles, achat désactivé ; celui à 15 s'achète
	const creature = page.locator('article', { hasText: 'Verifs7 Créature' });
	await expect(creature.getByText('Il te manque 9 gidouilles.')).toBeVisible();
	await expect(creature.getByRole('button', { name: 'Acheter' })).toBeDisabled();
	await shootPage(page, '2574-catalogue');

	// Acheter : solde débité, ligne au journal, l'avatar n'est pas porté pour autant
	await emblem.getByRole('button', { name: 'Acheter' }).click();
	await expect(page.getByText('Verifs7 Emblème rejoint ta collection.')).toBeVisible();
	await expect(emblem.getByRole('button', { name: 'Porter' })).toBeVisible();
	const balance = await sql<{ g: string }>(
		'select gidouilles::text as g from profiles where id = $1',
		[E16.id]
	);
	expect(Number(balance[0].g)).toBe(36);
	const journal = await sql<{ delta: string; reason: string }>(
		`select delta::text, reason from gidouilles_activity
		  where student_id = $1 and created_at >= $2 and reason like '%Verifs7 Emblème%'`,
		[E16.id, startedAt]
	);
	expect(journal.map((row) => `${Number(row.delta)} ${row.reason}`)).toEqual([
		'-15 Avatar : Verifs7 Emblème acheté'
	]);
	await expect(headerImage(page)).toHaveAttribute('src', GOOGLE_PHOTO);

	// Porter : l'en-tête change aussitôt (sans recharger la page à la main)
	await emblem.getByRole('button', { name: 'Porter' }).click();
	await expect(headerImage(page)).toHaveAttribute('src', '/avatars/verifs7_emblem.webp');
	await expect(emblem.getByText('Porté', { exact: true })).toBeVisible();
	await shootPage(page, '2574-porte');

	// Retirer : la photo Google revient
	await page.getByRole('button', { name: 'Retirer mon avatar' }).click();
	await expect(headerImage(page)).toHaveAttribute('src', GOOGLE_PHOTO);
	await expect(page.getByRole('button', { name: 'Retirer mon avatar' })).toHaveCount(0);
	await expect(emblem.getByRole('button', { name: 'Porter' })).toBeVisible();
});

/** Décor : E19 sans consentement parental (délai de grâce passé), 100 gidouilles, un avatar déjà acquis */
async function plantWithoutConsent(): Promise<void> {
	await baseline(E19);
	await plantCatalog();
	await setProfile(E19, {
		gidouilles: 100,
		consent_required: true,
		consent_granted_at: null,
		consent_grace_period_ends: new Date(Date.now() - 86_400_000).toISOString(),
		avatar_url: GOOGLE_PHOTO,
		google_avatar_url: GOOGLE_PHOTO
	});
	await sql(`delete from student_avatars where student_id = $1`, [E19.id]);
	await sql(
		`insert into student_avatars (student_id, avatar_key, price_paid) values ($1, 'verifs7_galopin', 30)`,
		[E19.id]
	);
}

test('#2574 — sans consentement parental, Marché : la page s’affiche, « Acheter » y est bloqué, « Porter » marche (E66 corrigé)', async ({
	page
}) => {
	test.setTimeout(120_000);
	await plantWithoutConsent();
	await stubAvatarImages(page);
	await loginAs(page, E19);
	await visit(page, '/dashboard/student/marketplace');
	// Attendu de la ligne : le Marché s'affiche, « Acheter » y est bloqué, « Porter » marche
	// Sélecteurs prouvés en positif plus haut : l'onglet (`avatarsTab`, test « catalogue vide »,
	// E16) ; la carte et « Acheter » grisé (test « catalogue rempli », `creature`) ; « Porter »
	// (même test, `emblem`).
	// La question « As-tu 15 ans ou plus ? » (2nde soumise au consentement, sans déclaration)
	// couvre la page de l'espace élève : fermée sans répondre, rien n'est écrit au profil
	const ageQuestion = page.getByRole('dialog', { name: 'As-tu 15 ans ou plus ?' });
	await expect(ageQuestion).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(ageQuestion).toBeHidden();
	await expect(avatarsTab(page)).toBeVisible({ timeout: 2000 });
	await avatarsTab(page).click();
	await expect(
		page.locator('article', { hasText: 'Verifs7 Emblème' }).getByRole('button', { name: 'Acheter' })
	).toBeDisabled({ timeout: 2000 });
	await expect(
		page.locator('article', { hasText: 'Verifs7 Galopin' }).getByRole('button', { name: 'Porter' })
	).toBeEnabled({ timeout: 2000 });
	await shootPage(page, '2574-sans-consentement-marche');
});

test('#2574 — sans consentement parental, « Mon profil » : « Porter » marche, « Acheter » est grisé, rien n’est débité (E67 corrigé)', async ({
	page
}) => {
	test.setTimeout(120_000);
	await plantWithoutConsent();
	await stubAvatarImages(page);
	await loginAs(page, E19);
	await visit(page, '/dashboard/profile');
	const section = page.getByRole('region', { name: 'Avatars' });
	// Porter celui qu'on a déjà : marche, et l'en-tête change
	const owned = section.locator('article', { hasText: 'Verifs7 Galopin' });
	await owned.getByRole('button', { name: 'Porter' }).click();
	await expect(headerImage(page)).toHaveAttribute('src', '/avatars/verifs7_galopin.webp');
	await expect(owned.getByText('Porté', { exact: true })).toBeVisible();

	// Acheter : bloqué (grisé) ici aussi, le solde (100) paierait pourtant l'Emblème (15).
	// Sélecteur prouvé en positif : `toBeDisabled()` du test « catalogue rempli » (`creature`)
	const toBuy = section.locator('article', { hasText: 'Verifs7 Emblème' });
	await expect(toBuy.getByRole('button', { name: 'Acheter' })).toBeDisabled({ timeout: 2000 });
	// Le bouton grisé n'est qu'un confort : la même demande envoyée sans lui est refusée par
	// le serveur, rien n'est débité, rien n'entre dans la collection
	const refused = await page.evaluate(async () => {
		const response = await fetch('/api/student/avatars/buy', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ avatar: 'verifs7_emblem' })
		});
		return response.status;
	});
	expect(refused).toBe(403);
	const balance = await sql<{ g: string }>(
		'select gidouilles::text as g from profiles where id = $1',
		[E19.id]
	);
	expect(Number(balance[0].g)).toBe(100);
	const bought = await sql<{ n: string }>(
		`select count(*)::text as n from student_avatars where student_id = $1 and avatar_key = 'verifs7_emblem'`,
		[E19.id]
	);
	expect(bought[0].n).toBe('0');
	await shootPage(page, '2574-sans-consentement-profil');
});
