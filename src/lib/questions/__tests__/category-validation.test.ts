/**
 * Unicité de catégorie (thème + domaine + sous-domaine + niveau) parmi les modèles publiés.
 *
 * L'absence de doublon est le cas NORMAL : elle ne doit pas passer par `.single()`,
 * qui fait répondre PostgREST en 406 dès qu'il y a zéro ligne (bruit dans les logs).
 */
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { checkCategoryUniqueness } from '../category-validation';

type Row = Record<string, unknown>;

/** Constructeur PostgREST minimal ; `.single()` / `.maybeSingle()` sont comptés */
function fakeSupabase(rows: Row[]) {
	const calls = { single: 0, maybeSingle: 0 };
	function from() {
		const filters: Array<(row: Row) => boolean> = [];
		let limit = Infinity;
		let mode: 'many' | 'single' | 'maybe' = 'many';
		function execute() {
			const data = rows.filter((row) => filters.every((keep) => keep(row))).slice(0, limit);
			if (mode === 'single') {
				// Comportement réel : zéro ligne → erreur PGRST116 (HTTP 406)
				return data.length === 1
					? { data: data[0], error: null }
					: { data: null, error: { code: 'PGRST116', message: 'no rows' } };
			}
			if (mode === 'maybe') return { data: data[0] ?? null, error: null };
			return { data, error: null };
		}
		const builder = {
			select: () => builder,
			eq: (column: string, value: unknown) => {
				filters.push((row) => row[column] === value);
				return builder;
			},
			neq: (column: string, value: unknown) => {
				filters.push((row) => row[column] !== value);
				return builder;
			},
			is: (column: string, value: unknown) => {
				filters.push((row) => row[column] === value);
				return builder;
			},
			limit: (n: number) => {
				limit = n;
				return builder;
			},
			single: () => {
				calls.single++;
				mode = 'single';
				return builder;
			},
			maybeSingle: () => {
				calls.maybeSingle++;
				mode = 'maybe';
				return builder;
			},
			// Voulu : un constructeur PostgREST est « thenable »
			// oxlint-disable-next-line unicorn/no-thenable
			then: (resolveFn: (value: unknown) => unknown, rejectFn?: (reason: unknown) => unknown) =>
				Promise.resolve(execute()).then(resolveFn, rejectFn)
		};
		return builder;
	}
	return { client: { from } as unknown as SupabaseClient<Database>, calls };
}

const EXISTING: Row = {
	id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
	status: 'published',
	theme: 'Suites',
	domain: 'Définition',
	subdomain: null,
	level: 2
};

const CATEGORY = { theme: 'Suites', domain: 'Définition', subdomain: null, level: 2 };

describe('checkCategoryUniqueness', () => {
	it('doublon publié : refusé, avec l’identifiant du modèle existant', async () => {
		const { client } = fakeSupabase([EXISTING]);
		const result = await checkCategoryUniqueness(client, CATEGORY);
		expect(result).toEqual({ isUnique: false, existingTemplateId: EXISTING.id });
	});

	it('aucun doublon : unique, sans passer par .single() (406 PostgREST)', async () => {
		const { client, calls } = fakeSupabase([]);
		const result = await checkCategoryUniqueness(client, CATEGORY);
		expect(result).toEqual({ isUnique: true });
		expect(calls.single).toBe(0);
	});

	it('le modèle lui-même (mise à jour) n’est pas un doublon', async () => {
		const { client, calls } = fakeSupabase([EXISTING]);
		const result = await checkCategoryUniqueness(client, CATEGORY, EXISTING.id as string);
		expect(result).toEqual({ isUnique: true });
		expect(calls.single).toBe(0);
	});

	it('niveau différent : unique', async () => {
		const { client } = fakeSupabase([EXISTING]);
		const result = await checkCategoryUniqueness(client, { ...CATEGORY, level: 3 });
		expect(result.isUnique).toBe(true);
	});
});
