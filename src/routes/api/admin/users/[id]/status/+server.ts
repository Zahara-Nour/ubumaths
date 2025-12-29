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

type Profile = Database['public']['Tables']['profiles']['Row'];
type ExtendedProfile = Profile & {
	schools?: { name: string } | null;
};

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid user ID format');

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
 *   gender?: 'boy' | 'girl' | null,
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

	const supabase = locals.supabase;
	const userId = params.id;

	// Validate UUID format
	const uuidValidation = uuidSchema.safeParse(userId);
	if (!uuidValidation.success) {
		throw error(400, 'Invalid user ID format');
	}

	try {
		// Validate request body
		const body = await request.json();
		const validation = updateUserStatusSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { status, rejection_reason, firstname, lastname, gender, school_id, is_test } =
			validation.data;

		// Check if user exists and get current data
		const { data: existingUser, error: checkError } = await supabase
			.from('profiles')
			.select('id, email, firstname, lastname, status')
			.eq('id', userId)
			.maybeSingle();

		if (checkError) {
			console.error('Error checking user existence:', checkError);
			throw error(500, 'Failed to check user existence');
		}

		if (!existingUser) {
			throw error(404, `User with ID "${userId}" not found`);
		}

		// Build update object with status fields
		const updateData: Record<string, unknown> = {
			status,
			rejection_reason: status === 'rejected' ? (rejection_reason ?? null) : null,
			status_changed_at: new Date().toISOString(),
			status_changed_by: approverProfile.id,
			updated_at: new Date().toISOString()
		};

		// Add profile fields if provided (typically when approving)
		if (firstname !== undefined) updateData.firstname = firstname;
		if (lastname !== undefined) updateData.lastname = lastname;
		if (gender !== undefined) updateData.gender = gender;
		if (school_id !== undefined) updateData.school_id = school_id;
		if (is_test !== undefined) updateData.is_test = is_test;

		// Update profile
		const { error: updateError } = await supabase
			.from('profiles')
			.update(updateData)
			.eq('id', userId);

		if (updateError) {
			console.error('Error updating user status:', updateError);
			throw error(500, 'Failed to update user status');
		}

		// If approving, create notifications
		if (status === 'approved') {
			const fullName =
				existingUser.firstname && existingUser.lastname
					? `${existingUser.firstname} ${existingUser.lastname}`
					: existingUser.email;

			// Notification for the approved user
			await createSystemNotification(supabase, {
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

			// Notify teachers of the student's classes
			const { data: studentClasses } = await supabase
				.from('class_members')
				.select('class_id, classes!inner(id, name, teacher_id)')
				.eq('student_id', userId);

			if (studentClasses && studentClasses.length > 0) {
				// Get unique teacher IDs with their class info
				const teacherClassMap = new Map<
					string,
					{ teacherId: string; classNames: string[]; studentId: string }
				>();

				for (const membership of studentClasses) {
					const classInfo = membership.classes as unknown as {
						id: string;
						name: string;
						teacher_id: string | null;
					};
					if (classInfo?.teacher_id) {
						const existing = teacherClassMap.get(classInfo.teacher_id);
						if (existing) {
							existing.classNames.push(classInfo.name);
						} else {
							teacherClassMap.set(classInfo.teacher_id, {
								teacherId: classInfo.teacher_id,
								classNames: [classInfo.name],
								studentId: userId
							});
						}
					}
				}

				// Create notification for each unique teacher
				for (const { teacherId, classNames, studentId } of teacherClassMap.values()) {
					const classText =
						classNames.length === 1
							? `la classe ${classNames[0]}`
							: `les classes ${classNames.join(', ')}`;

					await createSystemNotification(supabase, {
						title: 'Nouvel élève approuvé',
						message: `${fullName} a été ajouté à ${classText}. Vous pouvez lui envoyer un email de bienvenue.`,
						type: 'info',
						priority: 'normal',
						system_event_type: 'student_approved',
						target_type: 'users',
						target_user_ids: [teacherId],
						action_label: 'Envoyer email de bienvenue',
						action_url: `/dashboard/teacher/welcome-email?student_id=${studentId}`
					});
				}
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
			console.error('Error fetching updated profile:', fetchError);
			throw error(500, 'Failed to fetch updated profile');
		}

		const extendedProfile: ExtendedProfile = updatedProfile;

		return json({
			success: true,
			profile: extendedProfile
		});
	} catch (err) {
		console.error('Error in PATCH /api/admin/users/[id]/status:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Internal server error');
	}
};
