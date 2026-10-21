/**
 * Action « Modifier l'adresse du parent » (page prof du consentement)
 * ===================================================================
 *
 * Audit de la PR 3, M1 : l'adresse d'une demande déjà `granted` est celle que le parent a
 * confirmée ; c'est là que part le lien « Mot de passe oublié » de l'enfant. La réécrire
 * enverrait ce lien à une adresse que personne n'a confirmée → refus (David, 2026-10-21).
 * Demande EN ATTENTE (contre-revue) : son lien est peut-être déjà parti à l'ancienne adresse ;
 * il accorderait la demande à la nouvelle. La demande est fermée, une nouvelle est créée.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/email/brevo', () => ({ isBrevoConfigured: () => true }));
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn(async () => ({ user: { id: TEACHER_ID } })),
	requireRoles: vi.fn()
}));
vi.mock('$lib/server/middleware/student-access', () => ({
	verifyTeacherStudent: vi.fn(async () => true)
}));
const { closePendingConsentRequest } = vi.hoisted(() => ({
	closePendingConsentRequest: vi.fn()
}));
vi.mock('$lib/server/parental-consent-requests', () => ({ closePendingConsentRequest }));

const { actions } = await import('../+page.server');

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440000';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440001';

type Existing = { id: string; status: string; parent_email: string } | null;

/** Client factice : lecture de la dernière demande, puis mise à jour ou création. */
function makeSupabase(existing: Existing) {
	const calls = { update: vi.fn(), insert: vi.fn() };
	const from = vi.fn(() => {
		let mode: 'read' | 'update' = 'read';
		const chain: Record<string, unknown> = {};
		chain.select = vi.fn(() =>
			mode === 'update' ? Promise.resolve({ data: [{ id: 'c1' }], error: null }) : chain
		);
		chain.eq = vi.fn(() => chain);
		chain.neq = vi.fn(() => chain);
		chain.order = vi.fn(() => chain);
		chain.limit = vi.fn(() => chain);
		chain.single = vi.fn(() =>
			Promise.resolve(
				existing
					? { data: existing, error: null }
					: { data: null, error: { code: 'PGRST116', message: 'none' } }
			)
		);
		chain.update = vi.fn((payload: unknown) => {
			mode = 'update';
			calls.update(payload);
			return chain;
		});
		chain.insert = vi.fn((payload: unknown) => {
			calls.insert(payload);
			return Promise.resolve({ error: null });
		});
		return chain;
	});
	return { supabase: { from }, calls };
}

async function modifier(existing: Existing) {
	const { supabase, calls } = makeSupabase(existing);
	const form = new FormData();
	form.set('studentId', STUDENT_ID);
	form.set('parentEmail', 'autre@exemple.fr');
	const res = (await actions.updateParentEmail({
		request: new Request('http://localhost/dashboard/teacher/consent', {
			method: 'POST',
			body: form
		}),
		locals: { supabase }
	} as never)) as { status?: number; data?: { error?: string }; success?: boolean };
	return { res, calls };
}

beforeEach(() => {
	vi.clearAllMocks();
	closePendingConsentRequest.mockResolvedValue(true);
});

const ANCIENNE = 'ancienne@exemple.fr';

describe('updateParentEmail', () => {
	it('demande confirmée (granted) → refus, adresse intacte', async () => {
		const { res, calls } = await modifier({ id: 'c1', status: 'granted', parent_email: ANCIENNE });
		expect(res.status).toBe(409);
		expect(res.data?.error).toMatch(/confirm/);
		expect(calls.update).not.toHaveBeenCalled();
		expect(calls.insert).not.toHaveBeenCalled();
	});

	it('demande en attente, autre adresse → ancienne fermée, nouvelle demande (jeton neuf)', async () => {
		const { res, calls } = await modifier({ id: 'c1', status: 'pending', parent_email: ANCIENNE });
		expect(res).toEqual({ success: true });
		expect(closePendingConsentRequest).toHaveBeenCalledWith(expect.anything(), 'c1');
		expect(calls.update).not.toHaveBeenCalled();
		expect(calls.insert).toHaveBeenCalledWith(
			expect.objectContaining({ parent_email: 'autre@exemple.fr', status: 'pending' })
		);
	});

	it('demande en attente non fermée (RLS, accordée entre-temps) → 409, rien de créé', async () => {
		closePendingConsentRequest.mockResolvedValue(false);
		const { res, calls } = await modifier({ id: 'c1', status: 'pending', parent_email: ANCIENNE });
		expect(res.status).toBe(409);
		expect(calls.insert).not.toHaveBeenCalled();
	});

	it('demande en attente, même adresse → rien ne change', async () => {
		const { res, calls } = await modifier({
			id: 'c1',
			status: 'pending',
			parent_email: 'autre@exemple.fr'
		});
		expect(res).toEqual({ success: true });
		expect(closePendingConsentRequest).not.toHaveBeenCalled();
		expect(calls.update).not.toHaveBeenCalled();
		expect(calls.insert).not.toHaveBeenCalled();
	});

	it('demande expirée (lien mort) → adresse mise à jour', async () => {
		const { res, calls } = await modifier({ id: 'c1', status: 'expired', parent_email: ANCIENNE });
		expect(res).toEqual({ success: true });
		expect(closePendingConsentRequest).not.toHaveBeenCalled();
		expect(calls.update).toHaveBeenCalledWith({ parent_email: 'autre@exemple.fr' });
	});

	it('aucune demande → création d’une demande en attente', async () => {
		const { res, calls } = await modifier(null);
		expect(res).toEqual({ success: true });
		expect(calls.insert).toHaveBeenCalledWith(
			expect.objectContaining({ parent_email: 'autre@exemple.fr', status: 'pending' })
		);
	});
});
