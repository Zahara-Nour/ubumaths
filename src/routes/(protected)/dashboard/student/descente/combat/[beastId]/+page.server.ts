/**
 * La Descente de la Vistule — combat d'une Bête (étape 3)
 * =======================================================
 *
 * Élève seul. Ouvre le combat aux droits de l'élève de la session
 * (`openCombat`) : la Bête (à lui, vivante), remise en pleine forme si elle est
 * ordinaire, et ses coups ouverts. Une Bête introuvable, vaincue ou repartie,
 * ou un élève sans niveau : la page le dit (`unavailable`), sans combat.
 *
 * ⚠️ Aucune page n'y mène encore : la carte arrive à l'étape 4.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { validateUuidParam } from '#lib/server/validation/params.ts';
import { CombatError, openCombat, type CombatErrorCode } from '#lib/server/descente/combat.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('(protected)/dashboard/student/descente/combat/+page.server');

export const load: PageServerLoad = async ({ params, locals }) => {
	const beastId = validateUuidParam(params.beastId, 'beastId');
	const { user } = await requireRole(locals, 'student');

	try {
		const combat = await openCombat(locals.supabase, user.id, beastId);
		return { combat, unavailable: null };
	} catch (err) {
		if (err instanceof CombatError) {
			return { combat: null, unavailable: err.code as CombatErrorCode };
		}
		logger.error('Combat illisible :', err);
		return { combat: null, unavailable: 'server_error' as const };
	}
};
