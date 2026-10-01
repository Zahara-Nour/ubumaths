/**
 * deleteNotification — masquage par le client service
 *
 * Avec le client du compte, la base refusait toujours le masquage (42501) : une
 * notification masquée ne satisfait plus la policy SELECT (deleted_at is null), et
 * PostgREST relit la ligne après l'UPDATE. L'autorisation (auteur ou admin) est
 * vérifiée par le code, puis le client service masque.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const serviceUpdate = vi.fn();

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({
		from: () => ({
			update: (row: Record<string, unknown>) => {
				serviceUpdate(row);
				return {
					eq: () => ({ select: async () => ({ data: [{ id: 'n1' }], error: null }) })
				};
			}
		})
	})
}));

import { deleteNotification } from '../notifications';

/** Client du compte : ne sert qu'aux lectures d'autorisation. */
function userClient(createdBy: string, role: string) {
	return {
		from: (table: string) => ({
			select: () => ({
				eq: () => ({
					single: async () =>
						table === 'notifications'
							? { data: { created_by: createdBy }, error: null }
							: { data: { role }, error: null }
				})
			}),
			update: () => {
				throw new Error('le client du compte ne doit pas écrire');
			}
		})
	} as never;
}

beforeEach(() => serviceUpdate.mockReset());

describe('deleteNotification', () => {
	it("l'auteur masque sa notification via le client service", async () => {
		const res = await deleteNotification(userClient('prof', 'teacher'), 'n1', 'prof');
		expect(res.success).toBe(true);
		expect(serviceUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ deleted_at: expect.any(String) })
		);
	});

	it("un compte qui n'est ni l'auteur ni admin est refusé, rien n'est écrit", async () => {
		const res = await deleteNotification(userClient('admin', 'teacher'), 'n1', 'prof');
		expect(res.success).toBe(false);
		expect(serviceUpdate).not.toHaveBeenCalled();
	});
});
