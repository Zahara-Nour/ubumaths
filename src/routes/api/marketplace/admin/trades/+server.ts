import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminTradesQuerySchema } from '$lib/server/marketplace/validation';

/**
 * GET /api/marketplace/admin/trades
 * Get trade history for teacher's students or admin's school
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Get user profile to determine role
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role, school_id')
		.eq('id', userId)
		.single();

	if (profileError || !profile) {
		throw error(404, 'Profil non trouvé');
	}

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux enseignants et administrateurs');
	}

	// Validate query parameters
	const queryValidation = adminTradesQuerySchema.safeParse({
		class_id: url.searchParams.get('class_id'),
		student_id: url.searchParams.get('student_id'),
		status: url.searchParams.get('status'),
		date_from: url.searchParams.get('date_from'),
		date_to: url.searchParams.get('date_to'),
		page: url.searchParams.get('page'),
		limit: url.searchParams.get('limit')
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { class_id, student_id, status, date_from, date_to, page, limit } = queryValidation.data;

	// Build base query - use column hints instead of FK names for better compatibility
	let query = supabase
		.from('marketplace_trades')
		.select(
			`
      *,
      initiator:initiator_id(
        id,
        username,
        avatar_url
      ),
      partner:partner_id(
        id,
        username,
        avatar_url
      )
    `,
			{ count: 'exact' }
		)
		.order('created_at', { ascending: false });

	// Apply role-based filtering
	if (profile.role === 'teacher') {
		// First get teacher's classes
		const { data: teacherClasses, error: classesError } = await supabase
			.from('classes')
			.select('id')
			.eq('teacher_id', userId);

		if (classesError) {
			console.error('Error fetching teacher classes:', classesError);
			throw error(500, 'Erreur lors de la récupération des classes');
		}

		const classIds = teacherClasses?.map((c: { id: string }) => c.id) || [];

		if (classIds.length === 0) {
			// Teacher has no classes
			return json({
				trades: [],
				pagination: {
					page,
					limit,
					total: 0,
					totalPages: 0
				}
			});
		}

		// Get students in teacher's classes
		const { data: classMembers, error: membersError } = await supabase
			.from('class_members')
			.select('student_id')
			.in('class_id', classIds);

		if (membersError) {
			console.error('Error fetching class members:', membersError);
			throw error(500, 'Erreur lors de la récupération des élèves');
		}

		const studentIds = classMembers?.map((m: { student_id: string }) => m.student_id) || [];

		if (studentIds.length === 0) {
			// Teacher has no students
			return json({
				trades: [],
				pagination: {
					page,
					limit,
					total: 0,
					totalPages: 0
				}
			});
		}

		// Filter trades to only include teacher's students
		query = query.or(
			`initiator_id.in.(${studentIds.join(',')}),partner_id.in.(${studentIds.join(',')})`
		);

		// If specific class_id is provided, further filter
		if (class_id) {
			// Verify teacher owns this class
			const { data: classData } = await supabase
				.from('classes')
				.select('teacher_id')
				.eq('id', class_id)
				.single();

			if (!classData || classData.teacher_id !== userId) {
				throw error(403, 'Accès non autorisé à cette classe');
			}

			// Get students in this specific class
			const { data: classStudents } = await supabase
				.from('class_members')
				.select('student_id')
				.eq('class_id', class_id);

			const classStudentIds = classStudents?.map((m: { student_id: string }) => m.student_id) || [];

			query = query.or(
				`initiator_id.in.(${classStudentIds.join(',')}),partner_id.in.(${classStudentIds.join(',')})`
			);
		}
	} else if (profile.role === 'admin') {
		// Admin sees all trades in their school
		const { data: schoolStudents, error: studentsError } = await supabase
			.from('profiles')
			.select('id')
			.eq('school_id', profile.school_id)
			.eq('role', 'student');

		if (studentsError) {
			console.error('Error fetching school students:', studentsError);
			throw error(500, 'Erreur lors de la récupération des élèves');
		}

		const studentIds = schoolStudents?.map((s: { id: string }) => s.id) || [];

		if (studentIds.length === 0) {
			return json({
				trades: [],
				pagination: {
					page,
					limit,
					total: 0,
					totalPages: 0
				}
			});
		}

		query = query.or(
			`initiator_id.in.(${studentIds.join(',')}),partner_id.in.(${studentIds.join(',')})`
		);
	}

	// Apply additional filters
	if (student_id) {
		query = query.or(`initiator_id.eq.${student_id},partner_id.eq.${student_id}`);
	}

	if (status) {
		query = query.eq('status', status);
	}

	if (date_from) {
		query = query.gte('created_at', date_from);
	}

	if (date_to) {
		query = query.lte('created_at', date_to);
	}

	// Apply pagination
	const offset = (page - 1) * limit;
	query = query.range(offset, offset + limit - 1);

	const { data: trades, error: tradesError, count } = await query;

	if (tradesError) {
		console.error('Error fetching trades:', tradesError);
		throw error(500, 'Erreur lors de la récupération des échanges');
	}

	return json({
		trades: trades || [],
		pagination: {
			page,
			limit,
			total: count || 0,
			totalPages: Math.ceil((count || 0) / limit)
		}
	});
};
