/**
 * Un modèle s'enregistre sans thème ni domaine (base locale requise)
 * =================================================================
 *
 * ADR 0035, lot 3 du chantier `automaths-arbre` : l'éditeur range un modèle
 * dans l'arbre des notions et n'écrit plus thème / domaine / sous-domaine.
 * Migration 20261104 `question_templates.theme` / `domain` facultatives.
 *
 * L'index unique sur l'ancien quadruplet reste jusqu'au lot 4 : les anciens
 * liens s'appuient encore sur « un quadruplet = au plus un modèle publié ».
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';

// Client non typé : `database.ts` (généré depuis la prod) exige encore
// `theme` / `domain` à l'insertion tant que la migration n'y est pas passée.
const service = createServiceRoleClient() as unknown as SupabaseClient;

const SANS_A = '0a11f0e0-0000-4000-8000-00000035a301';
const SANS_B = '0a11f0e0-0000-4000-8000-00000035a302';
const AVEC_A = '0a11f0e0-0000-4000-8000-00000035a303';
const AVEC_B = '0a11f0e0-0000-4000-8000-00000035a304';
const IDS = [SANS_A, SANS_B, AVEC_A, AVEC_B];

function modele(id: string, rangement: { theme?: string; domain?: string } = {}) {
	return {
		id,
		type: 'fill_in_blanks',
		title: `Sans thème ni domaine — ${id.slice(-3)}`,
		level: 1,
		grades: ['6'],
		status: 'published',
		// La contrainte `variations_minimum_one` exige au moins une variation.
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }],
		...rangement
	};
}

describe('ADR 0035 — un modèle sans thème ni domaine', () => {
	beforeAll(async () => {
		await service.from('question_templates').delete().in('id', IDS);
	});

	afterAll(async () => {
		await service.from('question_templates').delete().in('id', IDS);
		await cleanupAllTestData();
	});

	it('deux modèles publiés de même niveau, sans thème ni domaine, sont acceptés', async () => {
		const { error } = await service
			.from('question_templates')
			.insert([modele(SANS_A), modele(SANS_B)]);
		expect(error).toBeNull();

		const { data } = await service
			.from('question_templates')
			.select('id, theme, domain, subdomain')
			.in('id', [SANS_A, SANS_B])
			.order('id');
		expect(data).toEqual([
			{ id: SANS_A, theme: null, domain: null, subdomain: null },
			{ id: SANS_B, theme: null, domain: null, subdomain: null }
		]);
	});

	it('un ancien quadruplet reste unique parmi les publiés (index gardé jusqu’au lot 4)', async () => {
		const rangement = { theme: 'Test ADR 0035', domain: 'Unicité' };
		const premier = await service.from('question_templates').insert(modele(AVEC_A, rangement));
		expect(premier.error).toBeNull();

		const second = await service.from('question_templates').insert(modele(AVEC_B, rangement));
		expect(second.error?.code).toBe('23505');
	});
});
