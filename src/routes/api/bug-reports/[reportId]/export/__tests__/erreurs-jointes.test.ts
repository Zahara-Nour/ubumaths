/**
 * Export d'un signalement : les erreurs de l'auteur y figurent.
 * =============================================================
 *
 * Elles ne sont plus copiées dans le signalement à sa création (réservées à
 * l'admin, décision du 2026-10-13) : l'export les lit dans le journal.
 *
 * @module routes/api/bug-reports/[reportId]/export/erreurs-jointes.test
 */

import { describe, it, expect, vi } from 'vitest';
import { createWriteVerdictSupabase } from '$tests/helpers/write-verdict-supabase';
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: vi.fn().mockResolvedValue({
		user: { id: '550e8400-e29b-41d4-a716-446655440001' },
		profile: { id: '550e8400-e29b-41d4-a716-446655440001', role: 'admin' }
	})
}));

import { GET } from '../+server';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const ELEVE = '550e8400-e29b-41d4-a716-446655440002';
const REPORT_ID = '550e8400-e29b-41d4-a716-446655440030';

describe('GET /api/bug-reports/[reportId]/export', () => {
	it('le markdown contient l’erreur de l’auteur survenue juste avant', async () => {
		const { client } = createWriteVerdictSupabase({
			bug_reports: {
				single: {
					data: {
						id: REPORT_ID,
						user_id: ELEVE,
						created_at: '2026-10-13T10:00:00.000Z',
						category: 'bug',
						severity: 'medium',
						status: 'pending',
						title: 'La page plante',
						description: 'Quand je clique sur valider, rien ne se passe.',
						page_url: '/exercices',
						session_context: { capturedAt: '2026-10-13T10:00:00.000Z' },
						screenshot_path: null,
						author: { id: ELEVE, full_name: 'Élève', email: null, role: 'student' }
					},
					error: null
				}
			},
			error_logs: {
				awaited: {
					data: [
						{
							id: 'e1',
							user_id: ELEVE,
							error_type: 'javascript',
							message: 'Cannot read properties of undefined (reading answer)',
							severity: 'error',
							created_at: '2026-10-13T09:59:00.000Z',
							url: '/exercices',
							file_path: null,
							line_number: null,
							stack_trace: null,
							response_time: null,
							status_code: null
						}
					],
					error: null
				}
			}
		});

		const response = await GET({
			params: { reportId: REPORT_ID },
			locals: {
				supabase: client,
				user: { id: ADMIN_ID },
				profile: { id: ADMIN_ID, role: 'admin' }
			}
		} as never);

		expect(response.status).toBe(200);
		const markdown = await response.text();
		// Le tableau de l'export tronque le message à 50 caractères.
		expect(markdown).toContain('Erreurs récentes');
		expect(markdown).toContain('Cannot read properties of undefined');
	});
});
