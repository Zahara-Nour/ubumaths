/**
 * Titre d'un exercice en anglais : exercises.translations — base locale requise
 * ============================================================================
 *
 * Le titre est une colonne ; sa traduction vit dans `exercises.translations`
 * ({"en": {"title": …}}), sur le modèle des fiches et des sections.
 *
 * Accès (question posée à David le 2026-11-25, réponse : « je te suis ») :
 * PERSONNE ne gagne d'accès. La colonne suit les droits de la ligne : qui lit
 * l'exercice lit son titre anglais ; seul l'auteur l'écrit, par la policy
 * d'UPDATE existante — vérifié ici avec de vrais clients authentifiés.
 *
 * La RLS échoue en SILENCE : une UPDATE refusée rend zéro ligne, sans erreur.
 * D'où `.select()` sur chaque écriture, et la relecture par le service.
 *
 * Doit échouer sans la migration 20261125055853 (colonne absente).
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
import type { Database } from '#lib/types/database.ts';

type LocalClient = SupabaseClient<Database>;

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service : décor et relecture seulement, jamais pour une assertion d'accès. */
const service: LocalClient = createClient<Database>(
	SUPABASE_URL,
	TEST_SERVICE_ROLE_KEY,
	clientOptions
);

async function clientFor(email: string): Promise<LocalClient> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, clientOptions);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

/** Relecture par le service : ce que la base contient vraiment. */
async function storedTranslations(exerciseId: string) {
	const { data, error } = await service
		.from('exercises')
		.select('translations')
		.eq('id', exerciseId)
		.single();
	if (error) throw new Error(`relecture impossible : ${error.message}`);
	return data.translations;
}

describe('exercises.translations — titre en anglais', () => {
	let teacherId: string;
	let teacher: LocalClient;
	let student: LocalClient;

	/** Un exercice du prof, créé par le prof lui-même (policy d'INSERT réelle). */
	async function teacherExercise(
		translations: Database['public']['Tables']['exercises']['Insert']['translations']
	) {
		const { data, error } = await teacher
			.from('exercises')
			.insert({
				created_by: teacherId,
				category: 'application',
				title: 'Calculer avec les formules',
				translations,
				is_public: true
			})
			.select('id, translations')
			.single();
		if (error) throw new Error(`création impossible : ${error.message}`);
		return data;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		const teacherProfile = await TestData.profile().withRole('teacher').create();
		const studentProfile = await TestData.profile().withRole('student').create();
		teacherId = teacherProfile.id;
		teacher = await clientFor(teacherProfile.email);
		student = await clientFor(studentProfile.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('un exercice existant n’a pas de traduction (NULL = français seulement)', async () => {
		const { id } = await teacherExercise(null);
		expect(await storedTranslations(id)).toBeNull();
	});

	it('l’auteur enregistre le titre anglais et le relit', async () => {
		const created = await teacherExercise({ en: { title: 'Using formulas' } });
		expect(created.translations).toEqual({ en: { title: 'Using formulas' } });

		const { data, error } = await teacher
			.from('exercises')
			.update({ translations: { en: { title: 'Formulas' } } })
			.eq('id', created.id)
			.select('id, translations');
		expect(error).toBeNull();
		expect(data).toEqual([{ id: created.id, translations: { en: { title: 'Formulas' } } }]);
		expect(await storedTranslations(created.id)).toEqual({ en: { title: 'Formulas' } });
	});

	it('l’auteur efface le titre anglais (null)', async () => {
		const created = await teacherExercise({ en: { title: 'Using formulas' } });
		const { data } = await teacher
			.from('exercises')
			.update({ translations: null })
			.eq('id', created.id)
			.select('id');
		expect(data).toHaveLength(1);
		expect(await storedTranslations(created.id)).toBeNull();
	});

	it('un élève ne peut pas changer le titre anglais (zéro ligne, rien ne bouge)', async () => {
		const created = await teacherExercise({ en: { title: 'Using formulas' } });
		const { data } = await student
			.from('exercises')
			.update({ translations: { en: { title: 'Hacked' } } })
			.eq('id', created.id)
			.select('id');
		expect(data ?? []).toHaveLength(0);
		expect(await storedTranslations(created.id)).toEqual({ en: { title: 'Using formulas' } });
	});
});
