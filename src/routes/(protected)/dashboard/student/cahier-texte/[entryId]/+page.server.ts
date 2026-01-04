/**
 * Student Journal Entry Detail Page Server
 * =========================================
 *
 * Displays a single published journal entry (read-only).
 * Students can only see entries that are:
 * - Published (is_published = true)
 * - From their active class memberships
 * - Entry date <= today
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid('ID invalide');

export const load: PageServerLoad = async ({ locals, params }) => {
	// Only students can view this page
	const { user } = await requireRole(locals, 'student');

	const { entryId } = params;

	// Validate entry ID
	const entryIdResult = uuidSchema.safeParse(entryId);
	if (!entryIdResult.success) {
		throw error(400, 'ID entree invalide');
	}

	const today = new Date().toISOString().split('T')[0];

	// Get student's active class memberships
	const { data: memberships, error: membershipError } = await locals.supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', user.id)
		.eq('status', 'active');

	if (membershipError) {
		console.error('[Student Entry Detail] Error fetching memberships:', membershipError);
		throw error(500, 'Erreur lors du chargement');
	}

	const classIds = (memberships || []).map((m) => m.class_id);

	if (classIds.length === 0) {
		throw error(404, 'Entree non trouvee');
	}

	// Fetch the entry (must be published, from student's class, and date <= today)
	const { data: entry, error: entryError } = await locals.supabase
		.from('class_journal_entries')
		.select(
			`
			id,
			entry_date,
			lesson_content,
			homework_content,
			homework_due_date,
			is_published,
			class_id,
			teacher_id,
			created_at,
			updated_at,
			classes!inner(name, level),
			profiles!inner(display_name)
		`
		)
		.eq('id', entryId)
		.in('class_id', classIds)
		.eq('is_published', true)
		.lte('entry_date', today)
		.single();

	if (entryError) {
		if (entryError.code === 'PGRST116') {
			// No rows returned - either doesn't exist, not published, or not in student's class
			throw error(404, 'Entree non trouvee');
		}
		console.error('[Student Entry Detail] Error fetching entry:', entryError);
		throw error(500, 'Erreur lors du chargement');
	}

	// Transform to application format
	const classData = entry.classes as unknown as { name: string; level: string };
	const teacherData = entry.profiles as unknown as { display_name: string | null };

	return {
		entry: {
			id: entry.id,
			entryDate: entry.entry_date,
			lessonContent: entry.lesson_content,
			homeworkContent: entry.homework_content,
			homeworkDueDate: entry.homework_due_date,
			isPublished: entry.is_published,
			createdAt: entry.created_at,
			updatedAt: entry.updated_at
		},
		classData: {
			id: entry.class_id,
			name: classData.name,
			level: classData.level
		},
		teacherName: teacherData.display_name || 'Professeur'
	};
};
