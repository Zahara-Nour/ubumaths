/**
 * POST /api/web-vitals : mesures de performance envoyées par le navigateur.
 *
 * Ouverte à tous, sans compte : la route ne se sert pas de la session (les hooks la
 * lisent comme pour toute requête) et rien de ce qu'elle écrit ne désigne le visiteur
 * (cf. `reception.ts`). N'écrit qu'en prod. Le navigateur n'attend pas la réponse
 * (`sendBeacon`) : un envoi refusé est perdu, sans nouvel essai.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rateLimit } from '#lib/server/middleware/rateLimit.ts';
import {
	keepValidSamples,
	rateLimitKey,
	storeSamples,
	webVitalsBatchSchema
} from '#lib/server/web-vitals/reception.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/web-vitals/+server');

/**
 * Envois permis par adresse et par minute. Un onglet n'envoie qu'en passant en
 * arrière-plan ; une classe entière peut partager une adresse.
 */
const MAX_BATCHES_PER_MINUTE = 30;
/**
 * Plafond de tout le site, par heure : la table ne peut pas être remplie en changeant
 * d'adresse (au plus 20 000 lignes par heure). Très au-dessus du trafic réel.
 */
const MAX_BATCHES_PER_HOUR = 2000;

const noContent = () => new Response(null, { status: 204 });

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Hors prod (local, déploiement d'aperçu) : rien n'est gardé
	if (process.env.VERCEL_ENV !== 'production') return noContent();

	await rateLimit(rateLimitKey(getClientAddress()), MAX_BATCHES_PER_MINUTE, 60_000);
	await rateLimit('web-vitals:global', MAX_BATCHES_PER_HOUR, 3_600_000);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}
	const validation = webVitalsBatchSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const samples = keepValidSamples(validation.data.samples);
	if (samples.length === 0) return noContent();

	const failure = await storeSamples(samples, validation.data.device_type);
	if (failure) {
		logger.error('Mesures de performance non écrites :', failure);
		throw error(500, 'Mesures non enregistrées');
	}

	return noContent();
};
