/**
 * /api/messages/[id] : les écritures rendent-elles compte de ce qu'elles ont écrit ?
 * ================================================================================
 *
 * ⚠️ Une mise à jour refusée par la RLS ne rend pas d'erreur : elle touche zéro
 * ligne. Sans `.select()`, la suppression d'un message et le basculement
 * lu / non lu annonçaient un succès sur zéro ligne modifiée.
 *
 * @module routes/api/messages/[id]/write-verdict.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createWriteVerdictSupabase,
	expectHttpStatus,
	type FakeTable
} from '$tests/helpers/write-verdict-supabase';

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_ID = '550e8400-e29b-41d4-a716-446655440002';
const MESSAGE_ID = '550e8400-e29b-41d4-a716-446655440010';

const PROFILE: FakeTable = { single: { data: { id: USER_ID, role: 'student' }, error: null } };

function createLocals(client: unknown) {
	return {
		supabase: client,
		user: { id: USER_ID },
		safeGetSession: vi.fn().mockResolvedValue({
			user: { id: USER_ID },
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

describe('DELETE /api/messages/[id] : zéro ligne n’est pas une suppression', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('expéditeur : zéro ligne marquée → 403, pas de succès', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: PROFILE,
			private_messages: {
				single: { data: { sender_id: USER_ID }, error: null },
				awaited: { data: [], error: null }
			}
		});
		const { DELETE } = await import('../+server');

		await expectHttpStatus(
			() => DELETE({ params: { id: MESSAGE_ID }, locals: createLocals(client) } as never),
			403
		);
	});

	it('destinataire : zéro entrée de boîte marquée → 404, pas de succès', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: PROFILE,
			private_messages: { single: { data: { sender_id: OTHER_ID }, error: null } },
			message_inbox: { awaited: { data: [], error: null } }
		});
		const { DELETE } = await import('../+server');

		await expectHttpStatus(
			() => DELETE({ params: { id: MESSAGE_ID }, locals: createLocals(client) } as never),
			404
		);
	});

	it('destinataire : une entrée marquée → succès', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: PROFILE,
			private_messages: { single: { data: { sender_id: OTHER_ID }, error: null } },
			message_inbox: { awaited: { data: [{ id: MESSAGE_ID }], error: null } }
		});
		const { DELETE } = await import('../+server');

		const response = await DELETE({
			params: { id: MESSAGE_ID },
			locals: createLocals(client)
		} as never);
		expect(await response.json()).toEqual({ success: true });
	});
});

describe('PATCH /api/messages/[id] toggleRead : zéro ligne n’est pas un changement', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('entrée lue mais mise à jour refusée → 403', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: PROFILE,
			message_inbox: {
				single: { data: { read_at: null }, error: null },
				awaited: { data: [], error: null }
			}
		});
		const { PATCH } = await import('../+server');

		await expectHttpStatus(
			() =>
				PATCH({
					params: { id: MESSAGE_ID },
					request: jsonRequest({ action: 'toggleRead' }),
					locals: createLocals(client)
				} as never),
			403
		);
	});

	it('aucune entrée de boîte de réception → 404', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: PROFILE,
			message_inbox: {
				single: { data: null, error: { code: 'PGRST116', message: 'no rows' } },
				awaited: { data: [], error: null }
			}
		});
		const { PATCH } = await import('../+server');

		await expectHttpStatus(
			() =>
				PATCH({
					params: { id: MESSAGE_ID },
					request: jsonRequest({ action: 'toggleRead' }),
					locals: createLocals(client)
				} as never),
			404
		);
	});

	it('une ligne modifiée → succès', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: PROFILE,
			message_inbox: {
				single: { data: { read_at: null }, error: null },
				awaited: { data: [{ id: MESSAGE_ID }], error: null }
			}
		});
		const { PATCH } = await import('../+server');

		const response = await PATCH({
			params: { id: MESSAGE_ID },
			request: jsonRequest({ action: 'toggleRead' }),
			locals: createLocals(client)
		} as never);
		expect(await response.json()).toEqual({ success: true, isRead: true });
	});
});
