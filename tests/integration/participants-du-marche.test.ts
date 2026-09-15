/**
 * Savoir avec qui on échange (base locale requise)
 * ================================================
 *
 * Le marché est à l'échelle de l'ÉCOLE, alors qu'un élève ne lit plus que
 * lui-même, ses camarades ACTIFS, ses amis, ses co-participants de tournoi et
 * le personnel. Les jointures qui résolvent les PERSONNES rendraient donc
 * `null` pour presque tout le monde.
 *
 * ⚠️ Sans erreur : les accès sont en `?.` et retombent sur « Anonyme ». Rien ne
 * casserait, rien ne serait signalé, et un mineur accepterait un échange avec
 * quelqu'un qu'il ne peut pas nommer. Mesuré avant d'écrire : 949 couples
 * annonce × élève sur 1040.
 *
 * ⚠️ Le test le plus important de ce fichier est celui de la GARDE : la
 * fonction ne rend que des participants réels. Sans cette condition, elle
 * deviendrait un annuaire de tous les élèves, lisible par tout compte connecté.
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

/** Pas encore dans `database.ts` : générée après la mise en production. */
const PARTICIPANTS = 'resolve_marketplace_participants' as never;

type LigneParticipant = { id: string; display_name: string; avatar_url: string | null };

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

describe('participants du marché', () => {
	let acheteur: SupabaseClient<Database>;
	let vendeurId: string;
	let etrangerId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		await TestData.profile().withRole('teacher').create();

		const { data: ecole, error: ecoleError } = await service
			.from('schools')
			.insert({ name: 'Lycée marché NN', city: 'Testville', country: 'France' })
			.select('id')
			.single();
		expect(ecoleError).toBeNull();

		const eleve = async (prenom: string, nom: string) => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('profiles')
				.update({ school_id: ecole!.id, firstname: prenom, lastname: nom })
				.eq('id', profil.id);
			expect(error).toBeNull();
			return profil;
		};

		// Le VENDEUR : il publie une annonce, donc il participe au marché.
		const vendeur = await eleve('Marie', 'Dupont');
		vendeurId = vendeur.id;

		// `marketplace_listings` n'a pas de `title`, `expires_at` est requis, et
		// la contrainte `at_least_one_item` exige que l'annonce offre quelque
		// chose — des gidouilles suffisent, le sujet ici est le NOM du vendeur.
		const { error: annonceError } = await service.from('marketplace_listings').insert({
			creator_id: vendeurId,
			school_id: ecole!.id,
			listing_type: 'sell',
			status: 'active',
			offered_card_ids: [],
			offered_gidouilles: 10,
			wanted_card_template_ids: [],
			expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString()
		});
		expect(annonceError, 'le décor n’a pas pu être posé').toBeNull();

		// L'ÉTRANGER : même école, mais aucune annonce ni proposition.
		etrangerId = (await eleve('Paul', 'Martin')).id;

		// L'ACHETEUR : aucun lien avec le vendeur — ni classe, ni amitié.
		const profil = await eleve('Léa', 'Bernard');
		acheteur = await clientFor(profil.email);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/**
	 * ⚠️ LE cas. Sans la fonction, l'acheteur verrait « Anonyme » en face de son
	 * échange — et l'accepterait quand même.
	 */
	it('l’acheteur obtient le nom du vendeur', async () => {
		const { data, error } = await acheteur.rpc(PARTICIPANTS, { p_user_ids: [vendeurId] });
		expect(error).toBeNull();

		const lignes = (data ?? []) as LigneParticipant[];
		expect(lignes, 'le vendeur est introuvable').toHaveLength(1);
		expect(lignes[0].id).toBe(vendeurId);
	});

	/** Le nom est PSEUDONYMISÉ : prénom et initiale, jamais l'état civil complet. */
	it('le nom rendu est pseudonymisé', async () => {
		const { data } = await acheteur.rpc(PARTICIPANTS, { p_user_ids: [vendeurId] });
		const ligne = ((data ?? []) as LigneParticipant[])[0];

		expect(ligne.display_name).toBe('Marie D.');
		expect(ligne.display_name, 'le nom de famille complet est rendu').not.toContain('Dupont');
	});

	/**
	 * ⚠️ LA GARDE. Sans la condition d'existence, cette fonction deviendrait un
	 * annuaire de TOUS les élèves — nom et avatar de 81 mineurs, lisibles par
	 * tout compte connecté. C'est le seul rempart.
	 */
	it('un élève qui ne participe PAS au marché n’en sort pas', async () => {
		const { data, error } = await acheteur.rpc(PARTICIPANTS, { p_user_ids: [etrangerId] });
		expect(error).toBeNull();
		expect(data, 'la fonction est devenue un annuaire des élèves').toEqual([]);
	});

	/**
	 * ⚠️ Liste BLANCHE. Toute colonne ajoutée fait tomber ce test, connue ou
	 * non — une liste noire laisserait passer celle qu'on n'aurait pas prévue.
	 */
	it('elle ne rend AUCUNE autre colonne', async () => {
		const { data } = await acheteur.rpc(PARTICIPANTS, { p_user_ids: [vendeurId] });
		const ligne = ((data ?? []) as LigneParticipant[])[0];

		expect(
			Object.keys(ligne).sort(),
			'une colonne a été ajoutée : elle est lisible par tout compte connecté'
		).toEqual(['avatar_url', 'display_name', 'id']);
	});

	it('au-delà du plafond, elle ne rend rien', async () => {
		const trop = Array.from({ length: 201 }, () => crypto.randomUUID());
		trop[0] = vendeurId;

		const { data, error } = await acheteur.rpc(PARTICIPANTS, { p_user_ids: trop });
		expect(error).toBeNull();
		expect(data, 'le plafond de 200 ne s’applique plus').toEqual([]);
	});

	/** Sans session, rien — avec le contre-témoin qui prouve que la fonction existe. */
	it('un visiteur non connecté ne peut pas l’appeler', async () => {
		const anonyme = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		const { error: refus } = await anonyme.rpc(PARTICIPANTS, { p_user_ids: [vendeurId] });
		expect(refus, 'anon a pu lire les participants du marché').not.toBeNull();

		const { error: autorise } = await acheteur.rpc(PARTICIPANTS, { p_user_ids: [vendeurId] });
		expect(autorise, 'la fonction est absente : le refus d’anon ne prouve rien').toBeNull();
	});
});
