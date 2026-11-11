/**
 * GET /api/student/avatars, POST /api/student/avatars/buy et /wear — la boutique
 * d'avatars (décisions de David du 2026-11-06, docs/wip/boutique-avatars-progress.md).
 *
 * La base tient les règles (prouvé en intégration :
 * tests/integration/boutique-avatars.test.ts). Ici : élève de la session
 * seulement, consentement pour l'achat (pas pour le port), entrée validée,
 * refus de la base traduits pour l'élève, réponse inattendue = panne (jamais un
 * faux succès), catalogue filtré (en vente ou possédé).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn() }));
vi.mock('$lib/server/middleware/consent', () => ({ requireConsent: vi.fn() }));
vi.mock('$lib/server/middleware/rateLimit', () => ({ rateLimit: vi.fn() }));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: vi.fn() }));

import { requireRole } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { rateLimit } from '$lib/server/middleware/rateLimit';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { readAvatarShop } from '$lib/server/avatars/shop';
import { GET as shop } from '../+server';
import { POST as buy } from '../buy/+server';
import { POST as wear } from '../wear/+server';

// Constantes
const PROFILE = { id: 'eleve-1', role: 'student', worn_avatar: null as string | null };
const rpc = vi.fn();
const NOW = new Date('2026-12-01T12:00:00Z');

function row(key: string, extra: Record<string, unknown> = {}) {
	return {
		key,
		family: 'emblem',
		name: `Avatar ${key}`,
		price: 15,
		image_path: `/avatars/${key}.webp`,
		available_from: null,
		available_until: null,
		active: true,
		sort_order: 0,
		...extra
	};
}

// Functions
function request(body: unknown): Request {
	return new Request('http://localhost/api', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

function event(body: unknown, locals: Record<string, unknown> = {}) {
	return { request: request(body), locals } as never;
}

/** Client utilisateur factice : `from(table)` rend les lignes de `tables[table]`. */
function userClient(tables: Record<string, { data: unknown; error: unknown }>) {
	const eq = vi.fn();
	const from = vi.fn((table: string) => {
		const result = tables[table];
		const builder = {
			select: () => builder,
			order: () => builder,
			eq: (...args: unknown[]) => {
				eq(table, ...args);
				return builder;
			},
			then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
		};
		return builder;
	});
	return { client: { from } as never, eq };
}

beforeEach(() => {
	vi.mocked(requireRole).mockReset();
	vi.mocked(requireConsent).mockReset();
	vi.mocked(rateLimit).mockReset();
	rpc.mockReset();
	vi.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never);
	vi.mocked(requireRole).mockResolvedValue({
		user: { id: 'eleve-1' },
		profile: { ...PROFILE }
	} as never);
});

describe('readAvatarShop — ce que l’élève voit', () => {
	it('montre les avatars en vente et ceux qu’il possède, cache le reste', async () => {
		const { client, eq } = userClient({
			avatar_catalog: {
				data: [
					row('en_vente'),
					row('retire_possede', { active: false }),
					row('retire', { active: false }),
					row('fete_en_cours', {
						family: 'almanac',
						available_from: '2026-11-25T00:00:00Z',
						available_until: '2026-12-10T00:00:00Z'
					}),
					row('fete_passee', { available_until: '2026-11-01T00:00:00Z' }),
					row('fete_passee_possedee', { available_until: '2026-11-01T00:00:00Z' }),
					row('fete_a_venir', { available_from: '2026-12-24T00:00:00Z' })
				],
				error: null
			},
			student_avatars: {
				data: [{ avatar_key: 'retire_possede' }, { avatar_key: 'fete_passee_possedee' }],
				error: null
			}
		});

		const result = await readAvatarShop(client, 'eleve-1', 'retire_possede', NOW);

		expect(eq).toHaveBeenCalledWith('student_avatars', 'student_id', 'eleve-1');
		expect(result.avatars.map((a) => [a.key, a.onSale, a.owned])).toEqual([
			['en_vente', true, false],
			['retire_possede', false, true],
			['fete_en_cours', true, false],
			['fete_passee_possedee', false, true]
		]);
		expect(result.avatars[2].availableUntil).toBe('2026-12-10T00:00:00Z');
		expect(result.worn).toBe('retire_possede');
	});

	it('un avatar porté absent de la collection n’est pas annoncé comme porté', async () => {
		const { client } = userClient({
			avatar_catalog: { data: [row('a')], error: null },
			student_avatars: { data: [], error: null }
		});
		const result = await readAvatarShop(client, 'eleve-1', 'a', NOW);
		expect(result.worn).toBeNull();
	});

	it('lecture en échec : lève (jamais un catalogue vide en silence)', async () => {
		const { client } = userClient({
			avatar_catalog: { data: null, error: { message: 'boom' } },
			student_avatars: { data: [], error: null }
		});
		await expect(readAvatarShop(client, 'eleve-1', null, NOW)).rejects.toThrow(/illisible/);
	});

	it('famille inconnue de l’appli : lève plutôt que d’afficher n’importe quoi', async () => {
		const { client } = userClient({
			avatar_catalog: { data: [row('a', { family: 'dragon' })], error: null },
			student_avatars: { data: [], error: null }
		});
		await expect(readAvatarShop(client, 'eleve-1', null, NOW)).rejects.toThrow(/inattendue/);
	});
});

describe('GET /api/student/avatars', () => {
	it('lit au client de l’élève, avec l’avatar porté de la session', async () => {
		const { client } = userClient({
			avatar_catalog: { data: [row('a')], error: null },
			student_avatars: { data: [{ avatar_key: 'a' }], error: null }
		});
		vi.mocked(requireRole).mockResolvedValue({
			user: { id: 'eleve-1' },
			profile: { ...PROFILE, worn_avatar: 'a' }
		} as never);

		const response = await shop({ locals: { supabase: client } } as never);

		expect(requireRole).toHaveBeenCalledWith(expect.anything(), 'student');
		const body = await response.json();
		expect(body.worn).toBe('a');
		expect(body.avatars).toHaveLength(1);
	});

	it('réservé aux élèves', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403 });
		await expect(shop({ locals: {} } as never)).rejects.toMatchObject({ status: 403 });
	});

	it('panne de lecture : 500', async () => {
		const { client } = userClient({
			avatar_catalog: { data: null, error: { message: 'boom' } },
			student_avatars: { data: [], error: null }
		});
		await expect(shop({ locals: { supabase: client } } as never)).rejects.toMatchObject({
			status: 500
		});
	});
});

describe('POST /api/student/avatars/buy', () => {
	it('achète pour l’élève de la session et rend le solde', async () => {
		rpc.mockResolvedValue({ data: { ok: true, balance: 15 }, error: null });
		const response = await buy(event({ avatar: 'bonnet_ubu' }));
		expect(requireRole).toHaveBeenCalledWith(expect.anything(), 'student');
		expect(requireConsent).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'eleve-1' }),
			'purchase_items'
		);
		expect(rateLimit).toHaveBeenCalledWith('avatar_shop:eleve-1', 30, 60_000);
		expect(rpc).toHaveBeenCalledWith('buy_avatar', {
			p_student_id: 'eleve-1',
			p_avatar: 'bonnet_ubu'
		});
		expect(await response.json()).toEqual({ balance: 15 });
	});

	it('un identifiant d’élève dans le corps est ignoré', async () => {
		rpc.mockResolvedValue({ data: { ok: true, balance: 0 }, error: null });
		await buy(event({ avatar: 'a', studentId: 'autre' }));
		expect(rpc.mock.calls[0][1].p_student_id).toBe('eleve-1');
	});

	it('réservé aux élèves : un prof est refusé, rien n’est appelé', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403 });
		await expect(buy(event({ avatar: 'a' }))).rejects.toMatchObject({ status: 403 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it('sans consentement : 403, rien n’est débité', async () => {
		vi.mocked(requireConsent).mockImplementation(() => {
			throw { status: 403 };
		});
		await expect(buy(event({ avatar: 'a' }))).rejects.toMatchObject({ status: 403 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		['corps illisible', 'pas du json'],
		['clé absente', {}],
		['clé hors motif', { avatar: 'Bonnet-Ubu' }],
		['clé trop longue', { avatar: 'a'.repeat(51) }],
		['null (on n’achète pas « rien »)', { avatar: null }]
	])('entrée invalide (%s) : 400, rien n’est appelé', async (_label, body) => {
		await expect(buy(event(body))).rejects.toMatchObject({ status: 400 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		[{ ok: false, reason: 'insufficient_funds', missing: 7 }, 409, 'Il te manque 7 gidouilles.'],
		[{ ok: false, reason: 'insufficient_funds', missing: 1 }, 409, 'Il te manque 1 gidouille.'],
		[{ ok: false, reason: 'already_owned' }, 409, 'Tu as déjà cet avatar.'],
		[{ ok: false, reason: 'not_on_sale' }, 409, 'Cet avatar n’est plus en vente.'],
		[{ ok: false, reason: 'unknown_avatar' }, 400, 'Avatar inconnu.']
	])('refus de la base %j : %i et une phrase pour l’élève', async (data, status, message) => {
		rpc.mockResolvedValue({ data, error: null });
		await expect(buy(event({ avatar: 'a' }))).rejects.toMatchObject({
			status,
			body: { message }
		});
	});

	it.each([
		['erreur de la base', { data: null, error: { message: 'boom' } }],
		['forme inattendue', { data: { ok: true }, error: null }],
		['motif inconnu', { data: { ok: false, reason: 'autre' }, error: null }]
	])('%s : 500, jamais un faux succès', async (_label, value) => {
		rpc.mockResolvedValue(value);
		await expect(buy(event({ avatar: 'a' }))).rejects.toMatchObject({ status: 500 });
	});
});

describe('POST /api/student/avatars/wear', () => {
	it('porte un avatar pour l’élève de la session, sans exiger le consentement', async () => {
		rpc.mockResolvedValue({ data: { ok: true, avatar_url: '/avatars/a.webp' }, error: null });
		const response = await wear(event({ avatar: 'a', studentId: 'autre' }));
		expect(requireConsent).not.toHaveBeenCalled();
		expect(rateLimit).toHaveBeenCalledWith('avatar_shop:eleve-1', 30, 60_000);
		expect(rpc).toHaveBeenCalledWith('set_worn_avatar', {
			p_student_id: 'eleve-1',
			p_avatar: 'a'
		});
		expect(await response.json()).toEqual({ avatarUrl: '/avatars/a.webp' });
	});

	it('retire l’avatar (null) : la base rend la photo gardée', async () => {
		rpc.mockResolvedValue({
			data: { ok: true, avatar_url: 'https://lh3.googleusercontent.com/x' },
			error: null
		});
		const response = await wear(event({ avatar: null }));
		expect(rpc).toHaveBeenCalledWith('set_worn_avatar', {
			p_student_id: 'eleve-1',
			p_avatar: null
		});
		expect(await response.json()).toEqual({ avatarUrl: 'https://lh3.googleusercontent.com/x' });
	});

	it('retire sans photo gardée : avatarUrl null (emblème par défaut)', async () => {
		rpc.mockResolvedValue({ data: { ok: true, avatar_url: null }, error: null });
		const response = await wear(event({ avatar: null }));
		expect(await response.json()).toEqual({ avatarUrl: null });
	});

	it('avatar pas acheté : 409', async () => {
		rpc.mockResolvedValue({ data: { ok: false, reason: 'not_owned' }, error: null });
		await expect(wear(event({ avatar: 'a' }))).rejects.toMatchObject({
			status: 409,
			body: { message: 'Tu n’as pas encore cet avatar.' }
		});
	});

	it('réservé aux élèves', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403 });
		await expect(wear(event({ avatar: 'a' }))).rejects.toMatchObject({ status: 403 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		['corps illisible', 'pas du json'],
		['clé absente', {}],
		['adresse d’image à la place d’une clé', { avatar: 'https://exemple.test/moi.png' }]
	])('entrée invalide (%s) : 400', async (_label, body) => {
		await expect(wear(event(body))).rejects.toMatchObject({ status: 400 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		['erreur de la base', { data: null, error: { message: 'boom' } }],
		['forme inattendue', { data: { ok: true }, error: null }]
	])('%s : 500', async (_label, value) => {
		rpc.mockResolvedValue(value);
		await expect(wear(event({ avatar: 'a' }))).rejects.toMatchObject({ status: 500 });
	});
});
