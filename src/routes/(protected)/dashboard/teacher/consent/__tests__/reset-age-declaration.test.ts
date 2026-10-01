/**
 * Action « Annuler la déclaration » (page prof du consentement)
 * =============================================================
 *
 * C16 prof/admin : age_declaration=null, age_declared_at=null, consent_required=true,
 *     consent_grace_period_ends=maintenant+30 j, avec le client du professeur
 *     (locals.supabase), .select() et exactement 1 ligne vérifiée.
 * C17 un élève ne peut pas annuler → 403 (requireRoles réel, pas mocké).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/email/brevo', () => ({ isBrevoConfigured: () => true }));

import { actions } from '../+page.server';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440000';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440001';
const DAY_MS = 24 * 60 * 60 * 1000;

type Role = 'student' | 'teacher' | 'admin';

interface Recorded {
	updatePayload: Record<string, unknown> | null;
	updateEq: unknown[][];
	selectAfterUpdate: boolean;
}

/**
 * Client Supabase factice : distingue la lecture du profil appelant (requireAuth →
 * .single()), la vérification des rôles (verifyTeacherStudent → .in()) et la mise à
 * jour (.update().eq().select()).
 */
function makeSupabase(opts: {
	callerRole: Role;
	targetRole?: Role;
	updateResult?: { data: unknown; error: unknown };
}) {
	const recorded: Recorded = { updatePayload: null, updateEq: [], selectAfterUpdate: false };
	const from = vi.fn(() => {
		let isUpdate = false;
		const chain: Record<string, unknown> = {};
		chain.select = vi.fn(() => {
			if (isUpdate) {
				recorded.selectAfterUpdate = true;
				return Promise.resolve(opts.updateResult ?? { data: [{ id: STUDENT_ID }], error: null });
			}
			return chain;
		});
		chain.eq = vi.fn((...args: unknown[]) => {
			if (isUpdate) recorded.updateEq.push(args);
			return chain;
		});
		chain.single = vi.fn(() =>
			Promise.resolve({ data: { id: TEACHER_ID, role: opts.callerRole }, error: null })
		);
		chain.in = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: TEACHER_ID, role: opts.callerRole },
					{ id: STUDENT_ID, role: opts.targetRole ?? 'student' }
				],
				error: null
			})
		);
		chain.update = vi.fn((payload: Record<string, unknown>) => {
			isUpdate = true;
			recorded.updatePayload = payload;
			return chain;
		});
		return chain;
	});
	return { client: { from }, recorded };
}

/** studentId null = champ absent du formulaire. */
function makeEvent(supabase: unknown, studentId: string | null = STUDENT_ID) {
	const form = new FormData();
	if (studentId !== null) form.set('studentId', studentId);
	return {
		request: new Request('http://localhost', { method: 'POST', body: form }),
		locals: {
			supabase,
			safeGetSession: async () => ({ user: { id: TEACHER_ID }, session: {} })
		}
	} as never;
}

async function run(event: never): Promise<{ status?: number; data?: unknown; thrown?: number }> {
	try {
		const result = (await actions.resetAgeDeclaration(event)) as
			| { status: number; data: unknown }
			| Record<string, unknown>;
		if (result && typeof result === 'object' && 'status' in result) {
			return { status: result.status as number, data: result.data };
		}
		return { status: 200, data: result };
	} catch (e) {
		return { thrown: (e as { status: number }).status };
	}
}

describe('actions.resetAgeDeclaration', () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([['teacher' as Role], ['admin' as Role]])(
		'C16 — %s : remet à null, consent_required=true, grâce de 30 jours, via locals.supabase',
		async (role) => {
			const { client, recorded } = makeSupabase({ callerRole: role });
			const before = Date.now();
			const res = await run(makeEvent(client));
			expect(res.thrown).toBeUndefined();
			expect(res.status).toBe(200);

			const p = recorded.updatePayload!;
			expect(p.age_declaration).toBeNull();
			expect(p.age_declared_at).toBeNull();
			expect(p.consent_required).toBe(true);
			const ends = new Date(p.consent_grace_period_ends as string).getTime();
			expect(ends).toBeGreaterThanOrEqual(before + 30 * DAY_MS - 1000);
			expect(ends).toBeLessThanOrEqual(Date.now() + 30 * DAY_MS + 1000);

			expect(recorded.updateEq).toContainEqual(['id', STUDENT_ID]);
			expect(recorded.selectAfterUpdate).toBe(true);
		}
	);

	it('C16 — 0 ligne rendue (RLS silencieuse) → échec, pas de succès annoncé', async () => {
		const { client } = makeSupabase({
			callerRole: 'teacher',
			updateResult: { data: [], error: null }
		});
		const res = await run(makeEvent(client));
		expect(res.status).not.toBe(200);
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	it('C16 — erreur base → 500', async () => {
		const { client } = makeSupabase({
			callerRole: 'teacher',
			updateResult: { data: null, error: { message: 'boom' } }
		});
		const res = await run(makeEvent(client));
		expect(res.status).toBe(500);
	});

	it('C17 — un élève ne peut pas annuler → 403, rien écrit', async () => {
		const { client, recorded } = makeSupabase({ callerRole: 'student' });
		const res = await run(makeEvent(client));
		expect(res.thrown).toBe(403);
		expect(recorded.updatePayload).toBeNull();
	});

	it('cible qui n’est pas un élève → 403, rien écrit', async () => {
		const { client, recorded } = makeSupabase({ callerRole: 'teacher', targetRole: 'teacher' });
		const res = await run(makeEvent(client));
		expect(res.status).toBe(403);
		expect(recorded.updatePayload).toBeNull();
	});

	it.each([['pas-un-uuid'], [null]])('studentId invalide (%s) → 400', async (id) => {
		const { client, recorded } = makeSupabase({ callerRole: 'teacher' });
		const res = await run(makeEvent(client, id));
		expect(res.status).toBe(400);
		expect(recorded.updatePayload).toBeNull();
	});
});
