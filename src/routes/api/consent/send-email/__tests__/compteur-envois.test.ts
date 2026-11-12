/**
 * Renvoi du courriel de consentement : le compteur ne compte que les envois partis.
 * ================================================================================
 *
 * Le quota (5 courriels par élève) se lit dans `email_count`. Le compteur était
 * augmenté avant l'envoi Brevo, sans retour arrière : chaque panne de Brevo (clé
 * refusée, IP bloquée) mangeait une unité du quota sans qu'aucun courriel parte,
 * jusqu'à bloquer l'élève (incident du 2026-11-11). Désormais l'envoi est réservé
 * sous condition (une seule requête simultanée passe), puis rendu si Brevo refuse.
 *
 * @module routes/api/consent/send-email/compteur-envois.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440002';
const CONSENT_ID = '550e8400-e29b-41d4-a716-446655440003';
const TOKEN = '550e8400-e29b-41d4-a716-446655440004';
const PARENT_EMAIL = 'parent' + '@example.com';

const sendConsentEmail = vi.fn();

vi.mock('$lib/server/email/brevo', () => ({
	isBrevoConfigured: () => true,
	sendConsentEmail: (...args: unknown[]) => sendConsentEmail(...args)
}));
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: async () => ({
		user: { id: TEACHER_ID },
		profile: { id: TEACHER_ID, email: 'prof' + '@example.com', firstname: 'A', lastname: 'B' }
	})
}));
vi.mock('$lib/server/middleware/student-access', () => ({
	verifyTeacherStudent: async () => true
}));

interface Existing {
	email_count: number;
}

/**
 * Faux client : `parental_consents` sert le décompte du quota (chaîne attendue),
 * la dernière demande (`single` avant insert) et la demande créée (`single` après insert).
 * Chaque `update`/`insert` est relevé avec ses filtres.
 */
function fakeSupabase(existing: Existing | null, updateRows: unknown[] = [{ id: CONSENT_ID }]) {
	const writes: {
		op: 'insert' | 'update';
		payload: Record<string, unknown>;
		filters: [string, unknown][];
	}[] = [];
	const future = new Date(Date.now() + 86_400_000).toISOString();

	function consentsChain() {
		let lastOp: 'select' | 'insert' | 'update' = 'select';
		const chain: Record<string, unknown> = {};
		for (const m of ['select', 'order', 'limit']) chain[m] = vi.fn(() => chain);
		chain.eq = vi.fn((col: string, value: unknown) => {
			writes.at(-1)?.filters.push([col, value]);
			return chain;
		});
		chain.insert = vi.fn((payload: Record<string, unknown>) => {
			lastOp = 'insert';
			writes.push({ op: 'insert', payload, filters: [] });
			return chain;
		});
		chain.update = vi.fn((payload: Record<string, unknown>) => {
			lastOp = 'update';
			writes.push({ op: 'update', payload, filters: [] });
			return chain;
		});
		chain.single = vi.fn(async () => {
			if (lastOp === 'insert') {
				return { data: { consent_token: TOKEN, expires_at: future }, error: null };
			}
			return existing
				? {
						data: {
							id: CONSENT_ID,
							email_count: existing.email_count,
							status: 'pending',
							consent_token: TOKEN,
							expires_at: future,
							parent_email: PARENT_EMAIL
						},
						error: null
					}
				: { data: null, error: { code: 'PGRST116' } };
		});
		chain.then = (resolve: (v: unknown) => unknown) =>
			Promise.resolve(
				lastOp === 'update'
					? { data: updateRows, error: null }
					: { data: existing ? [{ email_count: existing.email_count }] : [], error: null }
			).then(resolve);
		return chain;
	}

	const client = {
		from: vi.fn((table: string) => {
			if (table === 'parental_consents') return consentsChain();
			if (table === 'profiles') {
				const c: Record<string, unknown> = {};
				for (const m of ['select', 'eq']) c[m] = vi.fn(() => c);
				c.single = vi.fn(async () => ({
					data: { id: STUDENT_ID, firstname: 'Camille', lastname: 'Test', grade: '6e' },
					error: null
				}));
				return c;
			}
			if (table === 'class_members') {
				const c: Record<string, unknown> = {};
				for (const m of ['select', 'eq', 'limit']) c[m] = vi.fn(() => c);
				c.single = vi.fn(async () => ({ data: null, error: { code: 'PGRST116' } }));
				return c;
			}
			throw new Error(`Table inattendue : ${table}`);
		})
	};
	return { client, writes };
}

function post(client: unknown) {
	return {
		request: new Request('http://localhost/api/consent/send-email', {
			method: 'POST',
			body: JSON.stringify({ student_id: STUDENT_ID, parent_email: PARENT_EMAIL })
		}),
		locals: { supabase: client }
	} as never;
}

async function call(client: unknown): Promise<{ status: number }> {
	const { POST } = await import('../+server');
	try {
		const res = await POST(post(client));
		return { status: res.status };
	} catch (err) {
		return { status: (err as { status: number }).status };
	}
}

/** Valeur finale de `email_count` écrite par l'endpoint (null si jamais écrite). */
function countWritten(writes: { payload: Record<string, unknown> }[]): unknown {
	const withCount = writes.filter((w) => 'email_count' in w.payload);
	return withCount.length ? withCount.at(-1)?.payload.email_count : null;
}

describe('api/consent/send-email : compteur d’envois', () => {
	beforeEach(() => {
		vi.resetModules();
		sendConsentEmail.mockReset();
	});

	it('renvoi accepté par Brevo : compteur + 1, réservé sous condition, sur la bonne demande', async () => {
		sendConsentEmail.mockResolvedValue({ success: true, messageId: 'm1' });
		const { client, writes } = fakeSupabase({ email_count: 2 });

		expect((await call(client)).status).toBe(200);
		expect(countWritten(writes)).toBe(3);
		const reservation = writes.find((w) => w.payload.email_count === 3);
		// Le compteur s'écrit sur la demande dont le lien part, et seulement s'il n'a pas bougé.
		expect(reservation?.filters).toContainEqual(['consent_token', TOKEN]);
		expect(reservation?.filters).toContainEqual(['email_count', 2]);
	});

	it('renvoi refusé par Brevo : la réservation est rendue, compteur revenu à 2', async () => {
		sendConsentEmail.mockResolvedValue({ success: false, error: 'Key not found' });
		const { client, writes } = fakeSupabase({ email_count: 2 });

		expect((await call(client)).status).toBe(500);
		expect(countWritten(writes)).toBe(2);
	});

	it('première demande acceptée par Brevo : compteur à 1', async () => {
		sendConsentEmail.mockResolvedValue({ success: true, messageId: 'm1' });
		const { client, writes } = fakeSupabase(null);

		expect((await call(client)).status).toBe(200);
		expect(writes.find((w) => w.op === 'insert')?.payload.email_count).toBe(0);
		expect(countWritten(writes)).toBe(1);
	});

	it('première demande refusée par Brevo : demande à 0 envoi', async () => {
		sendConsentEmail.mockResolvedValue({ success: false, error: 'unrecognised IP' });
		const { client, writes } = fakeSupabase(null);

		expect((await call(client)).status).toBe(500);
		expect(countWritten(writes)).toBe(0);
	});

	it('réservation refusée (double clic perdu, ou RLS : zéro ligne) : 409, aucun courriel', async () => {
		sendConsentEmail.mockResolvedValue({ success: true, messageId: 'm1' });
		const { client } = fakeSupabase({ email_count: 2 }, []);

		expect((await call(client)).status).toBe(409);
		expect(sendConsentEmail).not.toHaveBeenCalled();
	});
});
