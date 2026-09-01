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
import { getCurriculumTree } from '$lib/server/curriculum';
import { reconcileAutoCoverage } from '$lib/server/curriculum-coverage';
import { parsePendingActivities } from '$lib/server/journal-activities';
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
	await requireRole(locals, 'teacher');

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

	// Verify the class exists (mono-teacher: RLS scopes access to teacher/admin)
	const { data: classData, error: classError } = await locals.supabase
		.from('classes')
		.select('id, name, grade')
		.eq('id', classId)
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
				entryDate: existingEntry.entry_date,
				lessonContent: existingEntry.lesson_content,
				homeworkContent: existingEntry.homework_content,
				homeworkDueDate: existingEntry.homework_due_date,
				isPublished: existingEntry.is_published,
				createdAt: existingEntry.created_at,
				updatedAt: existingEntry.updated_at
			}
		: null;

	// Programme travaillé — curriculum tree (class grade) + this entry's coverage.
	const curriculumTree = classData.grade
		? await getCurriculumTree(locals.supabase, classData.grade)
		: [];

	let coveredPoints: { point_id: string; source: string }[] = [];
	let activities: {
		id: string;
		kind: string;
		exercise_id: string | null;
		question_template_id: string | null;
		assessment_id: string | null;
		chapter_id: string | null;
		textbook_ref: unknown;
		label: string | null;
		display_order: number;
	}[] = [];
	if (entry) {
		const { data: cov } = await locals.supabase
			.from('journal_entry_points')
			.select('point_id, source')
			.eq('entry_id', entry.id);
		coveredPoints = (cov ?? []) as { point_id: string; source: string }[];

		const { data: acts } = await locals.supabase
			.from('journal_entry_activities')
			.select(
				'id, kind, exercise_id, question_template_id, assessment_id, chapter_id, textbook_ref, label, display_order'
			)
			.eq('entry_id', entry.id)
			.order('display_order', { ascending: true })
			.order('created_at', { ascending: true });
		activities = (acts ?? []) as typeof activities;
	}

	// Exercises selectable for this class's grade (for the activity picker).
	let exerciseOptions: { value: string; label: string }[] = [];
	if (classData.grade) {
		const { data: exs } = await locals.supabase
			.from('exercises')
			.select('id, title, slug, topic')
			.contains('grades', [classData.grade])
			.order('title', { ascending: true })
			.limit(500);
		exerciseOptions = (exs ?? []).map((e) => ({
			value: e.id,
			label: e.title || e.topic || e.slug || 'Exercice sans titre'
		}));
	}

	// Questions and assessments selectable for this class's grade. Drafts are
	// listed too: a session records what was worked on, and a question can be
	// worked on before it is published.
	let questionOptions: { value: string; label: string }[] = [];
	let assessmentOptions: { value: string; label: string }[] = [];
	if (classData.grade) {
		const [{ data: qs }, { data: assess }] = await Promise.all([
			locals.supabase
				.from('question_templates')
				.select('id, title, theme, domain, level')
				.contains('grades', [classData.grade])
				.order('title', { ascending: true })
				.limit(500),
			locals.supabase
				.from('assessments')
				.select('id, title')
				.eq('grade', classData.grade)
				.neq('status', 'archived')
				.order('title', { ascending: true })
				.limit(200)
		]);
		questionOptions = (qs ?? []).map((q) => ({
			value: q.id,
			// Le titre seul se répète beaucoup d'une question à l'autre ; la
			// catégorie est ce qui les distingue dans la liste.
			label: `${q.title} — ${q.theme} / ${q.domain} (niv. ${q.level})`
		}));
		assessmentOptions = (assess ?? []).map((a) => ({ value: a.id, label: a.title }));
	}

	return {
		classData,
		entry,
		entryDate: date,
		curriculumTree,
		coveredPoints,
		activities,
		exerciseOptions,
		questionOptions,
		assessmentOptions
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

		// Couverture cochée AVANT enregistrement : sur une séance neuve, il n'y
		// avait pas encore d'entrée à référencer. La page a gardé la sélection et
		// l'envoie ici, pour l'écrire dans la foulée de la création.
		const rawPoints = (formData.get('coveredPointIds') as string) || '';
		const pointIds = [
			...new Set(
				rawPoints
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
			)
		];

		if (entry?.id && pointIds.length > 0) {
			const valid = pointIds.filter((id) => uuidSchema.safeParse(id).success).slice(0, 500);
			if (valid.length > 0) {
				const { error: covError } = await locals.supabase
					.from('journal_entry_points')
					.insert(valid.map((point_id) => ({ entry_id: entry.id, point_id, source: 'manual' })));
				// La séance, elle, est créée : un échec de couverture ne doit pas la
				// perdre. On le signale sans annuler.
				if (covError) {
					console.error('[Create Journal Entry] coverage failed:', covError);
					return {
						success: true,
						action: 'create',
						entryId: entry.id,
						warning: 'Séance créée, mais les points du programme n’ont pas pu être enregistrés.'
					};
				}
			}
		}

		// Activités choisies avant enregistrement, même raison que la couverture.
		// Elles arrivent en JSON parce qu'un type accompagne chaque référence.
		if (entry?.id) {
			const rows = parsePendingActivities(formData.get('pendingActivities'));
			if (rows.length > 0) {
				const { error: actError } = await locals.supabase
					.from('journal_entry_activities')
					.insert(rows.map((r) => ({ ...r, entry_id: entry.id })));
				if (actError) {
					console.error('[Create Journal Entry] activities failed:', actError);
					return {
						success: true,
						action: 'create',
						entryId: entry.id,
						warning: 'Séance créée, mais les activités n’ont pas pu être enregistrées.'
					};
				}
				// Les activités taguées apportent leur couverture `auto`, qui vient
				// s'ajouter aux points cochés à la main juste au-dessus.
				try {
					await reconcileAutoCoverage(locals.supabase, entry.id);
				} catch (e) {
					console.error('[Create Journal Entry] reconcile failed:', e);
				}
			}
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
