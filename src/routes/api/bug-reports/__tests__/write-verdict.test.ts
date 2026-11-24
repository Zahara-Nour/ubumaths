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
} from '#tests/helpers/write-verdict-supabase.ts';

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

const CAPTURE_A = `${USER_ID}/${REPORT_A}/1700000000000.png`;

/** Le rapport existe (lecture de contrôle), la suppression rend `deletedRows`. */
function existingReport(screenshotPath: string | null, deletedRows: unknown[]) {
	return {
		maybeSingle: { data: { id: REPORT_A, screenshot_path: screenshotPath }, error: null },
		awaited: { data: deletedRows, error: null }
	};
}

const STORAGE_FAILURE = { data: null, error: { message: 'stockage indisponible' } };

describe('DELETE /api/bug-reports/[reportId]', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('rapport inconnu → 404, pas de succès', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: { maybeSingle: { data: null, error: null }, awaited: { data: [], error: null } }
		});
		const { DELETE } = await import('../[reportId]/+server');

		await expectHttpStatus(
			() => DELETE({ params: { reportId: REPORT_A }, locals: createLocals(client) } as never),
			404
		);
	});

	it('zéro ligne supprimée → 404, pas de succès', async () => {
		const { client } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: existingReport(null, [])
		});
		const { DELETE } = await import('../[reportId]/+server');

		await expectHttpStatus(
			() => DELETE({ params: { reportId: REPORT_A }, locals: createLocals(client) } as never),
			404
		);
	});

	it('rapport sans capture → supprimé, le stockage n’est pas touché', async () => {
		const { client, removedPaths } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: existingReport(null, [{ id: REPORT_A }])
		});
		const { DELETE } = await import('../[reportId]/+server');

		const response = await DELETE({
			params: { reportId: REPORT_A },
			locals: createLocals(client)
		} as never);
		expect(await response.json()).toEqual({ success: true });
		expect(removedPaths).toEqual([]);
	});

	it('rapport avec capture → la capture est retirée du stockage, puis la ligne', async () => {
		const { client, chains, bucket, removedPaths } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: existingReport(CAPTURE_A, [{ id: REPORT_A }])
		});
		const { DELETE } = await import('../[reportId]/+server');

		const response = await DELETE({
			params: { reportId: REPORT_A },
			locals: createLocals(client)
		} as never);

		expect(await response.json()).toEqual({ success: true });
		expect(client.storage.from).toHaveBeenCalledWith('bug-report-screenshots');
		expect(removedPaths).toEqual([[CAPTURE_A]]);
		// La capture part AVANT la ligne : sinon un échec du stockage la laisse orpheline.
		const deleteSpy = chains.bug_reports.delete as ReturnType<typeof vi.fn>;
		expect(bucket.remove.mock.invocationCallOrder[0]).toBeLessThan(
			deleteSpy.mock.invocationCallOrder[0]
		);
	});

	it('capture impossible à effacer → 500, la ligne n’est pas supprimée', async () => {
		const { client, chains, bucket } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: existingReport(CAPTURE_A, [{ id: REPORT_A }])
		});
		bucket.remove.mockResolvedValueOnce(STORAGE_FAILURE as never);
		const { DELETE } = await import('../[reportId]/+server');

		let thrown: unknown = null;
		try {
			await DELETE({ params: { reportId: REPORT_A }, locals: createLocals(client) } as never);
		} catch (err) {
			thrown = err;
		}

		expect(thrown).toMatchObject({
			status: 500,
			body: { message: 'Suppression impossible : la capture n’a pas pu être effacée' }
		});
		expect(chains.bug_reports.delete).not.toHaveBeenCalled();
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
			bug_reports: existingReport(null, [])
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

	it('DELETE : chaque capture est retirée du stockage avec son rapport', async () => {
		const { client, removedPaths } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: existingReport(CAPTURE_A, [{ id: REPORT_A }])
		});
		const { DELETE } = await import('../batch/+server');

		const response = await DELETE({
			request: jsonRequest('DELETE', { reportIds: [REPORT_A] }),
			locals: createLocals(client)
		} as never);

		expect(await response.json()).toEqual({ success: true, deleted: 1, failed: [] });
		expect(removedPaths).toEqual([[CAPTURE_A]]);
	});

	it('DELETE : capture impossible à effacer → rapport en échec, ligne gardée', async () => {
		const { client, chains, bucket } = createWriteVerdictSupabase({
			profiles: profile('admin'),
			bug_reports: existingReport(CAPTURE_A, [{ id: REPORT_A }])
		});
		bucket.remove.mockResolvedValueOnce(STORAGE_FAILURE as never);
		const { DELETE } = await import('../batch/+server');

		const response = await DELETE({
			request: jsonRequest('DELETE', { reportIds: [REPORT_A] }),
			locals: createLocals(client)
		} as never);

		expect(await response.json()).toEqual({
			success: false,
			deleted: 0,
			failed: [{ id: REPORT_A, reason: 'La capture n’a pas pu être effacée' }]
		});
		expect(chains.bug_reports.delete).not.toHaveBeenCalled();
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
