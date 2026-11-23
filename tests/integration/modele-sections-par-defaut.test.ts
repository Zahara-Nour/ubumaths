/**
 * Un modèle créé de zéro reçoit les six sections par défaut (base locale requise)
 * ===============================================================================
 *
 * Un chapitre de classe créé à la main reçoit six sections par défaut
 * (déclencheur `seed_default_chapter_sections`). Un modèle créé de zéro reçoit
 * les mêmes, posées par `createChapterTemplate` ; le professeur peut ensuite
 * les renommer, les réordonner, les supprimer. Un modèle fait DEPUIS un
 * chapitre n'en reçoit pas : il copie les sections de ce chapitre.
 *
 * Tout passe par les droits RÉELS du professeur (RLS) ; le service ne sert
 * qu'au décor et aux constats.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { present } from '../helpers/present';
import { DEFAULT_SECTION_TITLES } from '#lib/server/chapter-sections.ts';
import { createChapterTemplate, createTemplateFromChapter } from '#lib/server/chapter-templates.ts';

// Le client service des modules serveur lit process.env (qui peut viser la prod
// via .env) : on le branche explicitement sur la base LOCALE de test.
vi.mock('#lib/server/serviceRoleClient.ts', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

// Variables
const service = createServiceRoleClient();

// Functions
async function insert<T extends keyof Database['public']['Tables']>(
	client: SupabaseClient<Database>,
	table: T,
	row: Database['public']['Tables'][T]['Insert']
): Promise<string> {
	const { data, error } = await client
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${String(table)}: ${error.message}`);
	return (data as { id: string }).id;
}

/** Les titres des sections d'un propriétaire, dans l'ordre. */
async function titres(colonne: 'chapter_id' | 'template_id', id: string): Promise<string[]> {
	const { data, error } = await service
		.from('chapter_sections')
		.select('title')
		.eq(colonne, id)
		.order('display_order');
	expect(error).toBeNull();
	return (data ?? []).map((s) => s.title);
}

describe('modèle créé de zéro : les six sections par défaut', () => {
	let prof: SupabaseClient<Database>;
	let profId: string;
	let classe: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const p = await TestData.profile().withRole('teacher').create();
		profId = p.id;
		prof = await createAuthenticatedClient(p.email);

		const ecole = await insert(service, 'schools', {
			name: 'Collège sections ZZ',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert(service, 'school_years', {
			school_id: ecole,
			name: 'Année sections ZZ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert(service, 'classes', {
			name: '6e sections ZZ',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'ZZSEC1',
			is_active: true
		});
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('les six titres sont ceux que la base pose sur un chapitre', async () => {
		const chapitre = await insert(service, 'class_chapters', {
			class_id: classe,
			title: 'Chapitre témoin ZZ',
			display_order: 1
		});

		expect(await titres('chapter_id', chapitre)).toEqual([...DEFAULT_SECTION_TITLES]);
	});

	it('un modèle créé de zéro reçoit les six sections, dans l’ordre', async () => {
		const { data, error } = await createChapterTemplate(
			{ title: 'Fractions ZZ', grades: [] },
			profId,
			prof
		);
		expect(error).toBeNull();

		expect(await titres('template_id', present(data).id)).toEqual([...DEFAULT_SECTION_TITLES]);
	});

	it('un modèle fait depuis un chapitre garde les sections du chapitre, sans les six en plus', async () => {
		const chapitre = await insert(service, 'class_chapters', {
			class_id: classe,
			title: 'Chapitre source ZZ',
			display_order: 2
		});
		// Le professeur a retouché les sections de son chapitre.
		const { data: bilan } = await service
			.from('chapter_sections')
			.delete()
			.eq('chapter_id', chapitre)
			.eq('title', 'Bilan')
			.select('id');
		expect(bilan).toHaveLength(1);
		await insert(service, 'chapter_sections', {
			chapter_id: chapitre,
			title: 'Problèmes ZZ',
			display_order: 7
		});

		const { data, error } = await createTemplateFromChapter(
			{ chapterId: chapitre, title: 'Modèle depuis chapitre ZZ', grades: [] },
			profId,
			prof
		);
		expect(error).toBeNull();

		expect(await titres('template_id', present(data).id)).toEqual([
			'Préparation',
			'Le cours',
			'Les exercices',
			'Méthodes',
			'Résumé',
			'Problèmes ZZ'
		]);
	});
});
