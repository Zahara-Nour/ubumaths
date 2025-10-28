/**
 * Message templates validation schemas
 */

import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

/**
 * Schema for creating a message template
 */
export const createMessageTemplateSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long (max 200 caractères)'),
	description: z.string().max(500).optional(),
	subject_template: z
		.string()
		.trim()
		.min(1, 'Sujet requis')
		.max(200, 'Sujet trop long (max 200 caractères)'),
	body_template: z
		.string()
		.min(1, 'Contenu requis')
		.max(10000, 'Contenu trop long (max 10000 caractères)'),
	trigger_type: z.enum([
		'manual',
		'assignment_created',
		'assignment_due',
		'achievement_unlocked',
		'weekly_summary'
	]),
	trigger_config: z.record(z.string(), z.any()).optional().default({}),
	scope: z.enum(['system', 'class']),
	class_id: uuidSchema.optional().nullable(),
	variables: z.array(z.string()).max(20, 'Trop de variables (max 20)').optional().default([]),
	is_active: z.boolean().default(true)
});

/**
 * Schema for updating a message template (all fields optional)
 */
export const updateMessageTemplateSchema = createMessageTemplateSchema.partial();

/**
 * Schema for listing message templates
 */
export const listTemplatesQuerySchema = paginationSchema.extend({
	scope: z.enum(['system', 'class']).optional(),
	trigger_type: z.string().optional(),
	class_id: uuidSchema.optional(),
	is_active: z.coerce.boolean().optional()
});

/**
 * Schema for toggling favorite status
 */
export const toggleFavoriteSchema = z.object({
	templateId: uuidSchema,
	isFavorite: z.boolean()
});

/**
 * Schema for tracking template usage
 */
export const trackTemplateUsageSchema = z.object({
	templateId: uuidSchema,
	messageId: uuidSchema
});

/**
 * Schema for searching templates
 */
export const searchTemplatesSchema = z.object({
	query: z.string().trim().min(1).max(200),
	scope: z.enum(['system', 'class']).optional(),
	limit: z.coerce.number().int().positive().max(50).default(20)
});

/**
 * Schema for template match endpoint
 */
export const templateMatchSchema = z.object({
	subject: z.string().max(200).optional(),
	content: z.string().max(1000).optional(),
	limit: z.coerce.number().int().positive().max(10).default(5)
});

/**
 * Schema for duplicating a template
 */
export const duplicateTemplateSchema = z.object({
	title: z.string().trim().min(1).max(200).optional()
});

/**
 * Schema for approving a template (admin only)
 */
export const approveTemplateSchema = z.object({
	approved: z.boolean()
});
