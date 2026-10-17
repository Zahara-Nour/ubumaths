/**
 * Administration des classes : les écritures rendent-elles compte ?
 * ================================================================
 *
 * ⚠️ Une mise à jour refusée par la RLS (ou d'une classe inconnue) touche zéro
 * ligne sans erreur. Sans `.select()`, `update`, `deactivate` et `activate`
 * annonçaient un succès sur zéro ligne modifiée.
 *
 * @module routes/admin/classes/write-verdict.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWriteVerdictSupabase } from '$tests/helpers/write-verdict-supabase';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const CLASS_ID = '550e8400-e29b-41d4-a716-446655440020';

function adminLocals(client: unknown) {
	return {
		supabase: client,
		user: { id: ADMIN_ID },
		profile: { id: ADMIN_ID, role: 'admin' }
	};
}

function formRequest(fields: Record<string, string>): Request {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.append(k, v);
	return new Request('http://localhost', { method: 'POST', body });
}

function createClient(classesRows: unknown[]) {
	return createWriteVerdictSupabase({
		classes: {
			// Lecture de contrôle de `update` : code inchangé, pas de test d'unicité.
			single: { data: { join_code: 'ABC123' }, error: null },
			awaited: { data: classesRows, error: null }
		}
	}).client;
}

const UPDATE_FIELDS = {
	id: CLASS_ID,
	name: '3e B',
	description: '',
	school_id: '',
	grade: '',
	join_code: 'ABC123',
	is_active: 'true'
};

describe('admin/classes : zéro ligne modifiée n’est pas un succès', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('update : zéro ligne → 403', async () => {
		const { actions } = await import('../+page.server');
		const result = await actions.update({
			request: formRequest(UPDATE_FIELDS),
			locals: adminLocals(createClient([]))
		} as never);
		expect(result).toMatchObject({ status: 403 });
	});

	it('deactivate : zéro ligne → 404', async () => {
		const { actions } = await import('../+page.server');
		const result = await actions.deactivate({
			request: formRequest({ id: CLASS_ID }),
			locals: adminLocals(createClient([]))
		} as never);
		expect(result).toMatchObject({ status: 404 });
	});

	it('activate : zéro ligne → 404', async () => {
		const { actions } = await import('../+page.server');
		const result = await actions.activate({
			request: formRequest({ id: CLASS_ID }),
			locals: adminLocals(createClient([]))
		} as never);
		expect(result).toMatchObject({ status: 404 });
	});

	it('update, deactivate, activate : une ligne → succès', async () => {
		const { actions } = await import('../+page.server');
		const rows = [{ id: CLASS_ID }];
		const updated = await actions.update({
			request: formRequest(UPDATE_FIELDS),
			locals: adminLocals(createClient(rows))
		} as never);
		const deactivated = await actions.deactivate({
			request: formRequest({ id: CLASS_ID }),
			locals: adminLocals(createClient(rows))
		} as never);
		const activated = await actions.activate({
			request: formRequest({ id: CLASS_ID }),
			locals: adminLocals(createClient(rows))
		} as never);
		expect([updated, deactivated, activated]).toEqual([
			{ success: true },
			{ success: true },
			{ success: true }
		]);
	});
});
