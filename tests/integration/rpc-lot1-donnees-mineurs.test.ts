/**
 * RPC lot 1 : un élève ne lit plus rien du compte d'un autre (base locale requise)
 * ================================================================================
 *
 * Migration `20261003130000_rpc_lot1_donnees_mineurs.sql`. Des fonctions
 * SECURITY DEFINER exécutables par `authenticated` prenaient un identifiant en
 * paramètre sans regarder QUI appelait : un élève connecté lisait par simple
 * appel RPC les conversations, les exercices, le solde ou les amis d'un autre
 * élève, et la recherche d'amis traversait les écoles.
 *
 * Décisions de David (Q143, Q144) : un élève ne lit plus rien du compte d'un
 * autre ; prof et admin gardent ce que leurs écrans font ; la recherche d'amis
 * s'arrête à l'école, et jamais à une classe fermée.
 *
 * Décor : deux écoles, même niveau (« 2 », la seconde) des deux côtés.
 *   école 1 : classe active (A, B), classe FERMÉE de même niveau (D)
 *   école 2 : classe active de même niveau (C)
 *
 * Chaque refus est accompagné d'un TÉMOIN : l'usage légitime doit continuer de
 * marcher, sinon un garde trop large passerait pour une réussite.
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

/** Code Postgres d'un refus (garde `RAISE … 42501` ou EXECUTE retiré). */
const REFUS = '42501';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

/** Appel RPC non typé : certaines fonctions ne figurent pas dans `database.ts`. */
async function rpc(
	client: SupabaseClient<Database>,
	name: string,
	args: Record<string, unknown> = {}
): Promise<RpcResult> {
	return (await client.rpc(name as never, args as never)) as unknown as RpcResult;
}

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

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

function ids(data: unknown): string[] {
	return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

describe('RPC lot 1 : données des élèves mineurs', () => {
	let prof: SupabaseClient<Database>;
	let eleveA: SupabaseClient<Database>;
	let profId: string;
	let aId: string;
	let bId: string;
	let cId: string;
	let dId: string;
	let ecole1: string;
	let ecole2: string;
	let classe1: string;
	let classeFermee: string;
	let classe2: string;
	let conversationBC: string;
	let exerciceB: string;
	let affectationB: string;
	let competenceId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const p = await TestData.profile().withRole('teacher').create();
		profId = p.id;

		ecole1 = await insert('schools', {
			name: 'Lycée RPC lot 1 — un',
			city: 'Testville',
			country: 'France'
		});
		ecole2 = await insert('schools', {
			name: 'Lycée RPC lot 1 — deux',
			city: 'Testville',
			country: 'France'
		});

		const eleve = async (ecole: string) => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('profiles')
				.update({ school_id: ecole })
				.eq('id', profil.id);
			expect(error).toBeNull();
			return profil;
		};

		const a = await eleve(ecole1);
		aId = a.id;
		bId = (await eleve(ecole1)).id;
		dId = (await eleve(ecole1)).id;
		cId = (await eleve(ecole2)).id;
		await service.from('profiles').update({ school_id: ecole1 }).eq('id', profId);

		const classe = (nom: string, ecole: string, actif: boolean) =>
			insert('classes', {
				name: nom,
				join_code: `L1${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
				school_id: ecole,
				grade: '2',
				is_active: actif
			});
		classe1 = await classe('RPC1 2nde A (école 1)', ecole1, true);
		classeFermee = await classe('RPC1 2nde Z fermée (école 1)', ecole1, false);
		classe2 = await classe('RPC1 2nde B (école 2)', ecole2, true);

		for (const [classId, studentId] of [
			[classe1, aId],
			[classe1, bId],
			[classeFermee, dId],
			[classe2, cId]
		]) {
			await insert('class_members', { class_id: classId, student_id: studentId, status: 'active' });
		}

		// Une conversation privée entre B et C, dont A ne fait pas partie.
		conversationBC = await insert('conversations', {
			name: 'RPC1 conversation privée B-C',
			is_group: false,
			created_by: bId
		});
		await insert('conversation_participants', { conversation_id: conversationBC, user_id: bId });
		await insert('conversation_participants', { conversation_id: conversationBC, user_id: cId });

		// Un exercice affecté au SEUL élève B.
		exerciceB = (await TestData.exercise(profId).create()).id;
		affectationB = await insert('exercise_assignments', {
			exercise_id: exerciceB,
			assigned_by: profId,
			assigned_to_type: 'student',
			student_id: bId
		});

		const { data: comp, error: compError } = await service
			.from('math_competences' as never)
			.select('id')
			.limit(1)
			.single();
		expect(compError).toBeNull();
		competenceId = (comp as { id: string }).id;

		prof = await clientFor(p.email);
		eleveA = await clientFor(a.email);
	}, 120_000);

	afterAll(async () => {
		await service.from('conversations').delete().eq('id', conversationBC);
		await cleanupAllTestData();
	});

	// ===========================================================================
	// F1 — get_user_conversations
	// ===========================================================================

	it('F1 : A ne lit pas les conversations de B', async () => {
		const { data, error } = await rpc(eleveA, 'get_user_conversations', { p_user_id: bId });
		expect(error?.code, `conversations de B rendues : ${JSON.stringify(data)}`).toBe(REFUS);
	});

	it('F1 témoin : A lit les siennes, avec ou sans paramètre', async () => {
		const avec = await rpc(eleveA, 'get_user_conversations', { p_user_id: aId });
		expect(avec.error).toBeNull();
		const sans = await rpc(eleveA, 'get_user_conversations');
		expect(sans.error).toBeNull();
	});

	// ===========================================================================
	// F2 — get_conversation_participants (aucun appelant : EXECUTE retiré)
	// ===========================================================================

	it('F2 : A ne liste pas les participants d’une conversation qui n’est pas la sienne', async () => {
		const { data, error } = await rpc(eleveA, 'get_conversation_participants', {
			p_conversation_id: conversationBC
		});
		expect(error?.code, `participants rendus : ${JSON.stringify(data)}`).toBe(REFUS);
	});

	// ===========================================================================
	// F3 — get_teacher_classes_with_data
	// ===========================================================================

	it('F3 : un élève ne lit pas les classes du professeur', async () => {
		const { data, error } = await rpc(eleveA, 'get_teacher_classes_with_data', {
			p_is_test_mode: false
		});
		expect(error?.code, `classes rendues à un élève : ${JSON.stringify(data)}`).toBe(REFUS);
	});

	it('F3 témoin : le professeur lit ses classes', async () => {
		const { data, error } = await rpc(prof, 'get_teacher_classes_with_data', {
			p_is_test_mode: false
		});
		expect(error).toBeNull();
		expect(ids(data)).toContain(classe1);
	});

	// ===========================================================================
	// F4 — get_student_exercises
	// ===========================================================================

	it('F4 : A ne lit pas les exercices de B', async () => {
		const { data, error } = await rpc(eleveA, 'get_student_exercises', { p_student_id: bId });
		expect(error?.code, `exercices de B rendus : ${JSON.stringify(data)}`).toBe(REFUS);
	});

	it('F4 témoin : A lit les siens (sans l’exercice de B)', async () => {
		const { data, error } = await rpc(eleveA, 'get_student_exercises', { p_student_id: aId });
		expect(error).toBeNull();
		const exos = ((data ?? []) as { exercise_id: string }[]).map((r) => r.exercise_id);
		expect(exos).not.toContain(exerciceB);
	});

	it('F4 témoin : le professeur lit les exercices de B', async () => {
		const { data, error } = await rpc(prof, 'get_student_exercises', { p_student_id: bId });
		expect(error).toBeNull();
		const exos = ((data ?? []) as { exercise_id: string }[]).map((r) => r.exercise_id);
		expect(exos).toContain(exerciceB);
	});

	it('F4 témoin : un appel service reste possible', async () => {
		const { error } = await rpc(service, 'get_student_exercises', { p_student_id: bId });
		expect(error).toBeNull();
	});

	// ===========================================================================
	// F5 — compute_*_level (EXECUTE retiré) et statistiques de complétion
	// ===========================================================================

	it.each([
		'compute_calculer_level',
		'compute_chercher_level',
		'compute_communiquer_level',
		'compute_competence_level',
		'compute_modeliser_level',
		'compute_raisonner_level',
		'compute_representer_level'
	])('F5 : A ne calcule pas le niveau de B (%s)', async (fn) => {
		const { data, error } = await rpc(eleveA, fn, {
			p_student_id: bId,
			p_math_competence_id: competenceId
		});
		expect(error?.code, `${fn} a répondu : ${JSON.stringify(data)}`).toBe(REFUS);
	});

	it('F5 : un élève ne lit pas les statistiques d’un exercice', async () => {
		const { data, error } = await rpc(eleveA, 'get_exercise_completion_stats', {
			p_exercise_id: exerciceB
		});
		expect(error?.code, `stats rendues : ${JSON.stringify(data)}`).toBe(REFUS);
	});

	it('F5 : un élève ne lit pas les statistiques d’une affectation', async () => {
		const { data, error } = await rpc(eleveA, 'get_assignment_completion_stats', {
			p_assignment_id: affectationB
		});
		expect(error?.code, `stats rendues : ${JSON.stringify(data)}`).toBe(REFUS);
	});

	it('F5 témoin : le professeur lit les deux statistiques', async () => {
		const ex = await rpc(prof, 'get_exercise_completion_stats', { p_exercise_id: exerciceB });
		expect(ex.error).toBeNull();
		expect((ex.data as { total_students: number }[])[0].total_students).toBe(1);

		const aff = await rpc(prof, 'get_assignment_completion_stats', {
			p_assignment_id: affectationB
		});
		expect(aff.error).toBeNull();
		expect((aff.data as { total_target_students: number }[])[0].total_target_students).toBe(1);
	});

	// ===========================================================================
	// F6 — fonctions sans appelant : EXECUTE retiré
	// ===========================================================================

	it.each([
		['get_friend_ids', () => ({ p_user_id: bId })],
		['check_gidouilles_balance', () => ({ p_user_id: bId, p_required_amount: 1 })],
		['get_shop_items', () => ({ p_student_id: bId })],
		[
			'get_shop_item_detail',
			() => ({ p_student_id: bId, p_template_id: '00000000-0000-0000-0000-000000000000' })
		]
	] as const)('F6 : A n’appelle pas %s sur B', async (fn, args) => {
		const { data, error } = await rpc(eleveA, fn, args());
		expect(error?.code, `${fn} a répondu : ${JSON.stringify(data)}`).toBe(REFUS);
	});

	// ===========================================================================
	// Q144 — recherche d'amis : l'école est la frontière, jamais une classe fermée
	// ===========================================================================

	it('Q144 : A ne voit pas la classe de même niveau de l’autre école', async () => {
		const { data, error } = await rpc(eleveA, 'get_classes_by_user_grade');
		expect(error).toBeNull();
		expect(ids(data)).not.toContain(classe2);
		expect(ids(data)).not.toContain(classeFermee);
	});

	it('Q144 témoin : A voit toujours sa classe', async () => {
		const { data, error } = await rpc(eleveA, 'get_classes_by_user_grade');
		expect(error).toBeNull();
		expect(ids(data)).toContain(classe1);
	});

	it('Q144 : A ne voit pas les élèves d’une classe de l’autre école', async () => {
		const { data, error } = await rpc(eleveA, 'get_students_in_class_by_grade', {
			target_class_id: classe2
		});
		expect(error).toBeNull();
		expect(ids(data), 'un élève d’une autre école a été rendu').not.toContain(cId);
	});

	it('Q144 : A ne voit pas les élèves d’une classe fermée de son école', async () => {
		const { data, error } = await rpc(eleveA, 'get_students_in_class_by_grade', {
			target_class_id: classeFermee
		});
		expect(error).toBeNull();
		expect(ids(data), 'un élève d’une classe fermée a été rendu').not.toContain(dId);
	});

	it('Q144 témoin : A voit ses camarades de même niveau de son école', async () => {
		const { data, error } = await rpc(eleveA, 'get_students_in_class_by_grade', {
			target_class_id: classe1
		});
		expect(error).toBeNull();
		expect(ids(data)).toContain(bId);
	});
});
