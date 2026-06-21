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

const pointKindSchema = z.enum(['connaissance', 'savoir_faire']);

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
	item_id: z.string().uuid(),
	name: nameSchema,
	display_order: displayOrderSchema.optional(),
	kind: pointKindSchema.nullable().optional()
});

export const updatePointSchema = z
	.object({
		name: nameSchema.optional(),
		display_order: displayOrderSchema.optional(),
		kind: pointKindSchema.nullable().optional(),
		// soft-archive toggle: true → set archived_at = now(), false → clear
		archived: z.boolean().optional()
	})
	.refine(
		(d) =>
			d.name !== undefined ||
			d.display_order !== undefined ||
			d.kind !== undefined ||
			d.archived !== undefined,
		{ message: 'Au moins un champ à mettre à jour' }
	);

// ---------------------------------------------------------------------------
// Query-param schemas (GET filters)
// ---------------------------------------------------------------------------

export const themeListQuerySchema = z.object({
	grade: gradeCodeSchema
});

export const itemListQuerySchema = z.object({
	theme_id: z.string().uuid()
});

export const pointListQuerySchema = z.object({
	item_id: z.string().uuid()
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
