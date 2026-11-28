/**
 * Route du cron de purge des invitations de cours particulier : jeton exigé, journal
 * tenu avec des nombres seulement, échec noté.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../+server';
import { purgeEndedInvitations } from '#lib/server/private-lessons/invitations.ts';
import { cleanupOrphanAccounts } from '#lib/server/private-lessons/orphans.ts';
import { getEnv } from '#lib/server/env.ts';

vi.mock('#lib/server/env.ts', () => ({ getEnv: vi.fn() }));
vi.mock('#lib/server/private-lessons/invitations.ts', () => ({ purgeEndedInvitations: vi.fn() }));
vi.mock('#lib/server/private-lessons/orphans.ts', () => ({ cleanupOrphanAccounts: vi.fn() }));

const rpc = vi.fn();
vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => ({ rpc })
}));

const SECRET = 'test-secret-12345678901234567890';
const PURGE = { used: 2, cancelled: 1, expired: 3 };
const ORPHELINS = { checked: 2, cleared: 1, deleted: 1, kept: 0, failed: 0 };
const RAPPORT = { ...PURGE, orphans: ORPHELINS };

function event(headers: Record<string, string>) {
	return {
		request: new Request('https://example.com/api/cron/invitations-cours-particulier', { headers })
	} as never;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getEnv).mockReturnValue({ CRON_SECRET: SECRET } as ReturnType<typeof getEnv>);
	rpc.mockResolvedValue({ data: 'run-1', error: null });
});

describe('api/cron/invitations-cours-particulier', () => {
	it('sans jeton : 401, rien n’est effacé', async () => {
		await expect(GET(event({ 'x-vercel-cron': '1' }))).rejects.toMatchObject({ status: 401 });
		expect(purgeEndedInvitations).not.toHaveBeenCalled();
	});

	it('GET (cron Vercel) et POST (admin) purgent ; journal = nombres seulement', async () => {
		vi.mocked(purgeEndedInvitations).mockResolvedValue(PURGE);
		vi.mocked(cleanupOrphanAccounts).mockResolvedValue(ORPHELINS);

		for (const handler of [GET, POST]) {
			const response = await handler(event({ authorization: `Bearer ${SECRET}` }));
			expect(await response.json()).toEqual({ success: true, report: RAPPORT });
		}
		expect(rpc).toHaveBeenCalledWith('start_job_run', {
			p_job_name: 'private_lesson_invitations_purge'
		});
		expect(rpc).toHaveBeenCalledWith('complete_job_run', {
			p_run_id: 'run-1',
			p_status: 'success',
			p_metadata: RAPPORT
		});
	});

	it('échec de la purge : 500 et passage noté en échec', async () => {
		vi.mocked(purgeEndedInvitations).mockRejectedValue(new Error('Purge des expirées : boum'));

		await expect(POST(event({ authorization: `Bearer ${SECRET}` }))).rejects.toMatchObject({
			status: 500
		});
		expect(rpc).toHaveBeenCalledWith('complete_job_run', {
			p_run_id: 'run-1',
			p_status: 'failed',
			p_metadata: { orphans: ORPHELINS },
			p_error_message: 'Purge des expirées : boum'
		});
		// Le nettoyage des orphelins a tourné quand même.
		expect(cleanupOrphanAccounts).toHaveBeenCalled();
	});

	it('échec du nettoyage des orphelins : la purge tourne, passage noté en échec', async () => {
		vi.mocked(purgeEndedInvitations).mockResolvedValue(PURGE);
		vi.mocked(cleanupOrphanAccounts).mockRejectedValue(new Error('Comptes illisibles : x'));

		await expect(POST(event({ authorization: `Bearer ${SECRET}` }))).rejects.toMatchObject({
			status: 500
		});
		expect(purgeEndedInvitations).toHaveBeenCalled();
		expect(rpc).toHaveBeenCalledWith('complete_job_run', {
			p_run_id: 'run-1',
			p_status: 'failed',
			p_metadata: { ...PURGE, orphans: null },
			p_error_message: 'Orphelins : Comptes illisibles : x'
		});
	});
});
