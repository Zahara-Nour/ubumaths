/**
 * Riddles validation schemas
 */

import { z } from 'zod';
import { formDataTransforms, difficultySchema } from './common';

/**
 * Schema for riddle answer submission
 */
export const riddleAnswerSchema = z.object({
	answer: z.union([z.string().max(1000), z.number().finite(), z.boolean()])
});

// ============================================================================
// RÉPONSE ATTENDUE (correction automatique)
// ============================================================================

const QCM_MAX_CHOICES = 20;
const ANSWER_MAX_LENGTH = 1000;

/** Indice d'un choix de QCM : nombre, ou texte de chiffres (l'éditeur écrit les deux). */
const qcmIndexSchema = z.union([
	z.number().int().min(0),
	z.string().regex(/^\d+$/, 'Indice de choix invalide').transform(Number)
]);

const expectedTextSchema = z
	.string()
	.trim()
	.min(1, 'La réponse attendue est vide')
	.max(ANSWER_MAX_LENGTH, `Réponse attendue trop longue (max ${ANSWER_MAX_LENGTH})`);

/**
 * Forme de `riddle_solutions.answer`, telle que `validateRiddleAnswer` la lit. Une
 * valeur vide ou un QCM dont la bonne réponse n'est pas un choix ferait compter faux
 * toutes les réponses des élèves : refusé dès l'enregistrement.
 */
export const riddleAnswerConfigSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('numerical'),
		value: z.number({ message: 'La réponse attendue doit être un nombre' }).finite(),
		options: z.object({ tolerance: z.number().finite().min(0).max(1e9).optional() }).optional()
	}),
	z.object({
		type: z.literal('text'),
		value: expectedTextSchema,
		options: z.object({ caseSensitive: z.boolean().optional() }).optional()
	}),
	z.object({
		type: z.literal('math'),
		value: expectedTextSchema,
		options: z.object({ exactMatch: z.boolean().optional() }).optional()
	}),
	z
		.object({
			type: z.literal('qcm'),
			value: z.union([qcmIndexSchema, z.array(qcmIndexSchema).min(1).max(QCM_MAX_CHOICES)]),
			options: z.object({
				choices: z
					.array(z.string().trim().min(1).max(ANSWER_MAX_LENGTH))
					.min(2, 'Un QCM demande au moins deux choix')
					.max(QCM_MAX_CHOICES),
				multipleAnswers: z.boolean().optional()
			})
		})
		.refine(
			({ value, options }) =>
				(Array.isArray(value) ? value : [value]).every((i) => i < options.choices.length),
			{ message: 'La bonne réponse du QCM doit être l’un des choix', path: ['value'] }
		)
		// L'élève ne coche qu'un choix sans `multipleAnswers` : plusieurs bonnes réponses
		// attendues, il ne pourrait jamais répondre juste.
		.refine(
			({ value, options }) =>
				options.multipleAnswers === true || !Array.isArray(value) || value.length === 1,
			{
				message: 'Plusieurs bonnes réponses demandent un QCM à réponses multiples',
				path: ['value']
			}
		)
]);

/**
 * Lit le champ `answer` du formulaire (JSON). `null` = validation à la main.
 * Rend la valeur validée : clés inconnues retirées, indices de QCM en nombres (forme
 * que l'éditeur relit ; la correction automatique compare les indices en texte).
 */
export function parseRiddleAnswerField(
	raw: string | null | undefined
): { ok: true; answer: unknown } | { ok: false; message: string } {
	if (!raw || raw === 'null') return { ok: true, answer: null };

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { ok: false, message: 'Format JSON invalide pour la réponse' };
	}
	if (parsed === null) return { ok: true, answer: null };

	const validation = riddleAnswerConfigSchema.safeParse(parsed);
	if (!validation.success) {
		return { ok: false, message: validation.error.issues[0].message };
	}
	return { ok: true, answer: validation.data };
}

// ============================================================================
// RIDDLE FORM SCHEMAS
// ============================================================================

/**
 * Create/Update riddle form schema
 */
export const riddleFormSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long (max 200)'),
	// Absents quand ils sont vides : les pages ne les envoient pas.
	genre: formDataTransforms.optionalString.nullable().optional(),
	difficulty: formDataTransforms.int.pipe(difficultySchema),
	statement: z.string().min(1, 'Énoncé requis').max(10000, 'Énoncé trop long (max 10000)'),
	correction: z
		.string()
		.min(1, 'Correction requise')
		.max(10000, 'Correction trop longue (max 10000)'),
	image_url: formDataTransforms.optionalString.nullable().optional(),
	answer: z.string().nullable().optional(), // JSON string, parsed separately
	status: z.enum(['draft', 'published'])
});

/**
 * Set riddle of the day schema
 */
export const riddleOfTheDaySchema = z.object({
	riddle_id: formDataTransforms.uuid
});

/**
 * Validate riddle attempt schema
 */
export const validateRiddleAttemptSchema = z.object({
	attempt_id: formDataTransforms.uuid,
	is_valid: formDataTransforms.boolean,
	points_awarded: formDataTransforms.int.pipe(z.number().int().min(0).max(100)),
	teacher_comment: formDataTransforms.optionalString.nullable()
});
