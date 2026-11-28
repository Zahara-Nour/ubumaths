/**
 * Notions et fiche écrites d'un coup (L86)
 * ========================================
 *
 * Avant : trois requêtes, trois transactions (notions retirées, fiche mise à jour,
 * notions écrites) ; une coupure entre les deux dernières laissait une fiche sans
 * ses nouvelles notions. Maintenant : une fonction SQL aux droits de l'appelant
 * (`save_worksheet_classification`, décision de David du 2026-11-28 : accès
 * inchangé), une seule transaction.
 *
 * - une écriture qui échoue en route (ici une branche glissée dans les notions, que
 *   le trigger de la table refuse APRÈS le retrait des notions et la mise à jour de
 *   la fiche) : rien n'a changé ;
 * - un autre compte que l'auteur (ni admin) : refusé, rien n'a changé ; un élève à qui
 *   la fiche est donnée la lit, ses notions aussi, mais ne peut pas les retirer ;
 * - anonyme : la fonction n'est pas appelable.
 *
 * @vitest-environment node
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { applyClassification } from '#lib/server/worksheets/worksheet-classification.ts';
import type { Database } from '#lib/types/database.ts';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

const RUN = `Itest-notions-d-un-coup-${Date.now().toString(36)}`;

// ============================================================================
// VARIABLES
// ============================================================================

let teacherId: string;
let teacherClient: SupabaseClient<Database>;
let studentClient: SupabaseClient<Database>;
let studentId: string;
let branchId: string;
let suitesId: string;
let derivationId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function sql(query: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
	const pg = await getPostgresClient();
	return (await pg.query(query, params)).rows;
}

async function signedIn(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function node(kind: string, parentId: string | null, name: string): Promise<string> {
	const [{ id }] = await sql(
		`insert into public.classification_nodes (kind, parent_id, name) values ($1, $2, $3) returning id`,
		[kind, parentId, name]
	);
	return id as string;
}

/** Une fiche d'exercices du prof, en Révisions, avec deux notions */
async function worksheet(): Promise<string> {
	const [{ id }] = await sql(
		`insert into public.worksheets (title, type, status, created_by, category, custom_title)
		 values ($1, 'worksheet', 'draft', $2, 'review', true) returning id`,
		[RUN, teacherId]
	);
	for (const [position, nodeId] of [suitesId, derivationId].entries()) {
		await sql(
			`insert into public.worksheet_classifications (worksheet_id, node_id, position)
			 values ($1, $2, $3)`,
			[id, nodeId, position]
		);
	}
	return id as string;
}

/** La fiche relue en superutilisateur */
async function stored(id: string) {
	const [row] = await sql('select title, category from public.worksheets where id = $1', [id]);
	const notions = await sql(
		`select node_id from public.worksheet_classifications where worksheet_id = $1 order by position`,
		[id]
	);
	return { ...row, notions: notions.map((n) => n.node_id) };
}

// ============================================================================
// SUITE
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	const teacher = await TestData.profile().withRole('teacher').create();
	teacherId = teacher.id;
	teacherClient = await signedIn(teacher.email);
	const student = await TestData.profile().withRole('student').create();
	studentId = student.id;
	studentClient = await signedIn(student.email);

	branchId = await node('branch', null, `${RUN} branche`);
	suitesId = await node('notion', branchId, `${RUN} Suites`);
	derivationId = await node('notion', branchId, `${RUN} Dérivation`);
});

afterAll(async () => {
	await sql('delete from public.worksheets where title like $1', [`${RUN}%`]).catch(
		() => undefined
	);
	await sql(`delete from public.classification_nodes where name like $1 and kind <> 'branch'`, [
		`${RUN}%`
	]).catch(() => undefined);
	await sql('delete from public.classification_nodes where name like $1', [`${RUN}%`]).catch(
		() => undefined
	);
});

describe('save_worksheet_classification — tout ou rien', () => {
	it('le prof : notions retirées, fiche mise à jour, notions écrites, la fiche rendue', async () => {
		const id = await worksheet();
		const updated = await applyClassification(
			teacherClient,
			id,
			{ ok: true, update: {}, notions: [derivationId], current: [suitesId, derivationId] },
			{ category: 'applications', title: `${RUN} Applications` }
		);
		expect(updated).toMatchObject({ id, category: 'applications' });
		expect(await stored(id)).toEqual({
			title: `${RUN} Applications`,
			category: 'applications',
			notions: [derivationId]
		});
	});

	it('une écriture refusée en route (une branche parmi les notions) : rien n’a changé', async () => {
		const id = await worksheet();
		await expect(
			applyClassification(
				teacherClient,
				id,
				// La branche passe le retrait et la mise à jour, puis le trigger la refuse
				{ ok: true, update: {}, notions: [suitesId, branchId], current: [suitesId, derivationId] },
				{ category: 'applications', title: `${RUN} Autre titre` }
			)
		).rejects.toThrow();
		expect(await stored(id)).toEqual({
			title: RUN,
			category: 'review',
			notions: [suitesId, derivationId]
		});
	});

	it('un autre compte que l’auteur : refusé, rien n’a changé', async () => {
		const id = await worksheet();
		const { error } = await studentClient.rpc('save_worksheet_classification', {
			p_worksheet_id: id,
			p_fields: { category: 'applications' },
			p_notions: [suitesId]
		});
		expect(error).not.toBeNull();
		expect(await stored(id)).toEqual({
			title: RUN,
			category: 'review',
			notions: [suitesId, derivationId]
		});
	});

	it('un élève qui LIT la fiche (donnée) sans pouvoir l’écrire : retrait refusé, rien n’a changé', async () => {
		const id = await worksheet();
		await sql(`update public.worksheets set status = 'published' where id = $1`, [id]);
		const [{ id: assignmentId }] = await sql(
			`insert into public.worksheet_assignments (worksheet_id, status, created_by)
			 values ($1, 'active', $2) returning id`,
			[id, teacherId]
		);
		await sql(
			`insert into public.worksheet_assignment_students (assignment_id, student_id) values ($1, $2)`,
			[assignmentId, studentId]
		);
		// Prémisse : l'élève voit la fiche et ses notions (sinon le test ne prouverait rien)
		const { data: vues } = await studentClient
			.from('worksheet_classifications')
			.select('node_id')
			.eq('worksheet_id', id);
		expect(vues).toHaveLength(2);

		// Fiche inchangée, notions vidées : seul le contrôle du retrait peut refuser
		const { error } = await studentClient.rpc('save_worksheet_classification', {
			p_worksheet_id: id,
			p_fields: {},
			p_notions: []
		});
		expect(error?.code).toBe('42501');
		expect((await stored(id)).notions).toEqual([suitesId, derivationId]);
	});

	it('anonyme : la fonction n’est pas appelable', async () => {
		const id = await worksheet();
		const anon = createClient<Database>(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
		const { error } = await anon.rpc('save_worksheet_classification', {
			p_worksheet_id: id,
			p_fields: {},
			p_notions: []
		});
		expect(error?.code).toBe('42501');
		expect((await stored(id)).notions).toEqual([suitesId, derivationId]);
	});
});
