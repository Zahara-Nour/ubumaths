/**
 * Route du cron « fichiers des comptes supprimés » : jeton exigé, journal tenu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../+server';
import { sweepDeletedAccountFiles } from '$lib/server/deleted-account-files';
import { sweepOrphanMessageAttachments } from '$lib/server/message-attachments';
import { getEnv } from '$lib/server/env';

vi.mock('$lib/server/env', () => ({ getEnv: vi.fn() }));
vi.mock('$lib/server/deleted-account-files', () => ({ sweepDeletedAccountFiles: vi.fn() }));
vi.mock('$lib/server/message-attachments', () => ({ sweepOrphanMessageAttachments: vi.fn() }));

const rpc = vi.fn();
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ rpc })
}));

const SECRET = 'test-secret-12345678901234567890';
const AUCUN_ORPHELIN = { listed: 0, removed: 0, failed: false };

function event(headers: Record<string, string>) {
	return {
		request: new Request('https://example.com/api/cron/deleted-account-files', { headers })
	} as never;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getEnv).mockReturnValue({ CRON_SECRET: SECRET } as ReturnType<typeof getEnv>);
	rpc.mockResolvedValue({ data: 'run-1', error: null });
	vi.mocked(sweepOrphanMessageAttachments).mockResolvedValue(AUCUN_ORPHELIN);
});

describe('api/cron/deleted-account-files', () => {
	it('sans jeton : 401, rien n’est retiré', async () => {
		await expect(GET(event({ 'x-vercel-cron': '1' }))).rejects.toMatchObject({ status: 401 });
		expect(sweepDeletedAccountFiles).not.toHaveBeenCalled();
	});

	it('avec le jeton, GET (cron Vercel) et POST (admin) lancent le retrait', async () => {
		vi.mocked(sweepDeletedAccountFiles).mockResolvedValue({
			checked: 1,
			cleared: 1,
			failed: 0,
			files: 2
		});

		for (const handler of [GET, POST]) {
			const response = await handler(event({ authorization: `Bearer ${SECRET}` }));
			expect(await response.json()).toEqual({
				success: true,
				checked: 1,
				cleared: 1,
				failed: 0,
				files: 2,
				orphan_files: AUCUN_ORPHELIN
			});
		}
		expect(rpc).toHaveBeenCalledWith(
			'complete_job_run',
			expect.objectContaining({ p_run_id: 'run-1', p_status: 'success' })
		);
	});

	it('un échec partiel est journalisé en échec, pour que l’admin le voie', async () => {
		vi.mocked(sweepDeletedAccountFiles).mockResolvedValue({
			checked: 2,
			cleared: 1,
			failed: 1,
			files: 1
		});

		const response = await GET(event({ authorization: `Bearer ${SECRET}` }));

		expect(await response.json()).toMatchObject({ success: false, failed: 1 });
		expect(rpc).toHaveBeenCalledWith(
			'complete_job_run',
			expect.objectContaining({ p_status: 'failed', p_error_message: expect.any(String) })
		);
	});

	it('retire aussi les pièces jointes orphelines ; un échec de retrait est journalisé', async () => {
		vi.mocked(sweepDeletedAccountFiles).mockResolvedValue({
			checked: 0,
			cleared: 0,
			failed: 0,
			files: 0
		});
		vi.mocked(sweepOrphanMessageAttachments).mockResolvedValue({
			listed: 2,
			removed: 0,
			failed: true
		});

		const response = await GET(event({ authorization: `Bearer ${SECRET}` }));

		expect(sweepOrphanMessageAttachments).toHaveBeenCalled();
		expect(await response.json()).toMatchObject({ success: false });
		expect(rpc).toHaveBeenCalledWith(
			'complete_job_run',
			expect.objectContaining({
				p_status: 'failed',
				p_error_message: expect.stringContaining('orpheline')
			})
		);
	});

	it('une panne de lecture rend 500 et ferme le journal en échec', async () => {
		vi.mocked(sweepDeletedAccountFiles).mockRejectedValue(new Error('panne'));

		await expect(GET(event({ authorization: `Bearer ${SECRET}` }))).rejects.toMatchObject({
			status: 500
		});
		expect(rpc).toHaveBeenCalledWith(
			'complete_job_run',
			expect.objectContaining({ p_status: 'failed', p_error_message: 'panne' })
		);
	});
});
