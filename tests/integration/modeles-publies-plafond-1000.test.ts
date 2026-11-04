/**
 * Plus de 1000 modèles publiés : les pages doivent les voir TOUS (base locale requise)
 * ===================================================================================
 *
 * PostgREST plafonne une lecture à 1000 lignes (`max_rows`) et tronque en
 * SILENCE, sans erreur. Le 2026-11-04, la prod comptait 1912 modèles publiés :
 * `/automaths/test`, le panier et le catalogue n'en voyaient que 1000, et les
 * séries « Limites de fonctions » sautaient des catégories
 * (« Série : aucun modèle pour … »), jouées à 5 questions au lieu de 10.
 *
 * Décor : 1100 modèles publiés de plus que la base locale. Les pages Automaths
 * lisent toutes les modèles par l'API (cache de l'onglet) : c'est elle qu'on
 * appelle, avec son client ANONYME réel, comme un visiteur.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';
import { GET as lireTousLesModeles } from '../../src/routes/api/questions/templates/all/+server';

const service = createServiceRoleClient();

const THEME = 'Test plafond 1000';
const NB_MODELES = 1100;

/** Un modèle publié ; `level` distinct (index unique thème/domaine/sous-domaine/niveau) */
function modele(level: number) {
	return {
		type: 'fill_in_blanks',
		title: `Plafond 1000 — ${level}`,
		theme: THEME,
		domain: 'Plafond',
		level,
		grades: ['6'],
		status: 'published',
		// La contrainte `variations_minimum_one` exige au moins une variation.
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	};
}

async function supprimerLeDecor() {
	const { error } = await service.from('question_templates').delete().eq('theme', THEME);
	expect(error, 'le décor n’a pas pu être retiré').toBeNull();
}

describe('plus de 1000 modèles publiés', () => {
	let attendus: Set<string>;

	beforeAll(async () => {
		await supprimerLeDecor();
		const lignes = Array.from({ length: NB_MODELES }, (_, i) => modele(i + 1));
		const { data, error } = await service.from('question_templates').insert(lignes).select('id');
		expect(error, 'le décor n’a pas pu être posé').toBeNull();
		attendus = new Set((data ?? []).map((r) => r.id));
		expect(attendus.size).toBe(NB_MODELES);
	}, 120_000);

	afterAll(supprimerLeDecor);

	it('l’API des modèles publiés les rend tous', async () => {
		// L'API lit avec son propre client anonyme (réponse mise en cache par Vercel)
		const reponse = await lireTousLesModeles({ setHeaders: () => {} } as never);
		const { templates } = (await reponse.json()) as { templates: Array<{ id: string }> };

		const ids = templates.map((t) => t.id);
		expect(new Set(ids).size, 'un modèle lu deux fois').toBe(ids.length);
		expect(
			ids.filter((id) => attendus.has(id)),
			'liste tronquée au plafond PostgREST'
		).toHaveLength(NB_MODELES);
	});
});
