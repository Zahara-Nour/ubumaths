/**
 * POST /api/admin/cron/trigger — une tâche par minute, comptée en base (T8)
 * =========================================================================
 *
 * La limite « 1 lancement par minute et par tâche » vivait dans une `Map` du processus :
 * deux instances Vercel (ou un démarrage à froid) laissaient relancer aussitôt. Elle
 * passe par le limiteur en base, partagé par toutes les instances.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { createMockLocals, createMockRequest } from '$tests/helpers';

vi.mock('$lib/server/middleware/auth', () => ({ requireAdmin: vi.fn() }));
vi.mock('$lib/server/confirmAction', () => ({ assertTypedConfirmation: vi.fn() }));
vi.mock('$lib/server/env', () => ({ getEnv: () => ({ CRON_SECRET: undefined }) }));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: vi.fn() }));
vi.mock('$lib/server/rateLimiter', () => ({ checkEndpointRateLimit: vi.fn() }));

const { checkEndpointRateLimit } = await import('$lib/server/rateLimiter');
const { POST } = await import('../+server');

const JOB = '/api/cron/deleted-account-files';

async function trigger(): Promise<unknown> {
	try {
		return await POST({
			request: createMockRequest({ job_path: JOB, confirm: 'LANCER' }),
			locals: createMockLocals(),
			url: new URL('http://localhost/api/admin/cron/trigger')
		} as never);
	} catch (err) {
		return err;
	}
}

beforeEach(() => {
	vi.mocked(checkEndpointRateLimit).mockReset();
});

describe('POST /api/admin/cron/trigger — limite en base', () => {
	it('demande à la base un lancement par minute pour cette tâche', async () => {
		vi.mocked(checkEndpointRateLimit).mockResolvedValue({ allowed: true });

		await trigger();
		expect(checkEndpointRateLimit).toHaveBeenCalledWith(`cron_trigger:${JOB}`, 1, 60);
	});

	it('tâche lancée il y a peu : 429 qui dit combien attendre', async () => {
		vi.mocked(checkEndpointRateLimit).mockResolvedValue({
			allowed: false,
			message: 'Trop de requêtes.',
			retryAfter: 37
		});

		const outcome = await trigger();
		expect(isHttpError(outcome)).toBe(true);
		if (!isHttpError(outcome)) return;
		expect(outcome.status).toBe(429);
		expect(outcome.body.message).toBe(
			'Tâche lancée il y a peu : attendre 37 s avant de la relancer'
		);
	});
});
