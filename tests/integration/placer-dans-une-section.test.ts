/**
 * Créer une ressource DIRECTEMENT dans une section (base locale requise)
 * ======================================================================
 *
 * Le bouton « Ajouter » vit au pied de chaque section : ce que le professeur
 * crée doit atterrir là où il a cliqué, et en DERNIER — pas en tête, pas au
 * milieu.
 *
 * ⚠️ Le piège est le calcul du rang. Une section mélange les quatre types, qui
 * vivent dans quatre tables ; compter le `section_order` le plus haut sur la
 * seule table de la ressource donnerait un rang déjà pris par une ressource
 * d'un autre type. Les deux s'afficheraient alors dans un ordre arbitraire, que
 * le professeur ne pourrait corriger qu'en les déplaçant toutes — et rien
 * n'expliquerait pourquoi.
 *
 * C'est exactement ce que `placeInSection` doit empêcher, et ce qu'aucun
 * typecheck ni lint ne peut voir.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { placeInSection } from '$lib/server/chapter-sections';

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

async function rangDe(table: string, id: string): Promise<number | null> {
	const { data, error } = await service
		.from(table as never)
		.select('section_id, section_order')
		.eq('id', id)
		.single();
	expect(error).toBeNull();
	return (data as { section_order: number | null }).section_order;
}

async function sectionDe(table: string, id: string): Promise<string | null> {
	const { data, error } = await service
		.from(table as never)
		.select('section_id')
		.eq('id', id)
		.single();
	expect(error).toBeNull();
	return (data as { section_id: string | null }).section_id;
}

describe('placer une ressource créée dans une section', () => {
	let chapitre: string;
	let section: string;
	let sectionVide: string;
	let exercice: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();

		const ecole = await insert('schools', {
			name: 'Lycée placement WW',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année placement WW',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE placement WW',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'WWPL01',
			is_active: true
		});

		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre placement WW',
			display_order: 1,
			is_visible: true
		});

		// Le trigger sème six sections ; on travaille dans les deux premières.
		const { data: semees, error } = await service
			.from('chapter_sections')
			.select('id')
			.eq('chapter_id', chapitre)
			.order('display_order');
		expect(error).toBeNull();
		section = semees![0].id;
		sectionVide = semees![1].id;

		exercice = await insert('exercises', {
			title: 'Exercice placement WW',
			created_by: enseignant.id,
			grades: ['1_SPE'],
			topic: 'Placement WW',
			category: 'application'
		});
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/**
	 * Le cas qui compte : le rang le plus haut de la section est porté par un
	 * OBJECTIF, et c'est un DOCUMENT qu'on ajoute. Compter sur la seule table
	 * des documents rendrait 0 — le document passerait devant tout le monde.
	 */
	it('compte le rang sur les QUATRE tables, pas seulement la sienne', async () => {
		const objectif = await insert('chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Objectif déjà rangé WW',
			display_order: 0,
			section_id: section,
			section_order: 7
		});
		expect(await rangDe('chapter_checklist_items', objectif)).toBe(7);

		const document = await insert('chapter_documents', {
			chapter_id: chapitre,
			source_type: 'google_drive',
			title: 'Document ajouté WW',
			google_drive_url: 'https://drive.google.com/file/d/WW/view',
			google_file_id: 'WW',
			display_order: 0
		});

		const { error } = await placeInSection(chapitre, section, 'document', document, service);
		expect(error).toBeNull();

		expect(await sectionDe('chapter_documents', document)).toBe(section);
		expect(await rangDe('chapter_documents', document)).toBe(8);
	});

	it('place la première ressource d’une section au rang 0', async () => {
		const lien = await insert('chapter_exercises', {
			chapter_id: chapitre,
			exercise_id: exercice,
			display_order: 0
		});

		const { error } = await placeInSection(chapitre, sectionVide, 'exercise', lien, service);
		expect(error).toBeNull();

		expect(await sectionDe('chapter_exercises', lien)).toBe(sectionVide);
		expect(await rangDe('chapter_exercises', lien)).toBe(0);
	});

	/**
	 * Les sections d'un chapitre sont indépendantes : une section bien remplie
	 * ne doit pas décaler le rang d'une autre, sinon la seconde commencerait à
	 * un rang arbitraire et ses ressources paraîtraient trouées.
	 */
	it('ne compte que la section visée', async () => {
		const objectif = await insert('chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Objectif d’une autre section WW',
			display_order: 1,
			section_id: section,
			section_order: 42
		});
		expect(await rangDe('chapter_checklist_items', objectif)).toBe(42);

		const autre = await insert('chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Objectif à placer WW',
			display_order: 2
		});

		const { error } = await placeInSection(chapitre, sectionVide, 'checklistItem', autre, service);
		expect(error).toBeNull();

		// `sectionVide` porte déjà l'exercice au rang 0 du cas précédent.
		expect(await rangDe('chapter_checklist_items', autre)).toBe(1);
	});

	/**
	 * La clé étrangère composite `(section_id, chapter_id)` refuse une section
	 * d'un autre chapitre. C'est la base qui garde, pas la validation : une
	 * route future qui oublierait de vérifier se heurterait quand même au mur.
	 */
	it('refuse une section qui n’appartient pas au chapitre', async () => {
		const autreChapitre = await insert('class_chapters', {
			class_id: (await service
				.from('class_chapters')
				.select('class_id')
				.eq('id', chapitre)
				.single()
				.then((r) => r.data!.class_id)) as string,
			title: 'Autre chapitre WW',
			display_order: 2,
			is_visible: true
		});

		const { data: ailleurs } = await service
			.from('chapter_sections')
			.select('id')
			.eq('chapter_id', autreChapitre)
			.limit(1)
			.single();

		const objectif = await insert('chapter_checklist_items', {
			chapter_id: chapitre,
			content: 'Objectif hors chapitre WW',
			display_order: 3
		});

		const { error } = await placeInSection(
			chapitre,
			ailleurs!.id,
			'checklistItem',
			objectif,
			service
		);

		expect(error).not.toBeNull();
		// La ressource reste où elle était : un refus ne déplace rien.
		expect(await sectionDe('chapter_checklist_items', objectif)).toBeNull();
	});
});
