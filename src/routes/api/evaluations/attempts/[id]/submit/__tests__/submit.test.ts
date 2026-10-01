/**
 * POST /api/evaluations/attempts/[id]/submit — ce que la route ajoute au module :
 * Zod, 409 avec la copie déjà notée (réponse perdue en route), limite de débit.
 * La correction elle-même tourne contre la vraie base :
 * `tests/integration/evaluation-notee-serveur.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const submit = vi.hoisted(() => vi.fn());
/** Comportement de l'envoi ; une fonction ordinaire (un vi.fn qui lève est signalé en échec) */
const behavior = vi.hoisted(() => ({ current: null as null | (() => unknown) }));
vi.mock('$lib/server/evaluation-attempts', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/evaluation-attempts')>()),
	submitEvaluationAttempt: async (...args: unknown[]) => {
		submit(...args);
		return behavior.current?.();
	}
}));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: vi.fn(async (locals: { userId: string }) => ({
		user: { id: locals.userId },
		profile: { role: 'student' }
	}))
}));

import { POST } from '../+server';
import { AttemptAlreadySubmittedError } from '$lib/server/evaluation-attempts';

const ATTEMPT = '99999999-9999-4999-8999-999999999999';
const COPY = {
	attemptId: ATTEMPT,
	late: false,
	grade: 15,
	pointsEarned: 3,
	totalQuestions: 4,
	correctCount: 3,
	questions: []
};

function call(body: unknown, userId = 'eleve-1') {
	return POST({
		params: { id: ATTEMPT },
		request: new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }),
		locals: { userId, supabase: {} }
	} as never);
}

async function statusOf(promise: Promise<Response>): Promise<number> {
	return promise.then((r) => r.status).catch((e: { status?: number }) => e.status ?? 0);
}

describe('POST submit', () => {
	beforeEach(() => submit.mockReset());

	it('4 : déjà terminée → 409 AVEC la copie déjà notée', async () => {
		behavior.current = () => {
			throw new AttemptAlreadySubmittedError(COPY);
		};
		const response = await call({ answers: [] }, 'eleve-409');
		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({ result: { grade: 15, correctCount: 3 } });
	});

	it('4 : copie non reconstructible → 409, result null', async () => {
		behavior.current = () => {
			throw new AttemptAlreadySubmittedError(null);
		};
		const response = await call({ answers: [] }, 'eleve-409b');
		expect(response.status).toBe(409);
		expect((await response.json()).result).toBeNull();
	});

	it('corps invalide → 400, rien de corrigé', async () => {
		expect(await statusOf(call({ answers: [{ position: -1 }] }, 'eleve-400'))).toBe(400);
		expect(submit).not.toHaveBeenCalled();
	});

	it('9 : au-delà de 10 envois par minute → 429', async () => {
		behavior.current = () => COPY;
		for (let i = 0; i < 10; i++) {
			expect(await statusOf(call({ answers: [] }, 'eleve-rafale'))).toBe(200);
		}
		expect(await statusOf(call({ answers: [] }, 'eleve-rafale'))).toBe(429);
	});
});
