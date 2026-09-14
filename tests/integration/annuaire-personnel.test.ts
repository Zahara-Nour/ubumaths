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

	/**
	 * ⚠️ LE test qui garde le chantier entier, et c'est une liste BLANCHE.
	 *
	 * Une liste noire de colonnes interdites serait plus lisible et plus
	 * faible : `profiles` en compte 25, et il suffirait d'en oublier une —
	 * `rejection_reason`, `class_ids`, `vip_cards_history`… — pour qu'un ajout
	 * passe au vert. Ici, TOUTE colonne ajoutée fait tomber le test, connue ou
	 * non, présente ou future.
	 *
	 * Si quelqu'un ajoute une colonne sensible à la fonction, la restriction
	 * des profils devient inutile — et rien d'autre ne le dirait : ni le
	 * typecheck, ni le lint, ni la RLS.
	 */
	it('elle rend un nom et un avatar, et RIEN de plus', async () => {
		const { data } = await eleve.rpc(ANNUAIRE);
		const prof = ((data ?? []) as LigneAnnuaire[]).find((l) => l.id === profId);

		expect(prof).toBeDefined();
		expect(
			Object.keys(prof!).sort(),
			'une colonne a été ajoutée à l’annuaire : elle est lisible par TOUT compte connecté'
		).toEqual(['avatar_url', 'firstname', 'full_name', 'id', 'lastname', 'role'].sort());

		// Le jeu de clés ne dit rien du contenu : sans nom, les six écrans
		// continueraient d'afficher « Utilisateur inconnu » et la suite
		// resterait verte — le bug même que cette fonction existe pour corriger.
		expect(prof!.full_name, 'le nom du professeur n’arrive pas').toBeTruthy();
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

	/**
	 * Sans session, rien : `anon` n'a pas le droit d'exécution.
	 *
	 * ⚠️ Le refus seul ne prouverait rien — il serait tout aussi vert si la
	 * fonction n'existait pas, si l'URL était fausse, ou si PostgREST était
	 * tombé. D'où le second appel, authentifié, qui doit RÉUSSIR.
	 *
	 * Et pas d'assertion sur le code d'erreur : selon la version, PostgREST
	 * rend `42501` ou un 404 `PGRST202` (fonction hors du cache de schéma),
	 * indistinguable de « n'existe pas ».
	 */
	it('un visiteur non connecté ne peut pas l’appeler', async () => {
		const anonyme = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		const { error: refus } = await anonyme.rpc(ANNUAIRE);
		expect(refus, 'anon a pu lire l’annuaire du personnel').not.toBeNull();

		const { error: autorise } = await eleve.rpc(ANNUAIRE);
		expect(autorise, 'la fonction est absente : le refus d’anon ne prouve rien').toBeNull();
	});
});
