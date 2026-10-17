/**
 * Page publique d'une figure : une figure privée, inexistante ou un identifiant
 * mal formé rendent LA MÊME 404 — la page ne révèle pas qu'un identifiant existe.
 */
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { load } from '../+page.server';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';
import { FIGURE_NOT_FOUND_MESSAGE } from '$lib/server/geometry-figures';

const FIGURE_ID = '2b3c4d5e-2222-4222-8222-222222222222';

type LoadEvent = Parameters<typeof load>[0];

function event(id: string, supabase: SupabaseClient<Database>): LoadEvent {
	return { params: { id }, locals: { supabase } } as unknown as LoadEvent;
}

describe('/figures/[id] — chargement', () => {
	it('rend la figure publique', async () => {
		const figure = {
			id: FIGURE_ID,
			title: 'Flocon',
			description: null,
			dsl_script: 'A = point(0, 0)',
			grades: []
		};
		const fake = createFakeSupabase(() => ({ data: figure }));
		expect(await load(event(FIGURE_ID, fake.client))).toEqual({ figure });
	});

	it('figure privée ou inexistante (zéro ligne) : 404', async () => {
		const fake = createFakeSupabase(() => ({ data: null }));
		await expect(load(event(FIGURE_ID, fake.client))).rejects.toMatchObject({
			status: 404,
			body: { message: FIGURE_NOT_FOUND_MESSAGE }
		});
	});

	it('identifiant mal formé : la même 404, sans interroger la base', async () => {
		const fake = createFakeSupabase(() => ({ data: null }));
		await expect(load(event('pas-un-uuid', fake.client))).rejects.toMatchObject({
			status: 404,
			body: { message: FIGURE_NOT_FOUND_MESSAGE }
		});
		expect(fake.queries).toHaveLength(0);
	});
});
