/**
 * « Afficher sur Google » : exercises.search_indexed — base locale requise
 * =======================================================================
 *
 * Un exercice public n'apparaît sur Google (sitemap, pas de balise noindex)
 * que si son auteur coche une case distincte. La colonne vaut `false` par
 * défaut, et la base refuse qu'un exercice privé soit affiché sur Google
 * (contrainte `exercises_search_indexed_requires_public`, code 23514).
 *
 * Accès (question tranchée par David) : PERSONNE ne gagne d'accès. Un exercice
 * public est déjà lisible par qui a son lien ; la colonne suit les droits de la
 * ligne. Seul l'auteur (prof) peut la modifier, par la policy d'UPDATE
 * existante — vérifié ici avec de vrais clients authentifiés : un admin, un
 * élève et un visiteur non connecté n'y touchent pas. (Un second prof : le
 * modèle mono-professeur interdit d'en créer un, la base le refuse.)
 *
 * La RLS échoue en SILENCE : une UPDATE refusée rend zéro ligne, sans erreur.
 * D'où `.select()` sur chaque écriture, et la relecture par le service.
 *
 * Doit échouer sans la migration 20261016100000 (colonne absente).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	TEST_SERVICE_ROLE_KEY
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';
import { fetchIndexedExercises } from '$lib/server/sitemap-exercises';

type LocalClient = SupabaseClient<Database>;

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CHECK_VIOLATION = '23514';

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service : décor et relecture seulement, jamais pour une assertion d'accès. */
const service: LocalClient = createClient<Database>(
	SUPABASE_URL,
	TEST_SERVICE_ROLE_KEY,
	clientOptions
);

/** Visiteur non connecté. */
function anonClient(): LocalClient {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, clientOptions);
}

async function clientFor(email: string): Promise<LocalClient> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

/** Relecture par le service : ce que la base contient vraiment. */
async function stored(exerciseId: string) {
	const { data, error } = await service
		.from('exercises')
		.select('is_public, search_indexed')
		.eq('id', exerciseId)
		.single();
	if (error) throw new Error(`relecture impossible : ${error.message}`);
	return data;
}

describe('exercises.search_indexed — « Afficher sur Google »', () => {
	let teacherId: string;
	let teacher: LocalClient;
	let admin: LocalClient;
	let student: LocalClient;

	/** Crée un exercice du prof, par le prof lui-même (policy d'INSERT réelle). */
	async function teacherExercise(isPublic: boolean): Promise<string> {
		const { data, error } = await teacher
			.from('exercises')
			.insert({
				created_by: teacherId,
				category: 'automatisme',
				title: 'Google ZZ',
				variations: [{ label: 'default', statement_md: 'Q ?', solution_md: 'R' }],
				is_public: isPublic
			})
			.select('id')
			.single();
		if (error) throw new Error(`création impossible : ${error.message}`);
		return data.id;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		const teacherProfile = await TestData.profile().withRole('teacher').create();
		const adminProfile = await TestData.profile().withRole('admin').create();
		const studentProfile = await TestData.profile().withRole('student').create();
		teacherId = teacherProfile.id;
		teacher = await clientFor(teacherProfile.email);
		admin = await clientFor(adminProfile.email);
		student = await clientFor(studentProfile.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('un nouvel exercice n’est pas affiché sur Google par défaut', async () => {
		const id = await teacherExercise(true);
		expect(await stored(id)).toEqual({ is_public: true, search_indexed: false });
	});

	it('l’auteur peut afficher sur Google un exercice public', async () => {
		const id = await teacherExercise(true);
		const { data, error } = await teacher
			.from('exercises')
			.update({ search_indexed: true })
			.eq('id', id)
			.select('id, search_indexed');
		expect(error).toBeNull();
		expect(data).toEqual([{ id, search_indexed: true }]);
		expect(await stored(id)).toEqual({ is_public: true, search_indexed: true });
	});

	it('un exercice privé ne peut pas être affiché sur Google', async () => {
		const id = await teacherExercise(false);
		const { data, error } = await teacher
			.from('exercises')
			.update({ search_indexed: true })
			.eq('id', id)
			.select('id');
		expect(error?.code).toBe(CHECK_VIOLATION);
		expect(data).toBeNull();
		expect(await stored(id)).toEqual({ is_public: false, search_indexed: false });
	});

	it('un exercice ne peut pas naître privé et affiché sur Google', async () => {
		const { error } = await teacher.from('exercises').insert({
			created_by: teacherId,
			category: 'automatisme',
			variations: [{ label: 'default', statement_md: 'Q ?', solution_md: 'R' }],
			is_public: false,
			search_indexed: true
		});
		expect(error?.code).toBe(CHECK_VIOLATION);
	});

	it('dépublier sans décocher Google est refusé ; décocher dans la même mise à jour passe', async () => {
		const id = await teacherExercise(true);
		const { error: setError } = await teacher
			.from('exercises')
			.update({ search_indexed: true })
			.eq('id', id)
			.select('id');
		expect(setError).toBeNull();

		const refused = await teacher
			.from('exercises')
			.update({ is_public: false })
			.eq('id', id)
			.select('id');
		expect(refused.error?.code).toBe(CHECK_VIOLATION);
		expect(await stored(id)).toEqual({ is_public: true, search_indexed: true });

		const accepted = await teacher
			.from('exercises')
			.update({ is_public: false, search_indexed: false })
			.eq('id', id)
			.select('id, is_public, search_indexed');
		expect(accepted.error).toBeNull();
		expect(accepted.data).toEqual([{ id, is_public: false, search_indexed: false }]);
		expect(await stored(id)).toEqual({ is_public: false, search_indexed: false });
	});

	describe('personne d’autre que l’auteur ne modifie la case', () => {
		const others: { label: string; client: () => LocalClient }[] = [
			{ label: 'un admin', client: () => admin },
			{ label: 'un élève', client: () => student },
			{ label: 'un visiteur non connecté', client: anonClient }
		];

		for (const other of others) {
			it(`${other.label} ne coche pas « Afficher sur Google » sur l’exercice public du prof`, async () => {
				const id = await teacherExercise(true);
				const { data, error } = await other
					.client()
					.from('exercises')
					.update({ search_indexed: true })
					.eq('id', id)
					.select('id');
				// Refus silencieux de la RLS : zéro ligne, pas d'erreur.
				expect(error).toBeNull();
				expect(data).toEqual([]);
				expect(await stored(id)).toEqual({ is_public: true, search_indexed: false });
			});

			it(`${other.label} ne décoche pas « Afficher sur Google » sur l’exercice du prof`, async () => {
				const id = await teacherExercise(true);
				await teacher.from('exercises').update({ search_indexed: true }).eq('id', id);
				expect(await stored(id)).toEqual({ is_public: true, search_indexed: true });

				const { data, error } = await other
					.client()
					.from('exercises')
					.update({ search_indexed: false })
					.eq('id', id)
					.select('id');
				expect(error).toBeNull();
				expect(data).toEqual([]);
				expect(await stored(id)).toEqual({ is_public: true, search_indexed: true });
			});
		}
	});

	it('le plan du site (lecture anonyme) liste les exercices cochés, et eux seuls', async () => {
		const indexed = await teacherExercise(true);
		const { data: written, error } = await teacher
			.from('exercises')
			.update({ search_indexed: true })
			.eq('id', indexed)
			.select('id');
		expect(error).toBeNull();
		expect(written).toHaveLength(1);
		const publicOnly = await teacherExercise(true);
		const privateOne = await teacherExercise(false);

		const { data: slugs } = await service
			.from('exercises')
			.select('id, slug')
			.in('id', [indexed, publicOnly, privateOne]);
		const pathOf = (id: string) => {
			const row = slugs?.find((r) => r.id === id);
			return `/exercice/${encodeURIComponent(row?.slug ?? id)}`;
		};

		const paths = (await fetchIndexedExercises(anonClient())).map((e) => e.path);
		expect(paths).toContain(pathOf(indexed));
		expect(paths).not.toContain(pathOf(publicOnly));
		expect(paths).not.toContain(pathOf(privateOne));
	});
});
