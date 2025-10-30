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
 * Schema for previewing a template with data substitution
 * POST /api/messages/templates/[id]/preview
 */
export const previewTemplateSchema = z.object({
	data: z
		.record(
			z.string(),
			z.union([z.string().max(1000, 'Valeur trop longue (max 1000 caractères)'), z.number()])
		)
		.refine((obj) => Object.keys(obj).length <= 50, {
			message: 'Trop de variables (max 50)'
		})
		.optional()
});

/**
 * Schema for duplicating a template
 * POST /api/messages/templates/[id]/duplicate
 */
export const duplicateTemplateSchema = z.object({
	new_title: z.string().trim().max(200, 'Titre trop long (max 200 caractères)').optional(),
	class_id: uuidSchema.optional()
});

/**
 * Schema for approving/rejecting a template (admin only)
 * POST /api/messages/templates/[id]/approve
 */
export const approveTemplateSchema = z.object({
	action: z.enum(['approve', 'reject']),
	notes: z.string().max(1000, 'Notes trop longues (max 1000 caractères)').optional()
});

/**
 * Schema for template statistics query parameters
 * GET /api/messages/templates/stats
 */
export const templateStatsQuerySchema = z.object({
	template_id: uuidSchema.optional(),
	period: z.enum(['week', 'month', 'year', 'all']).default('month')
});
