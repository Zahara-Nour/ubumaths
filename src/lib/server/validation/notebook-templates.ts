/**
 * Zod schemas for notebook template operations.
 *
 * Templates are notebooks with `is_template = true`. They can be cloned by
 * any teacher who can see them (own + public). Cloning is the only template-
 * specific mutation; everything else (update, delete) reuses the regular
 * notebook endpoints.
 *
 * Companion to `notebooks.ts` — kept separate so the template-specific
 * payload shapes don't leak into the editor's PUT validation surface.
 */

import { z } from 'zod';

export const TEMPLATE_CATEGORY_MAX = 50;
export const TEMPLATE_TITLE_MAX = 200;
export const TEMPLATE_DESCRIPTION_MAX = 1000;

/**
 * Body for POST /api/python-notebooks/from-template/[templateId].
 * All fields optional — the clone defaults to copying the template's
 * title/description verbatim. The user can override on the client side
 * via the clone dialog if we add one later.
 */
export const cloneTemplateSchema = z.object({
	title: z.string().min(1).max(TEMPLATE_TITLE_MAX).trim().optional(),
	description: z.string().max(TEMPLATE_DESCRIPTION_MAX).trim().nullable().optional()
});

/**
 * Body for POST /api/python-notebooks/[id]/save-as-template.
 * Creates a NEW notebook (the source notebook is unchanged) marked
 * `is_template = true`.
 *
 * `is_public` is intentionally not defaulted true — sharing must be opt-in
 * to avoid accidental publication of in-progress work.
 */
export const saveAsTemplateSchema = z.object({
	title: z.string().min(1).max(TEMPLATE_TITLE_MAX).trim(),
	description: z.string().max(TEMPLATE_DESCRIPTION_MAX).trim().nullable().optional(),
	category: z.string().max(TEMPLATE_CATEGORY_MAX).trim().nullable().optional(),
	is_public: z.boolean().optional().default(false)
});

export type CloneTemplateBody = z.infer<typeof cloneTemplateSchema>;
export type SaveAsTemplateBody = z.infer<typeof saveAsTemplateSchema>;
