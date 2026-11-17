/**
 * Garde de débit des endpoints : lève un 429 au-delà de la limite.
 *
 * Compte en base (`checkEndpointRateLimit`, table `rate_limits`) : la limite tient entre
 * instances Vercel et démarrages à froid. L'ancien compteur en mémoire, propre à chaque
 * instance, a été supprimé (T8). Échoue ouvert : une panne de la base laisse passer.
 *
 * @module lib/server/middleware/rateLimit
 */

import { error } from '@sveltejs/kit';
import { checkEndpointRateLimit } from '$lib/server/rateLimiter';

/**
 * @param key - Clé du seau (ex. `search:${user.id}`, `error-log:${ip}`)
 * @param maxRequests - Appels permis dans la fenêtre
 * @param windowMs - Fenêtre en millisecondes (arrondie à la seconde supérieure)
 * @throws 429 si la limite est atteinte
 *
 * @example
 * ```typescript
 * await rateLimit(`search:${user.id}`, 30, 60_000); // 30 par minute
 * ```
 */
export async function rateLimit(key: string, maxRequests: number, windowMs: number): Promise<void> {
	const result = await checkEndpointRateLimit(key, maxRequests, Math.ceil(windowMs / 1000));
	if (!result.allowed) {
		throw error(429, `Trop de requêtes. Réessayer dans ${result.retryAfter ?? 0} secondes.`);
	}
}
