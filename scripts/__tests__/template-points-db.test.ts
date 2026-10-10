/**
 * Liens relus par les scripts de rattachement — tags de points neufs (étape 2 de C5)
 * ===============================================================================
 *
 * `create-questions` et `link-template-points` rattachent les modèles aux points de l'ANCIEN
 * référentiel. Depuis l'étape 2 de C5, un modèle porte aussi des tags de points NEUFS (un nœud
 * de l'arbre, pas d'objectif) : `readLinks` ne les voit pas. Sinon `--remplacer`, qui supprime
 * les liens hors de la liste demandée, les supprimerait. Filtre provisoire jusqu'à la bascule
 * du code (étape 3 de C5).
 */
import { describe, it, expect } from 'vitest';
import { readLinks } from '../lib/template-points-db';
import { createFakeSupabase } from '../../src/lib/server/__tests__/helpers/fake-supabase';

describe('readLinks — tags de points neufs (étape 2 de C5)', () => {
	it('filtre provisoire : seuls les liens vers des points d’ancienne génération sont relus', async () => {
		const fake = createFakeSupabase(() => ({
			data: [
				{ point_id: 'p-ancien', curriculum_points: { code: '2-096', objective_id: 'objectif-1' } },
				{ point_id: 'p-neuf', curriculum_points: { code: '1SPE-287', objective_id: null } }
			]
		}));

		expect(await readLinks(fake.client, 'modele-1')).toEqual([
			{ pointId: 'p-ancien', code: '2-096' }
		]);
	});

	it('la requête lit `objective_id` du point : sans lui, tout lien serait écarté', async () => {
		const fake = createFakeSupabase(() => ({ data: [] }));

		await readLinks(fake.client, 'modele-1');

		const select = fake
			.on('question_template_points')
			.flatMap((q) => q.calls)
			.find((c) => c.method === 'select');
		expect(String(select?.args[0])).toMatch(/curriculum_points\(code, objective_id\)/);
	});
});
