/**
 * La Descente de la Vistule — réponses HTTP des routes du combat
 * ==============================================================
 *
 * Une `CombatError` devient un 404 ou un 409 au corps `{ error: <code> }`, que la
 * page lit pour dire pourquoi le combat s'arrête ; toute autre erreur, un 500
 * (tracé), sans détail.
 */

import { CombatError } from '#lib/server/descente/combat.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('server/descente/combat-http');

export function combatErrorResponse(err: unknown, where: string): Response {
	if (err instanceof CombatError) {
		return Response.json({ error: err.code }, { status: err.code === 'not_found' ? 404 : 409 });
	}
	logger.error(`[descente] ${where} :`, err);
	return Response.json({ error: 'server_error' }, { status: 500 });
}
