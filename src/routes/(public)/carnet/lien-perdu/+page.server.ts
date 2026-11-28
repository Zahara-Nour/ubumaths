/**
 * Carnet de liaison — « J'ai perdu mon lien » (ADR 0040 ; A6, Q22).
 *
 * Le parent saisit son adresse ; si elle est confirmée pour un élève dont le
 * carnet est ouvert, un lien NEUF lui est envoyé (l'ancien est révoqué : il
 * n'est stocké que haché, on ne peut pas le renvoyer).
 *
 * Rien ne doit dire si une adresse est connue : la réponse est la même dans
 * tous les cas, et l'envoi tourne APRÈS la réponse (sa durée le trahirait).
 * Limites de débit par IP et par adresse (une adresse connue ne reçoit pas de
 * rafale de liens, son lien en cours n'est pas révoqué en boucle).
 */

import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { rateLimit } from '#lib/server/middleware/rateLimit.ts';
import { runAfterResponse } from '#lib/server/after-response.ts';
import { hashParentEmail, parentEmailSchema, resendLostLinks } from '#lib/server/carnet/envois.ts';

// Constantes

const MAX_PER_IP = 5;
const IP_WINDOW_MS = 10 * 60_000;
const MAX_PER_EMAIL = 3;
const EMAIL_WINDOW_MS = 24 * 60 * 60_000;

const formSchema = z.object({ email: z.string().max(320) });

// Functions

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'X-Robots-Tag': 'noindex, nofollow' });
	return {};
};

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		await rateLimit(`carnet-lost:${getClientAddress()}`, MAX_PER_IP, IP_WINDOW_MS);

		const form = formSchema.safeParse(Object.fromEntries(await request.formData()));
		const email = form.success ? parentEmailSchema.safeParse(form.data.email) : null;
		if (!email?.success) {
			return fail(400, { error: 'Saisissez une adresse électronique valide.' });
		}

		// Clé par empreinte : l'adresse elle-même n'entre pas dans le stockage des limites.
		await rateLimit(
			`carnet-lost-email:${hashParentEmail(email.data)}`,
			MAX_PER_EMAIL,
			EMAIL_WINDOW_MS
		);

		runAfterResponse(resendLostLinks(email.data), 'carnet : lien perdu');
		return { sent: true as const };
	}
};
