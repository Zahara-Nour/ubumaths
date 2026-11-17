/**
 * Double du limiteur en base (`$lib/server/rateLimiter`) pour les tests unitaires de routes.
 *
 * Sans lui, `rateLimit()` écrit dans `rate_limits` de la base locale (un second passage dans
 * l'heure rend 429) ou, sans clé service role, lève. Compteur par clé, propre au fichier de
 * test, mêmes règles que la RPC `check_and_increment_rate_limit` (fenêtre ignorée).
 *
 * Usage : `vi.mock('$lib/server/rateLimiter', () => import('$lib/server/__tests__/helpers/fake-rate-limiter'));`
 */
import type { RateLimitResult } from '$lib/server/rateLimiter';

const counts = new Map<string, number>();

export async function checkEndpointRateLimit(
	key: string,
	maxRequests: number,
	windowSeconds: number
): Promise<RateLimitResult> {
	const count = counts.get(key) ?? 0;
	if (count >= maxRequests) {
		return { allowed: false, message: 'Trop de requêtes.', retryAfter: windowSeconds };
	}
	counts.set(key, count + 1);
	return { allowed: true };
}
