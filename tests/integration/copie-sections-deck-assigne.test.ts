/**
 * Assigner un deck copie aussi ses sections (base locale requise)
 * ===============================================================
 *
 * Assigner un deck crée une COPIE par élève. La copie reprenait les cartes,
 * mais PAS les sections : chaque élève recevait un deck dont toutes les cartes
 * avaient `section_id = null`. Le rangement du professeur disparaissait à
 * l'assignation, sans un mot.
 *
 * Rien ne pouvait le signaler : `srs_deck_sections` n'a jamais servi en
 * production (0 ligne), et `srs_cards.section_id` n'a PAS de clé étrangère
 * composite — la base accepterait même une carte de la copie pointant vers une
 * section du deck SOURCE. C'est ce dernier point que le troisième cas vérifie,
 * parce que la base ne le fera pas à notre place.
 *
 * ⚠️ Ce test appelle le MODULE que la route utilise (`server/srs/deck-copy`),
 * et non une reproduction de sa logique : une copie resterait verte même si la
 * route changeait de comportement. Il n'exerce pas les droits du professeur,
 * qui se vérifient un étage au-dessus.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import {
	planSectionCopies,
	indexCopiedSections,
	resolveCardSection
} from '$lib/server/srs/deck-copy';

const service = createServiceRoleClient();

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

describe('copie des sections à l’assignation d’un deck', () => {
	let deckSource: string;
	let eleveId: string;
	let sectionCours: string;
	let sectionExercices: string;
	let deckCopie: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const prof = await TestData.profile().withRole('teacher').create();
		const eleve = await TestData.profile().withRole('student').create();
		eleveId = eleve.id;

		deckSource = await insert('srs_decks', {
			owner_id: prof.id,
			name: 'Deck source RR',
			deck_type: 'official'
		});

		sectionCours = await insert('srs_deck_sections', {
			deck_id: deckSource,
			name: 'Le cours RR',
			display_order: 0
		});
		sectionExercices = await insert('srs_deck_sections', {
			deck_id: deckSource,
			name: 'Les exercices RR',
			display_order: 1
		});

		const carte = async (recto: string, sectionId: string | null) =>
			insert('srs_cards', {
				deck_id: deckSource,
				card_type: 'custom',
				front_content: recto,
				back_content: 'réponse',
				section_id: sectionId
			});

		await carte('Carte du cours RR', sectionCours);
		await carte('Carte d’exercices RR', sectionExercices);
		// Une carte hors section : elle doit le rester après copie.
		await carte('Carte sans section RR', null);

		// --- La copie, telle que la route l'effectue -------------------------
		const { data: sourceSections } = await service
			.from('srs_deck_sections')
			.select('*')
			.eq('deck_id', deckSource)
			.order('display_order');

		const { data: sourceCards } = await service
			.from('srs_cards')
			.select('*')
			.eq('deck_id', deckSource);

		deckCopie = await insert('srs_decks', {
			owner_id: eleveId,
			name: 'Deck source RR',
			deck_type: 'official',
			is_assigned: true,
			// Tel que `planDeckCopies` l'écrit. Sans ce lien, la policy élève de
			// `chapter_decks` masque le deck : la copie existe, le chapitre la
			// cache, et le décor de ce test ne ressemblerait plus à la production.
			source_deck_id: deckSource
		});

		const sectionsACreer = planSectionCopies(sourceSections ?? [], [deckCopie]);

		const { data: sectionsCreees, error: sectionsError } = await service
			.from('srs_deck_sections')
			.insert(sectionsACreer)
			.select('id, deck_id, display_order');
		expect(sectionsError).toBeNull();

		const parRang = indexCopiedSections(sectionsCreees ?? []);

		const cartesACreer = (sourceCards ?? []).map((card) => ({
			deck_id: deckCopie,
			card_type: card.card_type,
			template_id: card.template_id,
			front_content: card.front_content,
			back_content: card.back_content,
			section_id: resolveCardSection(card, sourceSections ?? [], parRang, deckCopie)
		}));

		const { error: cartesError } = await service.from('srs_cards').insert(cartesACreer);
		expect(cartesError).toBeNull();
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('les sections du deck source sont copiées', async () => {
		const { data, error } = await service
			.from('srs_deck_sections')
			.select('name')
			.eq('deck_id', deckCopie)
			.order('display_order');

		expect(error).toBeNull();
		expect(data?.map((s) => s.name)).toEqual(['Le cours RR', 'Les exercices RR']);
	});

	it('chaque carte retrouve SA section dans la copie', async () => {
		const { data, error } = await service
			.from('srs_cards')
			.select('front_content, section:srs_deck_sections(name)')
			.eq('deck_id', deckCopie);

		expect(error).toBeNull();

		const parCarte = Object.fromEntries(
			(data ?? []).map((c) => {
				const section = Array.isArray(c.section) ? c.section[0] : c.section;
				return [c.front_content as string, section?.name ?? null];
			})
		);

		expect(parCarte['Carte du cours RR']).toBe('Le cours RR');
		expect(parCarte['Carte d’exercices RR']).toBe('Les exercices RR');
		// Hors section à la source, hors section dans la copie.
		expect(parCarte['Carte sans section RR']).toBeNull();
	});

	/**
	 * LE cas que la base ne rattrapera pas : `srs_cards.section_id` n'a pas de
	 * clé étrangère composite `(section_id, deck_id)`. Une correspondance fausse
	 * ferait pointer une carte de l'élève vers une section du deck du
	 * professeur, et Postgres l'accepterait.
	 */
	it('aucune carte de la copie ne pointe vers une section du deck source', async () => {
		const { data, error } = await service
			.from('srs_cards')
			.select('id, section_id')
			.eq('deck_id', deckCopie)
			.in('section_id', [sectionCours, sectionExercices]);

		expect(error).toBeNull();
		expect(data, 'une carte de la copie référence une section de la source').toEqual([]);
	});
});
