/**
 * API Endpoint: /api/messages/templates/[id]/approve
 *
 * Approve or reject template (admin only)
 *
 * POST - Approve/reject template
 * Body: { action: 'approve' | 'reject', notes?: string }
 */

import { json, error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import type { RequestHandler } from './$types';
import { approveTemplateSchema } from '$lib/server/validation/message-templates';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/messages/templates/[id]/approve/+server');

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { supabase } = locals;
	const { id } = params;

	const { user } = await requireRole(locals, 'admin');

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = approveTemplateSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { action, notes } = validation.data;

	// Get template
	const { data: template, error: fetchError } = await supabase
		.from('message_templates')
		.select('*')
		.eq('id', id)
		.single();

	if (fetchError || !template) {
		return error(404, 'Template non trouvé');
	}

	// Update approval status
	const { data: updated, error: updateError } = await supabase
		.from('message_templates')
		.update({
			approval_status: action === 'approve' ? 'approved' : 'rejected',
			reviewed_by: user.id,
			reviewed_at: new Date().toISOString(),
			review_notes: notes || null
		})
		.eq('id', id)
		.select()
		.single();

	if (updateError) {
		logger.error('Error updating approval status:', updateError);
		return error(500, 'Erreur lors de la mise à jour du statut');
	}

	// Log action
	await supabase.rpc('log_template_action', {
		p_template_id: id,
		p_action: action === 'approve' ? 'approved' : 'rejected',
		p_performed_by: user.id,
		p_metadata: notes ? { notes: notes } : null
	});

	return json({
		template: updated,
		message: `Template ${action === 'approve' ? 'approuvé' : 'rejeté'} avec succès`
	});
};
