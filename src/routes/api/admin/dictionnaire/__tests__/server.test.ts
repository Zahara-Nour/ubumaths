/**
 * /api/admin/dictionnaire (ADR 0022, comportements 2, 8 et refus 10 à 16 de
 * docs/wip/dictionnaire-en-base-spec.md) : l'admin seul écrit ; un refus de
 * cohérence rend ses messages en français et n'écrit rien.
 */

import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import type { DictionaryEntryInput } from '$lib/dictionary/entry-schema';

vi.mock('$lib/server/dictionary/load', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/dictionary/load')>()),
	forgetDictionary: vi.fn()
}));

const { POST } = await import('../+server');
const { PATCH } = await import('../[id]/+server');

const FRACTION_ID = '11111111-1111-4111-8111-111111111111';
const RENVOI_ID = '22222222-2222-4222-8222-222222222222';

function row(id: string, position: number, extra: Partial<DictionaryEntryInput>) {
	return {
		id,
		position,
		hidden: false,
		updated_at: '2026-10-10T00:00:00Z',
		term: 'fraction',
		sense: null,
		grade: '6',
		tags: ['nombres'],
		definitions: { items: [{ grade: '6', content: 'Un nombre.' }] },
		exemples: null,
		history: null,
		image: null,
		synonyms: [],
		forms: [],
		auto_link: true,
		derived_from: null,
		see_also: null,
		shared_with: [],
		...extra
	};
}

const ROWS = [
	row(FRACTION_ID, 0, {}),
	row(RENVOI_ID, 1, { term: 'fractionner', definitions: null, derived_from: 'fraction' })
];

/** Client Supabase factice : lit ROWS, garde la trace de chaque écriture. */
function fakeSupabase() {
	const writes: { op: string; payload: Record<string, unknown> }[] = [];
	const client = {
		from: () => {
			let payload: Record<string, unknown> = {};
			const builder = {
				select: () => builder,
				order: () => builder,
				eq: () => builder,
				range: () => Promise.resolve({ data: ROWS, error: null }),
				insert: (p: Record<string, unknown>) => {
					payload = p;
					writes.push({ op: 'insert', payload: p });
					return builder;
				},
				update: (p: Record<string, unknown>) => {
					payload = p;
					writes.push({ op: 'update', payload: p });
					return builder;
				},
				single: () =>
					Promise.resolve({ data: { ...ROWS[0], ...payload, id: FRACTION_ID }, error: null })
			};
			return builder;
		}
	};
	return { client, writes };
}

type Who = 'visiteur' | 'élève' | 'prof' | 'admin' | 'prof élevé';

function event(who: Who, body: unknown, id?: string) {
	const own = fakeSupabase();
	const elevated = fakeSupabase();
	const role = {
		visiteur: null,
		élève: 'student',
		prof: 'teacher',
		admin: 'admin',
		'prof élevé': 'teacher'
	}[who];
	const locals = {
		supabase: own.client,
		user: who === 'visiteur' ? null : { id: 'u1' },
		profile: role ? { role } : null,
		adminElevation: who === 'prof élevé' ? { active: true, adminUserId: 'a1', expiresAt: 0 } : null,
		adminSupabase: who === 'prof élevé' ? elevated.client : undefined
	};
	const e = {
		locals,
		params: { id },
		request: new Request('http://localhost/api/admin/dictionnaire', {
			method: id ? 'PATCH' : 'POST',
			body: JSON.stringify(body)
		})
	} as unknown as RequestEvent;
	return { e, writes: () => [...own.writes, ...elevated.writes], elevatedWrites: elevated.writes };
}

const NEW_ENTRY: DictionaryEntryInput = {
	term: 'numérateur',
	sense: null,
	grade: '6',
	tags: ['nombres'],
	definitions: { items: [{ grade: '6', content: 'Le nombre du haut.' }] },
	exemples: null,
	history: null,
	image: null,
	synonyms: [],
	forms: [],
	auto_link: true,
	derived_from: null,
	see_also: null,
	shared_with: []
};

async function status(promise: Promise<Response>): Promise<number> {
	try {
		return (await promise).status;
	} catch (thrown) {
		return (thrown as { status: number }).status;
	}
}

describe('POST /api/admin/dictionnaire', () => {
	it.each<[Who, number]>([
		['visiteur', 401],
		['élève', 403],
		['prof', 403]
	])('2. refuse %s (%i) et n’écrit rien', async (who, expected) => {
		const { e, writes } = event(who, NEW_ENTRY);
		expect(await status(POST(e as Parameters<typeof POST>[0]))).toBe(expected);
		expect(writes()).toEqual([]);
	});

	it('8. ajoute une entrée à la fin du dictionnaire', async () => {
		const { e, writes } = event('admin', NEW_ENTRY);
		const response = await POST(e as Parameters<typeof POST>[0]);
		expect(response.status).toBe(201);
		expect(writes()).toEqual([
			{ op: 'insert', payload: expect.objectContaining({ term: 'numérateur', position: 2 }) }
		]);
	});

	it('10. refuse une première définition hors du niveau du mot, avec le message, sans rien écrire', async () => {
		const { e, writes } = event('admin', {
			...NEW_ENTRY,
			definitions: { items: [{ grade: '5', content: 'Le nombre du haut.' }] }
		});
		const response = await POST(e as Parameters<typeof POST>[0]);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.problems).toEqual([
			'« numérateur » : la première définition doit être au niveau du mot (6e), pas en 5e.'
		]);
		expect(writes()).toEqual([]);
	});

	it('15. refuse un nom déjà pris (accents et majuscules ignorés)', async () => {
		const { e, writes } = event('admin', { ...NEW_ENTRY, term: 'Fraction' });
		const response = await POST(e as Parameters<typeof POST>[0]);
		expect(response.status).toBe(400);
		expect((await response.json()).message).toContain('existe déjà');
		expect(writes()).toEqual([]);
	});

	it('refuse une saisie invalide (Zod) : image externe', async () => {
		const { e, writes } = event('admin', { ...NEW_ENTRY, image: '//pisteur.example/x.png' });
		expect(await status(POST(e as Parameters<typeof POST>[0]))).toBe(400);
		expect(writes()).toEqual([]);
	});
});

describe('PATCH /api/admin/dictionnaire/[id]', () => {
	it('16. refuse de masquer un mot visé par un renvoi visible', async () => {
		const { e, writes } = event('admin', { hidden: true }, FRACTION_ID);
		const response = await PATCH(e as Parameters<typeof PATCH>[0]);
		expect(response.status).toBe(400);
		expect((await response.json()).problems).toEqual([
			"Le renvoi « fractionner » vise « fraction », qui est masqué : masquer ou modifier d'abord le renvoi."
		]);
		expect(writes()).toEqual([]);
	});

	it('8. masque un renvoi, avec le client de l’admin élevé', async () => {
		const { e, elevatedWrites } = event('prof élevé', { hidden: true }, RENVOI_ID);
		const response = await PATCH(e as Parameters<typeof PATCH>[0]);
		expect(response.status).toBe(200);
		expect(elevatedWrites).toEqual([{ op: 'update', payload: { hidden: true } }]);
	});

	it('refuse un corps vide et un identifiant invalide', async () => {
		expect(
			await status(PATCH(event('admin', {}, FRACTION_ID).e as Parameters<typeof PATCH>[0]))
		).toBe(400);
		expect(
			await status(
				PATCH(event('admin', { hidden: true }, 'pas-un-uuid').e as Parameters<typeof PATCH>[0])
			)
		).toBe(400);
	});

	it('2. refuse un prof non élevé', async () => {
		const { e, writes } = event('prof', { hidden: true }, RENVOI_ID);
		expect(await status(PATCH(e as Parameters<typeof PATCH>[0]))).toBe(403);
		expect(writes()).toEqual([]);
	});
});
