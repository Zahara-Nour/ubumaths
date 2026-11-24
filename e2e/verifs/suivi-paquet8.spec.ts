import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import pg from 'pg';
import { buildSeriesLink, type SeriesItem } from '../../src/lib/validation/series';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';
import { acquireLock, LOCK_WAIT_MAX_MS, refreshLock, releaseLock } from './helpers/verrou';

/**
 * Cartes, révisions FSRS-6, types d'erreur et durées observées — paquet 8 du tri — base LOCALE
 * ============================================================================================
 *
 * Reprend les lignes #2720 (bouton de retournement des flash-cards), #2703 #2705 #2708 #2709
 * (révisions FSRS-6), #2695 (phrase du type d'erreur à l'élève), #2686 (types d'erreur pour le
 * prof) et #2673 (« Durée observée » + « Appliquer ») de `docs/wip/verifications-manuelles.md`.
 *
 *   VERIFS_PORT=5176 pnpm test:verifs e2e/verifs/suivi-paquet8.spec.ts [--project iphone]
 *
 * Élèves : eleve16 à eleve20 SEULEMENT (verrou `eleves-16-20`), puis le verrou `compte-prof-mode-test`
 * (le prof doit être en mode « élèves réels », le mode d'origine, que ce fichier ne change pas).
 *
 * Ce qui est joué à l'écran : les réponses des élèves (Saisie, Contrôle blanc, contrôle assigné) et
 * ce que lisent les élèves et le prof. Ce qui est posé en base : les modèles, séries, contrôles,
 * copies et traces fictives « Verifs8 suivi … », et l'échéance d'une carte pour la rendre due.
 *
 * Remise en état (`afterAll`) : tout ce qui porte le préfixe est supprimé, les traces écrites par les
 * séances depuis le début sont retirées, les tables que les séances écrivent (Palotin, gidouilles…)
 * sont remises comme photographiées. L'état d'origine est écrit sur disque AVANT toute modification
 * (`REPRISE`) : un arrêt brutal est réparé au passage suivant, sous les verrous.
 *
 * ⚠️ `session_replication_role = replica` (connexion `decor`) suspend déclencheurs ET clés étrangères :
 * le décor s'y pose sans récompense ni notification, mais tout se retire par la connexion normale
 * (`sql`), dont les cascades fonctionnent.
 *
 * Attendus changés par une décision écrite : « Entraînement » s'appelle « Contrôle blanc » (#2554) ;
 * « Panier » s'appelle « Ma série » ; « Terminé » dans l'historique des contrôles reste « Terminé ».
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.describe.configure({ mode: 'serial' });

// ============================================================================
// TYPES
// ============================================================================

type Student = { email: string; id: string };

/** Ce que l'on photographie avant toute modification */
interface Reprise {
	startedAt: string;
	snapshot: Record<string, unknown[]>;
	gidouilles: { id: string; gidouilles: string }[];
}

/** Une question à une case « maths » d'un tirage figé (contrôle) */
interface ControlAnswer {
	templateId: string;
	instance: Record<string, unknown>;
	values: string[] | null;
	status: 'correct' | 'incorrect' | 'empty';
}

// ============================================================================
// CONSTANTES
// ============================================================================

const LOCK = 'eleves-16-20';
const LOCK_PROF = 'compte-prof-mode-test';
const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const REPRISE = '.captures/verifs/suivi-paquet8-reprise.json';
const PASSWORD = 'local-eleve';
const PREFIXE = 'Verifs8 suivi';
const SHOTS = '.captures/verifs/suivi8';
const CART_KEY = 'chiphre_question_cart';

const id = (n: number) => `5eed0000-0000-4000-8000-0000000000${n}`;
const E16: Student = { email: 'eleve16@local.test', id: id(16) };
const E17: Student = { email: 'eleve17@local.test', id: id(17) };
const E18: Student = { email: 'eleve18@local.test', id: id(18) };
const E19: Student = { email: 'eleve19@local.test', id: id(19) };
const E20: Student = { email: 'eleve20@local.test', id: id(20) };
const ALL = [E16, E17, E18, E19, E20];
const ALL_IDS = ALL.map((e) => e.id);

/** Carte de cours sur les suites (1re spé) : son contenu est recopié dans un modèle publié */
const SUITES_CARD_ID = '57129cb5-7c81-4e2c-b3a5-d55a12ea8b34';

/** Deux points de 1re spé pour les modèles de révision (deux points : deux cartes de notions distinctes) */
const POINT_FSRS_A = '1SPE-201';
const POINT_FSRS_B = '1SPE-238';

/** Point de 1re spé qui porte le modèle des types d'erreur (la classe l'a dans « Top points à remédier ») */
const POINT_ERREURS = '1SPE-326';
const POINT_ERREURS_PROBE = "Les médianes d'un triangle";

/** Tables de l'élève photographiées puis remises (clé : `student_id`) */
const SNAPSHOT_TABLES = [
	'student_buddies',
	'student_last_visits',
	'student_mathoux',
	'student_mathou_decorations',
	'student_point_state',
	'student_observable_state'
] as const;
/** Tables où une séance ajoute des lignes : on retire celles créées depuis le début */
const APPENDED_TABLES = ['skill_attempts', 'gidouilles_activity', 'reward_events'] as const;

// ============================================================================
// DÉCOR
// ============================================================================

let decor: pg.Client;
let startedAt = '';
let lockHeld = false;
let profLockHeld = false;

/** Modèles « Verifs8 suivi … » créés, par clé */
const templates: Record<string, string> = {};

const projectName = (): string => test.info().project.name;
const isPhone = (): boolean => test.info().project.use.isMobile === true;

/** Écrit dans la base par la connexion « décor » (déclencheurs suspendus) */
async function put<T extends pg.QueryResultRow = pg.QueryResultRow>(
	text: string,
	values: unknown[] = []
): Promise<T[]> {
	return (await decor.query<T>(text, values)).rows;
}

/** Remet tout comme avant : décor préfixé, traces écrites depuis `state.startedAt`, tables photographiées */
async function restore(state: Reprise): Promise<void> {
	const failures: string[] = [];
	const step = async (name: string, run: () => Promise<void>): Promise<void> => {
		try {
			await run();
		} catch (error) {
			failures.push(`${name} : ${error instanceof Error ? error.message : String(error)}`);
		}
	};
	const mine = `select id from question_templates where title like '${PREFIXE} %'`;

	await step('contrôles et copies', async () => {
		const evaluations = (
			await sql<{ id: string }>(
				`select e.id::text from evaluations e join series s on s.id = e.series_id where s.title like $1`,
				[`${PREFIXE} %`]
			)
		).map((row) => row.id);
		if (evaluations.length === 0) return;
		await sql(`delete from test_sessions where evaluation_id = any($1::uuid[])`, [evaluations]);
		await sql(`delete from evaluation_assignments where evaluation_id = any($1::uuid[])`, [
			evaluations
		]);
		await sql(`delete from evaluations where id = any($1::uuid[])`, [evaluations]);
	});
	await step('séries', async () => {
		await sql(`delete from series where title like $1`, [`${PREFIXE} %`]);
	});
	await step('paquets et séances de révision', async () => {
		await sql(`delete from srs_decks where name like $1`, [`${PREFIXE} %`]);
		await sql(`delete from srs_review_sessions where user_id = any($1) and started_at >= $2`, [
			ALL_IDS,
			state.startedAt
		]);
		await sql(`delete from srs_cards where template_id in (${mine})`);
		await sql(`delete from srs_card_stats where card_reference_id in (${mine})`);
	});
	await step('traces', async () => {
		await sql(`delete from skill_attempts where template_id in (${mine})`);
		for (const table of APPENDED_TABLES) {
			await sql(`delete from ${table} where student_id = any($1) and created_at >= $2`, [
				ALL_IDS,
				state.startedAt
			]);
		}
	});
	for (const table of SNAPSHOT_TABLES) {
		await step(`photographie ${table}`, async () => {
			const rows = state.snapshot[table];
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
	await step('gidouilles', async () => {
		for (const row of state.gidouilles) {
			await sql('update profiles set gidouilles = $2::numeric where id = $1', [
				row.id,
				row.gidouilles
			]);
		}
	});
	await step('classe', async () => {
		const classes = (
			await sql<{ id: string }>(`select id::text from classes where name like $1`, [`${PREFIXE} %`])
		).map((row) => row.id);
		if (classes.length === 0) return;
		await sql(`delete from class_members where class_id = any($1::uuid[])`, [classes]);
		await sql(`delete from classes where id = any($1::uuid[])`, [classes]);
	});
	await step('modèles', async () => {
		await sql(`delete from question_template_points where template_id in (${mine})`);
		await sql(`delete from question_templates where title like $1`, [`${PREFIXE} %`]);
	});
	if (failures.length > 0) {
		throw new Error(`Décor mal remis en place :\n${failures.join('\n')}`);
	}
}

/** Un modèle « Verifs8 suivi … » publié, posé par SQL */
async function makeTemplate(
	key: string,
	options: {
		type?: string;
		grade?: string;
		variations: unknown[];
		options?: Record<string, unknown>;
		pointId?: string;
		classificationNodeId?: string;
	}
): Promise<string> {
	const rows = await put<{ id: string }>(
		`insert into question_templates (type, grades, level, variations, status, title, created_by,
		                                 options, classification_node_id)
		 values ($1, array[$2::text], 1, $3::jsonb, 'published', $4,
		         (select id from profiles where email = $5), $6::jsonb, $7)
		 returning id::text`,
		[
			options.type ?? 'fill_in_blanks',
			options.grade ?? '1_SPE',
			JSON.stringify(options.variations),
			`${PREFIXE} ${key}`,
			TEACHER.email,
			JSON.stringify(options.options ?? {}),
			options.classificationNodeId ?? null
		]
	);
	templates[key] = rows[0].id;
	if (options.pointId) {
		await put(`insert into question_template_points (template_id, point_id) values ($1, $2)`, [
			rows[0].id,
			options.pointId
		]);
	}
	return rows[0].id;
}

test.beforeAll(async () => {
	test.setTimeout(2 * LOCK_WAIT_MAX_MS + 120_000);
	assertLocalServerEnv();
	await acquireLock(LOCK);
	lockHeld = true;
	// Pris APRÈS le verrou des élèves : sous lui, le mode du compte prof est celui d'origine
	await acquireLock(LOCK_PROF);
	profLockHeld = true;
	decor = new pg.Client({ connectionString: LOCAL_DB });
	await decor.connect();
	// Déclencheurs suspendus : le décor ne déclenche ni récompense ni notification
	await decor.query(`set session_replication_role = replica`);

	// Un passage précédent interrompu : on remet son état d'origine avant de photographier
	try {
		const saved = JSON.parse(readFileSync(REPRISE, 'utf8')) as Reprise;
		await restore(saved);
		rmSync(REPRISE, { force: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}

	// Le compte prof lit les élèves RÉELS (mode d'origine) : ce fichier ne le change pas, il le vérifie
	const modes = await sql<{ test_mode_enabled: boolean }>(
		`select test_mode_enabled from user_preferences
		  where user_id = (select id from profiles where email = $1)`,
		[TEACHER.email]
	);
	expect(
		modes[0]?.test_mode_enabled ?? false,
		'le compte prof est en mode test alors que le verrou est tenu (reste d’un arrêt brutal de controles-paquet7 ?)'
	).toBe(false);

	startedAt = (await sql<{ now: string }>('select now()::text as now'))[0].now;
	const snapshot: Record<string, unknown[]> = {};
	for (const table of SNAPSHOT_TABLES) {
		const rows = await sql<{ r: unknown }>(
			`select to_jsonb(t) as r from ${table} t where student_id = any($1)`,
			[ALL_IDS]
		);
		snapshot[table] = rows.map((row) => row.r);
	}
	const gidouilles = await sql<{ id: string; gidouilles: string }>(
		'select id, gidouilles::text from profiles where id = any($1)',
		[ALL_IDS]
	);
	// L'état d'origine est sur disque AVANT la première modification
	mkdirSync(dirname(REPRISE), { recursive: true });
	// Écrit à côté puis renommé : un arrêt en pleine écriture ne laisse pas un fichier tronqué
	writeFileSync(
		`${REPRISE}.tmp`,
		JSON.stringify({ startedAt, snapshot, gidouilles } satisfies Reprise)
	);
	renameSync(`${REPRISE}.tmp`, REPRISE);
	state = { startedAt, snapshot, gidouilles };

	await buildDecor();
});

let state: Reprise;

// Le fichier dure plus que les 30 min au bout desquelles un verrou est repris
test.beforeEach(() => {
	if (lockHeld) refreshLock(LOCK);
	if (profLockHeld) refreshLock(LOCK_PROF);
});

test.afterAll(async () => {
	try {
		if (state) {
			await restore(state);
			rmSync(REPRISE, { force: true });
		}
		if (decor) await decor.end();
	} finally {
		if (profLockHeld) releaseLock(LOCK_PROF);
		if (lockHeld) releaseLock(LOCK);
	}
});

async function buildDecor(): Promise<void> {
	// Carte de cours sur les suites : le contenu de la vraie carte, dans un modèle publié (la vraie est en brouillon)
	const [suites] = await put<{ variations: unknown[] }>(
		`select variations from question_templates where id = $1`,
		[SUITES_CARD_ID]
	);
	expect(suites, 'carte de cours des suites absente de la base locale').toBeDefined();
	await makeTemplate('carte suites', {
		type: 'course_card',
		variations: suites.variations,
		options: { courseCard: true, courseQuestion: true }
	});
	// Modèles de révision : rangés dans un point du programme (le Programme de l'élève ne reçoit que les modèles tagués)
	const points = await put<{ id: string; code: string }>(
		`select id::text, code from curriculum_points where grade = '1_SPE' and code = any($1)`,
		[[POINT_FSRS_A, POINT_FSRS_B, POINT_ERREURS]]
	);
	const pointOf = (code: string): string => {
		const point = points.find((p) => p.code === code);
		if (!point) throw new Error(`Point ${code} absent de la base locale`);
		return point.id;
	};
	const addition = (label: string, sum: string, answer: string) => [
		{
			statement: `Question ${label} (tirage n° {{n}}) : $${sum} = ?$`,
			variables: [{ name: 'n', expression: '1..99' }],
			blanks: [{ expectedAnswer: answer }],
			correction: { steps: [`On additionne : $${sum} = ${answer}$.`] }
		}
	];
	await makeTemplate('fsrs juste', {
		variations: addition('A', '3 + 4', '7'),
		pointId: pointOf(POINT_FSRS_A)
	});
	await makeTemplate('fsrs ratee', {
		variations: addition('B', '5 + 6', '11'),
		pointId: pointOf(POINT_FSRS_B)
	});
	await makeTemplate('fsrs neuve', {
		variations: addition('C', '2 + 9', '11'),
		pointId: pointOf(POINT_FSRS_B)
	});
	// Types d'erreur : une question par relation (attendu -12, 35), une sans relation reconnue, une jugée par une règle
	const errorKind = (label: string, statement: string, blank: Record<string, unknown>) => [
		{
			statement: `Question ${label} (tirage n° {{n}}) : ${statement}`,
			variables: [{ name: 'n', expression: '1..99' }],
			blanks: [blank],
			correction: { steps: ['Voir le cours.'] }
		}
	];
	await makeTemplate('erreur signe', {
		variations: errorKind('S', '$5-17=?$', { expectedAnswer: '-12' })
	});
	await makeTemplate('erreur virgule', {
		variations: errorKind('P', '$3{,}5\\times 10=?$', { expectedAnswer: '35' })
	});
	await makeTemplate('erreur aucune', {
		variations: errorKind('N', '$2+2=?$', { expectedAnswer: '4' })
	});
	await makeTemplate('erreur diviseur', {
		variations: errorKind('D', 'Donne un diviseur de 12 autre que 1 et 12 : $?$', {
			expectedAnswer: '3',
			rulesSuffice: true,
			validationRules: [{ type: 'divisor', dividend: '12' }]
		})
	});
	await buildTeacherDecor(pointOf);
	// Flash-card ordinaire à énoncé long (six paragraphes)
	// (la case d'abord : la dernière ligne du recto est du texte, celle que le bouton rond pourrait recouvrir)
	const longStatement =
		'Combien font 3 + 4 ? [_]\n\n' +
		Array.from(
			{ length: 6 },
			(_, i) => `Ligne ${i + 1} de l'énoncé de la flash-card ordinaire (tirage n° {{n}}).`
		).join('\n\n');
	await makeTemplate('flash ordinaire', {
		variations: [
			{
				statement: longStatement,
				variables: [{ name: 'n', expression: '1..99' }],
				blanks: [{ expectedAnswer: '7' }],
				correction: { steps: ['La réponse est $7$.'] }
			}
		]
	});
}

// ----------------------------------------------------------------------------
// Décor du prof : types d'erreur (#2686) et durées observées (#2673)
// ----------------------------------------------------------------------------

/** Ce que le décor du prof retient pour les tests */
interface TeacherDecor {
	classId: string;
	evaluationId: string;
	/** Titre des modèles A (une case), B (deux cases), C (aucune erreur reconnue) */
	titles: { A: string; B: string; C: string };
	names: Record<string, string>;
	/** Série de l'éditeur : deux lignes, le modèle « durée 5 élèves » puis « durée 4 élèves » */
	seriesId: string;
	durations: { five: string; four: string };
}
let teacher: TeacherDecor;

/** Réponses des cinq élèves à la question A d'un contrôle : attendu, réponse tapée, tirage */
const COPIES_A = [
	{ student: E16, expected: '12', typed: '-12', tirage: 1 },
	{ student: E17, expected: '35', typed: '3,5', tirage: 2 },
	{ student: E18, expected: '8', typed: '-8', tirage: 3 },
	{ student: E19, expected: '47', typed: '9', tirage: 4 },
	{ student: E20, expected: '20', typed: '20', tirage: 5 }
];

/** Une case de maths, d'un tirage figé : « Calcule (tirage n° T) » */
function oneBlankInstance(
	templateId: string,
	position: number,
	tirage: number,
	expected: string
): Record<string, unknown> {
	return {
		level: 1,
		blanks: [
			{
				type: 'math',
				expectedAnswer: expected,
				expressionName: 'expression1',
				expectedAnswerLatex: expected
			}
		],
		grades: ['1_SPE'],
		statement: `Calcule (tirage n° ${tirage}) :\n\n$$<<expr:expression1>>x$$`,
		correction: { steps: ['Voir le cours.'] },
		templateId,
		expressions: [
			{ name: 'expression1', latex: 'x', value: 'x', answerFormat: '\\placeholder[0]{}' }
		],
		generatedAt: '2026-11-24T08:00:00.000Z',
		attemptPosition: position,
		resolvedVariables: [],
		selectedVariationIndex: 0
	};
}

/** Deux cases de maths : « a = ? » et « b = ? », attendu 3 et 4 */
function twoBlankInstance(templateId: string, position: number): Record<string, unknown> {
	return {
		level: 1,
		blanks: [
			{
				type: 'math',
				expectedAnswer: '3',
				expressionName: 'expression1',
				expectedAnswerLatex: '3'
			},
			{ type: 'math', expectedAnswer: '4', expressionName: 'expression2', expectedAnswerLatex: '4' }
		],
		grades: ['1_SPE'],
		statement:
			'Complète les deux égalités.\n\n$$<<expr:expression1>>a = 3$$\n\n$$<<expr:expression2>>b = 4$$',
		correction: { steps: ['$a = 3$ et $b = 4$.'] },
		templateId,
		expressions: [
			{ name: 'expression1', latex: 'a = 3', value: 'a=3', answerFormat: 'a = \\placeholder[0]{}' },
			{ name: 'expression2', latex: 'b = 4', value: 'b=4', answerFormat: 'b = \\placeholder[1]{}' }
		],
		generatedAt: '2026-11-24T08:00:00.000Z',
		attemptPosition: position,
		resolvedVariables: [],
		selectedVariationIndex: 0
	};
}

/** Une copie rendue d'un contrôle : séance terminée et ses réponses */
async function addCopy(
	evaluationId: string,
	studentId: string,
	answers: ControlAnswer[]
): Promise<void> {
	const points = answers.filter((a) => a.status === 'correct').length;
	const [session] = await put<{ id: string }>(
		`insert into test_sessions (user_id, mode, items, total_questions, completed_at, evaluation_id,
		                            grade, points_earned)
		 values ($1, 'interactive', '[]'::jsonb, $2, now(), $3, $4, $5) returning id::text`,
		// Note sur 20, au demi-point (contrainte de la base)
		[
			studentId,
			answers.length,
			evaluationId,
			Math.round(((20 * points) / answers.length) * 2) / 2,
			points
		]
	);
	for (const answer of answers) {
		const userAnswer =
			answer.values === null
				? null
				: JSON.stringify({
						value: answer.values,
						partial: false,
						attempts: 1,
						isCorrect: answer.status === 'correct',
						timeSpent: 8,
						submittedAt: '2026-11-24T08:00:05.000Z'
					});
		await put(
			`insert into test_answers (test_session_id, template_id, question_instance, user_answer,
			                           is_correct, time_spent, points, status)
			 values ($1, $2, $3::jsonb, $4::jsonb, $5, 8, $6, $7)`,
			[
				session.id,
				answer.templateId,
				JSON.stringify(answer.instance),
				userAnswer,
				answer.status === 'correct',
				answer.status === 'correct' ? 1 : 0,
				answer.status
			]
		);
	}
}

/** Une trace de série libre : réponse tapée, graine (la question se rejoue de la graine) */
async function addSeriesTrace(
	studentId: string,
	templateId: string,
	seed: number,
	typed: string,
	success: boolean
): Promise<void> {
	await put(
		`insert into skill_attempts (student_id, template_id, success, source, place, seed, answer_parts,
		                             part_verdicts, created_at)
		 values ($1, $2, $3, 'auto', 'typing', $4, $5::text[], $6::boolean[], clock_timestamp())`,
		[studentId, templateId, success, seed, [typed], [success]]
	);
}

/** Une trace de Contrôle blanc validée : durée de réponse et durée allouée (ms) */
async function addMockTrace(studentId: string, templateId: string, seconds: number): Promise<void> {
	await put(
		`insert into skill_attempts (student_id, template_id, success, source, place, response_ms,
		                             allotted_ms, end_reason, answer_parts, part_verdicts, created_at)
		 values ($1, $2, true, 'auto', 'mock_test', $3, 60000, 'validated', $4::text[], $5::boolean[],
		         clock_timestamp())`,
		[studentId, templateId, seconds * 1000, ['7'], [true]]
	);
}

async function buildTeacherDecor(pointOf: (code: string) => string): Promise<void> {
	const [professor] = await put<{ id: string }>(`select id::text from profiles where email = $1`, [
		TEACHER.email
	]);
	const [school] = await put<{ school_id: string }>(
		`select school_id::text from profiles where id = $1`,
		[E16.id]
	);
	const tag = Date.now().toString(36);

	// Une classe de 1re spé qui reçoit les cinq élèves (l'analytique est celle de la classe)
	const [klass] = await put<{ id: string }>(
		`insert into classes (name, join_code, school_id, grade, is_active)
		 values ($1, $2, $3, '1_SPE', true) returning id::text`,
		[`${PREFIXE} ${tag}`, `V8${tag.toUpperCase()}`.slice(0, 10), school.school_id]
	);
	for (const student of ALL) {
		await put(
			`insert into class_members (class_id, student_id, status) values ($1, $2, 'active')`,
			[klass.id, student.id]
		);
	}

	// Trois modèles : A (une case, rangé dans un point), B (deux cases), C (aucune erreur reconnue)
	const variation = (statement: string, blanks: unknown[]) => [
		{
			statement,
			variables: [{ name: 'n', expression: '1..99' }],
			blanks,
			correction: { steps: ['Voir le cours.'] }
		}
	];
	const A = await makeTemplate('types A', {
		variations: variation('Calcule (tirage n° {{n}}) : $x = ?$', [{ expectedAnswer: '12' }]),
		pointId: pointOf(POINT_ERREURS)
	});
	const B = await makeTemplate('types B', {
		variations: variation('Complète : $a = ?$ et $b = ?$', [
			{ expectedAnswer: '3' },
			{ expectedAnswer: '4' }
		])
	});
	const C = await makeTemplate('types C', {
		variations: variation('Calcule (tirage n° {{n}}) : $y = ?$', [{ expectedAnswer: '7' }])
	});

	// Le contrôle : les cinq élèves ont une copie de trois questions
	const items = JSON.stringify([
		{ templateId: A, quantity: 1, delay: 20 },
		{ templateId: B, quantity: 1, delay: 20 },
		{ templateId: C, quantity: 1, delay: 20 }
	]);
	const [series] = await put<{ id: string }>(
		`insert into series (title, items, created_by, grade) values ($1, $2::jsonb, $3, '1_SPE') returning id::text`,
		[`${PREFIXE} contrôle des types d'erreur ${tag}`, items, professor.id]
	);
	const [evaluation] = await put<{ id: string }>(
		`insert into evaluations (series_id, form, status, created_by, shuffle_questions)
		 values ($1, 'interactive', 'published', $2, false) returning id::text`,
		[series.id, professor.id]
	);
	for (const student of ALL) {
		await put(
			`insert into evaluation_assignments (evaluation_id, student_id, assigned_by) values ($1, $2, $3)`,
			[evaluation.id, student.id, professor.id]
		);
	}
	const wrongC = ['1', '2', '3', '4'];
	for (const [i, copy] of COPIES_A.entries()) {
		const ok = copy.typed === copy.expected;
		// B : seul l'élève 16 se trompe, à la case 2 (`-4` pour `4`)
		const b: ControlAnswer =
			copy.student === E16
				? {
						templateId: B,
						instance: twoBlankInstance(B, 2),
						values: ['3', '-4'],
						status: 'incorrect'
					}
				: {
						templateId: B,
						instance: twoBlankInstance(B, 2),
						values: ['3', '4'],
						status: 'correct'
					};
		// C : quatre élèves se trompent sans relation reconnue (attendu 7), le cinquième a juste
		const c: ControlAnswer =
			i < 4
				? {
						templateId: C,
						instance: oneBlankInstance(C, 3, 10 + i, '7'),
						values: [wrongC[i]],
						status: 'incorrect'
					}
				: {
						templateId: C,
						instance: oneBlankInstance(C, 3, 10 + i, '7'),
						values: ['7'],
						status: 'correct'
					};
		await addCopy(evaluation.id, copy.student.id, [
			{
				templateId: A,
				instance: oneBlankInstance(A, 1, copy.tirage, copy.expected),
				values: [copy.typed],
				status: ok ? 'correct' : 'incorrect'
			},
			b,
			c
		]);
	}
	// Une réponse de série (modèle A, attendu 12) : l'élève 20 donne l'opposé
	await addSeriesTrace(E20.id, A, 20, '-12', false);
	// Les quatre autres ont déclaré avoir révisé ce modèle en flash-cards (aucune réponse écrite) :
	// l'analytique de la classe ne range un point que si l'élève a une trace dessus
	for (const student of [E16, E17, E18, E19]) {
		await put(
			`insert into skill_attempts (student_id, template_id, success, source, place, created_at)
			 values ($1, $2, true, 'student_self', 'flash_cards', clock_timestamp())`,
			[student.id, A]
		);
	}
	// Mémoire en « à remédier » pour les cinq : le point monte dans « Top points à remédier »
	for (const student of ALL) {
		await put(
			`insert into srs_card_stats (user_id, card_reference_type, card_reference_id, difficulty, stability,
			                             state, last_review, next_review, total_reviews, review_history)
			 values ($1, 'template', $2, 5, 1, 'relearning', now() - interval '3 days',
			         now() - interval '1 day', 3, '[]'::jsonb)`,
			[student.id, A]
		);
	}

	// Durées observées : cinq élèves valident en 20, 25, 30, 35, 40 s (80 % : 35 s) ; quatre seulement sur l'autre
	const five = await makeTemplate('durée 5 élèves', {
		variations: variation('Calcule (tirage n° {{n}}) : $z = ?$', [{ expectedAnswer: '7' }])
	});
	const four = await makeTemplate('durée 4 élèves', {
		variations: variation('Calcule (tirage n° {{n}}) : $w = ?$', [{ expectedAnswer: '7' }])
	});
	for (const [i, student] of ALL.entries()) {
		await addMockTrace(student.id, five, 20 + 5 * i);
		if (i < 4) await addMockTrace(student.id, four, 20 + 5 * i);
	}
	const [editorSeries] = await put<{ id: string }>(
		`insert into series (title, items, created_by, grade) values ($1, $2::jsonb, $3, '1_SPE') returning id::text`,
		[
			`${PREFIXE} éditeur ${tag}`,
			JSON.stringify([
				{ templateId: five, quantity: 2, delay: 20 },
				{ templateId: four, quantity: 1, delay: 20 }
			]),
			professor.id
		]
	);

	const profiles = await put<{ id: string; firstname: string; lastname: string }>(
		`select id::text, coalesce(firstname, '') firstname, coalesce(lastname, '') lastname
		 from profiles where id = any($1::uuid[])`,
		[ALL_IDS]
	);
	const names: Record<string, string> = {};
	for (const p of profiles) names[p.id] = `${p.firstname} ${p.lastname}`.trim();
	teacher = {
		classId: klass.id,
		evaluationId: evaluation.id,
		titles: { A: `${PREFIXE} types A`, B: `${PREFIXE} types B`, C: `${PREFIXE} types C` },
		names,
		seriesId: editorSeries.id,
		durations: { five: `${PREFIXE} durée 5 élèves`, four: `${PREFIXE} durée 4 élèves` }
	};
}

// ============================================================================
// OUTILS
// ============================================================================

async function loginAs(page: Page, student: Student): Promise<void> {
	await login(page, student.email, PASSWORD);
	await page.waitForLoadState('networkidle');
}

async function loginTeacher(page: Page): Promise<void> {
	await login(page, TEACHER.email, TEACHER.password);
	await page.waitForLoadState('networkidle');
}

function seriesUrl(
	items: SeriesItem[],
	mode: 'typing' | 'interactive' | 'flash' | 'course',
	seed = 8
): string {
	return buildSeriesLink('', items, { mode, seed });
}

/** Ouvre une série et attend la fin des chargements */
async function openSeries(page: Page, url: string): Promise<void> {
	await page.goto(url);
	await page.waitForLoadState('networkidle');
}

async function shoot(page: Page, name: string): Promise<void> {
	mkdirSync(SHOTS, { recursive: true });
	await page.screenshot({ path: `${SHOTS}/${name}-${projectName()}.png` });
}

/**
 * Tape au vrai clavier dans la case de réponse de `scope` (case texte ou MathLive). MathLive perd
 * parfois la première frappe, et une case de maths dit son contenu dans l'expression entière
 * (« 3+4=\\placeholder[0]{7} ») : on remet la case dans son état de départ et on recommence tant
 * que ce qu'elle contient n'est pas exactement ce qu'on a tapé.
 */
async function typeInto(page: Page, scope: Locator, typed: string): Promise<void> {
	const field = scope.locator('input:not([type=hidden]):not([type=radio]), math-field').first();
	await field.scrollIntoViewIfNeeded();
	const isMath = await field.evaluate((el) => el.tagName === 'MATH-FIELD');
	const read = (): Promise<string> =>
		field.evaluate((el) => (el as HTMLElement & { value: string }).value);
	/** Ce que la case contient : le contenu de l'emplacement d'une case de maths (« {7} » → « 7 ») */
	const contentOf = (value: string): string =>
		isMath ? (/\\placeholder\[\d+\]\{(.*)\}/.exec(value)?.[1] ?? '').replace(/[{}]/g, '') : value;
	const keyboardVisible = (): Promise<boolean> =>
		page.evaluate(
			() =>
				(window as unknown as { mathVirtualKeyboard?: { visible: boolean } }).mathVirtualKeyboard
					?.visible === true
		);
	const close = page.locator('.math-keyboard-close');
	if (isMath && isPhone()) {
		// Au téléphone, toucher la case ouvre le clavier de MathLive : on le laisse s'ouvrir puis on le
		// referme, et on tape au clavier de l'appareil (comme `seances-paquet6`)
		await field.tap();
		await expect.poll(keyboardVisible).toBe(true);
		await close.tap();
		await expect.poll(keyboardVisible).toBe(false);
	}
	if (isPhone()) await field.tap();
	else await field.click();
	// Touche par touche : MathLive perd parfois la première frappe après la mise au point de la case
	// (Android), on retape la touche tant qu'elle n'est pas arrivée, sans jamais effacer ce qui est tapé
	for (const char of typed) {
		const before = contentOf(await read());
		await expect(async () => {
			await page.keyboard.type(char);
			await expect.poll(async () => contentOf(await read()), { timeout: 1500 }).toBe(before + char);
		}).toPass({ timeout: 20_000 });
	}
	expect(contentOf(await read()), 'ce que la case contient').toBe(typed);
	// Le clavier virtuel de MathLive (téléphone) recouvre « Valider » : on le referme
	if (await close.isVisible()) {
		if (isPhone()) await close.tap();
		else await close.click();
	}
}

/** « Valider » de la question en cours, quand la carte est encore au recto */
const validate = (page: Page): Locator =>
	page.getByRole('button', { name: 'Valider', exact: true });

/** Le verdict affiché au verso d'une carte (« Juste », « Faux », « ½ point ») */
const verdictOf = (card: Locator): Locator => card.getByText(/^(Juste|Faux|½ point)$/).first();

/** Texte sur une ligne : espaces et sauts réunis, espaces insécables compris */
function flat(text: string): string {
	return text.replace(/[\s  ]+/g, ' ').trim();
}

/** « C'est parti ! » : recliqué tant que la série n'a pas démarré (bouton pas encore hydraté) */
async function startSeries(page: Page, started: Locator): Promise<void> {
	await expect(async () => {
		const start = page.getByRole('button', { name: /C'est parti/ });
		if (await start.isVisible()) await start.click();
		await expect(started).toBeVisible({ timeout: 4000 });
	}).toPass({ timeout: 30_000 });
}

// ============================================================================
// #2720 — Bouton de retournement des flash-cards
// ============================================================================

/**
 * Bas du texte d'une face, haut du bouton de retournement : le bouton rond ne recouvre pas la
 * dernière ligne si tout le texte de la face finit au-dessus de lui (pire cas : une ligne aussi
 * large que la carte, comme dans le test de rendu du composant).
 */
async function faceMeasures(
	face: Locator,
	buttonLabel: string
): Promise<{ textBottom: number; buttonTop: number; lines: number; scrolls: boolean }> {
	return face.evaluate((root, label) => {
		const button = root.querySelector<HTMLElement>(`button[aria-label="${label}"]`);
		if (!button) throw new Error(`bouton « ${label} » absent de la face`);
		// Le texte compte pour tout nœud de texte visible hors du bouton
		let bottom = -Infinity;
		let lines = 0;
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			if (!node.textContent?.trim()) continue;
			const parent = node.parentElement;
			if (!parent || button.contains(parent) || parent.closest('.katex-mathml')) continue;
			const range = document.createRange();
			range.selectNodeContents(node);
			for (const rect of range.getClientRects()) {
				if (rect.width === 0 || rect.height === 0) continue;
				lines += 1;
				bottom = Math.max(bottom, rect.bottom);
			}
		}
		// Le texte des formules est dans des éléments de maths : leur cadre compte aussi
		for (const math of root.querySelectorAll<HTMLElement>('math-span, .katex')) {
			if (button.contains(math)) continue;
			const rect = math.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) bottom = Math.max(bottom, rect.bottom);
		}
		const card = root.querySelector<HTMLElement>('.face-card');
		return {
			textBottom: bottom,
			buttonTop: button.getBoundingClientRect().top,
			lines,
			scrolls: card ? card.scrollHeight > card.clientHeight + 1 : false
		};
	}, buttonLabel);
}

test.describe('#2720 — bouton de retournement des flash-cards', () => {
	test('#2720 — carte de cours sur les suites, retournée au verso, sans défilement : la dernière ligne n’est pas recouverte par le bouton rond', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await loginAs(page, E16);
		await openSeries(
			page,
			seriesUrl([{ templateId: templates['carte suites'], quantity: 1, delay: 0 }], 'typing')
		);
		const card = page.getByTestId('typing-card');
		await card.getByRole('button', { name: 'Voir la correction' }).click();
		// Ni la page ni la carte ne défilent pour lire : la carte n'a pas de hauteur imposée
		const face = card.locator('.flip-card-back');
		await expect(face.getByRole('button', { name: 'Retour à la question' })).toBeVisible();
		await expect(face).toContainText('Forme explicite');
		await face.scrollIntoViewIfNeeded();
		// La carte a fini de se retourner (la face de dos a pris la place du recto)
		await page.waitForTimeout(600);
		const measures = await faceMeasures(face, 'Retour à la question');
		expect(measures.lines, 'lignes de texte mesurées').toBeGreaterThan(3);
		expect(measures.scrolls, 'la carte défile en interne').toBe(false);
		expect(
			measures.textBottom,
			`le texte finit à ${measures.textBottom} px, le bouton commence à ${measures.buttonTop} px`
		).toBeLessThanOrEqual(measures.buttonTop);
		await shoot(page, '2720-verso-carte-suites');
	});

	test('#2720 — recto d’une flash-card ordinaire : la dernière ligne n’est pas recouverte par le bouton rond', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await loginAs(page, E16);
		await openSeries(
			page,
			seriesUrl([{ templateId: templates['flash ordinaire'], quantity: 1, delay: 0 }], 'flash')
		);
		const face = page.getByTestId('flash-card').locator('.flip-card-front');
		await expect(face).toContainText('Ligne 6 de');
		await face.scrollIntoViewIfNeeded();
		await page.waitForTimeout(600);
		const measures = await faceMeasures(face, 'Voir la correction');
		expect(measures.lines, 'lignes de texte mesurées').toBeGreaterThan(5);
		expect(measures.scrolls, 'la carte défile en interne').toBe(false);
		expect(
			measures.textBottom,
			`le texte finit à ${measures.textBottom} px, le bouton commence à ${measures.buttonTop} px`
		).toBeLessThanOrEqual(measures.buttonTop);
		await shoot(page, '2720-recto-flash-ordinaire');
	});
});

// ============================================================================
// #2703 #2705 #2708 #2709 — Révisions (FSRS-6)
// ============================================================================

const PROGRAMME_URL = '/dashboard/revisions/decks/programme';

/** La fiche de mémoire d'un modèle posé par ce fichier, pour E17 */
async function memoryOf(templateKey: string) {
	return sql<{ state: string; days: number; total_reviews: number }>(
		`select state, extract(epoch from (next_review - now())) / 86400 as days, total_reviews
		   from srs_card_stats
		  where user_id = $1 and card_reference_type = 'template' and card_reference_id = $2`,
		[E17.id, templates[templateKey]]
	);
}

/** La carte du Programme dont le nom est celui du modèle, dans la section donnée */
function programmeCard(page: Page, section: string, templateKey: string): Locator {
	return page
		.locator('section')
		.filter({ has: page.getByRole('heading', { name: section, exact: true }) })
		.locator('[data-slot="card"]')
		.filter({ hasText: `${PREFIXE} ${templateKey}` });
}

test.describe.serial('#2703 #2705 #2708 #2709 — révisions FSRS-6', () => {
	test('#2703 — une question neuve réussie revient dans 2 jours, ratée le lendemain (Saisie, élève)', async ({
		page
	}) => {
		test.setTimeout(240_000);
		await loginAs(page, E17);
		await openSeries(
			page,
			seriesUrl(
				[
					{ templateId: templates['fsrs juste'], quantity: 1, delay: 0 },
					{ templateId: templates['fsrs ratee'], quantity: 1, delay: 0 }
				],
				'typing'
			)
		);
		const card = page.getByTestId('typing-card');
		const next = page.locator('[data-typing-next]');
		await card.locator('.flip-card-front').waitFor();
		// Les deux questions : A (réponse 7) réussie, B (réponse 11) ratée, dans l'ordre où elles viennent
		for (let n = 1; n <= 2; n++) {
			await expect(page.getByTestId('typing-position')).toHaveText(`Question ${n} / 2`);
			const isA = (await card.innerText()).includes('Question A');
			await typeInto(page, card, isA ? '7' : '3');
			await validate(page).click();
			await expect(verdictOf(card)).toHaveText(isA ? 'Juste' : 'Faux');
			await next.click();
		}
		await expect(page.getByTestId('typing-summary')).toBeVisible();

		// Les fiches de mémoire : neuve réussie → 2 jours (avant : 6), ratée → demain
		// (la trace part dès « Valider », en tâche de fond : on attend les deux fiches)
		for (const key of ['fsrs juste', 'fsrs ratee']) {
			await expect.poll(async () => (await memoryOf(key)).length, { timeout: 15_000 }).toBe(1);
		}
		const [juste] = await memoryOf('fsrs juste');
		const [ratee] = await memoryOf('fsrs ratee');
		expect(juste, 'fiche de la question réussie').toBeDefined();
		expect(ratee, 'fiche de la question ratée').toBeDefined();
		expect(juste.total_reviews).toBe(1);
		expect(Number(juste.days), 'échéance de la réussie (jours)').toBeGreaterThan(1.9);
		expect(Number(juste.days), 'échéance de la réussie (jours)').toBeLessThan(2.1);
		expect(Number(ratee.days), 'échéance de la ratée (jours)').toBeGreaterThan(0.9);
		expect(Number(ratee.days), 'échéance de la ratée (jours)').toBeLessThan(1.1);
		expect(juste.state, 'état après une réussite').toBe('learning');
		expect(ratee.state, 'état après un échec').toBe('relearning');

		// Ce que l'élève lit : « dans 2 jours » et « demain » sur la page du Programme
		await page.waitForLoadState('networkidle');
		await gotoSettled(page, PROGRAMME_URL);
		await expect(programmeCard(page, 'En apprentissage', 'fsrs juste')).toContainText(
			'Prochaine review : dans 2 jours'
		);
		await expect(programmeCard(page, 'En apprentissage', 'fsrs ratee')).toContainText(
			'Prochaine review : demain'
		);
		await shoot(page, '2703-programme-echeances');
	});

	/** Titres des cartes d'une section du Programme */
	async function titlesIn(page: Page, section: string): Promise<string[]> {
		const cards = page
			.locator('section')
			.filter({ has: page.getByRole('heading', { name: section, exact: true }) })
			.locator('[data-slot="card"]');
		return (await cards.evaluateAll((els) =>
			els.map((el) => el.querySelector('.text-sm.font-medium')?.textContent?.trim() ?? '')
		)) as string[];
	}

	/** Lance la séance d'une section du Programme : les modèles que le serveur sert (réponse de `review/due`) */
	async function sessionTemplates(page: Page, section: string, states: string): Promise<string[]> {
		const due = page.waitForResponse(
			(r) => r.url().includes('/api/srs/review/due') && r.request().method() === 'GET',
			{ timeout: 30_000 }
		);
		const link = page
			.locator('section')
			.filter({ has: page.getByRole('heading', { name: section, exact: true }) })
			.getByRole('link', { name: /Lancer une session/ });
		await expect(link, `lien de la séance « ${section} »`).toBeVisible();
		await link.click();
		const response = await due;
		expect(new URL(response.url()).searchParams.get('states')).toBe(states);
		const body = (await response.json()) as { cards: { templateId: string | null }[] };
		const ids = body.cards.flatMap((card) => (card.templateId ? [card.templateId] : []));
		expect(ids.length, `questions servies par « ${section} »`).toBeGreaterThan(0);
		return ids;
	}

	test('#2705 #2708 — page Programme : une question réussie une seule fois et due est « À renforcer », plus « À remédier » ; « À remédier » ne montre que des questions ratées et sa séance ne sert qu’elles', async ({
		page
	}) => {
		test.setTimeout(240_000);
		// Les deux cartes de la séance précédente deviennent dues (échéance posée il y a deux heures)
		await sql(
			`update srs_card_stats set next_review = now() - interval '2 hours'
			  where user_id = $1 and card_reference_type = 'template' and card_reference_id = any($2::uuid[])`,
			[E17.id, [templates['fsrs juste'], templates['fsrs ratee']]]
		);
		await loginAs(page, E17);
		await gotoSettled(page, PROGRAMME_URL);
		await expect(programmeCard(page, 'À renforcer', 'fsrs juste')).toHaveCount(1);
		await expect(programmeCard(page, 'À remédier', 'fsrs juste')).toHaveCount(0);
		await expect(programmeCard(page, 'À remédier', 'fsrs ratee')).toHaveCount(1);
		await expect(programmeCard(page, 'À renforcer', 'fsrs ratee')).toHaveCount(0);
		await shoot(page, '2705-programme-sections');

		// « À remédier » : chaque carte listée est une question ratée (état « relearning » en base)
		const remedier = await titlesIn(page, 'À remédier');
		expect(remedier.length, 'cartes de « À remédier »').toBeGreaterThan(0);
		const states = await sql<{ title: string; state: string }>(
			`select q.title, s.state from srs_card_stats s
			   join question_templates q on q.id = s.card_reference_id
			  where s.user_id = $1 and s.card_reference_type = 'template' and q.title = any($2)`,
			[E17.id, remedier]
		);
		expect(states.length, 'fiches de mémoire des cartes listées').toBeGreaterThanOrEqual(
			remedier.length
		);
		expect(states.filter((row) => row.state !== 'relearning')).toEqual([]);

		// La séance de « À remédier » : seulement les questions ratées, la ratée de ce fichier comprise
		const remedierIds = await sessionTemplates(page, 'À remédier', 'relearning');
		expect(remedierIds, 'la question ratée est servie').toContain(templates['fsrs ratee']);
		expect(remedierIds, 'la réussie une fois n’est pas servie').not.toContain(
			templates['fsrs juste']
		);
		const remedierStates = await sql<{ state: string }>(
			`select state from srs_card_stats
			  where user_id = $1 and card_reference_type = 'template' and card_reference_id = any($2::uuid[])`,
			[E17.id, remedierIds]
		);
		expect(remedierStates.length, 'fiches des questions servies').toBe(remedierIds.length);
		expect(remedierStates.filter((row) => row.state !== 'relearning')).toEqual([]);

		// La séance de « À renforcer » : la réussie une fois, jamais la ratée
		await gotoSettled(page, PROGRAMME_URL);
		const renforcerIds = await sessionTemplates(page, 'À renforcer', 'learning,review');
		expect(renforcerIds, 'la réussie une fois est servie').toContain(templates['fsrs juste']);
		expect(renforcerIds, 'la ratée n’est pas servie').not.toContain(templates['fsrs ratee']);
	});

	test('#2709 — tuile « En cours » d’un paquet : compte les questions réussies une fois ET les questions ratées', async ({
		page
	}) => {
		test.setTimeout(120_000);
		// Un paquet personnel de trois cartes : la réussie une fois, la ratée (séance du premier test) et une neuve
		const name = `${PREFIXE} paquet en cours`;
		const [deck] = await put<{ id: string }>(
			`insert into srs_decks (name, owner_id, deck_type) values ($1, $2, 'personal') returning id::text`,
			[name, E17.id]
		);
		for (const key of ['fsrs juste', 'fsrs ratee', 'fsrs neuve']) {
			await put(
				`insert into srs_cards (deck_id, card_type, template_id) values ($1, 'template', $2)`,
				[deck.id, templates[key]]
			);
		}
		await loginAs(page, E17);
		await gotoSettled(page, '/dashboard/revisions');
		// La page range les paquets sous des onglets : une seule tuile est visible
		const tile = page
			.locator('[data-testid^="deck-card-"]')
			.filter({ hasText: name })
			.locator('visible=true');
		await expect(tile).toBeVisible();
		await expect(tile).toContainText('Total');
		// Total 3 ; Nouvelles 1 (la neuve) ; En cours 2 (réussie une fois + ratée) ; À réviser 3 (les deux échéances passées et la neuve)
		await expect(tile.getByTestId('deck-new')).toHaveText('1');
		await expect(tile.getByTestId('deck-learning')).toHaveText('2');
		await expect(tile.getByTestId('deck-due')).toHaveText('3');
		await shoot(page, '2709-tuile-en-cours');
	});
});

// ============================================================================
// #2695 — Phrase du type d'erreur, côté élève
// ============================================================================

const PHRASE_SIGN = "Ta réponse est l'opposé du résultat : vérifie le signe.";
const PHRASE_POWER = 'Ta réponse est 10 fois trop petite : vérifie la place de la virgule.';

/** Ce que l'élève tape à chaque question : relation reconnue (signe, virgule) ou non, case jugée par une règle */
const ERROR_ANSWERS: Record<string, string> = { S: '12', P: '3,5', N: '7', D: '30' };
const ERROR_KEYS = ['erreur signe', 'erreur virgule', 'erreur aucune', 'erreur diviseur'];
const errorItems = (): SeriesItem[] =>
	ERROR_KEYS.map((key) => ({ templateId: templates[key], quantity: 1, delay: 60 }));

/** La lettre de la question affichée dans `scope` (« Question S (tirage n° 12) … ») */
async function questionLabel(scope: Locator): Promise<string> {
	const text = await scope.innerText();
	const label = /Question ([SPND]) \(tirage/.exec(text)?.[1];
	expect(label, `une question d'erreur est affichée (« ${text.slice(0, 80)} »)`).toBeDefined();
	return label as string;
}

/** Les phrases (remarques) lues sous les réponses d'un bloc de correction */
async function remarksOf(scope: Locator): Promise<string[]> {
	// Le résultat attendu (comparaison, remarques) doit être là avant de lire ses remarques
	await expect(scope.locator('[data-testid="expected-result"]').first()).toBeVisible();
	// Le mot « Remarque : » qui précède chaque phrase est un libellé pour les lecteurs d'écran
	return (await scope.locator('p[data-kind="remark"]').allTextContents()).map((text) =>
		flat(text).replace(/^Remarque :\s*/, '')
	);
}

/** Le bloc de correction d'une question, retrouvé par son énoncé dans une page qui en montre plusieurs */
function correctionOf(page: Page, label: string): Locator {
	return page
		.getByText(`Question ${label} (tirage`)
		.first()
		.locator('xpath=ancestor::*[.//*[@data-testid="global-verdict"]][1]');
}

/** Phrase attendue pour chaque question : seules S et P en ont une */
const EXPECTED_REMARKS: Record<string, string[]> = {
	S: [PHRASE_SIGN],
	P: [PHRASE_POWER],
	N: [],
	D: []
};

test.describe('#2695 — phrase du type d’erreur', () => {
	test('#2695 — Saisie : `12` pour `-12` et `3,5` pour `35` → la phrase sous la case ; réponse sans relation et « un diviseur de 12 » → aucune ; la question reste fausse', async ({
		page
	}) => {
		test.setTimeout(300_000);
		await loginAs(page, E16);
		await openSeries(page, seriesUrl(errorItems(), 'typing'));
		const card = page.getByTestId('typing-card');
		const next = page.locator('[data-typing-next]');
		await card.locator('.flip-card-front').waitFor();
		const seen: string[] = [];
		const front = card.locator('.flip-card-front');
		const back = card.locator('.flip-card-back');
		for (let n = 1; n <= 4; n++) {
			await expect(page.getByTestId('typing-position')).toHaveText(`Question ${n} / 4`);
			// La carte neuve est au recto : on lit sa lettre sur le recto, jamais sur le verso de la précédente
			await expect(front).toContainText('(tirage n°');
			const label = await questionLabel(front);
			seen.push(label);
			await typeInto(page, front, ERROR_ANSWERS[label]);
			await validate(page).click();
			// La carte se retourne sur CETTE question : sa réponse reste fausse (la note ne change pas)
			await expect(back).toContainText(`Question ${label} (tirage`);
			await expect(verdictOf(card)).toHaveText('Faux');
			await expect(back.getByText('Correction', { exact: true })).toBeVisible();
			await expect
				.poll(() => remarksOf(back), { message: `phrases de la question ${label}` })
				.toEqual(EXPECTED_REMARKS[label]);
			if (label === 'S') await shoot(page, '2695-saisie-signe');
			if (label === 'P') await shoot(page, '2695-saisie-virgule');
			await next.click();
		}
		expect([...seen].sort(), 'les quatre questions sont passées').toEqual(['D', 'N', 'P', 'S']);
		await expect(page.getByTestId('typing-summary')).toBeVisible();
		await expect(
			page.getByTestId('typing-summary').getByText(/0 question réussie sur 4/)
		).toBeVisible();
	});

	/** Répond aux quatre questions d'une série à la suite (Contrôle blanc ou contrôle assigné) */
	async function answerFour(page: Page): Promise<void> {
		const question = page.getByTestId('interactive-question');
		const seen: string[] = [];
		for (let n = 1; n <= 4; n++) {
			await expect(page.getByTestId('interactive-position')).toHaveText(`Question ${n} sur 4`);
			await expect(question).toHaveCount(1);
			const label = await questionLabel(question);
			seen.push(label);
			await typeInto(page, question, ERROR_ANSWERS[label]);
			await validate(page).click();
		}
		expect([...seen].sort(), 'les quatre questions sont passées').toEqual(['D', 'N', 'P', 'S']);
	}

	/** La correction de chaque question porte la phrase attendue (ou aucune), et reste fausse */
	async function expectCorrections(page: Page): Promise<void> {
		for (const label of ['S', 'P', 'N', 'D']) {
			const block = correctionOf(page, label);
			await expect(block, `correction de la question ${label}`).toHaveCount(1);
			expect(await remarksOf(block), `phrases de la question ${label}`).toEqual(
				EXPECTED_REMARKS[label]
			);
			await expect(block.getByTestId('global-verdict')).toHaveText('Faux');
		}
	}

	test('#2695 — corrigé d’un Contrôle blanc : la même phrase sous la case fausse, aucune ailleurs', async ({
		page
	}) => {
		test.setTimeout(300_000);
		await loginAs(page, E17);
		await openSeries(page, seriesUrl(errorItems(), 'interactive'));
		await startSeries(page, page.getByTestId('interactive-position'));
		await answerFour(page);
		await expect(page.getByRole('heading', { name: 'Résultats du test' })).toBeVisible();
		await expectCorrections(page);
		await shoot(page, '2695-controle-blanc-corrige');
	});

	test('#2695 — copie corrigée d’un contrôle assigné : la même phrase sous la case fausse, aucune ailleurs', async ({
		page
	}) => {
		test.setTimeout(300_000);
		const [teacher] = await put<{ id: string }>(`select id::text from profiles where email = $1`, [
			TEACHER.email
		]);
		const [series] = await put<{ id: string }>(
			`insert into series (title, items, created_by, grade) values ($1, $2::jsonb, $3, '1_SPE') returning id::text`,
			[`${PREFIXE} contrôle des types d'erreur`, JSON.stringify(errorItems()), teacher.id]
		);
		const [evaluation] = await put<{ id: string }>(
			`insert into evaluations (series_id, form, status, created_by, shuffle_questions)
			 values ($1, 'interactive', 'published', $2, false) returning id::text`,
			[series.id, teacher.id]
		);
		const [assignment] = await put<{ id: string }>(
			`insert into evaluation_assignments (evaluation_id, student_id, assigned_by)
			 values ($1, $2, $3) returning id::text`,
			[evaluation.id, E19.id, teacher.id]
		);
		await loginAs(page, E19);
		await openSeries(page, `/automaths/test?assignment=${assignment.id}`);
		await startSeries(page, page.getByTestId('interactive-position'));
		await answerFour(page);
		await expect(page.getByText('Contrôle terminé')).toBeVisible({ timeout: 30_000 });
		await expectCorrections(page);
		await shoot(page, '2695-copie-corrigee');
	});
});

// ============================================================================
// #2686 — Types d'erreur, côté prof
// ============================================================================

/** Texte le plus petit (px) parmi les nœuds de texte visibles sous `root` */
async function smallestFontPx(root: Locator): Promise<{ px: number; text: string }> {
	return root.evaluate((el) => {
		let min = Infinity;
		let text = '';
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			if (!node.textContent?.trim()) continue;
			const parent = node.parentElement;
			if (!parent || parent.closest('.katex-mathml')) continue;
			const style = getComputedStyle(parent);
			if (style.visibility === 'hidden' || style.display === 'none') continue;
			const size = parseFloat(style.fontSize);
			if (size < min) {
				min = size;
				text = node.textContent.trim().slice(0, 60);
			}
		}
		return { px: min, text };
	});
}

/** « Lisible au téléphone » : rien ne déborde de la page, texte d'au moins 11 px */
async function expectLegible(page: Page, root: Locator, label: string): Promise<void> {
	await expectNoHorizontalOverflow(page, label);
	const smallest = await smallestFontPx(root);
	expect(smallest.px, `${label} : taille du texte (« ${smallest.text} »)`).toBeGreaterThanOrEqual(
		11
	);
}

/** Cadre d'une carte du tableau de bord, par son titre */
function dashboardCard(page: Page, title: string): Locator {
	return page
		.locator('[data-slot="card"]')
		.filter({ has: page.getByText(title, { exact: true }) })
		.first();
}

const resultsUrl = (): string => `/dashboard/teacher/assessments/${teacher.evaluationId}/results`;

/** « Types d'erreur : … » d'un panneau, sur une ligne */
const kindCounts = (panel: Locator): Locator => panel.getByTestId('error-kind-counts');

/** Le groupe de réponses d'un tirage (« tirage n° T ») dans un panneau d'erreurs */
const groupOfTirage = (panel: Locator, tirage: number): Locator =>
	panel.locator('div.space-y-2').filter({ hasText: new RegExp(`tirage n° ${tirage}(?!\\d)`) });

/** Les étiquettes de type d'un groupe, une par case typée */
async function kindLabels(group: Locator): Promise<string[]> {
	return (await group.getByTestId('error-kinds').locator('span').allTextContents()).map(flat);
}

test.describe('#2686 — types d’erreur pour le prof', () => {
	/** Ouvre la ligne d'une question du bilan et rend son panneau d'erreurs */
	async function openQuestion(page: Page, key: 'A' | 'B' | 'C'): Promise<Locator> {
		const questions = page.getByTestId('bilan-questions');
		const button = questions.getByRole('button', { name: teacher.titles[key] });
		await button.scrollIntoViewIfNeeded();
		await expect(button).toHaveAttribute('aria-expanded', 'false');
		// Un clic avant l'hydratation de la page se perd : on le rejoue tant que la ligne reste fermée
		await expect(async () => {
			if ((await button.getAttribute('aria-expanded')) === 'false') await button.click();
			await expect(button).toHaveAttribute('aria-expanded', 'true', { timeout: 3000 });
		}).toPass({ timeout: 30_000 });
		const panel = page.locator(`#erreurs-${templates[`types ${key}`]}`);
		await expect(panel).toBeVisible();
		await expect(panel.getByText('Chargement des erreurs…')).toHaveCount(0);
		return panel;
	}

	test('#2686 — bilan d’un contrôle, question dépliée : « Types d’erreur : Erreur de signe : 2 · Puissance de 10 : 1 · Non reconnue : 1 », une étiquette sous chaque réponse reconnue, aucune sous l’autre', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl());
		const panel = await openQuestion(page, 'A');

		// Énoncés tirés différents (tirages 1 à 4), quatre réponses fausses : deux signes, une virgule, une sans relation
		await expect(kindCounts(panel)).toHaveText(
			/^Types d['’]erreur\s*:\s*Erreur de signe\s*:\s*2\s*·\s*Puissance de 10\s*:\s*1\s*·\s*Non reconnue\s*:\s*1$/
		);
		await expect(panel.getByTestId('error-kinds')).toHaveCount(3);
		expect(await kindLabels(groupOfTirage(panel, 1))).toEqual(['Erreur de signe']);
		expect(await kindLabels(groupOfTirage(panel, 2))).toEqual(['Puissance de 10 (÷ 10)']);
		expect(await kindLabels(groupOfTirage(panel, 3))).toEqual(['Erreur de signe']);
		// Réponse sans relation reconnue : le groupe est là, sans étiquette
		await expect(groupOfTirage(panel, 4)).toHaveCount(1);
		await expect(groupOfTirage(panel, 4).getByTestId('error-kinds')).toHaveCount(0);
		// Les noms des élèves restent écrits (un groupe par réponse, énoncés distincts)
		await expect(groupOfTirage(panel, 2)).toContainText(teacher.names[E17.id]);
		await shoot(page, '2686-bilan-types');
		if (isPhone()) await expectLegible(page, panel, '#2686 bilan, question A');
	});

	test('#2686 — question à deux cases : l’étiquette dit la case (« Case 2 : Erreur de signe »)', async ({
		page
	}) => {
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl());
		const panel = await openQuestion(page, 'B');
		await expect(kindCounts(panel)).toHaveText(/^Types d['’]erreur\s*:\s*Erreur de signe\s*:\s*1$/);
		await expect(panel.getByTestId('error-kinds')).toHaveCount(1);
		expect(await kindLabels(panel)).toEqual(['Case 2 : Erreur de signe']);
		await shoot(page, '2686-bilan-deux-cases');
		if (isPhone()) await expectLegible(page, panel, '#2686 bilan, question B');
	});

	test('#2686 — aucun type reconnu : pas de ligne « Types d’erreur », pas d’étiquette', async ({
		page
	}) => {
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl());
		const panel = await openQuestion(page, 'C');
		// Les quatre réponses fausses sont bien listées…
		await expect(panel.getByText('ont répondu ainsi')).toHaveCount(0);
		for (const tirage of [10, 11, 12, 13]) {
			await expect(groupOfTirage(panel, tirage)).toHaveCount(1);
		}
		// … sans aucun type
		await expect(kindCounts(panel)).toHaveCount(0);
		await expect(panel.getByTestId('error-kinds')).toHaveCount(0);
		await expect(panel).not.toContainText('Types d’erreur');
		await expect(panel).not.toContainText("Types d'erreur");
		if (isPhone()) await expectLegible(page, panel, '#2686 bilan, question C');
	});

	test('#2686 — onglet « Erreurs » de l’analytique de la classe : mêmes types, les réponses de séries comptent aussi', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await loginTeacher(page);
		await gotoSettled(page, `/dashboard/teacher/classes/${teacher.classId}/analytics`);
		const top = dashboardCard(page, 'Top points à remédier');
		const row = top.locator('li').filter({ hasText: POINT_ERREURS_PROBE });
		await expect(
			row,
			'le point des types d’erreur est dans « Top points à remédier »'
		).toBeVisible();
		await row.getByRole('button', { name: 'Voir' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByRole('tab', { name: 'Erreurs' }).click();
		const panel = dialog.getByRole('tabpanel');
		await expect(panel.getByRole('heading', { level: 3 })).toContainText(teacher.titles.A);
		// Le contrôle donne 2 signes, 1 virgule, 1 non reconnue ; la réponse de série de l'élève 20 (`-12`) ajoute un signe
		await expect(kindCounts(panel)).toHaveText(
			/^Types d['’]erreur\s*:\s*Erreur de signe\s*:\s*3\s*·\s*Puissance de 10\s*:\s*1\s*·\s*Non reconnue\s*:\s*1$/
		);
		expect(await kindLabels(groupOfTirage(panel, 2))).toEqual(['Puissance de 10 (÷ 10)']);
		await expect(panel.getByTestId('error-kinds')).toHaveCount(4);
		await shoot(page, '2686-analytique-erreurs');
		if (isPhone()) {
			const width = page.viewportSize()!.width;
			const box = (await dialog.boundingBox())!;
			expect(box.x, 'bord gauche de la fenêtre').toBeGreaterThanOrEqual(0);
			expect(box.x + box.width, 'bord droit de la fenêtre').toBeLessThanOrEqual(width);
			await expectLegible(page, panel, '#2686 analytique, onglet Erreurs');
		}
	});
});

// ============================================================================
// #2673 — Durée observée + « Appliquer »
// ============================================================================

const OBSERVED = /Durée observée\s*:\s*35\s*s/;

/** « Ma série » (localStorage) posée avant le premier chargement de la page */
async function seedCart(page: Page, items: SeriesItem[]): Promise<void> {
	await page.addInitScript(
		([key, json]) => {
			if (!sessionStorage.getItem('verifs8-seeded')) {
				localStorage.setItem(key, json);
				sessionStorage.setItem('verifs8-seeded', '1');
			}
		},
		[CART_KEY, JSON.stringify(items)] as const
	);
}

/** Le bouton « Appliquer » de la suggestion tient dans la largeur de l'écran */
async function expectHintInside(page: Page, hint: Locator, label: string): Promise<void> {
	const width = page.viewportSize()!.width;
	const box = (await hint.boundingBox())!;
	expect(box.x, `${label} : bord gauche`).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width, `${label} : bord droit`).toBeLessThanOrEqual(width);
	await expectNoHorizontalOverflow(page, label);
}

test.describe('#2673 — durée observée', () => {
	test('#2673 — panier : « Durée observée : 35 s » + « Appliquer » sous la durée de 20 s ; « Appliquer » règle la durée et la suggestion disparaît ; rien sous le modèle de 4 élèves', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await loginTeacher(page);
		await seedCart(page, [
			{ templateId: templates['durée 5 élèves'], quantity: 2, delay: 20 },
			{ templateId: templates['durée 4 élèves'], quantity: 1, delay: 20 }
		]);
		await gotoSettled(page, '/automaths/panier');
		// La tuile d'un modèle : le plus proche bloc qui contient son titre ET sa durée
		const tile = (title: string): Locator =>
			page
				.getByText(title, { exact: true })
				.first()
				.locator('xpath=ancestor::div[.//*[@title="Durée par question"]][1]');
		const five = tile(teacher.durations.five);
		const four = tile(teacher.durations.four);
		await expect(five.getByTitle('Durée par question')).toContainText(/20\s*s/);
		await expect(four.getByTitle('Durée par question')).toContainText(/20\s*s/);
		// La suggestion : sous la durée du modèle suivi par 5 élèves ; aucune sous celui de 4 élèves
		const hint = five.locator('[data-duree-observee]');
		await expect(hint).toBeVisible();
		await expect(hint).toHaveText(OBSERVED);
		await expect(hint.getByRole('button', { name: 'Appliquer' })).toBeVisible();
		await expect(four.locator('[data-duree-observee]')).toHaveCount(0);
		await expect(page.locator('[data-duree-observee]')).toHaveCount(1);
		await hint.scrollIntoViewIfNeeded();
		await shoot(page, '2673-panier-suggestion');
		await expectHintInside(page, hint, '#2673 panier');

		// « Appliquer » : la durée devient 35 s, la suggestion s'en va (plus d'écart), l'autre ligne ne bouge pas
		await hint.getByRole('button', { name: 'Appliquer' }).click();
		await expect(five.getByTitle('Durée par question')).toContainText(/35\s*s/);
		await expect(page.locator('[data-duree-observee]')).toHaveCount(0);
		await expect(four.getByTitle('Durée par question')).toContainText(/20\s*s/);
		await shoot(page, '2673-panier-appliquee');
	});

	test('#2673 — éditeur de série : même suggestion, « Appliquer » change la durée à l’écran mais elle n’est écrite qu’à « Enregistrer »', async ({
		page
	}) => {
		test.setTimeout(120_000);
		const delays = async (): Promise<number[]> =>
			(
				await sql<{ items: { delay: number }[] }>(`select items from series where id = $1`, [
					teacher.seriesId
				])
			)[0].items.map((item) => item.delay);
		expect(await delays(), 'durées de départ').toEqual([20, 20]);

		await loginTeacher(page);
		await gotoSettled(page, `/dashboard/teacher/series/${teacher.seriesId}/edit`);
		const five = page.locator('li', { hasText: teacher.durations.five });
		const four = page.locator('li', { hasText: teacher.durations.four });
		await expect(five).toHaveCount(1);
		await expect(four).toHaveCount(1);
		await expect(five.locator('[data-duree]')).toHaveText(/20\s*s/);
		const hint = five.locator('[data-duree-observee]');
		await expect(hint).toBeVisible();
		await expect(hint).toHaveText(OBSERVED);
		await expect(four.locator('[data-duree-observee]')).toHaveCount(0);
		await expect(page.locator('[data-duree-observee]')).toHaveCount(1);
		await shoot(page, '2673-editeur-suggestion');
		await expectHintInside(page, hint, '#2673 éditeur');

		await hint.getByRole('button', { name: 'Appliquer' }).click();
		await expect(five.locator('[data-duree]')).toHaveText(/35\s*s/);
		await expect(page.locator('[data-duree-observee]')).toHaveCount(0);
		// Rien n'est encore écrit en base
		expect(await delays(), 'durées en base avant « Enregistrer »').toEqual([20, 20]);

		await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
		await expect
			.poll(delays, { message: 'durées en base après « Enregistrer »' })
			.toEqual([35, 20]);
	});
});
