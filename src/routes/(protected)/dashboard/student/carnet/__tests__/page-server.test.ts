/**
 * Carnet de liaison — vue de l'élève (C1-C3)
 * ==========================================
 *
 * L'élève voit SON carnet, celui que reçoivent ses parents, par son propre
 * client (aucun service role), et la liste des courriels envoyés à ses parents
 * (date, nature, motifs) — jamais les adresses.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireRole = vi.fn();
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: (...a: unknown[]) => requireRole(...a)
}));

const readMyCarnet = vi.fn();
vi.mock('$lib/server/carnet/carnet', () => ({
	readMyCarnet: (...a: unknown[]) => readMyCarnet(...a)
}));

const serviceRole = vi.fn();
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => serviceRole()
}));

const { load } = await import('../+page.server');

type LoadEvent = Parameters<typeof load>[0];
type LoadData = Exclude<Awaited<ReturnType<typeof load>>, void>;

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
