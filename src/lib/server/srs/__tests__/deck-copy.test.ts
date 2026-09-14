/**
 * La correspondance des sections à la copie d'un deck
 *
 * Assigner un deck crée une COPIE par élève. Les cartes doivent retrouver LEUR
 * section dans la copie — jamais celle du deck source.
 *
 * ⚠️ Ce que la base ne rattrapera PAS : `srs_cards.section_id` n'a pas de clé
 * étrangère composite `(section_id, deck_id)`. Une correspondance fausse ferait
 * pointer la carte d'un élève vers une section du professeur, et Postgres
 * l'accepterait. D'où ces cas.
 */
import { describe, it, expect } from 'vitest';
import {
	indexCopiedSections,
	planDeckCopies,
	planSectionCopies,
	resolveCardSection,
	type SourceSection
} from '../deck-copy';

const COURS: SourceSection = { id: 'src-cours', name: 'Le cours', description: null };
const EXOS: SourceSection = { id: 'src-exos', name: 'Les exercices', description: 'au choix' };

describe('planSectionCopies', () => {
	it('crée les sections de chaque deck, dans l’ordre source', () => {
		const plan = planSectionCopies([COURS, EXOS], ['deck-a', 'deck-b']);

		expect(plan).toHaveLength(4);
		expect(plan.filter((s) => s.deck_id === 'deck-a').map((s) => s.name)).toEqual([
			'Le cours',
			'Les exercices'
		]);
	});

	/**
	 * Le rang est RENUMÉROTÉ de 0 à n, et c'est lui qui servira de clé : les
	 * `display_order` de la source peuvent être quelconques (10, 20, 30…) ou en
	 * doublon, alors que le rang est unique par deck parce que nous le
	 * fabriquons.
	 */
	it('renumérote les rangs de 0 à n, quelles que soient les valeurs source', () => {
		const plan = planSectionCopies([COURS, EXOS], ['deck-a']);

		expect(plan.map((s) => s.display_order)).toEqual([0, 1]);
	});

	it('reporte la description', () => {
		const plan = planSectionCopies([EXOS], ['deck-a']);

		expect(plan[0].description).toBe('au choix');
	});

	it('ne crée rien quand le deck source n’a pas de section', () => {
		expect(planSectionCopies([], ['deck-a', 'deck-b'])).toEqual([]);
	});
});

describe('resolveCardSection', () => {
	const copiees = indexCopiedSections([
		{ id: 'copie-a-cours', deck_id: 'deck-a', display_order: 0 },
		{ id: 'copie-a-exos', deck_id: 'deck-a', display_order: 1 },
		{ id: 'copie-b-cours', deck_id: 'deck-b', display_order: 0 },
		{ id: 'copie-b-exos', deck_id: 'deck-b', display_order: 1 }
	]);

	it('rend la section de LA COPIE, pas celle de la source', () => {
		const section = resolveCardSection(
			{ section_id: 'src-cours' },
			[COURS, EXOS],
			copiees,
			'deck-a'
		);

		expect(section).toBe('copie-a-cours');
		expect(section).not.toBe('src-cours');
	});

	// Deux élèves, deux copies : chacun doit recevoir la sienne.
	it('donne à chaque deck sa propre copie de la même section', () => {
		expect(resolveCardSection({ section_id: 'src-exos' }, [COURS, EXOS], copiees, 'deck-a')).toBe(
			'copie-a-exos'
		);
		expect(resolveCardSection({ section_id: 'src-exos' }, [COURS, EXOS], copiees, 'deck-b')).toBe(
			'copie-b-exos'
		);
	});

	it('laisse hors section une carte qui l’était déjà', () => {
		expect(resolveCardSection({ section_id: null }, [COURS, EXOS], copiees, 'deck-a')).toBeNull();
	});

	/**
	 * Une section inconnue rend `null` plutôt que de rattacher au hasard : mieux
	 * vaut une carte non rangée qu'une carte rangée au mauvais endroit.
	 */
	it('rend null pour une section absente de la source', () => {
		expect(
			resolveCardSection({ section_id: 'src-inconnue' }, [COURS, EXOS], copiees, 'deck-a')
		).toBeNull();
	});

	it('rend null quand le deck n’a pas reçu de copie', () => {
		expect(
			resolveCardSection({ section_id: 'src-cours' }, [COURS, EXOS], copiees, 'deck-jamais-copie')
		).toBeNull();
	});
});

describe('planDeckCopies — la copie porte sa source', () => {
	const SOURCE = {
		name: 'Automatismes 3e',
		description: 'Calcul mental',
		deck_type: 'official',
		config: { daily_limit: 20 }
	};
	const DECK = '11111111-1111-4111-8111-111111111111';
	const ELEVE_A = '22222222-2222-4222-8222-222222222222';
	const ELEVE_B = '33333333-3333-4333-8333-333333333333';

	/**
	 * La policy élève de `chapter_decks` exige une copie dont
	 * `source_deck_id` vaut le deck rattaché. Une copie sans ce lien laisse
	 * l'élève devant un chapitre où le deck n'apparaît pas — sans message, et
	 * sans que rien ne signale la cause.
	 */
	it('écrit source_deck_id sur CHAQUE copie', () => {
		const copies = planDeckCopies(SOURCE, DECK, [ELEVE_A, ELEVE_B]);

		expect(copies).toHaveLength(2);
		expect(copies.every((c) => c.source_deck_id === DECK)).toBe(true);
		expect(copies.map((c) => c.owner_id)).toEqual([ELEVE_A, ELEVE_B]);
	});

	it('marque la copie en lecture seule et reprend la config de la source', () => {
		const [copie] = planDeckCopies(SOURCE, DECK, [ELEVE_A]);

		expect(copie.is_assigned).toBe(true);
		expect(copie.name).toBe(SOURCE.name);
		expect(copie.description).toBe(SOURCE.description);
		expect(copie.deck_type).toBe(SOURCE.deck_type);
		expect(copie.config).toEqual(SOURCE.config);
	});

	it('ne crée rien sans élève', () => {
		expect(planDeckCopies(SOURCE, DECK, [])).toEqual([]);
	});
});
