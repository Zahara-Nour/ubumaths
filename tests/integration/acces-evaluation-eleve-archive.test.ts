/**
 * L'évaluation de la classe quittée (base locale requise)
 * =======================================================
 *
 * `GET /api/assessments/[id]` autorise un élève si une affectation le vise —
 * soit nommément, soit **par sa classe** :
 *
 *   .or(`student_id.eq.${user.id},class_id.in.(${await getStudentClassIds(…)})`)
 *
 * Depuis le 2026-09-13, retirer un élève d'une classe l'ARCHIVE : la ligne de
 * `class_members` reste. Sans filtre de statut, `getStudentClassIds` rendait
 * donc encore l'identifiant de la classe quittée, et l'ancien élève ouvrait
 * les évaluations de ses ex-camarades.
 *
 * ⚠️ Ce n'est pas un défaut d'affichage : c'est le contrôle d'accès de la
 * route. Et il échoue en silence — aucune erreur, juste un 200 de trop.
 *
 * ⚠️ La base, elle, dit toujours oui : la policy
 * « Students can view own assignments » et la fonction
 * `student_has_assignment_for_assessment()` lisent `class_members` sans
 * regarder `status`. Ce test garde la route ; fermer la policy est une
 * décision d'accès distincte, qui appartient à David.
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
import { GET as getAssessmentRoute } from '../../src/routes/api/assessments/[id]/+server';

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
	let assessmentId: string;
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

		// L'évaluation est PUBLIÉE : c'est la condition que la route vérifie en
		// plus de l'affectation.
		const { data: assessment, error: assessmentError } = await service
			.from('assessments')
			.insert({
				title: 'Contrôle sur les fractions ZZ',
				grade: '3',
				status: 'published',
				categories: [],
				settings: {},
				created_by: teacher.id
			})
			.select('id')
			.single();
		expect(assessmentError, 'le décor n’a pas pu être posé').toBeNull();
		assessmentId = assessment!.id;

		// Affectation À LA CLASSE — pas nominative. C'est tout l'enjeu : l'accès
		// est hérité de l'appartenance, et celle de l'archivé a expiré.
		const { error: assignmentError } = await service.from('assessment_assignments').insert({
			assessment_id: assessmentId,
			assigned_by: teacher.id,
			class_id: klass.id
		});
		expect(assignmentError, 'le décor n’a pas pu être posé').toBeNull();
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function statusFor(studentId: string, client: SupabaseClient<Database>): Promise<number> {
		try {
			const response = await getAssessmentRoute({
				locals: buildLocals(studentId, client),
				params: { id: assessmentId }
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

	/** ⚠️ LE cas. Avant le filtre de statut, il rendait 200. */
	it('l’élève archivé ne l’ouvre plus', async () => {
		expect(await statusFor(archivedStudentId, archivedStudent)).toBe(403);
	});
});
