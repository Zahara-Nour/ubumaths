/**
 * Carnet de liaison — vue de l'élève (C1-C3)
 * ==========================================
 *
 * L'élève voit SON carnet, celui que reçoivent ses parents, par son propre
 * client (aucun service role), et la liste des courriels envoyés à ses parents
 * (date, nature, motifs) — jamais les adresses.
 *
 * Ajouter l'adresse d'un parent (A2) : pour LUI SEUL (l'identifiant vient de la
 * session, jamais du formulaire), si son carnet est ouvert ; adresse validée ;
 * limite par élève.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireRole = vi.fn();
vi.mock('#lib/server/middleware/auth.ts', () => ({
	requireRole: (...a: unknown[]) => requireRole(...a)
}));

const readMyCarnet = vi.fn();
vi.mock('#lib/server/carnet/carnet.ts', () => ({
	readMyCarnet: (...a: unknown[]) => readMyCarnet(...a)
}));

const addParentContact = vi.fn();
vi.mock('#lib/server/carnet/envois.ts', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/server/carnet/envois.ts')>()),
	addParentContact: (...a: unknown[]) => addParentContact(...a)
}));

const rateLimit = vi.fn();
vi.mock('#lib/server/middleware/rateLimit.ts', () => ({
	rateLimit: (...a: unknown[]) => rateLimit(...a)
}));

vi.mock('#lib/server/staff-directory.ts', () => ({
	fetchStaffDirectory: async () => [
		{ id: 'a', role: 'admin', full_name: 'Admin Fictif' },
		{ id: 't', role: 'teacher', full_name: 'Prof Fictif' }
	],
	soleTeacher: (rows: { role: string }[]) => rows.find((r) => r.role === 'teacher') ?? null
}));

const serviceRole = vi.fn();
vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => serviceRole()
}));

const { load, actions } = await import('../+page.server');

type LoadEvent = Parameters<typeof load>[0];
type LoadData = Exclude<Awaited<ReturnType<typeof load>>, void>;
type ActionEvent = Parameters<(typeof actions)['addParent']>[0];

const ELEVE = '33333333-3333-4333-8333-333333333333';

function clientEleve(lignes: unknown[], erreur: unknown = null) {
	const appels: { methode: string; args: unknown[] }[] = [];
	const chaine: Record<string, unknown> = {};
	for (const methode of ['select', 'eq', 'order']) {
		chaine[methode] = (...args: unknown[]) => {
			appels.push({ methode, args });
			return chaine;
		};
	}
	chaine.limit = (...args: unknown[]) => {
		appels.push({ methode: 'limit', args });
		return Promise.resolve({ data: lignes, error: erreur });
	};
	const from = vi.fn(() => chaine);
	return { client: { from }, from, appels };
}

function evenement(client: unknown) {
	return { locals: { supabase: client } } as unknown as LoadEvent;
}

const CARNET = {
	firstname: 'Léa',
	weeks: [],
	revisions: { overdue: 0 },
	evaluations: [],
	classes: [],
	shared: true,
	opted_out: false,
	parents: 1
};

beforeEach(() => {
	requireRole.mockReset().mockResolvedValue({ user: { id: ELEVE }, profile: { role: 'student' } });
	readMyCarnet.mockReset().mockResolvedValue(CARNET);
	serviceRole.mockReset();
	addParentContact.mockReset().mockResolvedValue('sent');
	rateLimit.mockReset();
});

function ajout(champs: Record<string, string>) {
	const body = new FormData();
	for (const [k, v] of Object.entries(champs)) body.set(k, v);
	return {
		request: new Request('http://localhost/dashboard/student/carnet?/addParent', {
			method: 'POST',
			body
		}),
		locals: { supabase: { marque: 'client-eleve' } }
	} as unknown as ActionEvent;
}

describe('addParent (A2)', () => {
	it('pour l’élève connecté seul, adresse normalisée, nom du professeur (jamais l’admin)', async () => {
		const res = await actions.addParent(
			ajout({ email: ' Parent.Lea@Exemple.TEST ', student_id: 'un-autre-eleve' })
		);
		expect(res).toMatchObject({ sent: true });
		expect(addParentContact).toHaveBeenCalledWith({
			studentId: ELEVE,
			email: 'parent.lea@exemple.test',
			source: 'student',
			createdBy: ELEVE,
			teacherName: 'Prof Fictif'
		});
		expect(rateLimit.mock.calls[0][0]).toBe(`carnet-add:${ELEVE}`);
	});

	it('adresse mal formée → 400, rien d’enregistré', async () => {
		const res = (await actions.addParent(ajout({ email: 'pas-une-adresse' }))) as {
			status: number;
		};
		expect(res.status).toBe(400);
		expect(addParentContact).not.toHaveBeenCalled();
	});

	it('carnet pas ouvert pour sa classe (ou partage coupé) → 409, rien d’enregistré', async () => {
		readMyCarnet.mockResolvedValue({ ...CARNET, shared: false });
		const res = (await actions.addParent(ajout({ email: 'parent.lea@exemple.test' }))) as {
			status: number;
		};
		expect(res.status).toBe(409);
		expect(addParentContact).not.toHaveBeenCalled();
	});

	it('deux parents déjà → le message A3', async () => {
		addParentContact.mockResolvedValue('limit');
		const res = (await actions.addParent(ajout({ email: 'parent.lea@exemple.test' }))) as {
			status: number;
			data: { message: string };
		};
		expect(res.status).toBe(409);
		expect(res.data.message).toBe('Deux parents reçoivent déjà ce carnet.');
	});

	it('réservée aux élèves', async () => {
		requireRole.mockRejectedValue({ status: 403 });
		await expect(actions.addParent(ajout({ email: 'parent.lea@exemple.test' }))).rejects.toEqual({
			status: 403
		});
		expect(addParentContact).not.toHaveBeenCalled();
	});
});

describe('load', () => {
	it('réservée aux élèves', async () => {
		requireRole.mockRejectedValue({ status: 403 });
		const { client } = clientEleve([]);
		await expect(load(evenement(client))).rejects.toEqual({ status: 403 });
		expect(requireRole).toHaveBeenCalledWith(expect.anything(), 'student');
		expect(readMyCarnet).not.toHaveBeenCalled();
	});

	it('lit le carnet et les courriels par le client de l’élève, jamais par le service role', async () => {
		const { client, from, appels } = clientEleve([
			{ created_at: '2026-11-10T08:00:00Z', kind: 'exception', reasons: ['inactivity'] }
		]);
		const data = (await load(evenement(client))) as LoadData;

		expect(readMyCarnet).toHaveBeenCalledWith(client);
		expect(serviceRole).not.toHaveBeenCalled();
		expect(from).toHaveBeenCalledWith('parent_notifications');
		expect(data.carnet).toEqual(CARNET);
		expect(data.notifications).toEqual([
			{ created_at: '2026-11-10T08:00:00Z', kind: 'exception', reasons: ['inactivity'] }
		]);

		// Ni adresse ni destinataire : seulement date, nature, motifs ; ses
		// lignes, envoyées, les plus récentes d'abord, bornées.
		const select = appels.find((a) => a.methode === 'select');
		expect(select?.args[0]).toBe('created_at, kind, reasons');
		expect(appels).toContainEqual({ methode: 'eq', args: ['student_id', ELEVE] });
		expect(appels).toContainEqual({ methode: 'eq', args: ['status', 'sent'] });
		expect(appels).toContainEqual({ methode: 'order', args: ['created_at', { ascending: false }] });
		expect(appels.find((a) => a.methode === 'limit')?.args[0]).toBeLessThanOrEqual(50);
	});

	it('courriels illisibles → liste vide, le carnet s’affiche quand même', async () => {
		const { client } = clientEleve([], { message: 'boom' });
		const data = (await load(evenement(client))) as LoadData;
		expect(data.carnet).toEqual(CARNET);
		expect(data.notifications).toEqual([]);
	});
});
