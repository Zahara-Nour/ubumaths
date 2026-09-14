/**
 * Révision forcée d'un deck (base locale requise)
 * ===============================================
 *
 * `get_due_cards_for_deck` ne rend que les cartes échues. C'est le bon défaut
 * pour une révision espacée, et le mauvais la veille d'un contrôle : l'élève
 * ouvre son deck et le trouve vide, non parce qu'il n'y a rien à travailler,
 * mais parce que l'algorithme a jugé que ce n'était pas l'heure.
 *
 * `p_all = true` court-circuite ce seul filtre. Deux invariants comptent, et
 * aucun ne se voit depuis l'interface :
 *
 * 1. sans le drapeau, une carte programmée plus tard reste EXCLUE — sinon la
 *    répétition espacée ne veut plus rien dire ;
 * 2. l'ordre reste celui de l'échéance, même en forcé : le plus en retard
 *    d'abord.
 *
 * ⚠️ La fonction est SECURITY DEFINER et prend `p_user_id` en paramètre : c'est
 * la ROUTE qui vérifie que le deck appartient à l'appelant. Ce test exerce donc
 * la fonction, pas le contrôle d'accès — qui vit un étage au-dessus.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';

const service = createServiceRoleClient();

const DANS_UNE_SEMAINE = new Date(Date.now() + 7 * 86_400_000).toISOString();
const HIER = new Date(Date.now() - 86_400_000).toISOString();
const IL_Y_A_UN_MOIS = new Date(Date.now() - 30 * 86_400_000).toISOString();

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

/** Les cartes rendues, dans l'ordre, par leur contenu recto. */
async function cartesRendues(eleveId: string, deckId: string, toutes: boolean): Promise<string[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select c.front_content from public.get_due_cards_for_deck($1, $2, $3) d join public.srs_cards c on c.id = d.card_id order by d.next_review asc',
		[eleveId, deckId, toutes]
	);
	return rows.map((r: { front_content: string }) => r.front_content);
}

describe('révision forcée d’un deck', () => {
	let eleveId: string;
	let deckId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const profil = await TestData.profile().withRole('student').create();
		eleveId = profil.id;

		deckId = await insert('srs_decks', {
			owner_id: eleveId,
			name: 'Deck révision forcée TT',
			deck_type: 'personal'
		});

		// Trois cartes libres (`custom`) : leurs statistiques s'indexent sur
		// l'identifiant de la carte, ce qui évite d'avoir à créer des modèles.
		const carte = async (recto: string) =>
			insert('srs_cards', {
				deck_id: deckId,
				card_type: 'custom',
				front_content: recto,
				back_content: 'réponse'
			});

		const enRetard = await carte('En retard TT');
		const echueHier = await carte('Échue hier TT');
		const plusTard = await carte('Programmée plus tard TT');

		const stats = async (carteId: string, prochaine: string) => {
			const { error } = await service.from('srs_card_stats').insert({
				user_id: eleveId,
				card_reference_type: 'custom',
				card_reference_id: carteId,
				next_review: prochaine,
				difficulty: 5,
				stability: 1,
				state: 'review',
				total_reviews: 1,
				review_history: []
			});
			expect(error).toBeNull();
		};

		await stats(enRetard, IL_Y_A_UN_MOIS);
		await stats(echueHier, HIER);
		await stats(plusTard, DANS_UNE_SEMAINE);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/**
	 * Le témoin. Sans lui, un test tout vert pourrait n'être qu'un deck vide —
	 * et surtout, c'est LUI qui protège la répétition espacée : si ce cas
	 * tombait, `p_all` serait devenu le comportement par défaut sans que rien
	 * ne le dise.
	 */
	it('sans le drapeau, la carte programmée plus tard est exclue', async () => {
		const rendues = await cartesRendues(eleveId, deckId, false);

		expect(rendues).toEqual(['En retard TT', 'Échue hier TT']);
		expect(rendues).not.toContain('Programmée plus tard TT');
	});

	it('avec le drapeau, toutes les cartes du deck sortent', async () => {
		const rendues = await cartesRendues(eleveId, deckId, true);

		expect(rendues).toHaveLength(3);
		expect(rendues).toContain('Programmée plus tard TT');
	});

	/**
	 * L'ordre ne change pas : le plus en retard reste en premier, et la carte
	 * programmée plus tard arrive en dernier. Une révision forcée qui
	 * mélangerait l'ordre ferait perdre la priorité que l'algorithme a calculée.
	 */
	it('garde l’ordre d’échéance, même en révision forcée', async () => {
		expect(await cartesRendues(eleveId, deckId, true)).toEqual([
			'En retard TT',
			'Échue hier TT',
			'Programmée plus tard TT'
		]);
	});

	/**
	 * Le défaut compte autant que le drapeau : un appelant qui ignore `p_all`
	 * — et il y en a un, la route — doit garder EXACTEMENT l'ancien
	 * comportement.
	 */
	it('sans troisième argument, se comporte comme avant', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			'select count(*)::int as n from public.get_due_cards_for_deck($1, $2)',
			[eleveId, deckId]
		);

		expect(rows[0].n).toBe(2);
	});
});
