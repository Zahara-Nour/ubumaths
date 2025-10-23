/**
 * API Endpoint: /api/messages/templates/[id]/approve
 *
 * Approve or reject template (admin only)
 *
 * POST - Approve/reject template
 * Body: { action: 'approve' | 'reject', notes?: string }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { supabase, user } = locals;
	const { id } = params;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	// Only admins can approve/reject
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		return error(403, 'Seuls les admins peuvent approuver/rejeter des templates');
	}

	// Parse body
	let body: { action: 'approve' | 'reject'; notes?: string };
	try {
		body = await request.json();
	} catch {
		return error(400, 'Données invalides');
	}

	if (!body.action || !['approve', 'reject'].includes(body.action)) {
		return error(400, 'action doit être "approve" ou "reject"');
	}

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
			approval_status: body.action === 'approve' ? 'approved' : 'rejected',
			reviewed_by: user.id,
			reviewed_at: new Date().toISOString(),
			review_notes: body.notes || null
		})
		.eq('id', id)
		.select()
		.single();

	if (updateError) {
		console.error('Error updating approval status:', updateError);
		return error(500, 'Erreur lors de la mise à jour du statut');
	}

	// Log action
	await supabase.rpc('log_template_action', {
		p_template_id: id,
		p_action: body.action === 'approve' ? 'approved' : 'rejected',
		p_performed_by: user.id,
		p_metadata: body.notes ? { notes: body.notes } : null
	});

	return json({
		template: updated,
		message: `Template ${body.action === 'approve' ? 'approuvé' : 'rejeté'} avec succès`
	});
};
