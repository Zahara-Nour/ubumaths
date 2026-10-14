/**
 * La purge des tests passe malgré les lignes de lien (base locale requise)
 * ========================================================================
 *
 * ADR 0029 : un chapitre lié porte une LIGNE DE LIEN par élément du modèle, et
 * `source_id` est en `ON DELETE RESTRICT` (sections : `SET NULL`). Supprimer
 * un profil supprime ses modèles (CASCADE), donc leurs éléments — refusé tant
 * qu'un chapitre les relie.
 *
 * Deux purges en dépendaient sans le savoir :
 *
 * - `global-setup` supprime tous les comptes `teacher` : le 2026-10-14, une démo
 *   laissée en base locale (modèle relié par un chapitre) a fait échouer la
 *   suite entière avant son premier test ;
 * - `cleanupAllTestData` supprime les profils de test AVANT les classes : le
 *   DELETE refusé ne lève rien (`{ error }`), et la suppression de secours
 *   (`session_replication_role = replica`, clés étrangères coupées) laissait le
 *   modèle ORPHELIN, `created_by` vers un profil disparu.
 *
 * Décision : avant de supprimer un modèle, la purge DÉTACHE les chapitres qui le
 * relient (`source_id` vidé, instanciation marquée détachée), comme le ferait
 * « Détacher du modèle ». Le chapitre d'une classe que la purge ne touche pas
 * garde donc son contenu (la base l'a recopié dans chaque ligne de lien).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { setup as globalSetup } from './global-setup';

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Variables
const service = createServiceRoleClient();
/** Sans le schéma généré : tables désignées par leur nom. */
const serviceBrut = service as unknown as SupabaseClient;

// Functions
async function signIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function insertAs(
	client: SupabaseClient,
	table: string,
	row: Record<string, unknown>
): Promise<string> {
	const { data, error } = await client.from(table).insert(row).select('id').single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

/**
 * Un professeur de test, son modèle (une section, un objectif), et un chapitre
 * d'une classe qui le relie : deux lignes de lien.
 */
async function decor(): Promise<{ modele: string; chapitre: string; objectifLie: string }> {
	const p = await TestData.profile().withRole('teacher').create();
	const prof = await signIn(p.email);

	const ecole = await insertAs(serviceBrut, 'schools', {
		name: 'Lycée purge ZZ',
		city: 'Testville',
		country: 'France'
	});
	const annee = await insertAs(serviceBrut, 'school_years', {
		school_id: ecole,
		name: 'Année purge ZZ',
		start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
		end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
		is_active: true
	});
	const classe = await insertAs(serviceBrut, 'classes', {
		name: '1SPE purge ZZ',
		school_id: ecole,
		school_year_id: annee,
		join_code: 'ZZPURG',
		is_active: true
	});
	const chapitre = await insertAs(serviceBrut, 'class_chapters', {
		class_id: classe,
		title: 'Chapitre lié ZZ',
		display_order: 1,
		is_visible: true
	});

	const modele = await insertAs(prof, 'chapter_templates', {
		created_by: p.id,
		title: 'Modèle purge ZZ',
		status: 'published'
	});
	const section = await insertAs(prof, 'chapter_sections', {
		template_id: modele,
		title: 'Le cours',
		display_order: 0
	});
	await insertAs(prof, 'chapter_checklist_items', {
		template_id: modele,
		section_id: section,
		content: 'Je sais purger',
		display_order: 0
	});

	const { error } = await prof.rpc('link_chapter_to_template', {
		p_chapter_id: chapitre,
		p_template_id: modele
	});
	expect(error, 'le chapitre n’a pas pu être lié').toBeNull();

	const { data: liens } = await serviceBrut
		.from('chapter_checklist_items')
		.select('id')
		.eq('chapter_id', chapitre)
		.not('source_id', 'is', null);
	expect(liens, 'le décor doit porter une ligne de lien').toHaveLength(1);

	return { modele, chapitre, objectifLie: (liens as { id: string }[])[0].id };
}

async function modeleExiste(modele: string): Promise<boolean> {
	const { data } = await service.from('chapter_templates').select('id').eq('id', modele);
	return (data ?? []).length > 0;
}

describe('purge des tests face aux lignes de lien (ADR 0029)', () => {
	beforeEach(async () => {
		await cleanupAllTestData();
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('cleanupAllTestData supprime le modèle d’un profil de test relié par un chapitre', async () => {
		const { modele } = await decor();

		await cleanupAllTestData();

		expect(await modeleExiste(modele), 'modèle laissé orphelin par la purge').toBe(false);
	});

	/**
	 * Le décor de l'incident du 2026-10-14 : la classe n'est pas purgée par
	 * `global-setup` (il ne supprime que les professeurs).
	 */
	it('global-setup passe, et le chapitre d’une classe non purgée garde son contenu', async () => {
		const { modele, chapitre, objectifLie } = await decor();

		await expect(globalSetup()).resolves.toBeUndefined();

		expect(await modeleExiste(modele)).toBe(false);

		const { data: objectif } = await serviceBrut
			.from('chapter_checklist_items')
			.select('chapter_id, source_id, content')
			.eq('id', objectifLie)
			.single();
		expect(objectif).toEqual({ chapter_id: chapitre, source_id: null, content: 'Je sais purger' });

		const { data: rattachement } = await service
			.from('chapter_template_instantiations')
			.select('template_id, is_detached')
			.eq('chapter_id', chapitre)
			.single();
		expect(rattachement).toEqual({ template_id: null, is_detached: true });
	});
});
