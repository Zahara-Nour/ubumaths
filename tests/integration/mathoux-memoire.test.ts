/**
 * Mémoire des Mathoux : `student_mathoux` (migration 20261017090200)
 * ===================================================================
 *
 * Question d'accès tranchée par David le 2026-10-18
 * (docs/wip/mathoux-conception.md § 9, « Changement d'année et oubli ») :
 *   - l'élève LIT ses propres lignes, pas celles d'un autre élève ;
 *   - le prof (mono-prof : `is_my_student`) et l'admin lisent celles de tous ;
 *   - le visiteur non connecté ne lit rien ;
 *   - personne n'écrit au client connecté : seul le serveur (client service).
 *
 * Vrais clients authentifiés, vraie RLS. La RLS échoue en SILENCE
 * (docs/pratiques/rls-echecs-silencieux.md) : chaque refus d'écriture est
 * prouvé par le code 42501 ET par la valeur relue hors RLS.
 *
 * Sieste (migration 20261021200000, question d'accès tranchée par David le 2026-10-21 :
 * personne ne lit rien de neuf) : `asleep`, faux par défaut, lue comme le reste de la ligne,
 * écrite par le serveur seul.
 *
 * Contraintes : stade borné à chaton / matou / grand_matou ; étoiles = niveaux
 * valides, 20 au plus. Effacement RGPD : supprimer le compte de l'élève supprime
 * ses lignes. Une notion portée par un Mathou ne se supprime pas (RESTRICT).
 *
 * Client non typé : la table n'existe dans `database.ts` qu'après `db:types`.
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
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// Types
type MathouRow = {
	student_id: string;
	notion_id: string;
	best_stage: string;
	starred_grades: string[];
	asleep: boolean;
	first_seen_at: string;
	updated_at: string;
};

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
const TABLE = 'student_mathoux';
const PERMISSION_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const FK_VIOLATION = '23503';
const TAG = `zz-mathoux-${crypto.randomUUID().slice(0, 8)}`;

// Variables
let service: SupabaseClient;
let anon: SupabaseClient;
let studentAId: string;
let studentBId: string;
let studentAClient: SupabaseClient;
let studentBClient: SupabaseClient;
let teacherClient: SupabaseClient;
let adminClient: SupabaseClient;
let notionId: string;

// Functions
async function signedIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function seedNode(kind: 'branch' | 'notion', name: string, parentId: string | null) {
	const { data, error } = await service
		.from('classification_nodes')
		.insert({ kind, name, parent_id: parentId })
		.select('id')
		.single<{ id: string }>();
	if (error || !data) throw new Error(`décor : nœud « ${name} » refusé : ${error?.message}`);
	return data.id;
}

/** La ligne relue HORS RLS. */
async function rowOf(studentId: string): Promise<MathouRow | null> {
	const { data, error } = await service
		.from(TABLE)
		.select('*')
		.eq('student_id', studentId)
		.eq('notion_id', notionId)
		.maybeSingle<MathouRow>();
	if (error) throw new Error(`relecture ${TABLE} : ${error.message}`);
	return data;
}

async function readIds(client: SupabaseClient): Promise<string[]> {
	const { data, error } = await client
		.from(TABLE)
		.select('student_id')
		.eq('notion_id', notionId)
		.returns<{ student_id: string }[]>();
	if (error) throw new Error(`lecture ${TABLE} : ${error.message}`);
	return (data ?? []).map((r) => r.student_id).sort();
}

// Tests
describe('Mémoire des Mathoux (student_mathoux)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		service = createClient(SUPABASE_URL, TEST_SERVICE_ROLE_KEY, CLIENT_OPTIONS);
		anon = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);

		const admin = await TestData.profile().withRole('admin').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		studentAId = studentA.id;
		studentBId = studentB.id;
		adminClient = await signedIn(admin.email);
		teacherClient = await signedIn(teacher.email);
		studentAClient = await signedIn(studentA.email);
		studentBClient = await signedIn(studentB.email);

		const branchId = await seedNode('branch', `${TAG} branche`, null);
		notionId = await seedNode('notion', `${TAG} notion`, branchId);

		// `defaultToNull: false` : sans lui, PostgREST envoie NULL pour la clé absente de la
		// ligne A (union des clés du lot) au lieu du défaut '{}' — et NOT NULL refuse.
		const { error } = await service.from(TABLE).insert(
			[
				{ student_id: studentAId, notion_id: notionId, best_stage: 'chaton' },
				{ student_id: studentBId, notion_id: notionId, best_stage: 'matou', starred_grades: ['5'] }
			],
			{ defaultToNull: false }
		);
		if (error) throw new Error(`décor ${TABLE} : ${error.message}`);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		// Ordre imposé par la clé en RESTRICT : les Mathoux, puis la notion, puis la branche.
		await pg
			.query(
				`delete from public.student_mathoux where notion_id in
					(select id from public.classification_nodes where name like $1)`,
				[`${TAG}%`]
			)
			.catch(() => undefined);
		for (const kind of ['notion', 'branch']) {
			await pg
				.query('delete from public.classification_nodes where kind = $1 and name like $2', [
					kind,
					`${TAG}%`
				])
				.catch(() => undefined);
		}
		await cleanupAllTestData();
	});

	describe('lecture', () => {
		it("l'élève A lit sa ligne et pas celle de B", async () => {
			expect(await readIds(studentAClient)).toEqual([studentAId]);
			const { data, error } = await studentAClient
				.from(TABLE)
				.select('student_id')
				.eq('student_id', studentBId);
			expect(error).toBeNull();
			expect(data).toEqual([]);
		});

		it("l'élève B lit la sienne seulement", async () => {
			expect(await readIds(studentBClient)).toEqual([studentBId]);
		});

		it('le prof lit les lignes des deux élèves', async () => {
			expect(await readIds(teacherClient)).toEqual([studentAId, studentBId].sort());
		});

		it("l'admin lit les lignes des deux élèves", async () => {
			expect(await readIds(adminClient)).toEqual([studentAId, studentBId].sort());
		});

		it('le visiteur non connecté est refusé (aucun droit, 42501)', async () => {
			const { data, error } = await anon.from(TABLE).select('student_id');
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(data).toBeNull();
		});
	});

	describe("écritures de l'élève : toutes refusées", () => {
		it("A ne crée pas de ligne (42501), rien n'apparaît en base", async () => {
			const pg = await getPostgresClient();
			const otherBranch = await seedNode('branch', `${TAG} branche 2`, null);
			const otherNotion = await seedNode('notion', `${TAG} notion 2`, otherBranch);
			const { error } = await studentAClient
				.from(TABLE)
				.insert({ student_id: studentAId, notion_id: otherNotion, best_stage: 'grand_matou' });
			expect(error?.code).toBe(PERMISSION_DENIED);
			const { rows } = await pg.query(
				'select 1 from public.student_mathoux where student_id = $1 and notion_id = $2',
				[studentAId, otherNotion]
			);
			expect(rows).toHaveLength(0);
		});

		it('A ne se promeut pas grand matou (42501), la valeur reste chaton', async () => {
			const { data, error } = await studentAClient
				.from(TABLE)
				.update({ best_stage: 'grand_matou', starred_grades: ['T_SPE'] })
				.eq('student_id', studentAId)
				.select();
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(data).toBeNull();
			const row = await rowOf(studentAId);
			expect(row?.best_stage).toBe('chaton');
			expect(row?.starred_grades).toEqual([]);
		});

		it('A ne supprime pas sa ligne (42501), elle reste en base', async () => {
			const { error } = await studentAClient
				.from(TABLE)
				.delete()
				.eq('student_id', studentAId)
				.select();
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(await rowOf(studentAId)).not.toBeNull();
		});

		it('le prof ne modifie pas non plus une ligne (42501)', async () => {
			const { error } = await teacherClient
				.from(TABLE)
				.update({ best_stage: 'grand_matou' })
				.eq('student_id', studentBId)
				.select();
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect((await rowOf(studentBId))?.best_stage).toBe('matou');
		});
	});

	describe('écritures du serveur (client service)', () => {
		it('le service fait grandir le Mathou et ajoute une étoile ; updated_at avance', async () => {
			const before = await rowOf(studentAId);
			const { data, error } = await service
				.from(TABLE)
				.update({ best_stage: 'grand_matou', starred_grades: ['5', '4'] })
				.eq('student_id', studentAId)
				.eq('notion_id', notionId)
				.select();
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			const after = await rowOf(studentAId);
			expect(after?.best_stage).toBe('grand_matou');
			expect(after?.starred_grades).toEqual(['5', '4']);
			expect(after?.first_seen_at).toBe(before?.first_seen_at);
			expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
				new Date(before!.updated_at).getTime()
			);
		});

		it("le stade 'tigre' est refusé (23514)", async () => {
			const { error } = await service
				.from(TABLE)
				.update({ best_stage: 'tigre' })
				.eq('student_id', studentAId);
			expect(error?.code).toBe(CHECK_VIOLATION);
		});

		it('une étoile sur un niveau inconnu est refusée (23514)', async () => {
			const { error } = await service
				.from(TABLE)
				.update({ starred_grades: ['5', 'CE3'] })
				.eq('student_id', studentAId);
			expect(error?.code).toBe(CHECK_VIOLATION);
		});

		it('une étoile vide (NULL) est refusée (23514)', async () => {
			const { error } = await service
				.from(TABLE)
				.update({ starred_grades: ['5', null] as unknown as string[] })
				.eq('student_id', studentAId);
			expect(error?.code).toBe(CHECK_VIOLATION);
		});

		it('plus de 20 étoiles sont refusées (23514)', async () => {
			const { error } = await service
				.from(TABLE)
				.update({ starred_grades: Array.from({ length: 21 }, () => '5') })
				.eq('student_id', studentAId);
			expect(error?.code).toBe(CHECK_VIOLATION);
		});

		it('une notion qui porte des Mathoux ne se supprime pas (23503)', async () => {
			const { error } = await service.from('classification_nodes').delete().eq('id', notionId);
			expect(error?.code).toBe(FK_VIOLATION);
		});
	});

	describe('sieste (asleep)', () => {
		it('une ligne écrite sans elle est éveillée (défaut faux)', async () => {
			expect((await rowOf(studentBId))?.asleep).toBe(false);
		});

		it('l’élève lit sa sieste, le prof celle de ses élèves', async () => {
			const own = await studentBClient.from(TABLE).select('asleep').eq('student_id', studentBId);
			expect(own.error).toBeNull();
			expect(own.data).toEqual([{ asleep: false }]);
			const prof = await teacherClient.from(TABLE).select('asleep').eq('student_id', studentBId);
			expect(prof.error).toBeNull();
			expect(prof.data).toEqual([{ asleep: false }]);
		});

		it('l’élève ne s’endort ni ne se réveille lui-même (42501), la valeur reste', async () => {
			const { data, error } = await studentBClient
				.from(TABLE)
				.update({ asleep: true })
				.eq('student_id', studentBId)
				.select();
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(data).toBeNull();
			expect((await rowOf(studentBId))?.asleep).toBe(false);
		});

		it('le serveur l’endort puis le réveille', async () => {
			for (const asleep of [true, false]) {
				const { data, error } = await service
					.from(TABLE)
					.update({ asleep })
					.eq('student_id', studentBId)
					.eq('notion_id', notionId)
					.select('asleep');
				expect(error).toBeNull();
				expect(data).toEqual([{ asleep }]);
			}
		});

		it('jamais vide (NOT NULL, 23502)', async () => {
			const { error } = await service
				.from(TABLE)
				.update({ asleep: null })
				.eq('student_id', studentBId);
			expect(error?.code).toBe('23502');
		});
	});

	describe('effacement RGPD', () => {
		it('supprimer le compte de A supprime ses lignes, pas celles de B', async () => {
			expect(await rowOf(studentAId)).not.toBeNull();
			const { error } = await service.auth.admin.deleteUser(studentAId);
			expect(error).toBeNull();
			expect(await rowOf(studentAId)).toBeNull();
			expect(await rowOf(studentBId)).not.toBeNull();
		});
	});
});
