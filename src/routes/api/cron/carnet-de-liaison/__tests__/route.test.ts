/**
 * Route du cron du carnet de liaison : jeton exigé, journal tenu sans adresse.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../+server';
import { runCarnetDaily } from '$lib/server/carnet/courriels';
import { getEnv } from '$lib/server/env';

vi.mock('$lib/server/env', () => ({ getEnv: vi.fn() }));
vi.mock('$lib/server/carnet/courriels', () => ({ runCarnetDaily: vi.fn() }));

const rpc = vi.fn();
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ rpc })
}));

const SECRET = 'test-secret-12345678901234567890';
const RAPPORT = {
	erased: 0,
	links: { sent: 1, failed: 0 },
	exceptions: { sent: 2, failed: 0 },
	quarterly: { sent: 0, failed: 0 },
	capped: false
};

function event(headers: Record<string, string>) {
	return {
		request: new Request('https://example.com/api/cron/carnet-de-liaison', { headers })
	} as never;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getEnv).mockReturnValue({ CRON_SECRET: SECRET } as ReturnType<typeof getEnv>);
	rpc.mockResolvedValue({ data: 'run-1', error: null });
});

describe('api/cron/carnet-de-liaison', () => {
	it('sans jeton : 401, rien ne part', async () => {
		await expect(GET(event({ 'x-vercel-cron': '1' }))).rejects.toMatchObject({ status: 401 });
		expect(runCarnetDaily).not.toHaveBeenCalled();
	});

	it('avec le jeton, GET (cron Vercel) et POST (admin) lancent le passage ; journal = nombres seulement', async () => {
		vi.mocked(runCarnetDaily).mockResolvedValue(RAPPORT);

		for (const handler of [GET, POST]) {
			const response = await handler(event({ authorization: `Bearer ${SECRET}` }));
			expect(await response.json()).toEqual({ success: true, report: RAPPORT });
		}
		expect(rpc).toHaveBeenCalledWith('start_job_run', { p_job_name: 'carnet_de_liaison' });
		expect(rpc).toHaveBeenCalledWith('complete_job_run', {
			p_run_id: 'run-1',
			p_status: 'success',
			p_metadata: RAPPORT
		});
	});

	it('un échec est journalisé en échec, sans détail vers l’appelant', async () => {
		vi.mocked(runCarnetDaily).mockRejectedValue(new Error('Plan illisible'));

		const response = await GET(event({ authorization: `Bearer ${SECRET}` }));

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ success: false, message: 'Erreur serveur' });
		expect(rpc).toHaveBeenCalledWith('complete_job_run', {
			p_run_id: 'run-1',
			p_status: 'failed',
			p_error_message: 'Plan illisible'
		});
	});
});
