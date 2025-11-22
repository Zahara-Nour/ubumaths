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
	created_at: z.string()
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
