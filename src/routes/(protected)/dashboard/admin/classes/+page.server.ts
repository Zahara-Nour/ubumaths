import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';
import {
	adminClassCreateSchema,
	adminClassIdSchema,
	adminClassUpdateSchema
} from '$lib/server/validation/admin';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/admin/classes/+page.server');

/** Les champs du formulaire, un champ absent valant `undefined`. */
function formFields(formData: FormData, names: string[]): Record<string, unknown> {
	return Object.fromEntries(names.map((name) => [name, formData.get(name) ?? undefined]));
}

export const load: PageServerLoad = async ({ locals }) => {
	// Admin gate (admin login OR step-up elevation)
	const { supabase } = await requireAdmin(locals);

	// Fetch all schools
	const { data: schools, error: schoolsError } = await supabase
		.from('schools')
		.select('*')
		.order('name');

	if (schoolsError) {
		logger.error('Error fetching schools:', schoolsError);
		throw error(500, 'Failed to load schools');
	}

	// Mono-teacher: classes are no longer assigned to a teacher (teacher_id dropped).
	// Fetch all classes with school info.
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select(
			`
			*,
			school:schools(id, name)
		`
		)
		.order('name');

	if (classesError) {
		logger.error('Error fetching classes:', classesError);
		throw error(500, 'Failed to load classes');
	}

	// Count students for each class
	const classesWithCounts = await Promise.all(
		(classes || []).map(async (classItem) => {
			const { count, error: countError } = await supabase
				.from('profiles')
				.select('id', { count: 'exact', head: true })
				.contains('class_ids', [classItem.id]);

			if (countError) {
				logger.error(`Error counting students for class ${classItem.id}:`, countError);
			}

			return {
				...classItem,
				student_count: count || 0
			};
		})
	);

	return {
		schools: schools || [],
		classes: classesWithCounts || []
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		// Admin gate (admin login OR step-up elevation)
		const { supabase } = await requireAdmin(locals);

		const parsed = adminClassCreateSchema.safeParse(
			formFields(await request.formData(), [
				'name',
				'description',
				'school_id',
				'grade',
				'join_code'
			])
		);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message });
		}
		const { name, description, school_id, grade } = parsed.data;

		// Generate or use custom join code
		let join_code = parsed.data.join_code;

		if (!join_code) {
			// Auto-generate join code
			const { data: generatedCode, error: rpcError } = await supabase.rpc('generate_join_code');

			if (rpcError || !generatedCode) {
				logger.error('Error generating join code:', rpcError);
				return fail(500, { message: 'Failed to generate join code' });
			}

			join_code = generatedCode;
		} else {
			// Validate custom join code is unique
			const { data: existingClass, error: checkError } = await supabase
				.from('classes')
				.select('id')
				.eq('join_code', join_code)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				// PGRST116 = no rows returned (good, code is unique)
				logger.error('Error checking join code:', checkError);
				return fail(400, { message: 'Error validating join code' });
			}

			if (existingClass) {
				return fail(400, { message: 'Join code already exists. Please choose another.' });
			}
		}

		// Insert class
		const { error: insertError } = await supabase.from('classes').insert({
			name,
			description,
			school_id,
			grade,
			join_code,
			is_active: true
		});

		if (insertError) {
			logger.error('Error creating class:', insertError);
			return fail(400, { message: insertError.message });
		}

		return { success: true };
	},

	update: async ({ request, locals }) => {
		// Admin gate (admin login OR step-up elevation)
		const { supabase } = await requireAdmin(locals);

		const parsed = adminClassUpdateSchema.safeParse(
			formFields(await request.formData(), [
				'id',
				'name',
				'description',
				'school_id',
				'grade',
				'join_code',
				'is_active'
			])
		);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message });
		}
		const { id, name, description, school_id, grade, join_code, is_active } = parsed.data;

		// If join code changed, validate it's unique
		const { data: currentClass, error: fetchError } = await supabase
			.from('classes')
			.select('join_code')
			.eq('id', id)
			.single();

		if (fetchError) {
			logger.error('Error fetching current class:', fetchError);
			return fail(400, { message: 'Failed to fetch class' });
		}

		if (join_code !== currentClass.join_code) {
			// Validate new join code is unique
			const { data: existingClass, error: checkError } = await supabase
				.from('classes')
				.select('id')
				.eq('join_code', join_code)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				logger.error('Error checking join code:', checkError);
				return fail(400, { message: 'Error validating join code' });
			}

			if (existingClass) {
				return fail(400, { message: 'Join code already exists. Please choose another.' });
			}
		}

		// Update class
		// ⚠️ Une mise à jour refusée par la RLS touche zéro ligne sans erreur :
		// `.select()` pour ne pas annoncer un succès qui n'a pas eu lieu
		// (cf. docs/pratiques/rls-echecs-silencieux.md).
		const { data: updatedClasses, error: updateError } = await supabase
			.from('classes')
			.update({
				name,
				description,
				school_id,
				grade,
				join_code,
				is_active
			})
			.eq('id', id)
			.select('id');

		if (updateError) {
			logger.error('Error updating class:', updateError);
			return fail(400, { message: updateError.message });
		}

		// La classe a été lue juste au-dessus : zéro ligne = refus, pas absence.
		if (!updatedClasses || updatedClasses.length === 0) {
			logger.error('[admin/classes update] Aucune ligne modifiée pour', id);
			return fail(403, { message: 'Classe non modifiée : droits insuffisants' });
		}

		return { success: true };
	},

	deactivate: async ({ request, locals }) => {
		// Admin gate (admin login OR step-up elevation)
		const { supabase } = await requireAdmin(locals);

		const parsed = adminClassIdSchema.safeParse(formFields(await request.formData(), ['id']));
		if (!parsed.success) {
			return fail(400, { message: 'Identifiant de classe invalide' });
		}
		const { id } = parsed.data;

		// Zéro ligne touchée (classe inconnue ou refus de la RLS) n'est pas un succès.
		const { data: updatedClasses, error: updateError } = await supabase
			.from('classes')
			.update({ is_active: false })
			.eq('id', id)
			.select('id');

		if (updateError) {
			logger.error('Error deactivating class:', updateError);
			return fail(400, { message: updateError.message });
		}

		if (!updatedClasses || updatedClasses.length === 0) {
			return fail(404, { message: 'Classe introuvable : non désactivée' });
		}

		return { success: true };
	},

	activate: async ({ request, locals }) => {
		// Admin gate (admin login OR step-up elevation)
		const { supabase } = await requireAdmin(locals);

		const parsed = adminClassIdSchema.safeParse(formFields(await request.formData(), ['id']));
		if (!parsed.success) {
			return fail(400, { message: 'Identifiant de classe invalide' });
		}
		const { id } = parsed.data;

		// Zéro ligne touchée (classe inconnue ou refus de la RLS) n'est pas un succès.
		const { data: updatedClasses, error: updateError } = await supabase
			.from('classes')
			.update({ is_active: true })
			.eq('id', id)
			.select('id');

		if (updateError) {
			logger.error('Error activating class:', updateError);
			return fail(400, { message: updateError.message });
		}

		if (!updatedClasses || updatedClasses.length === 0) {
			return fail(404, { message: 'Classe introuvable : non activée' });
		}

		return { success: true };
	}
};
