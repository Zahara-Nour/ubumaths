/**
 * Email de bienvenue : jamais pour un enfant inscrit par son parent.
 * ==================================================================
 *
 * Son adresse est fictive (`…@eleves.chiph.re`) : l'envoi est déjà bloqué par la
 * garde de Brevo, mais la page proposait encore d'écrire. Elle renvoie
 * désormais vers la page des consentements, d'où part le lien au parent.
 *
 * @module routes/teacher/welcome-email/compte-enfant.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440050';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn().mockResolvedValue({ user: { id: TEACHER_ID } })
}));
vi.mock('$lib/server/middleware/student-access', () => ({
	verifyTeacherStudent: vi.fn().mockResolvedValue(true)
}));
vi.mock('$lib/server/email/brevo', () => ({ isBrevoConfigured: () => true }));

function chain(result: unknown) {
	const c: Record<string, unknown> = {};
	for (const m of ['select', 'eq', 'order', 'limit']) c[m] = vi.fn(() => c);
	c.single = vi.fn().mockResolvedValue(result);
	c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
	return c;
}

function locals(email: string) {
	return {
		supabase: {
			from: vi.fn(() =>
				chain({
					data: { id: STUDENT_ID, firstname: 'camille', lastname: null, email },
					error: null
				})
			)
		}
	};
}

async function runLoad(email: string): Promise<unknown> {
	const { load } = await import('../+page.server');
	const url = new URL(`http://localhost/dashboard/teacher/welcome-email?student_id=${STUDENT_ID}`);
	try {
		return await load({ url, locals: locals(email) } as never);
	} catch (thrown) {
		return thrown;
	}
}

describe('welcome-email : compte d’enfant', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('adresse fictive → redirection vers les consentements', async () => {
		const result = await runLoad('camille507@eleves.chiph.re');
		expect(result).toMatchObject({ status: 303, location: '/dashboard/teacher/consent' });
	});

	it('adresse réelle → la page se charge', async () => {
		const result = await runLoad('eleve@example.com');
		expect(result).toMatchObject({ student: { email: 'eleve@example.com' } });
	});
});
