/**
 * POST /api/admin/cron/trigger — l'appel de la tâche porte une origine
 * ====================================================================
 *
 * Le `fetch` de Node envoie `host` sans `origin` : le contrôle CSRF de `hooks.server.ts`
 * refuse alors tout POST (403 « Missing origin or host header »), sauf en dev sur
 * localhost. En prod, le bouton admin ne lançait donc aucune tâche HTTP.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createMockLocals, createMockRequest } from '$tests/helpers';

vi.mock('$lib/server/middleware/auth', () => ({ requireAdmin: vi.fn() }));
vi.mock('$lib/server/confirmAction', () => ({ assertTypedConfirmation: vi.fn() }));
vi.mock('$lib/server/env', () => ({
	getEnv: () => ({ CRON_SECRET: 'test-secret-12345678901234567890' })
}));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: vi.fn() }));

const { POST } = await import('../+server');

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('POST /api/admin/cron/trigger — origine', () => {
	it('appelle la tâche avec l’origine du site, que le contrôle CSRF exige', async () => {
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true })));
		vi.stubGlobal('fetch', fetchMock);

		await POST({
			request: createMockRequest({
				job_path: '/api/cron/deleted-account-files',
				confirm: 'LANCER'
			}),
			locals: createMockLocals(),
			url: new URL('https://www.chiph.re/api/admin/cron/trigger')
		} as never);

		expect(fetchMock).toHaveBeenCalledWith(
			'https://www.chiph.re/api/cron/deleted-account-files',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({ Origin: 'https://www.chiph.re' })
			})
		);
	});
});
