/**
 * Rattrapage des sections pour les chapitres antérieurs au trigger
 * ================================================================
 *
 * `trg_class_chapters_default_sections` ne se déclenche qu'à l'INSERT : il
 * tient l'avenir, pas le passé. En production, le chapitre du 2026-09-13 se
 * serait affiché SANS UNE SEULE section — pas une case où ranger quoi que ce
 * soit — et rien dans l'interface n'aurait expliqué pourquoi.
 *
 * C'est le trou classique d'un trigger posé après coup. Ce test le prouve en
 * fabriquant l'état d'avant (un chapitre dont on retire les sections) puis en
 * rejouant la migration **telle qu'elle sera jouée en production**, depuis son
 * fichier — pas une reconstruction à la main, qui prouverait autre chose.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';

const MIGRATION = 'supabase/migrations/20260915280000_backfill_chapter_sections.sql';

const SECTIONS_PAR_DEFAUT = [
	'Préparation',
	'Le cours',
	'Les exercices',
	'Méthodes',
	'Résumé',
	'Bilan'
];

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

async function titresDe(chapitre: string): Promise<string[]> {
	const { data, error } = await service
		.from('chapter_sections')
		.select('title')
		.eq('chapter_id', chapitre)
		.order('display_order');
	expect(error).toBeNull();
	return (data ?? []).map((s) => s.title);
}

describe('rattrapage des sections', () => {
	/** Le chapitre « ancien » : ses sections sont retirées avant le rattrapage. */
	let ancien: string;
	/** Un chapitre que le professeur a déjà remanié : à ne PAS toucher. */
	let remanie: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		// Requis même sans être référencé : un trigger crée la conversation de classe.
		await TestData.profile().withRole('teacher').create();
		const ecole = await insert('schools', {
			name: 'Lycée rattrapage UU',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année rattrapage UU',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE rattrapage UU',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'UURA01',
			is_active: true
		});

		ancien = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre ancien UU',
			display_order: 1,
			is_visible: true
		});
		remanie = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre remanié UU',
			display_order: 2,
			is_visible: true
		});

		// L'état d'AVANT le trigger : aucune section. Le trigger vient de les
		// semer, on les retire pour fabriquer le passé.
		{
			const { error } = await service.from('chapter_sections').delete().eq('chapter_id', ancien);
			expect(error).toBeNull();
		}
		expect(await titresDe(ancien)).toEqual([]);

		// Le second chapitre, lui, garde UNE section : c'est un professeur qui a
		// remanié son plan, pas un chapitre oublié.
		{
			const { error } = await service
				.from('chapter_sections')
				.delete()
				.eq('chapter_id', remanie)
				.neq('title', 'Le cours');
			expect(error).toBeNull();
		}
		expect(await titresDe(remanie)).toEqual(['Le cours']);

		// La migration, telle qu'elle sera jouée en production.
		const pg = await getPostgresClient();
		await pg.query(await readFile(MIGRATION, 'utf8'));
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('sème les six sections dans un chapitre qui n’en avait aucune', async () => {
		expect(await titresDe(ancien)).toEqual(SECTIONS_PAR_DEFAUT);
	});

	/**
	 * Le cas qui empêche le rattrapage d'écraser le travail du professeur :
	 * un chapitre dont il a retiré des sections n'est pas « incomplet », il est
	 * remanié. Re-semer les cinq manquantes lui rendrait un plan qu'il a
	 * délibérément défait.
	 */
	it('ne touche pas un chapitre qui a déjà au moins une section', async () => {
		expect(await titresDe(remanie)).toEqual(['Le cours']);
	});

	it('est idempotent — le rejouer ne duplique rien', async () => {
		const pg = await getPostgresClient();
		await pg.query(await readFile(MIGRATION, 'utf8'));

		expect(await titresDe(ancien)).toEqual(SECTIONS_PAR_DEFAUT);
		expect(await titresDe(remanie)).toEqual(['Le cours']);
	});
});
