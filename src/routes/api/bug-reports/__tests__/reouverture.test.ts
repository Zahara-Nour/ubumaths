/**
 * Rapport de bug rouvert : la résolution passée s'efface (ancien écart L125).
 *
 * Résolu (`resolved`, `wont_fix`, `duplicate`) : l'admin et la date sont notés.
 * Tout autre statut (`pending`, `acknowledged`, `in_progress`) : `resolved_by` et
 * `resolved_at` repassent à `null`, sinon un rapport en attente garderait le nom de
 * celui qui l'avait résolu — et son auteur pourrait l'effacer par l'API.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWriteVerdictSupabase } from '#tests/helpers/write-verdict-supabase.ts';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const REPORT_ID = '550e8400-e29b-41d4-a716-446655440040';

function createLocals(client: unknown) {
	return {
		supabase: client,
		user: { id: ADMIN_ID },
		safeGetSession: vi.fn().mockResolvedValue({
			user: { id: ADMIN_ID },
			session: { access_token: 'token' }
		})
	};
}

function jsonRequest(body: unknown): Request {
	return new Request('http://localhost', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function adminSupabase() {
	return createWriteVerdictSupabase({
		profiles: { single: { data: { id: ADMIN_ID, role: 'admin' }, error: null } },
		bug_reports: {
			single: { data: { id: REPORT_ID, user_id: ADMIN_ID, status: 'resolved' }, error: null },
			awaited: { data: [{ id: REPORT_ID }], error: null }
		}
	});
}

/** Ce que la route a écrit dans `bug_reports` pour ce statut. */
async function writtenFor(route: 'single' | 'batch', status: string): Promise<unknown> {
	const { client, chains } = adminSupabase();
	if (route === 'single') {
		const { PATCH } = await import('../[reportId]/+server');
		await PATCH({
			params: { reportId: REPORT_ID },
			request: jsonRequest({ status }),
			locals: createLocals(client)
		} as never);
	} else {
		const { PATCH } = await import('../batch/+server');
		await PATCH({
			request: jsonRequest({ reportIds: [REPORT_ID], status }),
			locals: createLocals(client)
		} as never);
	}
	const update = chains.bug_reports.update as ReturnType<typeof vi.fn>;
	expect(update).toHaveBeenCalledTimes(1);
	return update.mock.calls[0][0];
}

describe.each(['single', 'batch'] as const)('statut changé par l’admin (%s)', (route) => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('résolu : l’admin et la date sont notés', async () => {
		expect(await writtenFor(route, 'resolved')).toMatchObject({
			status: 'resolved',
			resolved_by: ADMIN_ID,
			resolved_at: expect.any(String)
		});
	});

	it.each(['pending', 'acknowledged', 'in_progress'])(
		'rouvert (%s) : la résolution passée s’efface',
		async (status) => {
			expect(await writtenFor(route, status)).toMatchObject({
				status,
				resolved_by: null,
				resolved_at: null
			});
		}
	);
});
