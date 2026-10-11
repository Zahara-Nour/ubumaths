/**
 * POST /api/student/age-declaration — question d'âge en 2nde
 * ==========================================================
 *
 * B8  Oui → 15_plus + date + consent_required=false (client service)
 * B9  Non → under_15 + date, consent_required=true ; 30 j de grâce si aucun en cours
 * B11 réponse déjà donnée → 409
 * B12 hors 2nde / non-élève → 403
 * B13 écriture par le client service uniquement, .select() et 1 ligne vérifiée
 * B14 corps mal formé → 400
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// ----------------------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------------------

const requireAuthMock = vi.fn();
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: (...args: unknown[]) => requireAuthMock(...args)
}));

interface UpdateChain {
	update: ReturnType<typeof vi.fn>;
	eq: ReturnType<typeof vi.fn>;
	is: ReturnType<typeof vi.fn>;
	select: ReturnType<typeof vi.fn>;
}

let serviceChain: UpdateChain;
const serviceFrom = vi.fn();
const createServiceRoleClientMock = vi.fn(() => ({ from: serviceFrom }));
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => createServiceRoleClientMock()
}));

import { POST } from '../+server';

// ----------------------------------------------------------------------------
// Aides
// ----------------------------------------------------------------------------

const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440001';

function makeServiceChain(result: { data: unknown; error: unknown }): UpdateChain {
	const chain = {} as UpdateChain;
	chain.update = vi.fn(() => chain);
	chain.eq = vi.fn(() => chain);
	chain.is = vi.fn(() => chain);
	chain.select = vi.fn(() => Promise.resolve(result));
	return chain;
}

// Client « élève » : il ne doit JAMAIS servir à écrire.
const studentFrom = vi.fn(() => {
	throw new Error('le client élève ne doit pas être utilisé');
});

function makeEvent(body: unknown, raw = false): RequestEvent {
	const request = new Request('http://localhost/api/student/age-declaration', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: raw ? (body as string) : JSON.stringify(body)
	});
	return {
		request,
		locals: { supabase: { from: studentFrom } }
	} as unknown as RequestEvent;
}

function asStudent(overrides: Record<string, unknown> = {}) {
	requireAuthMock.mockResolvedValue({
		user: { id: STUDENT_ID },
		profile: {
			id: STUDENT_ID,
			role: 'student',
			grade: '2',
			age_declaration: null,
			consent_required: true,
			...overrides
		}
	});
}

// Un handler SvelteKit rend un MaybePromise<Response>.
async function statusOf(promise: Response | Promise<Response>): Promise<number> {
	try {
		const res = await promise;
		return res.status;
	} catch (e) {
		return (e as { status: number }).status;
	}
}

beforeEach(() => {
	vi.clearAllMocks();
	serviceChain = makeServiceChain({ data: [{ id: STUDENT_ID }], error: null });
	serviceFrom.mockImplementation(() => serviceChain);
});

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('POST /api/student/age-declaration', () => {
	it('B8 — Oui : 15_plus, date, consent_required=false, via le client service', async () => {
		asStudent();
		const before = Date.now();
		const res = (await POST(makeEvent({ fifteenOrOlder: true }) as never)) as Response;
		expect(res.status).toBe(200);

		expect(createServiceRoleClientMock).toHaveBeenCalled();
		expect(serviceFrom).toHaveBeenCalledWith('profiles');
		const payload = serviceChain.update.mock.calls[0][0] as Record<string, unknown>;
		expect(payload.age_declaration).toBe('15_plus');
		expect(payload.consent_required).toBe(false);
		const at = new Date(payload.age_declared_at as string).getTime();
		expect(at).toBeGreaterThanOrEqual(before - 1000);
		expect(at).toBeLessThanOrEqual(Date.now() + 1000);

		// Ciblé sur l'élève appelant, et seulement si aucune réponse n'existe encore.
		expect(serviceChain.eq).toHaveBeenCalledWith('id', STUDENT_ID);
		expect(serviceChain.is).toHaveBeenCalledWith('age_declaration', null);
		expect(serviceChain.select).toHaveBeenCalled();
		expect(studentFrom).not.toHaveBeenCalled();
	});

	it('B9 — Non : under_15, date, consent_required=true, délai de grâce en cours conservé', async () => {
		asStudent({
			consent_required: true,
			consent_granted_at: null,
			consent_grace_period_ends: new Date(Date.now() + 5 * 86_400_000).toISOString()
		});
		const res = (await POST(makeEvent({ fifteenOrOlder: false }) as never)) as Response;
		expect(res.status).toBe(200);
		const payload = serviceChain.update.mock.calls[0][0] as Record<string, unknown>;
		expect(payload.age_declaration).toBe('under_15');
		expect(typeof payload.age_declared_at).toBe('string');
		expect(payload.consent_required).toBe(true);
		expect(payload).not.toHaveProperty('consent_grace_period_ends');
		expect(studentFrom).not.toHaveBeenCalled();
	});

	it('B9 — Non avec un délai de grâce échu : nouveau délai de 30 jours', async () => {
		asStudent({
			consent_required: true,
			consent_granted_at: null,
			consent_grace_period_ends: new Date(Date.now() - 86_400_000).toISOString()
		});
		await POST(makeEvent({ fifteenOrOlder: false }) as never);
		const payload = serviceChain.update.mock.calls[0][0] as Record<string, unknown>;
		expect(payload.consent_required).toBe(true);
		const fin = new Date(payload.consent_grace_period_ends as string).getTime() - Date.now();
		expect(fin).toBeGreaterThan(29 * 86_400_000);
		expect(fin).toBeLessThanOrEqual(30 * 86_400_000 + 60_000);
	});

	it.each([[true], [false]])(
		'Q74 — élève dispensé (consent_required=false), réponse %s → 403, rien écrit',
		async (fifteenOrOlder) => {
			asStudent({ consent_required: false });
			expect(await statusOf(POST(makeEvent({ fifteenOrOlder }) as never))).toBe(403);
			expect(serviceChain.update).not.toHaveBeenCalled();
		}
	);

	it('B11 — réponse déjà enregistrée → 409, rien écrit', async () => {
		asStudent({ age_declaration: 'under_15' });
		expect(await statusOf(POST(makeEvent({ fifteenOrOlder: true }) as never))).toBe(409);
		expect(serviceChain.update).not.toHaveBeenCalled();
	});

	it('B11 — course : la ligne a été répondue entre-temps (0 ligne) → 409', async () => {
		asStudent();
		serviceChain = makeServiceChain({ data: [], error: null });
		expect(await statusOf(POST(makeEvent({ fifteenOrOlder: true }) as never))).toBe(409);
	});

	it.each([['3'], ['1_SPE'], [null]])('B12 — élève de niveau %s → 403', async (grade) => {
		asStudent({ grade });
		expect(await statusOf(POST(makeEvent({ fifteenOrOlder: true }) as never))).toBe(403);
		expect(serviceChain.update).not.toHaveBeenCalled();
	});

	it.each([['teacher'], ['admin']])('B12 — rôle %s (même grade 2) → 403', async (role) => {
		asStudent({ role });
		expect(await statusOf(POST(makeEvent({ fifteenOrOlder: true }) as never))).toBe(403);
		expect(serviceChain.update).not.toHaveBeenCalled();
	});

	it('non connecté → l’erreur de requireAuth (401) remonte', async () => {
		requireAuthMock.mockRejectedValue({ status: 401, body: { message: 'Non autorisé' } });
		expect(await statusOf(POST(makeEvent({ fifteenOrOlder: true }) as never))).toBe(401);
		expect(serviceChain.update).not.toHaveBeenCalled();
	});

	it.each([
		['champ absent', {}],
		['mauvais type', { fifteenOrOlder: 'oui' }],
		['champ en trop', { fifteenOrOlder: true, consent_required: false }],
		['tableau', [true]]
	])('B14 — corps mal formé (%s) → 400', async (_label, body) => {
		asStudent();
		expect(await statusOf(POST(makeEvent(body) as never))).toBe(400);
		expect(serviceChain.update).not.toHaveBeenCalled();
	});

	it('B14 — JSON invalide → 400', async () => {
		asStudent();
		expect(await statusOf(POST(makeEvent('{pas du json', true) as never))).toBe(400);
		expect(serviceChain.update).not.toHaveBeenCalled();
	});

	it('erreur base → 500', async () => {
		asStudent();
		serviceChain = makeServiceChain({ data: null, error: { message: 'boom' } });
		expect(await statusOf(POST(makeEvent({ fifteenOrOlder: true }) as never))).toBe(500);
	});
});
