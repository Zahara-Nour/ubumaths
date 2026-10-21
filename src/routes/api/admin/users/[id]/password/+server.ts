/**
 * Mot de passe provisoire d'un élève (PR 3)
 * =========================================
 *
 * Endpoint: POST /api/admin/users/[id]/password
 *
 * Le prof (ou l'admin) réinitialise le mot de passe d'un élève qui l'a perdu : un mot de
 * passe provisoire est généré, appliqué, et rendu UNE fois (ni stocké ni journalisé).
 * L'élève est déconnecté partout (GoTrue ferme les sessions) et devra choisir le sien à la
 * connexion suivante (`passwordChangeHandle`).
 *
 * Security: Teacher OR Admin role, target must be a student (`verifyTeacherStudent` :
 * jamais un prof, un admin ni soi-même).
 *
 * @module api/admin/users/[id]/password
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRoles } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { setProvisionalPassword } from '$lib/server/child-password';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/admin/users/[id]/password/+server');

const uuidSchema = z.string().uuid('Identifiant d’utilisateur invalide');

export const POST: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	const validation = uuidSchema.safeParse(params.id);
	if (!validation.success) {
		throw error(400, 'Identifiant d’utilisateur invalide');
	}
	const studentId = validation.data;

	if (!(await verifyTeacherStudent(user.id, studentId, locals.supabase))) {
		throw error(403, 'Réinitialisation réservée aux comptes d’élèves');
	}

	const result = await setProvisionalPassword(createServiceRoleClient(), studentId);
	if (!result.ok) {
		throw error(500, 'Le mot de passe n’a pas pu être réinitialisé. Réessayer.');
	}

	logger.info('Provisional password set for a student');
	return json({ password: result.password }, { headers: { 'Cache-Control': 'no-store' } });
};
