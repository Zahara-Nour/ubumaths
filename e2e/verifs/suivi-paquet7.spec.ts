import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import pg from 'pg';
import { ADMIN, assertLocalServerEnv, login, TEACHER } from './helpers/carnet';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';
import { acquireLock, LOCK_WAIT_MAX_MS, refreshLock, releaseLock } from './helpers/verrou';

/**
 * Analytique de la classe et suivi d'un élève — paquet 7 du tri — base LOCALE
 * ===========================================================================
 *
 * Reprend les lignes #2666 (taux de réussite), #2639 (suivi d'un élève), #2643 (suivi, trois
 * blocs) et #2631 (erreurs par point) de `docs/wip/verifications-manuelles.md`.
 *
 *   VERIFS_PORT=5176 pnpm test:verifs e2e/verifs/suivi-paquet7.spec.ts [--project iphone]
 *
 * Élèves : eleve10 à eleve15 SEULEMENT (verrou `eleves-10-15`). Décor posé par SQL (déclencheurs
 * suspendus : aucune récompense, aucune notification) puis retiré en `afterAll` :
 *   - une classe « Verifs7 suivi … » (1re spé, école des élèves 11 à 14) qui reçoit les six élèves ;
 *   - des modèles « Verifs7 suivi … » rattachés à quatre points sans aucune trace dans la base
 *     (aucun taux ne vient d'ailleurs), des traces corrigées, déclarées et de séries, un contrôle
 *     rendu (deux copies) et un contrôle non commencé ;
 *   - des traces de travail autonome sur plusieurs semaines (régularité).
 * L'élève 11 est retiré de toutes ses classes le temps du test « non assigné », puis remis tel quel.
 *
 * ⚠️ `session_replication_role = replica` (connexion du décor) suspend les déclencheurs, MAIS AUSSI
 * les clés étrangères et leurs cascades pour cette connexion : supprimer une ligne parente ne retire
 * rien de ses enfants. Toute table ajoutée au décor doit donc être nettoyée À LA MAIN dans
 * `cleanup()`, et dans le bon ordre.
 *
 * Verrous : `eleves-10-15` puis `compte-prof-mode-test` (commun avec `controles-paquet7`).
 *
 * Attendus changés par une décision écrite : l'élève s'appelle « Galopin » dans l'interface
 * (`lore.entities.student`) ; une classe, un « Bataillon ».
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.describe.configure({ mode: 'serial' });

// ============================================================================
// CONSTANTES
// ============================================================================

const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const LOCK = 'eleves-10-15';
/** Mode test du compte prof : commun avec `controles-paquet7` (qui le passe à « vrai » le temps de ses essais) */
const LOCK_PROF = 'compte-prof-mode-test';
const PREFIXE = 'Verifs7 suivi';
const SHOTS = '.captures/verifs/suivi7';
/** Reprise après un arrêt brutal : les adhésions de l'élève 11 retirées le temps d'un test */
const RECOVERY = '.captures/verifs/suivi-paquet7-adhesions.json';

const id = (n: number) => `5eed0000-0000-4000-8000-0000000000${n}`;
const S10 = id(10);
const S11 = id(11);
const S12 = id(12);
const S13 = id(13);
const S14 = id(14);
const S15 = id(15);
const ALL_STUDENTS = [S10, S11, S12, S13, S14, S15];

/** Points sans aucune trace dans la base (aucun taux ne s'y mêle) : un par notion, branches distinctes */
const POINT_CODES = {
	A: '1SPE-201', // notion « Implication et équivalence » (Logique)
	B: '1SPE-238', // notion « Arrangements et permutations » (Dénombrement)
	C: '1SPE-326', // notion « Vecteurs » (Géométrie)
	E: '1SPE-257' // notion « Calcul littéral » (Algèbre) : titre avec formule
} as const;
type Key = keyof typeof POINT_CODES;

const PLACE_OF_SOURCE = {
	auto: 'typing',
	teacher: null,
	student_self: 'flash_cards',
	srs: 'review'
} as const;
type Source = keyof typeof PLACE_OF_SOURCE;

/** Une trace posée : de quoi recalculer à la main le taux affiché */
interface Line {
	student: string;
	key: Key;
	source: Source;
	success: boolean;
}

function lines(student: string, key: Key, source: Source, results: boolean[]): Line[] {
	return results.map((success) => ({ student, key, source, success }));
}

/** Les traces du décor (hors traces de série de E, posées à part) */
const LINES: Line[] = [
	// A : quatre élèves ont une réponse corrigée (dont une corrigée par le prof), un seul a déclaré
	...lines(S11, 'A', 'auto', [true, true, true, false]),
	...lines(S12, 'A', 'auto', [true, false]),
	...lines(S13, 'A', 'auto', [true, true, true]),
	...lines(S10, 'A', 'teacher', [false]),
	...lines(S14, 'A', 'student_self', [true, true]),
	...lines(S11, 'A', 'student_self', [true, true, true]),
	// B : seulement deux élèves ont une réponse corrigée
	...lines(S11, 'B', 'auto', [true, false]),
	...lines(S12, 'B', 'auto', [true, true, false]),
	...lines(S13, 'B', 'srs', [true]),
	// C : que du déclaré
	...lines(S13, 'C', 'student_self', [true, true, true]),
	...lines(S14, 'C', 'srs', [true, false]),
	// Les quatre autres ont aussi travaillé C en flash-cards : le point monte dans « Top points à remédier »
	...[S10, S11, S12, S15].flatMap((student) => lines(student, 'C', 'student_self', [true]))
];

/** Traces de séries du point E : élève, réponse tapée, juste ou non, graine */
const SERIES_E = [
	{ student: S11, answer: '9', ok: false, seed: 11 },
	{ student: S12, answer: '9', ok: false, seed: 12 },
	{ student: S13, answer: '7', ok: true, seed: 13 },
	{ student: S14, answer: '5', ok: false, seed: 14 }
];
/** Énoncé tiré d'un contrôle (stocké tel que l'élève l'a vu) */
const CONTROL_STATEMENT_N = 77;

/** Jours de travail autonome (6 traces chacun) : il y a n jours */
const ACTIVE_DAYS: Record<string, number[]> = {
	[S11]: [2, 9, 10, 17, 18, 19, 32],
	[S12]: [1, 3, 8, 15, 16, 30, 31, 44]
};

const MIN_ORDER = (a: number, b: number) => a - b;

// ============================================================================
// DÉCOR
// ============================================================================

interface Decor {
	classId: string;
	className: string;
	tag: string;
	pointId: Record<Key, string>;
	pointName: Record<Key, string>;
	templateId: Record<Key | 'R', string>;
	evalDone: { id: string; title: string };
	evalTodo: { id: string; title: string };
	names: Record<string, string>;
	/** Traces posées après coup par un test (retirées par lui) */
	extraLineIds: string[];
}

let db: pg.Client;
let decor: Decor;
let lockHeld = false;
let profLockHeld = false;
let removedMemberships: { id: string; status: string; left_at: string | null }[] = [];

async function q<T extends pg.QueryResultRow = pg.QueryResultRow>(
	text: string,
	values: unknown[] = []
): Promise<T[]> {
	return (await db.query<T>(text, values)).rows;
}

/** Remet les adhésions retirées d'un arrêt brutal précédent */
async function recoverMemberships(): Promise<void> {
	let saved: { id: string; status: string; left_at: string | null }[] = [];
	try {
		saved = JSON.parse(readFileSync(RECOVERY, 'utf8'));
	} catch {
		return;
	}
	for (const row of saved) {
		await q(`update class_members set status = $2, left_at = $3 where id = $1`, [
			row.id,
			row.status,
			row.left_at
		]);
	}
	rmSync(RECOVERY, { force: true });
}

/** Retire tout ce qui porte le préfixe (reste d'un passage interrompu compris) */
async function cleanup(): Promise<void> {
	const templates = (
		await q<{ id: string }>(`select id::text from question_templates where title like $1`, [
			`${PREFIXE} %`
		])
	).map((r) => r.id);
	const evaluations = (
		await q<{ id: string }>(
			`select e.id::text from evaluations e join series s on s.id = e.series_id where s.title like $1`,
			[`${PREFIXE} %`]
		)
	).map((r) => r.id);
	if (evaluations.length > 0) {
		const sessions = (
			await q<{ id: string }>(
				`select id::text from test_sessions where evaluation_id = any($1::uuid[])`,
				[evaluations]
			)
		).map((r) => r.id);
		await q(`delete from test_answers where test_session_id = any($1::uuid[])`, [sessions]);
		await q(`delete from test_sessions where evaluation_id = any($1::uuid[])`, [evaluations]);
		await q(`delete from evaluation_assignments where evaluation_id = any($1::uuid[])`, [
			evaluations
		]);
		await q(`delete from evaluations where id = any($1::uuid[])`, [evaluations]);
	}
	await q(`delete from series where title like $1`, [`${PREFIXE} %`]);
	if (templates.length > 0) {
		await q(`delete from skill_attempts where template_id = any($1::uuid[])`, [templates]);
		await q(`delete from srs_card_stats where card_reference_id = any($1::uuid[])`, [templates]);
		await q(`delete from question_template_points where template_id = any($1::uuid[])`, [
			templates
		]);
		await q(`delete from question_templates where id = any($1::uuid[])`, [templates]);
	}
	const classes = (
		await q<{ id: string }>(`select id::text from classes where name like $1`, [`${PREFIXE} %`])
	).map((r) => r.id);
	if (classes.length > 0) {
		await q(`delete from class_members where class_id = any($1::uuid[])`, [classes]);
		await q(`delete from classes where id = any($1::uuid[])`, [classes]);
	}
}

async function makeTemplate(title: string): Promise<string> {
	const variations = [
		{
			// `n` rend chaque tirage distinct ; `$?$` : case de maths
			statement: 'Calcule (tirage n° {{n}}) : $3 + 4 = ?$',
			variables: [{ name: 'n', expression: '1..99' }],
			blanks: [{ expectedAnswer: '7' }],
			correction: { steps: ['On additionne : $3 + 4 = 7$.'] }
		}
	];
	const [row] = await q<{ id: string }>(
		`insert into question_templates (type, grades, level, variations, status, title, created_by, options)
		 values ('fill_in_blanks', array['1_SPE'], 1, $1::jsonb, 'published', $2,
		         (select id from profiles where email = $3), '{}'::jsonb)
		 returning id::text`,
		[JSON.stringify(variations), `${PREFIXE} ${title}`, TEACHER.email]
	);
	return row.id;
}

async function addTrace(
	student: string,
	templateId: string,
	source: Source,
	success: boolean,
	options: {
		daysAgo?: number;
		/** Posée à l'instant même : après la dernière modification du modèle (les séries n'en relisent pas d'avant) */
		justNow?: boolean;
		seed?: number;
		answer?: string;
		place?: string | null;
	} = {}
): Promise<string> {
	const place = options.place === undefined ? PLACE_OF_SOURCE[source] : options.place;
	const [row] = await q<{ id: string }>(
		`insert into skill_attempts (student_id, template_id, success, source, place, seed, answer_parts,
		                             part_verdicts, created_at)
		 values ($1, $2, $3, $4, $5, $6, $7::text[], $8::boolean[],
		         case when $11::boolean then clock_timestamp()
		              else date_trunc('day', now()) + interval '12 hours' - ($9::int * interval '1 day')
		                   + ($10::int * interval '1 minute') end)
		 returning id::text`,
		[
			student,
			templateId,
			success,
			source,
			place,
			options.seed ?? null,
			options.answer === undefined ? null : [options.answer],
			options.answer === undefined ? null : [success],
			options.daysAgo ?? 0,
			// Des heures distinctes dans la journée : l'ordre des traces est stable
			Math.floor(Math.random() * 600),
			options.justNow ?? false
		]
	);
	return row.id;
}

async function addFsrs(
	student: string,
	templateId: string,
	state: 'relearning' | 'review' | 'learning',
	nextInDays: number
): Promise<void> {
	await q(
		`insert into srs_card_stats (user_id, card_reference_type, card_reference_id, difficulty, stability,
		                             state, last_review, next_review, total_reviews, review_history)
		 values ($1, 'template', $2, 5, 1, $3, now() - interval '3 days',
		         now() + ($4::int * interval '1 day'), 3, '[]'::jsonb)`,
		[student, templateId, state, nextInDays]
	);
}

/** Taux d'un point à la main : moyenne des taux des élèves qui ont une réponse corrigée ; < 3 élèves → null */
function expectedRate(key: Key, extra: Line[] = []): { rate: number | null; students: number } {
	const perStudent = new Map<string, { done: number; ok: number }>();
	for (const l of [...LINES, ...extra]) {
		if (l.key !== key || (l.source !== 'auto' && l.source !== 'teacher')) continue;
		const t = perStudent.get(l.student) ?? { done: 0, ok: 0 };
		t.done += 1;
		if (l.success) t.ok += 1;
		perStudent.set(l.student, t);
	}
	const students = perStudent.size;
	if (students < 3) return { rate: null, students };
	let sum = 0;
	for (const t of perStudent.values()) sum += t.ok / t.done;
	return { rate: sum / students, students };
}

async function buildDecor(): Promise<void> {
	const tag = Date.now().toString(36);
	const className = `${PREFIXE} ${tag}`;
	const [school] = await q<{ school_id: string }>(
		`select school_id::text from profiles where id = $1`,
		[S11]
	);
	const [klass] = await q<{ id: string }>(
		`insert into classes (name, join_code, school_id, grade, is_active)
		 values ($1, $2, $3, '1_SPE', true) returning id::text`,
		[className, `V7${tag.toUpperCase()}`.slice(0, 10), school.school_id]
	);
	for (const student of ALL_STUDENTS) {
		await q(`insert into class_members (class_id, student_id, status) values ($1, $2, 'active')`, [
			klass.id,
			student
		]);
	}

	const points = await q<{ id: string; code: string; name: string }>(
		`select id::text, code, name from curriculum_points where grade = '1_SPE' and code = any($1)`,
		[Object.values(POINT_CODES)]
	);
	const pointId = {} as Record<Key, string>;
	const pointName = {} as Record<Key, string>;
	const templateId = {} as Record<Key | 'R', string>;
	for (const key of Object.keys(POINT_CODES) as Key[]) {
		const point = points.find((p) => p.code === POINT_CODES[key]);
		if (!point) throw new Error(`Point ${POINT_CODES[key]} absent de la base locale`);
		pointId[key] = point.id;
		pointName[key] = point.name;
		templateId[key] = await makeTemplate(`modèle ${key}`);
		await q(`insert into question_template_points (template_id, point_id) values ($1, $2)`, [
			templateId[key],
			point.id
		]);
	}
	// Modèle rattaché à aucun point : porte seulement les traces de régularité
	templateId.R = await makeTemplate('modèle R');

	for (const l of LINES)
		await addTrace(l.student, templateId[l.key], l.source, l.success, { daysAgo: 3 });

	// Séries du point E (réponses tapées, graine, verdict par case)
	for (const s of SERIES_E) {
		await addTrace(s.student, templateId.E, 'auto', s.ok, {
			justNow: true,
			seed: s.seed,
			answer: s.answer
		});
	}

	// Mémoire (FSRS) : de quoi remplir « Top points à remédier » et varier les badges
	for (const student of ALL_STUDENTS) await addFsrs(student, templateId.E, 'relearning', -1);
	for (const student of ALL_STUDENTS) await addFsrs(student, templateId.C, 'relearning', -1);
	await addFsrs(S11, templateId.A, 'review', 10);
	await addFsrs(S12, templateId.A, 'relearning', -1);
	await addFsrs(S10, templateId.A, 'learning', -1);

	// Régularité : au moins 5 réponses de travail autonome dans le jour
	for (const [student, days] of Object.entries(ACTIVE_DAYS)) {
		for (const daysAgo of days) {
			for (let i = 0; i < 6; i += 1) {
				await addTrace(student, templateId.R, 'auto', true, { daysAgo });
			}
		}
	}

	// Contrôles : un rendu (deux copies de l'élève 12, la meilleure 14,5 ; une copie de l'élève 13),
	// un non commencé
	const [teacher] = await q<{ id: string }>(`select id::text from profiles where email = $1`, [
		TEACHER.email
	]);
	const items = JSON.stringify([{ templateId: templateId.E, quantity: 1, delay: 20 }]);
	const makeEvaluation = async (title: string) => {
		const fullTitle = `${PREFIXE} ${tag} ${title}`;
		const [series] = await q<{ id: string }>(
			`insert into series (title, items, created_by, grade) values ($1, $2::jsonb, $3, '1_SPE') returning id::text`,
			[fullTitle, items, teacher.id]
		);
		const [evaluation] = await q<{ id: string }>(
			`insert into evaluations (series_id, form, status, created_by, shuffle_questions)
			 values ($1, 'interactive', 'published', $2, false) returning id::text`,
			[series.id, teacher.id]
		);
		return { id: evaluation.id, title: fullTitle };
	};
	const evalDone = await makeEvaluation('contrôle rendu');
	const evalTodo = await makeEvaluation('contrôle à venir');
	for (const student of [S12, S13]) {
		await q(
			`insert into evaluation_assignments (evaluation_id, student_id, assigned_by) values ($1, $2, $3)`,
			[evalDone.id, student, teacher.id]
		);
	}
	await q(
		`insert into evaluation_assignments (evaluation_id, student_id, assigned_by) values ($1, $2, $3)`,
		[evalTodo.id, S12, teacher.id]
	);
	const instance = {
		delay: 20,
		level: 1,
		blanks: [{ type: 'math', expectedAnswer: '7', expectedAnswerLatex: '7' }],
		grades: ['1_SPE'],
		statement: `Calcule (tirage n° ${CONTROL_STATEMENT_N}) : $3 + 4 = \\placeholder[0]{}$`,
		correction: { steps: ['On additionne : $3 + 4 = 7$.'] },
		templateId: templateId.E,
		generatedAt: new Date().toISOString(),
		attemptPosition: 1,
		resolvedVariables: [{ name: 'n', value: String(CONTROL_STATEMENT_N) }],
		selectedVariationIndex: 0
	};
	const copies: { student: string; grade: number; daysAgo: number }[] = [
		{ student: S12, grade: 11, daysAgo: 5 },
		{ student: S12, grade: 14.5, daysAgo: 3 },
		{ student: S13, grade: 6, daysAgo: 3 }
	];
	for (const copy of copies) {
		const [session] = await q<{ id: string }>(
			`insert into test_sessions (user_id, evaluation_id, mode, items, total_questions, grade, completed_at)
			 values ($1, $2, 'interactive', $3::jsonb, 1, $4, now() - ($5::int * interval '1 day'))
			 returning id::text`,
			[copy.student, evalDone.id, items, copy.grade, copy.daysAgo]
		);
		await q(
			`insert into test_answers (test_session_id, template_id, question_instance, user_answer,
			                           is_correct, status, time_spent, attempts, points)
			 values ($1, $2, $3::jsonb, $4::jsonb, false, 'incorrect', 5, 1, 0)`,
			[
				session.id,
				templateId.E,
				JSON.stringify(instance),
				JSON.stringify({
					value: ['8'],
					partial: false,
					attempts: 1,
					isCorrect: false,
					timeSpent: 5,
					submittedAt: new Date().toISOString()
				})
			]
		);
	}

	const profiles = await q<{ id: string; firstname: string; lastname: string }>(
		`select id::text, coalesce(firstname, '') firstname, coalesce(lastname, '') lastname
		 from profiles where id = any($1::uuid[])`,
		[ALL_STUDENTS]
	);
	const names: Record<string, string> = {};
	for (const p of profiles) names[p.id] = `${p.firstname} ${p.lastname}`.trim();

	decor = {
		classId: klass.id,
		className,
		tag,
		pointId,
		pointName,
		templateId,
		evalDone,
		evalTodo,
		names,
		extraLineIds: []
	};
}

/** Retire l'élève de toutes ses classes le temps de `task`, puis remet les adhésions telles quelles */
async function whileUnassigned(student: string, task: () => Promise<void>): Promise<void> {
	removedMemberships = await q<{ id: string; status: string; left_at: string | null }>(
		`select id::text, status, left_at::text from class_members where student_id = $1`,
		[student]
	);
	mkdirSync(dirname(RECOVERY), { recursive: true });
	writeFileSync(RECOVERY, JSON.stringify(removedMemberships));
	try {
		await q(`update class_members set status = 'archived', left_at = now() where student_id = $1`, [
			student
		]);
		await task();
	} finally {
		for (const row of removedMemberships) {
			await q(`update class_members set status = $2, left_at = $3 where id = $1`, [
				row.id,
				row.status,
				row.left_at
			]);
		}
		removedMemberships = [];
		rmSync(RECOVERY, { force: true });
	}
}

test.beforeAll(async () => {
	test.setTimeout(2 * LOCK_WAIT_MAX_MS + 120_000);
	assertLocalServerEnv();
	await acquireLock(LOCK);
	lockHeld = true;
	// Pris APRÈS le verrou des élèves : sous lui, le mode du compte prof est celui d'origine
	await acquireLock(LOCK_PROF);
	profLockHeld = true;
	db = new pg.Client({ connectionString: LOCAL_DB });
	await db.connect();
	// Déclencheurs suspendus : le décor ne déclenche ni récompense ni notification
	await db.query(`set session_replication_role = replica`);
	await recoverMemberships();
	await cleanup();
	await buildDecor();
});

test.beforeEach(() => {
	if (lockHeld) refreshLock(LOCK);
	if (profLockHeld) refreshLock(LOCK_PROF);
});

test.afterAll(async () => {
	try {
		if (db) {
			await recoverMemberships();
			if (removedMemberships.length > 0) {
				for (const row of removedMemberships) {
					await q(`update class_members set status = $2, left_at = $3 where id = $1`, [
						row.id,
						row.status,
						row.left_at
					]);
				}
			}
			await cleanup();
			await db.end();
		}
	} finally {
		if (profLockHeld) releaseLock(LOCK_PROF);
		if (lockHeld) releaseLock(LOCK);
	}
});

// ============================================================================
// OUTILS
// ============================================================================

function shotPath(name: string, info: TestInfo): string {
	mkdirSync(SHOTS, { recursive: true });
	return `${SHOTS}/${name}-${info.project.name}.png`;
}

/**
 * « Mes classes » ne montre que les élèves du mode choisi par le prof (`user_preferences`). Le
 * fichier `controles-paquet7` passe le compte prof en « mode test » le temps de ses essais, mais
 * sous le verrou `compte-prof-mode-test` que ce fichier tient aussi : ici le mode est donc celui
 * d'origine (« élèves réels »). Simple garde, sans attente.
 */
async function waitForRealStudentsMode(): Promise<void> {
	const rows = await q<{ test_mode_enabled: boolean }>(
		`select test_mode_enabled from user_preferences
		 where user_id = (select id from profiles where email = $1)`,
		[TEACHER.email]
	);
	expect(
		rows[0]?.test_mode_enabled ?? false,
		'le compte prof est en mode test alors que le verrou est tenu (reste d’un arrêt brutal de controles-paquet7 ?)'
	).toBe(false);
}

function analyticsUrl(): string {
	return `/dashboard/teacher/classes/${decor.classId}/analytics`;
}

function followUpUrl(student: string): string {
	return `/dashboard/teacher/students/${student}`;
}

async function asTeacher(page: Page): Promise<void> {
	await login(page, TEACHER.email, TEACHER.password);
	await page.waitForLoadState('networkidle');
}

function card(page: Page, title: string): Locator {
	return page
		.locator('[data-slot="card"]')
		.filter({ has: page.getByText(title, { exact: true }) })
		.first();
}

/** Texte sur une ligne : espaces et sauts réunis, espaces insécables compris */
function flat(text: string): string {
	return text.replace(/[\s  ]+/g, ' ').trim();
}

function percent(rate: number): string {
	return `${Math.round(rate * 100)} %`;
}

/** Les lignes de notions du bloc « Taux de réussite » : texte aplati de chaque bouton */
async function notionRows(page: Page): Promise<string[]> {
	const rows = card(page, 'Taux de réussite').locator('button[aria-expanded]');
	await expect(rows.first()).toBeVisible();
	return (await rows.evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText))).map(
		flat
	);
}

/** Le bouton de la notion qui porte ce nom (nom accessible commençant par lui) */
function notionButton(page: Page, notionName: string): Locator {
	return card(page, 'Taux de réussite')
		.locator('button[aria-expanded]')
		.filter({ hasText: notionName })
		.first();
}

/** Une ligne de la grille de régularité : un libellé par case, sans le nom de l'élève */
async function regularityCells(table: Locator, rowIndex = 0): Promise<string[]> {
	const row = table.locator('tbody tr').nth(rowIndex);
	const titles = await row
		.locator('button[data-cell]')
		.evaluateAll((els) => els.map((el) => el.getAttribute('title') ?? ''));
	// « Élève 12 — semaine du 7 sept. : 1 jour actif » → « semaine du 7 sept. : 1 jour actif »
	return titles.map((t) =>
		flat(t)
			.replace(/^.* — /, '')
			.toLowerCase()
	);
}

async function regularityWeeks(table: Locator): Promise<string[]> {
	const heads = table.locator('thead tr').first().locator('th span.sr-only');
	return (await heads.evaluateAll((els) => els.map((el) => el.textContent ?? ''))).map((t) =>
		flat(t).toLowerCase()
	);
}

/** Le lien d'un élève dans la grille de la classe (colonne des noms), par son adresse */
function gridLink(page: Page, student: string): Locator {
	return page.locator(`table[aria-label^="Grille points"] a[href*="/students/${student}"]`);
}

/** Le badge de chaque point de ma décor, lu dans la grille A pour un élève */
async function gridBadges(page: Page, student: string): Promise<Record<Key, string>> {
	const link = gridLink(page, student);
	await expect(link).toBeVisible();
	const titles = await link
		.locator('xpath=ancestor::tr[1]')
		.locator('td[title]')
		.evaluateAll((els) => els.map((el) => el.getAttribute('title') ?? ''));
	const result = {} as Record<Key, string>;
	for (const key of Object.keys(POINT_CODES) as Key[]) {
		const title = titles.find((t) => t.includes(` — ${decor.pointName[key]} : `));
		if (!title) throw new Error(`point ${key} absent de la grille A pour ${student}`);
		result[key] = title.slice(title.lastIndexOf(' : ') + 3);
	}
	return result;
}

/** Le badge affiché au suivi pour chaque point de mon décor (nom accessible de l'icône) */
async function followUpBadges(page: Page): Promise<Partial<Record<Key, string>>> {
	const result: Partial<Record<Key, string>> = {};
	const items = card(page, 'Points du programme').locator('li');
	for (const key of Object.keys(POINT_CODES) as Key[]) {
		const probe = pointProbe(key);
		const item = items.filter({ hasText: probe });
		if ((await item.count()) === 0) continue;
		const label = await item.first().locator('svg[aria-label]').first().getAttribute('aria-label');
		if (label) result[key] = label;
	}
	return result;
}

/** Un bout du nom du point que le rendu garde tel quel (sans formule) */
function pointProbe(key: Key): string {
	return key === 'E' ? 'Factorisation de' : decor.pointName[key].slice(0, 25);
}

// ============================================================================
// #2666 — Taux de réussite (analytique de la classe)
// ============================================================================

test.describe('#2666 — taux de réussite', () => {
	test('#2666 — notions dans l’ordre de l’arbre, « NN % · N Galopins », seuil de 3, « Seulement déclaré »', async ({
		page
	}, info) => {
		await asTeacher(page);
		await gotoSettled(page, analyticsUrl());
		const rows = await notionRows(page);

		// Chaque notion de la classe, dans l'ordre de l'arbre (branche, nom de branche, notion)
		const tree = await q<{ notion: string; branch: string; bp: number; np: number }>(
			`select n.name notion, b.name branch, b.position bp, n.position np
			 from classification_nodes n join classification_nodes b on b.id = n.parent_id
			 where n.kind = 'notion'`
		);
		const placed = rows.filter((r) => !r.startsWith('Points sans notion'));
		expect(placed.length, 'des notions sont affichées').toBeGreaterThan(3);
		const positions = placed.map((row) => {
			// Une notion peut en préfixer une autre : on retient la plus longue qui correspond
			const found = tree
				.filter((t) => row.startsWith(t.notion) && row.includes(t.branch))
				.sort((a, b) => b.notion.length - a.notion.length)[0];
			expect(found, `notion de « ${row} » retrouvée dans l'arbre`).toBeDefined();
			return found;
		});
		for (let i = 1; i < positions.length; i += 1) {
			const a = positions[i - 1];
			const b = positions[i];
			const order =
				a.bp - b.bp ||
				a.branch.localeCompare(b.branch, 'fr') ||
				a.np - b.np ||
				a.notion.localeCompare(b.notion, 'fr');
			expect(
				order,
				`« ${a.branch} › ${a.notion} » avant « ${b.branch} › ${b.notion} »`
			).toBeLessThanOrEqual(0);
		}

		// A : taux recalculé depuis les lignes posées (4 élèves, dont une copie corrigée par le prof)
		const a = expectedRate('A');
		expect(a.rate, 'A a un taux').not.toBeNull();
		const rowA = rows.find((r) => r.startsWith('Implication et équivalence'));
		expect(rowA, `notion A affichée parmi : ${rows.join(' ¦ ')}`).toBeDefined();
		expect(rowA).toContain(`${percent(a.rate!)} · ${a.students} Galopins`);
		expect(percent(a.rate!), 'valeur attendue à la main : (0 + 3/4 + 1/2 + 1) / 4').toBe('56 %');

		// B : deux élèves seulement → pas de taux
		const b = expectedRate('B');
		expect(b).toEqual({ rate: null, students: 2 });
		const rowB = rows.find((r) => r.startsWith('Arrangements et permutations'));
		expect(rowB, 'notion B affichée').toBeDefined();
		expect(rowB).toContain('Pas assez de réponses · 2 Galopins');
		expect(rowB).not.toMatch(/\d+ %/);

		// C : que du déclaré
		const rowC = rows.find((r) => r.startsWith('Vecteurs'));
		expect(rowC, 'notion C affichée').toBeDefined();
		expect(rowC).toContain('Seulement déclaré');
		expect(rowC).not.toMatch(/\d+ %/);

		// Clic : la notion s'ouvre sur ses points, avec le même taux (un seul point travaillé)
		const button = notionButton(page, 'Implication et équivalence');
		await expect(button).toHaveAttribute('aria-expanded', 'false');
		await button.click();
		await expect(button).toHaveAttribute('aria-expanded', 'true');
		const point = card(page, 'Taux de réussite').locator('li li').filter({
			hasText: decor.pointName.A
		});
		await expect(point).toBeVisible();
		await expect(point).toContainText(`${percent(a.rate!)} · ${a.students} Galopins`);
		await page.screenshot({ path: shotPath('taux-notion-ouverte', info), fullPage: false });
	});

	test('#2666 — « Actualiser » recharge : une réponse corrigée posée en base change le taux', async ({
		page
	}, info) => {
		await asTeacher(page);
		await gotoSettled(page, analyticsUrl());
		const before = expectedRate('A');
		const button = notionButton(page, 'Implication et équivalence');
		await expect(button).toContainText(percent(before.rate!));

		// Une réponse réussie de plus, corrigée par le prof, pour l'élève 10 (0/1 → 1/2)
		const extra: Line[] = [{ student: S10, key: 'A', source: 'teacher', success: true }];
		const rowId = await addTrace(S10, decor.templateId.A, 'teacher', true, { daysAgo: 1 });
		try {
			const after = expectedRate('A', extra);
			expect(percent(after.rate!)).not.toBe(percent(before.rate!));
			// Sans « Actualiser », la page garde l'ancien taux
			await expect(button).toContainText(percent(before.rate!));
			const reload = page.waitForResponse((r) => r.url().includes('/analytics/success-rate'));
			await page.getByRole('button', { name: 'Actualiser' }).click();
			await reload;
			await expect(notionButton(page, 'Implication et équivalence')).toContainText(
				`${percent(after.rate!)} · ${after.students} Galopins`
			);
			await page.screenshot({ path: shotPath('taux-actualise', info) });
		} finally {
			await q(`delete from skill_attempts where id = $1`, [rowId]);
		}
	});

	test('#2666 — téléphone : le bloc ne déborde pas, notions ouvertes comprises', async ({
		page
	}, info) => {
		test.skip(!info.project.name.match(/iphone|android/), 'vérification propre au téléphone');
		await asTeacher(page);
		await gotoSettled(page, analyticsUrl());
		await notionRows(page);
		const button = notionButton(page, 'Implication et équivalence');
		await button.click();
		await expect(button).toHaveAttribute('aria-expanded', 'true');
		await expectNoHorizontalOverflow(page, 'analytique, taux de réussite');
		// Chaque ligne de notion tient dans la fenêtre
		const width = page.viewportSize()!.width;
		const rights = await card(page, 'Taux de réussite')
			.locator('button[aria-expanded], li li')
			.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
		expect(Math.max(...rights), 'bord droit des lignes').toBeLessThanOrEqual(width);
		await card(page, 'Taux de réussite').scrollIntoViewIfNeeded();
		await page.screenshot({ path: shotPath('taux-telephone', info) });
	});
});

// ============================================================================
// #2639 — Suivi d'un élève
// ============================================================================

test.describe('#2639 — suivi d’un élève', () => {
	test('#2639 — depuis « Mes classes », le nom ouvre le suivi ; points par branche puis notion ; Corrigé / Déclaré ; aucune date', async ({
		page
	}, info) => {
		await asTeacher(page);
		await waitForRealStudentsMode();
		await gotoSettled(page, '/dashboard/teacher/classes');
		await page.getByRole('tab', { name: decor.className }).click();
		const link = page.locator(`a[href="${followUpUrl(S13)}"]:visible`);
		await expect(link).toBeVisible();
		await link.click();
		await page.waitForURL(`**${followUpUrl(S13)}`);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			`Suivi de ${decor.names[S13]}`
		);
		await expect(page.getByRole('link', { name: 'Retour aux Bataillons' })).toBeVisible();

		const points = card(page, 'Points du programme');
		await expect(points.locator('li').first()).toBeVisible();
		// Rangés par branche (h2) puis notion (h3), dans l'ordre de l'arbre
		const heads = await points
			.locator('h2, h3')
			.evaluateAll((els) => els.map((el) => `${el.tagName}:${(el as HTMLElement).innerText}`));
		const iBranchA = heads.indexOf('H2:Logique');
		expect(iBranchA, 'branche de A').toBeGreaterThanOrEqual(0);
		expect(heads[iBranchA + 1]).toBe('H3:Implication et équivalence');
		const order = ['Algèbre', 'Géométrie', 'Dénombrement', 'Logique'].map((branch) =>
			heads.indexOf(`H2:${branch}`)
		);
		expect(
			order.every((i) => i >= 0),
			`branches de mes points : ${heads.join(' | ')}`
		).toBe(true);
		expect([...order].sort(MIN_ORDER), 'branches dans l’ordre de l’arbre').toEqual(order);

		// « Corrigé : … » juste pour l'élève 13 (accord : réussie / réussies)
		const itemA = points.locator('li').filter({ hasText: pointProbe('A') });
		await expect(itemA).toContainText('Corrigé : 3 réussies sur 3');
		await expect(itemA).not.toContainText('Déclaré');
		const itemE = points.locator('li').filter({ hasText: pointProbe('E') });
		await expect(itemE).toContainText('Corrigé : 1 réussie sur 1');

		// Aucune date ni durée relative dans les blocs de points et de contrôles
		for (const title of ['Points du programme', 'Contrôles']) {
			const text = flat(await card(page, title).innerText());
			expect(text, `${title} : aucune date`).not.toMatch(
				/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b|\b\d{1,2} (janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)|il y a |hier|aujourd/i
			);
		}
		await page.screenshot({ path: shotPath('suivi-points', info), fullPage: true });
	});

	test('#2639 — « seulement déclaré » sur un point travaillé en flash-cards seulement ; badge identique à la grille A', async ({
		page
	}, info) => {
		await asTeacher(page);
		// Grille A : le badge de chaque point, pour les élèves 11, 12 et 13
		await gotoSettled(page, analyticsUrl());
		const grid: Record<string, Record<Key, string>> = {};
		for (const student of [S11, S12, S13]) grid[student] = await gridBadges(page, student);
		// Quelques valeurs posées à la main : l'élève 12 est « à remédier » sur A, l'élève 11 l'a « acquise »
		expect(grid[S12].A).toBe('À remédier');
		expect(grid[S11].A).toBe('Acquise');

		for (const student of [S11, S12, S13]) {
			await gotoSettled(page, followUpUrl(student));
			const shown = await followUpBadges(page);
			for (const [key, label] of Object.entries(shown) as [Key, string][]) {
				expect(label, `${decor.names[student]} › point ${key} : même badge que la grille A`).toBe(
					grid[student][key]
				);
			}
			// A, B, E : les trois points qu'il a travaillés au moins en séries
			expect(
				Object.keys(shown).length,
				`${decor.names[student]} : points affichés`
			).toBeGreaterThanOrEqual(2);
		}

		// Élève 13 : C en flash-cards seulement
		await gotoSettled(page, followUpUrl(S13));
		const itemC = card(page, 'Points du programme')
			.locator('li')
			.filter({ hasText: pointProbe('C') });
		await expect(itemC).toContainText('Déclaré : 3 réussies sur 3');
		await expect(itemC).toContainText('seulement déclaré');
		await expect(itemC).not.toContainText('Corrigé');
		// Élève 13 sur A : corrigé seulement, jamais « seulement déclaré »
		const itemA = card(page, 'Points du programme')
			.locator('li')
			.filter({ hasText: pointProbe('A') });
		await expect(itemA).toContainText('Corrigé : 3 réussies sur 3');
		await expect(itemA).not.toContainText('seulement déclaré');
		// Élève 12 : des réponses fausses comptées, corrigées seulement
		await gotoSettled(page, followUpUrl(S12));
		const points12 = card(page, 'Points du programme');
		await expect(points12.locator('li').filter({ hasText: pointProbe('A') })).toContainText(
			'Corrigé : 1 réussie sur 2'
		);
		await expect(points12.locator('li').filter({ hasText: pointProbe('B') })).toContainText(
			'Corrigé : 2 réussies sur 3'
		);
		await page.screenshot({ path: shotPath('suivi-declare', info), fullPage: true });
	});

	test('#2639 — « Journal des récompenses » et son retour « Retour au suivi »', async ({
		page
	}) => {
		await asTeacher(page);
		await gotoSettled(page, followUpUrl(S12));
		await page.getByRole('link', { name: 'Journal des récompenses' }).click();
		await page.waitForURL(/\/students\/[^/]+\/journal/);
		const back = page.getByRole('link', { name: 'Retour au suivi' });
		await expect(back).toBeVisible();
		await back.click();
		await page.waitForURL(`**${followUpUrl(S12)}`);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			`Suivi de ${decor.names[S12]}`
		);
	});

	test('#2639 — élève non assigné : « Non assignés » ouvre son suivi, Corrigé · Déclaré justes', async ({
		page
	}, info) => {
		await asTeacher(page);
		await waitForRealStudentsMode();
		await whileUnassigned(S11, async () => {
			await gotoSettled(page, '/dashboard/teacher/classes');
			const unassigned = page
				.locator('[data-slot="card"]')
				.filter({ has: page.getByText('Non assignés', { exact: false }) })
				.last();
			const link = unassigned.locator(`a[href="${followUpUrl(S11)}"]`);
			await expect(link).toBeVisible();
			await link.click();
			await page.waitForURL(`**${followUpUrl(S11)}`);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(
				`Suivi de ${decor.names[S11]}`
			);
			// A : 3 réussies sur 4 corrigées, 3 sur 3 déclarées
			const itemA = card(page, 'Points du programme')
				.locator('li')
				.filter({ hasText: pointProbe('A') });
			await expect(itemA).toContainText('Corrigé : 3 réussies sur 4 · Déclaré : 3 réussies sur 3');
			await page.screenshot({ path: shotPath('suivi-non-assigne', info), fullPage: true });
		});
	});

	test('#2639 — compte admin : 403', async ({ page }) => {
		await login(page, ADMIN.email, ADMIN.password);
		const response = await gotoSettled(page, followUpUrl(S12));
		expect(response?.status()).toBe(403);
	});

	test('#2639 — téléphone : le suivi ne déborde pas', async ({ page }, info) => {
		test.skip(!info.project.name.match(/iphone|android/), 'vérification propre au téléphone');
		await asTeacher(page);
		await gotoSettled(page, followUpUrl(S11));
		await expect(card(page, 'Points du programme').locator('li').first()).toBeVisible();
		await expectNoHorizontalOverflow(page, 'suivi d’un élève');
		await page.screenshot({ path: shotPath('suivi-telephone', info), fullPage: true });
	});
});

// ============================================================================
// #2643 — Suivi d'un élève, trois blocs
// ============================================================================

test.describe('#2643 — suivi, trois blocs', () => {
	test('#2643 — Contrôles : meilleure note « 14,5/20 », statut du non commencé, titre → résultats → « Retour au suivi »', async ({
		page
	}, info) => {
		await asTeacher(page);
		await gotoSettled(page, followUpUrl(S12));
		const controls = card(page, 'Contrôles');
		const done = controls.locator('li').filter({ hasText: decor.evalDone.title });
		const todo = controls.locator('li').filter({ hasText: decor.evalTodo.title });
		// Deux copies (11 et 14,5) : la meilleure note
		await expect(done).toContainText('14,5/20');
		await expect(todo).toContainText('Pas commencé');
		await expect(todo).not.toContainText('/20');
		await page.screenshot({ path: shotPath('suivi-controles', info) });

		await done.getByRole('link', { name: decor.evalDone.title }).click();
		await page.waitForURL(new RegExp(`/assessments/${decor.evalDone.id}/results`));
		const back = page.getByRole('link', { name: 'Retour au suivi' });
		await expect(back).toBeVisible();
		await back.click();
		await page.waitForURL(`**${followUpUrl(S12)}`);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			`Suivi de ${decor.names[S12]}`
		);
	});

	test('#2643 — Régularité : la même ligne que la grille de la classe (semaines, intensités, vacances)', async ({
		page
	}, info) => {
		await asTeacher(page);
		await gotoSettled(page, analyticsUrl());
		const classTable = page.locator('table[aria-label="Régularité"]');
		await expect(classTable.locator('tbody tr').first()).toBeVisible();
		const classRowOf = async (student: string) => {
			const name = decor.names[student];
			const rows = classTable.locator('tbody tr');
			const count = await rows.count();
			for (let i = 0; i < count; i += 1) {
				const header = (await rows.nth(i).locator('th[scope="row"]').innerText()).trim();
				if (header === name) return i;
			}
			throw new Error(`${name} absent de la grille de régularité de la classe`);
		};
		const classWeeks = await regularityWeeks(classTable);
		expect(classWeeks.length, 'des semaines depuis la rentrée').toBeGreaterThan(8);
		const classRow: Record<string, string[]> = {};
		for (const student of [S11, S12]) {
			classRow[student] = await regularityCells(classTable, await classRowOf(student));
			expect(
				classRow[student].filter((c) => !c.endsWith('aucun jour actif')).length,
				`${decor.names[student]} : des semaines actives dans la grille`
			).toBeGreaterThan(3);
		}

		// Élève 12 (en classe) : la ligne du suivi = celle de la grille
		await gotoSettled(page, followUpUrl(S12));
		const table = card(page, 'Régularité').locator('table[aria-label="Régularité"]');
		await expect(table.locator('tbody tr')).toHaveCount(1);
		expect(await regularityWeeks(table), 'mêmes semaines et mêmes vacances (S12)').toEqual(
			classWeeks
		);
		expect(await regularityCells(table), 'mêmes intensités (S12)').toEqual(classRow[S12]);
		expect(
			await table.locator('thead .holiday-mark').count(),
			'repères de vacances dans l’en-tête, comme la grille de la classe'
		).toBe(await classTable.locator('thead .holiday-mark').count());
		await card(page, 'Régularité').scrollIntoViewIfNeeded();
		await page.screenshot({ path: shotPath('suivi-regularite', info) });

		// Élève 11 : retiré de ses classes, sa ligne reste la même qu'à l'époque où il y était
		await whileUnassigned(S11, async () => {
			await gotoSettled(page, followUpUrl(S11));
			const unassignedTable = card(page, 'Régularité').locator('table[aria-label="Régularité"]');
			await expect(unassignedTable.locator('tbody tr')).toHaveCount(1);
			expect(await regularityWeeks(unassignedTable), 'mêmes semaines (non assigné)').toEqual(
				classWeeks
			);
			expect(await regularityCells(unassignedTable), 'mêmes intensités (non assigné)').toEqual(
				classRow[S11]
			);
		});
	});

	test('#2643 — Compétences : les six, niveau ou « pas encore évaluée »', async ({
		page
	}, info) => {
		await asTeacher(page);
		await gotoSettled(page, followUpUrl(S13));
		const items = card(page, 'Compétences').locator('li');
		await expect(items).toHaveCount(6);
		const texts = (
			await items.evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText))
		).map(flat);
		const [{ n }] = await q<{ n: string }>(
			`select count(*)::text n from student_competence_level where student_id = $1`,
			[S13]
		);
		const notYet = texts.filter((t) => t.endsWith('pas encore évaluée')).length;
		expect(notYet, 'compétences sans niveau = six moins celles qui ont un niveau en base').toBe(
			6 - Number(n)
		);
		await card(page, 'Compétences').scrollIntoViewIfNeeded();
		await page.screenshot({ path: shotPath('suivi-competences', info) });
	});

	test('#2643 — grille A : le nom ouvre le suivi, retour « Retour à l’analytique » ; mode projection : le nom n’est pas un lien', async ({
		page
	}, info) => {
		await asTeacher(page);
		await gotoSettled(page, analyticsUrl());
		const link = gridLink(page, S12);
		await expect(link).toBeVisible();
		await link.click();
		await page.waitForURL(`**${followUpUrl(S12)}?*`);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			`Suivi de ${decor.names[S12]}`
		);
		const back = page
			.getByRole('link', { name: 'Retour à l’analytique' })
			.or(page.getByRole('link', { name: "Retour à l'analytique" }));
		await expect(back).toBeVisible();
		await back.click();
		await page.waitForURL(`**${analyticsUrl()}`);
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Analytics —');

		// Mode projection : plus aucun lien vers un suivi dans la grille, noms anonymisés
		await expect(gridLink(page, S12)).toBeVisible();
		await page.getByRole('button', { name: 'Mode projection' }).click();
		await expect(page.getByRole('button', { name: 'Afficher les noms' })).toBeVisible();
		const grid = page.locator('table[aria-label^="Grille points"]');
		await expect(grid.locator('a[href*="/students/"]')).toHaveCount(0);
		const firstCell = grid.locator('tbody tr').first().locator('td').first();
		await expect(firstCell).toHaveText(/^Galopin \d+$/);
		await expect(grid).not.toContainText(decor.names[S12]);
		await page.screenshot({ path: shotPath('grille-projection', info) });
	});

	test('#2643 — téléphone : la régularité défile sans déborder la page', async ({ page }, info) => {
		test.skip(!info.project.name.match(/iphone|android/), 'vérification propre au téléphone');
		await asTeacher(page);
		await gotoSettled(page, followUpUrl(S12));
		const table = card(page, 'Régularité').locator('table[aria-label="Régularité"]');
		await expect(table.locator('tbody tr')).toHaveCount(1);
		await expectNoHorizontalOverflow(page, 'suivi, régularité');
		const scroller = table.locator('xpath=ancestor::div[contains(@class,"overflow-x-auto")][1]');
		expect(await scroller.evaluate((el) => getComputedStyle(el).overflowX)).toBe('auto');
		const box = await scroller.boundingBox();
		expect(box!.x + box!.width, 'le défilement tient dans la fenêtre').toBeLessThanOrEqual(
			page.viewportSize()!.width
		);
		await card(page, 'Régularité').scrollIntoViewIfNeeded();
		await page.screenshot({ path: shotPath('suivi-regularite-telephone', info) });
	});
});

// ============================================================================
// #2631 — Erreurs par point
// ============================================================================

test.describe('#2631 — erreurs par point', () => {
	async function openPoint(page: Page, key: Key): Promise<Locator> {
		await asTeacher(page);
		await gotoSettled(page, analyticsUrl());
		const top = card(page, 'Top points à remédier');
		const row = top.locator('li').filter({ hasText: pointProbe(key) });
		await expect(row, `le point ${key} est dans « Top points à remédier »`).toBeVisible();
		await row.getByRole('button', { name: 'Voir' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		return dialog;
	}

	test('#2631 — deux onglets ; « Erreurs » se charge au clic ; réponses fausses de séries ET de contrôles, énoncé vu par l’élève, noms des élèves', async ({
		page
	}, info) => {
		let errorCalls = 0;
		page.on('request', (r) => {
			if (r.url().includes('/analytics/point-errors')) errorCalls += 1;
		});
		const dialog = await openPoint(page, 'E');
		// Titre du point avec sa formule rendue (KaTeX), pas le texte brut
		const title = dialog.getByRole('heading').first();
		await expect(title).toContainText('Factorisation de');
		// Formule rendue (élément de maths statique), pas le texte `$…$`
		await expect(title.locator('math-span').first()).toBeVisible();
		await expect(title).not.toContainText('$');
		await expect(title).not.toContainText('\\');
		const tabs = dialog.getByRole('tab');
		await expect(tabs).toHaveCount(2);
		await expect(tabs.nth(0)).toHaveText('Galopins concernés');
		await expect(tabs.nth(1)).toHaveText('Erreurs');
		// Onglet 1 : les élèves concernés (les six, « À remédier »)
		// Les élèves qui ont une trace sur ce point (10 et 15 n'en ont aucune : pas de colonne pour eux)
		for (const student of [S11, S12, S13, S14]) {
			await expect(dialog).toContainText(decor.names[student]);
		}
		await expect(dialog).not.toContainText(decor.names[S10]);
		expect(errorCalls, 'rien n’est chargé avant le clic sur « Erreurs »').toBe(0);

		await tabs.nth(1).click();
		const panel = dialog.getByRole('tabpanel');
		await expect(panel.getByRole('heading', { level: 3 })).toContainText(`${PREFIXE} modèle E`);
		expect(errorCalls, 'une seule lecture au clic').toBe(1);
		// 4 traces de séries + 2 copies de contrôle = 6 réponses écrites
		await expect(panel).toContainText('réponses écrites');
		await expect(panel).toContainText('6 réponses écrites');
		// Contrôle : l'énoncé stocké (tirage n° 77) et les deux noms dans le même groupe
		await expect(panel).toContainText(`tirage n° ${CONTROL_STATEMENT_N}`);
		await expect(panel).toContainText('2 élèves ont répondu ainsi');
		const controlGroup = panel
			.locator('div.space-y-2')
			.filter({ hasText: `tirage n° ${CONTROL_STATEMENT_N}` });
		await expect(controlGroup.first()).toContainText(decor.names[S12]);
		await expect(controlGroup.first()).toContainText(decor.names[S13]);
		await expect(controlGroup.first()).toContainText('8');
		// Séries : élèves 11, 12 et 14 (réponses fausses) ; l'élève 13, juste, n'est pas listé en erreur
		const groupsText = flat(await panel.innerText());
		for (const student of [S11, S12, S14]) expect(groupsText).toContain(decor.names[student]);
		// Énoncé rejoué de la graine : un tirage résolu, jamais la variable brute
		expect(groupsText).not.toContain('{{n}}');
		expect(groupsText).toMatch(/tirage n° (?!77\b)\d+/);
		await page.screenshot({ path: shotPath('erreurs-point', info) });

		// Rouvrir l'onglet ne relit pas
		await tabs.nth(0).click();
		await tabs.nth(1).click();
		expect(errorCalls, 'pas de seconde lecture').toBe(1);
	});

	test('#2631 — aucune réponse écrite (flash-cards) : « Pas encore de réponse écrite sur ce point… »', async ({
		page
	}, info) => {
		const dialog = await openPoint(page, 'C');
		await dialog.getByRole('tab', { name: 'Erreurs' }).click();
		await expect(dialog.getByRole('tabpanel')).toContainText(
			'Pas encore de réponse écrite sur ce point (les flash-cards ne gardent pas de réponse).'
		);
		await page.screenshot({ path: shotPath('erreurs-point-vide', info) });
	});

	test('#2631 — téléphone : la fenêtre des erreurs reste lisible, sans débordement', async ({
		page
	}, info) => {
		test.skip(!info.project.name.match(/iphone|android/), 'vérification propre au téléphone');
		const dialog = await openPoint(page, 'E');
		await dialog.getByRole('tab', { name: 'Erreurs' }).click();
		await expect(dialog.getByRole('tabpanel')).toContainText('6 réponses écrites');
		const width = page.viewportSize()!.width;
		const box = (await dialog.boundingBox())!;
		expect(box.x, 'bord gauche de la fenêtre').toBeGreaterThanOrEqual(0);
		expect(box.x + box.width, 'bord droit de la fenêtre').toBeLessThanOrEqual(width);
		// Rien de ce que contient la fenêtre ne dépasse son bord droit
		const overflow = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth);
		expect(overflow, 'défilement horizontal dans la fenêtre').toBeLessThanOrEqual(1);
		const size = await dialog
			.getByRole('tabpanel')
			.locator('p')
			.first()
			.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
		expect(size, 'taille de police des réponses').toBeGreaterThanOrEqual(12);
		await page.screenshot({ path: shotPath('erreurs-point-telephone', info) });
	});
});
