/**
 * API Route: /api/python-notebooks
 * GET - List Python notebooks (own + public + assigned)
 * POST - Create new Python notebook
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { createNotebookSchema } from '$lib/server/validation/notebooks';
import { uuidSchema } from '$lib/server/validation/common';
import type { NotebookContent } from '$lib/types/notebook';
import { z } from 'zod';

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_NOTEBOOKS_PER_USER = 50;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const listNotebooksQuerySchema = z.object({
	author_id: z.string().uuid().optional(),
	is_public: z
		.string()
		.optional()
		.transform((v) => {
			if (!v) return undefined;
			return v === 'true';
		}),
	limit: z
		.string()
		.optional()
		.transform((v) => {
			if (!v) return 50;
			const parsed = parseInt(v, 10);
			if (isNaN(parsed) || parsed < 1 || parsed > 100) return 50;
			return parsed;
		}),
	offset: z
		.string()
		.optional()
		.transform((v) => {
			if (!v) return 0;
			const parsed = parseInt(v, 10);
			if (isNaN(parsed) || parsed < 0) return 0;
			return parsed;
		})
});

// =============================================================================
// TYPES
// =============================================================================

interface NotebookRow {
	id: string;
	title: string;
	description: string | null;
	content: NotebookContent;
	author_id: string;
	is_public: boolean;
	created_at: string;
	updated_at: string;
	profiles: {
		firstname: string | null;
		lastname: string | null;
	} | null;
}

interface AssignedNotebook extends NotebookRow {
	assignment: {
		id: string;
		readonly: boolean;
		created_at: string;
		class_name: string | null;
	};
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/python-notebooks
 * List Python notebooks (user's own + public + assigned)
 * Authenticated users only
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { profile } = await requireAuth(locals);

	// Validate query parameters
	const queryResult = listNotebooksQuerySchema.safeParse({
		author_id: url.searchParams.get('author_id') ?? undefined,
		is_public: url.searchParams.get('is_public') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
		offset: url.searchParams.get('offset') ?? undefined
	});

	if (!queryResult.success) {
		const errorMsg = queryResult.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Parametres de requete invalides: ${errorMsg}`);
	}

	const { author_id, is_public, limit, offset } = queryResult.data;

	// Build query
	let query = locals.supabase
		.from('python_notebooks')
		.select(
			`
			id,
			title,
			description,
			content,
			author_id,
			is_public,
			created_at,
			updated_at,
			profiles!python_notebooks_author_id_fkey (
				firstname,
				lastname
			)
		`,
			{ count: 'exact' }
		)
		.order('updated_at', { ascending: false })
		.range(offset, offset + limit - 1);

	// Apply filters
	if (author_id) {
		// Validate author_id is UUID
		const authorIdValidation = uuidSchema.safeParse(author_id);
		if (!authorIdValidation.success) {
			throw error(400, 'author_id invalide');
		}
		query = query.eq('author_id', author_id);
	}

	if (is_public !== undefined) {
		query = query.eq('is_public', is_public);
	}

	const { data: notebooks, error: queryError, count } = await query;

	if (queryError) {
		console.error('Error fetching python notebooks:', queryError);
		throw error(500, 'Erreur lors de la recuperation des notebooks Python');
	}

	// If student, also fetch assigned notebooks
	let assignedNotebooks: AssignedNotebook[] = [];
	if (profile.role === 'student') {
		const { data: assigned, error: assignedError } = await locals.supabase
			.from('python_notebook_assignments')
			.select(
				`
				id,
				readonly,
				created_at,
				python_notebooks!python_notebook_assignments_notebook_id_fkey (
					id,
					title,
					description,
					content,
					author_id,
					is_public,
					created_at,
					updated_at,
					profiles!python_notebooks_author_id_fkey (
						firstname,
						lastname
					)
				),
				classes!python_notebook_assignments_class_id_fkey (
					name
				)
			`
			)
			.order('created_at', { ascending: false });

		if (assignedError) {
			console.error('Error fetching assigned notebooks:', assignedError);
			// Don't fail the whole request, just skip assigned notebooks
		} else if (assigned) {
			// Transform assigned notebooks to match the notebook format
			assignedNotebooks = assigned
				.filter((a) => a.python_notebooks)
				.map((a) => {
					const notebook = a.python_notebooks as unknown as NotebookRow;
					const classData = a.classes as unknown as { name: string } | null;
					return {
						...notebook,
						assignment: {
							id: a.id,
							readonly: a.readonly,
							created_at: a.created_at,
							class_name: classData?.name ?? null
						}
					};
				});
		}
	}

	const totalPages = count ? Math.ceil(count / limit) : 0;

	return json({
		notebooks: notebooks ?? [],
		assignedNotebooks,
		pagination: {
			limit,
			offset,
			total: count ?? 0,
			totalPages
		}
	});
};

/**
 * POST /api/python-notebooks
 * Create a new Python notebook
 * Authenticated users only
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireAuth(locals);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const validation = createNotebookSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation echouee: ${errorMsg}`);
	}

	const { title, description, is_public } = validation.data;

	// Check notebook count limit
	const { count, error: countError } = await locals.supabase
		.from('python_notebooks')
		.select('id', { count: 'exact', head: true })
		.eq('author_id', user.id);

	if (countError) {
		console.error('Error counting python notebooks:', countError);
		throw error(500, 'Erreur lors de la verification de la limite de notebooks');
	}

	if (count !== null && count >= MAX_NOTEBOOKS_PER_USER) {
		throw error(
			400,
			`Limite atteinte: vous ne pouvez pas avoir plus de ${MAX_NOTEBOOKS_PER_USER} notebooks Python`
		);
	}

	// Create initial notebook content with one empty code cell
	const now = new Date().toISOString();
	const initialContent: NotebookContent = {
		version: '1.0',
		metadata: {
			title,
			created_at: now,
			updated_at: now,
			kernel_info: {
				name: 'python3',
				language: 'python',
				version: '3.x'
			}
		},
		cells: [
			{
				id: crypto.randomUUID(),
				type: 'code',
				source: '',
				execution_count: null,
				outputs: [],
				state: 'idle'
			}
		]
	};

	// Insert notebook
	const { data, error: insertError } = await locals.supabase
		.from('python_notebooks')
		.insert({
			title,
			description: description ?? null,
			content: initialContent,
			author_id: user.id,
			is_public: is_public ?? false
		})
		.select()
		.single();

	if (insertError) {
		console.error('Error creating python notebook:', insertError);
		if (insertError.message?.includes('maximum limit')) {
			throw error(
				400,
				`Limite atteinte: vous ne pouvez pas avoir plus de ${MAX_NOTEBOOKS_PER_USER} notebooks Python`
			);
		}
		throw error(500, 'Erreur lors de la creation du notebook Python');
	}

	return json({ notebook: data }, { status: 201 });
};
