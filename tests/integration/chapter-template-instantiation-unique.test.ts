/**
 * Un chapitre ne suit qu'un seul modèle (base locale requise)
 * ===========================================================
 *
 * L'invariant est tenu par l'index unique `unique_chapter_instantiation`
 * (`chapter_id`), présent depuis le schéma de base — je l'avais d'abord cru
 * absent en ne cherchant que des lignes `CONSTRAINT`, alors qu'il est déclaré
 * par un `CREATE UNIQUE INDEX`. **Ce test ne corrige donc rien : il garde.**
 *
 * Ce qu'il protège : quatre lectures en `.single()` sur `chapter_id`
 * (`chapter-templates.ts`, `template-updates/+server.ts`) en dépendent. Le jour
 * où l'index disparaîtrait, un doublon les transformerait en 500 sous un
 * message — « modèle introuvable » — qui ne désigne pas la cause.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

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

describe('chapter_template_instantiations — un rattachement par chapitre', () => {
	let chapitre: string;
	let modeleA: string;
	let modeleB: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();

		const ecole = await insert('schools', {
			name: 'Lycée rattachement WW',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année rattachement WW',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE rattachement WW',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'WWRA01',
			is_active: true
		});
		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre rattachement WW',
			display_order: 1,
			is_visible: true
		});

		const modele = async (titre: string) =>
			insert('chapter_templates', {
				title: titre,
				grades: ['1_SPE'],
				status: 'published',
				created_by: enseignant.id
			});
		modeleA = await modele('Modèle A rattachement WW');
		modeleB = await modele('Modèle B rattachement WW');
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('accepte le premier rattachement', async () => {
		const { error } = await service.from('chapter_template_instantiations').insert({
			chapter_id: chapitre,
			template_id: modeleA,
			template_version: 1,
			current_template_version: 1
		});

		expect(error).toBeNull();
	});

	it('refuse un second rattachement du même chapitre', async () => {
		const { error } = await service.from('chapter_template_instantiations').insert({
			chapter_id: chapitre,
			template_id: modeleB,
			template_version: 1,
			current_template_version: 1
		});

		expect(error, 'un chapitre ne doit suivre qu’un modèle').not.toBeNull();
		expect(error?.code).toBe('23505');
	});
});
