/**
 * Teacher Evaluation Tasks — new (creation form)
 * ==============================================
 *
 * UI prof Phase 4.1 — Création rapide d'une tâche minimale puis redirection
 * vers l'édition pour déclarer le périmètre.
 *
 * Pattern : pas de page d'intro, juste un form action POST qui crée et
 * redirige immédiatement vers /dashboard/teacher/evaluation-tasks/[id].
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { z } from 'zod';

const createSchema = z.object({
	name: z.string().trim().min(1, 'Le nom est requis').max(200),
	niveau_scolaire: z.string().trim().min(1).default('6e'),
	class_id: z.string().uuid().nullable().optional(),
	task_date: z.string().nullable().optional()
});

export interface TeacherClassOption {
	id: string;
	name: string;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Charger les classes du prof pour le selecteur
	const { data: classes, error: err } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', user.id)
		.eq('is_active', true)
		.order('name');

	if (err) {
		throw error(500, `Erreur de chargement des classes : ${err.message}`);
	}

	return { classes: (classes ?? []) as TeacherClassOption[] };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const raw = {
			name: formData.get('name'),
			niveau_scolaire: formData.get('niveau_scolaire') || '6e',
			class_id: formData.get('class_id') || null,
			task_date: formData.get('task_date') || null
		};

		const parsed = createSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				message: parsed.error.issues[0]?.message ?? 'Invalid input',
				values: raw
			});
		}

		const { data, error: insertError } = await locals.supabase
			.from('evaluation_tasks')
			.insert({
				teacher_id: user.id,
				name: parsed.data.name,
				niveau_scolaire: parsed.data.niveau_scolaire,
				class_id: parsed.data.class_id || null,
				task_date: parsed.data.task_date || null
			})
			.select('id')
			.single();

		if (insertError || !data) {
			return fail(500, { message: insertError?.message ?? 'Insert failed', values: raw });
		}

		// Redirection immédiate vers l'édition (déclaration du périmètre)
		throw redirect(303, `/dashboard/teacher/evaluation-tasks/${data.id}`);
	}
};
