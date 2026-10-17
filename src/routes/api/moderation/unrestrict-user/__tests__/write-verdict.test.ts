/**
 * DELETE /api/moderation/unrestrict-user : la levée est-elle vérifiée ?
 * ====================================================================
 *
 * ⚠️ Une suppression refusée par la RLS ne rend pas d'erreur : elle touche zéro
 * ligne. Sans `.select()`, le prof lisait « restriction levée » alors que
 * l'élève restait restreint.
 *
 * @module routes/api/moderation/unrestrict-user/write-verdict.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createWriteVerdictSupabase,
	expectHttpStatus
} from '$tests/helpers/write-verdict-supabase';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440003';
const RESTRICTION_ID = '550e8400-e29b-41d4-a716-446655440011';

const RESTRICTION = {
	id: RESTRICTION_ID,
	user_id: STUDENT_ID,
	scope_type: 'global',
	scope_id: null,
	restriction_type: 'mute',
	reason: 'Langage inapproprié',
	restricted_by: TEACHER_ID,
	expires_at: null,
	created_at: '2026-01-01T00:00:00Z'
};

function teacherLocals(client: unknown) {
	return {
		supabase: client,
		user: { id: TEACHER_ID },
		profile: { id: TEACHER_ID, role: 'teacher' }
	};
}

function deleteRequest(): Request {
	return new Request('http://localhost', {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ restrictionId: RESTRICTION_ID })
	});
}

describe('unrestrict-user : zéro ligne supprimée n’est pas une levée', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('restriction lue, suppression refusée → 403, pas de journal de modération', async () => {
		const { client } = createWriteVerdictSupabase({
			user_restrictions: {
				maybeSingle: { data: RESTRICTION, error: null },
				awaited: { data: [], error: null }
			}
		});
		const { DELETE } = await import('../+server');

		await expectHttpStatus(
			() => DELETE({ request: deleteRequest(), locals: teacherLocals(client) } as never),
			403
		);
		expect(client.rpc).not.toHaveBeenCalled();
	});

	it('une ligne supprimée → succès', async () => {
		const { client } = createWriteVerdictSupabase({
			user_restrictions: {
				maybeSingle: { data: RESTRICTION, error: null },
				awaited: { data: [{ id: RESTRICTION_ID }], error: null }
			}
		});
		const { DELETE } = await import('../+server');

		const response = await DELETE({
			request: deleteRequest(),
			locals: teacherLocals(client)
		} as never);
		expect(response.status).toBe(200);
	});
});
