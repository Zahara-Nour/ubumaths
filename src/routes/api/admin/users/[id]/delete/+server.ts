/**
 * Suppression définitive d'un élève par l'admin (RGPD art. 17)
 * =============================================================
 *
 * DELETE /api/admin/users/[id]/delete
 * Corps : { confirmationName: string } — le nom de l'élève, retapé.
 *
 * Gardes, dans l'ordre (rien n'est écrit avant qu'elles passent) :
 * 1. admin (vrai compte admin ou élévation) — `requireAdmin` ;
 * 2. identifiant UUID, corps valide (Zod) ;
 * 3. jamais son propre compte ;
 * 4. limite de débit par admin ;
 * 5. le compte existe (404 « Élève introuvable ») et c'est un élève (403) ;
 * 6. le nom retapé est exactement celui de l'élève (400).
 *
 * Puis le déroulé commun avec la page Profil (`deleteStudentAccount`), l'admin étant
 * noté dans `account_deletion_audit.requested_by`.
 */

import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/middleware/auth.ts';
import { rateLimit } from '#lib/server/middleware/rateLimit.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { deleteStudentAccount } from '#lib/server/account-deletion.ts';
import { adminDeleteStudentSchema } from '#lib/server/validation/account.ts';
import { matchesDeletionConfirmation } from '#lib/utils/student-deletion.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// ============================================================================
// CONSTANTES
// ============================================================================

const logger = createServerLogger('api/admin/users/[id]/delete');

const uuidSchema = z.string().uuid();

/** Au plus 20 suppressions par heure et par admin (session volée, script). */
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// ============================================================================
// ROUTE
// ============================================================================

export const DELETE: RequestHandler = async ({ request, locals, params, getClientAddress }) => {
	// 1. Admin
	const { adminUserId } = await requireAdmin(locals);

	// 2. Entrées
	const idCheck = uuidSchema.safeParse(params.id);
	if (!idCheck.success) {
		throw error(400, 'Identifiant d’élève invalide');
	}
	const studentId = idCheck.data;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}
	const validation = adminDeleteStudentSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// 3. Jamais son propre compte
	if (studentId === adminUserId) {
		throw error(403, 'Impossible de supprimer son propre compte');
	}

	// 4. Limite de débit
	await rateLimit(`admin_account_delete:${adminUserId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

	// 5. Le compte visé
	const serviceClient = createServiceRoleClient();
	const { data: profile, error: profileError } = await serviceClient
		.from('profiles')
		.select('id, role, firstname, lastname, full_name, email')
		.eq('id', studentId)
		.maybeSingle();

	if (profileError) {
		logger.error('Lecture du profil à supprimer en échec', { studentId, error: profileError });
		throw error(500, 'Erreur lors de la lecture de l’élève');
	}
	if (!profile) {
		throw error(404, 'Élève introuvable');
	}
	if (profile.role !== 'student') {
		throw error(403, 'Seul un compte élève peut être supprimé ici');
	}

	// 6. Le nom retapé
	if (!matchesDeletionConfirmation(validation.data.confirmationName, profile)) {
		throw error(400, 'Le nom saisi ne correspond pas à l’élève');
	}

	logger.info('Suppression d’un élève demandée par l’admin', { studentId, adminUserId });

	await deleteStudentAccount(serviceClient, {
		userId: studentId,
		email: profile.email,
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent'),
		requestedBy: adminUserId
	});

	return Response.json({ success: true });
};
