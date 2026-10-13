/**
 * PUT /api/moderation/reports/[id] : un signalement inconnu n'est pas « traité ».
 * ==============================================================================
 *
 * La RPC `review_report` fait un UPDATE sans compter les lignes et rend `void` :
 * un identifiant inconnu rendait succès sur zéro ligne modifiée. La route lit
 * désormais le signalement avant d'appeler la RPC.
 *
 * @module routes/api/moderation/reports/write-verdict.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createWriteVerdictSupabase,
	expectHttpStatus
} from '$tests/helpers/write-verdict-supabase';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const REPORT_ID = '550e8400-e29b-41d4-a716-446655440020';

function teacherLocals(client: unknown) {
	return {
		supabase: client,
		user: { id: TEACHER_ID },
		profile: { id: TEACHER_ID, role: 'teacher' }
	};
}

function putRequest(): Request {
	return new Request('http://localhost', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ status: 'dismissed' })
	});
}

describe('review_report : le signalement doit exister', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('signalement inconnu → 404, la RPC n’est pas appelée', async () => {
		const { client } = createWriteVerdictSupabase({
			message_reports: { maybeSingle: { data: null, error: null } }
		});
		const { PUT } = await import('../+server');

		await expectHttpStatus(
			() =>
				PUT({
					request: putRequest(),
					params: { id: REPORT_ID },
					locals: teacherLocals(client)
				} as never),
			404
		);
		expect(client.rpc).not.toHaveBeenCalled();
	});

	it('signalement existant → succès', async () => {
		const { client } = createWriteVerdictSupabase({
			message_reports: { maybeSingle: { data: { id: REPORT_ID }, error: null } }
		});
		const { PUT } = await import('../+server');

		const response = await PUT({
			request: putRequest(),
			params: { id: REPORT_ID },
			locals: teacherLocals(client)
		} as never);
		expect(await response.json()).toEqual({ success: true });
		expect(client.rpc).toHaveBeenCalledWith('review_report', expect.any(Object));
	});
});
