/**
 * GET /api/web-vitals/releve?days=28 : résultats calculés des mesures de performance
 * (75ᵉ centile et nombre de mesures, par indicateur, pour tout le site et par page).
 *
 * Lue par le relevé mensuel de GitHub (`scripts/releve-web-vitals.ts`).
 * AUTH : `Authorization: Bearer <WEB_VITALS_RELEVE_TOKEN>`, un jeton dédié qui n'ouvre
 * que cette route (pas de clé de la base dans GitHub, décision du 2026-11-21). Sans la
 * variable sur le serveur, la route est fermée (503). Elle ne se sert pas de la session
 * et ne rend jamais les lignes de la table (cf. `releve.ts`).
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEnv } from '#lib/server/env.ts';
import { rateLimit } from '#lib/server/middleware/rateLimit.ts';
import { rateLimitKey } from '#lib/server/web-vitals/reception.ts';
import {
	isReleveToken,
	readSamples,
	releveQuerySchema,
	summarize
} from '#lib/server/web-vitals/releve.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/web-vitals/releve/+server');

/** Appels permis par adresse et par minute, jeton bon ou non (le relevé en fait un par mois) */
const MAX_CALLS_PER_MINUTE = 10;

export const GET: RequestHandler = async ({ request, url, getClientAddress }) => {
	// Clé = empreinte de l'adresse (cf. `rateLimitKey`), dans un seau propre au relevé
	const addressKey = rateLimitKey(getClientAddress()).replace(/^web-vitals:/, '');
	await rateLimit(`web-vitals-releve:${addressKey}`, MAX_CALLS_PER_MINUTE, 60_000);

	const expectedToken = getEnv().WEB_VITALS_RELEVE_TOKEN;
	if (!expectedToken) {
		logger.error('WEB_VITALS_RELEVE_TOKEN absent : relevé fermé');
		throw error(503, 'Relevé indisponible : jeton non configuré');
	}
	if (!isReleveToken(request.headers.get('authorization'), expectedToken)) {
		logger.warn('Relevé refusé : jeton absent ou invalide');
		throw error(401, 'Jeton invalide');
	}

	const validation = releveQuerySchema.safeParse({
		days: url.searchParams.get('days') ?? undefined
	});
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}
	const { days } = validation.data;

	const result = await readSamples(days);
	if ('error' in result) {
		logger.error('Mesures de performance non lues :', result.error);
		throw error(500, 'Relevé indisponible');
	}

	return json(summarize(result.rows, days, result.truncated), {
		headers: { 'cache-control': 'no-store' }
	});
};
