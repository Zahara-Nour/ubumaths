/**
 * API Route: POST /api/python-notebooks/[id]/save-as-template
 *
 * Creates a NEW template by copying an existing notebook's content. The
 * source notebook is left untouched — it stays a regular notebook that the
 * teacher can keep editing or sharing with students. The new row is the
 * template.
 *
 * Permissions:
 *   - the caller must be the owner of the source notebook (only the owner
 *     can decide to package their work as a template)
 *   - the caller must be a teacher
 *
 * Why a copy and not a flag flip:
 *   - editing the template later wouldn't affect existing clones (templates
 *     are immutable from the clones' perspective)
 *   - the source stays assignable to classes / shareable as before
 *   - the user mental model "I made this notebook AND saved it as a template"
 *     matches the persistent dual-existence we now have in the DB
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { saveAsTemplateSchema } from '$lib/server/validation/notebook-templates';
import type { NotebookContent, NotebookCell } from '$lib/types/notebook';

const MAX_NOTEBOOKS_PER_USER = 50;

function generateCellId(): string {
	return `cell-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireAuth(locals);

	if (profile.role === 'student') {
		throw error(403, 'Réservé aux enseignants');
	}

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) throw error(400, 'ID de notebook invalide');
	const notebookId = idValidation.data;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}
	const bodyValidation = saveAsTemplateSchema.safeParse(body);
	if (!bodyValidation.success) {
		const msg = bodyValidation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation échouée: ${msg}`);
	}

	// Fetch source notebook and check ownership.
	const { data: source, error: fetchError } = await locals.supabase
		.from('python_notebooks')
		.select('id, title, description, content, author_id, is_template')
		.eq('id', notebookId)
		.maybeSingle();

	if (fetchError) {
		console.error('Failed to fetch source notebook:', fetchError);
		throw error(500, 'Erreur lors du chargement du notebook');
	}
	if (!source) throw error(404, 'Notebook introuvable');
	if (source.author_id !== user.id) {
		throw error(403, "Vous n'êtes pas l'auteur de ce notebook");
	}
	if (source.is_template) {
		// Saving a template as a template is a no-op the UI should not even
		// surface — refuse explicitly so the dialog can't trigger by accident.
		throw error(400, 'Ce notebook est déjà un template');
	}

	// Quota check.
	const { count, error: countError } = await locals.supabase
		.from('python_notebooks')
		.select('id', { count: 'exact', head: true })
		.eq('author_id', user.id);
	if (countError) {
		console.error('Quota check failed:', countError);
		throw error(500, 'Erreur lors de la vérification de la limite');
	}
	if (count !== null && count >= MAX_NOTEBOOKS_PER_USER) {
		throw error(
			400,
			`Limite atteinte: vous ne pouvez pas avoir plus de ${MAX_NOTEBOOKS_PER_USER} notebooks Python`
		);
	}

	const sourceContent = source.content as NotebookContent;
	const now = new Date().toISOString();
	const templateContent: NotebookContent = {
		version: '1.0',
		metadata: {
			title: bodyValidation.data.title,
			created_at: now,
			updated_at: now,
			kernel_info: sourceContent.metadata?.kernel_info
		},
		// Regenerate cell IDs in the template too: any future clone will
		// regenerate them anyway, but stable distinct IDs across template/
		// source make debugging less confusing.
		cells: sourceContent.cells.map(
			(cell: NotebookCell): NotebookCell => ({
				...cell,
				id: generateCellId(),
				execution_count: null,
				outputs: [],
				state: 'idle',
				metadata: cell.metadata
					? Object.fromEntries(
							Object.entries(cell.metadata).filter(([k]) => k !== 'last_executed_source')
						)
					: undefined
			})
		)
	};

	const insertPayload = {
		title: bodyValidation.data.title,
		description: bodyValidation.data.description ?? source.description ?? null,
		content: templateContent,
		author_id: user.id,
		is_public: bodyValidation.data.is_public ?? false,
		is_template: true,
		template_category: bodyValidation.data.category ?? null
	};

	const { data: inserted, error: insertError } = await locals.supabase
		.from('python_notebooks')
		.insert(insertPayload)
		.select()
		.single();

	if (insertError) {
		console.error('Failed to insert template:', insertError);
		throw error(500, 'Erreur lors de la création du template');
	}

	return json({ template: inserted }, { status: 201 });
};
