/**
 * Test system validation schemas
 * Validates test results, sessions, and answers
 */

import { z } from 'zod';
import { isCourseCard } from '$lib/questions/types';
import { seriesItemsSchema } from '$lib/validation/series';
import { uuidSchema } from './common';

// ============================================================================
// BORNES
// ============================================================================

/** Une journée : au-delà, un temps (en secondes) est forcément fabriqué */
const MAX_SECONDS = 86_400;

/** Longueur maximale d'un énoncé résolu (le plus long en production : ~2 000) */
const MAX_STATEMENT_LENGTH = 20_000;

/** Longueur maximale d'une réponse élève (une case, en LaTeX) */
const MAX_ANSWER_VALUE_LENGTH = 2_000;

/** Nombre maximal de cases / choix dans une réponse élève */
const MAX_ANSWER_PARTS = 50;

// ============================================================================
// QUESTION INSTANCE SCHEMA
// ============================================================================

/**
 * Instance de question, forme RÉELLE produite par `generateInstance`
 * (`QuestionInstance`, `$lib/questions/types.ts`).
 *
 * Ne retient que ce que la route exploite : `templateId` (référentiel, FSRS,
 * paquet Programme) et ce qu'elle archive dans `test_answers.question_instance`
 * (énoncé vu par l'élève + niveau + graine). Tout autre champ est RETIRÉ par Zod
 * (objet non strict) : ni `blanks`, ni `choices`, ni `correction` n'atteignent
 * la base. Aucun code ne relit `question_instance` à ce jour.
 *
 * Seuls `templateId` et `statement` sont exigés : un champ secondaire mal typé
 * ne doit pas faire perdre toute la session à l'élève.
 */
const questionInstanceSchema = z.object({
	templateId: uuidSchema,
	statement: z.string().max(MAX_STATEMENT_LENGTH, 'Statement too long'),
	level: z.number().int().min(0).max(100).nullable().optional(),
	generatedAt: z.string().max(64).optional(),
	selectedVariationIndex: z.number().int().min(0).max(1000).optional(),
	// Graine de génération (Q20) : archivée pour que le serveur puisse régénérer
	// la copie de l'élève (ADR 0015). Bornes = `MAX_QUESTION_SEED`.
	seed: z
		.number()
		.int()
		.min(0)
		.max(2 ** 31 - 1)
		.optional(),
	// Marqueur `courseCard` (#617) : sert au contrôle de cohérence des compteurs ;
	// la nature « carte » faisant foi est relue en base. Objet non strict : le
	// reste d'`options` est retiré et n'est pas archivé.
	options: z.object({ courseCard: z.boolean().optional() }).nullable().optional()
});

// ============================================================================
// ANSWER DATA SCHEMA
// ============================================================================

const answerValueSchema = z.union([
	z.string().max(MAX_ANSWER_VALUE_LENGTH, 'Answer too long'),
	z.number().finite(),
	z.array(z.string().max(MAX_ANSWER_VALUE_LENGTH)).max(MAX_ANSWER_PARTS, 'Too many answer parts'),
	z.array(z.number().finite()).max(MAX_ANSWER_PARTS, 'Too many answer parts')
]);

/**
 * Réponse de l'élève, forme `AnswerData` (`$lib/types/question-display.ts`)
 * émise par `QuestionCard`.
 *
 * - `value` absente : QCM validé sans choix (`selectedChoices[0]` indéfini,
 *   effacé par `JSON.stringify`).
 * - `attempts` = 0 : temps écoulé sans réponse (`TestInteractive`).
 */
const answerDataSchema = z.object({
	value: answerValueSchema.optional(),
	isCorrect: z.boolean(),
	timeSpent: z.number().min(0).max(MAX_SECONDS),
	attempts: z.number().int().min(0).max(100),
	submittedAt: z.string().max(64).optional()
});

// ============================================================================
// TEST ANSWER RESULT SCHEMA
// ============================================================================

/**
 * Test answer result schema (individual answer in test results)
 */
const testAnswerResultSchema = z.object({
	index: z.number().int().nonnegative('Index must be non-negative').max(499),
	instance: questionInstanceSchema,
	// `null` toléré : la route écrit `userAnswer || null`
	userAnswer: answerDataSchema.nullable().optional(),
	isCorrect: z.boolean(),
	timeSpent: z.number().nonnegative('Time spent must be non-negative').max(MAX_SECONDS).optional(),
	// 0 = temps écoulé sans réponse (`TestInteractive.handleTimerComplete`)
	attempts: z.number().int().min(0).max(100).optional()
});

// ============================================================================
// TEST RESULT SCHEMA
// ============================================================================

/**
 * Test result schema (complete test results)
 */
const testResultSchema = z.object({
	sessionId: uuidSchema.optional(),
	// `flash` : forme « Flash-cards », score auto-évalué par l'élève (2026-09-30)
	// `typing` : forme « Saisie », réponses corrigées par l'appli, sans chrono (2026-11-11)
	mode: z.enum(['display', 'interactive', 'course', 'flash', 'typing']),
	score: z.number().min(0).max(10, 'Score must be between 0 and 10'),
	scorePercentage: z.number().min(0).max(100, 'Score percentage must be between 0 and 100'),
	totalQuestions: z.number().int().positive('Total questions must be positive').max(500),
	correctAnswers: z.number().int().nonnegative('Correct answers must be non-negative').max(500),
	// Cartes de cours révisées (hors score)
	reviewedCards: z.number().int().nonnegative().max(500).optional(),
	timeSpent: z.number().nonnegative('Time spent must be non-negative').max(MAX_SECONDS),
	averageTime: z.number().nonnegative('Average time must be non-negative').max(MAX_SECONDS),
	answers: z.array(testAnswerResultSchema).max(500, 'Maximum 500 answers'),
	completedAt: z.string().datetime('Invalid completion datetime')
});

// ============================================================================
// SAVE TEST SCHEMA
// ============================================================================

/**
 * Schema for the end of a free series (POST /api/tests/save : gain du Palotin)
 * Résultat, composition jouée (`items`, ADR 0035) et assignation éventuelle.
 */
export const saveTestSchema = z
	.object({
		result: testResultSchema,
		items: seriesItemsSchema,
		assignmentId: uuidSchema.optional(),
		// Durée de la série (ms, horloge du client) : le serveur en tire son début,
		// sans dépendre de l'heure du client (question longtemps ratée, B3 `regularite`).
		// Mal formée → ignorée : la fête manque, jamais le gain (pas de 400)
		seriesElapsedMs: z
			.number()
			.int()
			.min(0)
			.max(24 * 3600 * 1000)
			.optional()
			.catch(undefined)
	})
	.refine(
		(data) => {
			// Validate that answers count matches totalQuestions
			return data.result.answers.length === data.result.totalQuestions;
		},
		{
			message: 'Answers count must match totalQuestions'
		}
	)
	.refine(
		(data) => {
			// Validate that correctAnswers count matches actual correct answers
			// Les cartes de cours (auto-évaluées) ne comptent pas (décision 2026-09-28)
			const actualCorrect = data.result.answers.filter(
				(a) => a.isCorrect && !isCourseCard(a.instance)
			).length;
			return actualCorrect === data.result.correctAnswers;
		},
		{
			message: 'Correct answers count mismatch'
		}
	)
	.refine(
		// Flash-cards et Saisie : jamais la forme d'un contrôle
		(data) =>
			!((data.result.mode === 'flash' || data.result.mode === 'typing') && data.assignmentId),
		{
			message: 'A flash or typing session cannot be linked to an assignment',
			path: ['assignmentId']
		}
	);

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate save test request body
 */
export function validateSaveTest(data: unknown) {
	return saveTestSchema.safeParse(data);
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Save test response schema
 */
export const saveTestResponseSchema = z.object({
	sessionId: uuidSchema
});
