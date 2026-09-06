/**
 * API Route: POST /api/python-notebooks/from-template/[templateId]
 *
 * Clones a template into a brand-new notebook owned by the caller.
 *
 * The clone:
 *   - copies title (or uses the body override) + description + content
 *   - regenerates every `cell.id` in `content.cells[]` so two clones of the
 *     same template don't collide on the in-store cellId-based maps
 *     (checkpointFailedAttempts, executionQueue, etc.)
 *   - sets `is_template = false` and `is_public = false` (sharing is opt-in)
 *   - does NOT copy `python_notebook_checkpoint_runs` from the template
 *     (those belong to the template author's own runs, irrelevant to the
 *     student/teacher who clones)
 *
 * Permissions:
 *   - the caller must be a teacher (students can't clone)
 *   - the template must exist AND be visible to the caller (own or public);
 *     the RLS SELECT policy on `python_notebooks` enforces this
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { cloneTemplateSchema } from '$lib/server/validation/notebook-templates';
import type { NotebookContent, NotebookCell } from '$lib/types/notebook';
import { asNotebookContent } from '$lib/types/notebook';
import { toJson } from '$lib/types/database-helpers';

const MAX_NOTEBOOKS_PER_USER = 50;

/**
 * Mirror of `generateCellId` in the notebook store. Kept here to avoid
 * importing a `.svelte.ts` file into a server route (the runtime would
 * complain about runes outside a component).
 */
function generateCellId(): string {
	return `cell-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireAuth(locals);

	if (profile.role === 'student') {
		throw error(403, 'Réservé aux enseignants');
	}

	const idValidation = uuidSchema.safeParse(params.templateId);
	if (!idValidation.success) throw error(400, 'ID de template invalide');
	const templateId = idValidation.data;

	let body: unknown = {};
	const contentType = request.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			body = await request.json();
		} catch {
			throw error(400, 'Corps de requête invalide');
		}
	}
	const bodyValidation = cloneTemplateSchema.safeParse(body);
	if (!bodyValidation.success) {
		const msg = bodyValidation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation échouée: ${msg}`);
	}

	// Fetch the template — RLS rejects if the caller can't see it.
	const { data: template, error: fetchError } = await locals.supabase
		.from('python_notebooks')
		.select('id, title, description, content, is_template')
		.eq('id', templateId)
		.maybeSingle();

	if (fetchError) {
		console.error('Failed to fetch template for clone:', fetchError);
		throw error(500, 'Erreur lors du chargement du template');
	}
	if (!template) throw error(404, 'Template introuvable');
	if (!template.is_template) {
		// The endpoint name is specific — refuse cloning a regular notebook
		// here (use the duplicate flow if/when we add one).
		throw error(400, "L'identifiant fourni n'est pas un template");
	}

	// Quota check (mirrors POST /api/python-notebooks).
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

	// Clone the content with fresh cell IDs. We treat `template.content` as
	// an opaque JSON blob — its shape was validated when the template was
	// originally written via the editor's PUT endpoint.
	// `content` est une colonne jsonb : la structure est vérifiée, pas affirmée.
	// Un notebook sans cellules serait autrement recopié en coquille vide.
	const sourceContent = asNotebookContent(template.content);
	if (!sourceContent) {
		throw error(422, 'Contenu de notebook illisible');
	}
	const now = new Date().toISOString();
	const clonedContent: NotebookContent = {
		version: '1.0',
		metadata: {
			title: bodyValidation.data.title ?? template.title,
			created_at: now,
			updated_at: now,
			kernel_info: sourceContent.metadata?.kernel_info
		},
		cells: sourceContent.cells.map(
			(cell: NotebookCell): NotebookCell => ({
				...cell,
				id: generateCellId(),
				// Wipe stale execution state — the clone hasn't been run yet.
				execution_count: null,
				outputs: [],
				state: 'idle',
				metadata: cell.metadata
					? // Drop `last_executed_source` so the gutter doesn't draw
						// a misleading "modified since last run" dot on cells
						// that were never executed in this notebook.
						Object.fromEntries(
							Object.entries(cell.metadata).filter(([k]) => k !== 'last_executed_source')
						)
					: undefined
			})
		)
	};

	const insertPayload = {
		title: bodyValidation.data.title ?? template.title,
		description: bodyValidation.data.description ?? template.description ?? null,
		// Colonne jsonb : conversion réelle plutôt que cast.
		content: toJson(clonedContent),
		author_id: user.id,
		is_public: false,
		is_template: false,
		template_category: null
	};

	const { data: inserted, error: insertError } = await locals.supabase
		.from('python_notebooks')
		.insert(insertPayload)
		.select()
		.single();

	if (insertError) {
		console.error('Failed to insert cloned notebook:', insertError);
		throw error(500, 'Erreur lors de la création du notebook depuis le template');
	}

	return json({ notebook: inserted }, { status: 201 });
};
