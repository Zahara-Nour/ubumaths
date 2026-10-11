/**
 * Durées de conservation réellement appliquées (constat C11)
 * ==========================================================
 *
 * La page de confidentialité promettait « profil : scolarité + 5 ans » et « données
 * pédagogiques : 5 ans après la dernière activité » ; rien ne purgeait. Décisions de David
 * (2026-10-11) : la purge hebdomadaire supprime
 *   - les comptes ÉLÈVES sans connexion depuis 5 ans (comme une suppression de compte) ;
 *   - les conversations avec le tuteur IA 1 an après leur dernier message ;
 *   - les pré-inscriptions jamais activées 1 an après leur création.
 *
 * Ce que le fichier prouve (sur `run_retention_c11()`, appelée par la purge hebdomadaire) :
 *   1. un élève sans connexion depuis 6 ans est supprimé (profil, compte, audit écrit) ;
 *   2. un élève connecté récemment, un prof inactif depuis 6 ans, un élève dont la
 *      dernière ouverture de session a 6 ans mais dont la session a été rafraîchie hier
 *      (resté connecté) : gardés ;
 *   3. une conversation dont le dernier message a 13 mois est supprimée ; 11 mois : gardée ;
 *   4. une pré-inscription non activée de 13 mois est supprimée ; récente : gardée ;
 *   5. la purge hebdomadaire appelle bien cette fonction.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// ============================================================================
// HELPERS
// ============================================================================

async function derniereConnexion(id: string, intervalle: string): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(
		`update auth.users set last_sign_in_at = now() - $2::interval,
		   created_at = now() - $2::interval where id = $1`,
		[id, intervalle]
	);
}

async function existe(table: string, colonne: string, valeur: string): Promise<boolean> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(`select 1 from ${table} where ${colonne} = $1`, [valeur]);
	return rows.length > 0;
}

/** Conversation de l'élève dont le dernier message date d'il y a `age`. */
async function conversation(studentId: string, age: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into tutor_conversations (student_id, created_at) values ($1, now() - $2::interval)
		 returning id`,
		[studentId, age]
	);
	await pg.query(
		`insert into tutor_messages (conversation_id, role, content, created_at)
		 values ($1, 'user', 'zz', now() - $2::interval)`,
		[rows[0].id, age]
	);
	return rows[0].id;
}

async function preInscription(email: string, age: string): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(
		`insert into pending_students (email, firstname, lastname, created_at)
		 values ($1, 'zz', 'zz', now() - $2::interval)`,
		[email, age]
	);
}

// ============================================================================
// TESTS
// ============================================================================

describe('conservation : purge C11', () => {
	let ancien: string;
	let recent: string;
	let prof: string;
	let resteConnecte: string;
	let convVieille: string;
	let convRecente: string;
	const emailVieux = `zz-c11-vieux-${crypto.randomUUID()}@test.local`;
	const emailRecent = `zz-c11-recent-${crypto.randomUUID()}@test.local`;

	beforeAll(async () => {
		await cleanupAllTestData();
		prof = (await TestData.profile().withRole('teacher').create()).id;
		ancien = (await TestData.profile().withRole('student').create()).id;
		recent = (await TestData.profile().withRole('student').create()).id;
		await derniereConnexion(ancien, '6 years');
		await derniereConnexion(recent, '2 days');
		await derniereConnexion(prof, '6 years');
		// Resté connecté : ouverture de session il y a 6 ans, jeton rafraîchi hier.
		resteConnecte = (await TestData.profile().withRole('student').create()).id;
		await derniereConnexion(resteConnecte, '6 years');
		const pgSession = await getPostgresClient();
		await pgSession.query(
			`insert into auth.sessions (id, user_id, created_at, updated_at, refreshed_at)
			 values (gen_random_uuid(), $1, now() - interval '6 years', now() - interval '1 day',
			   (now() - interval '1 day') at time zone 'UTC')`,
			[resteConnecte]
		);
		convVieille = await conversation(recent, '13 months');
		convRecente = await conversation(recent, '11 months');
		await preInscription(emailVieux, '13 months');
		await preInscription(emailRecent, '1 month');

		const pg = await getPostgresClient();
		await pg.query('select public.run_retention_c11()');
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query(`delete from pending_students where email like 'zz-c11-%'`);
		await cleanupAllTestData();
	});

	it('un élève sans connexion depuis 6 ans est supprimé, avec une trace d’audit', async () => {
		expect(await existe('profiles', 'id', ancien)).toBe(false);
		expect(await existe('auth.users', 'id', ancien)).toBe(false);
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ n: number }>(
			`select count(*)::int as n from account_deletion_audit
			 where status = 'completed' and error_message like 'Conservation%'
			   and completed_at > now() - interval '5 minutes'`
		);
		expect(rows[0].n).toBeGreaterThanOrEqual(1);
	});

	it('un élève connecté récemment et un prof inactif sont gardés', async () => {
		expect(await existe('profiles', 'id', recent)).toBe(true);
		expect(await existe('profiles', 'id', prof)).toBe(true);
	});

	it('un élève resté connecté (session rafraîchie hier) est gardé', async () => {
		expect(await existe('profiles', 'id', resteConnecte)).toBe(true);
	});

	it('conversation avec le tuteur : 13 mois supprimée, 11 mois gardée', async () => {
		expect(await existe('tutor_conversations', 'id', convVieille)).toBe(false);
		expect(await existe('tutor_messages', 'conversation_id', convVieille)).toBe(false);
		expect(await existe('tutor_conversations', 'id', convRecente)).toBe(true);
	});

	it('pré-inscription non activée : 13 mois supprimée, récente gardée', async () => {
		expect(await existe('pending_students', 'email', emailVieux)).toBe(false);
		expect(await existe('pending_students', 'email', emailRecent)).toBe(true);
	});

	it('la purge hebdomadaire appelle run_retention_c11', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ def: string }>(
			`select pg_get_functiondef('public.run_cleanup_expired_data'::regproc) as def`
		);
		expect(rows[0].def).toContain('run_retention_c11()');
	});
});
