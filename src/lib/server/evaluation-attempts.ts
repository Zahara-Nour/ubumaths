/**
 * Tentatives d'évaluation corrigées par le serveur (chantier 5, ADR 0015)
 * =======================================================================
 *
 * Décisions Q32-Q39 de David (docs/wip/series-formes-progress.md) :
 * - DÉMARRER (Q32, Q33) : le serveur crée la séance, tire pour chaque question
 *   un modèle et une graine, les enregistre (`evaluation_attempt_questions`,
 *   lisible par service_role seul) et renvoie la version PUBLIQUE des
 *   questions. La tentative compte dès ce moment, même abandonnée.
 * - REPRENDRE (Q34) : une tentative en cours est rendue telle quelle (mêmes
 *   questions, même ordre, régénérées depuis les graines), sans en compter une
 *   nouvelle ; les réponses déjà tapées ne sont pas gardées.
 * - ENVOYER (Q35-Q37, Q39) : le serveur régénère, corrige (`validateAnswer`),
 *   applique le barème, écrit réponses et note, puis alimente le SRS avec SON
 *   verdict. Tout verdict venu du navigateur est ignoré. Course : envoi reçu
 *   après temps limite + 30 s → note 0, aucune réponse comptée.
 *
 * DROITS. La base refuse toute écriture utilisateur sur une séance
 * d'évaluation (Q38) : les écritures passent par le client service_role
 * (`service`), APRÈS que ce module a vérifié lui-même l'identité (l'appelant
 * passe l'utilisateur de `locals`) et les droits, lus sous RLS avec le client
 * de l'utilisateur (`userClient`). Les graines ne quittent jamais le serveur.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { toJson } from '$lib/types/database-helpers';
import type { CartItem } from '$lib/stores/questionCart.svelte';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { AnswerData } from '$lib/types/question-display';
import type { EvaluationWithSeries } from '$lib/types/evaluation';
import { getAttemptsRemaining } from '$lib/types/evaluation';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { drawSeriesQuestions, MAX_QUESTION_SEED } from '$lib/questions/series-items';
import { toPublicQuestion, type PublicQuestion } from '$lib/questions/public-question';
import {
	gradeOutOf20,
	gradeQuestion,
	type QuestionPoints,
	type SubmittedAnswer
} from '$lib/questions/grading';
import { toQuestionTemplate, type QuestionTemplateRow } from '$lib/types/question-template';
import { isDeadlinePassed } from '$lib/utils/dates';
import {
	countAttempts,
	EvaluationError,
	getAssignmentWithEvaluation,
	isAssignmentRecipient
} from '$lib/server/evaluations';
import { recordSeriesReviews } from '$lib/server/srs/record-series-reviews';
import { addBuddyXpFromTest } from '$lib/server/buddy-xp-service';

// Types
type Db = SupabaseClient<Database>;

export interface AttemptActors {
	/** Client de l'utilisateur (RLS) : toutes les LECTURES de droits */
	userClient: Db;
	/** Client service_role : les ÉCRITURES d'une évaluation, les graines */
	service: Db;
	userId: string;
	/** Rôle de l'utilisateur (aperçu du propriétaire ou de l'admin) */
	role: string;
	/** Horloge injectable (tests) */
	now?: () => Date;
	/** Hasard injectable (tests) : entier dans [0, max] */
	randomInt?: (max: number) => number;
}

interface EvaluationSummary {
	id: string;
	form: 'interactive' | 'course';
	time_limit: number | null;
	title: string;
}

export type StartResult =
	| {
			kind: 'preview';
			evaluation: EvaluationSummary & { categories: CartItem[] };
	  }
	| {
			kind: 'attempt';
			evaluation: EvaluationSummary;
			attemptId: string;
			resumed: boolean;
			/** Course : secondes restantes (≥ 0) ; Entraînement : null */
			remainingSeconds: number | null;
			questions: PublicQuestion[];
	  };

export interface SubmitInput {
	answers: Array<SubmittedAnswer & { position: number; timeSpent?: number }>;
	timeSpent: number;
}

export interface CorrectedQuestion {
	position: number;
	/** Instance COMPLÈTE (correction comprise) : renvoyée seulement après l'envoi */
	instance: QuestionInstance;
	answer: SubmittedAnswer | null;
	status: string;
	points: QuestionPoints;
	isCorrect: boolean;
	feedback?: string;
}

export interface SubmitResult {
	attemptId: string;
	/** Course reçue après temps limite + 30 s : note 0, aucune réponse comptée */
	late: boolean;
	grade: number;
	pointsEarned: number;
	totalQuestions: number;
	/** Questions entièrement justes (« 7/10 questions ») */
	correctCount: number;
	questions: CorrectedQuestion[];
}

// Constantes
/** Tolérance réseau après la fin du chrono d'une Course (Q37) */
export const COURSE_GRACE_SECONDS = 30;

// Functions
function cryptoRandomInt(max: number): number {
	// Entier uniforme dans [0, max], max ≤ 2^31 - 1 (rejet pour éviter le biais)
	const range = max + 1;
	const limit = Math.floor(0x1_0000_0000 / range) * range;
	const buffer = new Uint32Array(1);
	for (;;) {
		crypto.getRandomValues(buffer);
		if (buffer[0] < limit) return buffer[0] % range;
	}
}

function summary(evaluation: EvaluationWithSeries): EvaluationSummary {
	return {
		id: evaluation.id,
		form: evaluation.form,
		time_limit: evaluation.time_limit,
		title: evaluation.series.title
	};
}

function remainingSeconds(
	session: { mode: string; time_limit: number | null; created_at: string | null },
	now: Date
): number | null {
	if (session.mode !== 'course' || !session.time_limit || !session.created_at) return null;
	const elapsed = (now.getTime() - new Date(session.created_at).getTime()) / 1000;
	return Math.max(0, Math.floor(session.time_limit - elapsed));
}

/** Modèles de la série (publiés, lus sous RLS par l'élève) */
async function loadSeriesTemplates(
	userClient: Db,
	categories: readonly CartItem[]
): Promise<QuestionTemplate[]> {
	const themes = [...new Set(categories.map((c) => c.category.theme))];
	const domains = [...new Set(categories.map((c) => c.category.domain))];
	if (themes.length === 0) return [];

	const { data, error } = await userClient
		.from('question_templates')
		.select('*')
		.eq('status', 'published')
		.in('theme', themes)
		.in('domain', domains);

	if (error) {
		console.error('[evaluation-attempts] Modèles illisibles :', error);
		throw new EvaluationError(500, "Impossible de préparer l'évaluation, réessaie dans un instant");
	}
	return ((data ?? []) as QuestionTemplateRow[]).map(toQuestionTemplate);
}

interface StoredQuestion {
	position: number;
	template_id: string;
	seed: number;
	delay_seconds: number;
	category_key: string;
}

/**
 * Régénère les questions d'une tentative depuis modèles + graines (service :
 * un modèle repassé en brouillon depuis reste corrigeable).
 */
async function regenerateAttempt(
	service: Db,
	attemptId: string
): Promise<Array<{ stored: StoredQuestion; instance: QuestionInstance }>> {
	const { data: rows, error } = await service
		.from('evaluation_attempt_questions')
		.select('position, template_id, seed, delay_seconds, category_key')
		.eq('test_session_id', attemptId)
		.order('position', { ascending: true });

	if (error) {
		console.error('[evaluation-attempts] Questions de la tentative illisibles :', error);
		throw new EvaluationError(500, 'Impossible de relire ta tentative, réessaie dans un instant');
	}
	const stored = rows ?? [];
	if (stored.length === 0) {
		throw new EvaluationError(500, 'Cette tentative ne contient aucune question');
	}

	const templateIds = [...new Set(stored.map((row) => row.template_id))];
	const { data: templateRows, error: templatesError } = await service
		.from('question_templates')
		.select('*')
		.in('id', templateIds);

	if (templatesError) {
		console.error('[evaluation-attempts] Modèles de la tentative illisibles :', templatesError);
		throw new EvaluationError(500, 'Impossible de relire ta tentative, réessaie dans un instant');
	}
	const templates = new Map(
		((templateRows ?? []) as QuestionTemplateRow[]).map((row) => [row.id, toQuestionTemplate(row)])
	);

	return stored.map((row) => {
		const template = templates.get(row.template_id);
		const result = template ? generateInstance(template, row.seed) : null;
		if (!result || !result.success) {
			console.error('[evaluation-attempts] Régénération impossible :', {
				attemptId,
				position: row.position,
				templateId: row.template_id
			});
			throw new EvaluationError(500, 'Impossible de relire ta tentative, préviens ton professeur');
		}
		return { stored: row, instance: result.instance };
	});
}

function toPublicQuestions(
	questions: Array<{ stored: StoredQuestion; instance: QuestionInstance }>
): PublicQuestion[] {
	return questions.map(({ stored, instance }) =>
		toPublicQuestion(instance, { position: stored.position, delaySeconds: stored.delay_seconds })
	);
}

/** Tentative en cours de l'élève (la plus ANCIENNE s'il y en a plusieurs) */
async function findOpenAttempt(userClient: Db, evaluationId: string, userId: string) {
	const { data, error } = await userClient
		.from('test_sessions')
		.select('id, mode, time_limit, created_at')
		.eq('evaluation_id', evaluationId)
		.eq('user_id', userId)
		.is('completed_at', null)
		.order('created_at', { ascending: true })
		.limit(1);

	if (error) {
		console.error('[evaluation-attempts] Tentatives illisibles :', error);
		throw new EvaluationError(500, 'Impossible de vérifier tes tentatives précédentes');
	}
	return data?.[0] ?? null;
}

/**
 * Démarrer (ou reprendre) une tentative. `assignmentId` : identifiant de
 * l'ASSIGNATION (liens `/automaths/test?assignment=<id>`).
 *
 * @throws EvaluationError 404 (introuvable, non destinataire, brouillon,
 *   membre archivé), 403 (date limite passée, tentatives épuisées), 409 (aucune
 *   question disponible), 500 (panne)
 */
export async function startEvaluationAttempt(
	actors: AttemptActors,
	assignmentId: string
): Promise<StartResult> {
	const { userClient, service, userId } = actors;
	const now = actors.now ?? (() => new Date());
	const randomInt = actors.randomInt ?? cryptoRandomInt;

	const found = await getAssignmentWithEvaluation(userClient, assignmentId);
	if (!found) throw new EvaluationError(404, 'Évaluation introuvable');
	const { assignment, evaluation } = found;

	const recipient = await isAssignmentRecipient(userClient, assignment, userId);
	if (!recipient) {
		// Aperçu : propriétaire ou admin, questions générées par le navigateur,
		// rien n'est rattaché à l'évaluation (une séance rattachée verrouille la série)
		if (
			actors.role === 'admin' ||
			(actors.role === 'teacher' && evaluation.created_by === userId)
		) {
			return {
				kind: 'preview',
				evaluation: { ...summary(evaluation), categories: evaluation.series.categories }
			};
		}
		throw new EvaluationError(404, 'Évaluation introuvable');
	}
	if (evaluation.status !== 'published') throw new EvaluationError(404, 'Évaluation introuvable');

	// Q34 : une tentative en cours se reprend, sans en compter une nouvelle (même
	// après la date limite : commencée avant, elle peut finir après, Q37)
	const open = await findOpenAttempt(userClient, evaluation.id, userId);
	if (open) {
		const questions = await regenerateAttempt(service, open.id);
		return {
			kind: 'attempt',
			evaluation: summary(evaluation),
			attemptId: open.id,
			resumed: true,
			remainingSeconds: remainingSeconds(open, now()),
			questions: toPublicQuestions(questions)
		};
	}

	if (isDeadlinePassed(evaluation.deadline)) {
		throw new EvaluationError(403, 'La date limite est dépassée');
	}
	// Q33 : toute séance compte, abandonnée comprise
	const attempts = await countAttempts(userClient, evaluation.id, userId);
	const remaining = getAttemptsRemaining(attempts, evaluation.max_attempts);
	if (remaining !== null && remaining <= 0) {
		throw new EvaluationError(403, 'Nombre maximal de tentatives atteint');
	}

	// Tirage : même règle que `buildSeriesItems` (cartes de cours exclues)
	const categories = evaluation.series.categories;
	const templates = await loadSeriesTemplates(userClient, categories);
	const draws = drawSeriesQuestions(categories, templates, {
		excludeCourseCards: true,
		nextSeed: () => randomInt(MAX_QUESTION_SEED),
		pickIndex: (count) => randomInt(count - 1)
	});
	const generated: Array<{ stored: StoredQuestion; instance: QuestionInstance }> = [];
	for (const draw of draws) {
		const result = generateInstance(draw.template, draw.seed);
		if (!result.success) {
			console.error(
				'[evaluation-attempts] Génération impossible :',
				draw.template.id,
				result.errors
			);
			continue;
		}
		generated.push({
			stored: {
				position: generated.length,
				template_id: draw.template.id,
				seed: draw.seed,
				delay_seconds: draw.delaySeconds,
				category_key: draw.categoryKey
			},
			instance: result.instance
		});
	}
	if (generated.length === 0) {
		throw new EvaluationError(
			409,
			"Cette évaluation n'a aucune question disponible, préviens ton professeur"
		);
	}

	const { data: session, error: sessionError } = await service
		.from('test_sessions')
		.insert({
			user_id: userId,
			evaluation_id: evaluation.id,
			mode: evaluation.form,
			categories: toJson(categories),
			total_questions: generated.length,
			time_limit: evaluation.form === 'course' ? evaluation.time_limit : null,
			completed_at: null
		})
		.select('id, mode, time_limit, created_at')
		.single();

	if (sessionError || !session) {
		console.error('[evaluation-attempts] Séance non créée :', sessionError);
		throw new EvaluationError(
			500,
			"Impossible de commencer l'évaluation, réessaie dans un instant"
		);
	}

	const rows = generated.map(({ stored }) => ({ test_session_id: session.id, ...stored }));
	const { data: written, error: questionsError } = await service
		.from('evaluation_attempt_questions')
		.insert(rows)
		.select('position');

	if (questionsError || (written?.length ?? 0) !== rows.length) {
		console.error('[evaluation-attempts] Questions non enregistrées :', questionsError);
		// Une séance sans questions ne doit pas coûter une tentative
		await service.from('test_sessions').delete().eq('id', session.id);
		throw new EvaluationError(
			500,
			"Impossible de commencer l'évaluation, réessaie dans un instant"
		);
	}

	// Double démarrage simultané (double clic, deux onglets) : la plus ancienne
	// tentative en cours l'emporte, la nôtre s'efface (graines comprises, CASCADE)
	const oldest = await findOpenAttempt(userClient, evaluation.id, userId);
	if (oldest && oldest.id !== session.id) {
		await service.from('test_sessions').delete().eq('id', session.id);
		const questions = await regenerateAttempt(service, oldest.id);
		return {
			kind: 'attempt',
			evaluation: summary(evaluation),
			attemptId: oldest.id,
			resumed: true,
			remainingSeconds: remainingSeconds(oldest, now()),
			questions: toPublicQuestions(questions)
		};
	}

	return {
		kind: 'attempt',
		evaluation: summary(evaluation),
		attemptId: session.id,
		resumed: false,
		remainingSeconds: remainingSeconds(session, now()),
		questions: toPublicQuestions(generated)
	};
}

/** Réponse enregistrée : au format `AnswerData` que lisent les corrections */
function storedUserAnswer(
	answer: SubmittedAnswer | null,
	isCorrect: boolean,
	timeSpent: number | undefined,
	submittedAt: string
): AnswerData | null {
	if (!answer) return null;
	return {
		value: answer.choices ?? answer.values ?? [],
		isCorrect,
		timeSpent: timeSpent ?? 0,
		attempts: 1,
		submittedAt,
		...(answer.latex && { valueLatex: answer.latex })
	};
}

/**
 * Envoyer une tentative : corriger, noter, enregistrer.
 *
 * @throws EvaluationError 404 (séance inconnue, d'un autre, pas une évaluation),
 *   409 (déjà terminée ; rien n'est écrit), 500 (panne)
 */
export async function submitEvaluationAttempt(
	actors: AttemptActors,
	attemptId: string,
	input: SubmitInput
): Promise<SubmitResult> {
	const { userClient, service, userId } = actors;
	const now = (actors.now ?? (() => new Date()))();
	const nowIso = now.toISOString();

	// Lu sous RLS : la séance d'un autre élève est invisible → 404
	const { data: session, error: sessionError } = await userClient
		.from('test_sessions')
		.select('id, user_id, evaluation_id, mode, time_limit, created_at, completed_at')
		.eq('id', attemptId)
		.maybeSingle();

	if (sessionError) {
		console.error('[evaluation-attempts] Séance illisible :', sessionError);
		throw new EvaluationError(500, 'Impossible de relire ta tentative, réessaie dans un instant');
	}
	if (!session || session.user_id !== userId || !session.evaluation_id) {
		throw new EvaluationError(404, 'Tentative introuvable');
	}
	if (session.completed_at) {
		throw new EvaluationError(409, 'Cette tentative est déjà terminée');
	}

	const questions = await regenerateAttempt(service, attemptId);
	const totalQuestions = questions.length;

	// Q37 : Course reçue trop tard → close à 0, aucune réponse comptée
	const deadlineMs =
		session.mode === 'course' && session.time_limit && session.created_at
			? new Date(session.created_at).getTime() + (session.time_limit + COURSE_GRACE_SECONDS) * 1000
			: null;
	const late = deadlineMs !== null && now.getTime() > deadlineMs;

	const answersByPosition = new Map(input.answers.map((a) => [a.position, a]));
	const corrected: CorrectedQuestion[] = questions.map(({ stored, instance: full }) => {
		// D18 : la graine ne quitte jamais le serveur, ni dans la réponse ni dans
		// `test_answers.question_instance` (lisible par l'élève et le prof)
		const { seed: _seed, ...instance } = full;
		const answer = late ? null : (answersByPosition.get(stored.position) ?? null);
		const verdict = answer
			? gradeQuestion(instance, answer)
			: { status: 'empty' as const, points: 0 as const, isCorrect: false };
		return {
			position: stored.position,
			instance,
			answer: answer
				? {
						...(answer.values && { values: answer.values }),
						...(answer.latex && { latex: answer.latex }),
						...(answer.choices && { choices: answer.choices })
					}
				: null,
			status: verdict.status,
			points: verdict.points,
			isCorrect: verdict.isCorrect,
			...('feedback' in verdict && verdict.feedback && { feedback: verdict.feedback })
		};
	});

	const pointsEarned = corrected.reduce((sum, q) => sum + q.points, 0);
	const correctCount = corrected.filter((q) => q.isCorrect).length;
	const grade = gradeOutOf20(pointsEarned, totalQuestions);

	// Réponses d'abord (sauf retard), puis la séance, close SI ELLE NE L'ÉTAIT PAS
	let insertedIds: string[] = [];
	if (!late) {
		const rows = corrected.map((q, index) => ({
			test_session_id: attemptId,
			template_id: questions[index].stored.template_id,
			question_instance: toJson(q.instance),
			user_answer: toJson(
				storedUserAnswer(
					q.answer,
					q.isCorrect,
					answersByPosition.get(q.position)?.timeSpent,
					nowIso
				)
			),
			is_correct: q.isCorrect,
			points: q.points,
			status: q.status,
			time_spent: answersByPosition.get(q.position)?.timeSpent ?? null,
			attempts: 1
		}));
		const { data: written, error: answersError } = await service
			.from('test_answers')
			.insert(rows)
			.select('id');

		insertedIds = (written ?? []).map((row) => row.id);
		if (answersError || insertedIds.length !== rows.length) {
			console.error('[evaluation-attempts] Réponses non enregistrées :', answersError);
			if (insertedIds.length > 0) await service.from('test_answers').delete().in('id', insertedIds);
			throw new EvaluationError(500, "Ta copie n'a pas pu être enregistrée, réessaie");
		}
	}

	const { data: closed, error: closeError } = await service
		.from('test_sessions')
		.update({
			completed_at: nowIso,
			points_earned: pointsEarned,
			grade,
			// Note sur 10 des écrans existants : la même note, sur 10
			score: grade / 2,
			time_spent: Math.round(input.timeSpent)
		})
		.eq('id', attemptId)
		.eq('user_id', userId)
		.is('completed_at', null)
		.select('id');

	if (closeError || !closed || closed.length === 0) {
		// Envoi concurrent déjà passé (0 ligne) ou panne : on retire NOS réponses
		if (insertedIds.length > 0) await service.from('test_answers').delete().in('id', insertedIds);
		if (closeError) {
			console.error('[evaluation-attempts] Séance non close :', closeError);
			throw new EvaluationError(500, "Ta copie n'a pas pu être enregistrée, réessaie");
		}
		throw new EvaluationError(409, 'Cette tentative est déjà terminée');
	}

	if (!late) {
		// Q39 : le verdict du SERVEUR alimente le SRS (révision corrigée par
		// l'application : ni meilleur-du-jour ni auto-évaluation, ADR 0016)
		await recordSeriesReviews(
			userClient,
			userId,
			corrected.map((q, index) => ({
				templateId: questions[index].stored.template_id,
				success: q.isCorrect,
				selfAssessed: false
			})),
			{ logLabel: '[evaluation-attempts]' }
		);
		try {
			await addBuddyXpFromTest(
				userClient,
				userId,
				corrected.map((q) => ({ isCorrect: q.isCorrect, theme: undefined }))
			);
		} catch (xpError) {
			console.error('[evaluation-attempts] XP non attribuée :', xpError);
		}
	}

	return {
		attemptId,
		late,
		grade,
		pointsEarned,
		totalQuestions,
		correctCount,
		questions: corrected
	};
}
