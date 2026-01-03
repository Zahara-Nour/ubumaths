import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { updateConfigSchema } from '$lib/server/marketplace/validation';
import { z } from 'zod';

// Query schema
const configQuerySchema = z.object({
	class_id: z.string().uuid('ID de classe invalide').nullish(),
	school_id: z.string().uuid("ID d'école invalide").nullish()
});

/**
 * GET /api/marketplace/config
 * Get marketplace configuration(s)
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

	// Validate query parameters
	const queryValidation = configQuerySchema.safeParse({
		class_id: url.searchParams.get('class_id'),
		school_id: url.searchParams.get('school_id')
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { class_id, school_id } = queryValidation.data;

	// Handle different roles
	if (profile.role === 'admin') {
		// Admin can see school-level or specific class config
		if (school_id) {
			// Verify admin belongs to this school
			if (profile.school_id !== school_id) {
				throw error(403, 'Accès non autorisé à cette école');
			}

			const { data: config, error: configError } = await supabase
				.from('marketplace_config')
				.select('*')
				.eq('school_id', school_id)
				.is('class_id', null)
				.single();

			if (configError) {
				// No school-level config exists yet
				return json({ config: null });
			}

			return json({ config });
		} else if (class_id) {
			// Get class-specific config
			const { data: config, error: configError } = await supabase
				.from('marketplace_config')
				.select('*')
				.eq('class_id', class_id)
				.single();

			if (configError) {
				return json({ config: null });
			}

			return json({ config });
		} else {
			// Get all configs for the school
			const { data: configs, error: configsError } = await supabase
				.from('marketplace_config')
				.select(
					`
          *,
          class:classes(
            id,
            name,
            grade
          )
        `
				)
				.eq('school_id', profile.school_id);

			if (configsError) {
				console.error('Error fetching configs:', configsError);
				throw error(500, 'Erreur lors de la récupération des configurations');
			}

			return json({ configs: configs || [] });
		}
	} else if (profile.role === 'student') {
		// Student can only see their class's config
		// Get student's class membership
		const { data: membership, error: membershipError } = await supabase
			.from('class_members')
			.select('class_id')
			.eq('student_id', userId)
			.limit(1)
			.single();

		if (membershipError || !membership) {
			// Student not in any class
			return json({ config: null });
		}

		const { data: config, error: configError } = await supabase
			.from('marketplace_config')
			.select('*')
			.eq('class_id', membership.class_id)
			.single();

		if (configError) {
			// No config for this class
			return json({ config: null });
		}

		return json({ config });
	} else if (profile.role === 'teacher') {
		// Teacher can only see configs for their classes
		if (class_id) {
			// Verify teacher owns this class
			const { data: classData, error: classError } = await supabase
				.from('classes')
				.select('teacher_id')
				.eq('id', class_id)
				.single();

			if (classError || !classData || classData.teacher_id !== userId) {
				throw error(403, 'Accès non autorisé à cette classe');
			}

			const { data: config, error: configError } = await supabase
				.from('marketplace_config')
				.select('*')
				.eq('class_id', class_id)
				.single();

			if (configError) {
				return json({ config: null });
			}

			return json({ config });
		} else {
			// Get all configs for teacher's classes
			const { data: configs, error: configsError } = await supabase
				.from('marketplace_config')
				.select(
					`
          *,
          class:classes!marketplace_config_class_id_fkey(
            id,
            name,
            grade
          )
        `
				)
				.eq('class.teacher_id', userId);

			if (configsError) {
				console.error('Error fetching configs:', configsError);
				throw error(500, 'Erreur lors de la récupération des configurations');
			}

			return json({ configs: configs || [] });
		}
	} else {
		throw error(403, 'Accès réservé aux enseignants et administrateurs');
	}
};

/**
 * PATCH /api/marketplace/config
 * Update marketplace configuration
 */
export const PATCH: RequestHandler = async ({ url, request, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Get class_id or school_id from query params
	const classId = url.searchParams.get('class_id');
	const schoolId = url.searchParams.get('school_id');

	if (!classId && !schoolId) {
		throw error(400, 'class_id ou school_id requis');
	}

	if (classId && schoolId) {
		throw error(400, 'Spécifiez soit class_id soit school_id, pas les deux');
	}

	// Validate request body
	const body = await request.json().catch(() => ({}));
	const validation = updateConfigSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const updates = validation.data;

	// Get user profile
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role, school_id')
		.eq('id', userId)
		.single();

	if (profileError || !profile) {
		throw error(404, 'Profil non trouvé');
	}

	if (classId) {
		// Updating class-level config
		if (profile.role === 'teacher') {
			// Verify teacher owns this class
			const { data: classData, error: classError } = await supabase
				.from('classes')
				.select('teacher_id, school_id')
				.eq('id', classId)
				.single();

			if (classError || !classData || classData.teacher_id !== userId) {
				throw error(403, 'Vous ne pouvez pas modifier la configuration de cette classe');
			}

			// Check if config exists
			const { data: existingConfig } = await supabase
				.from('marketplace_config')
				.select('id')
				.eq('class_id', classId)
				.single();

			if (existingConfig) {
				// Update existing config
				const { data: updatedConfig, error: updateError } = await supabase
					.from('marketplace_config')
					.update({
						...updates,
						updated_at: new Date().toISOString()
					})
					.eq('class_id', classId)
					.select()
					.single();

				if (updateError) {
					console.error('Error updating config:', updateError);
					throw error(500, 'Erreur lors de la mise à jour de la configuration');
				}

				return json(updatedConfig);
			} else {
				// Create new config (class-level: only class_id, no school_id due to XOR constraint)
				const { data: newConfig, error: createError } = await supabase
					.from('marketplace_config')
					.insert({
						class_id: classId,
						...updates
					})
					.select()
					.single();

				if (createError) {
					console.error('Error creating config:', createError);
					throw error(500, 'Erreur lors de la création de la configuration');
				}

				return json(newConfig, { status: 201 });
			}
		} else if (profile.role === 'admin') {
			// Admin can update any class in their school
			const { data: classData, error: classError } = await supabase
				.from('classes')
				.select('school_id')
				.eq('id', classId)
				.single();

			if (classError || !classData || classData.school_id !== profile.school_id) {
				throw error(403, "Cette classe n'appartient pas à votre école");
			}

			// Similar update/create logic as above
			const { data: existingConfig } = await supabase
				.from('marketplace_config')
				.select('id')
				.eq('class_id', classId)
				.single();

			if (existingConfig) {
				const { data: updatedConfig, error: updateError } = await supabase
					.from('marketplace_config')
					.update({
						...updates,
						updated_at: new Date().toISOString()
					})
					.eq('class_id', classId)
					.select()
					.single();

				if (updateError) {
					throw error(500, 'Erreur lors de la mise à jour de la configuration');
				}

				return json(updatedConfig);
			} else {
				// Create new config (class-level: only class_id, no school_id due to XOR constraint)
				const { data: newConfig, error: createError } = await supabase
					.from('marketplace_config')
					.insert({
						class_id: classId,
						...updates
					})
					.select()
					.single();

				if (createError) {
					throw error(500, 'Erreur lors de la création de la configuration');
				}

				return json(newConfig, { status: 201 });
			}
		} else {
			throw error(403, 'Accès réservé aux enseignants et administrateurs');
		}
	} else if (schoolId) {
		// Updating school-level config (admin or teacher in that school)
		if (profile.role !== 'admin' && profile.role !== 'teacher') {
			throw error(
				403,
				'Seuls les enseignants et administrateurs peuvent modifier la configuration'
			);
		}

		if (profile.school_id !== schoolId) {
			throw error(403, "Vous ne pouvez pas modifier la configuration d'une autre école");
		}

		// Check if school config exists
		const { data: existingConfig } = await supabase
			.from('marketplace_config')
			.select('id')
			.eq('school_id', schoolId)
			.is('class_id', null)
			.single();

		if (existingConfig) {
			// Update existing config
			const { data: updatedConfig, error: updateError } = await supabase
				.from('marketplace_config')
				.update({
					...updates,
					updated_at: new Date().toISOString()
				})
				.eq('school_id', schoolId)
				.is('class_id', null)
				.select()
				.single();

			if (updateError) {
				console.error('Error updating school config:', updateError);
				throw error(500, 'Erreur lors de la mise à jour de la configuration');
			}

			return json(updatedConfig);
		} else {
			// Create new school config
			const { data: newConfig, error: createError } = await supabase
				.from('marketplace_config')
				.insert({
					school_id: schoolId,
					class_id: null,
					...updates
				})
				.select()
				.single();

			if (createError) {
				console.error('Error creating school config:', createError);
				throw error(500, 'Erreur lors de la création de la configuration');
			}

			return json(newConfig, { status: 201 });
		}
	}

	// Should never reach here
	throw error(400, 'Requête invalide');
};
