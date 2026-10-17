import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unrestrictUserSchema } from '$lib/server/validation/moderation';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/moderation/unrestrict-user/+server');

/**
 * DELETE /api/moderation/unrestrict-user
 *
 * Lifts a restriction (unmute, unban, etc.) by deleting the restriction record.
 * Only accessible by teachers and admins.
 *
 * Request body:
 * - restrictionId: UUID of the restriction to remove
 *
 * Responses:
 * - 200: Restriction removed successfully
 * - 400: Validation failed
 * - 401: Not authenticated
 * - 403: Not a teacher/admin OR not the teacher who created the restriction
 *        OR the deletion touched no row (refused by RLS)
 * - 404: Restriction not found
 * - 500: Database error
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	// 1. Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	// 2. Check teacher role
	if (!locals.profile || !['teacher', 'admin'].includes(locals.profile.role ?? '')) {
		throw error(403, 'Only teachers and admins can unrestrict users');
	}

	// 3. Parse and validate input
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const validation = unrestrictUserSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { restrictionId } = validation.data;

	// 4. Fetch restriction to verify it exists and get details for logging
	const { data: restriction, error: fetchError } = await locals.supabase
		.from('user_restrictions')
		.select('*')
		.eq('id', restrictionId)
		.maybeSingle();

	if (fetchError) {
		logger.error('Failed to fetch restriction:', fetchError);
		throw error(500, 'Failed to fetch restriction');
	}

	if (!restriction) {
		throw error(404, 'Restriction not found');
	}

	// 5. Verify teacher has permission to unrestrict
	// Note: RLS allows any teacher/admin to delete, but we add application-level enforcement
	// Admins can unrestrict anyone, teachers can only unrestrict restrictions they created
	if (locals.profile?.role !== 'admin' && restriction.restricted_by !== locals.user.id) {
		throw error(403, 'You can only remove restrictions that you created');
	}

	// 6. Delete restriction
	// ⚠️ Une suppression refusée par la RLS ne lève aucune erreur : elle touche
	// zéro ligne. Sans les lignes rendues, le prof croyait la restriction levée
	// alors que l'élève restait restreint (cf. docs/pratiques/rls-echecs-silencieux.md).
	const { data: deletedRestrictions, error: deleteError } = await locals.supabase
		.from('user_restrictions')
		.delete()
		.eq('id', restrictionId)
		.select('id');

	if (deleteError) {
		logger.error('Failed to delete restriction:', deleteError);
		throw error(500, 'Failed to remove restriction');
	}

	// La restriction a été lue juste au-dessus : zéro ligne = refus, pas absence.
	if (!deletedRestrictions || deletedRestrictions.length === 0) {
		logger.error('[unrestrict-user] Aucune ligne supprimée pour', restrictionId);
		throw error(403, 'Restriction non levée : droits insuffisants');
	}

	// 7. Log moderation action (determine action type based on restriction type)
	const actionMap = {
		mute: 'unmute_user',
		timeout: 'unmute_user', // Use unmute_user (untimeout_user doesn't exist in DB constraint)
		ban: 'unban_user'
	};
	const action = actionMap[restriction.restriction_type as keyof typeof actionMap];

	const { error: logError } = await locals.supabase.rpc('log_moderation_action', {
		p_action: action,
		p_target_type: 'user',
		p_target_id: restriction.user_id,
		p_reason: `Removed restriction: ${restriction.reason}`,
		p_metadata: {
			original_restriction_id: restrictionId,
			original_restriction_type: restriction.restriction_type,
			original_scope_type: restriction.scope_type,
			original_scope_id: restriction.scope_id,
			original_created_at: restriction.created_at
		}
	});

	if (logError) {
		logger.error('Failed to log moderation action:', logError);
		// Don't fail the request if logging fails
	}

	return json({ success: true, message: 'Restriction removed successfully' }, { status: 200 });
};
