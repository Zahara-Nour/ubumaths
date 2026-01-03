/**
 * API Route: /api/python-files/students
 * GET - List Python files created by students (for teachers)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { studentFilesQuerySchema } from '$lib/server/validation/python-files';

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/python-files/students
 * List Python files created by students in teacher's classes
 * Teacher only - can filter by class_id or student_id
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate query parameters
	const queryResult = studentFilesQuerySchema.safeParse({
		page: url.searchParams.get('page') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
		class_id: url.searchParams.get('class_id') ?? undefined,
		student_id: url.searchParams.get('student_id') ?? undefined
	});

	if (!queryResult.success) {
		const errorMsg = queryResult.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Parametres de requete invalides: ${errorMsg}`);
	}

	const { page, limit, class_id, student_id } = queryResult.data;
	const offset = (page - 1) * limit;

	// Get all students in teacher's classes
	let studentIdsQuery = locals.supabase
		.from('class_members')
		.select(
			`
			student_id,
			classes!inner (
				id,
				teacher_id
			)
		`
		)
		.eq('classes.teacher_id', user.id)
		.eq('status', 'active');

	if (class_id) {
		studentIdsQuery = studentIdsQuery.eq('class_id', class_id);
	}

	const { data: classMembers, error: membersError } = await studentIdsQuery;

	if (membersError) {
		console.error('Error fetching class members:', membersError);
		throw error(500, 'Erreur lors de la recuperation des membres des classes');
	}

	if (!classMembers || classMembers.length === 0) {
		return json({
			files: [],
			pagination: {
				page,
				limit,
				total: 0,
				totalPages: 0
			}
		});
	}

	// Get unique student IDs
	let studentIds = [...new Set(classMembers.map((m) => m.student_id))];

	// Filter by specific student if provided
	if (student_id) {
		if (!studentIds.includes(student_id)) {
			throw error(403, "Cet etudiant n'est pas dans une de vos classes");
		}
		studentIds = [student_id];
	}

	// Fetch files from these students
	const {
		data: files,
		error: filesError,
		count
	} = await locals.supabase
		.from('python_files')
		.select(
			`
			id,
			title,
			description,
			is_public,
			created_at,
			updated_at,
			owner_id,
			profiles!python_files_owner_id_fkey (
				id,
				firstname,
				lastname
			)
		`,
			{ count: 'exact' }
		)
		.in('owner_id', studentIds)
		.order('updated_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (filesError) {
		console.error('Error fetching student files:', filesError);
		throw error(500, 'Erreur lors de la recuperation des fichiers des etudiants');
	}

	// Enrich with class information for each student
	const filesWithClasses = await Promise.all(
		(files ?? []).map(async (file) => {
			// Get classes where this student is enrolled (that belong to this teacher)
			const { data: studentClasses } = await locals.supabase
				.from('class_members')
				.select(
					`
					classes!inner (
						id,
						name,
						grade
					)
				`
				)
				.eq('student_id', file.owner_id)
				.eq('status', 'active')
				.eq('classes.teacher_id', user.id);

			return {
				...file,
				student_classes: studentClasses?.map((sc) => sc.classes) ?? []
			};
		})
	);

	const totalPages = count ? Math.ceil(count / limit) : 0;

	return json({
		files: filesWithClasses,
		pagination: {
			page,
			limit,
			total: count ?? 0,
			totalPages
		}
	});
};
