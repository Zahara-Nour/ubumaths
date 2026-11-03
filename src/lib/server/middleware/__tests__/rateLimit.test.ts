/**
 * rateLimit (garde des endpoints) — limiteur en base (T8)
 * =======================================================
 *
 * L'ancien `rateLimit` comptait dans une `Map` du processus : chaque instance Vercel
 * avait son compteur, remis à zéro à chaque démarrage à froid. Il délègue maintenant
 * au limiteur en base (`checkEndpointRateLimit`, RPC `check_and_increment_rate_limit`),
 * partagé par toutes les instances, et garde son contrat : 429 au-delà de la limite.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

vi.mock('$lib/server/rateLimiter', () => ({ checkEndpointRateLimit: vi.fn() }));

const { checkEndpointRateLimit } = await import('$lib/server/rateLimiter');
const { rateLimit } = await import('../rateLimit');

beforeEach(() => {
	vi.mocked(checkEndpointRateLimit).mockReset();
});

describe('rateLimit, limiteur en base', () => {
	it('sous la limite : laisse passer, en demandant la base (fenêtre en secondes)', async () => {
		vi.mocked(checkEndpointRateLimit).mockResolvedValue({ allowed: true });

		await expect(rateLimit('search:eleve-1', 30, 60_000)).resolves.toBeUndefined();
		expect(checkEndpointRateLimit).toHaveBeenCalledWith('search:eleve-1', 30, 60);
	});

	it('fenêtre non ronde : arrondie à la seconde supérieure', async () => {
		vi.mocked(checkEndpointRateLimit).mockResolvedValue({ allowed: true });

		await rateLimit('k', 1, 1500);
		expect(checkEndpointRateLimit).toHaveBeenCalledWith('k', 1, 2);
	});

	it('au-delà de la limite : 429 qui dit quand réessayer', async () => {
		vi.mocked(checkEndpointRateLimit).mockResolvedValue({
			allowed: false,
			message: 'Trop de requêtes.',
			retryAfter: 42
		});

		let outcome: unknown;
		try {
			await rateLimit('search:eleve-1', 30, 60_000);
		} catch (err) {
			outcome = err;
		}

		expect(isHttpError(outcome)).toBe(true);
		if (!isHttpError(outcome)) return;
		expect(outcome.status).toBe(429);
		expect(outcome.body.message).toBe('Trop de requêtes. Réessayer dans 42 secondes.');
	});
});
