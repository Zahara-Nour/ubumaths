/**
 * Catalogue de tags unifié (nécessite une base locale)
 * ====================================================
 *
 * Migration : 20260908130000_unified_tag_catalog.sql
 *
 * Ce que ces tests protègent :
 *  - la NORMALISATION, qui est la raison d'être de la migration. Une folksonomie
 *    à un seul auteur ne diverge pas entre contributeurs, elle diverge entre
 *    « algebre », « algèbre » et « Algebre ». L'index unique sur le slug est ce
 *    qui l'en empêche.
 *  - les DROITS sur la nouvelle jonction : un élève lit les étiquettes, il n'en
 *    pose pas.
 *
 * Ce qu'ils ne couvrent PAS, en toute franchise : la reprise des données
 * existantes, qui s'exécute une seule fois au moment de la migration. Une
 * fixture créée après coup n'est par construction pas reprise. La reprise a été
 * vérifiée à la main sur la base locale après `db:reset` (comptages avant/après).
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

const RESOURCE_ID = 'dabb1e00-0000-4000-8000-00000000d001';
const TAG_NAMES = [
	'Algèbre linéaire ZZ',
	'algebre lineaire zz',
	'Suites  numériques  ZZ',
	// Ces trois-là couvrent les caractères qu'une table de translittération
	// décalée d'un rang mappe silencieusement de travers (ç, ù, ñ). Une première
	// version de `tag_slug` donnait « leuon » pour « leçon ».
	'Leçon où ça coince ZZ',
	'LEÇON OÙ ÇA COINCE ZZ',
	'Mañana ZZ'
];

/** Accès non typé : `resource_tags` n'est pas encore dans les types générés. */
type LooseClient = {
	from: (table: string) => {
		select: (columns: string) => {
			eq: (
				column: string,
				value: string
			) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
			in: (
				column: string,
				values: string[]
			) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
		};
		insert: (rows: unknown) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
		delete: () => {
			in: (column: string, values: string[]) => PromiseLike<{ error: unknown }>;
			eq: (column: string, value: string) => PromiseLike<{ error: unknown }>;
		};
	};
};

const loose = (client: unknown) => client as unknown as LooseClient;

describe('catalogue de tags unifié', () => {
	const service = createServiceRoleClient();
	let teacher: SupabaseClient<Database>;
	let student: SupabaseClient<Database>;
	let tagId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacherProfile = await TestData.profile().withRole('teacher').create();
		const studentProfile = await TestData.profile().withRole('student').create();

		await loose(service).from('resource_tags').delete().eq('resource_id', RESOURCE_ID);
		await loose(service).from('tags').delete().in('name', TAG_NAMES);

		const { error } = await loose(service).from('tags').insert({ name: TAG_NAMES[0] });
		expect(error).toBeNull();

		const { data } = await loose(service)
			.from('tags')
			.select('id, name, slug')
			.eq('name', TAG_NAMES[0]);
		// Une assertion explicite plutôt qu'un `?.` qui jetterait un TypeError :
		// un test qui plante au lieu d'échouer ne dit pas ce qui ne va pas.
		expect(data).toHaveLength(1);
		tagId = (data![0] as { id: string }).id;

		teacher = await clientFor(teacherProfile.email);
		student = await clientFor(studentProfile.email);
	});

	afterAll(async () => {
		await loose(service).from('resource_tags').delete().eq('resource_id', RESOURCE_ID);
		await loose(service).from('tags').delete().in('name', TAG_NAMES);
		await cleanupAllTestData();
	});

	it('normalise le nom en slug : sans accent, minuscules, kebab', async () => {
		const { data } = await loose(service)
			.from('tags')
			.select('name, slug')
			.eq('name', TAG_NAMES[0]);

		expect(data).toHaveLength(1);
		expect((data![0] as { slug: string }).slug).toBe('algebre-lineaire-zz');
	});

	it('écrase les espaces multiples plutôt que de les garder', async () => {
		const { error } = await loose(service).from('tags').insert({ name: TAG_NAMES[2] });
		expect(error).toBeNull();

		const { data } = await loose(service).from('tags').select('slug').eq('name', TAG_NAMES[2]);
		expect(data).toHaveLength(1);
		expect((data![0] as { slug: string }).slug).toBe('suites-numeriques-zz');
	});

	it('REFUSE un doublon qui ne diffère que par les accents ou la casse', async () => {
		// C'est LE point de la migration : « algebre » ne doit pas coexister avec
		// « Algèbre ». Sans l'index unique sur le slug, cet insert passerait.
		const { error } = await loose(service).from('tags').insert({ name: TAG_NAMES[1] });

		expect(error).not.toBeNull();
		expect(error?.message).toMatch(/duplicate key|unique/i);
	});

	it('un prof peut étiqueter une ressource', async () => {
		const { error } = await loose(teacher).from('resource_tags').insert({
			resource_kind: 'exercise',
			resource_id: RESOURCE_ID,
			tag_id: tagId
		});

		expect(error).toBeNull();
	});

	it('un élève lit les étiquettes', async () => {
		const { data, error } = await loose(student)
			.from('resource_tags')
			.select('resource_id')
			.eq('resource_id', RESOURCE_ID);

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('un élève ne peut PAS étiqueter une ressource', async () => {
		const { error } = await loose(student).from('resource_tags').insert({
			resource_kind: 'exercise',
			resource_id: RESOURCE_ID,
			tag_id: tagId
		});

		expect(error).not.toBeNull();
	});

	it('refuse un type de ressource inconnu', async () => {
		const { error } = await loose(teacher).from('resource_tags').insert({
			resource_kind: 'licorne',
			resource_id: RESOURCE_ID,
			tag_id: tagId
		});

		expect(error).not.toBeNull();
		expect(error?.message).toMatch(/resource_tags_valid_kind|violates check/i);
	});
});

describe('translittération : les caractères qui décalent', () => {
	const service = createServiceRoleClient();

	afterAll(async () => {
		await loose(service).from('tags').delete().in('name', TAG_NAMES);
	});

	it('mappe ç, ù et à correctement — pas au rang suivant', async () => {
		const { error } = await loose(service).from('tags').insert({ name: TAG_NAMES[3] });
		expect(error).toBeNull();

		const { data } = await loose(service).from('tags').select('slug').eq('name', TAG_NAMES[3]);
		expect(data).toHaveLength(1);
		// Une table décalée d'un rang donnerait « leuon-ou-ua-coince-zz ».
		expect((data![0] as { slug: string }).slug).toBe('lecon-ou-ca-coince-zz');
	});

	it('reste insensible à la casse SUR les caractères accentués', async () => {
		// Le cas qui échappait au test d'origine : avec la table décalée,
		// « Leçon » et « LEÇON » donnaient deux slugs DIFFÉRENTS, donc deux lignes.
		const { error } = await loose(service).from('tags').insert({ name: TAG_NAMES[4] });

		expect(error).not.toBeNull();
		expect(error?.message).toMatch(/duplicate key|unique/i);
	});

	it('mappe ñ sur n', async () => {
		const { error } = await loose(service).from('tags').insert({ name: TAG_NAMES[5] });
		expect(error).toBeNull();

		const { data } = await loose(service).from('tags').select('slug').eq('name', TAG_NAMES[5]);
		expect(data).toHaveLength(1);
		expect((data![0] as { slug: string }).slug).toBe('manana-zz');
	});
});
