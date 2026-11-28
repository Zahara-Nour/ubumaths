/**
 * Carnet de liaison — la page du parent (ADR 0040 ; B1-B5, E5).
 *
 * Accessible SANS COMPTE : le jeton dans l'URL est le seul secret, et il ne
 * donne que le carnet d'UN élève. Tous les échecs (révoqué, expiré, inexistant,
 * partage coupé, élève sorti de la classe) rendent la MÊME page (B4).
 *
 * Le jeton n'est pas stocké en clair : un lien perdu ne se retrouve pas, on en
 * émet un neuf.
 */

import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import {
	carnetTokenSchema,
	INVALID_CARNET_LINK,
	readCarnetByToken,
	setParentEmailsStopped
} from '#lib/server/carnet/carnet.ts';
import { rateLimit } from '#lib/server/middleware/rateLimit.ts';

// Constantes

/** Un parent relit sa page quelques fois ; deviner un jeton demanderait des milliards d'essais. */
const MAX_PER_MINUTE = 30;

// Functions

/** Forme du jeton, puis limite de débit par IP : rien n'atteint la base avant. */
async function guardedToken(event: Pick<RequestEvent, 'params' | 'getClientAddress'>) {
	const parsed = carnetTokenSchema.safeParse(event.params.token);
	if (!parsed.success) throw error(404, INVALID_CARNET_LINK);
	await rateLimit(`carnet:${event.getClientAddress()}`, MAX_PER_MINUTE, 60_000);
	return parsed.data;
}

async function setEmails(event: RequestEvent, stopped: boolean) {
	const token = await guardedToken(event);
	if (!(await setParentEmailsStopped(token, stopped))) throw error(404, INVALID_CARNET_LINK);
	return { emails: stopped ? ('stopped' as const) : ('resumed' as const) };
}

export const load: PageServerLoad = async (event) => {
	// Le suivi d'un élève : ni moteur de recherche, ni cache partagé. Referer :
	// `<meta name="referrer" content="no-referrer">` dans la page (l'en-tête est
	// posé pour tout le site par hooks.server.ts).
	event.setHeaders({
		'X-Robots-Tag': 'noindex, nofollow',
		'Cache-Control': 'private, no-store'
	});

	const token = await guardedToken(event);
	const carnet = await readCarnetByToken(token);
	if (!carnet) throw error(404, INVALID_CARNET_LINK);

	// Le jeton ne redescend pas : la page n'en a pas besoin (moins de copies).
	return { carnet };
};

export const actions: Actions = {
	// « Ne plus recevoir ces courriels » (Q9, E5) : le carnet reste ouvert.
	stopEmails: (event) => setEmails(event, true),
	// Réabonnement depuis le carnet (E5).
	resumeEmails: (event) => setEmails(event, false)
};
