/**
 * Teacher Class Journal Entry Editor Page Server
 * ===============================================
 *
 * Handles CRUD operations for a specific journal entry.
 * Supports create, update, delete, and publish toggle actions.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { createJournalEntry, updateJournalEntry, deleteJournalEntry } from '$lib/server/journal';
import {
	validateCreateJournalEntry,
	validateUpdateJournalEntry
} from '$lib/server/validation/journal';
import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid('ID invalide');

// Date validation schema (YYYY-MM-DD)
const dateParamSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide')
	.refine(
		(date) => {
			const parsed = new Date(date);
			return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
		},
		{ message: 'Date invalide' }
	);

export const load: PageServerLoad = async ({ locals, params }) => {
	// Only teachers can view this page
	const { user } = await requireRole(locals, 'teacher');

	const { classId, date } = params;

	// Validate URL parameters
	const classIdResult = uuidSchema.safeParse(classId);
	if (!classIdResult.success) {
		throw error(400, 'ID de classe invalide');
	}

	const dateResult = dateParamSchema.safeParse(date);
	if (!dateResult.success) {
		throw error(400, 'Format de date invalide');
	}

	// Verify teacher owns this class
	const { data: classData, error: classError } = await locals.supabase
		.from('classes')
		.select('id, name, grade')
		.eq('id', classId)
		.eq('teacher_id', user.id)
		.single();

	if (classError || !classData) {
		throw error(404, 'Classe non trouvee');
	}

	// Try to load existing entry for this class and date
	const { data: existingEntry, error: entryError } = await locals.supabase
		.from('class_journal_entries')
		.select('*')
		.eq('class_id', classId)
		.eq('entry_date', date)
		.single();

	// PGRST116 = no rows returned, which is fine (creating new entry)
	if (entryError && entryError.code !== 'PGRST116') {
		console.error('[Journal Entry] Error fetching entry:', entryError);
	}

	// Convert database format to application format if entry exists
	const entry = existingEntry
		? {
				id: existingEntry.id,
				classId: existingEntry.class_id,
				teacherId: existingEntry.teacher_id,
				entryDate: existingEntry.entry_date,
				lessonContent: existingEntry.lesson_content,
				homeworkContent: existingEntry.homework_content,
				homeworkDueDate: existingEntry.homework_due_date,
				isPublished: existingEntry.is_published,
				createdAt: existingEntry.created_at,
				updatedAt: existingEntry.updated_at
			}
		: null;

	return {
		classData,
		entry,
		entryDate: date
	};
};

export const actions: Actions = {
	/**
	 * Create a new journal entry
	 */
	create: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId, date } = params;

		// Validate URL parameters
		const classIdResult = uuidSchema.safeParse(classId);
		if (!classIdResult.success) {
			return fail(400, { error: 'ID de classe invalide', action: 'create' });
		}

		const dateResult = dateParamSchema.safeParse(date);
		if (!dateResult.success) {
			return fail(400, { error: 'Format de date invalide', action: 'create' });
		}

		const formData = await request.formData();

		// Build input data
		const inputData = {
			classId,
			entryDate: date,
			lessonContent: (formData.get('lessonContent') as string) || null,
			homeworkContent: (formData.get('homeworkContent') as string) || null,
			homeworkDueDate: (formData.get('homeworkDueDate') as string) || null,
			isPublished: formData.get('isPublished') === 'true'
		};

		// Validate input
		const validation = validateCreateJournalEntry(inputData);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'create'
			});
		}

		// Create the entry
		const { data: entry, error: createError } = await createJournalEntry(
			locals.supabase,
			user.id,
			validation.data
		);

		if (createError) {
			console.error('[Create Journal Entry] Error:', createError);
			return fail(500, { error: createError.message, action: 'create' });
		}

		return { success: true, action: 'create', entryId: entry?.id };
	},

	/**
	 * Update an existing journal entry
	 */
	update: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const entryId = formData.get('entryId') as string;

		// Validate entry ID
		const entryIdResult = uuidSchema.safeParse(entryId);
		if (!entryIdResult.success) {
			return fail(400, { error: 'ID entree invalide', action: 'update' });
		}

		// Build update data
		const updateData: Record<string, unknown> = {};

		const lessonContent = formData.get('lessonContent');
		if (lessonContent !== null) {
			updateData.lessonContent = lessonContent || null;
		}

		const homeworkContent = formData.get('homeworkContent');
		if (homeworkContent !== null) {
			updateData.homeworkContent = homeworkContent || null;
		}

		const homeworkDueDate = formData.get('homeworkDueDate');
		if (homeworkDueDate !== null) {
			updateData.homeworkDueDate = homeworkDueDate || null;
		}

		const isPublished = formData.get('isPublished');
		if (isPublished !== null) {
			updateData.isPublished = isPublished === 'true';
		}

		// Validate input
		const validation = validateUpdateJournalEntry(updateData);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'update'
			});
		}

		// Update the entry
		const { error: updateError } = await updateJournalEntry(
			locals.supabase,
			entryId,
			user.id,
			validation.data
		);

		if (updateError) {
			console.error('[Update Journal Entry] Error:', updateError);
			return fail(500, { error: updateError.message, action: 'update' });
		}

		return { success: true, action: 'update' };
	},

	/**
	 * Delete a journal entry
	 */
	delete: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId } = params;

		const formData = await request.formData();
		const entryId = formData.get('entryId') as string;

		// Validate entry ID
		const entryIdResult = uuidSchema.safeParse(entryId);
		if (!entryIdResult.success) {
			return fail(400, { error: 'ID entree invalide', action: 'delete' });
		}

		// Delete the entry
		const { error: deleteError } = await deleteJournalEntry(locals.supabase, entryId, user.id);

		if (deleteError) {
			console.error('[Delete Journal Entry] Error:', deleteError);
			return fail(500, { error: deleteError.message, action: 'delete' });
		}

		// Redirect back to main view
		throw redirect(303, `/dashboard/teacher/cahier-texte?class=${classId}`);
	},

	/**
	 * Toggle publication status
	 */
	publish: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const entryId = formData.get('entryId') as string;
		const isPublished = formData.get('isPublished') === 'true';

		// Validate entry ID
		const entryIdResult = uuidSchema.safeParse(entryId);
		if (!entryIdResult.success) {
			return fail(400, { error: 'ID entree invalide', action: 'publish' });
		}

		// Update publication status
		const { error: updateError } = await updateJournalEntry(locals.supabase, entryId, user.id, {
			isPublished
		});

		if (updateError) {
			console.error('[Publish Journal Entry] Error:', updateError);
			return fail(500, { error: updateError.message, action: 'publish' });
		}

		return { success: true, action: 'publish', isPublished };
	}
};
