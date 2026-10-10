/**
 * Édition d'un modèle (admin) — chargement serveur : les tags cochés
 * ==================================================================
 *
 * L'écran coche les points de l'ANCIEN référentiel (thème → objectif → point). Les tags de
 * points NEUFS posés par l'étape 2 de C5 (un nœud de l'arbre, pas d'objectif) n'y ont pas de
 * case : comptés, ils gonfleraient le nombre de points tagués. Filtre provisoire jusqu'à la
 * bascule du code (étape 3 de C5).
 */
import { describe, it, expect } from 'vitest';
import { load } from '../+page.server';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

// ============================================================================
// TYPES
// ============================================================================

type LoadEvent = Parameters<typeof load>[0];
type LoadResult = Exclude<Awaited<ReturnType<typeof load>>, void>;

// ============================================================================
// CONSTANTS
// ============================================================================

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_ID = '22222222-2222-4222-8222-222222222222';

// ============================================================================
// HELPERS
// ============================================================================

/** Charge la page pour un modèle sans niveau (aucun arbre à lire) portant ces tags. */
async function loadWithTags(tags: unknown[]) {
	const fake = createFakeSupabase((table) => {
		if (table === 'question_templates') return { data: { id: TEMPLATE_ID, grades: [] } };
		if (table === 'question_template_points') return { data: tags };
		throw new Error(`Table inattendue : ${table}`);
	});
	const event = {
		params: { id: TEMPLATE_ID },
		locals: { user: { id: ADMIN_ID }, profile: { role: 'admin' }, supabase: fake.client }
	} as unknown as LoadEvent;
	const result = (await load(event)) as LoadResult;
	return { fake, result };
}

// ============================================================================
// TESTS
// ============================================================================

describe('édition d’un modèle — tags de points neufs (étape 2 de C5)', () => {
	it('filtre provisoire : seuls les tags de points d’ancienne génération sont rendus', async () => {
		const { result } = await loadWithTags([
			{ point_id: 'p-ancien', curriculum_points: { objective_id: 'objectif-1' } },
			{ point_id: 'p-neuf', curriculum_points: { objective_id: null } }
		]);

		expect(result.taggedPointIds).toEqual(['p-ancien']);
	});

	it('la requête lit `objective_id` du point : sans lui, tout tag serait écarté', async () => {
		const { fake } = await loadWithTags([]);

		const select = fake
			.on('question_template_points')
			.flatMap((q) => q.calls)
			.find((c) => c.method === 'select');
		expect(String(select?.args[0])).toMatch(/curriculum_points\(objective_id\)/);
	});
});
