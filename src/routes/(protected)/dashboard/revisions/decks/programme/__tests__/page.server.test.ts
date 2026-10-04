/**
 * Deck Programme — objectif affiché sous chaque carte.
 *
 * Une carte peut être rattachée à des points de PLUSIEURS référentiels
 * (Terminale spécialité `T_SPE` et maths complémentaires `T_COMP`). L'élève ne
 * doit voir que l'objectif de SON niveau : un élève de spécialité qui voit le
 * nom — et le lien — d'un objectif de complémentaires est perdu.
 */

import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

const auth = vi.hoisted(() => ({ grade: null as string | null }));

vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: async () => ({
		user: { id: 'eleve-1' },
		profile: { id: 'eleve-1', grade: auth.grade }
	})
}));

import { load } from '../+page.server';

type Loaded = Awaited<ReturnType<typeof load>>;

function link(templateId: string, objectiveId: string, displayOrder: number, grade: string) {
	return {
		template_id: templateId,
		curriculum_points: {
			objective_id: objectiveId,
			curriculum_objectives: {
				id: objectiveId,
				name: `Objectif ${objectiveId}`,
				display_order: displayOrder,
				curriculum_themes: { grade }
			}
		}
	};
}

/**
 * Deux cartes :
 *  - `t-partagee` : rattachée à un objectif T_COMP (rangé en premier) ET à un
 *    objectif T_SPE — le cas visé ;
 *  - `t-seule` : rattachée à un seul objectif, de T_COMP — non-régression.
 */
function supabaseFixture() {
	return createFakeSupabase((table) => {
		switch (table) {
			case 'srs_decks':
				return { data: { id: 'deck-1' } };
			case 'srs_cards':
				return {
					data: [
						{ id: 'c-partagee', template_id: 't-partagee' },
						{ id: 'c-seule', template_id: 't-seule' }
					]
				};
			case 'srs_card_stats':
				return { data: [] };
			case 'question_templates':
				return {
					data: [
						{ id: 't-partagee', subdomain: 'Partagée' },
						{ id: 't-seule', subdomain: 'Seule' }
					]
				};
			case 'question_template_points':
				// Déjà triées par display_order, comme la requête le demande.
				return {
					data: [
						link('t-partagee', 'obj-comp', 1, 'T_COMP'),
						link('t-seule', 'obj-comp-seule', 2, 'T_COMP'),
						link('t-partagee', 'obj-spe', 5, 'T_SPE')
					]
				};
			default:
				throw new Error(`Table inattendue : ${table}`);
		}
	});
}

async function objectiveOf(grade: string | null, templateId: string) {
	auth.grade = grade;
	const fake = supabaseFixture();
	const data = (await load({ locals: { supabase: fake.client } } as never)) as Loaded;
	const card = data.sections.flatMap((s) => s.cards).find((c) => c.templateId === templateId);
	return { id: card?.objectiveId, name: card?.objectiveName };
}

describe('deck Programme — objectif selon le niveau de l’élève', () => {
	it('carte partagée : l’élève de T_SPE voit l’objectif T_SPE, pas le premier rencontré', async () => {
		expect(await objectiveOf('T_SPE', 't-partagee')).toEqual({
			id: 'obj-spe',
			name: 'Objectif obj-spe'
		});
	});

	it('carte partagée : l’élève de T_COMP voit l’objectif T_COMP', async () => {
		expect((await objectiveOf('T_COMP', 't-partagee')).id).toBe('obj-comp');
	});

	it('carte d’un seul niveau, autre que celui de l’élève : objectif conservé', async () => {
		expect((await objectiveOf('T_SPE', 't-seule')).id).toBe('obj-comp-seule');
	});

	it('élève sans niveau : premier objectif rencontré, comme avant', async () => {
		expect((await objectiveOf(null, 't-partagee')).id).toBe('obj-comp');
	});
});
