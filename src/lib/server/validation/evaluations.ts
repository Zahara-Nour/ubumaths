/**
 * Séries et évaluations : schémas Zod (chantier 4).
 *
 * Les bornes de la composition (catégories) sont partagées avec le navigateur :
 * `$lib/validation/series`.
 */

import { z } from 'zod';
import { gradeSchema, uuidSchema } from './common';
import { savedSeriesCategoriesSchema } from '$lib/validation/series';
import {
	MAX_ANSWER_LENGTH,
	MAX_ANSWER_PARTS,
	MAX_ANSWER_SECONDS as MAX_SECONDS,
	MAX_ATTEMPT_ANSWERS
} from '$lib/questions/submission';
import {
	COURSE_TIME_LIMIT_MAX_MINUTES,
	COURSE_TIME_LIMIT_MIN_MINUTES
} from '$lib/types/evaluation';

// ============================================================================
// SÉRIES (B11, B12)
// ============================================================================

const seriesTitleSchema = z
	.string({ error: 'Titre requis' })
	.trim()
	.min(1, 'Titre requis')
	.max(200, 'Titre trop long (200 caractères au plus)');

const seriesDescriptionSchema = z
	.string()
	.trim()
	.max(2000, 'Description trop longue (2000 caractères au plus)')
	.nullable()
	.optional()
	// Absente : on ne touche pas à la description ; vide : effacée
	.transform((value) => (value === undefined ? undefined : value || null));

/** Enregistrer le panier comme série (B11) */
export const createSeriesSchema = z.object({
	title: seriesTitleSchema,
	grade: gradeSchema,
	description: seriesDescriptionSchema,
	categories: savedSeriesCategoriesSchema
});

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;

/** Modifier une série : au moins un champ */
export const updateSeriesSchema = z
	.object({
		title: seriesTitleSchema.optional(),
		grade: gradeSchema.optional(),
		description: seriesDescriptionSchema,
		categories: savedSeriesCategoriesSchema.optional()
	})
	.refine(
		(data) => data.title !== undefined || data.grade !== undefined || data.categories !== undefined,
		{ message: 'Rien à modifier' }
	);

export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>;

// ============================================================================
// ÉVALUATIONS (B13)
// ============================================================================

export const evaluationFormSchema = z.enum(['interactive', 'course'], {
	error: 'Forme inconnue : Entraînement ou Course aux nombres'
});

export const evaluationStatusSchema = z.enum(['draft', 'published', 'archived']);

/**
 * Réglages d'une évaluation (Q30) : une Course aux nombres a un temps limite de
 * 1 à 60 minutes, un Entraînement n'en a aucun. Le temps est reçu en MINUTES et
 * rendu en SECONDES (`time_limit`, colonne de `evaluations`).
 */
export const evaluationSettingsSchema = z
	.object({
		form: evaluationFormSchema,
		time_limit_minutes: z
			.number({ error: 'Temps limite invalide' })
			.int('Temps limite en minutes entières')
			.nullable()
			.optional(),
		max_attempts: z
			.number({ error: 'Nombre de tentatives invalide' })
			.int('Nombre de tentatives entier attendu')
			.min(1, 'Au moins une tentative')
			.max(10, 'Trop de tentatives (10 au plus)')
			.nullable()
			.optional()
			.transform((value) => value ?? null),
		deadline: z.iso
			.datetime({ offset: true, error: 'Date limite invalide' })
			.nullable()
			.optional()
			.transform((value) => value ?? null),
		shuffle_questions: z.boolean().optional().default(true)
	})
	.superRefine((data, ctx) => {
		const minutes = data.time_limit_minutes ?? null;
		if (data.form === 'course') {
			if (minutes === null) {
				ctx.addIssue({
					code: 'custom',
					path: ['time_limit_minutes'],
					message: 'Une Course aux nombres demande un temps limite'
				});
			} else if (
				minutes < COURSE_TIME_LIMIT_MIN_MINUTES ||
				minutes > COURSE_TIME_LIMIT_MAX_MINUTES
			) {
				ctx.addIssue({
					code: 'custom',
					path: ['time_limit_minutes'],
					message: `Le temps limite va de ${COURSE_TIME_LIMIT_MIN_MINUTES} à ${COURSE_TIME_LIMIT_MAX_MINUTES} minutes`
				});
			}
		} else if (minutes !== null) {
			ctx.addIssue({
				code: 'custom',
				path: ['time_limit_minutes'],
				message: "Un Entraînement n'a pas de temps limite"
			});
		}
	})
	.transform(({ time_limit_minutes, ...rest }) => ({
		...rest,
		time_limit: rest.form === 'course' && time_limit_minutes ? time_limit_minutes * 60 : null
	}));

export type EvaluationSettings = z.infer<typeof evaluationSettingsSchema>;

/**
 * Réglages reçus d'un formulaire (`settings` sérialisé en JSON).
 */
export const evaluationSettingsFieldSchema = z
	.string({ error: 'Réglages requis' })
	.min(1, 'Réglages requis')
	.max(5000, 'Réglages trop longs')
	.transform((str, ctx) => {
		try {
			return JSON.parse(str) as unknown;
		} catch {
			ctx.addIssue({ code: 'custom', message: 'Réglages illisibles' });
			return z.NEVER;
		}
	})
	.pipe(evaluationSettingsSchema);

/** Créer une évaluation depuis une série (B13), champs d'un formulaire */
export const createEvaluationFormSchema = z.object({
	series_id: uuidSchema,
	settings: evaluationSettingsFieldSchema,
	status: z.enum(['draft', 'published'], { error: 'Statut invalide' }).default('draft')
});

/** Modifier les réglages d'une évaluation, champs d'un formulaire */
export const updateEvaluationFormSchema = z.object({
	settings: evaluationSettingsFieldSchema
});

// ============================================================================
// ASSIGNATIONS
// ============================================================================

export const assignEvaluationSchema = z
	.object({
		class_ids: z.array(z.string().uuid('Classe invalide')).max(50, 'Trop de classes').optional(),
		student_ids: z.array(z.string().uuid('Élève invalide')).max(200, "Trop d'élèves").optional()
	})
	.refine(
		(data) =>
			(data.class_ids && data.class_ids.length > 0) ||
			(data.student_ids && data.student_ids.length > 0),
		{ message: 'Choisis au moins une classe ou un élève' }
	);

/** Liste d'identifiants de classes sérialisée par le formulaire d'assignation */
export const classIdsFieldSchema = z
	.string({ error: 'Aucune classe sélectionnée' })
	.min(1, 'Aucune classe sélectionnée')
	.max(5000)
	.transform((str, ctx) => {
		try {
			return JSON.parse(str) as unknown;
		} catch {
			ctx.addIssue({ code: 'custom', message: 'Classes illisibles' });
			return z.NEVER;
		}
	})
	.pipe(z.array(uuidSchema).min(1, 'Aucune classe sélectionnée').max(50, 'Trop de classes'));

// ============================================================================
// ENVOI D'UNE TENTATIVE (chantier 5, C10)
// ============================================================================

// Bornes partagées avec la page, qui tronque avant d'envoyer ($lib/questions/submission)
const answerPartSchema = z.string().max(MAX_ANSWER_LENGTH, 'Réponse trop longue');

/**
 * Réponse à UNE question : cases (valeurs, le LaTeX tapé) ou positions cochées d'un
 * QCM. Aucun verdict n'est lu : tout champ `isCorrect`, `points`, `score`… est
 * retiré par Zod (objet non strict) et le serveur corrige lui-même.
 */
const submittedAnswerSchema = z.object({
	position: z
		.number()
		.int()
		.min(0)
		.max(MAX_ATTEMPT_ANSWERS - 1),
	values: z.array(answerPartSchema).max(MAX_ANSWER_PARTS).optional(),
	choices: z
		.array(
			z
				.number()
				.int()
				.min(0)
				.max(MAX_ANSWER_PARTS - 1)
		)
		.max(MAX_ANSWER_PARTS)
		.optional(),
	timeSpent: z.number().int().min(0).max(MAX_SECONDS).optional()
});

export const submitAttemptSchema = z.object({
	answers: z
		.array(submittedAnswerSchema)
		.max(MAX_ATTEMPT_ANSWERS, 'Trop de réponses')
		.refine(
			(answers) => new Set(answers.map((a) => a.position)).size === answers.length,
			'Une question ne peut recevoir qu’une réponse'
		)
	// Pas de durée totale : le serveur la mesure (démarrage → envoi)
});
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
