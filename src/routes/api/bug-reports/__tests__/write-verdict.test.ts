/**
 * Rapports de bug : les écritures rendent-elles compte de ce qu'elles ont écrit ?
 * ==============================================================================
 *
 * ⚠️ Une écriture refusée par la RLS (ou visant un rapport inconnu) touche zéro
 * ligne sans erreur. Sans `.select()` :
 *   - `DELETE /api/bug-reports/[id]` annonçait une suppression qui n'avait pas eu lieu ;
 *   - les lots comptaient comme « mis à jour » / « supprimés » des rapports intacts ;
 *   - l'envoi d'une capture annonçait un succès, et le fichier restait orphelin
 *     dans le bucket.
 *
 * @module routes/api/bug-reports/write-verdict.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createWriteVerdictSupabase,
	expectHttpStatus
} from '$tests/helpers/write-verdict-supabase';

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const REPORT_A = '550e8400-e29b-41d4-a716-446655440040';
const REPORT_B = '550e8400-e29b-41d4-a716-446655440041';

/** Signature PNG (octets magiques) suivie de quelques octets. */
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

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

function profile(role: 'admin' | 'student') {
	return { single: { data: { id: USER_ID, role }, error: null } };
}

function jsonRequest(method: string, body: unknown): Request {
	return new Request('http://localhost', {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

describe('DELETE /api/bug-reports/[reportId]', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('zéro ligne supprimée → 404, pas de succès', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: { awaited: { data: [], error: null } }
		});
		const { DELETE } = await import('../[reportId]/+server');

		await expectHttpStatus(
			() => DELETE({ params: { reportId: REPORT_A }, locals: createLocals(client) } as never),
			404
		);
	});

	it('une ligne supprimée → succès', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: { awaited: { data: [{ id: REPORT_A }], error: null } }
		});
		const { DELETE } = await import('../[reportId]/+server');

		const response = await DELETE({
			params: { reportId: REPORT_A },
			locals: createLocals(client)
		} as never);
		expect(await response.json()).toEqual({ success: true });
	});
});

describe('lots /api/bug-reports/batch : un rapport intact compte comme un échec', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('PATCH : zéro ligne modifiée → 0 mis à jour, chaque identifiant en échec', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: { awaited: { data: [], error: null } }
		});
		const { PATCH } = await import('../batch/+server');

		const response = await PATCH({
			request: jsonRequest('PATCH', { reportIds: [REPORT_A, REPORT_B], status: 'resolved' }),
			locals: createLocals(client)
		} as never);
		const body = await response.json();

		expect(body.success).toBe(false);
		expect(body.updated).toBe(0);
		expect(body.failed.map((f: { id: string }) => f.id)).toEqual([REPORT_A, REPORT_B]);
	});

	it('DELETE : zéro ligne supprimée → 0 supprimé, chaque identifiant en échec', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: { awaited: { data: [], error: null } }
		});
		const { DELETE } = await import('../batch/+server');

		const response = await DELETE({
			request: jsonRequest('DELETE', { reportIds: [REPORT_A, REPORT_B] }),
			locals: createLocals(client)
		} as never);
		const body = await response.json();

		expect(body.success).toBe(false);
		expect(body.deleted).toBe(0);
		expect(body.failed.map((f: { id: string }) => f.id)).toEqual([REPORT_A, REPORT_B]);
	});

	it('PATCH : une ligne par rapport → tout est mis à jour', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: { awaited: { data: [{ id: REPORT_A }], error: null } }
		});
		const { PATCH } = await import('../batch/+server');

		const response = await PATCH({
			request: jsonRequest('PATCH', { reportIds: [REPORT_A], status: 'in_progress' }),
			locals: createLocals(client)
		} as never);

		expect(await response.json()).toEqual({ success: true, updated: 1, failed: [] });
	});
});

describe('POST /api/bug-reports/[reportId]/screenshot', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	function screenshotRequest(): Request {
		const body = new FormData();
		body.append('image', new File([PNG_BYTES], 'capture.png', { type: 'image/png' }));
		return new Request('http://localhost', { method: 'POST', body });
	}

	function createClient(updatedRows: unknown[]) {
		return createWriteVerdictSupabase({
			profiles: profile('student'),
			bug_reports: {
				single: { data: { id: REPORT_A, user_id: USER_ID, screenshot_path: null }, error: null },
				awaited: { data: updatedRows, error: null }
			}
		});
	}

	it('rapport non mis à jour → 403 et le fichier envoyé est retiré du bucket', async () => {
		const { client, bucket, removedPaths } = createClient([]);
		const { POST } = await import('../[reportId]/screenshot/+server');

		await expectHttpStatus(
			() =>
				POST({
					params: { reportId: REPORT_A },
					request: screenshotRequest(),
					locals: createLocals(client)
				} as never),
			403
		);

		const uploadedPath = bucket.upload.mock.calls[0]?.[0];
		expect(uploadedPath).toMatch(new RegExp(`^${USER_ID}/${REPORT_A}/\\d+\\.png$`));
		expect(removedPaths).toEqual([[uploadedPath]]);
	});

	it('rapport mis à jour → succès, rien n’est retiré', async () => {
		const { client, removedPaths } = createClient([{ id: REPORT_A }]);
		const { POST } = await import('../[reportId]/screenshot/+server');

		const response = await POST({
			params: { reportId: REPORT_A },
			request: screenshotRequest(),
			locals: createLocals(client)
		} as never);

		expect(await response.json()).toMatchObject({ success: true });
		expect(removedPaths).toEqual([]);
	});
});
