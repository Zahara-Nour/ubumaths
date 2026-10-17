/**
 * Suppression d'une école : vérifiée.
 * ==================================
 *
 * ⚠️ Une suppression refusée par la RLS touche zéro ligne sans erreur. Sans
 * `.select()`, l'écran annonçait une école supprimée qui existait toujours.
 *
 * @module routes/admin/schools/write-verdict.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWriteVerdictSupabase } from '$tests/helpers/write-verdict-supabase';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const SCHOOL_ID = '550e8400-e29b-41d4-a716-446655440030';
const SCHOOL_NAME = 'Collège des Tests';

function adminLocals(client: unknown) {
	return {
		supabase: client,
		user: { id: ADMIN_ID },
		profile: { id: ADMIN_ID, role: 'admin' }
	};
}

function deleteRequest(): Request {
	const body = new FormData();
	body.append('id', SCHOOL_ID);
	body.append('confirm', SCHOOL_NAME);
	return new Request('http://localhost', { method: 'POST', body });
}

function createClient(deletedRows: unknown[]) {
	return createWriteVerdictSupabase({
		schools: {
			single: { data: { name: SCHOOL_NAME }, error: null },
			awaited: { data: deletedRows, error: null }
		},
		// Aucun utilisateur rattaché : la suppression est permise.
		profiles: { awaited: { data: [], error: null } }
	}).client;
}

describe('admin/schools delete : zéro ligne supprimée n’est pas un succès', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('zéro ligne → 403, pas de succès', async () => {
		const { actions } = await import('../+page.server');
		const result = await actions.delete({
			request: deleteRequest(),
			locals: adminLocals(createClient([]))
		} as never);
		expect(result).toMatchObject({ status: 403 });
		expect(result).not.toHaveProperty('success');
	});

	it('une ligne → succès', async () => {
		const { actions } = await import('../+page.server');
		const result = await actions.delete({
			request: deleteRequest(),
			locals: adminLocals(createClient([{ id: SCHOOL_ID }]))
		} as never);
		expect(result).toEqual({ success: true });
	});
});
