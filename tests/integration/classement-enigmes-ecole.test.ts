/**
 * Classement des énigmes borné à l'école (relevé pendant D18)
 * ===========================================================
 *
 * Mesuré le 2026-10-11 : la page du classement lisait la vue `riddle_progress`
 * (security_invoker) ; la RLS de `riddle_attempts` ne montrant à l'élève que ses propres
 * tentatives, tous ses camarades apparaissaient à 0, et toutes écoles confondues.
 *
 * Décision de David (2026-10-11) : une fonction serveur bornée à l'école, qui montre aux
 * camarades le prénom et le score des énigmes — ni nom, ni avatar, ni tentatives.
 *
 * Ce que le fichier prouve :
 *   1. un élève voit le vrai score de ses camarades de la même école ;
 *   2. il ne voit aucun élève d'une autre école, ni les comptes de test, ni un camarade
 *      qui n'a tenté aucune énigme (pas d'annuaire) ; un élève sans école ne voit rien ;
 *   3. la fonction ne rend que prénom, score, rang et `is_me` ;
 *   4. anon ne peut pas l'appeler.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

type LigneClassement = {
	rank: number;
	student_id: string;
	firstname: string | null;
	riddles_gidouilles: number;
	riddles_completed: number;
	is_me: boolean;
};

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const CLASSEMENT = 'riddle_school_leaderboard';

const ECOLE_A = 'zz-école énigmes A';
const ECOLE_B = 'zz-école énigmes B';

// ============================================================================
// HELPERS
// ============================================================================

function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function ecole(nom: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into schools (name, city, country) values ($1, 'zz', 'zz') returning id`,
		[nom]
	);
	return rows[0].id;
}

/** Élève de l'école, qui a réussi l'énigme `riddleId` en gagnant `gidouilles`. */
async function eleve(schoolId: string, riddleId: string, gidouilles: number, isTest = false) {
	const e = await TestData.profile().withRole('student').create();
	const pg = await getPostgresClient();
	await pg.query('update profiles set school_id = $1, is_test = $2 where id = $3', [
		schoolId,
		isTest,
		e.id
	]);
	await pg.query(
		`insert into riddle_attempts
		   (riddle_id, student_id, attempt_number, submitted_answer, is_correct, gidouilles_awarded)
		 values ($1, $2, 1, '{}', true, $3)`,
		[riddleId, e.id, gidouilles]
	);
	return e;
}

async function classement(client: SupabaseClient<Database>): Promise<LigneClassement[]> {
	const { data, error } = await client.rpc(CLASSEMENT);
	expect(error).toBeNull();
	return (data ?? []) as LigneClassement[];
}

// ============================================================================
// TESTS
// ============================================================================

describe('classement des énigmes borné à l’école', () => {
	let riddleId: string;
	let a1: { id: string; email: string };
	let a2: { id: string; email: string };
	let aTest: { id: string; email: string };
	let b1: { id: string; email: string };
	let aSansTentative: { id: string; email: string };
	let sansEcole: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		const pg = await getPostgresClient();
		const auteur = await TestData.profile().withRole('teacher').create();
		const { rows } = await pg.query<{ id: string }>(
			`insert into riddles (title, difficulty, statement, created_by, status)
			 values ('zz-énigme classement', 1, 'zz', $1, 'published') returning id`,
			[auteur.id]
		);
		riddleId = rows[0].id;
		const a = await ecole(ECOLE_A);
		const b = await ecole(ECOLE_B);
		a1 = await eleve(a, riddleId, 10);
		a2 = await eleve(a, riddleId, 30);
		aTest = await eleve(a, riddleId, 99, true);
		b1 = await eleve(b, riddleId, 50);
		aSansTentative = await TestData.profile().withRole('student').create();
		await pg.query('update profiles set school_id = $1 where id = $2', [a, aSansTentative.id]);
		sansEcole = await TestData.profile().withRole('student').create();
		await pg.query('update profiles set school_id = null where id = $1', [sansEcole.id]);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('delete from riddle_attempts where riddle_id = $1', [riddleId]);
		await pg.query('delete from riddles where id = $1', [riddleId]);
		await cleanupAllTestData();
		await pg.query('delete from schools where name in ($1, $2)', [ECOLE_A, ECOLE_B]);
	});

	it('un élève voit le vrai score de son camarade, et le sien', async () => {
		const lignes = await classement(await clientFor(a1.email));
		const camarade = lignes.find((l) => l.student_id === a2.id);
		const moi = lignes.find((l) => l.student_id === a1.id);
		expect(camarade).toMatchObject({ rank: 1, riddles_gidouilles: 30, riddles_completed: 1 });
		expect(camarade?.is_me).toBe(false);
		expect(moi).toMatchObject({ rank: 2, riddles_gidouilles: 10, is_me: true });
	});

	it('ni un élève d’une autre école, ni un compte de test', async () => {
		const ids = (await classement(await clientFor(a1.email))).map((l) => l.student_id);
		expect(ids).not.toContain(b1.id);
		expect(ids).not.toContain(aTest.id);
		expect(ids).not.toContain(aSansTentative.id);
		expect(ids.sort()).toEqual([a1.id, a2.id].sort());
	});

	it('un élève sans école ne voit rien', async () => {
		expect(await classement(await clientFor(sansEcole.email))).toEqual([]);
	});

	it('prénom et score seulement', async () => {
		const [ligne] = await classement(await clientFor(a1.email));
		expect(Object.keys(ligne).sort()).toEqual(
			['firstname', 'is_me', 'rank', 'riddles_completed', 'riddles_gidouilles', 'student_id'].sort()
		);
	});

	it('anon ne peut pas l’appeler', async () => {
		const { data, error } = await anonClient().rpc(CLASSEMENT);
		expect(data).toBeNull();
		expect(error).not.toBeNull();
	});
});
