/**
 * Suppression de compte (RGPD art. 17) de bout en bout
 * =====================================================
 *
 * Rejoue les deux appels de base de `/api/account/delete`, dans l'ordre de la route :
 *   1. `delete_user_account(p_user_id)` (client de service) ;
 *   2. `auth.admin.deleteUser(userId)` (cascade sur `profiles`).
 *
 * Constat A1 (docs/wip/rgpd-securite-constats.md), mesuré en prod le 2026-10-10 :
 * la fonction du baseline écrit dans des tables disparues (`shop_purchase_history`,
 * `item_usage_log`…) et passe à NULL des colonnes `NOT NULL` → l'étape 1 échoue pour
 * tout le monde, la route rend 500. Et même réparée, l'étape 2 échouait pour un élève
 * ayant des `exercise_completions` (clé étrangère sans `ON DELETE`).
 *
 * Ce que le fichier prouve :
 *   1. l'étape 1 réussit pour un élève qui a joué, gagné des gidouilles et écrit ;
 *   2. l'étape 2 réussit ensuite : plus de compte, plus de profil ;
 *   3. plus AUCUNE ligne ne porte l'identifiant de l'élève (quelle que soit la table) ;
 *   4. ses messages disparaissent pour tous, aperçu de conversation compris (décision
 *      de David du 2026-10-10 : effacer le texte, pas seulement l'auteur) ;
 *   5. un compte prof ou admin est refusé sans effet (décision du 2026-10-10 : en
 *      mono-prof, sa cascade emporterait le travail de tous les élèves) ;
 *   6. une identité NULL est refusée.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// ============================================================================
// CONSTANTES
// ============================================================================

const service = createServiceRoleClient();

/** Texte reconnaissable écrit par l'élève dans une conversation. */
const TEXTE_ELEVE = 'zz-texte-de-l-eleve-a-effacer';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Toutes les colonnes `uuid` de `public` qui pointent (clé étrangère) vers
 * `profiles` ou `auth.users` : là où l'identifiant d'un élève peut survivre.
 */
async function colonnesQuiPortentUnCompte(): Promise<{ tbl: string; col: string }[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ tbl: string; col: string }>(`
		select c.conrelid::regclass::text as tbl, a.attname as col
		from pg_constraint c
		join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
		where c.contype = 'f'
		  and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
		  and c.connamespace = 'public'::regnamespace
	`);
	return rows;
}

/** Les tables où l'identifiant apparaît encore, avec le nombre de lignes. */
async function tracesRestantes(userId: string): Promise<Record<string, number>> {
	const pg = await getPostgresClient();
	const restes: Record<string, number> = {};
	for (const { tbl, col } of await colonnesQuiPortentUnCompte()) {
		const { rows } = await pg.query<{ n: number }>(
			`select count(*)::int as n from ${tbl} where "${col}" = $1`,
			[userId]
		);
		if (rows[0].n > 0) restes[`${tbl}.${col}`] = rows[0].n;
	}
	return restes;
}

/** Les traces d'activité d'un élève qui a utilisé l'application. */
async function eleveActif(studentId: string, teacherId: string): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(`insert into gidouilles_activity (student_id, delta) values ($1, 5)`, [studentId]);
	await pg.query(`insert into bonus_history (student_id, delta) values ($1, 1)`, [studentId]);
	await pg.query(
		`insert into vip_cards_activity (student_id, card_instance_id, card_template_id, action)
		 values ($1, 'zz-carte', 'zz-modele', 'gained')`,
		[studentId]
	);
	const exercice = await TestData.exercise(teacherId).create();
	await pg.query(`insert into exercise_completions (exercise_id, student_id) values ($1, $2)`, [
		exercice.id,
		studentId
	]);
	await pg.query(
		`insert into exercise_assignments (exercise_id, assigned_by, assigned_to_type, student_id)
		 values ($1, $2, 'student', $3)`,
		[exercice.id, teacherId, studentId]
	);
	await pg.query(`insert into tutor_conversations (student_id) values ($1)`, [studentId]);
}

/**
 * Une conversation de groupe prof + élève où l'élève écrit le dernier message :
 * l'aperçu de la conversation recopie son texte. Rend l'identifiant de la conversation.
 */
async function conversationAvecMessage(studentId: string, teacherId: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into conversations (name, is_group, created_by) values ('zz-groupe', true, $1)
		 returning id`,
		[teacherId]
	);
	const conversationId = rows[0].id;
	await pg.query(
		`insert into conversation_participants (conversation_id, user_id) values ($1, $2), ($1, $3)`,
		[conversationId, teacherId, studentId]
	);
	await pg.query(
		// `plain_text` est recalculé depuis `content` (TipTap) par un trigger.
		`insert into messages (conversation_id, sender_id, content, plain_text)
		 values ($1, $2, jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
		   jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(
		     jsonb_build_object('type', 'text', 'text', $3::text))))), $3)`,
		[conversationId, studentId, TEXTE_ELEVE]
	);
	return conversationId;
}

/** Ce qui reste lisible du texte de l'élève dans une conversation. */
async function texteRestant(conversationId: string): Promise<string[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ t: string | null }>(
		`select plain_text as t from messages where conversation_id = $1
		 union all
		 select last_message_preview from conversations where id = $1`,
		[conversationId]
	);
	return rows.map((r) => r.t ?? '').filter((t) => t.includes(TEXTE_ELEVE));
}

// ============================================================================
// TESTS
// ============================================================================

describe('suppression de compte (art. 17) de bout en bout', () => {
	let teacherId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		teacherId = (await TestData.profile().withRole('teacher').create()).id;
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it("un élève actif est entièrement effacé : fonction, puis compte d'authentification", async () => {
		const eleve = await TestData.profile().withRole('student').create();
		await eleveActif(eleve.id, teacherId);
		const conversationId = await conversationAvecMessage(eleve.id, teacherId);
		expect(Object.keys(await tracesRestantes(eleve.id)).length).toBeGreaterThan(0);
		expect((await texteRestant(conversationId)).length).toBeGreaterThan(0);

		const { error: rpcError } = await service.rpc('delete_user_account', {
			p_user_id: eleve.id
		});
		expect(rpcError).toBeNull();

		const { error: authError } = await service.auth.admin.deleteUser(eleve.id);
		expect(authError).toBeNull();

		const { data: profil } = await service.from('profiles').select('id').eq('id', eleve.id);
		expect(profil).toEqual([]);
		expect(await tracesRestantes(eleve.id)).toEqual({});
		expect(await texteRestant(conversationId)).toEqual([]);
	});

	it('un élève qui n’a jamais rien fait est effacé aussi', async () => {
		const eleve = await TestData.profile().withRole('student').create();

		const { error: rpcError } = await service.rpc('delete_user_account', {
			p_user_id: eleve.id
		});
		expect(rpcError).toBeNull();
		const { error: authError } = await service.auth.admin.deleteUser(eleve.id);
		expect(authError).toBeNull();
		expect(await tracesRestantes(eleve.id)).toEqual({});
	});

	it.each(['teacher', 'admin'] as const)('un compte %s est refusé sans effet', async (role) => {
		// Invariant mono-prof : un seul compte teacher, celui du beforeAll.
		const compteId =
			role === 'teacher' ? teacherId : (await TestData.profile().withRole(role).create()).id;

		const { error } = await service.rpc('delete_user_account', { p_user_id: compteId });
		expect(error).not.toBeNull();

		const { data: profil } = await service.from('profiles').select('role').eq('id', compteId);
		expect(profil).toEqual([{ role }]);
	});

	it('une identité NULL est refusée', async () => {
		const pg = await getPostgresClient();
		await expect(pg.query('select public.delete_user_account(null)')).rejects.toThrow();
	});
});
