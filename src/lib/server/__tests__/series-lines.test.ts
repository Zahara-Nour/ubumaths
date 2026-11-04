/**
 * Composition enregistrée → lignes `{ templateId, … }` (ADR 0035)
 * ==============================================================
 *
 * Une seule requête pour TOUTES les anciennes lignes, aucune s'il n'y en a pas ;
 * une panne lève (jamais « modèle retiré ») ; une composition illisible est
 * absente du résultat.
 */

import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { readStoredSeriesMany, SeriesLinesError } from '$lib/server/series-lines';

vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })
}));

// Types
interface Recorded {
	table: string;
	eq: [string, unknown][];
	or: string[];
}

// Constantes
const ADDITION_ID = '0a11f0e0-0000-4000-8000-000000000001';
const FRACTIONS_ID = '0a11f0e0-0000-4000-8000-000000000002';

const LEGACY_ADDITION = {
	category: { theme: 'Nombres', domain: 'Calcul', subdomain: null, level: 2 },
	quantity: 3,
	delay: 20
};

// Functions
/** Client minimal : `from().select().eq().or().limit()` rend `result` ; les appels sont notés. */
function fakeClient(result: { data: unknown; error: { message: string } | null }) {
	const calls: Recorded[] = [];
	const client = {
		from(table: string) {
			const call: Recorded = { table, eq: [], or: [] };
			calls.push(call);
			const chain = {
				select: () => chain,
				eq: (column: string, value: unknown) => {
					call.eq.push([column, value]);
					return chain;
				},
				or: (filter: string) => {
					call.or.push(filter);
					return chain;
				},
				limit: () => Promise.resolve(result)
			};
			return chain;
		}
	};
	return { client: client as unknown as SupabaseClient<Database>, calls };
}

describe('readStoredSeriesMany', () => {
	it('nouvelle forme seule : aucune requête, lignes rendues telles quelles', async () => {
		const { client, calls } = fakeClient({ data: [], error: null });
		const line = { templateId: FRACTIONS_ID, quantity: 1, delay: 30 };
		const read = await readStoredSeriesMany(client, [{ id: 's1', categories: [line] }]);
		expect(calls).toHaveLength(0);
		expect(read.get('s1')).toEqual({ items: [line], unresolved: 0 });
	});

	it('anciennes lignes de plusieurs séries : UNE requête sur les modèles publiés', async () => {
		const { client, calls } = fakeClient({
			data: [{ id: ADDITION_ID, theme: 'Nombres', domain: 'Calcul', subdomain: null, level: 2 }],
			error: null
		});
		const read = await readStoredSeriesMany(client, [
			{ id: 's1', categories: [LEGACY_ADDITION] },
			{
				id: 's2',
				categories: [{ templateId: FRACTIONS_ID, quantity: 2, delay: 15 }, LEGACY_ADDITION]
			}
		]);
		expect(calls).toHaveLength(1);
		expect(calls[0].table).toBe('question_templates');
		expect(calls[0].eq).toContainEqual(['status', 'published']);
		expect(read.get('s1')?.items).toEqual([{ templateId: ADDITION_ID, quantity: 3, delay: 20 }]);
		expect(read.get('s2')?.items.map((i) => i.templateId)).toEqual([FRACTIONS_ID, ADDITION_ID]);
	});

	it('ancienne ligne sans modèle publié : comptée dans `unresolved`', async () => {
		const { client } = fakeClient({ data: [], error: null });
		const read = await readStoredSeriesMany(client, [{ id: 's1', categories: [LEGACY_ADDITION] }]);
		expect(read.get('s1')).toEqual({ items: [], unresolved: 1 });
	});

	it('panne de lecture : lève SeriesLinesError (jamais « modèle retiré »)', async () => {
		const { client } = fakeClient({ data: null, error: { message: 'boom' } });
		await expect(
			readStoredSeriesMany(client, [{ id: 's1', categories: [LEGACY_ADDITION] }])
		).rejects.toBeInstanceOf(SeriesLinesError);
	});

	it('plafond de modèles atteint : lève plutôt que de retirer des lignes en silence', async () => {
		const row = { id: ADDITION_ID, theme: 'Nombres', domain: 'Calcul', subdomain: null, level: 2 };
		const { client } = fakeClient({ data: Array(1000).fill(row), error: null });
		await expect(
			readStoredSeriesMany(client, [{ id: 's1', categories: [LEGACY_ADDITION] }])
		).rejects.toBeInstanceOf(SeriesLinesError);
	});

	it('composition illisible : absente du résultat, les autres lues', async () => {
		const { client } = fakeClient({ data: [], error: null });
		const line = { templateId: FRACTIONS_ID, quantity: 1, delay: 30 };
		const read = await readStoredSeriesMany(client, [
			{ id: 'abimee', categories: { pas: 'un tableau' } },
			{ id: 'saine', categories: [line] }
		]);
		expect(read.has('abimee')).toBe(false);
		expect(read.get('saine')?.items).toEqual([line]);
	});
});
