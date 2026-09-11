/**
 * La gidouille du signalement d'erreur (nécessite une base locale)
 * ================================================================
 *
 * Quand un élève signale une erreur dans l'énoncé d'un exercice et que le
 * professeur la corrige, l'élève reçoit une gidouille. Fonctionnalité bien
 * vivante : 79 attributions « Correction d'une erreur » en production entre
 * décembre 2025 et mai 2026.
 *
 * CE QUE CES TESTS PROTÈGENT. `update_student_bonus(p_student_id, p_class_id, …)`
 * exige que l'élève soit **membre actif de la classe passée** — sinon elle lève.
 * Le compteur `profiles.bonus`, lui, est unique par élève : la classe ne sert
 * qu'à l'autorisation et à la trace dans `bonus_history`.
 *
 * L'endpoint lisait `worksheet_assignments.class_id`, la colonne HISTORIQUE, qui
 * ne porte que la PREMIÈRE classe de l'affectation. Un élève appartenant à la
 * SECONDE voyait donc la fonction lever, l'erreur être avalée (« bonus is a
 * nice-to-have ») et sa gidouille disparaître en silence.
 *
 * Invisible tant qu'on ne distribue qu'à une classe à la fois.
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
import { PUT } from '../../src/routes/api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]/+server';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Le client service : SEULEMENT pour semer les données et vérifier le résultat. */
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

/**
 * Les `locals` d'une vraie requête du professeur.
 *
 * ⚠️ Le client est AUTHENTIFIÉ, pas `service_role`. Avec le client service,
 * `auth.uid()` vaut NULL : la garde d'autorisation de `update_student_bonus`
 * (`IF auth.uid() IS NOT NULL AND NOT (...)`) est alors sautée ENTIÈREMENT, et
 * la RLS ne s'applique à aucune des lectures de l'endpoint. Le test passerait
 * en prouvant un chemin que la production n'emprunte jamais.
 */
function buildLocals(user: User, client: SupabaseClient<Database>): App.Locals {
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table} : ${error.message}`);
	return (data as { id: string }).id;
}

describe('gidouille du signalement d’erreur', () => {
	let profId: string;
	let profClient: SupabaseClient<Database>;
	let eleveSecondeClasse: string;
	let worksheetId: string;
	let worksheetExerciseId: string;
	let assignmentId: string;
	let classePremiere: string;
	let classeSeconde: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const prof = await TestData.profile().withRole('teacher').create();
		profId = prof.id;
		profClient = await clientFor(prof.email);

		const c1 = await TestData.class().withName('1re A bonus ZZ').create();
		const c2 = await TestData.class().withName('1re B bonus ZZ').create();
		classePremiere = c1.id;
		classeSeconde = c2.id;

		// L'élève n'est membre QUE de la seconde classe — c'est tout le sujet.
		const eleve = await TestData.profile().withRole('student').create();
		eleveSecondeClasse = eleve.id;
		const { error: membreError } = await service
			.from('class_members')
			.insert({ class_id: classeSeconde, student_id: eleveSecondeClasse });
		expect(membreError).toBeNull();

		const exercise = (await TestData.exercise(profId).create()) as { id: string };

		worksheetId = await insert('worksheets', {
			title: 'Fiche à signalement',
			type: 'worksheet',
			status: 'published',
			created_by: profId
		});

		worksheetExerciseId = await insert('worksheet_exercises', {
			worksheet_id: worksheetId,
			exercise_id: exercise.id,
			position: 1
		});

		// L'affectation vise les DEUX classes. La colonne historique ne retient que
		// la première — celle dont l'élève n'est PAS membre.
		assignmentId = await insert('worksheet_assignments', {
			worksheet_id: worksheetId,
			status: 'active',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: profId
		});

		const { error: jonctionError } = await service.from('worksheet_assignment_classes').insert([
			{ assignment_id: assignmentId, class_id: classePremiere },
			{ assignment_id: assignmentId, class_id: classeSeconde }
		]);
		expect(jonctionError).toBeNull();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/** Un signalement en attente, par l'élève de la seconde classe. */
	async function signaler(): Promise<string> {
		return insert('worksheet_error_reports', {
			assignment_id: assignmentId,
			worksheet_exercise_id: worksheetExerciseId,
			student_id: eleveSecondeClasse,
			description: 'Le résultat annoncé est faux.',
			status: 'pending'
		});
	}

	/** Le professeur corrige le signalement, comme le fait sa page. */
	async function corriger(reportId: string) {
		return PUT({
			locals: buildLocals({ id: profId } as User, profClient),
			params: { id: worksheetId, assignmentId, reportId },
			request: new Request('http://localhost/x', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: 'fixed',
					response: 'Corrigé, merci.',
					statement_md: 'Énoncé corrigé'
				})
			})
		} as never);
	}

	async function gidouillesDe(studentId: string): Promise<number> {
		const { data, error } = await service
			.from('bonus_history')
			.select('id')
			.eq('student_id', studentId)
			.eq('reason', "Correction d'une erreur");
		if (error) throw new Error(error.message);
		return (data ?? []).length;
	}

	it('l’élève de la SECONDE classe reçoit bien sa gidouille', async () => {
		// Avec la lecture de la colonne historique, `update_student_bonus` lève
		// « Student is not an active member of class » — l'erreur est avalée, et la
		// gidouille disparaît sans que personne ne le sache.
		const reportId = await signaler();
		const avant = await gidouillesDe(eleveSecondeClasse);

		const response = await corriger(reportId);
		expect(response.status).toBe(200);

		expect(await gidouillesDe(eleveSecondeClasse)).toBe(avant + 1);
	});

	it('la gidouille est tracée dans la classe par laquelle l’élève est concerné', async () => {
		// Pas la première classe de l'affectation : celle dont il est membre.
		// `bonus_history` sert à savoir d'où vient chaque gidouille — y écrire une
		// classe étrangère à l'élève rendrait la trace fausse.
		const { data, error } = await service
			.from('bonus_history')
			.select('class_id')
			.eq('student_id', eleveSecondeClasse)
			.eq('reason', "Correction d'une erreur")
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		expect(error).toBeNull();
		expect((data as { class_id: string }).class_id).toBe(classeSeconde);
	});

	it('le compteur de l’élève a bien augmenté', async () => {
		// `profiles.bonus` est le compteur réel — unique par élève, toutes classes
		// confondues. Vérifier l'historique sans lui laisserait passer une trace
		// écrite sans crédit.
		const { data, error } = await service
			.from('profiles')
			.select('bonus')
			.eq('id', eleveSecondeClasse)
			.single();

		expect(error).toBeNull();
		expect((data as { bonus: number }).bonus).toBeGreaterThan(0);
	});
});
