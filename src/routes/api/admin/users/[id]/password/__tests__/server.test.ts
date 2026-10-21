/**
 * POST /api/admin/users/[id]/password — mot de passe provisoire (PR 3, Q3, R3, R4)
 *
 * Prof ou admin, sur un ÉLÈVE seulement (jamais un prof ni un admin) ; le mot de passe est
 * rendu une fois, jamais mis en cache.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { requireRoles, verifyTeacherStudent, setProvisionalPassword } = vi.hoisted(() => ({
	requireRoles: vi.fn(),
	verifyTeacherStudent: vi.fn(),
	setProvisionalPassword: vi.fn()
}));

vi.mock('$lib/server/middleware/auth', () => ({ requireRoles }));
vi.mock('$lib/server/middleware/student-access', () => ({ verifyTeacherStudent }));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('$lib/server/child-password', () => ({ setProvisionalPassword }));

import { POST } from '../+server';

const STUDENT = '22222222-2222-4222-8222-222222222222';
type PostEvent = Parameters<typeof POST>[0];

function evenement(id = STUDENT): PostEvent {
	return {
		params: { id },
		locals: { supabase: {} }
	} as unknown as PostEvent;
}

beforeEach(() => {
	vi.clearAllMocks();
	requireRoles.mockResolvedValue({ user: { id: 'prof' }, profile: { role: 'teacher' } });
	verifyTeacherStudent.mockResolvedValue(true);
	setProvisionalPassword.mockResolvedValue({ ok: true, password: 'Tigre-Lune-47' });
});

describe('POST /api/admin/users/[id]/password', () => {
	it('élève du prof → mot de passe provisoire rendu, sans cache', async () => {
		const res = await POST(evenement());
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ password: 'Tigre-Lune-47' });
		expect(res.headers.get('Cache-Control')).toBe('no-store');
		expect(requireRoles).toHaveBeenCalledWith(expect.anything(), ['teacher', 'admin']);
		expect(setProvisionalPassword).toHaveBeenCalledWith(expect.anything(), STUDENT);
	});

	it('cible qui n’est pas un élève (prof, admin, soi-même, inconnu) → 403, rien ne change', async () => {
		verifyTeacherStudent.mockResolvedValue(false);
		await expect(POST(evenement())).rejects.toMatchObject({ status: 403 });
		expect(setProvisionalPassword).not.toHaveBeenCalled();
	});

	it('identifiant mal formé → 400', async () => {
		await expect(POST(evenement('pas-un-uuid'))).rejects.toMatchObject({ status: 400 });
		expect(setProvisionalPassword).not.toHaveBeenCalled();
	});

	it('appelant ni prof ni admin → refusé par requireRoles', async () => {
		requireRoles.mockRejectedValue({ status: 403 });
		await expect(POST(evenement())).rejects.toMatchObject({ status: 403 });
		expect(setProvisionalPassword).not.toHaveBeenCalled();
	});

	it('échec de GoTrue → 500', async () => {
		setProvisionalPassword.mockResolvedValue({ ok: false, reason: 'server_error' });
		await expect(POST(evenement())).rejects.toMatchObject({ status: 500 });
	});
});
