/**
 * User Status API (Approve/Reject)
 * =================================
 *
 * Endpoint: PATCH /api/admin/users/[id]/status
 *
 * Updates user approval status (approve or reject pending users).
 * Teachers and admins can both approve/reject users.
 *
 * Security: Teacher OR Admin role required
 * Validation: Zod (updateUserStatusSchema)
 *
 * @module api/admin/users/[id]/status
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { updateUserStatusSchema } from '$lib/server/validation/admin';
import { requireRoles } from '$lib/server/middleware/auth';
import { createSystemNotification } from '$lib/server/notifications';
import type { Database } from '$lib/types/database';
import type { TablesUpdate } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/admin/users/[id]/status/+server');

type Profile = Database['public']['Tables']['profiles']['Row'];
type ExtendedProfile = Profile & {
	schools?: { name: string } | null;
};

// UUID validation schema
const uuidSchema = z.string().uuid('Identifiant d’utilisateur invalide');

/**
 * PATCH /api/admin/users/[id]/status
 *
 * Update user approval status (approve or reject)
 * When approving, profile fields can also be updated in the same request
 *
 * Request body:
 * {
 *   status: 'approved' | 'rejected',
 *   rejection_reason?: string | null,  // Required if status is 'rejected'
 *   // Optional profile fields (typically used when approving):
 *   firstname?: string | null,
 *   lastname?: string | null,
 *   school_id?: string | null,
 *   is_test?: boolean
 * }
 *
 * Response: 200 with updated profile
 * {
 *   success: true,
 *   profile: ExtendedProfile
 * }
 *
 * Errors:
 *   - 400: Invalid UUID or validation error
 *   - 401: Not authenticated
 *   - 403: Not teacher or admin
 *   - 404: User not found
 *   - 500: Server error
 */
export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	// Authentication and authorization: teacher OR admin
	const { profile: approverProfile } = await requireRoles(locals, ['teacher', 'admin']);

	// En élévation admin, le client admin porte le JWT de l'admin : nécessaire pour
	// modifier is_test, réservé à l'admin par la base (migration 20261001180000).
	const supabase = locals.adminSupabase ?? locals.supabase;
	const userId = params.id;

	// Validate UUID format
	const uuidValidation = uuidSchema.safeParse(userId);
	if (!uuidValidation.success) {
		throw error(400, 'Identifiant d’utilisateur invalide');
	}

	try {
		// Validate request body
		const body = await request.json();
		const validation = updateUserStatusSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { status, rejection_reason, firstname, lastname, school_id, is_test } = validation.data;

		// Check if user exists and get current data
		const { data: existingUser, error: checkError } = await supabase
			.from('profiles')
			.select('id, email, firstname, lastname, status, is_test')
			.eq('id', userId)
			.maybeSingle();

		if (checkError) {
			logger.error('Error checking user existence:', checkError);
			throw error(500, 'Impossible de vérifier le compte');
		}

		if (!existingUser) {
			throw error(404, 'Utilisateur introuvable');
		}

		// is_test est réservé à l'admin : on le refuse clairement ici plutôt que de
		// laisser la base faire échouer toute l'approbation en 500.
		if (
			is_test !== undefined &&
			is_test !== existingUser.is_test &&
			approverProfile.role !== 'admin' &&
			!locals.adminSupabase
		) {
			throw error(403, 'Seul l’administrateur peut changer le statut « compte de test »');
		}

		// Build update object with status fields
		// Le type généré décrit exactement les colonnes acceptées ; un
		// `Record<string, unknown>` laissait passer n'importe quel nom de champ
		// jusqu'à PostgREST, qui rejetait alors la requête entière.
		const updateData: TablesUpdate<'profiles'> = {
			status,
			rejection_reason: status === 'rejected' ? (rejection_reason ?? null) : null,
			status_changed_at: new Date().toISOString(),
			status_changed_by: approverProfile.id,
			updated_at: new Date().toISOString()
		};

		// Add profile fields if provided (typically when approving)
		if (firstname !== undefined) updateData.firstname = firstname;
		if (lastname !== undefined) updateData.lastname = lastname;
		if (school_id !== undefined) updateData.school_id = school_id;
		if (is_test !== undefined) updateData.is_test = is_test;

		// Update profile
		const { error: updateError } = await supabase
			.from('profiles')
			.update(updateData)
			.eq('id', userId);

		if (updateError) {
			logger.error('Error updating user status:', updateError);
			throw error(500, 'Impossible de modifier le statut du compte');
		}

		// If approving, create notifications
		if (status === 'approved') {
			const fullName =
				existingUser.firstname && existingUser.lastname
					? `${existingUser.firstname} ${existingUser.lastname}`
					: existingUser.email;

			// Notification for the approved user
			await createSystemNotification({
				title: 'Compte approuvé',
				message: `Bienvenue ${fullName} ! Votre compte a été approuvé. Vous pouvez maintenant accéder à toutes les fonctionnalités de l'application.`,
				type: 'info',
				priority: 'important',
				system_event_type: 'user_approved',
				target_type: 'users',
				target_user_ids: [userId],
				action_label: 'Accéder au tableau de bord',
				action_url: '/dashboard'
			});

			// Prévenir le professeur si l'élève est déjà inscrit dans des classes.
			// Modèle mono-professeur : `classes.teacher_id` n'existe plus (migration
			// 20260620090000), toutes les classes sont celles du professeur.
			const { data: studentClasses, error: studentClassesError } = await supabase
				.from('class_members')
				.select('class_id, classes!inner(name)')
				.eq('student_id', userId);

			if (studentClassesError) {
				logger.error('Lecture impossible :', studentClassesError);
				throw error(500, 'Impossible de charger les données');
			}

			const classNames = (studentClasses ?? []).map((membership) => membership.classes.name);

			if (classNames.length > 0) {
				const classText =
					classNames.length === 1
						? `la classe ${classNames[0]}`
						: `les classes ${classNames.join(', ')}`;

				await createSystemNotification({
					title: 'Nouvel élève approuvé',
					message: `${fullName} a été ajouté à ${classText}. Vous pouvez lui envoyer un email de bienvenue.`,
					type: 'info',
					priority: 'normal',
					system_event_type: 'student_approved',
					target_type: 'role',
					target_roles: ['teacher'],
					action_label: 'Envoyer email de bienvenue',
					action_url: `/dashboard/teacher/welcome-email?student_id=${userId}`
				});
			}
		}

		// Fetch updated profile with school relation
		const { data: updatedProfile, error: fetchError } = await supabase
			.from('profiles')
			.select(
				`
				*,
				schools (name)
			`
			)
			.eq('id', userId)
			.single();

		if (fetchError) {
			logger.error('Error fetching updated profile:', fetchError);
			throw error(500, 'Impossible de recharger le profil');
		}

		const extendedProfile: ExtendedProfile = updatedProfile;

		return json({
			success: true,
			profile: extendedProfile
		});
	} catch (err) {
		logger.error('Error in PATCH /api/admin/users/[id]/status:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Une erreur inattendue s’est produite');
	}
};
