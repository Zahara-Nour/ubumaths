/**
 * Zod validation — Curriculum tracking (suivi du programme)
 * =========================================================
 *
 * Points de programme (génération neuve, ADR 0020), tags d'exercices, cahier
 * de texte. L'arbre thème → objectif ne s'édite plus (C5, étape 3) : un point
 * se crée par migration (le BO fait foi), et seuls son libellé et son
 * archivage se modifient.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

const displayOrderSchema = z.number().int().min(0).max(100000);

// ---------------------------------------------------------------------------
// Point de programme — renommer, archiver
// ---------------------------------------------------------------------------

/**
 * Libellé d'un point. Borne à 500 : les libellés du BO montent à près de 400
 * caractères (36 points neufs dépassent 200, mesuré le 2026-10-10) ; la borne
 * de 200 des anciens noms refuserait de les réenregistrer tels quels.
 */
const pointNameSchema = z
	.string()
	.trim()
	.min(1, 'Le libellé ne peut pas être vide')
	.max(500, 'Le libellé ne peut pas dépasser 500 caractères');

/**
 * PATCH d'un point : `name` et `archived`, rien d’autre. Un objet strict refuse les
 * champs retirés (code, nature, exigence, rang, rattachement, ordre) au lieu de
 * les ignorer en silence.
 */
export const updateProgrammePointSchema = z
	.strictObject(
		{
			name: pointNameSchema.optional(),
			// true → archived_at = now() ; false → restauré
			archived: z.boolean().optional()
		},
		{ error: 'Seuls le libellé et l’archivage d’un point se modifient' }
	)
	.refine((d) => d.name !== undefined || d.archived !== undefined, {
		message: 'Au moins un champ à mettre à jour'
	});

export type UpdateProgrammePointInput = z.infer<typeof updateProgrammePointSchema>;
export type TemplateTagInput = z.infer<typeof templateTagSchema>;

// ---------------------------------------------------------------------------
// Brique 2 — Tagging des exercices & alimentation (cahier de texte)
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid();

/** Tag / untag a system exercise with a curriculum point. */
export const exerciseTagSchema = z.object({
	exercise_id: uuidSchema,
	point_id: uuidSchema
});

/**
 * Tag / untag d'une question (template) avec un point de programme.
 *
 * Pas de contrainte de niveau : on n'exige pas que le point appartienne à un
 * `grades[]` du template. Une question de seconde peut légitimement valider un
 * point de 1ʳᵉ, et l'inverse pour de la remédiation. L'UI ne propose que les
 * niveaux déclarés ; l'API ne l'impose pas.
 */
export const templateTagSchema = z.object({
	template_id: uuidSchema,
	point_id: uuidSchema
});

export const templateTagListQuerySchema = z.object({
	template_id: uuidSchema
});

export const exerciseTagListQuerySchema = z.object({
	exercise_id: uuidSchema
});

/** Free-form textbook reference (manuel scolaire). */
const textbookRefSchema = z
	.object({
		label: z.string().trim().min(1, 'Référence requise').max(200),
		manuel: z.string().trim().max(200).optional(),
		page: z.string().trim().max(50).optional(),
		numero: z.string().trim().max(50).optional()
	})
	.strict();

/** Add an activity to a cahier de texte entry (5 kinds). */
export const createActivitySchema = z
	.discriminatedUnion('kind', [
		z.object({
			entry_id: uuidSchema,
			kind: z.literal('exercise'),
			exercise_id: uuidSchema,
			display_order: displayOrderSchema.optional()
		}),
		z.object({
			entry_id: uuidSchema,
			kind: z.literal('course'),
			chapter_id: uuidSchema.optional(),
			label: z.string().trim().min(1).max(200).optional(),
			display_order: displayOrderSchema.optional()
		}),
		z.object({
			entry_id: uuidSchema,
			kind: z.literal('textbook'),
			textbook_ref: textbookRefSchema,
			display_order: displayOrderSchema.optional()
		}),
		z.object({
			entry_id: uuidSchema,
			kind: z.literal('question'),
			question_template_id: uuidSchema,
			display_order: displayOrderSchema.optional()
		}),
		z.object({
			entry_id: uuidSchema,
			kind: z.literal('assessment'),
			// Q29 : une activité « évaluation » pointe vers l'ÉVALUATION
			evaluation_id: uuidSchema,
			display_order: displayOrderSchema.optional()
		})
	])
	.superRefine((d, ctx) => {
		if (d.kind === 'course' && d.chapter_id === undefined && d.label === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Un point de cours requiert un chapitre ou un libellé'
			});
		}
	});

export const activityListQuerySchema = z.object({
	entry_id: uuidSchema
});

/** Manually add / remove a curriculum point on an entry (coverage). */
export const coveragePointSchema = z.object({
	entry_id: uuidSchema,
	point_id: uuidSchema
});

export const coverageListQuerySchema = z.object({
	entry_id: uuidSchema
});

export const coveragePointQuerySchema = z.object({
	entry_id: uuidSchema,
	point_id: uuidSchema
});

export type ExerciseTagInput = z.infer<typeof exerciseTagSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type CoveragePointInput = z.infer<typeof coveragePointSchema>;
