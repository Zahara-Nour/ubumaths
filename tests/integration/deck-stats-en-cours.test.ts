/**
 * Tuile « En cours » d'un paquet : `learning` + `relearning` (base locale requise)
 * =================================================================================
 *
 * Chantier `fsrs`, Q7 (décision de David, 2026-11-15). `get_deck_stats.learning_count`
 * comptait `learning` seul : depuis #2705, `learning` ne dure qu'une révision, et une
 * question ratée (`relearning`) n'y figurait jamais. Elle compte désormais les deux.
 *
 * Témoins : `new_count`, `review_count`, `total_cards` inchangés ; la garde de compte
 * (statistiques demandées pour le compte d'un autre élève → 42501) tient toujours.
 *
 * @vitest-environment node
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '#lib/types/database.ts';

// Types
type CardState = 'new' | 'learning' | 'review' | 'relearning';
type Stats = {
	total_cards: number;
	due_count: number;
	new_count: number;
	learning_count: number;
	review_count: number;
};

// Constantes
const REFUS = '42501';
const service = createServiceRoleClient();
/** Une carte par état ; `null` = jamais révisée (pas de fiche) */
const ETATS: Array<CardState | null> = [null, 'learning', 'relearning', 'relearning', 'review'];

describe('get_deck_stats : « En cours » = learning + relearning', () => {
	let eleve: SupabaseClient<Database>;
	let eleveId: string;
	let autreEleve: SupabaseClient<Database>;
	let paquet: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const a = await TestData.profile().withRole('student').create();
		const b = await TestData.profile().withRole('student').create();
		eleveId = a.id;

		const { data: deck, error: deckError } = await service
			.from('srs_decks')
			.insert({ owner_id: eleveId, name: 'Paquet En cours', deck_type: 'personal' })
			.select('id')
			.single();
		if (deckError || !deck) throw new Error(`décor : paquet : ${deckError?.message}`);
		paquet = deck.id;

		const { data: cartes, error: cartesError } = await service
			.from('srs_cards')
			.insert(
				ETATS.map((_, i) => ({
					deck_id: paquet,
					card_type: 'custom',
					front_content: `Question ${i + 1}`,
					back_content: 'réponse'
				}))
			)
			.select('id');
		if (cartesError || !cartes) throw new Error(`décor : cartes : ${cartesError?.message}`);

		const fiches = cartes.flatMap((carte, i) => {
			const state = ETATS[i];
			if (state === null) return [];
			return [
				{
					user_id: eleveId,
					card_reference_type: 'custom',
					card_reference_id: carte.id,
					state,
					next_review: new Date(Date.now() + 86_400_000).toISOString()
				}
			];
		});
		const { error: fichesError } = await service.from('srs_card_stats').insert(fiches);
		if (fichesError) throw new Error(`décor : fiches : ${fichesError.message}`);

		eleve = await createAuthenticatedClient(a.email);
		autreEleve = await createAuthenticatedClient(b.email);
	}, 120_000);

	afterAll(async () => {
		await service.from('srs_card_stats').delete().eq('user_id', eleveId);
		await service.from('srs_decks').delete().eq('id', paquet);
		await cleanupAllTestData();
	});

	it('compte learning et relearning dans « En cours », le reste inchangé', async () => {
		const { data, error } = await eleve.rpc('get_deck_stats', {
			p_user_id: eleveId,
			p_deck_id: paquet
		});
		expect(error).toBeNull();
		const [stats] = (data ?? []) as Stats[];
		expect(Number(stats.learning_count)).toBe(3);
		expect(Number(stats.new_count)).toBe(1);
		expect(Number(stats.review_count)).toBe(1);
		expect(Number(stats.total_cards)).toBe(5);
		// Seule la carte sans fiche est due (fiches dues demain)
		expect(Number(stats.due_count)).toBe(1);
	});

	it('garde inchangée : le compte d’un autre élève reste refusé', async () => {
		const { error } = await autreEleve.rpc('get_deck_stats', {
			p_user_id: eleveId,
			p_deck_id: paquet
		});
		expect(error?.code).toBe(REFUS);
	});
});
