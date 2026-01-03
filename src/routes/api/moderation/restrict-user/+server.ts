import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { restrictUserSchema } from '$lib/server/validation/moderation';

/**
 * POST /api/moderation/restrict-user
 *
 * Restricts a user (mute, timeout, or ban) at conversation or global scope.
 * Only accessible by teachers and admins.
 *
 * Request body:
 * - userId: UUID of the user to restrict
 * - scopeType: 'conversation' | 'global'
 * - scopeId: UUID of conversation (required if scopeType is 'conversation')
 * - restrictionType: 'mute' | 'timeout' | 'ban'
 * - reason: String (5-500 characters)
 * - expiresAt: ISO 8601 datetime string or null (null = permanent)
 *
 * Responses:
 * - 201: Restriction created successfully
 * - 400: Validation failed
 * - 401: Not authenticated
 * - 403: Not a teacher/admin OR not teacher's conversation
 * - 404: Conversation not found
 * - 409: Duplicate active restriction
 * - 500: Database error
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	// 2. Check teacher role
	if (!locals.profile || !['teacher', 'admin'].includes(locals.profile.role ?? '')) {
		throw error(403, 'Only teachers and admins can restrict users');
	}

	// 3. Parse and validate input
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const validation = restrictUserSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { userId, scopeType, scopeId, restrictionType, reason, expiresAt } = validation.data;

	// 4. Verify target user exists and get their role
	const { data: targetUser, error: targetUserError } = await locals.supabase
		.from('profiles')
		.select('id, role')
		.eq('id', userId)
		.maybeSingle();

	if (targetUserError) {
		console.error('Failed to fetch target user:', targetUserError);
		throw error(500, 'Failed to verify user');
	}

	if (!targetUser) {
		throw error(404, 'User not found');
	}

	// Teachers cannot restrict other teachers or admins
	if (locals.profile?.role === 'teacher' && targetUser.role !== 'student') {
		throw error(403, 'Teachers can only restrict students');
	}

	// 5. Additional authorization checks
	if (scopeType === 'global') {
		// CRITICAL FIX: For global restrictions, verify teacher has access to this student
		if (locals.profile?.role !== 'admin') {
			// Admins can globally restrict anyone
			// Teachers can only globally restrict students in their classes
			const { data: membership, error: membershipError } = await locals.supabase
				.from('class_members')
				.select('student_id, classes!inner(teacher_id)')
				.eq('student_id', userId)
				.eq('status', 'active')
				.eq('classes.teacher_id', locals.user.id)
				.maybeSingle();

			if (membershipError) {
				console.error('Failed to verify teacher-student relationship:', membershipError);
				throw error(500, 'Failed to verify authorization');
			}

			if (!membership) {
				throw error(403, 'You can only restrict students in your classes');
			}
		}
	} else if (scopeType === 'conversation' && scopeId) {
		// For conversation-scoped restrictions, verify teacher has moderation rights
		// Either: teacher is participant OR student is in teacher's classes

		if (locals.profile?.role !== 'admin') {
			// First check if teacher is a participant
			const { data: membership } = await locals.supabase
				.from('conversation_participants')
				.select('user_id')
				.eq('conversation_id', scopeId)
				.eq('user_id', locals.user.id)
				.maybeSingle();

			// If not a participant, verify the target student is in teacher's classes
			if (!membership) {
				const { data: studentMembership, error: studentMembershipError } = await locals.supabase
					.from('class_members')
					.select('student_id, classes!inner(teacher_id)')
					.eq('student_id', userId)
					.eq('status', 'active')
					.eq('classes.teacher_id', locals.user.id)
					.maybeSingle();

				if (studentMembershipError) {
					console.error('Failed to verify teacher-student relationship:', studentMembershipError);
					throw error(500, 'Failed to verify authorization');
				}

				if (!studentMembership) {
					throw error(403, 'You can only restrict students in your classes');
				}
			}
		}
	}

	// 6. Insert restriction
	const { data: restriction, error: insertError } = await locals.supabase
		.from('user_restrictions')
		.insert({
			user_id: userId,
			scope_type: scopeType,
			scope_id: scopeId,
			restriction_type: restrictionType,
			reason,
			restricted_by: locals.user.id,
			expires_at: expiresAt
		})
		.select()
		.single();

	if (insertError) {
		// Check for unique constraint violation (duplicate active restriction)
		if (insertError.code === '23505') {
			throw error(409, 'User already has an active restriction of this type in this scope');
		}
		console.error('Failed to create restriction:', insertError);
		throw error(500, 'Failed to create restriction');
	}

	// 7. Log moderation action
	const { error: logError } = await locals.supabase.rpc('log_moderation_action', {
		p_action: `${restrictionType}_user`,
		p_target_type: 'user',
		p_target_id: userId,
		p_reason: reason,
		p_metadata: {
			restriction_id: restriction.id,
			scope_type: scopeType,
			scope_id: scopeId,
			expires_at: expiresAt
		}
	});

	if (logError) {
		console.error('Failed to log moderation action:', logError);
		// Don't fail the request if logging fails, but log the error
	}

	return json({ success: true, restrictionId: restriction.id }, { status: 201 });
};
