/**
 * On ne se crée pas un profil privilégié (base locale requise)
 * ===========================================================
 *
 * `profiles / Allow profile creation` vaut `with check (auth.uid() = id)` :
 * elle vérifie QUI l'on prétend être, jamais QUEL RÔLE l'on se donne.
 *
 * Deux gardes existaient, et aucune ne couvrait ce cas :
 *   - `guard_profile_role_change_trg` est BEFORE **UPDATE OF role** ;
 *   - `trg_enforce_single_teacher` est BEFORE INSERT OR UPDATE, mais sous
 *     `when (new.role = 'teacher')` — `admin` passait donc à travers.
 *
 * Un utilisateur authentifié SANS profil pouvait ainsi s'en insérer un avec
 * `role = 'admin'`, et l'administrateur voit tout : les 81 élèves, leurs
 * données, l'école entière.
 *
 * Latent au 2026-09-13 — aucun compte n'est sans profil, `handle_new_user`
 * codant `role` en dur à `student`. Latent n'est pas fermé : il suffit que ce
 * trigger échoue une fois, et il avale ses erreurs.
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
import { insertAuthUser } from '../helpers/database/postgres-client';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
	return client;
}

/**
 * Un compte authentifié DÉPOURVU de profil — l'état exact qu'exploite
 * l'escalade. `handle_new_user` en crée un à l'inscription : on le retire.
 */
async function compteSansProfil(): Promise<{ id: string; client: SupabaseClient<Database> }> {
	const id = crypto.randomUUID();
	const email = `${id}@test.com`;
	await insertAuthUser({ id, email, password: DEFAULT_TEST_PASSWORD });
	const client = await clientFor(email);

	const { error } = await service.from('profiles').delete().eq('id', id);
	expect(error).toBeNull();

	const { data: reste } = await service.from('profiles').select('id').eq('id', id);
	expect(reste ?? [], 'le compte doit être sans profil pour que le test ait un sens').toHaveLength(
		0
	);

	return { id, client };
}

describe('création de profil et rôle', () => {
	let admin: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();
		const compteAdmin = await TestData.profile().withRole('admin').create();
		admin = await clientFor(compteAdmin.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('un utilisateur ne peut pas se créer un profil ADMIN', async () => {
		// Le cœur du sujet : `trg_enforce_single_teacher` ne se déclenche que sur
		// `teacher`, et la garde de changement de rôle ne couvre que l'UPDATE.
		const { id, client } = await compteSansProfil();

		const { error } = await client
			.from('profiles')
			.insert({ id, email: `${id}@test.com`, role: 'admin' });

		expect(error).not.toBeNull();
		expect(error?.code).toBe('42501');
	});

	it('ni un profil PROFESSEUR', async () => {
		// Contrairement à ce que je croyais, l'invariant mono-professeur ne suffit
		// PAS : `trg_enforce_single_teacher` ne lève que s'il existe DÉJÀ un
		// professeur. Sur une base qui n'en a pas encore, l'utilisateur devient LE
		// professeur. Mesuré : ce cas passait avant la garde.
		const { id, client } = await compteSansProfil();

		const { error } = await client
			.from('profiles')
			.insert({ id, email: `${id}@test.com`, role: 'teacher' });

		expect(error).not.toBeNull();
	});

	it('mais il peut se créer un profil ÉLÈVE', async () => {
		// Le témoin qui compte : l'inscription ne doit pas casser. C'est le rôle
		// par défaut de la colonne, et celui que `handle_new_user` code en dur.
		const { id, client } = await compteSansProfil();

		const { error } = await client
			.from('profiles')
			.insert({ id, email: `${id}@test.com`, role: 'student' });

		expect(error).toBeNull();
	});

	it('et sans préciser de rôle non plus', async () => {
		const { id, client } = await compteSansProfil();

		const { error } = await client.from('profiles').insert({ id, email: `${id}@test.com` });

		expect(error).toBeNull();
		const { data } = await service.from('profiles').select('role').eq('id', id).single();
		expect((data as { role: string }).role).toBe('student');
	});

	it('l’inscription normale continue de fonctionner', async () => {
		// `handle_new_user` s'exécute avec `auth.uid()` nul : la garde doit la
		// laisser passer, sans quoi plus personne ne pourrait s'inscrire.
		const id = crypto.randomUUID();
		await insertAuthUser({ id, email: `${id}@test.com`, password: DEFAULT_TEST_PASSWORD });

		const { data, error } = await service.from('profiles').select('role').eq('id', id).single();
		expect(error).toBeNull();
		expect((data as { role: string }).role).toBe('student');
	});

	it('l’administration passe par le service_role, et reste possible', async () => {
		// Vérifié en écrivant ce test : un administrateur AUTHENTIFIÉ ne peut pas
		// créer de profil pour autrui — `Allow profile creation` exige
		// `auth.uid() = id`, et c'est l'unique policy INSERT de la table. La
		// création administrative passe donc par le service_role, où `auth.uid()`
		// est nul. La garde doit l'y laisser passer, sinon plus aucun compte ne
		// peut être créé côté serveur.
		const id = crypto.randomUUID();
		// Le compte auth d'abord : `profiles.id` référence `auth.users`, et sans
		// lui le refus viendrait de la clé étrangère, pas de la garde testée.
		await insertAuthUser({ id, email: `${id}@test.com`, password: DEFAULT_TEST_PASSWORD });
		const { error: menagePrealable } = await service.from('profiles').delete().eq('id', id);
		expect(menagePrealable).toBeNull();

		const { error } = await service
			.from('profiles')
			.insert({ id, email: `${id}@test.com`, role: 'admin' });
		expect(error).toBeNull();

		const { error: menage } = await service.from('profiles').delete().eq('id', id);
		expect(menage).toBeNull();
	});

	it('un administrateur authentifié ne crée pas de profil pour autrui', async () => {
		// L'état actuel, constaté : ce n'est pas la garde qui l'en empêche mais la
		// policy elle-même. Le noter évite de croire la garde plus large qu'elle
		// n'est.
		const id = crypto.randomUUID();
		const { error } = await admin
			.from('profiles')
			.insert({ id, email: `${id}@test.com`, role: 'student' });
		expect(error?.code).toBe('42501');
	});
});
