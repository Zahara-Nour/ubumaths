/**
 * Zod validation — Curriculum tracking (suivi du programme)
 * =========================================================
 *
 * Referential tree: Thème → Item → Point. All inputs validated here.
 * Mirrors the DB constraints in migration 20260621100000_curriculum_tracking.sql.
 */

import { z } from 'zod';
import { gradeCodeSchema } from './grades';

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

const nameSchema = z
	.string()
	.trim()
	.min(1, 'Le nom ne peut pas être vide')
	.max(200, 'Le nom ne peut pas dépasser 200 caractères');

const displayOrderSchema = z.number().int().min(0).max(100000);

const pointKindSchema = z.enum(['connaissance', 'savoir_faire', 'demonstration']);
const regimeAcquisitionSchema = z.enum(['fluence', 'diversite']);
const exigenceSchema = z.enum(['attendu', 'approfondissement']);
const rangSchema = z.number().int().min(1).max(4);

// ---------------------------------------------------------------------------
// Thème (level 1)
// ---------------------------------------------------------------------------

export const createThemeSchema = z.object({
	grade: gradeCodeSchema,
	name: nameSchema,
	display_order: displayOrderSchema.optional()
});

export const updateThemeSchema = z
	.object({
		name: nameSchema.optional(),
		display_order: displayOrderSchema.optional()
	})
	.refine((d) => d.name !== undefined || d.display_order !== undefined, {
		message: 'Au moins un champ à mettre à jour'
	});

// ---------------------------------------------------------------------------
// Item (level 2)
// ---------------------------------------------------------------------------

export const createItemSchema = z.object({
	theme_id: z.string().uuid(),
	name: nameSchema,
	display_order: displayOrderSchema.optional()
});

export const updateItemSchema = z
	.object({
		name: nameSchema.optional(),
		display_order: displayOrderSchema.optional()
	})
	.refine((d) => d.name !== undefined || d.display_order !== undefined, {
		message: 'Au moins un champ à mettre à jour'
	});

// ---------------------------------------------------------------------------
// Point (level 3, tracking grain)
// ---------------------------------------------------------------------------

export const createPointSchema = z.object({
	objective_id: z.string().uuid(),
	name: nameSchema,
	display_order: displayOrderSchema.optional(),
	// `kind` est obligatoire depuis la fusion des référentiels : c'est lui qui
	// garantit que la liste des connaissances d'un niveau est toujours complète.
	kind: pointKindSchema,
	regime_acquisition: regimeAcquisitionSchema.optional(),
	exigence: exigenceSchema.optional(),
	rang: rangSchema.nullable().optional()
});

export const updatePointSchema = z
	.object({
		// Déplacer un point sous un autre objectif — y compris d'un thème à
		// l'autre. Le point garde son id et son code : ses tags d'exercices, sa
		// couverture et l'acquisition des élèves suivent le déplacement.
		objective_id: z.string().uuid().optional(),
		name: nameSchema.optional(),
		display_order: displayOrderSchema.optional(),
		kind: pointKindSchema.optional(),
		regime_acquisition: regimeAcquisitionSchema.optional(),
		exigence: exigenceSchema.optional(),
		rang: rangSchema.nullable().optional(),
		// soft-archive toggle: true → set archived_at = now(), false → clear
		archived: z.boolean().optional()
	})
	.refine((d) => Object.values(d).some((v) => v !== undefined), {
		message: 'Au moins un champ à mettre à jour'
	});

/**
 * Réordonnancement d'un objectif entier, en une requête.
 *
 * La liste doit couvrir exactement les points de l'objectif — la fonction PG
 * `reorder_curriculum_points` refuse un sous-ensemble, qui laisserait une partie
 * des positions sur leurs anciennes valeurs. Les points archivés en font partie :
 * l'UI les masque, elle ne les sort pas de l'objectif.
 */
export const reorderPointsSchema = z.object({
	objective_id: z.string().uuid(),
	point_ids: z
		.array(z.string().uuid())
		.min(1, 'Aucun point à réordonner')
		.max(500, 'Trop de points pour un seul objectif')
});

// ---------------------------------------------------------------------------
// Query-param schemas (GET filters)
// ---------------------------------------------------------------------------

export const themeListQuerySchema = z.object({
	grade: gradeCodeSchema
});

export const objectiveListQuerySchema = z.object({
	theme_id: z.string().uuid()
});

export const pointListQuerySchema = z.object({
	objective_id: z.string().uuid()
});

// ---------------------------------------------------------------------------
// Inferred input types
// ---------------------------------------------------------------------------

export type CreateThemeInput = z.infer<typeof createThemeSchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type CreatePointInput = z.infer<typeof createPointSchema>;
export type UpdatePointInput = z.infer<typeof updatePointSchema>;
export type ReorderPointsInput = z.infer<typeof reorderPointsSchema>;

// ---------------------------------------------------------------------------
// Brique 2 — Tagging des exercices & alimentation (cahier de texte)
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid();

/** Tag / untag a system exercise with a curriculum point. */
export const exerciseTagSchema = z.object({
	exercise_id: uuidSchema,
	point_id: uuidSchema
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

/** Add an activity to a cahier de texte entry (3 kinds). */
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
