/**
 * API Route: /api/python-files
 * GET - List Python files (user's own + assigned files)
 * POST - Create new Python file
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import {
	createPythonFileSchema,
	listPythonFilesQuerySchema,
	MAX_PYTHON_FILES_PER_USER
} from '$lib/server/validation/python-files';

// =============================================================================
// TYPES
// =============================================================================

/** Type for assigned file with assignment metadata */
interface AssignedFile {
	id: string;
	title: string;
	description: string | null;
	code: string;
	is_public: boolean | null;
	created_at: string;
	updated_at: string;
	owner_id: string;
	profiles: { firstname: string | null; lastname: string | null } | null;
	assignment: {
		id: string;
		instructions: string | null;
		due_date: string | null;
		assigned_at: string;
		class_name: string | null;
	};
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/python-files
 * List Python files (user's own + optionally assigned files)
 * Authenticated users only
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, profile } = await requireAuth(locals);

	// Validate query parameters
	const queryResult = listPythonFilesQuerySchema.safeParse({
		page: url.searchParams.get('page') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
		includeAssigned: url.searchParams.get('includeAssigned') ?? undefined,
		onlyMine: url.searchParams.get('onlyMine') ?? undefined
	});

	if (!queryResult.success) {
		const errorMsg = queryResult.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Parametres de requete invalides: ${errorMsg}`);
	}

	const { page, limit, includeAssigned, onlyMine } = queryResult.data;
	const offset = (page - 1) * limit;

	// Build query for user's own files
	let query = locals.supabase.from('python_files').select(
		`
			id,
			title,
			description,
			is_public,
			created_at,
			updated_at,
			owner_id,
			profiles!python_files_owner_id_fkey (
				firstname,
				lastname
			)
		`,
		{ count: 'exact' }
	);

	if (onlyMine) {
		// Only user's own files
		query = query.eq('owner_id', user.id);
	} else {
		// User's own files OR public files
		query = query.or(`owner_id.eq.${user.id},is_public.eq.true`);
	}

	query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

	const { data: files, error: queryError, count } = await query;

	if (queryError) {
		console.error('Error fetching python files:', queryError);
		throw error(500, 'Erreur lors de la recuperation des fichiers Python');
	}

	// If student and includeAssigned is true, also fetch assigned files
	let assignedFiles: AssignedFile[] = [];
	if (includeAssigned && profile.role === 'student') {
		const { data: assigned, error: assignedError } = await locals.supabase
			.from('python_file_assignments')
			.select(
				`
				id,
				instructions,
				due_date,
				assigned_at,
				class_id,
				python_files!python_file_assignments_file_id_fkey (
					id,
					title,
					description,
					code,
					is_public,
					created_at,
					updated_at,
					owner_id,
					profiles!python_files_owner_id_fkey (
						firstname,
						lastname
					)
				),
				classes!python_file_assignments_class_id_fkey (
					name
				)
			`
			)
			.order('assigned_at', { ascending: false });

		if (assignedError) {
			console.error('Error fetching assigned files:', assignedError);
			// Don't fail the whole request, just skip assigned files
		} else if (assigned) {
			// Transform assigned files to match the file format
			// Note: Supabase returns related single records as objects (not arrays) when using !inner or foreign key references
			assignedFiles = assigned
				.filter((a) => a.python_files)
				.map((a) => {
					const pythonFile = a.python_files as unknown as {
						id: string;
						title: string;
						description: string | null;
						code: string;
						is_public: boolean | null;
						created_at: string;
						updated_at: string;
						owner_id: string;
						profiles: { firstname: string | null; lastname: string | null } | null;
					};
					const classData = a.classes as unknown as { name: string } | null;
					return {
						...pythonFile,
						assignment: {
							id: a.id,
							instructions: a.instructions,
							due_date: a.due_date,
							assigned_at: a.assigned_at,
							class_name: classData?.name ?? null
						}
					};
				});
		}
	}

	const totalPages = count ? Math.ceil(count / limit) : 0;

	return json({
		files: files ?? [],
		assignedFiles,
		pagination: {
			page,
			limit,
			total: count ?? 0,
			totalPages
		}
	});
};

/**
 * POST /api/python-files
 * Create a new Python file
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

	const validation = createPythonFileSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation echouee: ${errorMsg}`);
	}

	const { title, description, code, is_public } = validation.data;

	// Check file count limit
	const { count, error: countError } = await locals.supabase
		.from('python_files')
		.select('id', { count: 'exact', head: true })
		.eq('owner_id', user.id);

	if (countError) {
		console.error('Error counting python files:', countError);
		throw error(500, 'Erreur lors de la verification de la limite de fichiers');
	}

	if (count !== null && count >= MAX_PYTHON_FILES_PER_USER) {
		throw error(
			400,
			`Limite atteinte: vous ne pouvez pas avoir plus de ${MAX_PYTHON_FILES_PER_USER} fichiers Python`
		);
	}

	// Insert file
	const { data, error: insertError } = await locals.supabase
		.from('python_files')
		.insert({
			title,
			description,
			code,
			is_public,
			owner_id: user.id
		})
		.select()
		.single();

	if (insertError) {
		console.error('Error creating python file:', insertError);
		if (insertError.message?.includes('maximum limit')) {
			throw error(
				400,
				`Limite atteinte: vous ne pouvez pas avoir plus de ${MAX_PYTHON_FILES_PER_USER} fichiers Python`
			);
		}
		throw error(500, 'Erreur lors de la creation du fichier Python');
	}

	return json({ file: data }, { status: 201 });
};
