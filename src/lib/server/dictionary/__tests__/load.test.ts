/**
 * Mémoire de la lecture du dictionnaire (audit sécurité 2026-10-10, M2 et M3) :
 * repli borné quand la base est injoignable, une seule lecture pour des
 * requêtes simultanées. La lecture réelle est couverte par
 * tests/integration/dictionnaire-lecture.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { forgetDictionary, loadDictionary } from '../load';

const ROW = {
	term: 'carré',
	sense: null,
	grade: 'CP',
	tags: [],
	definitions: null,
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

/** Client dont chaque lecture rend `result()` ; compte les lectures. */
function fakeClient(result: () => { data: unknown[] | null; error: { message: string } | null }) {
	const range = vi.fn(async () => result());
	const query = { select: () => query, eq: () => query, order: () => query, range };
	const client = { from: () => query } as unknown as SupabaseClient<Database>;
	return { client, range };
}

const ok = () => ({ data: [ROW], error: null });
const down = () => ({ data: null, error: { message: 'injoignable' } });

describe('loadDictionary', () => {
	beforeEach(() => {
		forgetDictionary();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('des requêtes simultanées partagent une seule lecture', async () => {
		const { client, range } = fakeClient(ok);
		const [a, b, c] = await Promise.all([
			loadDictionary(client),
			loadDictionary(client),
			loadDictionary(client)
		]);
		expect(range).toHaveBeenCalledTimes(1);
		expect(a).toBe(b);
		expect(b).toBe(c);
	});

	it('base injoignable : la dernière lecture sert pendant 15 minutes, pas au-delà', async () => {
		const now = Date.now();
		await loadDictionary(fakeClient(ok).client, { now });
		const { client } = fakeClient(down);
		expect(await loadDictionary(client, { now: now + 10 * 60_000 })).toHaveLength(1);
		await expect(loadDictionary(client, { now: now + 16 * 60_000 })).rejects.toThrow(/illisible/);
	});

	it('base injoignable sans lecture antérieure : l’erreur remonte', async () => {
		await expect(loadDictionary(fakeClient(down).client)).rejects.toThrow(/illisible/);
	});
});
