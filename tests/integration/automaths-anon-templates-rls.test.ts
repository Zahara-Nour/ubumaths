/**
 * RLS — lecture anonyme des templates publiés (nécessite une base locale)
 * =======================================================================
 *
 * `/automaths`, `/automaths/test` et `/automaths/panier` sont des pages
 * publiques : un visiteur sans compte doit pouvoir parcourir les questions
 * publiées. Elles renvoyaient 500 en production, parce que les trois policies
 * de `question_templates` s'appliquaient au rôle PUBLIC et faisaient toutes un
 * `EXISTS (SELECT 1 FROM profiles ...)`. Or `anon` n'a pas de SELECT sur
 * `profiles` — l'évaluation de la policy levait « permission denied for table
 * profiles » et la requête échouait au lieu de renvoyer une liste vide.
 *
 * Migration : 20260908090000_automaths_anon_read_published_templates.sql
 *
 * ⚠️ Ces tests portent précisément sur le cas `auth.uid()` NULL, donc le piège
 * habituel du smoke-test ne s'applique pas ici : c'est bien un client anon réel
 * qui interroge PostgREST, pas un appel privilégié. Chaque assertion vérifie
 * une valeur, jamais l'absence d'erreur seule.
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

/** Un client anon sans session — exactement ce dont dispose un inconnu. */
function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

/** Un client porteur de la session d'un compte réel (rôle `authenticated`). */
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

const PUBLISHED_ID = '0a11f0e0-0000-4000-8000-00000000a001';
const DRAFT_ID = '0a11f0e0-0000-4000-8000-00000000a002';

function template(id: string, status: 'published' | 'draft') {
	return {
		id,
		type: 'fill_in_blanks',
		title: `RLS anon — ${status}`,
		theme: 'Test',
		domain: 'RLS',
		level: 1,
		grades: ['6'],
		status,
		// La contrainte `variations_minimum_one` exige au moins une variation.
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	};
}

describe('RLS — /automaths, lecture anonyme des templates', () => {
	const service = createServiceRoleClient();
	let teacherEmail: string;
	let studentEmail: string;
	let adminEmail: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		teacherEmail = (await TestData.profile().withRole('teacher').create()).email;
		studentEmail = (await TestData.profile().withRole('student').create()).email;
		adminEmail = (await TestData.profile().withRole('admin').create()).email;

		await service.from('question_templates').delete().in('id', [PUBLISHED_ID, DRAFT_ID]);

		const { error } = await service
			.from('question_templates')
			// @ts-expect-error - fixture minimale : les colonnes non listées ont un défaut
			.insert([template(PUBLISHED_ID, 'published'), template(DRAFT_ID, 'draft')]);

		expect(error).toBeNull();
	});

	afterAll(async () => {
		await service.from('question_templates').delete().in('id', [PUBLISHED_ID, DRAFT_ID]);
		await cleanupAllTestData();
	});

	it('un visiteur anonyme lit les templates publiés', async () => {
		const { data, error } = await anonClient()
			.from('question_templates')
			.select('id, title, status')
			.eq('id', PUBLISHED_ID);

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data?.[0].status).toBe('published');
	});

	it('un visiteur anonyme ne voit pas les brouillons', async () => {
		const { data, error } = await anonClient()
			.from('question_templates')
			.select('id')
			.eq('id', DRAFT_ID);

		// Pas d'erreur, mais aucune ligne : c'est la RLS qui filtre, pas un échec.
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('la requête de la page /automaths aboutit sans erreur', async () => {
		// Le filtre que les trois loaders émettent UNE FOIS la PR #127 mergée.
		// Sur `main` ils interrogent encore `is_published`, colonne inexistante :
		// PostgREST rejette alors la requête en 400 avant toute évaluation RLS,
		// et cette migration seule ne réparerait donc pas la page.
		// Les deux doivent partir ensemble.
		const { data, error } = await anonClient()
			.from('question_templates')
			.select('*')
			.eq('status', 'published');

		// C'est cette requête qui levait « permission denied for table profiles ».
		expect(error).toBeNull();
		expect(Array.isArray(data)).toBe(true);
		expect(data?.some((t) => t.id === PUBLISHED_ID)).toBe(true);
		expect(data?.every((t) => t.status === 'published')).toBe(true);
	});

	it('anon ne peut toujours pas lire profiles (invariant C2, audit 2026-08)', async () => {
		const { data, error } = await anonClient().from('profiles').select('id').limit(1);

		// L'ouverture des templates ne doit rien avoir relâché sur les PII.
		expect(data ?? []).toEqual([]);
		expect(error).not.toBeNull();
		expect(error?.code).toBe('42501');
	});

	it('anon ne peut pas atteindre profiles par jointure depuis created_by', async () => {
		// Chemin d'exfiltration le plus plausible : PostgREST sait suivre la clé
		// étrangère created_by → profiles. La table étant désormais lisible en
		// anonyme, cet embed doit rester fermé.
		const { data, error } = await anonClient()
			.from('question_templates')
			// @ts-expect-error - embed volontairement hors typage
			.select('id, profiles(*)')
			.eq('status', 'published');

		expect(data ?? []).toEqual([]);
		expect(error).not.toBeNull();
	});

	it('anon ne peut pas créer de template', async () => {
		const { error } = await anonClient()
			.from('question_templates')
			// @ts-expect-error - fixture minimale
			.insert(template('0a11f0e0-0000-4000-8000-00000000a003', 'published'));

		expect(error).not.toBeNull();
	});

	it('anon ne peut pas modifier un template publié', async () => {
		await anonClient()
			.from('question_templates')
			// @ts-expect-error - mise à jour partielle
			.update({ title: 'compromis' })
			.eq('id', PUBLISHED_ID);

		const { data } = await service
			.from('question_templates')
			.select('title')
			.eq('id', PUBLISHED_ID)
			.single();

		expect(data?.title).toBe('RLS anon — published');
	});

	it('un professeur lit toujours les brouillons', async () => {
		// La migration a restreint les policies existantes TO authenticated :
		// elle ne doit rien retirer aux comptes connectés.
		const { data, error } = await (await clientFor(teacherEmail))
			.from('question_templates')
			.select('id, status')
			.eq('id', DRAFT_ID);

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('un élève lit les publiés mais pas les brouillons', async () => {
		const student = await clientFor(studentEmail);

		const publie = await student.from('question_templates').select('id').eq('id', PUBLISHED_ID);
		expect(publie.error).toBeNull();
		expect(publie.data).toHaveLength(1);

		const brouillon = await student.from('question_templates').select('id').eq('id', DRAFT_ID);
		expect(brouillon.error).toBeNull();
		expect(brouillon.data).toEqual([]);
	});

	it('un administrateur peut toujours modifier un template', async () => {
		const { error } = await (
			await clientFor(adminEmail)
		)
			.from('question_templates')
			// @ts-expect-error - mise à jour partielle
			.update({ description: 'modifié par admin' })
			.eq('id', PUBLISHED_ID);

		expect(error).toBeNull();

		const { data } = await service
			.from('question_templates')
			.select('description')
			.eq('id', PUBLISHED_ID)
			.single();
		expect(data?.description).toBe('modifié par admin');
	});

	it('anon ne peut pas supprimer un template publié', async () => {
		await anonClient().from('question_templates').delete().eq('id', PUBLISHED_ID);

		const { count } = await service
			.from('question_templates')
			.select('id', { count: 'exact', head: true })
			.eq('id', PUBLISHED_ID);

		expect(count).toBe(1);
	});
});
