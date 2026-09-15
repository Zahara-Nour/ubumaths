/**
 * Une fiche réservée à certains élèves l'est vraiment (base locale requise)
 * ========================================================================
 *
 * Quand un partage désigne des destinataires, la policy de `shared_coursework`
 * réserve la fiche à ceux-là :
 *
 *     not exists (select 1 from shared_coursework_students where …)
 *     or exists (… and scs.student_id = auth.uid())
 *
 * ⚠️ Le `not exists` était évalué SOUS LA RLS de `shared_coursework_students`,
 * dont la seule policy élève est `using (student_id = auth.uid())`. Un élève ne
 * voyait donc jamais les lignes de restriction des AUTRES : pour une fiche
 * réservée à ses camarades, la sous-requête rendait zéro ligne, le `not exists`
 * valait **true**, et la fiche lui était lisible.
 *
 * La restriction ne restreignait personne d'autre que celui qu'on avait nommé.
 *
 * ⚠️ Ce test a besoin de DEUX élèves actifs de la même classe : avec un seul, le
 * défaut est invisible, puisque c'est le destinataire lui-même.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

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

describe('une fiche partagée réservée à des élèves nommés', () => {
	let partageId: string;
	let partageOuvertId: string;
	let destinataire: SupabaseClient<Database>;
	let camarade: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		const klass = await TestData.class().withName('6e E fiches ZZ').create();

		const eleveActif = async () => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: klass.id, student_id: profil.id, status: 'active' });
			expect(error, 'le décor n’a pas pu être posé').toBeNull();
			return { id: profil.id, client: await clientFor(profil.email) };
		};

		const a = await eleveActif();
		destinataire = a.client;
		const b = await eleveActif();
		camarade = b.client;

		// Le décor Google Classroom minimal qu'exigent les clés étrangères.
		const { data: cours, error: coursError } = await service
			.from('google_classroom_courses')
			.insert({ teacher_id: teacher.id, google_course_id: 'gc-zz-1', name: 'Cours ZZ' })
			.select('id')
			.single();
		expect(coursError, 'le décor n’a pas pu être posé').toBeNull();

		const devoir = async (ref: string) => {
			const { data, error } = await service
				.from('google_classroom_coursework')
				.insert({
					google_course_id: cours!.id,
					google_coursework_id: ref,
					title: `Devoir ${ref}`,
					coursework_type: 'ASSIGNMENT',
					state: 'PUBLISHED',
					created_time: new Date().toISOString(),
					updated_time: new Date().toISOString()
				})
				.select('id')
				.single();
			expect(error, 'le décor n’a pas pu être posé').toBeNull();
			return data!.id;
		};

		const partage = async (courseworkId: string) => {
			const { data, error } = await service
				.from('shared_coursework')
				.insert({
					coursework_id: courseworkId,
					class_id: klass.id,
					shared_by: teacher.id,
					visible: true
				})
				.select('id')
				.single();
			expect(error, 'le décor n’a pas pu être posé').toBeNull();
			return data!.id;
		};

		// LA fiche restreinte : réservée au seul destinataire.
		partageId = await partage(await devoir('zz-restreint'));
		const { error: restrictionError } = await service
			.from('shared_coursework_students')
			.insert({ shared_coursework_id: partageId, student_id: a.id });
		expect(restrictionError, 'le décor n’a pas pu être posé').toBeNull();

		// Le témoin : une fiche SANS destinataire nommé, donc pour toute la classe.
		partageOuvertId = await partage(await devoir('zz-ouvert'));
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function voit(client: SupabaseClient<Database>, id: string): Promise<boolean> {
		const { data, error } = await client.from('shared_coursework').select('id').eq('id', id);
		expect(error, 'lecture en panne').toBeNull();
		return (data ?? []).length === 1;
	}

	it('le destinataire nommé la voit', async () => {
		expect(await voit(destinataire, partageId)).toBe(true);
	});

	/** ⚠️ LE cas. Avant la correction, il la voyait aussi. */
	it('son camarade de classe, lui, ne la voit pas', async () => {
		expect(
			await voit(camarade, partageId),
			'la restriction ne restreint personne : elle ne voit que sa propre ligne'
		).toBe(false);
	});

	/**
	 * Le TÉMOIN, et il compte : sans lui, un correctif qui fermerait TOUTES les
	 * fiches partagées passerait pour une réussite.
	 */
	it('mais il voit bien celle qui n’est réservée à personne', async () => {
		expect(await voit(camarade, partageOuvertId)).toBe(true);
		expect(await voit(destinataire, partageOuvertId)).toBe(true);
	});
});
