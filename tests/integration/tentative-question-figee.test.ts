/**
 * Question figée au démarrage d'une tentative (chantier 5, Q42) — intégration
 * ==========================================================================
 *
 * Migration `20260930170000_tentative_question_figee.sql` : colonne
 * `evaluation_attempt_questions.instance` (jsonb), l'instance complète générée
 * par le serveur (énoncé, cases, RÉPONSES ATTENDUES, correction, choix mélangés).
 * Question d'accès tranchée par David : AUCUN accès nouveau — service_role seul,
 * comme le reste de la table (D18). Lecture client = ERREUR 42501, pas zéro ligne.
 *
 * DOIVENT échouer sans la migration. `pnpm db:start` puis
 * `pnpm test:integration tests/integration/tentative-question-figee.test.ts`.
 *
 * La colonne n'est pas encore dans `database.ts` (généré depuis la prod) :
 * clients non typés.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// Types
type Person = { id: string; client: SupabaseClient };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CATEGORIES = [{ category: 'entiers/1', quantity: 2, delay: 20 }];
const TEMPLATE_ID = '0a11f0e0-0000-4000-8000-00000000e502';
const ATTEMPTS = 'evaluation_attempt_questions';
/** Borne de la migration : 256 Kio de texte JSON. */
const MAX_INSTANCE_BYTES = 262_144;
/** Forme d'une instance réelle : l'objet que la reprise et la correction relisent. */
const INSTANCE = {
	statement: 'Combien font $$2+2$$ ? ____',
	blanks: [{ expectedAnswer: '4' }],
	correction: '$$2+2=4$$',
	choices: ['5', '4', '3'],
	seed: 123456
};

// Variables
const service = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
/** Propriétaire de la tentative. */
let student: Person;
let sessionId: string;

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

async function person(role: 'student' | 'teacher'): Promise<Person> {
	const profile = await TestData.profile().withRole(role).create();
	return { id: profile.id, client: await signIn(profile.email) };
}

/** Écrit, par le service, la question `position` avec l'instance donnée. */
async function insertQuestion(position: number, instance: unknown) {
	return service.from(ATTEMPTS).insert({
		test_session_id: sessionId,
		position,
		template_id: TEMPLATE_ID,
		seed: 42,
		delay_seconds: 20,
		category_key: 'entiers/1',
		instance
	});
}

/** Nombre de lignes à cette position (relu par le service : la RLS échoue en silence). */
async function countAt(position: number): Promise<number> {
	const { data, error } = await service
		.from(ATTEMPTS)
		.select('position')
		.eq('test_session_id', sessionId)
		.eq('position', position);
	expect(error).toBeNull();
	return data?.length ?? 0;
}

describe('question figée au démarrage (20260930170000)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		teacher = await person('teacher');
		student = await person('student');

		const k1 = await TestData.class().withName('6e A figée ZZ').create();
		const { error: memberError } = await service
			.from('class_members')
			.insert({ class_id: k1.id, student_id: student.id, status: 'active' });
		expect(memberError, 'décor : inscription').toBeNull();

		await service.from('question_templates').delete().eq('id', TEMPLATE_ID);
		const { error: templateError } = await service.from('question_templates').insert({
			id: TEMPLATE_ID,
			type: 'fill_in_blanks',
			title: 'Figée ZZ',
			theme: 'Test',
			domain: 'Figée',
			level: 1,
			grades: ['6'],
			status: 'draft',
			variations: [{ statement: 'Combien font $$2+2$$ ? ____', blanks: [{ expectedAnswer: '4' }] }]
		});
		expect(templateError, 'décor : modèle').toBeNull();

		const { data: series, error: seriesError } = await service
			.from('series')
			.insert({
				title: 'Série figée ZZ',
				grade: '6',
				categories: CATEGORIES,
				created_by: teacher.id
			})
			.select('id')
			.single();
		expect(seriesError, 'décor : série').toBeNull();
		const { data: evaluation, error: evaluationError } = await service
			.from('evaluations')
			.insert({
				series_id: series!.id,
				form: 'interactive',
				status: 'published',
				created_by: teacher.id
			})
			.select('id')
			.single();
		expect(evaluationError, 'décor : évaluation').toBeNull();
		const { error: assignError } = await service.from('evaluation_assignments').insert({
			evaluation_id: evaluation!.id,
			assigned_by: teacher.id,
			student_id: student.id
		});
		expect(assignError, 'décor : assignation').toBeNull();

		// Démarrage par le serveur : séance, puis question 0 figée
		const { data: session, error: sessionError } = await service
			.from('test_sessions')
			.insert({
				user_id: student.id,
				mode: 'interactive',
				categories: CATEGORIES,
				total_questions: 2,
				evaluation_id: evaluation!.id
			})
			.select('id')
			.single();
		expect(sessionError, 'décor : séance d’évaluation').toBeNull();
		sessionId = session!.id;
	}, 180_000);

	afterAll(async () => {
		await cleanupAllTestData();
		await service.from('question_templates').delete().eq('id', TEMPLATE_ID);
	});

	describe('service_role écrit et relit l’instance', () => {
		it('l’instance relue est l’objet écrit', async () => {
			const { error } = await insertQuestion(0, INSTANCE);
			expect(error).toBeNull();
			const { data, error: readError } = await service
				.from(ATTEMPTS)
				.select('instance')
				.eq('test_session_id', sessionId)
				.eq('position', 0)
				.single();
			expect(readError).toBeNull();
			// Comparaison d'objet, pas de texte : jsonb réordonne les clés
			expect(data!.instance).toEqual(INSTANCE);
		});

		it('une ligne sans instance reste acceptée (tentative antérieure, témoin)', async () => {
			const { error } = await insertQuestion(1, null);
			expect(error).toBeNull();
			expect(await countAt(1)).toBe(1);
		});
	});

	describe('aucun accès nouveau : lecture client = erreur de droits', () => {
		it('élève propriétaire et prof : 42501 sur la colonne', async () => {
			for (const who of [student, teacher]) {
				const { data, error } = await who.client
					.from(ATTEMPTS)
					.select('instance')
					.eq('test_session_id', sessionId);
				expect(error?.code).toBe('42501');
				expect(data).toBeNull();
			}
		});

		it('anon : 42501 sur la colonne', async () => {
			const { data, error } = await anon.from(ATTEMPTS).select('instance');
			expect(error?.code).toBe('42501');
			expect(data).toBeNull();
		});

		it('has_column_privilege : ni lecture ni écriture pour anon / authenticated ; aucun GRANT de colonne', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ role: string; privilege: string; granted: boolean }>(
				`select r.role, p.privilege,
				        has_column_privilege(r.role, 'public.evaluation_attempt_questions', 'instance', p.privilege) as granted
				   from unnest(array['anon', 'authenticated']) as r(role)
				  cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) as p(privilege)`
			);
			expect(rows).toHaveLength(8);
			expect(rows.filter((row) => row.granted)).toEqual([]);

			const { rows: acl } = await pg.query<{ attacl: string | null }>(
				`select attacl::text from pg_attribute
				  where attrelid = 'public.evaluation_attempt_questions'::regclass
				    and attname = 'instance'`
			);
			expect(acl).toEqual([{ attacl: null }]);
		});

		it('service_role garde la lecture (témoin : la colonne existe)', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ granted: boolean }>(
				`select has_column_privilege('service_role', 'public.evaluation_attempt_questions', 'instance', 'SELECT') as granted`
			);
			expect(rows).toEqual([{ granted: true }]);
		});

		it('l’élève n’écrit pas d’instance par le client : 42501, rien d’écrit', async () => {
			const { error } = await student.client.from(ATTEMPTS).insert({
				test_session_id: sessionId,
				position: 9,
				template_id: TEMPLATE_ID,
				seed: 1,
				delay_seconds: 20,
				category_key: 'entiers/1',
				instance: INSTANCE
			});
			expect(error?.code).toBe('42501');
			expect(await countAt(9)).toBe(0);
		});
	});

	describe('contraintes (même le service est refusé)', () => {
		const shapes: Array<[string, unknown]> = [
			['un tableau', [1, 2, 3]],
			['un nombre', 42],
			['une chaîne', 'énoncé'],
			['un booléen', true]
		];
		for (const [label, instance] of shapes) {
			it(`instance = ${label} → refusée (23514), rien d’écrit`, async () => {
				const { error } = await insertQuestion(2, instance);
				expect(error?.code).toBe('23514');
				expect(await countAt(2)).toBe(0);
			});
		}

		it('instance au-delà de 256 Kio → refusée (23514), rien d’écrit', async () => {
			const { error } = await insertQuestion(3, { statement: 'x'.repeat(MAX_INSTANCE_BYTES) });
			expect(error?.code).toBe('23514');
			expect(await countAt(3)).toBe(0);
		});

		it('instance de 200 Kio → acceptée (témoin sous la borne)', async () => {
			const { error } = await insertQuestion(4, { statement: 'x'.repeat(200_000) });
			expect(error).toBeNull();
			expect(await countAt(4)).toBe(1);
		});
	});
});
