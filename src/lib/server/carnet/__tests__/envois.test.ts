/**
 * Carnet de liaison — envois (ADR 0040 ; A1-A6, D2-D3, Q26, Q29, Q30)
 * ===================================================================
 *
 * Ce que le module garantit :
 *  - le jeton d'un courriel n'atteint la base que haché (confirmation et lien) ;
 *  - rien ne part vers une adresse non confirmée, sauf la confirmation (E7) ;
 *  - trois confirmations au plus par adresse ; un envoi refusé par Brevo ne
 *    compte pas (A4) ;
 *  - un lien dont le courriel ne part pas est révoqué (il redevient manquant) ;
 *  - une adresse refusée ne se ressaisit pas (A5) ; deux adresses actives au
 *    plus (A3) ;
 *  - la confirmation n'affiche plus le carnet : elle envoie le lien (Q26) ;
 *  - le plan des liens manquants crée, confirme et lie ce qu'il faut, et rien
 *    d'autre (A1, Q29) ; il compte les courriels annoncés (Q30).
 *
 * La base est simulée : le comportement SQL (limite, unicité, émission) est
 * prouvé par `tests/integration/carnet-de-liaison.test.ts`.
 */

import { createHash } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types

type Result = { data: unknown; error: { code?: string; message?: string } | null };

interface Call {
	table: string;
	op: 'select' | 'insert' | 'update';
	payload?: Record<string, unknown>;
	filters: [string, string, unknown][];
	returning: boolean;
}

// Simulations

const sendConfirmation = vi.fn();
const sendLink = vi.fn();
vi.mock('#lib/server/email/brevo.ts', () => ({
	sendCarnetConfirmationEmail: (...a: unknown[]) => sendConfirmation(...a),
	sendCarnetLinkEmail: (...a: unknown[]) => sendLink(...a)
}));
vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => {
		throw new Error('le test passe sa propre base');
	}
}));

const {
	addParentContact,
	removeParentContact,
	confirmContactAndSendLink,
	hashParentEmail,
	missingLinksCount,
	planMissingLinks,
	resendLostLinks,
	sendCarnetLink,
	sendContactConfirmation
} = await import('../envois');
const { hashCarnetToken } = await import('../carnet');

// Constantes

const JETON = 'A'.repeat(43);
const ELEVE = '11111111-1111-4111-8111-111111111111';
const CONTACT = '22222222-2222-4222-8222-222222222222';
const ADRESSE = 'parent.lea@exemple.test';

// Functions

/**
 * Une base simulée : chaque requête est notée dans `calls`, et `respond` rend
 * son résultat (par défaut : rien, sans erreur).
 */
function fakeService(
	respond: (call: Call) => Result | undefined,
	rpc: (name: string, args: Record<string, unknown>) => Result = () => ({
		data: null,
		error: null
	})
) {
	const calls: Call[] = [];
	const rpcCalls: [string, Record<string, unknown>][] = [];

	function builder(table: string) {
		const call: Call = { table, op: 'select', filters: [], returning: false };
		const resolve = () => {
			calls.push(call);
			return Promise.resolve(respond(call) ?? { data: null, error: null });
		};
		const b = {
			select() {
				if (call.op === 'select') return b;
				call.returning = true;
				return b;
			},
			insert(payload: Record<string, unknown>) {
				call.op = 'insert';
				call.payload = payload;
				return b;
			},
			update(payload: Record<string, unknown>) {
				call.op = 'update';
				call.payload = payload;
				return b;
			},
			eq(col: string, v: unknown) {
				call.filters.push(['eq', col, v]);
				return b;
			},
			is(col: string, v: unknown) {
				call.filters.push(['is', col, v]);
				return b;
			},
			in(col: string, v: unknown) {
				call.filters.push(['in', col, v]);
				return b;
			},
			gt(col: string, v: unknown) {
				call.filters.push(['gt', col, v]);
				return b;
			},
			single: resolve,
			maybeSingle: resolve,
			then(ok: (r: Result) => unknown, ko?: (e: unknown) => unknown) {
				return resolve().then(ok, ko);
			}
		};
		return b;
	}

	const service = {
		from: (table: string) => builder(table),
		rpc: (name: string, args: Record<string, unknown>) => {
			rpcCalls.push([name, args]);
			const result = Promise.resolve(rpc(name, args));
			// `current_school_year` se lit par `.rpc(…).maybeSingle()`.
			return Object.assign(result, { maybeSingle: () => result });
		}
	};
	return { service: service as never, calls, rpcCalls };
}

function filter(call: Call, col: string): unknown {
	return call.filters.find(([, c]) => c === col)?.[2];
}

/** Le jeton glissé dans le dernier courriel. */
function tokenOf(mock: ReturnType<typeof vi.fn>): string {
	return (mock.mock.calls.at(-1)?.[1] as { token: string }).token;
}

beforeEach(() => {
	sendConfirmation.mockReset().mockResolvedValue({ success: true });
	sendLink.mockReset().mockResolvedValue({ success: true });
});

// --- Plan des liens manquants ------------------------------------------------

describe('planMissingLinks (A1, Q29, Q30)', () => {
	const consent = (id: string, email: string, student = ELEVE) => ({
		id,
		student_id: student,
		parent_email: email
	});
	const contact = (id: string, email: string, status: string, student = ELEVE) => ({
		id,
		student_id: student,
		email_hash: hashParentEmail(email),
		status
	});

	it('consentement accordé sans adresse → adresse créée (normalisée), puis comptée', () => {
		const plan = planMissingLinks(
			[ELEVE],
			[consent('c1', '  Parent.Lea@Exemple.TEST ')],
			[],
			new Set()
		);
		expect(plan.create).toEqual([{ student_id: ELEVE, email: ADRESSE, consent_id: 'c1' }]);
		expect(missingLinksCount(plan)).toBe(1);
	});

	it('deux consentements à la même adresse → une seule adresse', () => {
		const plan = planMissingLinks(
			[ELEVE],
			[consent('c1', ADRESSE), consent('c2', ADRESSE.toUpperCase())],
			[],
			new Set()
		);
		expect(plan.create).toHaveLength(1);
	});

	it('deux adresses actives déjà → aucune création (A3)', () => {
		const plan = planMissingLinks(
			[ELEVE],
			[consent('c1', 'trois@exemple.test')],
			[
				contact('k1', 'un@exemple.test', 'pending'),
				contact('k2', 'deux@exemple.test', 'confirmed')
			],
			new Set(['k2'])
		);
		expect(plan.create).toEqual([]);
	});

	it('adresse refusée, invalide ou retirée → jamais rien, même avec un consentement (A5, Q31)', () => {
		const plan = planMissingLinks(
			[ELEVE],
			[
				consent('c1', ADRESSE),
				consent('c2', 'autre@exemple.test'),
				consent('c3', 'retiree@exemple.test')
			],
			[
				contact('k1', ADRESSE, 'refused'),
				contact('k2', 'autre@exemple.test', 'invalid'),
				contact('k3', 'retiree@exemple.test', 'removed')
			],
			new Set()
		);
		expect(missingLinksCount(plan)).toBe(0);
	});

	it('adresse en attente couverte par un consentement accordé → confirmée', () => {
		const plan = planMissingLinks(
			[ELEVE],
			[consent('c1', ADRESSE)],
			[contact('k1', ADRESSE, 'pending')],
			new Set()
		);
		expect(plan.promote).toEqual([{ contact_id: 'k1', consent_id: 'c1' }]);
		expect(plan.create).toEqual([]);
	});

	it('adresse confirmée : lien seulement si elle n’en a pas d’actif', () => {
		const plan = planMissingLinks(
			[ELEVE],
			[],
			[
				contact('k1', 'un@exemple.test', 'confirmed'),
				contact('k2', 'deux@exemple.test', 'confirmed')
			],
			new Set(['k2'])
		);
		expect(plan.link).toEqual(['k1']);
	});

	it('élève hors de la liste (partage coupé, autre classe) → rien', () => {
		const autre = '33333333-3333-4333-8333-333333333333';
		const plan = planMissingLinks(
			[ELEVE],
			[consent('c1', ADRESSE, autre)],
			[contact('k1', 'x@exemple.test', 'confirmed', autre)],
			new Set()
		);
		expect(missingLinksCount(plan)).toBe(0);
	});
});

// --- Confirmation ------------------------------------------------------------

describe('sendContactConfirmation (A2, A4)', () => {
	const pending = (count = 0) => ({
		id: CONTACT,
		student_id: ELEVE,
		email: ADRESSE,
		status: 'pending',
		confirm_sent_count: count
	});

	it('nominal : jeton haché en base, 7 jours, quota +1, courriel au prénom et au professeur', async () => {
		const { service, calls } = fakeService((call) => {
			if (call.table === 'parent_contacts' && call.op === 'select')
				return { data: pending(1), error: null };
			if (call.table === 'parent_contacts' && call.op === 'update')
				return { data: [{ id: CONTACT }], error: null };
			if (call.table === 'profiles') return { data: { firstname: 'Léa' }, error: null };
		});

		expect(await sendContactConfirmation(CONTACT, 'M. Prof', service)).toBe('sent');

		const reserve = calls.find((c) => c.op === 'update')!;
		const token = tokenOf(sendConfirmation);
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(reserve.payload?.confirm_token_hash).toBe(hashCarnetToken(token));
		expect(JSON.stringify(calls)).not.toContain(token);
		expect(reserve.payload?.confirm_sent_count).toBe(2);
		expect(filter(reserve, 'confirm_sent_count')).toBe(1);
		const days =
			(Date.parse(reserve.payload?.confirm_expires_at as string) - Date.now()) / 86_400_000;
		expect(days).toBeGreaterThan(6.9);
		expect(days).toBeLessThan(7.1);
		expect(sendConfirmation).toHaveBeenCalledWith(ADRESSE, {
			studentFirstname: 'Léa',
			teacherName: 'M. Prof',
			token
		});
		const trace = calls.find((c) => c.table === 'parent_notifications')!;
		expect(trace.payload).toEqual({
			student_id: ELEVE,
			contact_id: CONTACT,
			kind: 'confirmation',
			status: 'sent'
		});
	});

	it('trois envois déjà → quota, aucun courriel', async () => {
		const { service } = fakeService((call) =>
			call.op === 'select' ? { data: pending(3), error: null } : undefined
		);
		expect(await sendContactConfirmation(CONTACT, null, service)).toBe('quota');
		expect(sendConfirmation).not.toHaveBeenCalled();
	});

	it('réservation perdue (envoi simultané) → quota, aucun courriel', async () => {
		const { service } = fakeService((call) => {
			if (call.op === 'select') return { data: pending(2), error: null };
			if (call.op === 'update') return { data: [], error: null };
		});
		expect(await sendContactConfirmation(CONTACT, null, service)).toBe('quota');
		expect(sendConfirmation).not.toHaveBeenCalled();
	});

	it('adresse confirmée ou refusée → aucun courriel de confirmation', async () => {
		const { service } = fakeService((call) =>
			call.op === 'select'
				? { data: { ...pending(), status: 'confirmed' }, error: null }
				: undefined
		);
		expect(await sendContactConfirmation(CONTACT, null, service)).toBe('not_pending');
		expect(sendConfirmation).not.toHaveBeenCalled();
	});

	it('Brevo refuse → quota rendu, trace « failed »', async () => {
		sendConfirmation.mockResolvedValue({ success: false, error: 'boom' });
		const { service, calls } = fakeService((call) => {
			if (call.table === 'parent_contacts' && call.op === 'select')
				return { data: pending(1), error: null };
			if (call.table === 'parent_contacts' && call.op === 'update')
				return { data: [{ id: CONTACT }], error: null };
		});

		expect(await sendContactConfirmation(CONTACT, null, service)).toBe('send_failed');

		const updates = calls.filter((c) => c.table === 'parent_contacts' && c.op === 'update');
		expect(updates[1].payload).toEqual({ confirm_sent_count: 1 });
		expect(filter(updates[1], 'confirm_sent_count')).toBe(2);
		expect(calls.find((c) => c.table === 'parent_notifications')?.payload?.status).toBe('failed');
	});
});

// --- Lien du carnet ----------------------------------------------------------

describe('sendCarnetLink (A1, A6, D2)', () => {
	const confirmed = { id: CONTACT, student_id: ELEVE, email: ADRESSE, status: 'confirmed' };

	it('nominal : lien émis haché (31 août, école sans dates), courriel avec le jeton, trace « link »', async () => {
		const { service, calls, rpcCalls } = fakeService(
			(call) => {
				if (call.table === 'parent_contacts') return { data: confirmed, error: null };
				if (call.table === 'profiles') return { data: { firstname: 'Léa' }, error: null };
			},
			() => ({ data: true, error: null })
		);

		expect(await sendCarnetLink(CONTACT, service)).toBe('sent');

		const token = tokenOf(sendLink);
		expect(rpcCalls[0]).toEqual(['carnet_student_is_shared', { p_student_id: ELEVE }]);
		const [name, args] = rpcCalls[1];
		expect(name).toBe('issue_parent_carnet_link');
		expect(args.p_token_hash).toBe(hashCarnetToken(token));
		expect(JSON.stringify(rpcCalls)).not.toContain(token);
		expect(new Date(args.p_expires_at as string).getUTCMonth()).toBe(7);
		expect(sendLink).toHaveBeenCalledWith(ADRESSE, {
			studentFirstname: 'Léa',
			token,
			expiresAt: new Date(args.p_expires_at as string)
		});
		expect(calls.find((c) => c.table === 'parent_notifications')?.payload).toMatchObject({
			kind: 'link',
			status: 'sent'
		});
	});

	it("l'école a saisi ses dates : le lien expire à la fin de SON année", async () => {
		vi.useFakeTimers({ now: new Date('2026-11-28T10:00:00Z'), toFake: ['Date'] });
		try {
			const { service, rpcCalls } = fakeService(
				(call) => {
					if (call.table === 'parent_contacts') return { data: confirmed, error: null };
					if (call.table === 'profiles')
						return { data: { firstname: 'Léa', school_id: 'ecole' }, error: null };
				},
				(name) =>
					name === 'current_school_year'
						? { data: { start_date: '2026-09-01', end_date: '2027-07-15' }, error: null }
						: { data: true, error: null }
			);

			expect(await sendCarnetLink(CONTACT, service)).toBe('sent');

			expect(rpcCalls.find(([n]) => n === 'current_school_year')?.[1]).toEqual({
				p_school_id: 'ecole'
			});
			const issue = rpcCalls.find(([n]) => n === 'issue_parent_carnet_link');
			expect(issue?.[1].p_expires_at).toBe('2027-07-15T23:59:59.000Z');
			expect(sendLink).toHaveBeenLastCalledWith(
				ADRESSE,
				expect.objectContaining({ expiresAt: new Date('2027-07-15T23:59:59Z') })
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it('adresse non confirmée → ni lien ni courriel (E7)', async () => {
		const { service, rpcCalls } = fakeService(() => ({
			data: { ...confirmed, status: 'pending' },
			error: null
		}));
		expect(await sendCarnetLink(CONTACT, service)).toBe('not_confirmed');
		expect(rpcCalls).toEqual([]);
		expect(sendLink).not.toHaveBeenCalled();
	});

	it('partage coupé (émission refusée sous verrou) → aucun courriel', async () => {
		const { service } = fakeService(
			() => ({ data: confirmed, error: null }),
			(name) => ({ data: name === 'carnet_student_is_shared', error: null })
		);
		expect(await sendCarnetLink(CONTACT, service)).toBe('not_issued');
		expect(sendLink).not.toHaveBeenCalled();
	});

	it('carnet fermé (classe désactivée, élève sorti) → ni lien émis ni courriel', async () => {
		const { service, rpcCalls } = fakeService(
			() => ({ data: confirmed, error: null }),
			() => ({ data: false, error: null })
		);
		expect(await sendCarnetLink(CONTACT, service)).toBe('not_issued');
		expect(rpcCalls.map(([n]) => n)).toEqual(['carnet_student_is_shared']);
		expect(sendLink).not.toHaveBeenCalled();
	});

	it('Brevo refuse → le lien neuf est révoqué (il redevient manquant)', async () => {
		sendLink.mockResolvedValue({ success: false, error: 'boom' });
		const { service, calls, rpcCalls } = fakeService(
			(call) => (call.table === 'parent_contacts' ? { data: confirmed, error: null } : undefined),
			() => ({ data: true, error: null })
		);

		expect(await sendCarnetLink(CONTACT, service)).toBe('send_failed');

		const revoke = calls.find((c) => c.table === 'parent_carnet_links' && c.op === 'update')!;
		expect(filter(revoke, 'token_hash')).toBe(rpcCalls[1][1].p_token_hash);
		expect(revoke.payload?.revoked_at).toBeTruthy();
	});
});

// --- Confirmation par le parent (Q26) ----------------------------------------

describe('confirmContactAndSendLink (A2, Q26)', () => {
	it('jeton mal formé → null, sans appeler la base', async () => {
		const { service, rpcCalls } = fakeService(() => undefined);
		expect(await confirmContactAndSendLink('x', service)).toBeNull();
		expect(rpcCalls).toEqual([]);
	});

	it('confirmation refusée (utilisée, échue) → null, aucun lien', async () => {
		const { service, rpcCalls } = fakeService(() => undefined);
		expect(await confirmContactAndSendLink(JETON, service)).toBeNull();
		expect(rpcCalls.map(([n]) => n)).toEqual(['confirm_parent_contact']);
		expect(sendLink).not.toHaveBeenCalled();
	});

	it('confirmée → le lien part PAR COURRIEL, jamais rendu à la page', async () => {
		const { service } = fakeService(
			(call) =>
				call.table === 'parent_contacts'
					? {
							data: { id: CONTACT, student_id: ELEVE, email: ADRESSE, status: 'confirmed' },
							error: null
						}
					: undefined,
			(name) =>
				name === 'confirm_parent_contact'
					? { data: { contact_id: CONTACT, student_id: ELEVE }, error: null }
					: { data: true, error: null }
		);

		const result = await confirmContactAndSendLink(JETON, service);

		expect(result).toEqual({ linkSent: true });
		expect(sendLink).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(result)).not.toContain(tokenOf(sendLink));
	});

	it('confirmée, émission en erreur → « confirmée sans lien », pas une 500', async () => {
		const { service } = fakeService(
			(call) =>
				call.table === 'parent_contacts'
					? {
							data: { id: CONTACT, student_id: ELEVE, email: ADRESSE, status: 'confirmed' },
							error: null
						}
					: undefined,
			(name) =>
				name === 'confirm_parent_contact'
					? { data: { contact_id: CONTACT, student_id: ELEVE }, error: null }
					: { data: null, error: { message: 'boom' } }
		);
		expect(await confirmContactAndSendLink(JETON, service)).toEqual({ linkSent: false });
	});
});

// --- Ajout d'une adresse -----------------------------------------------------

describe('addParentContact (A2, A3, A5)', () => {
	const input = {
		studentId: ELEVE,
		email: '  Parent.Lea@Exemple.TEST',
		source: 'teacher' as const,
		createdBy: '44444444-4444-4444-8444-444444444444',
		teacherName: 'M. Prof'
	};

	it('adresse neuve → créée en attente (normalisée), confirmation envoyée', async () => {
		const { service, calls } = fakeService((call) => {
			if (call.table !== 'parent_contacts') return undefined;
			if (call.op === 'insert') return { data: { id: CONTACT, status: 'pending' }, error: null };
			if (call.op === 'update') return { data: [{ id: CONTACT }], error: null };
			if (filter(call, 'id') === CONTACT)
				return {
					data: {
						id: CONTACT,
						student_id: ELEVE,
						email: ADRESSE,
						status: 'pending',
						confirm_sent_count: 0
					},
					error: null
				};
			return { data: null, error: null };
		});

		expect(await addParentContact(input, service)).toBe('sent');

		const insert = calls.find((c) => c.op === 'insert')!;
		expect(insert.payload).toMatchObject({
			student_id: ELEVE,
			email: ADRESSE,
			email_hash: createHash('sha256').update(ADRESSE).digest('hex'),
			status: 'pending',
			source: 'teacher'
		});
		expect(sendConfirmation).toHaveBeenCalledTimes(1);
		expect(sendLink).not.toHaveBeenCalled();
	});

	it('troisième adresse → « limit », aucun courriel (A3)', async () => {
		const { service } = fakeService((call) =>
			call.op === 'insert' ? { data: null, error: { code: 'UBP01' } } : undefined
		);
		expect(await addParentContact(input, service)).toBe('limit');
		expect(sendConfirmation).not.toHaveBeenCalled();
	});

	it('adresse refusée par le destinataire → jamais ressaisie (A5)', async () => {
		const { service, calls } = fakeService((call) =>
			call.op === 'select' ? { data: { id: CONTACT, status: 'refused' }, error: null } : undefined
		);
		expect(await addParentContact(input, service)).toBe('refused');
		expect(calls.some((c) => c.op !== 'select')).toBe(false);
		expect(sendConfirmation).not.toHaveBeenCalled();
	});

	it('adresse déjà confirmée → rien ne part', async () => {
		const { service } = fakeService((call) =>
			call.op === 'select' ? { data: { id: CONTACT, status: 'confirmed' }, error: null } : undefined
		);
		expect(await addParentContact(input, service)).toBe('already_confirmed');
		expect(sendConfirmation).not.toHaveBeenCalled();
	});

	it('élève qui ressaisit une adresse connue → « known », rien ne part ni ne change', async () => {
		for (const status of ['pending', 'confirmed', 'refused', 'invalid']) {
			const { service, calls } = fakeService((call) =>
				call.op === 'select'
					? { data: { id: CONTACT, status, confirm_sent_count: 1 }, error: null }
					: undefined
			);
			expect(await addParentContact({ ...input, source: 'student' }, service), status).toBe(
				'known'
			);
			expect(calls.some((c) => c.op !== 'select')).toBe(false);
		}
		expect(sendConfirmation).not.toHaveBeenCalled();
	});

	it('adresse invalide à 3 envois → « quota », pas remise en attente (elle prendrait une place)', async () => {
		const { service, calls } = fakeService((call) =>
			call.op === 'select'
				? { data: { id: CONTACT, status: 'invalid', confirm_sent_count: 3 }, error: null }
				: undefined
		);
		expect(await addParentContact(input, service)).toBe('quota');
		expect(calls.some((c) => c.op === 'update')).toBe(false);
	});

	it('adresse retirée, ressaisie par le professeur → en attente, quota à zéro, confirmation', async () => {
		const { service, calls } = fakeService((call) => {
			if (call.table !== 'parent_contacts') return undefined;
			if (call.op === 'update' && call.payload?.status === 'pending')
				return { data: [{ id: CONTACT }], error: null };
			if (call.op === 'update') return { data: [{ id: CONTACT }], error: null };
			if (filter(call, 'email_hash'))
				return { data: { id: CONTACT, status: 'removed', confirm_sent_count: 3 }, error: null };
			return {
				data: {
					id: CONTACT,
					student_id: ELEVE,
					email: ADRESSE,
					status: 'pending',
					confirm_sent_count: 0
				},
				error: null
			};
		});
		expect(await addParentContact(input, service)).toBe('sent');
		const reset = calls.find((c) => c.op === 'update' && c.payload?.status === 'pending')!;
		expect(reset.payload).toEqual({
			status: 'pending',
			email: ADRESSE,
			confirm_sent_count: 0,
			confirmed_at: null,
			emails_stopped_at: null,
			consent_id: null,
			source: 'teacher'
		});
		expect(filter(reset, 'status')).toBe('removed');
		expect(sendConfirmation).toHaveBeenCalledTimes(1);
	});

	it('ajout simultané (23505) → la ligne gagnante est reprise', async () => {
		let lookups = 0;
		const { service } = fakeService((call) => {
			if (call.op === 'insert') return { data: null, error: { code: '23505' } };
			if (call.op === 'select' && filter(call, 'email_hash')) {
				lookups += 1;
				return { data: lookups === 1 ? null : { id: CONTACT, status: 'confirmed' }, error: null };
			}
		});
		expect(await addParentContact(input, service)).toBe('already_confirmed');
	});
});

// --- Lien perdu ----------------------------------------------------------------

describe('resendLostLinks (A6)', () => {
	it('adresse mal formée → aucune requête', async () => {
		const { service, calls } = fakeService(() => undefined);
		await resendLostLinks('pas une adresse', service);
		expect(calls).toEqual([]);
	});

	it('carnet fermé → aucun lien ; carnet ouvert → un lien neuf', async () => {
		const autre = '55555555-5555-4555-8555-555555555555';
		const { service, calls, rpcCalls } = fakeService(
			(call) => {
				if (call.table !== 'parent_contacts') return undefined;
				if (filter(call, 'email') === ADRESSE)
					return {
						data: [
							{ id: CONTACT, student_id: ELEVE },
							{ id: autre, student_id: 'ferme' }
						],
						error: null
					};
				return {
					data: {
						id: filter(call, 'id'),
						student_id: filter(call, 'id') === CONTACT ? ELEVE : 'ferme',
						email: ADRESSE,
						status: 'confirmed'
					},
					error: null
				};
			},
			(name, args) =>
				name === 'carnet_student_is_shared'
					? { data: args.p_student_id === ELEVE, error: null }
					: { data: true, error: null }
		);

		await resendLostLinks(' PARENT.lea@exemple.test ', service);

		expect(filter(calls[0], 'email')).toBe(ADRESSE);
		const issued = rpcCalls.filter(([n]) => n === 'issue_parent_carnet_link');
		expect(issued.map(([, a]) => a.p_contact_id)).toEqual([CONTACT]);
		expect(sendLink).toHaveBeenCalledTimes(1);
	});
});

// --- Retrait (Q31) -----------------------------------------------------------

describe('removeParentContact (D2, Q31)', () => {
	it('adresse effacée, statut « removed », seulement depuis un état actif ou invalide', async () => {
		const { service, calls } = fakeService(() => ({ data: [{ id: CONTACT }], error: null }));
		expect(await removeParentContact(CONTACT, service)).toBe(true);
		const update = calls[0];
		expect(update.payload).toEqual({
			status: 'removed',
			email: null,
			confirm_token_hash: null,
			confirm_expires_at: null
		});
		expect(filter(update, 'status')).toEqual(['pending', 'confirmed', 'invalid']);
	});

	it('déjà retirée ou refusée (zéro ligne) → false', async () => {
		const { service } = fakeService(() => ({ data: [], error: null }));
		expect(await removeParentContact(CONTACT, service)).toBe(false);
	});
});
