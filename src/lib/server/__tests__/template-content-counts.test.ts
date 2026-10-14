/**
 * Les compteurs d'un modèle lisent son contenu RÉEL (ADR 0029)
 * ============================================================
 *
 * Depuis que le modèle s'édite sur sa page, son contenu vit dans les tables ;
 * la photo `content_snapshot` ne bouge plus. La liste des modèles et l'aperçu
 * « Créer depuis un modèle » comptaient la photo : un modèle rempli par
 * l'éditeur s'y affichait vide.
 */

import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { countTemplateContent, EMPTY_TEMPLATE_COUNTS } from '../template-content';

// Types
type Reply = { data: { template_id: string | null }[] | null; error: { message: string } | null };

interface Call {
	table: string;
	filters: string[];
}

// Constantes
const MODELE_A = '11111111-1111-4111-8111-111111111111';
const MODELE_B = '22222222-2222-4222-8222-222222222222';

// Functions
/** Un faux client : chaque table rend la réponse choisie, chaque filtre est noté. */
function fakeSupabase(replies: Record<string, Reply>) {
	const calls: Call[] = [];
	const client = {
		from(table: string) {
			const call: Call = { table, filters: [] };
			calls.push(call);
			const builder = {
				select: () => builder,
				in: (col: string, ids: string[]) => {
					call.filters.push(`in:${col}:${ids.join(',')}`);
					return builder;
				},
				is: (col: string, value: unknown) => {
					call.filters.push(`is:${col}:${String(value)}`);
					return builder;
				},
				then: (resolve: (r: Reply) => unknown) =>
					resolve(replies[table] ?? { data: [], error: null })
			};
			return builder;
		}
	};
	return { client: client as unknown as SupabaseClient<Database>, calls };
}

describe('countTemplateContent', () => {
	it('compte chaque type par modèle, sans les éléments retirés', async () => {
		const { client, calls } = fakeSupabase({
			chapter_documents: {
				data: [{ template_id: MODELE_A }, { template_id: MODELE_A }, { template_id: MODELE_B }],
				error: null
			},
			chapter_checklist_items: { data: [{ template_id: MODELE_A }], error: null },
			chapter_worksheets: { data: [{ template_id: MODELE_B }], error: null }
		});

		const { data, error } = await countTemplateContent([MODELE_A, MODELE_B], client);

		expect(error).toBeNull();
		expect(data?.get(MODELE_A)).toEqual({
			documentCount: 2,
			checklistItemCount: 1,
			exerciseCount: 0,
			worksheetCount: 0
		});
		expect(data?.get(MODELE_B)).toEqual({
			documentCount: 1,
			checklistItemCount: 0,
			exerciseCount: 0,
			worksheetCount: 1
		});
		// Un élément retiré du modèle ne compte plus : il n'est plus dans le plan.
		for (const call of calls) {
			expect(call.filters).toContain('is:retired_at:null');
		}
	});

	it('un modèle sans élément est absent : on lit les zéros en repli', async () => {
		const { client } = fakeSupabase({});

		const { data } = await countTemplateContent([MODELE_A], client);

		expect(data?.get(MODELE_A) ?? EMPTY_TEMPLATE_COUNTS).toEqual(EMPTY_TEMPLATE_COUNTS);
	});

	it('une lecture en échec rend une erreur, jamais des zéros', async () => {
		const { client } = fakeSupabase({
			chapter_exercises: { data: null, error: { message: 'panne' } }
		});

		const { data, error } = await countTemplateContent([MODELE_A], client);

		expect(data).toBeNull();
		expect(error?.message).toBe('panne');
	});

	it('aucune requête sans modèle à compter', async () => {
		const { client, calls } = fakeSupabase({});

		const { data } = await countTemplateContent([], client);

		expect(data?.size).toBe(0);
		expect(calls).toHaveLength(0);
	});
});
