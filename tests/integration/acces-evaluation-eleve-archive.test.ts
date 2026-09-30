/**
 * L'évaluation de la classe quittée (base locale requise)
 * =======================================================
 *
 * `POST /api/evaluations/assignments/[id]/start` (chantier 4 ; ex-`GET
 * /api/assessments/[id]`) ouvre une évaluation à un élève si une affectation le
 * vise — soit nommément, soit **par sa classe**, dont il doit être membre ACTIF
 * (`isAssignmentRecipient`).
 *
 * Depuis le 2026-09-13, retirer un élève d'une classe l'ARCHIVE : la ligne de
 * `class_members` reste. Sans filtre de statut, `getStudentClassIds` rendait
 * donc encore l'identifiant de la classe quittée, et l'ancien élève ouvrait
 * les évaluations de ses ex-camarades.
 *
 * ⚠️ Ce n'est pas un défaut d'affichage : c'est le contrôle d'accès de la
 * route. Et il échoue en silence — aucune erreur, juste un 200 de trop.
 *
 * Les policies de `evaluation_assignments` (20260930130000) exigent aussi un
 * membre ACTIF : la route et la base refusent toutes deux. Ce test garde la
 * route, au cas où l'une des deux se relâcherait.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';
import { POST as startEvaluationRoute } from '../../src/routes/api/evaluations/assignments/[id]/start/+server';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Client service-role : pose le décor uniquement. */
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

function buildLocals(userId: string, client: SupabaseClient<Database>): App.Locals {
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: userId } as User }),
		user: { id: userId } as User,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

describe('un élève archivé et l’évaluation de son ancienne classe', () => {
	let assignmentId: string;
	let activeStudentId: string;
	let activeStudent: SupabaseClient<Database>;
	let archivedStudentId: string;
	let archivedStudent: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		const klass = await TestData.class().withName('3e B évaluation ZZ').create();

		const member = async (status: string) => {
			const profile = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: klass.id, student_id: profile.id, status });
			expect(error, 'le décor n’a pas pu être posé').toBeNull();
			return { id: profile.id, client: await clientFor(profile.email) };
		};

		const active = await member('active');
		activeStudentId = active.id;
		activeStudent = active.client;

		const archived = await member('archived');
		archivedStudentId = archived.id;
		archivedStudent = archived.client;

		// L'évaluation est PUBLIÉE : c'est la condition que la base vérifie en
		// plus de l'affectation.
		const { data: series, error: seriesError } = await service
			.from('series')
			.insert({
				title: 'Contrôle sur les fractions ZZ',
				grade: '3',
				categories: [
					{
						category: { theme: 'Fractions', domain: 'Nombres', subdomain: null, level: 1 },
						quantity: 1,
						delay: 20
					}
				],
				created_by: teacher.id
			})
			.select('id')
			.single();
		expect(seriesError, 'le décor n’a pas pu être posé').toBeNull();
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
		expect(evaluationError, 'le décor n’a pas pu être posé').toBeNull();

		// Affectation À LA CLASSE — pas nominative. C'est tout l'enjeu : l'accès
		// est hérité de l'appartenance, et celle de l'archivé a expiré.
		const { data: assignment, error: assignmentError } = await service
			.from('evaluation_assignments')
			.insert({
				evaluation_id: evaluation!.id,
				assigned_by: teacher.id,
				class_id: klass.id
			})
			.select('id')
			.single();
		expect(assignmentError, 'le décor n’a pas pu être posé').toBeNull();
		assignmentId = assignment!.id;
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function statusFor(studentId: string, client: SupabaseClient<Database>): Promise<number> {
		try {
			const response = await startEvaluationRoute({
				locals: buildLocals(studentId, client),
				params: { id: assignmentId }
			} as never);
			return response.status;
		} catch (thrown) {
			// `error(403, …)` de SvelteKit n'étend pas Error : on lit son `status`.
			const httpError = thrown as { status?: number };
			if (typeof httpError.status === 'number') return httpError.status;
			throw thrown;
		}
	}

	/**
	 * Le TÉMOIN. Sans lui, un 403 côté archivé ne prouverait rien : il pourrait
	 * venir d'un décor incomplet ou de la RLS, et non du filtre de statut.
	 */
	it('l’élève actif de la classe ouvre l’évaluation', async () => {
		expect(await statusFor(activeStudentId, activeStudent)).toBe(200);
	});

	/**
	 * ⚠️ LE cas. Avant le filtre de statut, il rendait 200.
	 *
	 * Deux refus possibles, et c'est voulu :
	 * - **403** quand seule la route filtre (`isAssignmentRecipient`) ;
	 * - **404** quand la base filtre aussi (policy de `evaluation_assignments`,
	 *   membre ACTIF) — l'assignation devient invisible. Ne pas révéler
	 *   l'existence est ici le meilleur refus.
	 *
	 * Ce qui est gardé, c'est qu'il n'obtient PAS 200. Figer l'un des deux codes
	 * ferait rougir ce test au prochain resserrement, sans qu'aucun accès n'ait
	 * changé.
	 */
	it('l’élève archivé ne l’ouvre plus', async () => {
		const status = await statusFor(archivedStudentId, archivedStudent);
		expect([403, 404], `refus attendu, obtenu ${status}`).toContain(status);
	});
});
