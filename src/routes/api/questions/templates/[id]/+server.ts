/**
 * Question Template API - Single Template
 * ========================================
 *
 * GET /api/questions/templates/[id] - Get template by ID
 * PUT /api/questions/templates/[id] - Update template
 * DELETE /api/questions/templates/[id] - Delete template
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';
import { getQuestionType, mapDbTemplateToForm } from '$lib/questions/types';
import { validateTemplate, detectCircularDependencies } from '$lib/questions';
import { checkCategoryUniqueness } from '$lib/questions/category-validation';
import { updateQuestionTemplateSchema, validateRequest } from '$lib/server/validation';
import { requireRoles, requireRole } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { toJson } from '$lib/types/database-helpers';
import type { Database } from '$lib/types/database';
import { toQuestionTemplate } from '$lib/types/question-template';
import { withoutDbMetadata } from '$lib/server/questions-bulk-status';
import {
	assumptionCollisionMessage,
	findAssumptionCollisions
} from '$lib/questions/answer-assumptions';

/**
 * GET /api/questions/templates/[id]
 *
 * Retrieve a single template by ID
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const id = validateUuidParam(params.id);
	await requireRoles(locals, ['teacher', 'admin']);

	try {
		const { data: template, error: queryError } = await locals.supabase
			.from('question_templates')
			.select('*')
			.eq('id', id)
			.single();

		if (queryError || !template) {
			throw error(404, 'Template not found');
		}

		return json(mapDbTemplateToForm(template as unknown as Record<string, unknown>));
	} catch (err) {
		console.error('Error fetching template:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Internal server error');
	}
};

/** Clés du corps qui touchent au type recalculé (`getQuestionType`) */
const TYPE_SOURCE_KEYS = ['variations', 'shared', 'options'] as const;

type TemplateUpdate = Database['public']['Tables']['question_templates']['Update'];

/** Clé présente dans le corps validé (même à `null`) */
function isProvided(data: object, key: string): boolean {
	return Object.hasOwn(data, key);
}

/**
 * Modèle fusionné : la ligne en base, recouverte par chaque clé PRÉSENTE du
 * corps. Une clé à `null` vide le champ (→ `undefined` côté modèle).
 */
function mergeTemplate(
	current: QuestionTemplate,
	provided: Record<string, unknown>
): QuestionTemplate {
	const merged: Record<string, unknown> = { ...current };
	for (const [key, value] of Object.entries(provided)) {
		merged[key] = value ?? undefined;
	}
	return merged as unknown as QuestionTemplate;
}

/**
 * Objet d'écriture : uniquement les colonnes dont la clé a été envoyée.
 * Chaque conversion reprend l'expression de l'ancienne route (PUT complet de
 * l'éditeur → même objet qu'avant). `type` est recalculé sur le FUSIONNÉ dès
 * que variations / shared / options sont envoyés.
 */
function buildTemplateUpdate(
	data: Partial<QuestionTemplate>,
	merged: QuestionTemplate
): TemplateUpdate {
	const update: TemplateUpdate = {};
	if (TYPE_SOURCE_KEYS.some((key) => isProvided(data, key))) {
		update.type = getQuestionType({
			choices: merged.variations?.[0]?.choices,
			shared: merged.shared,
			options: merged.options
		});
	}
	if (isProvided(data, 'title') && data.title !== undefined) update.title = data.title;
	if (isProvided(data, 'description')) update.description = data.description || null;
	if (isProvided(data, 'shared')) update.shared = toJson(data.shared ?? null);
	if (isProvided(data, 'defaultDisplayOptions'))
		update.default_display_options = toJson(data.defaultDisplayOptions ?? null);
	if (isProvided(data, 'variations') && data.variations !== undefined)
		update.variations = toJson(data.variations);
	if (isProvided(data, 'exerciseInstruction'))
		update.exercise_instruction = data.exerciseInstruction || null;
	if (isProvided(data, 'options')) update.options = toJson(data.options ?? null);
	if (isProvided(data, 'grades') && data.grades !== undefined) update.grades = data.grades;
	// Catégorie : theme / domain / level requis, subdomain facultatif
	if (isProvided(data, 'theme') && data.theme !== undefined) update.theme = data.theme;
	if (isProvided(data, 'domain') && data.domain !== undefined) update.domain = data.domain;
	if (isProvided(data, 'subdomain')) update.subdomain = data.subdomain || null;
	if (isProvided(data, 'level') && data.level !== undefined) update.level = data.level;
	if (isProvided(data, 'status') && data.status !== undefined) update.status = data.status;
	if (isProvided(data, 'delay')) update.delay = data.delay || null;
	if (isProvided(data, 'multipleAnswers')) update.multiple_answers = data.multipleAnswers ?? null;
	if (isProvided(data, 'testSpecs')) update.test_specs = toJson(data.testSpecs ?? null);
	return update;
}

/** Contrôles de publication sur le modèle fusionné : messages d'erreur (vide = OK) */
function publicationErrors(merged: QuestionTemplate): string[] {
	const validationErrors = validateTemplate(merged);
	if (validationErrors.length > 0) return validationErrors;

	const circularErrors: string[] = [];
	(merged.variations ?? []).forEach((variation, index) => {
		const circularResult = detectCircularDependencies(variation.variables || []);
		if (!circularResult.valid) {
			circularErrors.push(
				...circularResult.errors.map((err) => `Variation ${index + 1}: ${err.message}`)
			);
		}
	});
	return circularErrors;
}

/**
 * PUT /api/questions/templates/[id]
 *
 * Mise à jour d'un modèle, sémantique PATCH : une clé absente du corps garde
 * la valeur en base, une clé présente (même `null`) la remplace. Les contrôles
 * (publication, hypothèses de l'énoncé) portent sur le modèle FUSIONNÉ.
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const id = validateUuidParam(params.id);
	await requireRole(locals, 'admin');

	try {
		// ====================================================================
		// SECURITY: Input Validation
		// ====================================================================
		const body = await request.json();
		const validation = validateRequest(updateQuestionTemplateSchema, body);

		if (!validation.success) {
			return json(
				{
					success: false,
					errors: [validation.error]
				},
				{ status: 400 }
			);
		}

		// `type` n'est jamais écrit tel quel : il est recalculé (getQuestionType)
		const { type: _ignoredType, ...provided } = validation.data;
		const templateData = provided as Partial<QuestionTemplate>;

		// ====================================================================
		// Ligne actuelle : absente (ou masquée par la RLS, zéro ligne) → 404
		// ====================================================================
		const { data: currentRow, error: readError } = await locals.supabase
			.from('question_templates')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (readError && readError.code !== 'PGRST116') {
			console.error('Error reading template before update:', readError);
			throw error(500, 'Failed to read template');
		}
		if (!currentRow) {
			throw error(404, 'Template not found');
		}

		const merged = mergeTemplate(
			withoutDbMetadata(toQuestionTemplate(currentRow)),
			provided as Record<string, unknown>
		);

		const update = buildTemplateUpdate(templateData, merged);
		if (Object.keys(update).length === 0) {
			return json({ success: false, errors: ['Aucun champ à mettre à jour'] }, { status: 400 });
		}

		// Hypothèses de l'énoncé (ADR 0012) : jamais sur une variable tirée,
		// vérifié sur le fusionné dès qu'une des trois sources change
		if (TYPE_SOURCE_KEYS.some((key) => isProvided(templateData, key))) {
			const collisions = findAssumptionCollisions(merged.options?.answerAssumptions, merged);
			if (collisions.length > 0) {
				return json(
					{ success: false, errors: collisions.map(assumptionCollisionMessage) },
					{ status: 400 }
				);
			}
		}

		if (merged.status === 'published') {
			const errors = publicationErrors(merged);
			if (errors.length > 0) {
				return json({ success: false, errors }, { status: 400 });
			}

			const categoryCheck = await checkCategoryUniqueness(
				locals.supabase,
				{
					theme: merged.theme,
					domain: merged.domain,
					subdomain: merged.subdomain,
					level: merged.level
				},
				id // Exclude current template from check
			);

			if (!categoryCheck.isUnique) {
				return json(
					{
						success: false,
						errors: [
							`Cette catégorie existe déjà (Thème: ${merged.theme}, Domaine: ${merged.domain}${merged.subdomain ? ', Sous-domaine: ' + merged.subdomain : ''}, Niveau: ${merged.level}). Veuillez choisir un niveau différent.`
						]
					},
					{ status: 400 }
				);
			}
		}

		// Écriture des seules colonnes envoyées ; zéro ligne rendue = refus RLS
		// silencieux ou ligne disparue entre-temps → 404
		const { data: template, error: updateError } = await locals.supabase
			.from('question_templates')
			.update(update)
			.eq('id', id)
			.select()
			.single();

		if (updateError?.code === 'PGRST116' || (!updateError && !template)) {
			throw error(404, 'Template not found');
		}
		if (updateError) {
			console.error('Error updating template:', updateError);
			throw error(500, 'Failed to update template');
		}

		return json({
			success: true,
			template
		});
	} catch (err) {
		console.error('Error in PUT /api/questions/templates/[id]:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		return json({
			success: false,
			errors: ['Internal server error']
		});
	}
};

/**
 * DELETE /api/questions/templates/[id]
 *
 * Delete a template
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const id = validateUuidParam(params.id);
	await requireRole(locals, 'admin');

	try {
		// Check if template exists first
		const { data: existing, error: existingError } = await locals.supabase
			.from('question_templates')
			.select('id')
			.eq('id', id)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
		// panne prenait le même visage et faisait conclure « rien ici », donc créer
		// par-dessus ce qu'on n'avait simplement pas su lire.
		if (existingError && existingError.code !== 'PGRST116') {
			console.error('Lecture impossible :', existingError);
			throw error(500, 'Impossible de vérifier l’état actuel');
		}

		if (!existing) {
			throw error(404, 'Template not found');
		}

		// Delete template
		const { error: deleteError } = await locals.supabase
			.from('question_templates')
			.delete()
			.eq('id', id);

		// Modèle déjà servi à des élèves : la base refuse, on dit quoi faire.
		// - 23503 : tiré dans une tentative d'évaluation (NO ACTION) ; sans lui, la
		//   tentative ne se régénère plus (ni correction, ni vérification de la note).
		// - 23514 : réponses enregistrées (`skill_attempts.template_id` passerait à
		//   NULL, ce que refuse `chk_attempt_regime`). Mesuré le 2026-10-01 : c'est
		//   ce code qui sort dès qu'une tentative a été envoyée.
		if (deleteError?.code === '23503' || deleteError?.code === '23514') {
			return json(
				{
					success: false,
					error:
						'Ce modèle a déjà servi à des élèves (évaluation ou révisions) : il ne peut plus être supprimé. Passe-le en brouillon.'
				},
				{ status: 409 }
			);
		}
		if (deleteError) {
			console.error('Error deleting template:', deleteError);
			throw error(500, 'Failed to delete template');
		}

		return json({ success: true }, { status: 200 });
	} catch (err) {
		console.error('Error in DELETE /api/questions/templates/[id]:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
