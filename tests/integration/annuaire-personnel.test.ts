/**
 * L'annuaire du personnel (base locale requise)
 * ==============================================
 *
 * Une fois `Anyone can view profiles for leaderboard` retirée, aucun élève ne
 * peut plus lire le profil de son professeur : `are_classmates` ne couvre que
 * des élèves, et un prof n'est ni un ami ni un co-participant de tournoi.
 *
 * Cette fonction rend le nom et l'avatar du personnel — et RIEN d'autre. C'est
 * la raison d'être d'une fonction plutôt que d'une policy : la RLS est par
 * LIGNE, pas par colonne, donc une policy `role in ('teacher','admin')` aurait
 * aussi exposé l'e-mail du professeur à tous les élèves.
 *
 * ⚠️ Le test le plus important de ce fichier est celui qui vérifie l'ABSENCE
 * de colonne sensible. Ajouter `email` à la fonction rendrait inutile tout le
 * chantier de restriction des profils, et rien d'autre ne le signalerait.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Le nom de la fonction n'est pas encore dans `database.ts` : elle sera générée après la mise en prod. */
const ANNUAIRE = 'get_staff_directory' as never;

type LigneAnnuaire = {
	id: string;
	full_name: string | null;
	firstname: string | null;
	lastname: string | null;
	avatar_url: string | null;
	role: string;
};

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

describe('annuaire du personnel', () => {
	let eleve: SupabaseClient<Database>;
	let profId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		profId = enseignant.id;

		const profil = await TestData.profile().withRole('student').create();
		eleve = await clientFor(profil.email);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('un élève y trouve son professeur', async () => {
		const { data, error } = await eleve.rpc(ANNUAIRE);
		expect(error).toBeNull();

		const lignes = (data ?? []) as LigneAnnuaire[];
		expect(
			lignes.map((l) => l.id),
			'le professeur est absent de l’annuaire'
		).toContain(profId);
	});

	it('elle rend un nom et un avatar', async () => {
		const { data } = await eleve.rpc(ANNUAIRE);
		const prof = ((data ?? []) as LigneAnnuaire[]).find((l) => l.id === profId);

		expect(prof).toBeDefined();
		expect(Object.keys(prof!).sort()).toEqual(
			['avatar_url', 'firstname', 'full_name', 'id', 'lastname', 'role'].sort()
		);
	});

	/**
	 * ⚠️ LE test qui garde le chantier entier. Si quelqu'un ajoute une colonne
	 * sensible à la fonction, la restriction des profils devient inutile — et
	 * rien d'autre ne le dirait : ni le typecheck, ni le lint, ni la RLS.
	 */
	it('elle n’expose AUCUNE colonne sensible', async () => {
		const { data } = await eleve.rpc(ANNUAIRE);
		const prof = ((data ?? []) as LigneAnnuaire[]).find((l) => l.id === profId);

		for (const interdite of [
			'email',
			'consent_granted_at',
			'consent_required',
			'grade',
			'school_id',
			'gidouilles',
			'status'
		]) {
			expect(
				Object.keys(prof!),
				`« ${interdite} » ne doit jamais sortir de l’annuaire du personnel`
			).not.toContain(interdite);
		}
	});

	/** Elle ne rend QUE le personnel : un élève n'y figure pas. */
	it('elle ne contient aucun élève', async () => {
		const { data } = await eleve.rpc(ANNUAIRE);
		const roles = [...new Set(((data ?? []) as LigneAnnuaire[]).map((l) => l.role))];

		expect(roles, 'un élève s’est glissé dans l’annuaire du personnel').not.toContain('student');
		expect(
			roles.length,
			'l’annuaire est vide : le décor n’a pas créé de professeur'
		).toBeGreaterThan(0);
	});

	/** Sans session, rien : `anon` n'a pas le droit d'exécution. */
	it('un visiteur non connecté ne peut pas l’appeler', async () => {
		const anonyme = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { error } = await anonyme.rpc(ANNUAIRE);

		expect(error, 'anon a pu lire l’annuaire du personnel').not.toBeNull();
	});
});
