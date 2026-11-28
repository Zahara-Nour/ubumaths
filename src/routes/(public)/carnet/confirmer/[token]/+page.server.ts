/**
 * Carnet de liaison — confirmer son adresse (ADR 0040 ; A2, A5).
 *
 * Le courriel de confirmation mène ici. L'affichage n'appelle PAS la base :
 * les antivirus de messagerie ouvrent les liens des courriels, et un simple
 * affichage ne doit ni confirmer l'adresse ni la refuser. Les deux gestes
 * passent par un bouton (POST).
 *
 * Confirmer émet le lien du carnet et l'ENVOIE par courriel (Q26) : la page ne
 * le montre pas. Un antivirus de messagerie qui exécute un vrai navigateur peut
 * cliquer « Confirmer » ; il n'emporte alors rien, et le parent reçoit son lien
 * dans sa boîte. Rien ici ne dit de quel élève il s'agit ni si le lien a existé.
 */

import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { carnetTokenSchema, refuseParentContact } from '#lib/server/carnet/carnet.ts';
import { confirmContactAndSendLink } from '#lib/server/carnet/envois.ts';
import { rateLimit } from '#lib/server/middleware/rateLimit.ts';

// Constantes

/** Un parent clique une ou deux fois ; plus serait un essai de deviner. */
const MAX_PER_MINUTE = 10;

// Functions

/** Forme du jeton, puis limite de débit par IP. `null` = jeton mal formé. */
async function guardedToken(event: Pick<RequestEvent, 'params' | 'getClientAddress'>) {
	const parsed = carnetTokenSchema.safeParse(event.params.token);
	if (!parsed.success) return null;
	await rateLimit(`carnet-confirm:${event.getClientAddress()}`, MAX_PER_MINUTE, 60_000);
	return parsed.data;
}

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({
		'X-Robots-Tag': 'noindex, nofollow',
		'Cache-Control': 'private, no-store'
	});
	if (!carnetTokenSchema.safeParse(params.token).success) {
		throw error(404, "Ce lien de confirmation n'est plus valide.");
	}
	return {};
};

export const actions: Actions = {
	confirm: async (event) => {
		const token = await guardedToken(event);
		const result = token ? await confirmContactAndSendLink(token) : null;
		if (!result) return fail(410, { outcome: 'invalid' as const });
		// Adresse confirmée ; lien parti par courriel, ou non (partage coupé, Brevo en échec).
		return { outcome: result.linkSent ? ('link_sent' as const) : ('confirmed' as const) };
	},

	refuse: async (event) => {
		const token = await guardedToken(event);
		if (!token || !(await refuseParentContact(token))) {
			return fail(410, { outcome: 'invalid' as const });
		}
		return { outcome: 'refused' as const };
	}
};
