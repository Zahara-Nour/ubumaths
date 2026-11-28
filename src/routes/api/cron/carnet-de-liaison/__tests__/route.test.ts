/**
 * Route du cron du carnet de liaison : jeton exigé, journal tenu sans adresse.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../+server';
import { runCarnetDaily } from '#lib/server/carnet/courriels.ts';
import { getEnv } from '#lib/server/env.ts';

vi.mock('#lib/server/env.ts', () => ({ getEnv: vi.fn() }));
vi.mock('#lib/server/carnet/courriels.ts', () => ({ runCarnetDaily: vi.fn() }));

const rpc = vi.fn();
// Passages en cours : `from('background_job_runs').select().eq().eq().gte().limit()`
const enCours = vi.fn();
const chaine = {
	select: () => chaine,
	eq: () => chaine,
	gte: () => chaine,
	limit: () => enCours()
};
vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => ({ rpc, from: () => chaine })
}));

const SECRET = 'test-secret-12345678901234567890';
const RAPPORT = {
	erased: 0,
	erasedNotifications: 0,
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
	enCours.mockResolvedValue({ data: [], error: null });
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

	it('un passage déjà en cours : 409, rien ne part (pas deux courriels au même parent)', async () => {
		enCours.mockResolvedValue({ data: [{ id: 'run-0' }], error: null });
		const response = await POST(event({ authorization: `Bearer ${SECRET}` }));
		expect(response.status).toBe(409);
		expect(runCarnetDaily).not.toHaveBeenCalled();
		expect(rpc).not.toHaveBeenCalled();
	});

	it('journal non ouvert : le passage a lieu quand même', async () => {
		rpc.mockResolvedValue({ data: null, error: { message: 'journal indisponible' } });
		vi.mocked(runCarnetDaily).mockResolvedValue(RAPPORT);
		const response = await GET(event({ authorization: `Bearer ${SECRET}` }));
		expect(await response.json()).toEqual({ success: true, report: RAPPORT });
		expect(rpc).not.toHaveBeenCalledWith('complete_job_run', expect.anything());
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
