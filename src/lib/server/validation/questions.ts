/**
 * Questions validation schemas
 *
 * Building block schemas (displayOptionsSchema, variableSchema, correctionSchema,
 * choiceSchema, blankSchema, etc.) are imported from the single source of truth:
 * $lib/questions/template-schema.ts
 */

import { z } from 'zod';
import { paginationSchema, gradeSchema } from './common';
import {
	requiredFormSchema,
	validationRuleSchema,
	correctionSchema,
	displayOptionsSchema,
	variableSchema,
	choiceSchema,
	blankSchema,
	blankDefaultsSchema,
	optionsSchema,
	testSpecSchema
} from '$lib/questions/template-schema';
import { refineAssumptionCollisions } from '$lib/questions/answer-assumptions';
import { genericFunctionNamesSchema } from '$lib/questions/generic-functions';

// Re-export building blocks for downstream consumers (migration-review.ts, index.ts)
export {
	displayOptionsSchema,
	variableSchema,
	correctionSchema,
	choiceSchema,
	blankSchema,
	blankDefaultsSchema,
	optionsSchema,
	validationRuleSchema,
	requiredFormSchema,
	testSpecSchema
} from '$lib/questions/template-schema';

/**
 * Question types
 */
export const questionTypeSchema = z.enum(['multiple_choice', 'fill_in_blanks', 'course_card']);

/**
 * Variation schema for question templates
 */
const variationSchema = z.object({
	statement: z.string().min(1, "L'énoncé est requis"),
	variables: z.array(variableSchema).optional(),
	correctChoiceIndex: z.union([z.string(), z.array(z.string())]).optional(),
	correction: correctionSchema.optional().nullable(),
	blanks: z.array(blankSchema).optional(),
	blankDefaults: blankDefaultsSchema.optional(),
	choices: z.array(choiceSchema).optional(),
	requiredForm: requiredFormSchema.optional(),
	validationRules: z.array(validationRuleSchema).optional(),
	answerFormats: z.record(z.string(), z.string()).optional(),
	conditions: z.array(z.string()).optional()
});

/**
 * Champs d'un modèle de question (création), sans les contrôles croisés
 */
const questionTemplateFieldsSchema = z.object({
	type: questionTypeSchema.optional(),
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long (max 200 caractères)'),
	description: z.string().max(1000).optional().nullable(),
	variations: z
		.array(variationSchema)
		.min(1, 'Au moins une variation requise')
		.max(50, 'Trop de variations (max 50)')
		.optional(),
	exerciseInstruction: z.string().max(500).optional().nullable(),
	shared: z.unknown().optional().nullable(),
	defaultDisplayOptions: displayOptionsSchema.optional().nullable(),
	options: optionsSchema.optional().nullable(),
	grades: z.array(gradeSchema).min(1, 'Au moins un niveau requis'),
	theme: z.string().min(1, 'Thème requis').max(100),
	domain: z.string().min(1, 'Domaine requis').max(100),
	subdomain: z.string().max(100).optional().nullable(),
	level: z.number().int().nonnegative('Le niveau doit être >= 0'),
	status: z.enum(['draft', 'published']).default('published'),
	delay: z.number().int().nonnegative().optional().nullable(),
	multipleAnswers: z.boolean().optional().nullable(),
	testSpecs: z.array(testSpecSchema).optional().nullable()
});

/**
 * `shared` reste un jsonb libre côté route, SAUF `shared.genericFunctions` : la liste
 * atteint le parseur (génération, validation de l'élève) et se valide ici.
 */
function refineSharedGenericFunctions(data: { shared?: unknown }, ctx: z.RefinementCtx): void {
	const shared = data.shared;
	if (typeof shared !== 'object' || shared === null || !('genericFunctions' in shared)) return;
	const result = genericFunctionNamesSchema.safeParse(shared.genericFunctions);
	if (result.success) return;
	for (const issue of result.error.issues) {
		ctx.addIssue({
			code: 'custom',
			message: issue.message,
			path: ['shared', 'genericFunctions', ...issue.path.map(String)]
		});
	}
}

/** `shared.cleanCoefficients` : un booléen, lu par la génération */
function refineSharedCleanCoefficients(data: { shared?: unknown }, ctx: z.RefinementCtx): void {
	const shared = data.shared;
	if (typeof shared !== 'object' || shared === null || !('cleanCoefficients' in shared)) return;
	if (typeof shared.cleanCoefficients === 'boolean') return;
	ctx.addIssue({
		code: 'custom',
		message: '« Nettoyer les coefficients » vaut vrai ou faux',
		path: ['shared', 'cleanCoefficients']
	});
}

/** Contrôles croisés communs à la création et à la mise à jour */
function refineTemplate(
	data: Parameters<typeof refineAssumptionCollisions>[0] & { shared?: unknown },
	ctx: z.RefinementCtx
): void {
	refineAssumptionCollisions(data, ctx);
	refineSharedGenericFunctions(data, ctx);
	refineSharedCleanCoefficients(data, ctx);
}

/**
 * Schema for creating a question template
 *
 * Contrôle croisé : une hypothèse de l'énoncé (`options.answerAssumptions`)
 * ne vise jamais une variable tirée — refusé ici, quel que soit le statut
 * (`validateTemplate` ne tourne qu'à la publication).
 */
export const createQuestionTemplateSchema =
	questionTemplateFieldsSchema.superRefine(refineTemplate);

/**
 * Schema for updating a question template (all fields optional)
 *
 * La collision n'est vérifiable ici qu'avec les variables présentes dans la
 * requête ; la route la revérifie sur le modèle fusionné (base ⊕ requête).
 *
 * `status` sans défaut : avec Zod 4, `.partial()` applique quand même le
 * `.default('published')` → un PUT sans statut PUBLIAIT le modèle. Absent,
 * le statut en base est conservé.
 */
export const updateQuestionTemplateSchema = questionTemplateFieldsSchema
	.partial()
	.extend({ status: z.enum(['draft', 'published']).optional() })
	.superRefine(refineTemplate);

/**
 * Schema for listing question templates
 */
export const listQuestionsQuerySchema = paginationSchema.extend({
	type: questionTypeSchema.optional(),
	grades: z.string().optional(), // comma-separated string
	status: z.enum(['draft', 'published']).optional()
});

/**
 * Schema for generating a question from a template
 */
export const generateQuestionSchema = z.object({
	seed: z.number().int().nonnegative().optional(),
	variationIndex: z.number().int().nonnegative().optional()
});

/**
 * Publication par lot : changer le statut de plusieurs modèles en une requête.
 * Le client envoie des paquets de 50 (`BULK_CLIENT_CHUNK_SIZE`, voir
 * `$lib/questions/bulk-status`) ; 100 laisse la place à un groupe de rivaux
 * d'une même catégorie qui déborde un paquet, jamais coupé en deux.
 */
export const MAX_BULK_TEMPLATE_IDS = 100;

export const bulkTemplateStatusSchema = z.object({
	ids: z
		.array(z.string().uuid('Identifiant de modèle invalide'))
		.min(1, 'Aucun modèle sélectionné')
		.max(MAX_BULK_TEMPLATE_IDS, `Au plus ${MAX_BULK_TEMPLATE_IDS} modèles par lot`),
	status: z.enum(['published', 'draft'])
});

/**
 * Schema for question categories
 */
export const questionCategorySchema = z.object({
	theme: z.string().min(1).max(100),
	domain: z.string().min(1).max(100),
	subdomain: z.string().max(100).optional().nullable()
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Question template response schema (matches Supabase snake_case columns)
 */
export const questionTemplateResponseSchema = z.object({
	id: z.string().uuid(),
	type: questionTypeSchema,
	title: z.string(),
	description: z.string().nullable().optional(),
	variations: z.array(z.unknown()).nullable().optional(),
	exercise_instruction: z.string().nullable().optional(),
	shared: z.unknown().nullable().optional(),
	default_display_options: z.unknown().nullable().optional(),
	options: z.unknown().nullable().optional(),
	precision: z.unknown().nullable().optional(),
	grades: z.array(gradeSchema),
	theme: z.string(),
	domain: z.string(),
	subdomain: z.string().nullable().optional(),
	level: z.number().int().nonnegative(),
	status: z.enum(['draft', 'published']),
	delay: z.number().int().nonnegative().nullable().optional(),
	multiple_answers: z.boolean().nullable().optional(),
	created_by: z.string().uuid(),
	created_at: z.string(),
	updated_at: z.string()
});

/**
 * Question templates list response schema (GET /api/questions/templates)
 * Note: Uses simple total count instead of full pagination object
 */
export const questionTemplatesListResponseSchema = z.object({
	templates: z.array(questionTemplateResponseSchema),
	total: z.number().int().nonnegative()
});

/**
 * Question template detail response schema (GET /api/questions/templates/[id])
 */
export const questionTemplateDetailResponseSchema = z.object({
	template: questionTemplateResponseSchema
});

/**
 * Create question template response schema (POST /api/questions/templates)
 */
export const createQuestionTemplateResponseSchema = z.object({
	success: z.literal(true),
	template: questionTemplateResponseSchema
});

/**
 * Generated question response schema (GET /api/questions/generate/[id])
 */
export const generatedQuestionResponseSchema = z.object({
	question: z.object({
		id: z.string().uuid(),
		type: questionTypeSchema,
		title: z.string(),
		statement: z.string(),
		correctAnswer: z.unknown(),
		options: z.unknown().optional(),
		explanation: z.string().optional(),
		seed: z.number().int().nonnegative(),
		variationIndex: z.number().int().nonnegative().optional()
	})
});

/**
 * Question categories response schema (GET /api/questions/categories)
 */
export const questionCategoriesResponseSchema = z.object({
	categories: z.array(
		z.object({
			id: z.string().uuid(),
			theme: z.string(),
			domain: z.string(),
			subdomain: z.string().nullable().optional(),
			question_count: z.number().int().nonnegative()
		})
	)
});
