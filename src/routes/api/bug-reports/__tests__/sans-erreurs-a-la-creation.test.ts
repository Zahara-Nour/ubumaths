/**
 * POST /api/bug-reports — les erreurs ne sont plus copiées dans le signalement.
 * ===========================================================================
 *
 * Son auteur peut relire son signalement ; les erreurs du journal sont réservées
 * à l'admin (décision du 2026-10-13). La route ne lit donc plus `error_logs`, et
 * des erreurs envoyées par le client ne sont pas enregistrées.
 *
 * @module routes/api/bug-reports/sans-erreurs-a-la-creation.test
 */

import { describe, it, expect, vi } from 'vitest';
import { createWriteVerdictSupabase } from '$tests/helpers/write-verdict-supabase';

vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: vi.fn().mockResolvedValue({
		user: { id: '550e8400-e29b-41d4-a716-446655440001' },
		profile: { id: '550e8400-e29b-41d4-a716-446655440001', role: 'student' }
	})
}));
vi.mock('$lib/server/notifications', () => ({
	notifyAdminsOfNewBugReport: vi.fn()
}));

import { POST } from '../+server';

describe('POST /api/bug-reports', () => {
	it('ne lit pas error_logs et n’enregistre pas d’erreurs envoyées par le client', async () => {
		const { client, chains } = createWriteVerdictSupabase({
			bug_reports: { single: { data: { id: 'r1', title: 'Un bug' }, error: null } }
		});
		const body = {
			category: 'bug',
			title: 'La page plante',
			description: 'Quand je clique sur valider, rien ne se passe.',
			sessionContext: {
				recentErrors: [
					{ id: 'f', type: 'x', message: 'fabriquée', severity: 'error', timestamp: 't' }
				],
				slowRequests: [{ url: '/x', duration: 1, status: 200 }],
				recentActions: [{ type: 'click', target: 'button', timestamp: 't' }]
			}
		};
		await POST({
			locals: { supabase: client },
			request: new Request('http://localhost/api/bug-reports', {
				method: 'POST',
				body: JSON.stringify(body)
			})
		} as never);

		expect(client.from).not.toHaveBeenCalledWith('error_logs');
		const inserted = (chains.bug_reports.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
			session_context: Record<string, unknown>;
		};
		expect(inserted.session_context).not.toHaveProperty('recentErrors');
		expect(inserted.session_context).not.toHaveProperty('slowRequests');
		expect(inserted.session_context.recentActions).toHaveLength(1);
	});
});
