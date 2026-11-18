/**
 * Carnet de liaison — le côté professeur (D1-D3, A1-A5, Q28-Q30)
 * =============================================================
 *
 * Ce que la page garantit :
 *  - chaque geste passe la garde de rôle (professeur) ;
 *  - un geste par élève ou par adresse vise un membre ACTIF de CETTE classe,
 *    sinon 404 sans rien envoyer (un identifiant d'une autre classe ne passe
 *    pas) ;
 *  - activer → réglage enregistré, puis liens des consentements envoyés (A1) ;
 *    les liens manquants exigent un carnet activé (Q29) ;
 *  - seuils bornés (Zod) ;
 *  - couper le partage = une ligne d'opt-out (le trigger révoque) ; rétablir =
 *    ligne retirée puis liens NEUFS (D3) ;
 *  - la lecture ne demande jamais d'empreinte ; elle annonce le nombre de
 *    courriels (Q30) et signale le dernier envoi en échec (E6).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types

type Result = { data: unknown; error: unknown };
interface Call {
	table: string;
	op: string;
	payload?: unknown;
	columns?: string;
	filters: [string, string, unknown][];
}

// Simulations

const requireTeacherOfClass = vi.fn();
vi.mock('#lib/server/stats/teacher-class-auth.ts', () => ({
	requireTeacherOfClass: (...a: unknown[]) => requireTeacherOfClass(...a)
}));

const envois = {
	addParentContact: vi.fn(),
	planClassMissingLinks: vi.fn(),
	removeParentContact: vi.fn(),
	sendCarnetLink: vi.fn(),
	sendClassMissingLinks: vi.fn(),
	sendContactConfirmation: vi.fn(),
	sendLinksToConfirmedContacts: vi.fn()
};
vi.mock('#lib/server/carnet/envois.ts', async (importOriginal) => {
	const original = await importOriginal<typeof import('#lib/server/carnet/envois.ts')>();
	return {
		...original,
		addParentContact: (...a: unknown[]) => envois.addParentContact(...a),
		planClassMissingLinks: (...a: unknown[]) => envois.planClassMissingLinks(...a),
		removeParentContact: (...a: unknown[]) => envois.removeParentContact(...a),
		sendCarnetLink: (...a: unknown[]) => envois.sendCarnetLink(...a),
		sendClassMissingLinks: (...a: unknown[]) => envois.sendClassMissingLinks(...a),
		sendContactConfirmation: (...a: unknown[]) => envois.sendContactConfirmation(...a),
		sendLinksToConfirmedContacts: (...a: unknown[]) => envois.sendLinksToConfirmedContacts(...a)
	};
});

vi.mock('#lib/server/email/brevo.ts', () => ({ isBrevoConfigured: () => true }));

let serviceRespond: (call: Call) => Result | undefined = () => undefined;
vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => fake((c) => serviceRespond(c)).client
}));

const { load, actions } = await import('../+page.server');

// Constantes

const CLASSE = '11111111-1111-4111-8111-111111111111';
const ELEVE = '22222222-2222-4222-8222-222222222222';
const AUTRE_ELEVE = '33333333-3333-4333-8333-333333333333';
const CONTACT = '44444444-4444-4444-8444-444444444444';
const PROF = '55555555-5555-4555-8555-555555555555';

// Functions

function fake(respond: (call: Call) => Result | undefined) {
	const calls: Call[] = [];
	function builder(table: string) {
		const call: Call = { table, op: 'select', filters: [] };
		const resolve = () => {
			calls.push(call);
			return Promise.resolve(respond(call) ?? { data: null, error: null });
		};
		const b: Record<string, unknown> = {};
		for (const op of ['insert', 'update', 'upsert', 'delete']) {
			b[op] = (payload?: unknown) => {
				call.op = op;
				call.payload = payload;
				return b;
			};
		}
		b.select = (columns?: string) => {
			if (call.op === 'select') call.columns = columns;
			return b;
		};
		for (const f of ['eq', 'in', 'is', 'gt', 'order', 'limit']) {
			b[f] = (col: string, v: unknown) => {
				call.filters.push([f, col, v]);
				return b;
			};
		}
		b.maybeSingle = resolve;
		b.single = resolve;
		b.then = (ok: (r: Result) => unknown, ko?: (e: unknown) => unknown) => resolve().then(ok, ko);
		return b;
	}
	return { client: { from: (t: string) => builder(t) }, calls };
}

function filter(call: Call, col: string): unknown {
	return call.filters.find(([, c]) => c === col)?.[2];
}

/** Base de service : l'élève ELEVE est membre actif de CLASSE ; CONTACT est à lui. */
function serviceParDefaut(call: Call): Result | undefined {
	if (call.table === 'class_members') {
		const ok = filter(call, 'class_id') === CLASSE && filter(call, 'student_id') === ELEVE;
		return { data: ok ? { student_id: ELEVE } : null, error: null };
	}
	if (call.table === 'parent_contacts') {
		const id = filter(call, 'id');
		return { data: id === CONTACT ? { student_id: ELEVE } : null, error: null };
	}
}

function evenement(
	champs: Record<string, string>,
	respond: (c: Call) => Result | undefined = () => undefined
) {
	const body = new FormData();
	for (const [k, v] of Object.entries(champs)) body.set(k, v);
	const prof = fake(respond);
	return {
		event: {
			params: { classId: CLASSE },
			request: new Request('http://localhost/x', { method: 'POST', body }),
			locals: { supabase: prof.client }
		} as never,
		calls: prof.calls
	};
}

/** Client du professeur : carnet activé ou non. */
function profCarnet(enabled: boolean) {
	return (call: Call): Result | undefined => {
		if (call.table === 'class_carnet_settings' && call.op === 'select')
			return { data: { enabled }, error: null };
		if (call.op !== 'select') return { data: [{ ok: true }], error: null };
	};
}

async function statut(p: unknown): Promise<number> {
	try {
		const r = (await p) as { status?: number };
		return typeof r?.status === 'number' ? r.status : 200;
	} catch (e) {
		return (e as { status: number }).status;
	}
}

beforeEach(() => {
	requireTeacherOfClass.mockReset().mockResolvedValue({
		user: { id: PROF },
		profile: { firstname: 'Prof', lastname: 'Fictif' },
		classRow: { id: CLASSE, name: '4e B', grade: '4e' }
	});
	for (const fn of Object.values(envois)) fn.mockReset();
	envois.sendClassMissingLinks.mockResolvedValue({ sent: 2, failed: 0 });
	envois.addParentContact.mockResolvedValue('sent');
	envois.sendCarnetLink.mockResolvedValue('sent');
	envois.sendContactConfirmation.mockResolvedValue('sent');
	envois.removeParentContact.mockResolvedValue(true);
	envois.sendLinksToConfirmedContacts.mockResolvedValue({ sent: 1, failed: 0 });
	serviceRespond = serviceParDefaut;
});

// --- Gardes --------------------------------------------------------------------

describe('gardes', () => {
	it('chaque geste exige le rôle professeur', async () => {
		requireTeacherOfClass.mockRejectedValue({ status: 403 });
		for (const name of Object.keys(actions) as (keyof typeof actions)[]) {
			const { event } = evenement({
				student_id: ELEVE,
				contact_id: CONTACT,
				email: 'a@exemple.test'
			});
			expect(await statut(actions[name](event)), name).toBe(403);
		}
		for (const fn of Object.values(envois)) expect(fn).not.toHaveBeenCalled();
	});

	it('élève d’une autre classe → 404, rien n’est envoyé ni écrit', async () => {
		for (const name of ['addContact', 'stopSharing', 'resumeSharing'] as const) {
			const { event, calls } = evenement(
				{ student_id: AUTRE_ELEVE, email: 'a@exemple.test' },
				profCarnet(true)
			);
			expect(await statut(actions[name](event)), name).toBe(404);
			expect(
				calls.filter((c) => c.op !== 'select'),
				name
			).toEqual([]);
		}
		expect(envois.addParentContact).not.toHaveBeenCalled();
		expect(envois.sendLinksToConfirmedContacts).not.toHaveBeenCalled();
	});

	it('adresse d’un élève hors de la classe → 404, rien n’est envoyé', async () => {
		serviceRespond = (call) =>
			call.table === 'parent_contacts'
				? { data: { student_id: AUTRE_ELEVE }, error: null }
				: serviceParDefaut(call);
		for (const name of ['resendConfirmation', 'removeContact', 'sendNewLink'] as const) {
			const { event } = evenement({ contact_id: CONTACT }, profCarnet(true));
			expect(await statut(actions[name](event)), name).toBe(404);
		}
		expect(envois.sendContactConfirmation).not.toHaveBeenCalled();
		expect(envois.removeParentContact).not.toHaveBeenCalled();
		expect(envois.sendCarnetLink).not.toHaveBeenCalled();
	});

	it('identifiants mal formés → 400 / 404 avant toute lecture', async () => {
		const { event } = evenement({ contact_id: 'pas-un-uuid' });
		expect(await statut(actions.removeContact(event))).toBe(404);
		const bad = evenement({});
		(bad.event as { params: { classId: string } }).params.classId = 'x';
		expect(await statut(actions.activate(bad.event))).toBe(400);
	});
});

// --- Classe ------------------------------------------------------------------------

describe('réglages de la classe (D1, Q17, Q29)', () => {
	it('activer → enabled posé, puis liens des consentements envoyés', async () => {
		const { event, calls } = evenement({}, profCarnet(false));
		const res = (await actions.activate(event)) as { message: string };
		const upsert = calls.find((c) => c.op === 'upsert')!;
		expect(upsert.table).toBe('class_carnet_settings');
		expect(upsert.payload).toMatchObject({ class_id: CLASSE, enabled: true });
		expect(envois.sendClassMissingLinks).toHaveBeenCalledWith(CLASSE);
		expect(res.message).toContain('2 liens envoyés');
	});

	it('liens manquants : carnet désactivé → 409, rien n’est envoyé', async () => {
		const { event } = evenement({}, profCarnet(false));
		expect(await statut(actions.sendMissing(event))).toBe(409);
		expect(envois.sendClassMissingLinks).not.toHaveBeenCalled();
	});

	it('seuils hors bornes → 400 ; dans les bornes → enregistrés sans toucher à enabled', async () => {
		const hors = evenement({ overdue_reviews_days: '7', inactivity_days: '2' }, profCarnet(true));
		expect(await statut(actions.saveSettings(hors.event))).toBe(400);

		const ok = evenement(
			{ overdue_reviews_days: '10', inactivity_days: '20', quarterly_message: 'on' },
			profCarnet(true)
		);
		await actions.saveSettings(ok.event);
		const upsert = ok.calls.find((c) => c.op === 'upsert')!;
		expect(upsert.payload).toMatchObject({
			class_id: CLASSE,
			evaluation_missed_alert: false,
			overdue_reviews_days: 10,
			inactivity_days: 20,
			quarterly_message: true
		});
		expect(upsert.payload).not.toHaveProperty('enabled');
	});
});

// --- Élèves et adresses ----------------------------------------------------------

describe('élèves et adresses (A2, D2, D3)', () => {
	it('ajouter une adresse : source professeur, nom du professeur, élève vérifié', async () => {
		const { event } = evenement(
			{ student_id: ELEVE, email: 'parent@exemple.test' },
			profCarnet(true)
		);
		await actions.addContact(event);
		expect(envois.addParentContact).toHaveBeenCalledWith({
			studentId: ELEVE,
			email: 'parent@exemple.test',
			source: 'teacher',
			createdBy: PROF,
			teacherName: 'Prof Fictif'
		});
	});

	it('ajouter une adresse, carnet désactivé → 409, aucun courriel', async () => {
		const { event } = evenement(
			{ student_id: ELEVE, email: 'parent@exemple.test' },
			profCarnet(false)
		);
		expect(await statut(actions.addContact(event))).toBe(409);
		expect(envois.addParentContact).not.toHaveBeenCalled();
	});

	it('couper le partage = une ligne d’opt-out pour CET élève', async () => {
		const { event, calls } = evenement({ student_id: ELEVE }, profCarnet(true));
		const res = (await actions.stopSharing(event)) as { message: string };
		const upsert = calls.find((c) => c.op === 'upsert')!;
		expect(upsert.table).toBe('student_carnet_opt_outs');
		expect(upsert.payload).toEqual({ student_id: ELEVE });
		expect(res.message).toContain('cahier et du cours');
	});

	it('rétablir le partage → opt-out retiré, puis liens neufs', async () => {
		const { event, calls } = evenement({ student_id: ELEVE }, profCarnet(true));
		await actions.resumeSharing(event);
		const del = calls.find((c) => c.op === 'delete')!;
		expect(del.table).toBe('student_carnet_opt_outs');
		expect(filter(del, 'student_id')).toBe(ELEVE);
		expect(envois.sendLinksToConfirmedContacts).toHaveBeenCalledWith(ELEVE);
	});

	it('rétablir : aucune ligne retirée (RLS) → échec dit, aucun lien', async () => {
		const { event } = evenement({ student_id: ELEVE }, (call) =>
			call.op === 'delete' ? { data: [], error: null } : profCarnet(true)(call)
		);
		expect(await statut(actions.resumeSharing(event))).toBe(500);
		expect(envois.sendLinksToConfirmedContacts).not.toHaveBeenCalled();
	});

	it('nouveau lien, retrait, confirmation : sur l’adresse vérifiée', async () => {
		const a = evenement({ contact_id: CONTACT }, profCarnet(true));
		await actions.sendNewLink(a.event);
		expect(envois.sendCarnetLink).toHaveBeenCalledWith(CONTACT);

		const b = evenement({ contact_id: CONTACT }, profCarnet(true));
		await actions.removeContact(b.event);
		expect(envois.removeParentContact).toHaveBeenCalledWith(CONTACT);

		const c = evenement({ contact_id: CONTACT }, profCarnet(true));
		await actions.resendConfirmation(c.event);
		expect(envois.sendContactConfirmation).toHaveBeenCalledWith(CONTACT, 'Prof Fictif');
	});
});

// --- Lecture -------------------------------------------------------------------------

describe('load (D2, Q30, E6)', () => {
	it('élèves, adresses, lien actif, dernier envoi en échec, nombre de courriels annoncé', async () => {
		envois.planClassMissingLinks.mockResolvedValue({
			create: [{ student_id: ELEVE, email: 'x@exemple.test', consent_id: 'c' }],
			promote: [],
			link: ['k']
		});
		const { event, calls } = evenement({}, (call) => {
			switch (call.table) {
				case 'class_carnet_settings':
					return { data: null, error: null };
				case 'class_members':
					return {
						data: [{ student_id: ELEVE, profiles: { firstname: 'Léa', lastname: 'Fictive' } }],
						error: null
					};
				case 'parent_contacts':
					return {
						data: [
							{
								id: CONTACT,
								student_id: ELEVE,
								email: 'parent@exemple.test',
								status: 'confirmed',
								source: 'consent',
								confirm_expires_at: null,
								confirm_sent_count: 0,
								confirmed_at: '2026-11-01T00:00:00Z',
								emails_stopped_at: null,
								created_at: '2026-11-01T00:00:00Z'
							}
						],
						error: null
					};
				case 'student_carnet_opt_outs':
					return { data: [], error: null };
				case 'parent_notifications':
					return {
						data: [
							{ contact_id: CONTACT, status: 'failed', created_at: '2026-11-02T00:00:00Z' },
							{ contact_id: CONTACT, status: 'sent', created_at: '2026-11-01T00:00:00Z' }
						],
						error: null
					};
				case 'parent_carnet_links':
					return {
						data: [
							{ contact_id: CONTACT, expires_at: '2027-08-31T00:00:00Z', last_accessed_at: null }
						],
						error: null
					};
			}
		});

		const data = (await load(event)) as Exclude<Awaited<ReturnType<typeof load>>, void>;

		expect(data.settings.enabled).toBe(false);
		expect(data.missingLinks).toBe(2);
		expect(data.students).toHaveLength(1);
		expect(data.students[0]).toMatchObject({ id: ELEVE, name: 'Léa Fictive', opted_out: false });
		expect(data.students[0].contacts[0]).toMatchObject({
			id: CONTACT,
			status: 'confirmed',
			link: { expires_at: '2027-08-31T00:00:00Z', last_accessed_at: null },
			last_send_failed: true
		});
		expect(data.students[0].contacts[0]).not.toHaveProperty('student_id');
		// Jamais d'empreinte demandée (droits par colonne : la requête échouerait).
		for (const c of calls) expect(c.columns ?? '', c.table).not.toMatch(/hash/);
	});
});
