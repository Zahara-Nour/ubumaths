/**
 * Code d'inscription et ouverture des inscriptions : écritures vérifiées.
 * ======================================================================
 *
 * ⚠️ Une mise à jour refusée par la RLS (ou d'une classe inconnue) touche zéro
 * ligne sans erreur. Sans `.select()`, `regenerateJoinCode` affichait un code
 * qui n'existait nulle part, et `toggleRegistration` un état qui n'avait pas
 * changé.
 *
 * @module routes/teacher/classes/class-write-verdict.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWriteVerdictSupabase } from '$tests/helpers/write-verdict-supabase';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const CLASS_ID = '550e8400-e29b-41d4-a716-446655440020';

function teacherLocals(client: unknown) {
	return {
		supabase: client,
		user: { id: TEACHER_ID },
		safeGetSession: vi.fn().mockResolvedValue({
			user: { id: TEACHER_ID },
			session: { access_token: 'token' }
		})
	};
}

function formRequest(fields: Record<string, string>): Request {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.append(k, v);
	return new Request('http://localhost', { method: 'POST', body });
}

function createClient(classesRows: unknown[]) {
	return createWriteVerdictSupabase(
		{
			profiles: { single: { data: { id: TEACHER_ID, role: 'teacher' }, error: null } },
			classes: { awaited: { data: classesRows, error: null } }
		},
		{ data: 'NEWCODE1', error: null }
	).client;
}

describe('actions de classe : le serveur vérifie ce qu’il a écrit', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('regenerateJoinCode : zéro ligne modifiée n’est PAS un succès', async () => {
		const { actions } = await import('../+page.server');

		const result = await actions.regenerateJoinCode({
			request: formRequest({ classId: CLASS_ID }),
			locals: teacherLocals(createClient([]))
		} as never);

		expect(result).toMatchObject({ status: 404 });
		expect(result).not.toHaveProperty('joinCode');
	});

	it('regenerateJoinCode : une ligne modifiée rend le nouveau code', async () => {
		const { actions } = await import('../+page.server');

		const result = await actions.regenerateJoinCode({
			request: formRequest({ classId: CLASS_ID }),
			locals: teacherLocals(createClient([{ id: CLASS_ID }]))
		} as never);

		expect(result).toMatchObject({ success: true, joinCode: 'NEWCODE1' });
	});

	it('toggleRegistration : zéro ligne modifiée n’est PAS un succès', async () => {
		const { actions } = await import('../+page.server');

		const result = await actions.toggleRegistration({
			request: formRequest({ classId: CLASS_ID, open: 'true' }),
			locals: teacherLocals(createClient([]))
		} as never);

		expect(result).toMatchObject({ status: 404 });
		expect(result).not.toHaveProperty('success');
	});

	it('toggleRegistration : une ligne modifiée est un succès', async () => {
		const { actions } = await import('../+page.server');

		const result = await actions.toggleRegistration({
			request: formRequest({ classId: CLASS_ID, open: 'false' }),
			locals: teacherLocals(createClient([{ id: CLASS_ID }]))
		} as never);

		expect(result).toMatchObject({ success: true });
	});
});
