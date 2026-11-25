/**
 * Suppression d'un élève par l'admin : gardes de la route
 * ========================================================
 *
 * Le déroulé de suppression lui-même (`deleteStudentAccount`) est testé par la route de
 * la page Profil et, sur la vraie base, par `tests/integration/suppression-eleve-par-admin`.
 * Ici : qui peut, qui est visé, et que rien ne part si une garde refuse.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { error } from '@sveltejs/kit';

// ============================================================================
// MOCKS
// ============================================================================

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT_ID = '22222222-2222-4222-8222-222222222222';

const mocks = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	rateLimit: vi.fn(),
	deleteStudentAccount: vi.fn(),
	maybeSingle: vi.fn()
}));

vi.mock('#lib/utils/logger.ts', () => ({
	createServerLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })
}));
vi.mock('#lib/server/middleware/auth.ts', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('#lib/server/middleware/rateLimit.ts', () => ({ rateLimit: mocks.rateLimit }));
vi.mock('#lib/server/account-deletion.ts', () => ({
	deleteStudentAccount: mocks.deleteStudentAccount
}));
vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => ({
		from: () => ({
			select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) })
		})
	})
}));

import { DELETE } from '../+server';

// ============================================================================
// HELPERS
// ============================================================================

const STUDENT = {
	id: STUDENT_ID,
	role: 'student',
	firstname: 'Zoé',
	lastname: 'Martin',
	full_name: null,
	email: 'eleve01@local.test'
};

type Event = Parameters<typeof DELETE>[0];

function call(id: string, body: unknown): Promise<Response> {
	const request = new Request(`http://localhost/api/admin/users/${id}/delete`, {
		method: 'DELETE',
		headers: { 'content-type': 'application/json', 'user-agent': 'vitest' },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
	return DELETE({
		request,
		params: { id },
		locals: {},
		getClientAddress: () => '127.0.0.1'
	} as unknown as Event) as Promise<Response>;
}

/** `error()` de SvelteKit lève : on récupère l'objet levé pour le rejouer. */
function httpError(status: number, message: string): unknown {
	try {
		error(status, message);
	} catch (err) {
		return err;
	}
	return undefined;
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
	try {
		await promise;
		return 200;
	} catch (err) {
		return (err as { status: number }).status;
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe('DELETE /api/admin/users/[id]/delete', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireAdmin.mockResolvedValue({ adminUserId: ADMIN_ID, supabase: {} });
		mocks.rateLimit.mockResolvedValue(undefined);
		mocks.maybeSingle.mockResolvedValue({ data: STUDENT, error: null });
		mocks.deleteStudentAccount.mockResolvedValue(undefined);
	});

	test('nominal : supprime l’élève, l’admin noté comme demandeur', async () => {
		const response = await call(STUDENT_ID, { confirmationName: 'Zoé Martin' });

		expect(response.status).toBe(200);
		expect(mocks.deleteStudentAccount).toHaveBeenCalledOnce();
		expect(mocks.deleteStudentAccount.mock.calls[0][1]).toEqual({
			userId: STUDENT_ID,
			email: 'eleve01@local.test',
			ipAddress: '127.0.0.1',
			userAgent: 'vitest',
			requestedBy: ADMIN_ID
		});
	});

	test('espaces en trop autour du nom tolérés', async () => {
		const response = await call(STUDENT_ID, { confirmationName: '  Zoé   Martin ' });
		expect(response.status).toBe(200);
	});

	test('non-admin : refusé, rien de lu ni supprimé', async () => {
		mocks.requireAdmin.mockRejectedValue(httpError(403, 'Élévation admin requise'));

		expect(await statusOf(call(STUDENT_ID, { confirmationName: 'Zoé Martin' }))).toBe(403);
		expect(mocks.maybeSingle).not.toHaveBeenCalled();
		expect(mocks.deleteStudentAccount).not.toHaveBeenCalled();
	});

	test('identifiant non UUID : 400', async () => {
		expect(await statusOf(call('pas-un-uuid', { confirmationName: 'Zoé Martin' }))).toBe(400);
		expect(mocks.deleteStudentAccount).not.toHaveBeenCalled();
	});

	test('corps invalide ou sans nom : 400', async () => {
		expect(await statusOf(call(STUDENT_ID, 'pas du json'))).toBe(400);
		expect(await statusOf(call(STUDENT_ID, {}))).toBe(400);
		expect(await statusOf(call(STUDENT_ID, { confirmationName: '' }))).toBe(400);
		expect(await statusOf(call(STUDENT_ID, { confirmationName: 'x'.repeat(301) }))).toBe(400);
		expect(mocks.deleteStudentAccount).not.toHaveBeenCalled();
	});

	test('son propre compte : 403', async () => {
		expect(await statusOf(call(ADMIN_ID, { confirmationName: 'Zoé Martin' }))).toBe(403);
		expect(mocks.deleteStudentAccount).not.toHaveBeenCalled();
	});

	test('limite de débit dépassée : refusé avant toute lecture', async () => {
		mocks.rateLimit.mockRejectedValue(httpError(429, 'Trop de requêtes'));

		expect(await statusOf(call(STUDENT_ID, { confirmationName: 'Zoé Martin' }))).toBe(429);
		expect(mocks.rateLimit).toHaveBeenCalledWith(
			`admin_account_delete:${ADMIN_ID}`,
			expect.any(Number),
			expect.any(Number)
		);
		expect(mocks.maybeSingle).not.toHaveBeenCalled();
	});

	test('élève introuvable (déjà supprimé) : 404', async () => {
		mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

		expect(await statusOf(call(STUDENT_ID, { confirmationName: 'Zoé Martin' }))).toBe(404);
		expect(mocks.deleteStudentAccount).not.toHaveBeenCalled();
	});

	test.each(['teacher', 'admin'])('compte %s : 403, jamais supprimé', async (role) => {
		mocks.maybeSingle.mockResolvedValue({ data: { ...STUDENT, role }, error: null });

		expect(await statusOf(call(STUDENT_ID, { confirmationName: 'Zoé Martin' }))).toBe(403);
		expect(mocks.deleteStudentAccount).not.toHaveBeenCalled();
	});

	test.each(['zoé martin', 'Zoe Martin', 'Zoé', 'Martin Zoé'])(
		'nom qui ne correspond pas (« %s ») : 400',
		async (typed) => {
			expect(await statusOf(call(STUDENT_ID, { confirmationName: typed }))).toBe(400);
			expect(mocks.deleteStudentAccount).not.toHaveBeenCalled();
		}
	);

	test('lecture du profil en échec : 500, rien de supprimé', async () => {
		mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

		expect(await statusOf(call(STUDENT_ID, { confirmationName: 'Zoé Martin' }))).toBe(500);
		expect(mocks.deleteStudentAccount).not.toHaveBeenCalled();
	});

	test('échec de la suppression : l’erreur remonte', async () => {
		mocks.deleteStudentAccount.mockRejectedValue(httpError(500, 'Erreur lors du nettoyage'));

		expect(await statusOf(call(STUDENT_ID, { confirmationName: 'Zoé Martin' }))).toBe(500);
	});
});
