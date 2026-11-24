import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { gotoSettled, shoot } from './helpers/pages';
import { acquireLock, LOCK_WAIT_MAX_MS, refreshLock, releaseLock } from './helpers/verrou';

/**
 * Résultats d'un contrôle et durées trop courtes — paquet 7 du tri — base LOCALE
 * ===============================================================================
 *
 * Reprend les lignes #2621 (bilan d'un contrôle), #2626 (erreurs d'une question), #2652
 * (« Durée sans doute trop courte » sur la page Résultats) et #2655 (la même marque dans le
 * panier et l'éditeur de série) de `docs/wip/verifications-manuelles.md`.
 *
 *   VERIFS_PORT=5176 pnpm test:verifs e2e/verifs/controles-paquet7.spec.ts
 *
 * Décor : élèves eleve21 à eleve25 SEULEMENT (verrou `eleves-21-25`), passés « élèves de test »
 * (`profiles.is_test`) le temps du fichier, et le compte prof en « mode test »
 * (`user_preferences.test_mode_enabled`) : tout est remis comme avant en `afterAll`. Les copies
 * (séances, réponses, traces de Contrôle blanc) sont posées en base ; ce que le professeur
 * VOIT est joué à l'écran. Modèles, séries et contrôles « Verifs7 … » sont supprimés en sortie.
 *
 * Deux verrous : `eleves-21-25` (les élèves) puis `compte-prof-mode-test` (le mode test du compte
 * prof, commun avec `suivi-paquet7`, qui lit « Mes classes » en mode « élèves réels »). L'état
 * d'origine (`is_test` des élèves, ligne `user_preferences` du prof) est écrit sur disque AVANT
 * toute modification : un arrêt brutal est réparé au passage suivant, sous les verrous.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.describe.configure({ mode: 'serial' });

// Types

type Student = { email: string; id: string; name: string };

interface AnswerSpec {
	templateId: string;
	instance: Record<string, unknown>;
	/** Une valeur par case ; null : aucune réponse */
	values: string[] | null;
	status: 'correct' | 'incorrect' | 'empty' | 'unoptimal_form';
	/** Secondes déclarées */
	timeSpent: number;
}

// Constantes

const LOCK = 'eleves-21-25';
/** Mode test du compte prof : commun avec `suivi-paquet7` */
const LOCK_PROF = 'compte-prof-mode-test';
/** Reprise après un arrêt brutal : état d'origine de `is_test` (élèves 21-25) et du mode test du prof */
const RECOVERY = '.captures/verifs/controles-paquet7-reprise.json';
const PASSWORD = 'local-eleve';
const NUMBERS = [21, 22, 23, 24, 25];
const IDS = NUMBERS.map((n) => `5eed0000-0000-4000-8000-0000000000${n}`);
const EMAILS = NUMBERS.map((n) => `eleve${n}@local.test`);
const CART_KEY = 'chiphre_question_cart';
/** Taille minimale du texte au téléphone, en px (brief du paquet) */
const MIN_FONT_PX = 11;
const MARK = '[data-duree-trop-courte]';
const SENTENCE =
	/Durée sans doute trop courte · 3 élèves sur 5 n['’]ont rien répondu dans les 5\s+s/;
const QUESTION_NAMES = ['Q1 somme', 'Q2 deux cases', 'Q3 choix', 'Q4 juste pour tous'];

/** Tables de l'élève photographiées puis remises (clé : `student_id`), comme `seances-paquet6` */
const SNAPSHOT_TABLES = [
	'student_buddies',
	'student_last_visits',
	'student_mathoux',
	'student_mathou_decorations',
	'student_point_state',
	'student_observable_state'
] as const;
/** Tables où l'insertion d'une trace ajoute des lignes : on retire celles créées depuis le début */
const APPENDED_TABLES = ['skill_attempts', 'gidouilles_activity', 'reward_events'] as const;

// Décor

let tag = '';
let startedAt = '';
let lockHeld = false;
let profLockHeld = false;
let students: Student[] = [];
const snapshot = new Map<string, unknown[]>();
let startGidouilles: { id: string; gidouilles: string }[] = [];
let isTestBefore: { id: string; is_test: boolean }[] = [];
let testModeBefore: { test_mode_enabled: boolean } | null = null;
const createdTemplates: string[] = [];
const createdSeries: string[] = [];
const createdEvaluations: string[] = [];

/** Contrôle du bilan (3 copies comptées + 1 en retard) */
let bilan: { evaluationId: string; titles: string[]; templates: string[] } | null = null;
/** Contrôle sans aucune copie */
let vide: { evaluationId: string } | null = null;
/** Durées : 5 élèves dont 3 sans réponse, 4 élèves, Course aux nombres */
let cinq: { evaluationId: string; title: string } | null = null;
let quatre: { evaluationId: string; title: string } | null = null;
let course: { evaluationId: string; title: string } | null = null;
/** Contrôle blanc libre à 5 s (traces), pour le panier et l'éditeur */
let blanc: { templateId: string; title: string; seriesId: string; otherTitle: string } | null =
	null;

interface RecoveryState {
	isTest: { id: string; is_test: boolean }[];
	/** null : la ligne `user_preferences` du prof n'existait pas */
	testMode: { test_mode_enabled: boolean } | null;
}

/** Remet `is_test` des élèves et le mode test du prof dans l'état donné */
async function putBack(state: RecoveryState): Promise<void> {
	for (const row of state.isTest) {
		await sql('update profiles set is_test = $2 where id = $1', [row.id, row.is_test]);
	}
	if (state.testMode) {
		await sql(
			`update user_preferences set test_mode_enabled = $2
			  where user_id = (select id from profiles where email = $1)`,
			[TEACHER.email, state.testMode.test_mode_enabled]
		);
	} else {
		// La ligne n'existait pas : on supprime celle que ce fichier a créée
		await sql(
			`delete from user_preferences where user_id = (select id from profiles where email = $1)`,
			[TEACHER.email]
		);
	}
}

/** Rejoue le fichier de reprise laissé par un arrêt brutal, puis le supprime */
async function recoverFromCrash(): Promise<void> {
	let saved: RecoveryState;
	try {
		saved = JSON.parse(readFileSync(RECOVERY, 'utf8')) as RecoveryState;
	} catch {
		return;
	}
	await putBack(saved);
	rmSync(RECOVERY, { force: true });
}

/** Retire contrôles, séries et modèles « Verifs7 controles … » laissés par un passage interrompu */
async function removeOrphanDecor(): Promise<void> {
	const prefix = 'Verifs7 controles %';
	const evaluations = (
		await sql<{ id: string }>(
			`select e.id::text from evaluations e join series s on s.id = e.series_id where s.title like $1`,
			[prefix]
		)
	).map((row) => row.id);
	if (evaluations.length > 0) {
		await sql(`delete from test_sessions where evaluation_id = any($1::uuid[])`, [evaluations]);
		await sql(`delete from evaluation_assignments where evaluation_id = any($1::uuid[])`, [
			evaluations
		]);
		await sql(`delete from evaluations where id = any($1::uuid[])`, [evaluations]);
	}
	await sql(`delete from series where title like $1`, [prefix]);
	await sql(
		`delete from skill_attempts where template_id in (select id from question_templates where title like $1)`,
		[prefix]
	);
	await sql(`delete from question_templates where title like $1`, [prefix]);
}

const projectName = (): string => test.info().project.name;
const isPhone = (): boolean => test.info().project.use.isMobile === true;

test.beforeAll(async () => {
	const testInfo = test.info();
	test.setTimeout(2 * LOCK_WAIT_MAX_MS + 120_000);
	assertLocalServerEnv();
	await acquireLock(LOCK);
	lockHeld = true;
	await acquireLock(LOCK_PROF);
	profLockHeld = true;
	// Un passage précédent interrompu : on remet son état d'origine avant de photographier
	await recoverFromCrash();
	await removeOrphanDecor();
	tag = `Verifs7 controles ${testInfo.project.name}${testInfo.parallelIndex}`;
	startedAt = (await sql<{ now: string }>('select now()::text as now'))[0].now;

	// Photographie de ce que le fichier change ou fait écrire
	for (const table of SNAPSHOT_TABLES) {
		const rows = await sql<{ r: unknown }>(
			`select to_jsonb(t) as r from ${table} t where student_id = any($1)`,
			[IDS]
		);
		snapshot.set(
			table,
			rows.map((row) => row.r)
		);
	}
	startGidouilles = await sql<{ id: string; gidouilles: string }>(
		'select id, gidouilles::text from profiles where id = any($1)',
		[IDS]
	);
	isTestBefore = await sql<{ id: string; is_test: boolean }>(
		'select id, is_test from profiles where id = any($1)',
		[IDS]
	);
	const prefs = await sql<{ test_mode_enabled: boolean }>(
		'select test_mode_enabled from user_preferences where user_id = (select id from profiles where email = $1)',
		[TEACHER.email]
	);
	testModeBefore = prefs[0] ?? null;

	// L'état d'origine est sur disque AVANT la première modification
	mkdirSync(dirname(RECOVERY), { recursive: true });
	writeFileSync(
		RECOVERY,
		JSON.stringify({ isTest: isTestBefore, testMode: testModeBefore } satisfies RecoveryState)
	);

	// Les cinq élèves deviennent « de test », le professeur passe en « mode test »
	await sql('update profiles set is_test = true where id = any($1)', [IDS]);
	await sql(
		`insert into user_preferences (user_id, test_mode_enabled)
		 select id, true from profiles where email = $1
		 on conflict (user_id) do update set test_mode_enabled = true`,
		[TEACHER.email]
	);

	const rows = await sql<{
		id: string;
		email: string;
		firstname: string | null;
		lastname: string | null;
	}>('select id, email, firstname, lastname from profiles where id = any($1) order by email', [
		IDS
	]);
	students = rows.map((row) => ({
		id: row.id,
		email: row.email,
		name: [row.firstname, row.lastname].filter(Boolean).join(' ').trim() || 'Élève'
	}));
	expect(students.map((s) => s.email)).toEqual(EMAILS);

	await buildDecor();
});

// Le fichier dure plus que les 30 min au bout desquelles un verrou est repris
test.beforeEach(() => {
	if (lockHeld) refreshLock(LOCK);
	if (profLockHeld) refreshLock(LOCK_PROF);
});

test.afterAll(async () => {
	try {
		await restoreDecor();
	} finally {
		if (profLockHeld) releaseLock(LOCK_PROF);
		if (lockHeld) releaseLock(LOCK);
	}
});

async function restoreDecor(): Promise<void> {
	if (!startedAt) return;
	const failures: string[] = [];
	/** Chaque étape a son propre try/catch : une erreur n'empêche pas les suivantes */
	const step = async (name: string, run: () => Promise<void>): Promise<void> => {
		try {
			await run();
		} catch (error) {
			failures.push(`${name} : ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	// D'abord ce qui touche les comptes partagés : is_test des élèves et mode test du prof
	await step('is_test et mode test', async () => {
		await putBack({ isTest: isTestBefore, testMode: testModeBefore });
		rmSync(RECOVERY, { force: true });
	});
	// Copies, assignations, contrôles, séries, puis traces et modèles
	await step('copies et contrôles', async () => {
		if (createdEvaluations.length === 0) return;
		await sql(`delete from test_sessions where evaluation_id = any($1::uuid[])`, [
			createdEvaluations
		]);
		await sql(`delete from evaluation_assignments where evaluation_id = any($1::uuid[])`, [
			createdEvaluations
		]);
		await sql(`delete from evaluations where id = any($1::uuid[])`, [createdEvaluations]);
	});
	await step('séries', async () => {
		if (createdSeries.length === 0) return;
		await sql(`delete from series where id = any($1::uuid[])`, [createdSeries]);
	});
	await step('traces des modèles', async () => {
		if (createdTemplates.length === 0) return;
		await sql(`delete from skill_attempts where template_id = any($1::uuid[])`, [createdTemplates]);
	});
	for (const table of APPENDED_TABLES) {
		await step(`traces ${table}`, async () => {
			await sql(`delete from ${table} where student_id = any($1) and created_at >= $2`, [
				IDS,
				startedAt
			]);
		});
	}
	for (const table of SNAPSHOT_TABLES) {
		await step(`photographie ${table}`, async () => {
			const rows = snapshot.get(table);
			if (rows === undefined) return;
			await sql(`delete from ${table} where student_id = any($1)`, [IDS]);
			if (rows.length > 0) {
				await sql(
					`insert into ${table} select * from jsonb_populate_recordset(null::${table}, $1::jsonb)`,
					[JSON.stringify(rows)]
				);
			}
		});
	}
	await step('gidouilles', async () => {
		for (const row of startGidouilles) {
			await sql('update profiles set gidouilles = $2::numeric where id = $1', [
				row.id,
				row.gidouilles
			]);
		}
	});
	await step('modèles', async () => {
		if (createdTemplates.length === 0) return;
		await sql(`delete from question_templates where id = any($1::uuid[])`, [createdTemplates]);
	});
	if (failures.length > 0) {
		throw new Error(`Décor mal remis en place :\n${failures.join('\n')}`);
	}
}

// Fonctions du décor

/** Un modèle « Verifs7 … » publié, posé par SQL, rangé dans une notion si on la donne */
async function makeTemplate(
	title: string,
	tagging?: { nodeId: string; pointId: string }
): Promise<string> {
	const variations = [
		{
			statement: 'Combien font 3 + 4 ? (tirage n° {{n}}) [_]',
			variables: [{ name: 'n', expression: '1..99' }],
			blanks: [{ expectedAnswer: '7' }],
			correction: { steps: ['On additionne : $3 + 4 = 7$.'] }
		}
	];
	const rows = await sql<{ id: string }>(
		`insert into question_templates (type, grades, level, variations, status, title, created_by,
		                                 options, classification_node_id)
		 values ('fill_in_blanks', array['6'], 1, $1::jsonb, 'published', $2,
		         (select id from profiles where email = $3), '{}'::jsonb, $4)
		 returning id::text`,
		[JSON.stringify(variations), `${tag} ${title}`, TEACHER.email, tagging?.nodeId ?? null]
	);
	const id = rows[0].id;
	createdTemplates.push(id);
	if (tagging) {
		await sql(`insert into question_template_points (template_id, point_id) values ($1, $2)`, [
			id,
			tagging.pointId
		]);
	}
	return id;
}

async function makeSeries(
	title: string,
	items: { templateId: string; quantity: number; delay: number }[]
): Promise<string> {
	const rows = await sql<{ id: string }>(
		`insert into series (title, grade, items, created_by)
		 values ($1, '6', $2::jsonb, (select id from profiles where email = $3)) returning id::text`,
		[`${tag} ${title}`, JSON.stringify(items), TEACHER.email]
	);
	createdSeries.push(rows[0].id);
	return rows[0].id;
}

/** Un contrôle publié, assigné nominativement aux élèves donnés */
async function makeEvaluation(
	seriesId: string,
	studentIds: string[],
	form: 'interactive' | 'course' = 'interactive'
): Promise<string> {
	const rows = await sql<{ id: string }>(
		`insert into evaluations (series_id, form, time_limit, status, created_by)
		 values ($1, $2, $3, 'published', (select id from profiles where email = $4)) returning id::text`,
		[seriesId, form, form === 'course' ? 120 : null, TEACHER.email]
	);
	const id = rows[0].id;
	createdEvaluations.push(id);
	for (const studentId of studentIds) {
		await sql(
			`insert into evaluation_assignments (evaluation_id, student_id, assigned_by)
			 values ($1, $2, (select id from profiles where email = $3))`,
			[id, studentId, TEACHER.email]
		);
	}
	return id;
}

/** Instance d'une question à une case « maths » (forme réelle d'un tirage) */
function mathInstance(templateId: string, position: number): Record<string, unknown> {
	return {
		level: 1,
		blanks: [
			{
				type: 'math',
				expectedAnswer: '7',
				expressionName: 'expression1',
				expectedAnswerLatex: '7'
			}
		],
		grades: ['6'],
		statement: 'Combien font ces deux nombres additionnés ?\n\n$$<<expr:expression1>>3 + 4$$',
		correction: { steps: ['On additionne : $3 + 4 = 7$.'] },
		templateId,
		expressions: [
			{ name: 'expression1', latex: '3 + 4', value: '3+4', answerFormat: '\\placeholder[0]{}' }
		],
		generatedAt: '2026-11-24T08:00:00.000Z',
		attemptPosition: position,
		resolvedVariables: [{ name: 'expression1', value: '3+4' }],
		selectedVariationIndex: 0
	};
}

/** Instance à deux cases : « a = ? » et « b = ? », attendu 3 et 4 */
function twoBlanksInstance(templateId: string, position: number): Record<string, unknown> {
	return {
		level: 1,
		blanks: [
			{
				type: 'math',
				expectedAnswer: '3',
				expressionName: 'expression1',
				expectedAnswerLatex: '3'
			},
			{
				type: 'math',
				expectedAnswer: '4',
				expressionName: 'expression2',
				expectedAnswerLatex: '4'
			}
		],
		grades: ['6'],
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

/** Instance en QCM : trois choix, le bon est « $7$ » (indice 1) */
function choiceInstance(templateId: string, position: number): Record<string, unknown> {
	const choices = ['$5$', '$7$', '$9$'];
	return {
		level: 1,
		blanks: [
			{
				type: 'choice',
				expectedAnswer: '1',
				choice: { choices, order: [0, 1, 2], multiple: false }
			}
		],
		grades: ['6'],
		statement: `Quelle est la valeur de $3 + 4$ ?\n\n\`\`\`choix\ncase: 0\n${choices.map((c) => `- ${c}`).join('\n')}\n\`\`\``,
		correction: { steps: ['$3 + 4 = 7$.'] },
		templateId,
		generatedAt: '2026-11-24T08:00:00.000Z',
		attemptPosition: position,
		resolvedVariables: [],
		selectedVariationIndex: 0
	};
}

/** Points d'une réponse : 1 juste, ½ juste mais forme à améliorer (colonne « Partiel »), 0 sinon */
function pointsOf(status: AnswerSpec['status']): number {
	return status === 'correct' ? 1 : status === 'unoptimal_form' ? 0.5 : 0;
}

/** Une copie rendue (séance terminée) avec ses réponses */
async function addCopy(
	evaluationId: string,
	studentId: string,
	answers: AnswerSpec[],
	mode: 'interactive' | 'course' = 'interactive'
): Promise<void> {
	const points = answers.reduce((sum, a) => sum + pointsOf(a.status), 0);
	// Note sur 20, au demi-point
	const grade = answers.length === 0 ? 0 : Math.round(((20 * points) / answers.length) * 2) / 2;
	const rows = await sql<{ id: string }>(
		`insert into test_sessions (user_id, mode, items, total_questions, completed_at, evaluation_id,
		                            grade, points_earned)
		 values ($1, $2, '[]'::jsonb, $3, now(), $4, $5, $6) returning id::text`,
		[studentId, mode, Math.max(answers.length, 1), evaluationId, grade, points]
	);
	const sessionId = rows[0].id;
	for (const answer of answers) {
		const userAnswer =
			answer.values === null
				? null
				: JSON.stringify({
						value: answer.values,
						partial: false,
						attempts: 1,
						isCorrect: answer.status === 'correct',
						timeSpent: answer.timeSpent,
						submittedAt: '2026-11-24T08:00:05.000Z'
					});
		await sql(
			`insert into test_answers (test_session_id, template_id, question_instance, user_answer,
			                           is_correct, time_spent, points, status)
			 values ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8)`,
			[
				sessionId,
				answer.templateId,
				JSON.stringify(answer.instance),
				userAnswer,
				answer.status === 'correct',
				answer.timeSpent,
				pointsOf(answer.status),
				answer.status
			]
		);
	}
}

/** Une trace de Contrôle blanc libre à 5 s : temps écoulé sans rien répondre, ou validée */
async function addMockTrace(studentId: string, templateId: string, missed: boolean): Promise<void> {
	await sql(
		`insert into skill_attempts (student_id, template_id, success, source, place, response_ms,
		                              allotted_ms, end_reason, answer_parts, part_verdicts)
		 values ($1, $2, $3, 'auto', 'mock_test', $4, 5000, $5, $6::text[], $7::boolean[])`,
		[
			studentId,
			templateId,
			!missed,
			missed ? 5000 : 2000,
			missed ? 'timeout' : 'validated',
			missed ? null : ['7'],
			missed ? null : [true]
		]
	);
}

async function buildDecor(): Promise<void> {
	// Deux notions du programme, chacune avec un point
	const notions = await sql<{ name: string; node_id: string; point_id: string }>(
		`select distinct on (n.id) n.name, n.id::text as node_id, p.id::text as point_id
		   from curriculum_points p join classification_nodes n on n.id = p.node_id
		  where n.kind = 'notion' and n.name in ('Aires', 'Angles')
		  order by n.id, p.id`
	);
	const aires = notions.find((n) => n.name === 'Aires');
	const angles = notions.find((n) => n.name === 'Angles');
	if (!aires || !angles)
		throw new Error('Notions « Aires » et « Angles » absentes de la base locale');
	const tagAires = { nodeId: aires.node_id, pointId: aires.point_id };
	const tagAngles = { nodeId: angles.node_id, pointId: angles.point_id };

	// ---- Bilan : quatre questions, trois copies comptées, une copie en retard ----
	const q1 = await makeTemplate(QUESTION_NAMES[0], tagAires);
	const q2 = await makeTemplate(QUESTION_NAMES[1], tagAires);
	const q3 = await makeTemplate(QUESTION_NAMES[2], tagAngles);
	const q4 = await makeTemplate(QUESTION_NAMES[3], tagAngles);
	const seriesBilan = await makeSeries('bilan', [
		{ templateId: q1, quantity: 1, delay: 20 },
		{ templateId: q2, quantity: 1, delay: 20 },
		{ templateId: q3, quantity: 1, delay: 20 },
		{ templateId: q4, quantity: 1, delay: 20 }
	]);
	const evaluationId = await makeEvaluation(seriesBilan, IDS);
	const [s21, s22, s23, s24, s25] = IDS;
	const copy = (
		first: string[],
		second: string[],
		choice: { values: string[] | null; status: AnswerSpec['status'] }
	): AnswerSpec[] => [
		{
			templateId: q1,
			instance: mathInstance(q1, 1),
			values: first,
			status: first[0] === '7' ? 'correct' : 'incorrect',
			timeSpent: 8
		},
		{
			templateId: q2,
			instance: twoBlanksInstance(q2, 2),
			values: second,
			status: second.join() === '3,4' ? 'correct' : 'incorrect',
			timeSpent: 12
		},
		{ templateId: q3, instance: choiceInstance(q3, 3), ...choice, timeSpent: 6 },
		{
			templateId: q4,
			instance: mathInstance(q4, 4),
			values: ['7'],
			status: 'correct',
			timeSpent: 5
		}
	];
	// Q1 : deux élèves donnent la MÊME réponse fausse (5) au même énoncé, le troisième a juste
	await addCopy(evaluationId, s21, copy(['5'], ['3', '9'], { values: ['0'], status: 'incorrect' }));
	await addCopy(evaluationId, s22, copy(['5'], ['2', '4'], { values: null, status: 'empty' }));
	await addCopy(evaluationId, s23, copy(['7'], ['3', '4'], { values: ['1'], status: 'correct' }));
	// Copie en retard : rendue sans aucune réponse, note 0
	await addCopy(evaluationId, s24, []);
	// Copie PARTIELLE : Q1 juste mais pas sous la forme attendue (« 14/2 » pour 7) = ½ point,
	// colonne « Partiel » ; le reste est juste
	await addCopy(evaluationId, s25, [
		{
			templateId: q1,
			instance: mathInstance(q1, 1),
			values: ['14/2'],
			status: 'unoptimal_form',
			timeSpent: 9
		},
		{
			templateId: q2,
			instance: twoBlanksInstance(q2, 2),
			values: ['3', '4'],
			status: 'correct',
			timeSpent: 10
		},
		{
			templateId: q3,
			instance: choiceInstance(q3, 3),
			values: ['1'],
			status: 'correct',
			timeSpent: 6
		},
		{
			templateId: q4,
			instance: mathInstance(q4, 4),
			values: ['7'],
			status: 'correct',
			timeSpent: 5
		}
	]);
	bilan = {
		evaluationId,
		titles: QUESTION_NAMES.map((name) => `${tag} ${name}`),
		templates: [q1, q2, q3, q4]
	};

	// ---- Contrôle sans copie ----
	vide = { evaluationId: await makeEvaluation(seriesBilan, IDS) };

	// ---- Durées trop courtes sur la page Résultats ----
	const answer = (templateId: string, ok: boolean): AnswerSpec => ({
		templateId,
		instance: mathInstance(templateId, 1),
		values: ok ? ['7'] : null,
		status: ok ? 'correct' : 'empty',
		// Le chrono de 5 s s'écoule en entier : 5 s déclarées
		timeSpent: ok ? 2 : 5
	});
	const tCinq = await makeTemplate('durée cinq élèves');
	const seriesCinq = await makeSeries('durée cinq élèves', [
		{ templateId: tCinq, quantity: 1, delay: 5 }
	]);
	const evCinq = await makeEvaluation(seriesCinq, IDS);
	for (const [i, id] of IDS.entries()) await addCopy(evCinq, id, [answer(tCinq, i >= 3)]);
	cinq = { evaluationId: evCinq, title: `${tag} durée cinq élèves` };

	const tQuatre = await makeTemplate('durée quatre élèves');
	const seriesQuatre = await makeSeries('durée quatre élèves', [
		{ templateId: tQuatre, quantity: 1, delay: 5 }
	]);
	const evQuatre = await makeEvaluation(seriesQuatre, IDS);
	for (const [i, id] of IDS.slice(0, 4).entries()) {
		await addCopy(evQuatre, id, [answer(tQuatre, i >= 3)]);
	}
	quatre = { evaluationId: evQuatre, title: `${tag} durée quatre élèves` };

	const tCourse = await makeTemplate('durée course aux nombres');
	const seriesCourse = await makeSeries('durée course aux nombres', [
		{ templateId: tCourse, quantity: 1, delay: 5 }
	]);
	const evCourse = await makeEvaluation(seriesCourse, IDS, 'course');
	for (const [i, id] of IDS.entries()) {
		await addCopy(evCourse, id, [answer(tCourse, i >= 3)], 'course');
	}
	course = { evaluationId: evCourse, title: `${tag} durée course aux nombres` };

	// ---- Contrôle blanc libre à 5 s : 5 élèves de test, 3 laissent le chrono s'écouler ----
	const tBlanc = await makeTemplate('contrôle blanc court');
	const tAutre = await makeTemplate('autre modèle sans signal');
	for (const [i, id] of IDS.entries()) await addMockTrace(id, tBlanc, i < 3);
	const seriesBlanc = await makeSeries('éditeur', [
		{ templateId: tBlanc, quantity: 2, delay: 5 },
		{ templateId: tAutre, quantity: 1, delay: 20 }
	]);
	blanc = {
		templateId: tBlanc,
		title: `${tag} contrôle blanc court`,
		seriesId: seriesBlanc,
		otherTitle: `${tag} autre modèle sans signal`
	};
}

// Fonctions de lecture

const resultsUrl = (evaluationId: string): string =>
	`/dashboard/teacher/assessments/${evaluationId}/results`;

async function loginTeacher(page: Page): Promise<void> {
	await login(page, TEACHER.email, TEACHER.password);
}

/** Le texte le plus petit (px) parmi les nœuds de texte visibles sous `root` */
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
	const { scroll, client } = await page.evaluate(() => ({
		scroll: document.documentElement.scrollWidth,
		client: document.documentElement.clientWidth
	}));
	expect(scroll, `${label} : la page déborde (${scroll} > ${client})`).toBeLessThanOrEqual(client);
	const smallest = await smallestFontPx(root);
	expect(smallest.px, `${label} : taille du texte (« ${smallest.text} »)`).toBeGreaterThanOrEqual(
		MIN_FONT_PX
	);
}

/** Les cellules d'une ligne de tableau, en texte nettoyé (espace insécable → espace) */
async function cellsOf(row: Locator): Promise<string[]> {
	const cells = await row.locator('td').allTextContents();
	return cells.map((c) => c.replace(/[\s ]+/g, ' ').trim());
}

const questionsCard = (page: Page): Locator => page.getByTestId('bilan-questions');
const notionsCard = (page: Page): Locator => page.getByTestId('bilan-notions');

// ============================================================================
// #2621 — Bilan d'un contrôle
// ============================================================================

test.describe('#2621 — Bilan d’un contrôle', () => {
	test('#2621 — bilan par question dans l’ordre de la série, taux et colonnes cohérents avec les copies, copie en retard dite à part, bilan par notion du plus faible au plus fort', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl(bilan!.evaluationId));
		const card = questionsCard(page);
		await expect(card.getByText('Bilan par question')).toBeVisible();

		// Copies comptées (trois) et copie en retard dite à part (une)
		await expect(card).toContainText(
			'4 copies comptées (la meilleure de chaque élève) · 1 copie rendue en retard, non comptée'
		);

		// Dans l'ordre de la série : Q1, Q2, Q3, Q4 ; chaque ligne = titre, taux, Juste/Partiel/Faux/Sans réponse
		const rows = card.locator('tbody tr');
		await expect(rows).toHaveCount(4);
		const lines: string[][] = [];
		for (let i = 0; i < 4; i++) lines.push(await cellsOf(rows.nth(i)));
		expect(lines.map((l) => l[0])).toEqual(bilan!.titles);
		// Q1 : 1 juste, 1 PARTIELLE (½ point), 2 faux → (1 + ½) / 4 = 37,5 % ; Q2 : 2 justes, 2 faux ;
		// Q3 : 2 justes, 1 faux, 1 sans réponse ; Q4 : 4 justes
		expect(lines.map((l) => l.slice(1))).toEqual([
			['38 %', '1', '1', '2', '0'],
			['50 %', '2', '0', '2', '0'],
			['50 %', '2', '0', '1', '1'],
			['100 %', '4', '0', '0', '0']
		]);
		// Chaque ligne compte les quatre copies : Juste + Partiel + Faux + Sans réponse = 4
		for (const line of lines) {
			expect(line.slice(2).reduce((sum, n) => sum + Number(n), 0)).toBe(4);
		}
		// La colonne « Partiel » porte une valeur non nulle, celle de l'unique réponse partielle posée
		expect(lines.reduce((sum, l) => sum + Number(l[3]), 0)).toBe(1);

		// Bilan par notion : « Aires » (Q1, Q2 : 3,5 points sur 8) avant « Angles » (Q3, Q4 : 6 sur 8)
		const notions = notionsCard(page).locator('tbody tr');
		await expect(notions).toHaveCount(2);
		const first = await cellsOf(notions.nth(0));
		const second = await cellsOf(notions.nth(1));
		expect(first[0]).toMatch(/Aires$/);
		expect(second[0]).toMatch(/Angles$/);
		expect(first.slice(1)).toEqual(['44 %', '3', '1', '4', '0']);
		expect(second.slice(1)).toEqual(['75 %', '6', '0', '1', '1']);

		await shoot(page, '2621-bilan', projectName());
		if (isPhone()) {
			await expectLegible(page, card, '#2621 bilan par question');
			await expectLegible(page, notionsCard(page), '#2621 bilan par notion');
		}
	});

	test('#2621 — avant toute copie : « Pas encore de copie rendue » dans les deux bilans', async ({
		page
	}) => {
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl(vide!.evaluationId));
		await expect(questionsCard(page).getByText('Pas encore de copie rendue')).toBeVisible();
		await expect(notionsCard(page).getByText('Pas encore de copie rendue')).toBeVisible();
		await expect(questionsCard(page).locator('tbody tr')).toHaveCount(0);
		await shoot(page, '2621-sans-copie', projectName());
		if (isPhone()) await expectLegible(page, questionsCard(page), '#2621 sans copie');
	});
});

// ============================================================================
// #2626 — Erreurs d'une question
// ============================================================================

test.describe('#2626 — Erreurs d’une question', () => {
	/** Ouvre la ligne d'une question du bilan et rend le panneau d'erreurs */
	async function openQuestion(page: Page, index: number): Promise<Locator> {
		const button = questionsCard(page).getByRole('button', { name: bilan!.titles[index] });
		await button.scrollIntoViewIfNeeded();
		await expect(button).toHaveAttribute('aria-expanded', 'false');
		await button.click();
		await expect(button).toHaveAttribute('aria-expanded', 'true');
		const panel = page.locator(`#erreurs-${bilan!.templates[index]}`);
		await expect(panel).toBeVisible();
		await expect(panel.getByText('Chargement des erreurs…')).toHaveCount(0);
		return panel;
	}

	test('#2626 — un clic ouvre la question ; deux réponses identiques au même énoncé sont regroupées avec les noms ; la bonne réponse est montrée', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl(bilan!.evaluationId));
		const panel = await openQuestion(page, 0);

		// Regroupées : « 2 élèves ont répondu ainsi », avec les deux noms (tri français)
		const twoNames = [students[0].name, students[1].name].sort((a, b) => a.localeCompare(b, 'fr'));
		await expect(panel.getByText('2 élèves ont répondu ainsi')).toBeVisible();
		await expect(panel).toContainText(twoNames.join(', '));
		// Un seul groupe : la réponse fausse n'est pas répétée par élève
		await expect(panel.getByText('ont répondu ainsi')).toHaveCount(1);
		// La réponse fausse est montrée avec son énoncé et la bonne réponse
		// Le groupe des deux élèves : son verdict, son énoncé, la réponse fausse (5) dans sa ligne
		// « différent de » et la bonne réponse (7) dans la sienne, étiquetée « faux »
		const group = panel.locator('div.space-y-2', {
			hasText: '2 élèves ont répondu ainsi'
		});
		await expect(group.getByTestId('global-verdict')).toHaveText('Faux');
		await expect(group.getByTestId('instruction')).toContainText(
			'Combien font ces deux nombres additionnés'
		);
		const line = group.locator('[data-testid="expected-result"] [data-status="incorrect"]');
		await expect(line).toHaveCount(1);
		await expect(line.locator('[data-status-label]')).toHaveText('faux');
		await expect(line.locator('math-span')).toContainText(/\\neq\}\}\s*\\textcolor\{[^}]*\}\{5\}/);
		await expect(line.locator('math-span')).toContainText(/\{7\}\}\\end\{aligned\}/);
		// La copie partielle (s25, « 14/2 ») est un second groupe à part, au verdict « ½ point »
		const partialGroup = panel.locator('div.space-y-2', { hasText: students[4].name });
		await expect(partialGroup.getByTestId('global-verdict')).toHaveText('½ point');
		await shoot(page, '2626-groupe', projectName());
		if (isPhone()) await expectLegible(page, panel, '#2626 groupe');

		// Un second clic referme la ligne
		await questionsCard(page).getByRole('button', { name: bilan!.titles[0] }).click();
		await expect(panel).toHaveCount(0);
	});

	test('#2626 — question à plusieurs cases : erreurs par case, un groupe par réponse', async ({
		page
	}) => {
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl(bilan!.evaluationId));
		const panel = await openQuestion(page, 1);
		// Quatre réponses données ; une erreur sur chaque case
		await expect(panel.getByText('Case 1 : 1 erreur sur 4')).toBeVisible();
		await expect(panel.getByText('Case 2 : 1 erreur sur 4')).toBeVisible();
		// Deux réponses différentes : deux groupes, un nom chacun (jamais « ont répondu ainsi »)
		await expect(panel.getByText('ont répondu ainsi')).toHaveCount(0);
		await expect(panel).toContainText(students[0].name);
		await expect(panel).toContainText(students[1].name);
		await expect(panel).toContainText('Complète les deux égalités');
		await shoot(page, '2626-cases', projectName());
		if (isPhone()) await expectLegible(page, panel, '#2626 cases');
	});

	test('#2626 — QCM : l’énoncé et ses choix se lisent, la réponse fausse est listée et celle laissée vide comptée à part', async ({
		page
	}) => {
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl(bilan!.evaluationId));
		const panel = await openQuestion(page, 2);
		await expect(panel.getByText('1 sans réponse')).toBeVisible();
		// Un seul groupe, celui de l'élève qui a coché à tort ; l'élève sans réponse n'y est pas nommé
		await expect(panel.getByTestId('global-verdict')).toHaveCount(1);
		await expect(panel.getByTestId('global-verdict')).toHaveText('Faux');
		await expect(panel.locator('div.space-y-2 > p.text-sm.font-medium')).toHaveText(
			students[0].name
		);
		await expect(panel).not.toContainText(students[1].name);
		await expect(panel.locator('[data-testid="expected-result"]')).toContainText(
			'Quelle est la valeur de'
		);
		// Les trois choix dans leurs libellés rendus : le coché à tort, la bonne réponse, le neutre
		const choices = panel.locator('ul.choice-list > li');
		await expect(choices).toHaveCount(3);
		// Lettre, valeur rendue dans sa formule et mention de chaque choix
		const expectChoice = async (
			index: number,
			status: string,
			letter: string,
			value: string,
			mention: string | null
		): Promise<void> => {
			const item = choices.nth(index);
			await expect(item).toHaveAttribute('data-status', status);
			await expect(item.locator('span.font-semibold')).toHaveText(letter);
			await expect(item.locator('math-span')).toContainText(value);
			if (mention === null) await expect(item.locator('.status-tag')).toHaveCount(0);
			else await expect(item.locator('.status-tag')).toHaveText(mention);
		};
		await expectChoice(0, 'incorrect', 'A', '5', 'coché à tort');
		await expectChoice(1, 'solution', 'B', '7', 'bonne réponse');
		await expectChoice(2, 'neutral', 'C', '9', null);
		await shoot(page, '2626-qcm', projectName());
		if (isPhone()) await expectLegible(page, panel, '#2626 QCM');
	});

	test('#2626 — question juste pour tous : « Aucune erreur sur cette question. »', async ({
		page
	}) => {
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl(bilan!.evaluationId));
		const panel = await openQuestion(page, 3);
		await expect(panel.getByText('Aucune erreur sur cette question.')).toBeVisible();
		await expect(panel.getByText('ont répondu ainsi')).toHaveCount(0);
		if (isPhone()) await expectLegible(page, panel, '#2626 aucune erreur');
	});
});

// ============================================================================
// #2652 — « Durée sans doute trop courte » sur la page Résultats
// ============================================================================

test.describe('#2652 — Durée sans doute trop courte (page Résultats)', () => {
	test('#2652 — 5 élèves de test dont 3 sans réponse à 5 s : icône, « Durée sans doute trop courte » et « 3 élèves sur 5 n’ont rien répondu dans les 5 s », aucun nom', async ({
		page
	}) => {
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl(cinq!.evaluationId));
		const row = questionsCard(page).locator('tbody tr', { hasText: cinq!.title });
		await expect(row).toBeVisible();
		const mark = row.locator(MARK);
		await expect(mark).toBeVisible();
		await expect(mark.getByText('Durée sans doute trop courte')).toBeVisible();
		await expect(mark).toHaveText(SENTENCE);
		// L'icône chrono est dessinée
		await expect(mark.locator('svg')).toBeVisible();
		// Des comptes, jamais un nom
		for (const student of students) await expect(mark).not.toContainText(student.name);
		await mark.scrollIntoViewIfNeeded();
		await shoot(page, '2652-cinq', projectName());
		if (isPhone()) await expectLegible(page, questionsCard(page), '#2652 cinq élèves');
	});

	test('#2652 — avec 4 élèves seulement : rien', async ({ page }) => {
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl(quatre!.evaluationId));
		const card = questionsCard(page);
		// La page est bien lue : la ligne et ses 4 copies sont là, sans marque
		await expect(card).toContainText('4 copies comptées');
		await expect(card.locator('tbody tr', { hasText: quatre!.title })).toBeVisible();
		await expect(card.locator(MARK)).toHaveCount(0);
		await expect(page.getByText('Durée sans doute trop courte')).toHaveCount(0);
	});

	test('#2652 — Course aux nombres : rien, même avec 5 élèves dont 3 sans réponse', async ({
		page
	}) => {
		await loginTeacher(page);
		await gotoSettled(page, resultsUrl(course!.evaluationId));
		const card = questionsCard(page);
		await expect(card).toContainText('5 copies comptées');
		await expect(card.locator('tbody tr', { hasText: course!.title })).toBeVisible();
		await expect(card.locator(MARK)).toHaveCount(0);
		await expect(page.getByText('Durée sans doute trop courte')).toHaveCount(0);
	});
});

// ============================================================================
// #2655 — Durée trop courte dans le panier et l'éditeur de série
// ============================================================================

test.describe('#2655 — Durée trop courte dans le panier et l’éditeur', () => {
	/** « Ma série » (localStorage) posée avant le premier chargement de la page */
	async function seedCart(page: Page, delay: number): Promise<void> {
		const cart = [{ templateId: blanc!.templateId, quantity: 2, delay }];
		await page.addInitScript(
			([key, json]) => {
				if (!sessionStorage.getItem('verifs-seeded')) {
					localStorage.setItem(key, json);
					sessionStorage.setItem('verifs-seeded', '1');
				}
			},
			[CART_KEY, JSON.stringify(cart)] as const
		);
	}

	test('#2655 — panier à 5 s : icône et « 3 élèves sur 5 n’ont rien répondu dans les 5 s » ; à 10 s la marque disparaît', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await loginTeacher(page);
		await seedCart(page, 5);
		await gotoSettled(page, '/automaths/panier');
		const mark = page.locator(MARK);
		await expect(mark).toBeVisible();
		await expect(mark).toHaveText(SENTENCE);
		await expect(mark.locator('svg')).toBeVisible();
		await expect(page.getByTitle('Durée par question')).toContainText(/5\s*s/);
		for (const student of students) await expect(mark).not.toContainText(student.name);
		await mark.scrollIntoViewIfNeeded();
		await shoot(page, '2655-panier-5s', projectName());
		if (isPhone()) await expectLegible(page, page.locator('main').first(), '#2655 panier');

		// Un clic sur « Augmenter la durée » : 10 s, la marque s'en va
		await page.getByRole('button', { name: 'Augmenter la durée' }).click();
		await expect(page.getByTitle('Durée par question')).toContainText(/10\s*s/);
		await expect(page.locator(MARK)).toHaveCount(0);
		await shoot(page, '2655-panier-10s', projectName());

		// Redescendre à 5 s la ramène
		await page.getByRole('button', { name: 'Diminuer la durée' }).click();
		await expect(page.getByTitle('Durée par question')).toContainText(/5\s*s/);
		await expect(page.locator(MARK)).toHaveText(SENTENCE);
	});

	test('#2655 — éditeur de la série : chaque ligne affiche sa durée, la ligne du modèle porte la marque, l’autre non, aucun nom', async ({
		page
	}) => {
		await loginTeacher(page);
		await gotoSettled(page, `/dashboard/teacher/series/${blanc!.seriesId}/edit`);
		const durations = page.locator('[data-duree]');
		await expect(durations).toHaveCount(2);
		const texts = (await durations.allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
		expect(texts).toEqual(['5 s', '20 s']);

		const rows = page.locator('li', { hasText: blanc!.title });
		await expect(rows).toHaveCount(1);
		await expect(rows.locator(MARK)).toHaveText(SENTENCE);
		await expect(rows.locator(MARK).locator('svg')).toBeVisible();
		const other = page.locator('li', { hasText: blanc!.otherTitle });
		await expect(other).toHaveCount(1);
		await expect(other.locator(MARK)).toHaveCount(0);
		await expect(page.locator(MARK)).toHaveCount(1);
		for (const student of students) {
			await expect(page.locator(MARK)).not.toContainText(student.name);
		}
		await shoot(page, '2655-editeur', projectName());
		// La liste des lignes de la série (le pastille « 1 » du bouton Signaler, hors sujet, fait 10 px)
		if (isPhone()) await expectLegible(page, page.locator('ul:has([data-duree])'), '#2655 éditeur');
	});

	test('#2655 — compte élève : la même série à 5 s ne porte aucune marque', async ({ page }) => {
		await login(page, EMAILS[0], PASSWORD);
		await seedCart(page, 5);
		await gotoSettled(page, '/automaths/panier');
		// La carte du modèle est bien là, avec sa durée de 5 s
		await expect(page.getByTitle('Durée par question')).toContainText(/5\s*s/);
		await expect(page.locator(MARK)).toHaveCount(0);
		await expect(page.getByText('Durée sans doute trop courte')).toHaveCount(0);
		await shoot(page, '2655-eleve', projectName());
	});
});
