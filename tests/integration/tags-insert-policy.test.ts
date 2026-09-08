/**
 * Création de tags réservée au prof/admin (nécessite une base locale)
 * ==================================================================
 *
 * Migration : 20260908160000_tags_insert_teachers_only.sql
 *
 * Un élève pouvait créer un tag, et le catalogue est lisible par un visiteur
 * anonyme : un mineur pouvait donc publier du texte libre non modéré, lisible
 * sans compte. La migration ferme l'écriture sans toucher à la lecture.
 *
 * Le test le moins évident est le dernier, et c'est le plus important : révoquer
 * `tag_slug` à `anon` ne doit PAS casser la colonne générée `tags.slug`, dont
 * l'expression est évaluée avec les droits de celui qui insère. Si on avait
 * révoqué un cran trop large, toute création de tag par le prof échouerait.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

const TEACHER_TAG = 'Symétrie axiale ZZ';
const STUDENT_TAG = 'Tag interdit ZZ';
const ANON_TAG = 'Tag anonyme ZZ';
const RPC_TAG = 'Tag par RPC prof ZZ';
const ALL_TAGS = [TEACHER_TAG, STUDENT_TAG, ANON_TAG, RPC_TAG, 'Tag par RPC interdit ZZ'];

describe('création de tags réservée au prof/admin', () => {
	const service = createServiceRoleClient();
	let teacher: SupabaseClient<Database>;
	let student: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacherProfile = await TestData.profile().withRole('teacher').create();
		const studentProfile = await TestData.profile().withRole('student').create();

		await service.from('tags').delete().in('name', ALL_TAGS);

		teacher = await clientFor(teacherProfile.email);
		student = await clientFor(studentProfile.email);
	});

	afterAll(async () => {
		await service.from('tags').delete().in('name', ALL_TAGS);
		await cleanupAllTestData();
	});

	it('un élève ne peut PLUS créer de tag', async () => {
		const { error } = await student.from('tags').insert({ name: STUDENT_TAG });

		expect(error).not.toBeNull();
		// 42501 = violation de politique RLS : refus franc, pas un silence.
		expect(error?.code).toBe('42501');
	});

	it("le tag de l'élève n'existe nulle part", async () => {
		// Vérifier le refus ne suffit pas : on vérifie qu'aucune ligne n'a été écrite.
		const { data } = await service.from('tags').select('id').eq('name', STUDENT_TAG);

		expect(data).toEqual([]);
	});

	it('un visiteur anonyme ne peut pas créer de tag', async () => {
		const { error } = await anonClient().from('tags').insert({ name: ANON_TAG });

		expect(error).not.toBeNull();
		// ⚠️ Depuis la révocation de `tag_slug` à PUBLIC, anon échoue en amont, sur
		// « permission denied for function » — le contrôle d'ACL de la colonne
		// générée précède l'évaluation du WITH CHECK. Ce test ne démontre donc
		// PLUS que la RLS ferme anon ; c'est le test élève ci-dessus qui l'établit,
		// lui ayant le droit d'exécuter `tag_slug` et échouant donc bien en 42501.
		const { data } = await service.from('tags').select('id').eq('name', ANON_TAG);
		expect(data).toEqual([]);
	});

	it('un prof crée toujours des tags', async () => {
		const { error } = await teacher.from('tags').insert({ name: TEACHER_TAG });

		expect(error).toBeNull();
	});

	it('le slug est toujours calculé — la colonne générée survit à la révocation', async () => {
		// LE test qui compte : `tags.slug` appelle `tag_slug()`, évaluée avec les
		// droits de celui qui insère. Révoquer un cran trop large aurait cassé
		// toute création de tag par le prof, sans que rien d'autre ne le signale.
		const { data, error } = await teacher.from('tags').select('slug').eq('name', TEACHER_TAG);

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data![0].slug).toBe('symetrie-axiale-zz');
	});

	// ========================================================================
	// resolve_tag_ids — la seule autre porte vers `tags`
	// ========================================================================

	it('un élève ne peut pas contourner la policy via resolve_tag_ids', async () => {
		// C'EST LE TEST QUI COMPTE. `resolve_tag_ids` est la seule fonction du
		// schéma qui insère dans `tags`, elle est exécutable par tout compte
		// connecté, et sa sûreté tient au seul mot `invoker`. Le dépôt compte 45
		// fonctions SECURITY DEFINER : le jour où quelqu'un le pose ici par
		// réflexe, la policy devient entièrement contournable — et tous les autres
		// tests de ce fichier resteraient verts, puisqu'ils ne testent que
		// l'INSERT direct sur la table.
		const { error } = await student.rpc('resolve_tag_ids', {
			p_names: ['Tag par RPC interdit ZZ']
		});

		expect(error).not.toBeNull();

		const { data } = await service.from('tags').select('id').eq('name', 'Tag par RPC interdit ZZ');
		expect(data).toEqual([]);
	});

	it('un prof crée toujours des tags via resolve_tag_ids', async () => {
		// Le pendant du précédent : sans lui, une restriction trop large passerait
		// inaperçue, `mirrorResourceTags` avalant volontairement ses erreurs.
		const { data, error } = await teacher.rpc('resolve_tag_ids', {
			p_names: [RPC_TAG]
		});

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data![0].name).toBe(RPC_TAG);
	});

	it('la lecture reste ouverte, y compris sans compte', async () => {
		// La page publique des presques-évaluations filtre par tag : fermer la
		// lecture la casserait.
		const { data, error } = await anonClient().from('tags').select('name').eq('name', TEACHER_TAG);

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});
});
