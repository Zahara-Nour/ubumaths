/**
 * Tags Validation Schemas
 * =======================
 *
 * Zod schemas for tag-related API operations.
 */

import { z } from 'zod';

// ============================================================================
// CREATE TAG
// ============================================================================

/**
 * Schema for creating a new tag
 */
export const createTagSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Le nom du tag est requis')
		.max(50, 'Le nom du tag ne peut pas dépasser 50 caractères')
		.regex(
			/^[a-zA-ZÀ-ÿ0-9\s\-']+$/,
			'Le nom du tag ne peut contenir que des lettres, chiffres, espaces, tirets et apostrophes'
		)
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

/**
 * Validate create tag request body
 */
export function validateCreateTag(data: unknown) {
	return createTagSchema.safeParse(data);
}

// ============================================================================
// TAG RESPONSE
// ============================================================================

/**
 * Schema for a single tag response
 */
export const tagSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	created_by: z.string().uuid().nullable(),
	created_at: z.string(),
	/**
	 * Renseigné seulement quand `GET /api/tags?kind=…` précise un type : indique
	 * que ce tag est DÉJÀ employé sur ce type de ressource.
	 *
	 * Sert à ordonner les suggestions, jamais à restreindre : un tag « maths »
	 * reste posable sur un exercice Python, il est simplement plus bas dans la
	 * liste. Le catalogue, lui, demeure unique — c'est ce qui permet à une
	 * recherche par `dérivée` de traverser exercices et fiches.
	 */
	used_on_kind: z.boolean().optional()
});

export type Tag = z.infer<typeof tagSchema>;

/**
 * Schema for list tags response
 */
export const tagListResponseSchema = z.object({
	tags: z.array(tagSchema)
});

/**
 * Schema for create tag response
 */
export const createTagResponseSchema = tagSchema;
