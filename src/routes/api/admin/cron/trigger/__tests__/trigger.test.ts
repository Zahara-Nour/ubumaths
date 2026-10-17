/**
 * POST /api/admin/cron/trigger — une erreur HTTP levée dans le `try` garde son statut
 * ==================================================================================
 *
 * Le `catch` ne relançait que les `Response` ; une erreur SvelteKit (`error(503, …)`)
 * n'en est pas une : sans CRON_SECRET, l'admin recevait un 500 « Impossible de
 * lancer la tâche » au lieu du 503 qui dit pourquoi.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { createMockLocals, createMockRequest } from '$tests/helpers';

vi.mock('$lib/server/middleware/auth', () => ({ requireAdmin: vi.fn() }));
vi.mock('$lib/server/confirmAction', () => ({ assertTypedConfirmation: vi.fn() }));
vi.mock('$lib/server/env', () => ({ getEnv: () => ({ CRON_SECRET: undefined }) }));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: vi.fn() }));

const { POST } = await import('../+server');
const { ALLOWED_JOB_PATHS } = await import('$lib/server/validation/cron');

describe('POST /api/admin/cron/trigger', () => {
	it('sans CRON_SECRET, rend le 503 qui le dit (pas un 500 générique)', async () => {
		const httpJob = ALLOWED_JOB_PATHS.find((path) => !path.startsWith('rpc:'));
		expect(httpJob).toBeDefined();
		const request = createMockRequest({ job_path: httpJob, confirm: 'LANCER' });

		let outcome: unknown;
		try {
			await POST({
				request,
				locals: createMockLocals(),
				url: new URL('http://localhost/api/admin/cron/trigger')
			} as never);
		} catch (err) {
			outcome = err;
		}

		expect(isHttpError(outcome)).toBe(true);
		if (!isHttpError(outcome)) return;
		expect(outcome.status).toBe(503);
		expect(outcome.body.message).toContain('CRON_SECRET');
	});
});
